import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { RecipeType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

export type ProductRow = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  weight: number | null;
  dimensions: string | null;
  recipeId: string;
  categoryId: string | null;
  sellingPrice: number;
  totalCostPerUnit: number | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type ProductItemDetail = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

export type ExtraCostRow = {
  id: string;
  name: string;
  unitCost: number;
};

export type ProductDetailRow = ProductRow & {
  items: ProductItemDetail[];
  extraCosts: ExtraCostRow[];
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costCalculator: CostCalculatorService,
  ) {}

  async findAll(companyId: string): Promise<ProductRow[]> {
    const rows = await this.prisma.product.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    const mapped = rows.map((r) => this.toRow(r));
    const costResults = await Promise.allSettled(
      mapped.map((r) => this.costCalculator.calculateProductCost(r.id, companyId)),
    );
    return mapped.map((row, i) => ({
      ...row,
      totalCostPerUnit:
        costResults[i].status === "fulfilled"
          ? (costResults[i] as PromiseFulfilledResult<{ totalCostPerUnit: number }>).value
              .totalCostPerUnit
          : null,
    }));
  }

  async findOne(id: string, companyId: string): Promise<ProductDetailRow> {
    const r = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        recipe: {
          include: {
            items: {
              include: {
                ingredient: { select: { name: true } },
              },
            },
          },
        },
        extraCosts: true,
      },
    });
    if (!r) throw new NotFoundException(`Product not found: ${id}`);
    return {
      ...this.toRow(r),
      items: r.recipe.items.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
      extraCosts: r.extraCosts.map((ec) => ({
        id: ec.id,
        name: ec.name,
        unitCost: Number(ec.unitCost),
      })),
    };
  }

  async create(dto: CreateProductDto, companyId: string): Promise<ProductDetailRow> {
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== ingredientIds.length) {
      throw new BadRequestException("One or more ingredients not found in this company");
    }

    let productId!: string;
    await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          companyId,
          name: dto.name,
          type: RecipeType.PRODUCT,
          yield: new Prisma.Decimal(1),
          yieldUnit: "UNIT",
        },
      });
      await tx.recipeItem.createMany({
        data: dto.items.map((item) => ({
          companyId,
          recipeId: recipe.id,
          ingredientId: item.ingredientId,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
        })),
      });
      const product = await tx.product.create({
        data: {
          companyId,
          name: dto.name,
          description: dto.description ?? null,
          photoUrl: dto.photoUrl ?? null,
          weight: dto.weight != null ? new Prisma.Decimal(dto.weight) : null,
          dimensions: dto.dimensions ?? null,
          recipeId: recipe.id,
          categoryId: dto.categoryId ?? null,
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        },
      });
      if (dto.extraCosts.length > 0) {
        await tx.productExtraCost.createMany({
          data: dto.extraCosts.map((ec) => ({
            companyId,
            productId: product.id,
            name: ec.name,
            unitCost: new Prisma.Decimal(ec.unitCost),
          })),
        });
      }
      productId = product.id;
    });

    return this.findOne(productId, companyId);
  }

  async update(id: string, dto: UpdateProductDto, companyId: string): Promise<ProductDetailRow> {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);

    if (dto.items !== undefined) {
      const ingredientIds = dto.items.map((i) => i.ingredientId);
      const found = await this.prisma.ingredient.findMany({
        where: { id: { in: ingredientIds }, companyId, deletedAt: null },
        select: { id: true },
      });
      if (found.length !== ingredientIds.length) {
        throw new BadRequestException("One or more ingredients not found in this company");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.name != null && { name: dto.name }),
          ...(dto.sellingPrice != null && { sellingPrice: new Prisma.Decimal(dto.sellingPrice) }),
          ...(dto.description !== undefined && { description: dto.description ?? null }),
          ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl ?? null }),
          ...(dto.weight !== undefined && {
            weight: dto.weight != null ? new Prisma.Decimal(dto.weight) : null,
          }),
          ...(dto.dimensions !== undefined && { dimensions: dto.dimensions ?? null }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        },
      });

      if (dto.name != null) {
        await tx.recipe.update({
          where: { id: product.recipeId },
          data: { name: dto.name },
        });
      }

      if (dto.items !== undefined) {
        await tx.recipeItem.deleteMany({ where: { recipeId: product.recipeId } });
        await tx.recipeItem.createMany({
          data: dto.items.map((item) => ({
            companyId,
            recipeId: product.recipeId,
            ingredientId: item.ingredientId,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
          })),
        });
      }

      if (dto.extraCosts !== undefined) {
        await tx.productExtraCost.deleteMany({ where: { productId: id } });
        if (dto.extraCosts.length > 0) {
          await tx.productExtraCost.createMany({
            data: dto.extraCosts.map((ec) => ({
              companyId,
              productId: id,
              name: ec.name,
              unitCost: new Prisma.Decimal(ec.unitCost),
            })),
          });
        }
      }
    });

    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { deletedAt: now } });
      await tx.recipe.update({ where: { id: product.recipeId }, data: { deletedAt: now } });
    });
  }

  private toRow(r: {
    id: string;
    companyId: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    weight: Prisma.Decimal | null;
    dimensions: string | null;
    recipeId: string;
    categoryId: string | null;
    sellingPrice: Prisma.Decimal;
    createdAt: Date;
    deletedAt: Date | null;
  }): ProductRow {
    return {
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      description: r.description,
      photoUrl: r.photoUrl,
      weight: r.weight != null ? Number(r.weight) : null,
      dimensions: r.dimensions,
      recipeId: r.recipeId,
      categoryId: r.categoryId,
      sellingPrice: Number(r.sellingPrice),
      totalCostPerUnit: null,
      createdAt: r.createdAt,
      deletedAt: r.deletedAt,
    };
  }
}
