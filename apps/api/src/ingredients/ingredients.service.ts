import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IngredientType, RecipeType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import type { AddPriceDto } from "./dto/add-price.dto";
import type { CreateSemiFinishedDto } from "./dto/create-semi-finished.dto";
import type { UpdateIngredientDto } from "./dto/update-ingredient.dto";

export type IngredientRow = {
  id: string;
  companyId: string;
  name: string;
  unit: string;
  type: IngredientType;
  compositionRecipeId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  latestPricePerUnit: number | null;
  compositionYield: number | null;
  compositionYieldUnit: string | null;
};

export type IngredientDetailRow = IngredientRow & {
  compositionItems: Array<{ ingredientId: string; quantity: number; unit: string }> | null;
};

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, type?: IngredientType): Promise<IngredientRow[]> {
    const rows = await this.prisma.ingredient.findMany({
      where: { companyId, deletedAt: null, ...(type ? { type } : {}) },
      include: {
        prices: { orderBy: { createdAt: "desc" }, take: 1 },
        compositionRecipe: { select: { yield: true, yieldUnit: true } },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      unit: r.unit,
      type: r.type,
      compositionRecipeId: r.compositionRecipeId,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      latestPricePerUnit: r.prices[0] ? Number(r.prices[0].pricePerUnit) : null,
      compositionYield: r.compositionRecipe ? Number(r.compositionRecipe.yield) : null,
      compositionYieldUnit: r.compositionRecipe?.yieldUnit ?? null,
    }));
  }

  async createRawMaterial(dto: CreateRawMaterialDto, companyId: string): Promise<IngredientRow> {
    const pricePerUnit = new Prisma.Decimal(dto.price / dto.quantity);

    const created = await this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: { companyId, name: dto.name, unit: dto.unit, type: IngredientType.RAW },
      });
      await tx.ingredientPrice.create({
        data: {
          companyId,
          ingredientId: ingredient.id,
          price: new Prisma.Decimal(dto.price),
          quantity: new Prisma.Decimal(dto.quantity),
          pricePerUnit,
        },
      });
      return ingredient;
    });

    return this.findOne(created.id, companyId);
  }

  async addPrice(ingredientId: string, dto: AddPriceDto, companyId: string): Promise<void> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, companyId, type: IngredientType.RAW, deletedAt: null },
    });
    if (!ingredient) {
      throw new NotFoundException(`Raw material not found: ${ingredientId}`);
    }
    const pricePerUnit = new Prisma.Decimal(dto.price / dto.quantity);
    await this.prisma.ingredientPrice.create({
      data: {
        companyId,
        ingredientId,
        price: new Prisma.Decimal(dto.price),
        quantity: new Prisma.Decimal(dto.quantity),
        pricePerUnit,
      },
    });
  }

  async createSemiFinished(dto: CreateSemiFinishedDto, companyId: string): Promise<IngredientRow> {
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== ingredientIds.length) {
      throw new BadRequestException(
        "One or more ingredients not found in this company",
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          companyId,
          name: dto.name,
          type: RecipeType.COMPOSITION,
          yield: new Prisma.Decimal(dto.yield),
          yieldUnit: dto.yieldUnit,
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
      const ingredient = await tx.ingredient.create({
        data: {
          companyId,
          name: dto.name,
          unit: dto.yieldUnit,
          type: IngredientType.SEMI_FINISHED,
          compositionRecipeId: recipe.id,
        },
      });
      return ingredient;
    });

    return this.findOne(created.id, companyId);
  }

  async findOne(id: string, companyId: string): Promise<IngredientRow> {
    const r = await this.prisma.ingredient.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        prices: { orderBy: { createdAt: "desc" }, take: 1 },
        compositionRecipe: { select: { yield: true, yieldUnit: true } },
      },
    });
    if (!r) throw new NotFoundException(`Ingredient not found: ${id}`);
    return {
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      unit: r.unit,
      type: r.type,
      compositionRecipeId: r.compositionRecipeId,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      latestPricePerUnit: r.prices[0] ? Number(r.prices[0].pricePerUnit) : null,
      compositionYield: r.compositionRecipe ? Number(r.compositionRecipe.yield) : null,
      compositionYieldUnit: r.compositionRecipe?.yieldUnit ?? null,
    };
  }

  async findDetail(id: string, companyId: string): Promise<IngredientDetailRow> {
    const r = await this.prisma.ingredient.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        prices: { orderBy: { createdAt: "desc" }, take: 1 },
        compositionRecipe: {
          select: {
            yield: true,
            yieldUnit: true,
            items: { select: { ingredientId: true, quantity: true, unit: true } },
          },
        },
      },
    });
    if (!r) throw new NotFoundException(`Ingredient not found: ${id}`);
    return {
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      unit: r.unit,
      type: r.type,
      compositionRecipeId: r.compositionRecipeId,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      latestPricePerUnit: r.prices[0] ? Number(r.prices[0].pricePerUnit) : null,
      compositionYield: r.compositionRecipe ? Number(r.compositionRecipe.yield) : null,
      compositionYieldUnit: r.compositionRecipe?.yieldUnit ?? null,
      compositionItems: r.compositionRecipe
        ? r.compositionRecipe.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: Number(item.quantity),
            unit: item.unit,
          }))
        : null,
    };
  }

  async update(id: string, dto: UpdateIngredientDto, companyId: string): Promise<IngredientRow> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!ingredient) throw new NotFoundException(`Ingredient not found: ${id}`);

    if (ingredient.type === IngredientType.RAW) {
      await this.prisma.ingredient.updateMany({
        where: { id, companyId, deletedAt: null },
        data: { name: dto.name },
      });
    } else {
      if (dto.yield == null || !dto.yieldUnit || !dto.items) {
        throw new BadRequestException(
          "yield, yieldUnit, and items are required for SEMI_FINISHED update",
        );
      }
      const ingredientIds = dto.items.map((i) => i.ingredientId);
      const found = await this.prisma.ingredient.findMany({
        where: { id: { in: ingredientIds }, companyId, deletedAt: null },
        select: { id: true },
      });
      if (found.length !== ingredientIds.length) {
        throw new BadRequestException("One or more ingredients not found in this company");
      }
      if (!ingredient.compositionRecipeId) {
        throw new NotFoundException(`Composition recipe not found for ingredient: ${id}`);
      }
      const recipeId = ingredient.compositionRecipeId;

      await this.prisma.$transaction(async (tx) => {
        await tx.ingredient.updateMany({
          where: { id, companyId, deletedAt: null },
          data: { name: dto.name, unit: dto.yieldUnit! },
        });
        await tx.recipe.updateMany({
          where: { id: recipeId, companyId, deletedAt: null },
          data: {
            name: dto.name,
            yield: new Prisma.Decimal(dto.yield!),
            yieldUnit: dto.yieldUnit!,
          },
        });
        await tx.recipeItem.deleteMany({ where: { recipeId } });
        await tx.recipeItem.createMany({
          data: dto.items!.map((item) => ({
            companyId,
            recipeId,
            ingredientId: item.ingredientId,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
          })),
        });
      });
    }

    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!ingredient) throw new NotFoundException(`Ingredient not found: ${id}`);

    const usages = await this.prisma.recipeItem.findMany({
      where: { ingredientId: id, companyId, recipe: { deletedAt: null } },
      include: { recipe: { select: { name: true } } },
    });

    if (usages.length > 0) {
      const recipeNames = [...new Set(usages.map((u) => u.recipe.name))];
      throw new HttpException(
        { statusCode: 409, message: "Ingrediente em uso", usedIn: recipeNames },
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.ingredient.update({ where: { id }, data: { deletedAt: now } });
      if (ingredient.compositionRecipeId) {
        await tx.recipe.update({
          where: { id: ingredient.compositionRecipeId },
          data: { deletedAt: now },
        });
      }
    });
  }
}
