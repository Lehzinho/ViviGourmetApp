"use client";

import styled from "styled-components";
import { IngredientSelector } from "@/components/ingredients/IngredientSelector";
import { Input, Select } from "@/components/ingredients/form-primitives";
import type { IngredientListItem, IngredientUnit } from "@/types/ingredients";
import type { RecipeItemDraft } from "@/types/recipes";

const Td = styled.td`
  padding: 0.5rem 0.5rem 0.5rem 0;
  vertical-align: middle;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const IconBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    color: #dc2626;
  }
`;

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "GRAM", label: "g" },
  { value: "ML", label: "ml" },
  { value: "UNIT", label: "un" },
];

type RecipeItemFormProps = {
  line: RecipeItemDraft;
  allIngredients: IngredientListItem[];
  prefix: string;
  onChange: (partial: Partial<RecipeItemDraft>) => void;
  onRemove: () => void;
};

export function RecipeItemForm({
  line,
  allIngredients,
  prefix,
  onChange,
  onRemove,
}: RecipeItemFormProps) {
  return (
    <tr>
      <Td style={{ minWidth: "200px" }}>
        <IngredientSelector
          id={`${prefix}-ing-${line.id}`}
          label=""
          value={line.ingredientId}
          options={allIngredients}
          onChange={(id) => onChange({ ingredientId: id })}
          placeholder="Escolha…"
        />
      </Td>
      <Td>
        <Input
          type="number"
          min={0}
          step="any"
          value={line.quantity || ""}
          onChange={(e) => onChange({ quantity: Number(e.target.value) || 0 })}
          style={{ width: "88px" }}
        />
      </Td>
      <Td>
        <Select
          value={line.unit}
          onChange={(e) => onChange({ unit: e.target.value as IngredientUnit })}
          style={{ width: "72px" }}
        >
          {unitOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Td>
      <Td>
        <IconBtn type="button" aria-label="Remover linha" onClick={onRemove}>
          ✕
        </IconBtn>
      </Td>
    </tr>
  );
}
