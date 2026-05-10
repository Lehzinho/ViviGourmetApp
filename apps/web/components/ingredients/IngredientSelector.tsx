"use client";

import styled from "styled-components";
import type { IngredientListItem } from "@/types/ingredients";
import { Field, Label, Select } from "./form-primitives";

const Wrap = styled.div`
  min-width: 0;
`;

type IngredientSelectorProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (ingredientId: string) => void;
  options: IngredientListItem[];
  placeholder?: string;
};

export function IngredientSelector({
  id = "ingredient-select",
  label = "Ingrediente",
  value,
  onChange,
  options,
  placeholder = "Selecione um ingrediente básico…",
}: IngredientSelectorProps) {
  return (
    <Wrap>
      <Field>
        {label ? <Label htmlFor={id}>{label}</Label> : null}
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label || placeholder}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name} ({opt.unitLabel}) — {opt.type === "RAW" ? "Matéria-prima" : "Semiacabado"}
            </option>
          ))}
        </Select>
      </Field>
    </Wrap>
  );
}
