import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { IngredientType, IngredientUnit } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "./cost-calculator.service";

describe("CostCalculatorService", () => {
  let service: CostCalculatorService;
  let prisma: {
    ingredient: { findFirst: jest.Mock };
    ingredientPrice: { findMany: jest.Mock };
    product: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      ingredient: { findFirst: jest.fn() },
      ingredientPrice: { findMany: jest.fn() },
      product: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CostCalculatorService);
  });

  afterEach(() => jest.clearAllMocks());

  const RAW_FLOUR = {
    id: "ing-flour",
    companyId: "co1",
    name: "Farinha",
    unit: IngredientUnit.GRAM,
    type: IngredientType.RAW,
    deletedAt: null,
    compositionRecipeId: null,
    compositionRecipe: null,
  };

  const SEMI_MASSA = {
    id: "ing-massa",
    companyId: "co1",
    name: "Massa de Pizza",
    unit: IngredientUnit.GRAM,
    type: IngredientType.SEMI_FINISHED,
    deletedAt: null,
    compositionRecipeId: "rec-massa",
    compositionRecipe: {
      id: "rec-massa",
      companyId: "co1",
      yield: 1000,
      yieldUnit: IngredientUnit.GRAM,
      deletedAt: null,
      items: [
        {
          id: "ri-1",
          ingredientId: "ing-flour",
          quantity: 500,
          unit: IngredientUnit.GRAM,
          ingredient: RAW_FLOUR,
        },
      ],
    },
  };

  it("calculates cost per unit for a RAW ingredient", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(RAW_FLOUR);
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.005", createdAt: new Date() },
    ]);

    const result = await service.calculateIngredientCost("ing-flour", "co1");

    expect(result.costPerUnit).toBeCloseTo(0.005);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].type).toBe("raw");
    expect(result.breakdown[0].name).toBe("Farinha");
  });

  it("calculates cost per unit for a SEMI_FINISHED by summing its composition", async () => {
    prisma.ingredient.findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "ing-massa") return Promise.resolve(SEMI_MASSA);
      if (where.id === "ing-flour") return Promise.resolve(RAW_FLOUR);
      return Promise.resolve(null);
    });
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.006", createdAt: new Date() },
    ]);

    const result = await service.calculateIngredientCost("ing-massa", "co1");

    // 500g farinha × 0.006 = 3.0 total; yield=1000g → 0.003/g
    expect(result.totalCost).toBeCloseTo(3.0);
    expect(result.costPerUnit).toBeCloseTo(0.003);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].type).toBe("semi_finished");
    expect(result.breakdown[0].name).toBe("Massa de Pizza");
  });

  it("throws BadRequestException on circular SEMI_FINISHED dependencies", async () => {
    const circularA = {
      id: "a",
      companyId: "co1",
      name: "A",
      unit: IngredientUnit.GRAM,
      type: IngredientType.SEMI_FINISHED,
      deletedAt: null,
      compositionRecipeId: "rec-a",
      compositionRecipe: {
        id: "rec-a",
        companyId: "co1",
        yield: 1,
        yieldUnit: IngredientUnit.UNIT,
        deletedAt: null,
        items: [
          { id: "ri-a", ingredientId: "b", quantity: 1, unit: IngredientUnit.UNIT,
            ingredient: { id: "b", type: IngredientType.SEMI_FINISHED } },
        ],
      },
    };
    const circularB = {
      id: "b",
      companyId: "co1",
      name: "B",
      unit: IngredientUnit.GRAM,
      type: IngredientType.SEMI_FINISHED,
      deletedAt: null,
      compositionRecipeId: "rec-b",
      compositionRecipe: {
        id: "rec-b",
        companyId: "co1",
        yield: 1,
        yieldUnit: IngredientUnit.UNIT,
        deletedAt: null,
        items: [
          { id: "ri-b", ingredientId: "a", quantity: 1, unit: IngredientUnit.UNIT,
            ingredient: { id: "a", type: IngredientType.SEMI_FINISHED } },
        ],
      },
    };

    prisma.ingredient.findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "a") return Promise.resolve(circularA);
      if (where.id === "b") return Promise.resolve(circularB);
      return Promise.resolve(null);
    });
    prisma.ingredientPrice.findMany.mockResolvedValue([]);

    await expect(service.calculateIngredientCost("a", "co1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws NotFoundException when ingredient does not exist", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(service.calculateIngredientCost("missing", "co1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns cached result on second call (no extra DB queries)", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(RAW_FLOUR);
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.005", createdAt: new Date() },
    ]);

    await service.calculateIngredientCost("ing-flour", "co1");
    await service.calculateIngredientCost("ing-flour", "co1");

    expect(prisma.ingredient.findFirst).toHaveBeenCalledTimes(1);
  });

  describe("calculateProductCost", () => {
    it("throws NotFoundException when product not found", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.calculateProductCost("no-id", "co1")).rejects.toThrow(NotFoundException);
    });

    it("returns zero costs for product with no ingredients and no extra costs", async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: "p1",
        companyId: "co1",
        recipe: { items: [], yield: 1, yieldUnit: "UNIT" },
        extraCosts: [],
      } as any);
      const result = await service.calculateProductCost("p1", "co1");
      expect(result.ingredientCostPerUnit).toBe(0);
      expect(result.extraCostPerUnit).toBe(0);
      expect(result.totalCostPerUnit).toBe(0);
    });

    it("sums ingredient cost and extra costs correctly", async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: "p1",
        companyId: "co1",
        recipe: {
          items: [
            {
              ingredientId: "ing-flour",
              quantity: 100,
              ingredient: { id: "ing-flour", name: "Farinha", type: "RAW", unit: "GRAM" },
            },
          ],
          yield: 1,
          yieldUnit: "UNIT",
        },
        extraCosts: [{ name: "Labor", unitCost: 5 }],
      } as any);
      prisma.ingredient.findFirst.mockResolvedValue(RAW_FLOUR);
      prisma.ingredientPrice.findMany.mockResolvedValue([
        { ingredientId: "ing-flour", pricePerUnit: "0.006", createdAt: new Date() },
      ]);
      const result = await service.calculateProductCost("p1", "co1");
      expect(result.ingredientCostPerUnit).toBeCloseTo(0.6);
      expect(result.extraCostPerUnit).toBeCloseTo(5);
      expect(result.totalCostPerUnit).toBeCloseTo(5.6);
    });
  });
});
