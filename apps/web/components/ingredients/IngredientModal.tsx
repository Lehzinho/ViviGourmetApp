"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import type {
  BasicIngredientFormValues,
  CompositionLineDraft,
  CreateRawMaterialPayload,
  CreateSemiFinishedPayload,
  IngredientListItem,
} from "@/types/ingredients";
import { parseDecimalInput, unitToLabel } from "@/lib/ingredient-math";
import { CostSummaryCard } from "./CostSummaryCard";
import { IngredientFormBasic } from "./IngredientFormBasic";
import {
  IngredientFormCompound,
  type CompoundFormMeta,
} from "./IngredientFormCompound";

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

const KindGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`;

const KindCard = styled.button`
  text-align: left;
  padding: 1.15rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transition}, box-shadow ${({ theme }) => theme.transition};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const KindTitle = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.35rem;
`;

const KindDesc = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
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
    &:hover { background: ${theme.colors.primaryHover}; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

const StepLabel = styled.div`
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const emptyBasic = (): BasicIngredientFormValues => ({
  name: "",
  category: "",
  supplier: "",
  pricePaid: "",
  quantityPurchased: "",
  unit: "GRAM",
});

const emptyCompoundMeta = (): CompoundFormMeta => ({
  name: "",
  category: "",
  yield: "",
  yieldUnit: "GRAM",
});

type StepState = "pick" | "basic" | "compound";

type IngredientModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitRaw: (payload: CreateRawMaterialPayload) => void;
  onSubmitSemiFinished: (payload: CreateSemiFinishedPayload) => void;
  rawIngredients: IngredientListItem[];
};

export function IngredientModal({
  open,
  onClose,
  onSubmitRaw,
  onSubmitSemiFinished,
  rawIngredients,
}: IngredientModalProps) {
  const [step, setStep] = useState<StepState>("pick");
  const [basicForm, setBasicForm] = useState<BasicIngredientFormValues>(emptyBasic);
  const [compoundMeta, setCompoundMeta] = useState<CompoundFormMeta>(emptyCompoundMeta);
  const [compositionLines, setCompositionLines] = useState<CompositionLineDraft[]>([]);

  const reset = useCallback(() => {
    setStep("pick");
    setBasicForm(emptyBasic());
    setCompoundMeta(emptyCompoundMeta());
    setCompositionLines([]);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const basicPrice = parseDecimalInput(basicForm.pricePaid);
  const basicQty = parseDecimalInput(basicForm.quantityPurchased);
  const basicUnitCost =
    basicQty > 0 && basicPrice > 0 ? basicPrice / basicQty : null;

  const compoundTotal = useMemo(
    () => compositionLines.reduce((s, l) => s + l.lineCost, 0),
    [compositionLines],
  );
  const yieldNum = parseDecimalInput(compoundMeta.yield);
  const compoundUnitCost =
    yieldNum > 0 && compoundTotal > 0 ? compoundTotal / yieldNum : null;

  const validateBasic = (): boolean =>
    Boolean(
      basicForm.name.trim() &&
        basicForm.category &&
        basicForm.supplier.trim() &&
        basicPrice > 0 &&
        basicQty > 0,
    );

  const validateCompound = (): boolean => {
    if (
      !compoundMeta.name.trim() ||
      !compoundMeta.category ||
      yieldNum <= 0 ||
      compositionLines.length === 0
    ) {
      return false;
    }
    const hasCost = compositionLines.some((l) => l.lineCost > 0);
    return hasCost;
  };

  const handleCreate = () => {
    if (step === "basic" && validateBasic()) {
      onSubmitRaw({
        name: basicForm.name.trim(),
        unit: basicForm.unit,
        price: basicPrice,
        quantity: basicQty,
      });
      return;
    }
    if (step === "compound" && validateCompound()) {
      onSubmitSemiFinished({
        name: compoundMeta.name.trim(),
        yield: yieldNum,
        yieldUnit: compoundMeta.yieldUnit,
        items: compositionLines
          .filter((l) => l.ingredientId && l.lineCost > 0)
          .map((l) => ({
            ingredientId: l.ingredientId,
            quantity: l.quantity,
            unit: l.unit,
          })),
      });
    }
  };

  if (!open) return null;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingredient-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="ingredient-modal-title">Novo ingrediente</ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>
        <Body>
          {step === "pick" ? (
            <>
              <StepLabel>Etapa 1 — Tipo</StepLabel>
              <KindGrid>
                <KindCard type="button" onClick={() => setStep("basic")}>
                  <KindTitle>Ingrediente básico</KindTitle>
                  <KindDesc>
                    Matéria-prima com compra unitária. Informe preço pago, quantidade e unidade — o
                    custo unitário é calculado automaticamente.
                  </KindDesc>
                </KindCard>
                <KindCard type="button" onClick={() => setStep("compound")}>
                  <KindTitle>Ingrediente composto</KindTitle>
                  <KindDesc>
                    Combinação de ingredientes básicos com rendimento final. Ideal para massas,
                    bases e preparos intermediários.
                  </KindDesc>
                </KindCard>
              </KindGrid>
            </>
          ) : null}

          {step === "basic" ? (
            <Layout>
              <div>
                <StepLabel>Ingrediente básico</StepLabel>
                <IngredientFormBasic value={basicForm} onChange={setBasicForm} />
              </div>
              <CostSummaryCard
                variant="basic"
                pricePaid={basicPrice}
                quantity={basicQty}
                unitLabel={unitToLabel(basicForm.unit)}
                unitCost={basicUnitCost}
              />
            </Layout>
          ) : null}

          {step === "compound" ? (
            <Layout>
              <div>
                <StepLabel>Ingrediente composto</StepLabel>
                <IngredientFormCompound
                  meta={compoundMeta}
                  onMetaChange={setCompoundMeta}
                  lines={compositionLines}
                  onLinesChange={setCompositionLines}
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
          ) : null}
        </Body>
        <Footer>
          {step !== "pick" ? (
            <Btn type="button" $variant="ghost" onClick={() => setStep("pick")}>
              Voltar
            </Btn>
          ) : null}
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          {step !== "pick" ? (
            <Btn
              type="button"
              $variant="primary"
              onClick={handleCreate}
              disabled={
                step === "basic"
                  ? !validateBasic() || basicUnitCost == null
                  : step === "compound"
                    ? !validateCompound() || compoundUnitCost == null
                    : true
              }
            >
              Criar ingrediente
            </Btn>
          ) : null}
        </Footer>
      </Panel>
    </Backdrop>
  );
}
