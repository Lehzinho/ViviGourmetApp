"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { apiClient } from "@/lib/apiClient";
import { newDraftId, parseDecimalInput } from "@/lib/ingredient-math";
import type { IngredientListItem, IngredientUnit } from "@/types/ingredients";
import type { CreateRecipePayload, RecipeItemDraft } from "@/types/recipes";
import {
  Field,
  Input,
  Label,
  SectionTitle,
  Select,
} from "@/components/ingredients/form-primitives";
import { RecipeItemForm } from "./RecipeItemForm";
import { RecipeCostCard } from "./RecipeCostCard";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  overflow-y: auto;
`;

const Panel = styled.div`
  width: min(960px, 100%);
  max-height: min(94vh, 900px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
`;

const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.surface};
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 1.1rem;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[200]};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
`;

const Layout = styled.div`
  display: grid;
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 800px) {
    grid-template-columns: 1fr 240px;
  }
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  flex-shrink: 0;
`;

const Btn = styled.button<{ $variant?: "ghost" | "primary" }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  ${({ theme, $variant }) =>
    $variant === "primary"
      ? `
    background: ${theme.colors.primary};
    color: ${theme.colors.text.inverse};
    &:hover:not(:disabled) { background: ${theme.colors.primaryHover}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

const CompTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  margin-top: 0.5rem;
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

const EmptyTd = styled.td`
  padding: 0.75rem 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
  font-size: 0.8125rem;
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
  margin-top: 0.75rem;
  transition: border-color ${({ theme }) => theme.transition},
    color ${({ theme }) => theme.transition};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ErrorMsg = styled.p`
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #fff1f1;
  color: #dc2626;
  font-size: 0.8125rem;
  font-weight: 500;
`;

const MetaGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  margin-bottom: 1.5rem;
`;

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "GRAM", label: "g" },
  { value: "ML", label: "ml" },
  { value: "UNIT", label: "un" },
];

const emptyState = () => ({ name: "", yield: "", yieldUnit: "GRAM" as IngredientUnit });

type RecipeModalProps = {
  open: boolean;
  onClose: () => void;
  allIngredients: IngredientListItem[];
  onSubmit: (payload: CreateRecipePayload) => void;
  isLoading: boolean;
  submitError?: string;
};

export function RecipeModal({
  open,
  onClose,
  allIngredients,
  onSubmit,
  isLoading,
  submitError,
}: RecipeModalProps) {
  const [meta, setMeta] = useState(emptyState);
  const [lines, setLines] = useState<RecipeItemDraft[]>([]);
  const semiCostCache = useRef<Record<string, number>>({});

  const reset = useCallback(() => {
    setMeta(emptyState());
    setLines([]);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const findIng = useCallback(
    (id: string) => allIngredients.find((i) => i.id === id),
    [allIngredients],
  );

  const computeLineCost = useCallback(
    (line: RecipeItemDraft, partial: Partial<RecipeItemDraft>): number => {
      const next = { ...line, ...partial };
      const ing = findIng(next.ingredientId);
      if (!ing || !next.ingredientId || next.quantity <= 0) return 0;
      if (ing.type === "SEMI_FINISHED") {
        const cached = semiCostCache.current[ing.id];
        return cached !== undefined ? next.quantity * cached : 0;
      }
      return next.unit === ing.unit ? next.quantity * (ing.unitCost ?? 0) : 0;
    },
    [findIng],
  );

  const fetchSemiCost = useCallback(
    (ingId: string) => {
      if (semiCostCache.current[ingId] !== undefined) return;
      apiClient
        .get<{ costPerUnit: number }>(`/ingredients/${ingId}/cost`)
        .then(({ data }) => {
          semiCostCache.current[ingId] = data.costPerUnit;
          setLines((prev) =>
            prev.map((l) =>
              l.ingredientId === ingId
                ? { ...l, lineCost: l.quantity > 0 ? l.quantity * data.costPerUnit : 0 }
                : l,
            ),
          );
        })
        .catch(() => {});
    },
    [],
  );

  const updateLine = (lineId: string, partial: Partial<RecipeItemDraft>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...partial };
        if (partial.ingredientId != null) {
          const ing = findIng(partial.ingredientId);
          next.ingredientName = ing?.name ?? "";
          if (ing?.type === "SEMI_FINISHED") fetchSemiCost(ing.id);
        }
        next.lineCost = computeLineCost(line, partial);
        return next;
      }),
    );
  };

  const totalCost = useMemo(() => lines.reduce((s, l) => s + l.lineCost, 0), [lines]);
  const yieldAmount = parseDecimalInput(meta.yield);

  const isValid =
    meta.name.trim().length > 0 &&
    yieldAmount > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.ingredientId && l.quantity > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      name: meta.name.trim(),
      yield: yieldAmount,
      yieldUnit: meta.yieldUnit,
      items: lines.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: l.quantity,
        unit: l.unit,
      })),
    });
  };

  if (!open) return null;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="recipe-modal-title">Nova receita</ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}
          <Layout>
            <div>
              <SectionTitle>Identificação</SectionTitle>
              <MetaGrid>
                <Field>
                  <Label htmlFor="rm-name">Nome *</Label>
                  <Input
                    id="rm-name"
                    value={meta.name}
                    onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                    placeholder="Ex.: Pão de queijo"
                  />
                </Field>
                <Field>
                  <Label htmlFor="rm-yield">Rendimento *</Label>
                  <Input
                    id="rm-yield"
                    type="text"
                    inputMode="decimal"
                    value={meta.yield}
                    onChange={(e) => setMeta((m) => ({ ...m, yield: e.target.value }))}
                    placeholder="Ex.: 500"
                  />
                </Field>
                <Field>
                  <Label htmlFor="rm-unit">Unidade *</Label>
                  <Select
                    id="rm-unit"
                    value={meta.yieldUnit}
                    onChange={(e) =>
                      setMeta((m) => ({ ...m, yieldUnit: e.target.value as IngredientUnit }))
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
              <CompTable>
                <thead>
                  <tr>
                    <Th>Ingrediente</Th>
                    <Th>Qtd</Th>
                    <Th>Un.</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <EmptyTd colSpan={4}>
                        Nenhuma linha. Use &quot;+ Adicionar ingrediente&quot;.
                      </EmptyTd>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <RecipeItemForm
                        key={line.id}
                        line={line}
                        allIngredients={allIngredients}
                        prefix="rm"
                        onChange={(partial) => updateLine(line.id, partial)}
                        onRemove={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                      />
                    ))
                  )}
                </tbody>
              </CompTable>
              <AddBtn
                type="button"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
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
            </div>

            <RecipeCostCard
              totalCost={totalCost}
              yield={yieldAmount}
              yieldUnit={meta.yieldUnit}
            />
          </Layout>
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? "Salvando…" : "Criar receita"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
