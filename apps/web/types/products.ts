export interface ProductRow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  weight: number | null;
  dimensions: string | null;
  recipeId: string;
  categoryId: string | null;
  sellingPrice: number;
  totalCostPerUnit: number | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ProductItemDetail {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface ExtraCostRow {
  id: string;
  name: string;
  unitCost: number;
}

export interface ProductDetailRow extends ProductRow {
  items: ProductItemDetail[];
  extraCosts: ExtraCostRow[];
}

export interface ProductCostResult {
  ingredientCostPerUnit: number;
  extraCostPerUnit: number;
  totalCostPerUnit: number;
  breakdown: Array<{
    name: string;
    type: "raw" | "semi_finished";
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }>;
  extraCosts: Array<{ name: string; unitCost: number }>;
}

export interface CreateProductItemPayload {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface CreateProductExtraCostPayload {
  name: string;
  unitCost: number;
}

export interface CreateProductPayload {
  name: string;
  sellingPrice: number;
  description?: string;
  photoUrl?: string;
  weight?: number;
  dimensions?: string;
  categoryId?: string;
  items: CreateProductItemPayload[];
  extraCosts: CreateProductExtraCostPayload[];
}

export interface UpdateProductPayload {
  name?: string;
  sellingPrice?: number;
  description?: string;
  photoUrl?: string;
  weight?: number;
  dimensions?: string;
  categoryId?: string;
  items?: CreateProductItemPayload[];
  extraCosts?: CreateProductExtraCostPayload[];
}

export interface ExtraCostDraft {
  id: string;
  name: string;
  unitCost: string;
}
