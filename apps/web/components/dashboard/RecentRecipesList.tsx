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

const RecipeName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Meta = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  margin-left: 0.75rem;
`;

const Empty = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

type Props = {
  recipes: DashboardSummary["recentRecipes"];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function RecentRecipesList({ recipes }: Props) {
  return (
    <Card>
      <Header>
        <Title>Receitas recentes</Title>
        <ViewAll href="/receitas">Ver todas</ViewAll>
      </Header>
      {recipes.length === 0 ? (
        <Empty>Nenhuma receita cadastrada ainda.</Empty>
      ) : (
        <List>
          {recipes.map((r) => (
            <Row key={r.id}>
              <RecipeName>{r.name}</RecipeName>
              <Meta>
                {r.yield} {r.yieldUnit} · {formatDate(r.createdAt)}
              </Meta>
            </Row>
          ))}
        </List>
      )}
    </Card>
  );
}
