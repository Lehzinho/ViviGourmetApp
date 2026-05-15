import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IngredientType, RecipeType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CostBreakdownItem, CostResult, ProductCostResult, RecipeCostResult } from "./cost-calculator.types";

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CostCalculatorService {
  private readonly cache = new Map<string, { value: CostResult; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async calculateIngredientCost(ingredientId: string, companyId: string): Promise<CostResult> {
    const cacheKey = `${companyId}:${ingredientId}`;
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return this.cloneResult(entry.value);
    }
    const result = await this.computeIngredientInternal(ingredientId, companyId, new Set());
    this.cache.set(cacheKey, { value: this.cloneResult(result), expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  invalidateIngredientCache(ingredientId: string, companyId: string): void {
    this.cache.delete(`${companyId}:${ingredientId}`);
  }

  async calculateProductCost(productId: string, companyId: string): Promise<ProductCostResult> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
      include: {
        recipe: {
          include: {
            items: {
              include: {
                ingredient: {
                  select: { id: true, name: true, unit: true, type: true },
                },
              },
            },
          },
        },
        extraCosts: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${productId}`);
    }

    let ingredientCostPerUnit = 0;
    const breakdown: CostBreakdownItem[] = [];

    for (const item of product.recipe.items) {
      const qty = this.toNumber(item.quantity);
      const subResult = await this.computeIngredientInternal(item.ingredientId, companyId, new Set());
      const lineCost = qty * subResult.costPerUnit;
      ingredientCostPerUnit += lineCost;
      breakdown.push({
        name: item.ingredient.name,
        type: item.ingredient.type === "RAW" ? "raw" : "semi_finished",
        quantity: qty,
        unit: item.ingredient.unit,
        unitCost: subResult.costPerUnit,
        totalCost: lineCost,
      });
    }

    const extraCostItems = product.extraCosts.map((ec) => ({
      name: ec.name,
      unitCost: this.toNumber(ec.unitCost),
    }));
    const extraCostPerUnit = extraCostItems.reduce((s, ec) => s + ec.unitCost, 0);

    return {
      ingredientCostPerUnit,
      extraCostPerUnit,
      totalCostPerUnit: ingredientCostPerUnit + extraCostPerUnit,
      breakdown,
      extraCosts: extraCostItems,
    };
  }

  async calculateRecipeCost(recipeId: string, companyId: string): Promise<RecipeCostResult> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, companyId, type: RecipeType.PRODUCT, deletedAt: null },
      include: {
        items: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true, type: true } },
          },
        },
      },
    });

    if (!recipe) throw new NotFoundException(`Recipe not found: ${recipeId}`);

    const yieldAmount = this.toNumber(recipe.yield);
    if (yieldAmount <= 0) {
      throw new BadRequestException("Recipe yield must be greater than zero");
    }

    let totalCost = 0;
    const breakdown: CostBreakdownItem[] = [];

    for (const item of recipe.items) {
      const qty = this.toNumber(item.quantity);
      const subResult = await this.computeIngredientInternal(item.ingredientId, companyId, new Set());
      const lineCost = qty * subResult.costPerUnit;
      totalCost += lineCost;
      breakdown.push({
        name: item.ingredient.name,
        type: item.ingredient.type === IngredientType.RAW ? "raw" : "semi_finished",
        quantity: qty,
        unit: item.ingredient.unit,
        unitCost: subResult.costPerUnit,
        totalCost: lineCost,
      });
    }

    return {
      totalCost,
      costPerUnit: totalCost / yieldAmount,
      yield: yieldAmount,
      yieldUnit: recipe.yieldUnit,
      breakdown,
    };
  }

  private async computeIngredientInternal(
    ingredientId: string,
    companyId: string,
    visited: Set<string>,
  ): Promise<CostResult> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, companyId, deletedAt: null },
      include: {
        compositionRecipe: {
          include: {
            items: {
              include: {
                ingredient: {
                  select: { id: true, name: true, unit: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient not found: ${ingredientId}`);
    }

    if (ingredient.type === IngredientType.RAW) {
      const priceMap = await this.getLatestPricePerUnit(companyId, [ingredientId]);
      const unitCost = priceMap.get(ingredientId);
      if (unitCost === undefined) {
        throw new BadRequestException(
          `No price history for ingredient ${ingredientId}`,
        );
      }
      return {
        totalCost: unitCost,
        costPerUnit: unitCost,
        breakdown: [
          {
            name: ingredient.name,
            type: "raw",
            quantity: 1,
            unit: ingredient.unit,
            unitCost,
            totalCost: unitCost,
          },
        ],
      };
    }

    // SEMI_FINISHED — recurse into compositionRecipe
    if (visited.has(ingredientId)) {
      throw new BadRequestException(
        `Circular dependency detected (ingredient ${ingredientId} visited twice)`,
      );
    }
    visited.add(ingredientId);
    try {
      const recipe = ingredient.compositionRecipe;
      if (!recipe) {
        throw new BadRequestException(
          `SEMI_FINISHED ingredient ${ingredientId} has no composition recipe`,
        );
      }
      const yieldTotal = this.toNumber(recipe.yield);
      if (yieldTotal <= 0) {
        throw new BadRequestException("Composition recipe yield must be greater than zero");
      }

      const rawIds = recipe.items
        .filter((i) => i.ingredient.type === IngredientType.RAW)
        .map((i) => i.ingredientId);
      const priceMap = await this.getLatestPricePerUnit(companyId, rawIds);

      let totalCost = 0;

      for (const item of recipe.items) {
        const qty = this.toNumber(item.quantity);
        const subResult = await this.resolveItemCost(item, companyId, priceMap, visited);
        totalCost += qty * subResult.unitCost;
      }

      const costPerUnit = totalCost / yieldTotal;
      return {
        totalCost,
        costPerUnit,
        breakdown: [
          {
            name: ingredient.name,
            type: "semi_finished",
            quantity: 1,
            unit: ingredient.unit,
            unitCost: costPerUnit,
            totalCost,
          },
        ],
      };
    } finally {
      visited.delete(ingredientId);
    }
  }

  private async resolveItemCost(
    item: { ingredientId: string; ingredient: { type: IngredientType } },
    companyId: string,
    priceMap: Map<string, number>,
    visited: Set<string>,
  ): Promise<{ unitCost: number }> {
    if (item.ingredient.type === IngredientType.RAW) {
      const unitCost = priceMap.get(item.ingredientId);
      if (unitCost === undefined) {
        throw new BadRequestException(
          `No price history for ingredient ${item.ingredientId}`,
        );
      }
      return { unitCost };
    }
    const subResult = await this.computeIngredientInternal(item.ingredientId, companyId, visited);
    return { unitCost: subResult.costPerUnit };
  }

  private async getLatestPricePerUnit(
    companyId: string,
    ingredientIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ingredientIds.length === 0) return map;

    const rows = await this.prisma.ingredientPrice.findMany({
      where: { companyId, ingredientId: { in: ingredientIds } },
      orderBy: { createdAt: "desc" },
    });

    for (const row of rows) {
      if (!map.has(row.ingredientId)) {
        map.set(row.ingredientId, this.toNumber(row.pricePerUnit));
      }
    }
    return map;
  }

  private cloneResult(r: CostResult): CostResult {
    return {
      totalCost: r.totalCost,
      costPerUnit: r.costPerUnit,
      breakdown: r.breakdown.map((b) => ({ ...b })),
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === "number") return value;
    return Number(value);
  }
}
