export const INGREDIENT_CATEGORIES = [
  "Matéria-prima",
  "Embalagem",
  "Temperos",
  "Laticínios",
  "Outro",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
