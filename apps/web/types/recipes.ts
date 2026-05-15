import type { IngredientUnit } from "@/types/ingredients";

export type { IngredientUnit };

export interface RecipeItemRow {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface RecipeRow {
  id: string;
  companyId: string;
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  totalCost: number | null;
  costPerUnit: number | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface RecipeDetailRow extends RecipeRow {
  items: RecipeItemRow[];
}

export interface RecipeItemDraft {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  lineCost: number;
}

export interface CreateRecipeItemPayload {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface CreateRecipePayload {
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  items: CreateRecipeItemPayload[];
}

export interface UpdateRecipePayload {
  name?: string;
  yield?: number;
  yieldUnit?: IngredientUnit;
  items?: CreateRecipeItemPayload[];
}
