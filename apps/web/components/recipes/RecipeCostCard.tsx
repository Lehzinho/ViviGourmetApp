"use client";

import styled from "styled-components";
import { formatBRL } from "@/lib/ingredient-math";

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.25rem;
  position: sticky;
  top: 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const RowLabel = styled.span``;

const RowValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TotalRow = styled(Row)`
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid ${({ theme }) => theme.colors.border};
  font-size: 1rem;

  ${RowValue} {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

type RecipeCostCardProps = {
  totalCost: number;
  yield: number;
  yieldUnit: string;
};

const UNIT_LABEL: Record<string, string> = {
  GRAM: "g",
  ML: "ml",
  UNIT: "un",
};

export function RecipeCostCard({ totalCost, yield: yieldAmount, yieldUnit }: RecipeCostCardProps) {
  const costPerPortion = yieldAmount > 0 ? totalCost / yieldAmount : 0;
  const unitLabel = UNIT_LABEL[yieldUnit] ?? yieldUnit;

  return (
    <Card>
      <CardTitle>Custo estimado</CardTitle>
      <Row>
        <RowLabel>Total da receita</RowLabel>
        <RowValue>{formatBRL(totalCost)}</RowValue>
      </Row>
      <Row>
        <RowLabel>Rendimento</RowLabel>
        <RowValue>
          {yieldAmount} {unitLabel}
        </RowValue>
      </Row>
      <TotalRow>
        <RowLabel>Custo por {unitLabel}</RowLabel>
        <RowValue>{yieldAmount > 0 ? formatBRL(costPerPortion) : "—"}</RowValue>
      </TotalRow>
    </Card>
  );
}
