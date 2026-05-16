"use client";

import styled from "styled-components";
import type {
  CompositionLineDraft,
  IngredientListItem,
  IngredientUnit,
} from "@/types/ingredients";
import { INGREDIENT_CATEGORIES } from "@/lib/ingredient-categories";
import { formatBRL, newDraftId } from "@/lib/ingredient-math";
import { Field, FormGrid, HelperText, Input, Label, Select, SectionTitle } from "./form-primitives";
import { IngredientSelector } from "./IngredientSelector";

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px dashed ${({ theme }) => theme.colors.neutral[300]};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transition}, color ${({ theme }) => theme.transition};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.5rem 0.5rem 0.5rem 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.65rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

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
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryMuted};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
`;

export type CompoundFormMeta = {
  name: string;
  category: string;
  yield: string;
  yieldUnit: IngredientUnit;
};

type IngredientFormCompoundProps = {
  meta: CompoundFormMeta;
  onMetaChange: (m: CompoundFormMeta) => void;
  lines: CompositionLineDraft[];
  onLinesChange: (lines: CompositionLineDraft[]) => void;
  basicOptions: IngredientListItem[];
};

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "GRAM", label: "g" },
  { value: "ML", label: "ml" },
  { value: "UNIT", label: "un" },
];

export function IngredientFormCompound({
  meta,
  onMetaChange,
  lines,
  onLinesChange,
  basicOptions,
}: IngredientFormCompoundProps) {
  const findIng = (id: string) => basicOptions.find((b) => b.id === id);

  const updateLine = (lineId: string, partial: Partial<CompositionLineDraft>) => {
    onLinesChange(
      lines.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...partial };
        const ing = findIng(next.ingredientId);
        if (partial.ingredientId != null) {
          next.ingredientName = ing?.name ?? "";
        }
        next.lineCost =
          ing && next.quantity > 0 && next.unit === ing.unit
            ? next.quantity * (ing.unitCost ?? 0)
            : 0;
        return next;
      }),
    );
  };

  const removeLine = (lineId: string) => {
    onLinesChange(lines.filter((l) => l.id !== lineId));
  };

  return (
    <div>
      <SectionTitle>Identificação</SectionTitle>
      <MetaGrid>
        <Field>
          <Label htmlFor="cp-name">Nome</Label>
          <Input
            id="cp-name"
            value={meta.name}
            onChange={(e) => onMetaChange({ ...meta, name: e.target.value })}
            placeholder="Ex.: Massa folhada"
          />
        </Field>
        <Field>
          <Label htmlFor="cp-category">Categoria</Label>
          <Select
            id="cp-category"
            value={meta.category}
            onChange={(e) => onMetaChange({ ...meta, category: e.target.value })}
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
          <Label htmlFor="cp-yield">Rendimento</Label>
          <Input
            id="cp-yield"
            type="text"
            inputMode="decimal"
            value={meta.yield}
            onChange={(e) => onMetaChange({ ...meta, yield: e.target.value })}
            placeholder="1000"
          />
        </Field>
        <Field>
          <Label htmlFor="cp-yield-unit">Unidade final</Label>
          <Select
            id="cp-yield-unit"
            value={meta.yieldUnit}
            onChange={(e) =>
              onMetaChange({ ...meta, yieldUnit: e.target.value as IngredientUnit })
            }
          >
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </MetaGrid>

      <SectionTitle>Composição</SectionTitle>
      <HelperText style={{ marginBottom: "0.75rem" }}>
        O custo de cada linha considera a mesma unidade de referência do ingrediente básico (ex.: grama com
        grama). Se a unidade divergir, o custo da linha fica zerado até alinhar.
      </HelperText>

      <Toolbar>
        <AddBtn
          type="button"
          onClick={() =>
            onLinesChange([
              ...lines,
              {
                id: newDraftId(),
                ingredientId: "",
                ingredientName: "",
                quantity: 0,
                unit: "GRAM",
                lineCost: 0,
              },
            ])
          }
        >
          + Adicionar ingrediente
        </AddBtn>
      </Toolbar>

      <Table>
        <thead>
          <tr>
            <Th>Ingrediente</Th>
            <Th>Qtd</Th>
            <Th>Un.</Th>
            <Th>Custo</Th>
            <Th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <Td colSpan={5} style={{ color: "#71717a", fontStyle: "italic" }}>
                Nenhuma linha. Use &quot;+ Adicionar ingrediente&quot;.
              </Td>
            </tr>
          ) : (
            lines.map((line) => {
              const ing = findIng(line.ingredientId);
              const mismatch =
                Boolean(ing) && line.unit !== ing!.unit;
              return (
                <tr key={line.id}>
                  <Td style={{ minWidth: "200px" }}>
                    <IngredientSelector
                      id={`sel-${line.id}`}
                      label=""
                      value={line.ingredientId}
                      options={basicOptions}
                      onChange={(id) => updateLine(line.id, { ingredientId: id })}
                      placeholder="Escolha…"
                    />
                  </Td>
                  <Td>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity || ""}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                      style={{ width: "88px" }}
                    />
                  </Td>
                  <Td>
                    <Select
                      value={line.unit}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unit: e.target.value as IngredientUnit,
                        })
                      }
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
                    {mismatch ? (
                      <span style={{ color: "#a1a1aa" }}>Un. ≠ ref.</span>
                    ) : (
                      formatBRL(line.lineCost)
                    )}
                  </Td>
                  <Td>
                    <IconBtn
                      type="button"
                      aria-label="Remover linha"
                      onClick={() => removeLine(line.id)}
                    >
                      ✕
                    </IconBtn>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );
}
