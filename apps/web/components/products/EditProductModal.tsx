"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { apiClient } from "@/lib/apiClient";
import { newDraftId, parseDecimalInput } from "@/lib/ingredient-math";
import type { CompositionLineDraft, IngredientListItem, IngredientUnit } from "@/types/ingredients";
import type { ExtraCostDraft, ProductRow, UpdateProductPayload } from "@/types/products";
import {
  Field,
  Input,
  Label,
  SectionTitle,
  Select,
} from "@/components/ingredients/form-primitives";
import { IngredientSelector } from "@/components/ingredients/IngredientSelector";
import { useProductDetail } from "@/hooks/useProducts";
import { ProductPricingCard } from "./ProductPricingCard";

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
  width: min(1100px, 100%);
  max-height: min(94vh, 960px);
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

const Td = styled.td`
  padding: 0.5rem 0.5rem 0.5rem 0;
  vertical-align: middle;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
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
  transition: border-color ${({ theme }) => theme.transition}, color ${({ theme }) => theme.transition};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  margin-bottom: 1.5rem;
`;

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "GRAM", label: "g" },
  { value: "ML", label: "ml" },
  { value: "UNIT", label: "un" },
];

type EditProductModalProps = {
  open: boolean;
  product: ProductRow | null;
  onClose: () => void;
  allIngredients: IngredientListItem[];
  onSubmit: (id: string, payload: UpdateProductPayload) => void;
  isLoading: boolean;
  submitError?: string;
};

