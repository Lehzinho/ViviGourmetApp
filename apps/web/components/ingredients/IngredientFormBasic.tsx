"use client";

import type { BasicIngredientFormValues, IngredientUnit } from "@/types/ingredients";
import { INGREDIENT_CATEGORIES } from "@/lib/ingredient-categories";
import {
  formatUnitCostExample,
  parseDecimalInput,
} from "@/lib/ingredient-math";
import {
  Field,
  FormGrid,
  HelperText,
  Input,
  Label,
  Select,
  SectionTitle,
} from "./form-primitives";

type IngredientFormBasicProps = {
  value: BasicIngredientFormValues;
  onChange: (next: BasicIngredientFormValues) => void;
};

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "GRAM", label: "Grama (g)" },
  { value: "ML", label: "Mililitro (ml)" },
  { value: "UNIT", label: "Unidade (un)" },
];

export function IngredientFormBasic({ value, onChange }: IngredientFormBasicProps) {
  const patch = (partial: Partial<BasicIngredientFormValues>) => {
    onChange({ ...value, ...partial });
  };

  const price = parseDecimalInput(value.pricePaid);
  const qty = parseDecimalInput(value.quantityPurchased);
  const example = formatUnitCostExample(price, qty, value.unit);

  return (
    <div>
      <SectionTitle>Dados da compra</SectionTitle>
      <FormGrid style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        <Field>
          <Label htmlFor="basic-name">Nome</Label>
          <Input
            id="basic-name"
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Ex.: Farinha tipo 1"
            autoComplete="off"
          />
        </Field>
        <Field>
          <Label htmlFor="basic-category">Categoria</Label>
          <Select
            id="basic-category"
            value={value.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            <option value="">Selecione…</option>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="basic-supplier">Fornecedor</Label>
          <Input
            id="basic-supplier"
            value={value.supplier}
            onChange={(e) => patch({ supplier: e.target.value })}
            placeholder="Nome do fornecedor"
            autoComplete="off"
          />
        </Field>
      </FormGrid>

      <SectionTitle style={{ marginTop: "1.25rem" }}>Custo da última compra</SectionTitle>
      <FormGrid style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <Field>
          <Label htmlFor="basic-price">Preço pago (R$)</Label>
          <Input
            id="basic-price"
            type="text"
            inputMode="decimal"
            value={value.pricePaid}
            onChange={(e) => patch({ pricePaid: e.target.value })}
            placeholder="30,00"
          />
        </Field>
        <Field>
          <Label htmlFor="basic-qty">Quantidade comprada</Label>
          <Input
            id="basic-qty"
            type="text"
            inputMode="decimal"
            value={value.quantityPurchased}
            onChange={(e) => patch({ quantityPurchased: e.target.value })}
            placeholder="5000"
          />
        </Field>
        <Field>
          <Label htmlFor="basic-unit">Unidade</Label>
          <Select
            id="basic-unit"
            value={value.unit}
            onChange={(e) => patch({ unit: e.target.value as IngredientUnit })}
          >
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
      <HelperText style={{ marginTop: "0.75rem" }}>
        <strong>Custo unitário calculado:</strong> {example}
      </HelperText>
    </div>
  );
}
