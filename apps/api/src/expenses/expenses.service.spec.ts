import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { ExpensesService } from "./expenses.service";

const mockPrisma = () => ({
  expense: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe("ExpensesService", () => {
  let service: ExpensesService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ExpensesService);
  });

  const makeExpenseRow = (overrides = {}) => ({
    id: "exp1",
    companyId: "co1",
    name: "Aluguel",
    amount: new Decimal("1500.00"),
    category: "Aluguel",
    recurrence: "monthly",
    date: new Date("2026-05-01"),
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("create", () => {
    it("creates an expense and returns mapped row", async () => {
      prisma.expense.create.mockResolvedValue(makeExpenseRow());
      const result = await service.create("co1", {
        name: "Aluguel",
        amount: 1500,
        category: "Aluguel",
        recurrence: "monthly",
        date: "2026-05-01",
      });
      expect(result.name).toBe("Aluguel");
      expect(result.amount).toBe(1500);
      expect(prisma.expense.create).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("filters by companyId and deletedAt null", async () => {
      prisma.expense.findMany.mockResolvedValue([makeExpenseRow()]);
      const result = await service.findAll("co1", {});
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: "co1", deletedAt: null }),
        }),
      );
    });

    it("applies from/to date filters", async () => {
      prisma.expense.findMany.mockResolvedValue([]);
      await service.findAll("co1", { from: "2026-05-01", to: "2026-05-31" });
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("returns correct total sum", async () => {
      prisma.expense.findMany.mockResolvedValue([
        makeExpenseRow({ id: "e1", amount: new Decimal("100.00") }),
        makeExpenseRow({ id: "e2", amount: new Decimal("250.50") }),
      ]);
      const result = await service.findAll("co1", {});
      expect(result.total).toBeCloseTo(350.5);
    });
  });

  describe("findOne", () => {
    it("returns null when not found", async () => {
      prisma.expense.findFirst.mockResolvedValue(null);
      const result = await service.findOne("co1", "no-id");
      expect(result).toBeNull();
    });

    it("returns mapped row when found", async () => {
      prisma.expense.findFirst.mockResolvedValue(makeExpenseRow());
      const result = await service.findOne("co1", "exp1");
      expect(result?.id).toBe("exp1");
      expect(result?.amount).toBe(1500);
    });
  });

  describe("getMonthlySummary", () => {
    it("returns total and breakdown by category", async () => {
      prisma.expense.findMany.mockResolvedValue([
        makeExpenseRow({ id: "e1", category: "Aluguel", amount: new Decimal("1500.00") }),
        makeExpenseRow({ id: "e2", category: "Energia elétrica", amount: new Decimal("300.00") }),
        makeExpenseRow({ id: "e3", category: "Aluguel", amount: new Decimal("200.00") }),
      ]);
      const result = await service.getMonthlySummary("co1", 2026, 5);
      expect(result.total).toBeCloseTo(2000);
      expect(result.byCategory["Aluguel"]).toBeCloseTo(1700);
      expect(result.byCategory["Energia elétrica"]).toBeCloseTo(300);
      expect(result.count).toBe(3);
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when expense not found", async () => {
      prisma.expense.findFirst.mockResolvedValue(null);
      await expect(service.remove("co1", "no-id")).rejects.toThrow(NotFoundException);
    });

    it("soft-deletes expense (sets deletedAt)", async () => {
      prisma.expense.findFirst.mockResolvedValue(makeExpenseRow());
      prisma.expense.update.mockResolvedValue({});
      await service.remove("co1", "exp1");
      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it("never calls prisma.expense.delete", async () => {
      prisma.expense.findFirst.mockResolvedValue(makeExpenseRow());
      prisma.expense.update.mockResolvedValue({});
      await service.remove("co1", "exp1");
      expect((prisma.expense as any).delete).toBeUndefined();
    });
  });
});
