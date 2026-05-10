import type { IngredientUnit } from "@/types/ingredients";

export function formatBRL(value: number, minimumFractionDigits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const UNIT_LABEL: Record<IngredientUnit, string> = {
  GRAM: "g",
  ML: "ml",
  UNIT: "un",
};

export function unitToLabel(unit: IngredientUnit): string {
  return UNIT_LABEL[unit];
}

/** Texto tipo: R$ 30,00 / 5000 g = R$ 0,0060 por g */
export function formatUnitCostExample(
  pricePaid: number,
  qty: number,
  unit: IngredientUnit,
): string {
  if (qty <= 0 || !Number.isFinite(pricePaid)) return "—";
  const per = pricePaid / qty;
  const u = unitToLabel(unit);
  return `${formatBRL(pricePaid)} / ${qty}${u} = ${formatBRL(per)} por ${u}`;
}

export function parseDecimalInput(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function newDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

