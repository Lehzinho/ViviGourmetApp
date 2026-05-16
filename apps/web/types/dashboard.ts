export type DashboardSummary = {
  counts: {
    ingredients: number;
    recipes: number;
    products: number;
    menus: number;
  };
  expenses: {
    thisMonth: number;
    month: number;
    year: number;
  };
  recentRecipes: {
    id: string;
    name: string;
    yield: number;
    yieldUnit: string;
    createdAt: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    salePrice: number;
    cost: number;
    margin: number;
  }[];
};
