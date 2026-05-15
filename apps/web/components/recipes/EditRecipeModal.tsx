"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { apiClient } from "@/lib/apiClient";
import { newDraftId, parseDecimalInput } from "@/lib/ingredient-math";
import type { IngredientListItem, IngredientUnit } from "@/types/ingredients";
import type { RecipeItemDraft, RecipeRow, UpdateRecipePayload } from "@/types/recipes";
import {
  Field,
  Input,
  Label,
  SectionTitle,
  Select,
} from "@/components/ingredients/form-primitives";
import { useRecipeDetail } from "@/hooks/useRecipes";
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

type EditRecipeModalProps = {
  open: boolean;
  recipe: RecipeRow | null;
  onClose: () => void;
  allIngredients: IngredientListItem[];
  onSubmit: (id: string, payload: UpdateRecipePayload) => void;
  isLoading: boolean;
  submitError?: string;
};

export function EditRecipeModal({
  open,
  recipe,
  onClose,
  allIngredients,
  onSubmit,
  isLoading,
  submitError,
}: EditRecipeModalProps) {
  const recipeId = open && recipe ? recipe.id : null;
  const detailQuery = useRecipeDetail(recipeId);
  const detail = detailQuery.data;

  const [name, setName] = useState("");
  const [yieldStr, setYieldStr] = useState("");
  const [yieldUnit, setYieldUnit] = useState<IngredientUnit>("GRAM");
  const [lines, setLines] = useState<RecipeItemDraft[]>([]);
  const semiCostCache = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!recipe) return;
    setName(recipe.name);
    setYieldStr(String(recipe.yield));
    setYieldUnit(recipe.yieldUnit);
  }, [recipe]);

  useEffect(() => {
    if (!detail) return;
    setLines(
      detail.items.map((item) => {
        const ing = allIngredients.find((i) => i.id === item.ingredientId);
        const unitCost = ing?.type === "SEMI_FINISHED" ? 0 : (ing?.unitCost ?? 0);
        return {
          id: newDraftId(),
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          lineCost: item.quantity * unitCost,
        };
      }),
    );

    detail.items.forEach((item) => {
      const ing = allIngredients.find((i) => i.id === item.ingredientId);
      if (ing?.type !== "SEMI_FINISHED") return;
      if (semiCostCache.current[ing.id] !== undefined) {
        const cost = semiCostCache.current[ing.id];
        setLines((prev) =>
          prev.map((l) =>
            l.ingredientId === ing.id
              ? { ...l, lineCost: l.quantity > 0 ? l.quantity * cost : 0 }
              : l,
          ),
        );
        return;
      }
      apiClient
        .get<{ costPerUnit: number }>(`/ingredients/${ing.id}/cost`)
        .then(({ data }) => {
          semiCostCache.current[ing.id] = data.costPerUnit;
          setLines((prev) =>
            prev.map((l) =>
              l.ingredientId === ing.id
                ? { ...l, lineCost: l.quantity > 0 ? l.quantity * data.costPerUnit : 0 }
                : l,
            ),
          );
        })
        .catch(() => {});
    });
  }, [detail, allIngredients]);

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

  const updateLine = (lineId: string, partial: Partial<RecipeItemDraft>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...partial };
        if (partial.ingredientId != null) {
          const ing = findIng(partial.ingredientId);
          next.ingredientName = ing?.name ?? "";
          if (ing?.type === "SEMI_FINISHED") {
            if (semiCostCache.current[ing.id] === undefined) {
              apiClient
                .get<{ costPerUnit: number }>(`/ingredients/${ing.id}/cost`)
                .then(({ data }) => {
                  semiCostCache.current[ing.id] = data.costPerUnit;
                  setLines((prev2) =>
                    prev2.map((l) =>
                      l.ingredientId === ing.id
                        ? { ...l, lineCost: l.quantity > 0 ? l.quantity * data.costPerUnit : 0 }
                        : l,
                    ),
                  );
                })
                .catch(() => {});
            }
          }
        }
        const ing = findIng(next.ingredientId);
        if (!ing || !next.ingredientId || next.quantity <= 0) {
          next.lineCost = 0;
        } else if (ing.type === "SEMI_FINISHED") {
          const cached = semiCostCache.current[ing.id];
          next.lineCost = cached !== undefined ? next.quantity * cached : 0;
        } else {
          next.lineCost =
            next.unit === ing.unit ? next.quantity * (ing.unitCost ?? 0) : 0;
        }
        return next;
      }),
    );
  };

  const totalCost = useMemo(() => lines.reduce((s, l) => s + l.lineCost, 0), [lines]);
  const yieldAmount = parseDecimalInput(yieldStr);

  const isValid =
    name.trim().length > 0 &&
    yieldAmount > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.ingredientId && l.quantity > 0);

  const handleSubmit = () => {
    if (!recipe || !isValid) return;
    onSubmit(recipe.id, {
      name: name.trim(),
      yield: yieldAmount,
      yieldUnit,
      items: lines.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: l.quantity,
        unit: l.unit,
      })),
    });
  };

  if (!open || !recipe) return null;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-recipe-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="edit-recipe-modal-title">Editar receita</ModalTitle>
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
                  <Label htmlFor="er-name">Nome *</Label>
                  <Input
                    id="er-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="er-yield">Rendimento *</Label>
                  <Input
                    id="er-yield"
                    type="text"
                    inputMode="decimal"
                    value={yieldStr}
                    onChange={(e) => setYieldStr(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="er-unit">Unidade *</Label>
                  <Select
                    id="er-unit"
                    value={yieldUnit}
                    onChange={(e) => setYieldUnit(e.target.value as IngredientUnit)}
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
              {detailQuery.isLoading ? (
                <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Carregando…</p>
              ) : (
                <>
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
                          <EmptyTd colSpan={4}>Nenhuma linha.</EmptyTd>
                        </tr>
                      ) : (
                        lines.map((line) => (
                          <RecipeItemForm
                            key={line.id}
                            line={line}
                            allIngredients={allIngredients}
                            prefix="er"
                            onChange={(partial) => updateLine(line.id, partial)}
                            onRemove={() =>
                              setLines((prev) => prev.filter((l) => l.id !== line.id))
                            }
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
                </>
              )}
            </div>

            <RecipeCostCard totalCost={totalCost} yield={yieldAmount} yieldUnit={yieldUnit} />
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
            {isLoading ? "Salvando…" : "Salvar alterações"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
