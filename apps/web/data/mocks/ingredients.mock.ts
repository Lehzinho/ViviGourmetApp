export const MOCK_CATEGORIES = [
  "Matéria-prima",
  "Embalagem",
  "Temperos",
  "Laticínios",
  "Outro",
] as const;

export type MockCategory = (typeof MOCK_CATEGORIES)[number];
