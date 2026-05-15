"use client";

import styled from "styled-components";
import { useExpenseSummary } from "@/hooks/useExpenses";

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.25rem 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const NavRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NavBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.sm};
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MonthLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 130px;
  text-align: center;
`;

const TotalAmount = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: #e85d04;
  margin-bottom: 1rem;
`;

const BreakdownTitle = styled.h4`
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const BreakdownList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const BreakdownItem = styled.li`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const BreakdownValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type ExpenseSummaryCardProps = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
};

export function ExpenseSummaryCard({ year, month, onPrev, onNext }: ExpenseSummaryCardProps) {
  const { data, isLoading } = useExpenseSummary(year, month);

  const sortedCategories = data
    ? Object.entries(data.byCategory).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo mensal</CardTitle>
        <NavRow>
          <NavBtn type="button" onClick={onPrev}>‹</NavBtn>
          <MonthLabel>{MONTH_NAMES[month - 1]} {year}</MonthLabel>
          <NavBtn type="button" onClick={onNext}>›</NavBtn>
        </NavRow>
      </CardHeader>

      {isLoading ? (
        <p style={{ margin: 0, color: "#71717a", fontSize: "0.875rem" }}>Carregando…</p>
      ) : (
        <>
          <TotalAmount>{formatBRL(data?.total ?? 0)}</TotalAmount>
          {sortedCategories.length > 0 && (
            <>
              <BreakdownTitle>Por categoria</BreakdownTitle>
              <BreakdownList>
                {sortedCategories.map(([cat, val]) => (
                  <BreakdownItem key={cat}>
                    <span>{cat}</span>
                    <BreakdownValue>{formatBRL(val)}</BreakdownValue>
                  </BreakdownItem>
                ))}
              </BreakdownList>
            </>
          )}
        </>
      )}
    </Card>
  );
}
