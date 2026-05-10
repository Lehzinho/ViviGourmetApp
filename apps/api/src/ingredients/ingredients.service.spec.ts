import { BadRequestException, HttpException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { IngredientType, IngredientUnit, RecipeType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { IngredientsService } from "./ingredients.service";

describe("IngredientsService", () => {
  let service: IngredientsService;
  let prisma: {
    ingredient: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    ingredientPrice: { create: jest.Mock; findMany: jest.Mock };
    recipe: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    recipeItem: { createMany: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      ingredient: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      ingredientPrice: { create: jest.fn(), findMany: jest.fn() },
      recipe: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      recipeItem: { createMany: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(IngredientsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createRawMaterial", () => {
    it("creates ingredient and price row in a transaction", async () => {
      const createdIngredient = {
        id: "ing-1",
        companyId: "co1",
        name: "Farinha",
        unit: IngredientUnit.GRAM,
        type: IngredientType.RAW,
        compositionRecipeId: null,
        deletedAt: null,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          ingredient: {
            create: jest.fn().mockResolvedValue(createdIngredient),
          },
          ingredientPrice: {
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      prisma.ingredient.findFirst.mockResolvedValue({
        ...createdIngredient,
        prices: [{ pricePerUnit: "0.005", createdAt: new Date() }],
        compositionRecipe: null,
      });

      const result = await service.createRawMaterial(
        { name: "Farinha", unit: IngredientUnit.GRAM, price: 25, quantity: 5000 },
        "co1",
      );

      expect(result.type).toBe(IngredientType.RAW);
      expect(result.name).toBe("Farinha");
      expect(result.latestPricePerUnit).toBeCloseTo(0.005);
    });
  });

  describe("addPrice", () => {
    it("throws NotFoundException when ingredient not found or not RAW", async () => {
      prisma.ingredient.findFirst.mockResolvedValue(null);

      await expect(
        service.addPrice("missing", { price: 10, quantity: 100 }, "co1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("inserts a new IngredientPrice row", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({
        id: "ing-1",
        type: IngredientType.RAW,
      });
      prisma.ingredientPrice.create.mockResolvedValue({});

      await service.addPrice("ing-1", { price: 30, quantity: 5000 }, "co1");

      expect(prisma.ingredientPrice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingredientId: "ing-1",
          }),
        }),
      );
    });
  });

  describe("createSemiFinished", () => {
    it("throws BadRequestException when an ingredient does not belong to the company", async () => {
      prisma.ingredient.findMany.mockResolvedValue([]);

      await expect(
        service.createSemiFinished(
          {
            name: "Massa",
            yield: 1000,
            yieldUnit: IngredientUnit.GRAM,
            items: [{ ingredientId: "x", quantity: 500, unit: IngredientUnit.GRAM }],
          },
          "co1",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates recipe (COMPOSITION) + ingredient (SEMI_FINISHED) in a transaction", async () => {
      prisma.ingredient.findMany.mockResolvedValue([{ id: "ing-flour" }]);
      const createdSemi = {
        id: "semi-1",
        name: "Massa",
        unit: IngredientUnit.GRAM,
        type: IngredientType.SEMI_FINISHED,
        compositionRecipeId: "rec-1",
        deletedAt: null,
        createdAt: new Date(),
      };
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          recipe: { create: jest.fn().mockResolvedValue({ id: "rec-1" }) },
          recipeItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
          ingredient: { create: jest.fn().mockResolvedValue(createdSemi) },
        }),
      );
      prisma.ingredient.findFirst.mockResolvedValue({
        ...createdSemi,
        prices: [],
        compositionRecipe: { yield: 1000, yieldUnit: IngredientUnit.GRAM },
      });

      const result = await service.createSemiFinished(
        {
          name: "Massa",
          yield: 1000,
          yieldUnit: IngredientUnit.GRAM,
          items: [{ ingredientId: "ing-flour", quantity: 500, unit: IngredientUnit.GRAM }],
        },
        "co1",
      );

      expect(result.type).toBe(IngredientType.SEMI_FINISHED);
      expect(result.compositionRecipeId).toBe("rec-1");
    });
  });

  describe("update", () => {
    it("updates only the name for a RAW ingredient", async () => {
      const rawIngredient = {
        id: "ing-1",
        companyId: "co1",
        type: IngredientType.RAW,
        compositionRecipeId: null,
        deletedAt: null,
      };
      prisma.ingredient.findFirst
        .mockResolvedValueOnce(rawIngredient)
        .mockResolvedValueOnce({
          ...rawIngredient,
          name: "Farinha Integral",
          unit: IngredientUnit.GRAM,
          createdAt: new Date(),
          prices: [{ pricePerUnit: "0.005", createdAt: new Date() }],
          compositionRecipe: null,
        });
      prisma.ingredient.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update("ing-1", { name: "Farinha Integral" }, "co1");

      expect(prisma.ingredient.updateMany).toHaveBeenCalledWith({
        where: { id: "ing-1", companyId: "co1", deletedAt: null },
        data: { name: "Farinha Integral" },
      });
      expect(result.name).toBe("Farinha Integral");
    });

    it("throws BadRequestException when SEMI_FINISHED update omits yield", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({
        id: "semi-1",
        companyId: "co1",
        type: IngredientType.SEMI_FINISHED,
        compositionRecipeId: "rec-1",
        deletedAt: null,
      });

      await expect(
        service.update("semi-1", { name: "Massa" }, "co1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("replaces composition items in a transaction for SEMI_FINISHED", async () => {
      const semiIngredient = {
        id: "semi-1",
        companyId: "co1",
        type: IngredientType.SEMI_FINISHED,
        compositionRecipeId: "rec-1",
        deletedAt: null,
      };
      prisma.ingredient.findMany.mockResolvedValue([{ id: "ing-flour" }]);
      prisma.ingredient.findFirst
        .mockResolvedValueOnce(semiIngredient)
        .mockResolvedValueOnce({
          ...semiIngredient,
          name: "Massa Nova",
          unit: IngredientUnit.GRAM,
          createdAt: new Date(),
          prices: [],
          compositionRecipe: { yield: 500, yieldUnit: IngredientUnit.GRAM },
        });

      const txUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const txRecipeUpdate = jest.fn().mockResolvedValue({});
      const txDeleteMany = jest.fn().mockResolvedValue({});
      const txCreateMany = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          ingredient: { updateMany: txUpdateMany },
          recipe: { updateMany: txRecipeUpdate },
          recipeItem: { deleteMany: txDeleteMany, createMany: txCreateMany },
        }),
      );

      await service.update(
        "semi-1",
        {
          name: "Massa Nova",
          yield: 500,
          yieldUnit: IngredientUnit.GRAM,
          items: [{ ingredientId: "ing-flour", quantity: 300, unit: IngredientUnit.GRAM }],
        },
        "co1",
      );

      expect(txDeleteMany).toHaveBeenCalledWith({ where: { recipeId: "rec-1" } });
      expect(txCreateMany).toHaveBeenCalled();
    });

    it("throws NotFoundException when ingredient is not found", async () => {
      prisma.ingredient.findFirst.mockResolvedValue(null);
      await expect(service.update("missing", { name: "X" }, "co1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws BadRequestException when SEMI_FINISHED update references an ingredient from another company", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({
        id: "semi-1",
        companyId: "co1",
        type: IngredientType.SEMI_FINISHED,
        compositionRecipeId: "rec-1",
        deletedAt: null,
      });
      prisma.ingredient.findMany.mockResolvedValue([]); // none found in this company

      await expect(
        service.update(
          "semi-1",
          {
            name: "Massa",
            yield: 500,
            yieldUnit: IngredientUnit.GRAM,
            items: [{ ingredientId: "ing-other-company", quantity: 100, unit: IngredientUnit.GRAM }],
          },
          "co1",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when ingredient not found", async () => {
      prisma.ingredient.findFirst.mockResolvedValue(null);
      await expect(service.remove("x", "co1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws 409 HttpException when ingredient is referenced by a recipe item", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({ id: "ing-1", deletedAt: null });
      prisma.recipeItem.findMany.mockResolvedValue([
        { recipe: { name: "Pão de mel" } },
      ]);

      await expect(service.remove("ing-1", "co1")).rejects.toMatchObject({
        status: 409,
      });
    });

    it("soft-deletes the ingredient when not in use", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({
        id: "ing-1",
        deletedAt: null,
        compositionRecipeId: null,
      });
      prisma.recipeItem.findMany.mockResolvedValue([]);

      const txIngredientUpdate = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          ingredient: { update: txIngredientUpdate },
          recipe: { update: jest.fn().mockResolvedValue({}) },
        }),
      );

      await service.remove("ing-1", "co1");

      expect(txIngredientUpdate).toHaveBeenCalledWith({
        where: { id: "ing-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });
  });
});
