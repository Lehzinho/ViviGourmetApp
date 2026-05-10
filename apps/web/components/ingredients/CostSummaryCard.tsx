"use client";

import styled from "styled-components";
import { formatBRL } from "@/lib/ingredient-math";

const Card = styled.aside`
  position: sticky;
  top: 1rem;
  align-self: start;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.15rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Title = styled.h4`
  margin: 0 0 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const RowLabel = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const RowValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: right;
`;

const Highlight = styled.div`
  margin-top: 0.75rem;
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
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

type CostSummaryBasicProps = {
  variant: "basic";
  pricePaid: number;
  quantity: number;
  unitLabel: string;
  unitCost: number | null;
};

type CostSummaryCompoundProps = {
  variant: "compound";
  totalCost: number;
  yieldAmount: number;
  yieldUnitLabel: string;
  unitCost: number | null;
};

export type CostSummaryCardProps = CostSummaryBasicProps | CostSummaryCompoundProps;

export function CostSummaryCard(props: CostSummaryCardProps) {
  if (props.variant === "basic") {
    const { pricePaid, quantity, unitLabel, unitCost } = props;
    return (
      <Card aria-label="Resumo de custo">
        <Title>Resumo</Title>
        <Row>
          <RowLabel>Preço pago</RowLabel>
          <RowValue>{formatBRL(pricePaid)}</RowValue>
        </Row>
        <Row>
          <RowLabel>Quantidade</RowLabel>
          <RowValue>
            {quantity > 0 ? `${quantity} ${unitLabel}` : "—"}
          </RowValue>
        </Row>
        <Highlight>
          <HighlightLabel>Custo unitário</HighlightLabel>
          <HighlightValue>
            {unitCost != null && unitCost > 0
              ? `${formatBRL(unitCost)} / ${unitLabel}`
              : "—"}
          </HighlightValue>
        </Highlight>
      </Card>
    );
  }

  const { totalCost, yieldAmount, yieldUnitLabel, unitCost } = props;
  return (
    <Card aria-label="Resumo custo composto">
      <Title>Resumo</Title>
      <Row>
        <RowLabel>Custo total</RowLabel>
        <RowValue>{formatBRL(totalCost)}</RowValue>
      </Row>
      <Row>
        <RowLabel>Rendimento</RowLabel>
        <RowValue>
          {yieldAmount > 0 ? `${yieldAmount} ${yieldUnitLabel}` : "—"}
        </RowValue>
      </Row>
      <Highlight>
        <HighlightLabel>Custo unitário final</HighlightLabel>
        <HighlightValue>
          {unitCost != null && unitCost > 0 && yieldAmount > 0
            ? `${formatBRL(unitCost)} / ${yieldUnitLabel}`
            : "—"}
        </HighlightValue>
      </Highlight>
    </Card>
  );
}
