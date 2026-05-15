import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateExpenseDto } from "./dto/create-expense.dto";
import type { UpdateExpenseDto } from "./dto/update-expense.dto";
import type { FilterExpensesDto } from "./dto/filter-expenses.dto";

export type ExpenseRow = {
  id: string;
  companyId: string;
  name: string;
  amount: number;
  category: string;
  recurrence: string;
  date: Date;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpensesResult = {
  data: ExpenseRow[];
  total: number;
  count: number;
};

export type MonthlySummary = {
  total: number;
  byCategory: Record<string, number>;
  count: number;
};

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateExpenseDto): Promise<ExpenseRow> {
    const expense = await this.prisma.expense.create({
      data: {
        companyId,
        name: dto.name,
        amount: new Prisma.Decimal(dto.amount),
        category: dto.category,
        recurrence: dto.recurrence,
        date: new Date(dto.date),
        notes: dto.notes ?? null,
      },
    });
    return this.toRow(expense);
  }

  async findAll(companyId: string, filters: FilterExpensesDto): Promise<ExpensesResult> {
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      deletedAt: null,
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.recurrence ? { recurrence: filters.recurrence } : {}),
    };

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const data = expenses.map((e) => this.toRow(e));
    return {
      data,
      total: data.reduce((sum, e) => sum + e.amount, 0),
      count: data.length,
    };
  }

  async findOne(companyId: string, id: string): Promise<ExpenseRow | null> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return expense ? this.toRow(expense) : null;
  }

  async update(companyId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseRow> {
    const existing = await this.prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Expense not found: ${id}`);

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: new Prisma.Decimal(dto.amount) }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
    });
    return this.toRow(updated);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const existing = await this.prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Expense not found: ${id}`);

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMonthlySummary(
    companyId: string,
    year: number,
    month: number,
  ): Promise<MonthlySummary> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { date: { gte: start, lte: end } },
          { recurrence: "monthly" },
        ],
      },
    });

    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const e of expenses) {
      const amount = Number(e.amount);
      total += amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + amount;
    }

    return { total, byCategory, count: expenses.length };
  }

  private toRow(e: {
    id: string;
    companyId: string;
    name: string;
    amount: Prisma.Decimal;
    category: string;
    recurrence: string;
    date: Date;
    notes: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ExpenseRow {
    return {
      id: e.id,
      companyId: e.companyId,
      name: e.name,
      amount: Number(e.amount),
      category: e.category,
      recurrence: e.recurrence,
      date: e.date,
      notes: e.notes,
      deletedAt: e.deletedAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
