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
  flex-direction: column;
  gap: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ViewAll = styled(Link)`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const ProductName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.75rem;
  white-space: nowrap;
`;

const Price = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const MarginBadge = styled.span<{ $level: "high" | "mid" | "low" }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $level }) =>
    $level === "high" ? "#1D9E75" : $level === "mid" ? "#D97706" : "#DC2626"};
`;

const Empty = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

function marginLevel(m: number): "high" | "mid" | "low" {
  if (m > 40) return "high";
  if (m >= 20) return "mid";
  return "low";
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  products: DashboardSummary["topProducts"];
};

export function TopProductsList({ products }: Props) {
  return (
    <Card>
      <Header>
        <Title>Melhores margens</Title>
        <ViewAll href="/produtos">Ver todos</ViewAll>
      </Header>
      {products.length === 0 ? (
        <Empty>Nenhum produto cadastrado ainda.</Empty>
      ) : (
        <List>
          {products.map((p) => (
            <Row key={p.id}>
              <ProductName>{p.name}</ProductName>
              <RightGroup>
                <Price>{fmt(p.salePrice)}</Price>
                <MarginBadge $level={marginLevel(p.margin)}>
                  {p.margin.toFixed(1)}%
                </MarginBadge>
              </RightGroup>
            </Row>
          ))}
        </List>
      )}
    </Card>
  );
}
