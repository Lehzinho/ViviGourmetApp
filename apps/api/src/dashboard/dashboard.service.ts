import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costCalculator: CostCalculatorService,
  ) {}

  async getSummary(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      ingredientsCount,
      recipesCount,
      productsCount,
      menusCount,
      customersCount,
      expensesThisMonth,
      recentRecipes,
      products,
    ] = await Promise.all([
      this.prisma.ingredient.count({ where: { companyId, deletedAt: null } }),
      this.prisma.recipe.count({ where: { companyId, deletedAt: null } }),
      this.prisma.product.count({ where: { companyId, deletedAt: null } }),
      this.prisma.menu.count({ where: { companyId } }),
      this.prisma.customer.count({ where: { companyId, deletedAt: null } }),
      this.prisma.expense.aggregate({
        where: { companyId, deletedAt: null, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.recipe.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, yield: true, yieldUnit: true, createdAt: true },
      }),
      this.prisma.product.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, sellingPrice: true },
      }),
    ]);

    const costResults = await Promise.allSettled(
      products.map((p) => this.costCalculator.calculateProductCost(p.id, companyId)),
    );

    const topProducts = products
      .map((p, i) => {
        const salePrice = Number(p.sellingPrice);
        const costResult = costResults[i];
        const cost =
          costResult.status === "fulfilled" ? costResult.value.totalCostPerUnit : 0;
        const margin = salePrice > 0 ? ((salePrice - cost) / salePrice) * 100 : 0;
        return { id: p.id, name: p.name, salePrice, cost, margin };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);

    return {
      counts: {
        ingredients: ingredientsCount,
        recipes: recipesCount,
        products: productsCount,
        menus: menusCount,
        customers: customersCount,
      },
      expenses: {
        thisMonth: Number(expensesThisMonth._sum.amount ?? 0),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      recentRecipes: recentRecipes.map((r) => ({
        id: r.id,
        name: r.name,
        yield: Number(r.yield),
        yieldUnit: r.yieldUnit,
        createdAt: r.createdAt,
      })),
      topProducts,
    };
  }
}
