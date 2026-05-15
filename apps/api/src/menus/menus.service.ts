import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateMenuDto } from "./dto/create-menu.dto";
import type { UpdateMenuDto } from "./dto/update-menu.dto";
import type { AddMenuItemDto } from "./dto/add-menu-item.dto";
import type { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import type { ReorderItemsDto } from "./dto/reorder-items.dto";

export type MenuRow = {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: Date;
  itemCount: number;
};

export type MenuItemRow = {
  id: string;
  menuId: string;
  productId: string;
  productName: string;
  sellingPrice: number;
  isVisible: boolean;
  order: number;
};

export type MenuDetailRow = Omit<MenuRow, "itemCount"> & {
  items: MenuItemRow[];
};

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string): Promise<MenuRow[]> {
    const menus = await this.prisma.menu.findMany({
      where: { companyId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return menus.map((m) => ({
      id: m.id,
      companyId: m.companyId,
      name: m.name,
      slug: m.slug,
      isPublic: m.isPublic,
      createdAt: m.createdAt,
      itemCount: m._count.items,
    }));
  }

  async findOne(id: string, companyId: string): Promise<MenuDetailRow> {
    const menu = await this.prisma.menu.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            product: { select: { name: true, sellingPrice: true, deletedAt: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!menu) throw new NotFoundException(`Menu not found: ${id}`);
    return {
      id: menu.id,
      companyId: menu.companyId,
      name: menu.name,
      slug: menu.slug,
      isPublic: menu.isPublic,
      createdAt: menu.createdAt,
      items: menu.items.map((item) => ({
        id: item.id,
        menuId: item.menuId,
        productId: item.productId,
        productName: item.product.name,
        sellingPrice: Number(item.product.sellingPrice),
        isVisible: item.isVisible,
        order: item.order,
      })),
    };
  }

  async create(dto: CreateMenuDto, companyId: string): Promise<MenuRow> {
    const slug = dto.slug ?? this.slugify(dto.name);
    await this.assertSlugAvailable(companyId, slug);
    const menu = await this.prisma.menu.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        isPublic: dto.isPublic ?? false,
      },
      include: { _count: { select: { items: true } } },
    });
    return {
      id: menu.id,
      companyId: menu.companyId,
      name: menu.name,
      slug: menu.slug,
      isPublic: menu.isPublic,
      createdAt: menu.createdAt,
      itemCount: menu._count.items,
    };
  }

  async update(id: string, dto: UpdateMenuDto, companyId: string): Promise<MenuRow> {
    const existing = await this.prisma.menu.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException(`Menu not found: ${id}`);

    const slug =
      dto.slug !== undefined
        ? dto.slug
        : dto.name !== undefined
          ? this.slugify(dto.name)
          : undefined;

    if (slug !== undefined && slug !== existing.slug) {
      await this.assertSlugAvailable(companyId, slug, id);
    }

    const menu = await this.prisma.menu.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug !== undefined && { slug }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
      include: { _count: { select: { items: true } } },
    });
    return {
      id: menu.id,
      companyId: menu.companyId,
      name: menu.name,
      slug: menu.slug,
      isPublic: menu.isPublic,
      createdAt: menu.createdAt,
      itemCount: menu._count.items,
    };
  }

  async remove(id: string, companyId: string): Promise<void> {
    const existing = await this.prisma.menu.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException(`Menu not found: ${id}`);
    await this.prisma.menu.delete({ where: { id } });
  }

  async addItem(menuId: string, dto: AddMenuItemDto, companyId: string): Promise<MenuItemRow> {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, companyId } });
    if (!menu) throw new NotFoundException(`Menu not found: ${menuId}`);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product not found: ${dto.productId}`);

    const duplicate = await this.prisma.menuItem.findUnique({
      where: { menuId_productId: { menuId, productId: dto.productId } },
    });
    if (duplicate) {
      throw new ConflictException("Product is already in this menu");
    }

    const maxOrder = await this.prisma.menuItem.aggregate({
      where: { menuId },
      _max: { order: true },
    });
    const nextOrder = dto.order ?? (maxOrder._max.order ?? -1) + 1;

    const item = await this.prisma.menuItem.create({
      data: {
        companyId,
        menuId,
        productId: dto.productId,
        isVisible: dto.isVisible ?? true,
        order: nextOrder,
      },
      include: { product: { select: { name: true, sellingPrice: true } } },
    });
    return {
      id: item.id,
      menuId: item.menuId,
      productId: item.productId,
      productName: item.product.name,
      sellingPrice: Number(item.product.sellingPrice),
      isVisible: item.isVisible,
      order: item.order,
    };
  }

  async updateItem(
    menuId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
    companyId: string,
  ): Promise<MenuItemRow> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuId, companyId },
    });
    if (!item) throw new NotFoundException(`Menu item not found: ${itemId}`);

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: { product: { select: { name: true, sellingPrice: true } } },
    });
    return {
      id: updated.id,
      menuId: updated.menuId,
      productId: updated.productId,
      productName: updated.product.name,
      sellingPrice: Number(updated.product.sellingPrice),
      isVisible: updated.isVisible,
      order: updated.order,
    };
  }

  async removeItem(menuId: string, itemId: string, companyId: string): Promise<void> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuId, companyId },
    });
    if (!item) throw new NotFoundException(`Menu item not found: ${itemId}`);
    await this.prisma.menuItem.delete({ where: { id: itemId } });
  }

  async reorderItems(menuId: string, dto: ReorderItemsDto, companyId: string): Promise<MenuDetailRow> {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, companyId } });
    if (!menu) throw new NotFoundException(`Menu not found: ${menuId}`);

    await this.prisma.$transaction(
      dto.items.map(({ id, order }) =>
        this.prisma.menuItem.update({ where: { id }, data: { order } }),
      ),
    );

    return this.findOne(menuId, companyId);
  }

  private async assertSlugAvailable(
    companyId: string,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.menu.findFirst({
      where: { companyId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (conflict) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
