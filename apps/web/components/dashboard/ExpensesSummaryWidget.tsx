"use client";

import Link from "next/link";
import styled from "styled-components";
import type { DashboardSummary } from "@/types/dashboard";

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Amount = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.1;
`;

const Empty = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ViewLink = styled(Link)`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  expenses: DashboardSummary["expenses"];
};

export function ExpensesSummaryWidget({ expenses }: Props) {
  const monthName = MONTHS[expenses.month - 1];
  const title = `Despesas — ${monthName} ${expenses.year}`;

  return (
    <Card>
      <Left>
        <Title>{title}</Title>
        {expenses.thisMonth === 0 ? (
          <Empty>Nenhuma despesa registrada este mês.</Empty>
        ) : (
          <Amount>{fmt(expenses.thisMonth)}</Amount>
        )}
      </Left>
      <ViewLink href="/despesas">Ver detalhes</ViewLink>
    </Card>
  );
}
