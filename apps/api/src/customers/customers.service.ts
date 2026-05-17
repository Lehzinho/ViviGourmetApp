import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { UpdateCustomerDto } from "./dto/update-customer.dto";
import type { FilterCustomersDto } from "./dto/filter-customers.dto";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import type { FilterOrdersDto } from "./dto/filter-orders.dto";

export type CustomerRow = {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  avatarUrl: string | null;
  lastVisitAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { orders: number };
  totalSpent?: number;
};

export type OrderItemRow = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  product: { id: string; name: string };
};

export type OrderRow = {
  id: string;
  companyId: string;
  customerId: string | null;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: string | null;
  discount: number | null;
  notes: string | null;
  tableNumber: string | null;
  openedAt: Date;
  closedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { id: string; name: string; phone: string } | null;
  items: OrderItemRow[];
};

export type CustomerProfile = {
  customer: CustomerRow;
  stats: {
    totalSpent: number;
    totalOrders: number;
    averageTicket: number;
    lastOrderAmount: number;
    lastVisitAt: Date | null;
    totalItemsConsumed: number;
    visitFrequency: number;
    favoriteProduct: { id: string; name: string; timesOrdered: number } | null;
    favoriteCategory: string | null;
    totalDiscount: number;
  };
  recentOrders: OrderRow[];
};

