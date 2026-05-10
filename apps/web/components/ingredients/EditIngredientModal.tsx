"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import type {
  CompositionLineDraft,
  IngredientListItem,
  IngredientRow,
  IngredientUnit,
} from "@/types/ingredients";
import { useIngredientDetail, useUpdateIngredient } from "@/hooks/useIngredients";
import { parseDecimalInput, newDraftId, unitToLabel } from "@/lib/ingredient-math";
import { Field, Input, Label } from "./form-primitives";
import { IngredientFormCompound } from "./IngredientFormCompound";
import type { CompoundFormMeta } from "./IngredientFormCompound";
import { CostSummaryCard } from "./CostSummaryCard";

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
  width: min(1080px, 100%);
  max-height: min(92vh, 900px);
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
  gap: 1.25rem;
  align-items: start;

  @media (min-width: 920px) {
    grid-template-columns: 1fr 260px;
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
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

const ErrorMsg = styled.p`
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.8125rem;
  font-weight: 500;
`;

type EditIngredientModalProps = {
  open: boolean;
  ingredient: IngredientRow | null;
  onClose: () => void;
  rawIngredients: IngredientListItem[];
};

export function EditIngredientModal({
  open,
  ingredient,
  onClose,
  rawIngredients,
}: EditIngredientModalProps) {
  const updateIngredient = useUpdateIngredient();
  const [submitError, setSubmitError] = useState("");

  // RAW form state
  const [rawName, setRawName] = useState("");

  // SEMI_FINISHED form state
  const [compoundMeta, setCompoundMeta] = useState<CompoundFormMeta>({
    name: "",
    category: "",
    yield: "",
    yieldUnit: "GRAM",
  });
  const [lines, setLines] = useState<CompositionLineDraft[]>([]);

  const detailQuery = useIngredientDetail(
    open && ingredient?.type === "SEMI_FINISHED" ? ingredient.id : null,
  );

  // Reset basic fields when ingredient changes
  useEffect(() => {
    if (!ingredient) return;
    setSubmitError("");
    if (ingredient.type === "RAW") {
      setRawName(ingredient.name);
    } else {
      setCompoundMeta({
        name: ingredient.name,
        category: "",
        yield: String(ingredient.compositionYield ?? ""),
        yieldUnit: (ingredient.compositionYieldUnit ?? "GRAM") as IngredientUnit,
      });
      setLines([]);
    }
  }, [ingredient]);

  // Populate composition lines when detail data arrives
  useEffect(() => {
    if (!detailQuery.data?.compositionItems) return;
    setLines(
      detailQuery.data.compositionItems.map((item) => {
        const ing = rawIngredients.find((r) => r.id === item.ingredientId);
        return {
          id: newDraftId(),
          ingredientId: item.ingredientId,
          ingredientName: ing?.name ?? "",
          quantity: item.quantity,
          unit: item.unit as IngredientUnit,
          lineCost: ing?.unitCost ? item.quantity * ing.unitCost : 0,
        };
      }),
    );
  }, [detailQuery.data, rawIngredients]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const yieldNum = parseDecimalInput(compoundMeta.yield);
  const compoundTotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineCost, 0),
    [lines],
  );
  const compoundUnitCost =
    yieldNum > 0 && compoundTotal > 0 ? compoundTotal / yieldNum : null;

  const isRawValid = rawName.trim().length > 0;
  const isSemiValid =
    compoundMeta.name.trim().length > 0 &&
    yieldNum > 0 &&
    lines.filter((l) => l.ingredientId && l.quantity > 0).length > 0;

  const handleSubmit = useCallback(() => {
    if (!ingredient) return;
    if (ingredient.type === "RAW") {
      updateIngredient.mutate(
        { id: ingredient.id, payload: { name: rawName.trim() } },
        {
          onSuccess: onClose,
          onError: () => setSubmitError("Erro ao salvar. Tente novamente."),
        },
      );
    } else {
      updateIngredient.mutate(
        {
          id: ingredient.id,
          payload: {
            name: compoundMeta.name.trim(),
            yield: yieldNum,
            yieldUnit: compoundMeta.yieldUnit,
            items: lines
              .filter((l) => l.ingredientId && l.quantity > 0)
              .map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit })),
          },
        },
        {
          onSuccess: onClose,
          onError: () => setSubmitError("Erro ao salvar. Tente novamente."),
        },
      );
    }
  }, [ingredient, rawName, compoundMeta, yieldNum, lines, updateIngredient, onClose]);

  if (!open || !ingredient) return null;

  const isSubmitDisabled =
    updateIngredient.isPending ||
    (ingredient.type === "RAW" ? !isRawValid : !isSemiValid);

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-ingredient-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="edit-ingredient-modal-title">
            Editar ingrediente
          </ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>

        <Body>
          {ingredient.type === "RAW" ? (
            <Field>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={rawName}
                onChange={(e) => setRawName(e.target.value)}
                placeholder="Ex.: Farinha de trigo"
              />
            </Field>
          ) : (
            <Layout>
              <div>
                <IngredientFormCompound
                  meta={compoundMeta}
                  onMetaChange={setCompoundMeta}
                  lines={lines}
                  onLinesChange={setLines}
                  basicOptions={rawIngredients}
                />
              </div>
              <CostSummaryCard
                variant="compound"
                totalCost={compoundTotal}
                yieldAmount={yieldNum}
                yieldUnitLabel={unitToLabel(compoundMeta.yieldUnit)}
                unitCost={compoundUnitCost}
              />
            </Layout>
          )}
        </Body>

        <Footer>
          {submitError && <ErrorMsg style={{ flexBasis: "100%", marginBottom: 0 }}>{submitError}</ErrorMsg>}
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {updateIngredient.isPending ? "Salvando…" : "Salvar"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
