import { BadRequestException, HttpException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { RecipesService } from "./recipes.service";

const mockPrisma = () => ({
  recipe: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  recipeItem: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  ingredient: {
    findMany: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe("RecipesService", () => {
  let service: RecipesService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(RecipesService);
  });

  const makeRecipeRow = (overrides = {}) => ({
    id: "r1",
    companyId: "co1",
    name: "Pão de queijo",
    type: "PRODUCT",
    yield: new Decimal(10),
    yieldUnit: "UNIT",
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  describe("findAll", () => {
    it("returns mapped rows", async () => {
      prisma.recipe.findMany.mockResolvedValue([makeRecipeRow()]);
      const result = await service.findAll("co1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Pão de queijo");
      expect(result[0].yield).toBe(10);
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when not found", async () => {
      prisma.recipe.findFirst.mockResolvedValue(null);
      await expect(service.findOne("co1", "no-id")).rejects.toThrow(NotFoundException);
    });

    it("returns recipe detail with items", async () => {
      prisma.recipe.findFirst.mockResolvedValue({
        ...makeRecipeRow(),
        items: [
          {
            id: "ri1",
            ingredientId: "ing1",
            quantity: new Decimal(200),
            unit: "GRAM",
            ingredient: { name: "Polvilho" },
          },
        ],
      });
      const result = await service.findOne("co1", "r1");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ingredientName).toBe("Polvilho");
      expect(result.items[0].quantity).toBe(200);
    });
  });

  describe("create", () => {
    it("throws BadRequestException when ingredient not in company", async () => {
      prisma.ingredient.findMany.mockResolvedValue([]);
      await expect(
        service.create("co1", {
          name: "Pão de queijo",
          yield: 10,
          yieldUnit: "UNIT" as any,
          items: [{ ingredientId: "ing1", quantity: 200, unit: "GRAM" as any }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("calls $transaction on valid create", async () => {
      prisma.ingredient.findMany.mockResolvedValue([{ id: "ing1" }]);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.recipe.create.mockResolvedValue({ id: "r1" });
        prisma.recipeItem.createMany.mockResolvedValue({ count: 1 });
        return fn(prisma);
      });
      prisma.recipe.findFirst.mockResolvedValue({
        ...makeRecipeRow(),
        items: [],
      });
      await service.create("co1", {
        name: "Pão de queijo",
        yield: 10,
        yieldUnit: "UNIT" as any,
        items: [{ ingredientId: "ing1", quantity: 200, unit: "GRAM" as any }],
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("throws NotFoundException when recipe not found", async () => {
      prisma.recipe.findFirst.mockResolvedValue(null);
      await expect(service.update("co1", "no-id", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when updated ingredient not in company", async () => {
      prisma.recipe.findFirst.mockResolvedValue(makeRecipeRow());
      prisma.ingredient.findMany.mockResolvedValue([]);
      await expect(
        service.update("co1", "r1", {
          items: [{ ingredientId: "bad-ing", quantity: 1, unit: "GRAM" as any }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("calls $transaction on valid update", async () => {
      prisma.recipe.findFirst
        .mockResolvedValueOnce(makeRecipeRow())
        .mockResolvedValueOnce({ ...makeRecipeRow(), items: [] });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.recipe.update.mockResolvedValue({});
        return fn(prisma);
      });
      await service.update("co1", "r1", { name: "Novo nome" });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when recipe not found", async () => {
      prisma.recipe.findFirst.mockResolvedValue(null);
      await expect(service.remove("co1", "no-id")).rejects.toThrow(NotFoundException);
    });

    it("throws 409 when recipe is used by a product", async () => {
      prisma.recipe.findFirst.mockResolvedValue(makeRecipeRow());
      prisma.product.findMany.mockResolvedValue([{ name: "Biscoito" }]);
      await expect(service.remove("co1", "r1")).rejects.toThrow(HttpException);
    });

    it("soft-deletes recipe when not in use", async () => {
      prisma.recipe.findFirst.mockResolvedValue(makeRecipeRow());
      prisma.product.findMany.mockResolvedValue([]);
      prisma.recipe.update.mockResolvedValue({});
      await service.remove("co1", "r1");
      expect(prisma.recipe.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });
  });
});
