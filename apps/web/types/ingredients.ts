/** Alinhado ao enum Prisma `IngredientUnit`. */
export type IngredientUnit = "GRAM" | "ML" | "UNIT";

/** Alinhado ao enum Prisma `IngredientType`. */
export type IngredientType = "RAW" | "SEMI_FINISHED";

export type IngredientFilter = "all" | "RAW" | "SEMI_FINISHED";

/** Resposta da API — shape retornado por GET /ingredients e POST /ingredients/raw|semi-finished. */
export interface IngredientRow {
  id: string;
  companyId: string;
  name: string;
  unit: IngredientUnit;
  type: IngredientType;
  compositionRecipeId: string | null;
  deletedAt: string | null;
  createdAt: string;
  latestPricePerUnit: number | null;
  compositionYield: number | null;
  compositionYieldUnit: IngredientUnit | null;
}

/** Item para exibição na tabela (derivado de IngredientRow). */
export interface IngredientListItem {
  id: string;
  name: string;
  type: IngredientType;
  unit: IngredientUnit;
  unitLabel: string;
  unitCost: number | null;
  createdAt: string;
}

/** Form state for the basic ingredient creation form. */
export interface BasicIngredientFormValues {
  name: string;
  category: string;
  supplier: string;
  pricePaid: string;
  quantityPurchased: string;
  unit: IngredientUnit;
}

export interface CompositionLineDraft {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  lineCost: number;
}

export interface CreateRawMaterialPayload {
  name: string;
  unit: IngredientUnit;
  price: number;
  quantity: number;
}

export interface CreateSemiFinishedPayload {
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  items: Array<{ ingredientId: string; quantity: number; unit: IngredientUnit }>;
}

export interface CompositionItemDetail {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface IngredientDetailRow extends IngredientRow {
  compositionItems: CompositionItemDetail[] | null;
}

export interface UpdateRawMaterialPayload {
  name: string;
}

export interface UpdateSemiFinishedPayload {
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  items: Array<{ ingredientId: string; quantity: number; unit: IngredientUnit }>;
}
