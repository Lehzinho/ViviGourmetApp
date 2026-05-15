import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IngredientUnit, RecipeType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import type { CreateRecipeDto } from "./dto/create-recipe.dto";
import type { UpdateRecipeDto } from "./dto/update-recipe.dto";

export type RecipeRow = {
  id: string;
  companyId: string;
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  totalCost: number | null;
  costPerUnit: number | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type RecipeItemRow = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
};

export type RecipeDetailRow = RecipeRow & {
  items: RecipeItemRow[];
};

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costCalculator: CostCalculatorService,
  ) {}

  async create(companyId: string, dto: CreateRecipeDto): Promise<RecipeDetailRow> {
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== ingredientIds.length) {
      throw new BadRequestException("One or more ingredients not found in this company");
    }

    let recipeId!: string;
    await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          companyId,
          name: dto.name,
          type: RecipeType.PRODUCT,
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
      recipeId = recipe.id;
    });

    return this.findOne(companyId, recipeId);
  }

  async findAll(companyId: string): Promise<RecipeRow[]> {
    const rows = await this.prisma.recipe.findMany({
      where: { companyId, type: RecipeType.PRODUCT, deletedAt: null },
      orderBy: { name: "asc" },
    });
    const mapped = rows.map((r) => this.toRow(r));
    const costResults = await Promise.allSettled(
      mapped.map((r) => this.costCalculator.calculateRecipeCost(r.id, companyId)),
    );
    return mapped.map((row, i) => ({
      ...row,
      totalCost:
        costResults[i].status === "fulfilled"
          ? (costResults[i] as PromiseFulfilledResult<{ totalCost: number }>).value.totalCost
          : null,
      costPerUnit:
        costResults[i].status === "fulfilled"
          ? (costResults[i] as PromiseFulfilledResult<{ costPerUnit: number }>).value.costPerUnit
          : null,
    }));
  }

  async findOne(companyId: string, id: string): Promise<RecipeDetailRow> {
    const r = await this.prisma.recipe.findFirst({
      where: { id, companyId, type: RecipeType.PRODUCT, deletedAt: null },
      include: {
        items: {
          include: { ingredient: { select: { name: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!r) throw new NotFoundException(`Recipe not found: ${id}`);

    let totalCost: number | null = null;
    let costPerUnit: number | null = null;
    try {
      const cost = await this.costCalculator.calculateRecipeCost(id, companyId);
      totalCost = cost.totalCost;
      costPerUnit = cost.costPerUnit;
    } catch {
      // cost unavailable — no prices yet
    }

    return {
      ...this.toRow(r),
      totalCost,
      costPerUnit,
      items: r.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
    };
  }

  async update(companyId: string, id: string, dto: UpdateRecipeDto): Promise<RecipeDetailRow> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, companyId, type: RecipeType.PRODUCT, deletedAt: null },
    });
    if (!recipe) throw new NotFoundException(`Recipe not found: ${id}`);

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
      await tx.recipe.update({
        where: { id },
        data: {
          ...(dto.name != null && { name: dto.name }),
          ...(dto.yield != null && { yield: new Prisma.Decimal(dto.yield) }),
          ...(dto.yieldUnit != null && { yieldUnit: dto.yieldUnit }),
        },
      });

      if (dto.items !== undefined) {
        await tx.recipeItem.deleteMany({ where: { recipeId: id } });
        await tx.recipeItem.createMany({
          data: dto.items.map((item) => ({
            companyId,
            recipeId: id,
            ingredientId: item.ingredientId,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
          })),
        });
      }
    });

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, companyId, type: RecipeType.PRODUCT, deletedAt: null },
    });
    if (!recipe) throw new NotFoundException(`Recipe not found: ${id}`);

    const usages = await this.prisma.product.findMany({
      where: { recipeId: id, companyId, deletedAt: null },
      select: { name: true },
    });

    if (usages.length > 0) {
      const productNames = usages.map((u) => u.name);
      throw new HttpException(
        { statusCode: 409, message: "Receita em uso", usedIn: productNames },
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toRow(r: {
    id: string;
    companyId: string;
    name: string;
    yield: Prisma.Decimal;
    yieldUnit: IngredientUnit;
    createdAt: Date;
    deletedAt: Date | null;
  }): RecipeRow {
    return {
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      yield: Number(r.yield),
      yieldUnit: r.yieldUnit,
      totalCost: null,
      costPerUnit: null,
      createdAt: r.createdAt,
      deletedAt: r.deletedAt,
    };
  }
}
