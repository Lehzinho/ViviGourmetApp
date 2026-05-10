"use client";

import styled from "styled-components";
import { formatBRL } from "@/lib/ingredient-math";
import { Input, Label, Field } from "@/components/ingredients/form-primitives";

const Card = styled.aside`
  position: sticky;
  top: 1rem;
  align-self: start;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.15rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h4`
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem;

  &:last-of-type {
    border-bottom: none;
  }
`;

const CostLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CostValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Highlight = styled.div`
  padding: 0.85rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  border: 1px solid rgba(232, 89, 60, 0.22);
`;

const HighlightLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.25rem;
`;

const HighlightValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MarginBadge = styled.div<{ $positive: boolean }>`
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ $positive, theme }) => ($positive ? theme.colors.success : "#dc2626")};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0.25rem 0;
`;

type ProductPricingCardProps = {
  ingredientCostPerUnit: number;
  extraCostPerUnit: number;
  sellingPrice: string;
  markupPct: string;
  onSellingPriceChange: (v: string) => void;
  onMarkupPctChange: (v: string) => void;
};

export function ProductPricingCard({
  ingredientCostPerUnit,
  extraCostPerUnit,
  sellingPrice,
  markupPct,
  onSellingPriceChange,
  onMarkupPctChange,
}: ProductPricingCardProps) {
  const totalCost = ingredientCostPerUnit + extraCostPerUnit;
  const spNum = parseFloat(sellingPrice.replace(",", ".")) || 0;
  const marginPct = spNum > 0 ? ((spNum - totalCost) / spNum) * 100 : 0;
  const marginPositive = marginPct >= 0;

  return (
    <Card aria-label="Precificação">
      <Title>Custo estimado</Title>
      <CostRow>
        <CostLabel>Ingredientes</CostLabel>
        <CostValue>{formatBRL(ingredientCostPerUnit)}</CostValue>
      </CostRow>
      <CostRow>
        <CostLabel>Custos extras</CostLabel>
        <CostValue>{formatBRL(extraCostPerUnit)}</CostValue>
      </CostRow>
      <Highlight>
        <HighlightLabel>Custo total / un.</HighlightLabel>
        <HighlightValue>{formatBRL(totalCost)}</HighlightValue>
      </Highlight>

      <Divider />
      <Title>Preço de venda</Title>

      <Field>
        <Label htmlFor="pp-selling-price">Preço de venda (R$)</Label>
        <Input
          id="pp-selling-price"
          type="text"
          inputMode="decimal"
          value={sellingPrice}
          onChange={(e) => onSellingPriceChange(e.target.value)}
          placeholder="0,00"
        />
      </Field>

      <Field>
        <Label htmlFor="pp-markup">Markup (%)</Label>
        <Input
          id="pp-markup"
          type="text"
          inputMode="decimal"
          value={markupPct}
          onChange={(e) => onMarkupPctChange(e.target.value)}
          placeholder="0"
        />
      </Field>

      <MarginBadge $positive={marginPositive}>
        Margem: {marginPct.toFixed(1)}%
      </MarginBadge>
    </Card>
  );
}
