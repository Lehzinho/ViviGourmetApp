export type CostBreakdownItem = {
  name: string;
  type: "raw" | "semi_finished";
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

export type CostResult = {
  totalCost: number;
  costPerUnit: number;
  breakdown: CostBreakdownItem[];
};

export type ExtraCostItem = {
  name: string;
  unitCost: number;
};

export type ProductCostResult = {
  ingredientCostPerUnit: number;
  extraCostPerUnit: number;
  totalCostPerUnit: number;
  breakdown: CostBreakdownItem[];
  extraCosts: ExtraCostItem[];
};

export type RecipeCostResult = {
  totalCost: number;
  costPerUnit: number;
  yield: number;
  yieldUnit: string;
  breakdown: CostBreakdownItem[];
};
