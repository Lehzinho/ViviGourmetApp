import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { CustomersService } from "./customers.service";

const mockPrisma = () => ({
  customer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeCustomer = (overrides = {}) => ({
  id: "cust1",
  companyId: "co1",
  name: "Maria Silva",
  phone: "(11) 99999-0001",
  email: "maria@ex.com",
  notes: null,
  avatarUrl: null,
  lastVisitAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  id: "ord1",
  companyId: "co1",
  customerId: "cust1",
  orderNumber: 1,
  status: "CLOSED" as const,
  paymentMethod: "pix",
  discount: null,
  notes: null,
  tableNumber: null,
  waiterId: null,
  openedAt: new Date("2026-05-01"),
  closedAt: new Date("2026-05-01"),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: { id: "cust1", name: "Maria Silva", phone: "(11) 99999-0001" },
  items: [
    {
      id: "item1",
      orderId: "ord1",
      productId: "prod1",
      quantity: new Decimal("2"),
      unitPrice: new Decimal("15.00"),
      totalPrice: new Decimal("30.00"),
      notes: null,
      product: { id: "prod1", name: "Bolo de Chocolate" },
    },
  ],
  ...overrides,
});

describe("CustomersService", () => {
  let service: CustomersService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  describe("createCustomer", () => {
    it("creates a customer and returns mapped row", async () => {
      prisma.customer.create.mockResolvedValue(makeCustomer());
      const result = await service.createCustomer("co1", {
        name: "Maria Silva",
        phone: "(11) 99999-0001",
      });
      expect(result.name).toBe("Maria Silva");
      expect(result.phone).toBe("(11) 99999-0001");
      expect(prisma.customer.create).toHaveBeenCalled();
    });
  });

  describe("findAllCustomers", () => {
    it("filters by companyId and deletedAt null", async () => {
      prisma.customer.findMany.mockResolvedValue([
        { ...makeCustomer(), _count: { orders: 2 } },
      ]);
      prisma.customer.count.mockResolvedValue(1);
      prisma.order.aggregate.mockResolvedValue({ _sum: { discount: null } });
      prisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.findAllCustomers("co1", {});
      expect(result.data).toHaveLength(1);
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: "co1", deletedAt: null }),
        }),
      );
    });

    it("applies search filter by name", async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.findAllCustomers("co1", { search: "Maria" });
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: "Maria" }) }),
            ]),
          }),
        }),
      );
    });

    it("returns pagination metadata", async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(42);

      const result = await service.findAllCustomers("co1", { page: "2", limit: "10" });
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe("getCustomerProfile", () => {
    it("returns null when customer not found", async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      const result = await service.getCustomerProfile("co1", "no-id");
      expect(result).toBeNull();
    });

    it("calculates totalSpent from closed order items", async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer());
      prisma.order.findMany
        .mockResolvedValueOnce([
          makeOrder({
            items: [
              { id: "i1", orderId: "ord1", productId: "p1", quantity: new Decimal("2"), unitPrice: new Decimal("15"), totalPrice: new Decimal("30"), notes: null, product: { id: "p1", name: "Bolo" } },
              { id: "i2", orderId: "ord1", productId: "p2", quantity: new Decimal("1"), unitPrice: new Decimal("20"), totalPrice: new Decimal("20"), notes: null, product: { id: "p2", name: "Café" } },
            ],
          }),
        ])
        .mockResolvedValueOnce([makeOrder()]);

      const result = await service.getCustomerProfile("co1", "cust1");
      expect(result?.stats.totalSpent).toBeCloseTo(50);
      expect(result?.stats.totalOrders).toBe(1);
    });

    it("identifies favoriteProduct by total quantity", async () => {
      const orders = [
        makeOrder({
          id: "ord1",
          items: [
            { id: "i1", orderId: "ord1", productId: "prod1", quantity: new Decimal("3"), unitPrice: new Decimal("10"), totalPrice: new Decimal("30"), notes: null, product: { id: "prod1", name: "Bolo" } },
          ],
        }),
        makeOrder({
          id: "ord2",
          items: [
            { id: "i2", orderId: "ord2", productId: "prod2", quantity: new Decimal("1"), unitPrice: new Decimal("10"), totalPrice: new Decimal("10"), notes: null, product: { id: "prod2", name: "Café" } },
          ],
        }),
      ];
      prisma.customer.findFirst.mockResolvedValue(makeCustomer());
      prisma.order.findMany
        .mockResolvedValueOnce(orders)
        .mockResolvedValueOnce([]);

      const result = await service.getCustomerProfile("co1", "cust1");
      expect(result?.stats.favoriteProduct?.id).toBe("prod1");
      expect(result?.stats.favoriteProduct?.timesOrdered).toBe(3);
    });
  });

  describe("createOrder", () => {
    it("generates sequential orderNumber per company", async () => {
      prisma.order.findFirst
        .mockResolvedValueOnce({ orderNumber: 5 })
        .mockResolvedValueOnce(makeOrder({ orderNumber: 6 }));
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.order.create.mockResolvedValue(makeOrder({ orderNumber: 6 }));

      await service.createOrder("co1", {
        items: [{ productId: "p1", quantity: 1, unitPrice: 15 }],
      });

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: "co1" }, orderBy: { orderNumber: "desc" } }),
      );
    });

    it("calculates totalPrice for each item", async () => {
      prisma.order.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeOrder({ orderNumber: 1 }));
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.order.create.mockResolvedValue(makeOrder({ orderNumber: 1 }));

      await service.createOrder("co1", {
        items: [{ productId: "p1", quantity: 2, unitPrice: 15 }],
      });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  totalPrice: expect.any(Object),
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe("updateOrder", () => {
    it("sets closedAt when status changes to CLOSED", async () => {
      const openOrder = makeOrder({ status: "OPEN", closedAt: null, customerId: null });
      const closedOrder = { ...openOrder, status: "CLOSED", closedAt: new Date() };
      prisma.order.findFirst
        .mockResolvedValueOnce(openOrder)
        .mockResolvedValueOnce(closedOrder);
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.order.update.mockResolvedValue(closedOrder);

      await service.updateOrder("co1", "ord1", { status: "CLOSED" });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ closedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe("removeCustomer", () => {
    it("throws NotFoundException when customer not found", async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.removeCustomer("co1", "no-id")).rejects.toThrow(NotFoundException);
    });

    it("soft-deletes customer (sets deletedAt)", async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer());
      prisma.customer.update.mockResolvedValue({});

      await service.removeCustomer("co1", "cust1");

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