export function EditProductModal({
  open,
  product,
  onClose,
  allIngredients,
  onSubmit,
  isLoading,
  submitError,
}: EditProductModalProps) {
  const productId = open && product ? product.id : null;
  const detailQuery = useProductDetail(productId);
  const detail = detailQuery.data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [lines, setLines] = useState<CompositionLineDraft[]>([]);
  const [extraCosts, setExtraCosts] = useState<ExtraCostDraft[]>([]);
  const [sellingPrice, setSellingPrice] = useState("");
  const [markupPct, setMarkupPct] = useState("");

  // Reset scalar fields when product changes
  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? "");
    setPhotoUrl(product.photoUrl ?? "");
    setWeight(product.weight != null ? String(product.weight) : "");
    setDimensions(product.dimensions ?? "");
    setSellingPrice(String(product.sellingPrice));
    setMarkupPct("");
  }, [product]);

  // Populate composition and extra costs from detail
  useEffect(() => {
    if (!detail) return;
    const newLines = detail.items.map((item) => {
      const ing = allIngredients.find((i) => i.id === item.ingredientId);
      const unitCost = ing?.type === "SEMI_FINISHED" ? 0 : (ing?.unitCost ?? 0);
      return {
        id: newDraftId(),
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit as IngredientUnit,
        lineCost: item.quantity * unitCost,
      };
    });
    setLines(newLines);

    // Fetch costs for any SEMI_FINISHED lines
    detail.items.forEach((item) => {
      const ing = allIngredients.find((i) => i.id === item.ingredientId);
      if (ing?.type !== "SEMI_FINISHED") return;
      if (semiFinishedCostCache.current[ing.id] !== undefined) {
        const cost = semiFinishedCostCache.current[ing.id];
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
          semiFinishedCostCache.current[ing.id] = data.costPerUnit;
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

    setExtraCosts(
      detail.extraCosts.map((ec) => ({
        id: newDraftId(),
        name: ec.name,
        unitCost: String(ec.unitCost),
      })),
    );
  }, [detail, allIngredients]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const ingredientCostPerUnit = useMemo(
    () => lines.reduce((s, l) => s + l.lineCost, 0),
    [lines],
  );
  const extraCostPerUnit = useMemo(
    () => extraCosts.reduce((s, ec) => s + (parseDecimalInput(ec.unitCost) || 0), 0),
    [extraCosts],
  );
  const totalCost = ingredientCostPerUnit + extraCostPerUnit;

  const handleSellingPriceChange = (v: string) => {
    setSellingPrice(v);
    const sp = parseDecimalInput(v);
    if (sp > 0 && totalCost > 0) {
      setMarkupPct(((sp / totalCost - 1) * 100).toFixed(2));
    }
  };

  const handleMarkupChange = (v: string) => {
    setMarkupPct(v);
    const markup = parseDecimalInput(v);
    if (totalCost > 0) {
      setSellingPrice((totalCost * (1 + markup / 100)).toFixed(2));
    }
  };

  const semiFinishedCostCache = useRef<Record<string, number>>({});

  const findIng = useCallback(
    (id: string) => allIngredients.find((i) => i.id === id),
    [allIngredients],
  );

  const updateLine = (lineId: string, partial: Partial<CompositionLineDraft>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...partial };
        const ing = findIng(next.ingredientId);
        if (partial.ingredientId != null) next.ingredientName = ing?.name ?? "";

        if (!ing || !next.ingredientId) {
          next.lineCost = 0;
        } else if (ing.type === "SEMI_FINISHED") {
          const cached = semiFinishedCostCache.current[ing.id];
          if (cached !== undefined) {
            next.lineCost = next.quantity > 0 ? next.quantity * cached : 0;
          } else {
            next.lineCost = 0;
            if (partial.ingredientId != null) {
              apiClient
                .get<{ costPerUnit: number }>(`/ingredients/${ing.id}/cost`)
                .then(({ data }) => {
                  semiFinishedCostCache.current[ing.id] = data.costPerUnit;
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
        } else {
          next.lineCost =
            next.quantity > 0 && next.unit === ing.unit
              ? next.quantity * (ing.unitCost ?? 0)
              : 0;
        }

        return next;
      }),
    );
  };

  const updateExtraCost = (id: string, partial: Partial<ExtraCostDraft>) => {
    setExtraCosts((prev) => prev.map((ec) => (ec.id === id ? { ...ec, ...partial } : ec)));
  };

  const isValid =
    name.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.ingredientId) &&
    parseDecimalInput(sellingPrice) > 0;

  const handleSubmit = () => {
    if (!product || !isValid) return;
    onSubmit(product.id, {
      name: name.trim(),
      sellingPrice: parseDecimalInput(sellingPrice),
      description: description.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      weight: weight ? parseDecimalInput(weight) : undefined,
      dimensions: dimensions.trim() || undefined,
      items: lines
        .filter((l) => l.ingredientId)
        .map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit })),
      extraCosts: extraCosts
        .filter((ec) => ec.name.trim())
        .map((ec) => ({ name: ec.name.trim(), unitCost: parseDecimalInput(ec.unitCost) })),
    });
  };

  if (!open || !product) return null;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="edit-product-modal-title">Editar produto</ModalTitle>
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
                  <Label htmlFor="ep-name">Nome *</Label>
                  <Input
                    id="ep-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="ep-desc">Descrição</Label>
                  <Input
                    id="ep-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="ep-photo">URL da foto</Label>
                  <Input
                    id="ep-photo"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="ep-weight">Peso (g)</Label>
                  <Input
                    id="ep-weight"
                    type="text"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="ep-dimensions">Dimensões</Label>
                  <Input
                    id="ep-dimensions"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                  />
                </Field>
              </MetaGrid>

              <SectionTitle>Composição</SectionTitle>
              {detailQuery.isLoading ? (
                <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
                  Carregando composição…
                </p>
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
                          <Td colSpan={4} style={{ color: "#71717a", fontStyle: "italic" }}>
                            Nenhuma linha.
                          </Td>
                        </tr>
                      ) : (
                        lines.map((line) => (
                          <tr key={line.id}>
                            <Td style={{ minWidth: "200px" }}>
                              <IngredientSelector
                                id={`esel-${line.id}`}
                                label=""
                                value={line.ingredientId}
                                options={allIngredients}
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
                              <IconBtn
                                type="button"
                                aria-label="Remover"
                                onClick={() =>
                                  setLines((prev) =>
                                    prev.filter((l) => l.id !== line.id),
                                  )
                                }
                              >
                                ✕
                              </IconBtn>
                            </Td>
                          </tr>
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

              <SectionTitle style={{ marginTop: "1.5rem" }}>
                Custos extras por unidade
              </SectionTitle>
              <CompTable>
                <thead>
                  <tr>
                    <Th>Nome</Th>
                    <Th>Custo (R$)</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {extraCosts.length === 0 ? (
                    <tr>
                      <Td colSpan={3} style={{ color: "#71717a", fontStyle: "italic" }}>
                        Nenhum custo extra.
                      </Td>
                    </tr>
                  ) : (
                    extraCosts.map((ec) => (
                      <tr key={ec.id}>
                        <Td>
                          <Input
                            value={ec.name}
                            onChange={(e) =>
                              updateExtraCost(ec.id, { name: e.target.value })
                            }
                            placeholder="Ex.: Embalagem"
                            style={{ width: "160px" }}
                          />
                        </Td>
                        <Td>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={ec.unitCost}
                            onChange={(e) =>
                              updateExtraCost(ec.id, { unitCost: e.target.value })
                            }
                            placeholder="0,00"
                            style={{ width: "100px" }}
                          />
                        </Td>
                        <Td>
                          <IconBtn
                            type="button"
                            aria-label="Remover"
                            onClick={() =>
                              setExtraCosts((prev) =>
                                prev.filter((e) => e.id !== ec.id),
                              )
                            }
                          >
                            ✕
                          </IconBtn>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </CompTable>
              <AddBtn
                type="button"
                onClick={() =>
                  setExtraCosts((prev) => [
                    ...prev,
                    { id: newDraftId(), name: "", unitCost: "" },
                  ])
                }
              >
                + Adicionar custo extra
              </AddBtn>
            </div>

            <ProductPricingCard
              ingredientCostPerUnit={ingredientCostPerUnit}
              extraCostPerUnit={extraCostPerUnit}
              sellingPrice={sellingPrice}
              markupPct={markupPct}
              onSellingPriceChange={handleSellingPriceChange}
              onMarkupPctChange={handleMarkupChange}
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
            {isLoading ? "Salvando…" : "Salvar alterações"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
