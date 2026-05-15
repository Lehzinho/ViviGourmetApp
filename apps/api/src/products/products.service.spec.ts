import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import { ProductsService } from "./products.service";

const mockPrisma = () => ({
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  recipe: {
    create: jest.fn(),
    update: jest.fn(),
  },
  recipeItem: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  productExtraCost: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  ingredient: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

const mockCostCalculator = () => ({
  calculateProductCost: jest.fn().mockRejectedValue(new Error("no prices")),
});

describe("ProductsService", () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CostCalculatorService, useValue: mockCostCalculator() },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  const makeProductRow = (overrides = {}) => ({
    id: "p1",
    companyId: "co1",
    name: "Biscoito",
    description: null,
    photoUrl: null,
    weight: null,
    dimensions: null,
    recipeId: "r1",
    categoryId: null,
    sellingPrice: new Decimal(10),
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  describe("findAll", () => {
    it("returns mapped rows", async () => {
      prisma.product.findMany.mockResolvedValue([makeProductRow()]);
      const result = await service.findAll("co1");
      expect(result).toHaveLength(1);
      expect(result[0].sellingPrice).toBe(10);
      expect(result[0].name).toBe("Biscoito");
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when not found", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne("no-id", "co1")).rejects.toThrow(NotFoundException);
    });

    it("returns product detail with items and extraCosts", async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...makeProductRow(),
        recipe: {
          items: [
            {
              ingredientId: "ing1",
              quantity: new Decimal(100),
              unit: "GRAM",
              ingredient: { name: "Flour" },
            },
          ],
        },
        extraCosts: [{ id: "ec1", name: "Labor", unitCost: new Decimal(5) }],
      });
      const result = await service.findOne("p1", "co1");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ingredientName).toBe("Flour");
      expect(result.items[0].quantity).toBe(100);
      expect(result.extraCosts[0].unitCost).toBe(5);
    });
  });

  describe("create", () => {
    it("throws BadRequestException when ingredient not in company", async () => {
      prisma.ingredient.findMany.mockResolvedValue([]);
      await expect(
        service.create(
          {
            name: "Biscoito",
            sellingPrice: 10,
            items: [{ ingredientId: "ing1", quantity: 100, unit: "GRAM" as any }],
            extraCosts: [],
          },
          "co1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("calls $transaction on valid create", async () => {
      prisma.ingredient.findMany.mockResolvedValue([{ id: "ing1" }]);
      const createdProduct = makeProductRow();
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.recipe.create.mockResolvedValue({ id: "r1" });
        prisma.recipeItem.createMany.mockResolvedValue({ count: 1 });
        prisma.product.create.mockResolvedValue(createdProduct);
        prisma.productExtraCost.createMany.mockResolvedValue({ count: 0 });
        return fn(prisma);
      });
      prisma.product.findFirst.mockResolvedValue({
        ...createdProduct,
        recipe: { items: [], yield: new Decimal(1), yieldUnit: "UNIT" },
        extraCosts: [],
      });
      await service.create(
        {
          name: "Biscoito",
          sellingPrice: 10,
          items: [{ ingredientId: "ing1", quantity: 100, unit: "GRAM" as any }],
          extraCosts: [],
        },
        "co1",
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("throws NotFoundException when product not found", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.update("no-id", { name: "X" }, "co1")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when updated ingredient not in company", async () => {
      prisma.product.findFirst.mockResolvedValue(makeProductRow());
      prisma.ingredient.findMany.mockResolvedValue([]);
      await expect(
        service.update(
          "p1",
          { items: [{ ingredientId: "bad-ing", quantity: 1, unit: "GRAM" as any }] },
          "co1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when product not found", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.remove("no-id", "co1")).rejects.toThrow(NotFoundException);
    });

    it("soft-deletes product and recipe in transaction", async () => {
      prisma.product.findFirst.mockResolvedValue(makeProductRow());
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.product.update.mockResolvedValue({});
        prisma.recipe.update.mockResolvedValue({});
        return fn(prisma);
      });
      await service.remove("p1", "co1");
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