export type CustomersResult = {
  data: CustomerRow[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Customer methods ---

  async createCustomer(companyId: string, dto: CreateCustomerDto): Promise<CustomerRow> {
    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        notes: dto.notes ?? null,
      },
    });
    return this.toCustomerRow(customer);
  }

  async findAllCustomers(companyId: string, filters: FilterCustomersDto): Promise<CustomersResult> {
    const page = parseInt(filters.page ?? "1", 10);
    const limit = parseInt(filters.limit ?? "20", 10);
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      companyId,
      deletedAt: null,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { orders: { where: { deletedAt: null } } } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const closedOrderTotals = await Promise.all(
      customers.map((c) =>
        this.prisma.order.aggregate({
          where: { companyId, customerId: c.id, status: "CLOSED", deletedAt: null },
          _sum: { discount: true },
        }).then(async () => {
          const items = await this.prisma.orderItem.findMany({
            where: { order: { companyId, customerId: c.id, status: "CLOSED", deletedAt: null } },
            select: { totalPrice: true },
          });
          return items.reduce((s, i) => s + Number(i.totalPrice), 0);
        }),
      ),
    );

    const data = customers.map((c, i) =>
      this.toCustomerRow(c, { _count: c._count, totalSpent: closedOrderTotals[i] }),
    );

    return { data, total, page, limit };
  }

  async findOneCustomer(companyId: string, id: string): Promise<CustomerRow | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { orders: { where: { deletedAt: null } } } },
        orders: {
          where: { deletedAt: null },
          orderBy: { openedAt: "desc" },
          take: 5,
          include: { items: { include: { product: { select: { id: true, name: true } } } } },
        },
      },
    });
    return customer ? this.toCustomerRow(customer) : null;
  }

  async getCustomerProfile(companyId: string, id: string): Promise<CustomerProfile | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!customer) return null;

    const closedOrders = await this.prisma.order.findMany({
      where: { companyId, customerId: id, status: "CLOSED", deletedAt: null },
      orderBy: { openedAt: "desc" },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    const recentOrders = await this.prisma.order.findMany({
      where: { companyId, customerId: id, deletedAt: null },
      orderBy: { openedAt: "desc" },
      take: 10,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    const totalSpent = closedOrders.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + Number(i.totalPrice), 0);
    }, 0);

    const totalOrders = closedOrders.length;
    const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const lastOrder = closedOrders[0];
    const lastOrderAmount = lastOrder
      ? lastOrder.items.reduce((s, i) => s + Number(i.totalPrice), 0)
      : 0;

    const totalItemsConsumed = closedOrders.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + Number(i.quantity), 0);
    }, 0);

    const visitFrequency = this.calculateVisitFrequency(closedOrders.map((o) => o.openedAt));

    const productCounts: Record<string, { name: string; count: number }> = {};
    for (const order of closedOrders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!productCounts[key]) {
          productCounts[key] = { name: item.product.name, count: 0 };
        }
        productCounts[key].count += Number(item.quantity);
      }
    }

    let favoriteProduct: CustomerProfile["stats"]["favoriteProduct"] = null;
    let maxCount = 0;
    for (const [pid, info] of Object.entries(productCounts)) {
      if (info.count > maxCount) {
        maxCount = info.count;
        favoriteProduct = { id: pid, name: info.name, timesOrdered: info.count };
      }
    }

    return {
      customer: this.toCustomerRow(customer),
      stats: {
        totalSpent,
        totalOrders,
        averageTicket,
        lastOrderAmount,
        lastVisitAt: lastOrder?.openedAt ?? null,
        totalItemsConsumed,
        visitFrequency,
        favoriteProduct,
        favoriteCategory: null,
        totalDiscount: 0,
      },
      recentOrders: recentOrders.map((o) => this.toOrderRow(o)),
    };
  }

  async updateCustomer(companyId: string, id: string, dto: UpdateCustomerDto): Promise<CustomerRow> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Customer not found: ${id}`);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
    });
    return this.toCustomerRow(updated);
  }

  async removeCustomer(companyId: string, id: string): Promise<void> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Customer not found: ${id}`);

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Order methods ---

  async createOrder(companyId: string, dto: CreateOrderDto): Promise<OrderRow> {
    const last = await this.prisma.order.findFirst({
      where: { companyId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const orderNumber = (last?.orderNumber ?? 0) + 1;

    let createdOrderId!: string;

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          companyId,
          customerId: dto.customerId ?? null,
          orderNumber,
          paymentMethod: dto.paymentMethod ?? null,
          notes: dto.notes ?? null,
          discount: dto.discount != null ? new Prisma.Decimal(dto.discount) : null,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
              notes: item.notes ?? null,
            })),
          },
        },
      });
      createdOrderId = order.id;

      if (dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { lastVisitAt: new Date() },
        });
      }
    });

    const result = await this.prisma.order.findFirst({
      where: { id: createdOrderId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return this.toOrderRow(result!);
  }

  async findAllOrders(companyId: string, filters: FilterOrdersDto): Promise<OrderRow[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || filters.to
          ? {
              openedAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { openedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return orders.map((o) => this.toOrderRow(o));
  }

  async findOneOrder(companyId: string, id: string): Promise<OrderRow | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return order ? this.toOrderRow(order) : null;
  }

  async updateOrder(companyId: string, id: string, dto: UpdateOrderDto): Promise<OrderRow> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Order not found: ${id}`);

    const becomingClosed = dto.status === "CLOSED" && existing.status !== "CLOSED";

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(becomingClosed && { closedAt: new Date() }),
        },
      });

      if (becomingClosed && existing.customerId) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { lastVisitAt: new Date() },
        });
      }
    });

    const updated = await this.prisma.order.findFirst({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return this.toOrderRow(updated!);
  }

  async cancelOrder(companyId: string, id: string): Promise<OrderRow> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Order not found: ${id}`);

    await this.prisma.order.update({
      where: { id },
      data: { status: "CANCELLED", closedAt: new Date() },
    });

    const updated = await this.prisma.order.findFirst({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return this.toOrderRow(updated!);
  }

  // --- Private helpers ---

  private calculateVisitFrequency(dates: Date[]): number {
    if (dates.length < 2) return 0;
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalDays += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    }
    return Math.round(totalDays / (sorted.length - 1));
  }

  private toCustomerRow(
    c: {
      id: string;
      companyId: string;
      name: string;
      phone: string;
      email: string | null;
      notes: string | null;
      avatarUrl: string | null;
      lastVisitAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    extra?: { _count?: { orders: number }; totalSpent?: number },
  ): CustomerRow {
    return {
      id: c.id,
      companyId: c.companyId,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      avatarUrl: c.avatarUrl,
      lastVisitAt: c.lastVisitAt,
      deletedAt: c.deletedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      ...(extra?._count !== undefined && { _count: extra._count }),
      ...(extra?.totalSpent !== undefined && { totalSpent: extra.totalSpent }),
    };
  }

  private toOrderRow(o: {
    id: string;
    companyId: string;
    customerId: string | null;
    orderNumber: number;
    status: OrderStatus;
    paymentMethod: string | null;
    discount: Prisma.Decimal | null;
    notes: string | null;
    tableNumber: string | null;
    openedAt: Date;
    closedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customer?: { id: string; name: string; phone: string } | null;
    items: {
      id: string;
      orderId: string;
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      notes: string | null;
      product: { id: string; name: string };
    }[];
  }): OrderRow {
    return {
      id: o.id,
      companyId: o.companyId,
      customerId: o.customerId,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      discount: o.discount != null ? Number(o.discount) : null,
      notes: o.notes,
      tableNumber: o.tableNumber,
      openedAt: o.openedAt,
      closedAt: o.closedAt,
      deletedAt: o.deletedAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      customer: o.customer ?? null,
      items: o.items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        notes: i.notes,
        product: i.product,
      })),
    };
  }
}
