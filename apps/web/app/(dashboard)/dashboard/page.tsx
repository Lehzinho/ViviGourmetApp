"use client";

import styled, { keyframes } from "styled-components";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  KpiCard,
  RecentRecipesList,
  TopProductsList,
  ExpensesSummaryWidget,
} from "@/components/dashboard";
import { useDashboard } from "@/hooks/useDashboard";

const KpiGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(4, 1fr);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const TwoCol = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const Skeleton = styled.div<{ $h?: string }>`
  height: ${({ $h }) => $h ?? "6rem"};
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[100]} 25%,
    ${({ theme }) => theme.colors.neutral[200]} 50%,
    ${({ theme }) => theme.colors.neutral[100]} 75%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

const ErrorBox = styled.div`
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const RetryBtn = styled.button`
  padding: 0.45rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Greeting = styled.p`
  margin: -0.75rem 0 0.5rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  const subtitle = `${getGreeting()}! Aqui está o resumo do seu negócio.`;

  return (
    <>
      <PageHeader title="Visão geral" subtitle={subtitle} />

      {isError && (
        <ErrorBox>
          <ErrorText>Não foi possível carregar os dados do dashboard.</ErrorText>
          <RetryBtn type="button" onClick={() => refetch()}>
            Tentar novamente
          </RetryBtn>
        </ErrorBox>
      )}

      {!isError && (
        <Stack>
          <KpiGrid>
            {isLoading ? (
              <>
                <Skeleton />
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </>
            ) : (
              <>
                <KpiCard
                  label="Ingredientes"
                  value={data!.counts.ingredients}
                  icon="🥬"
                  linkTo="/ingredientes"
                />
                <KpiCard
                  label="Receitas"
                  value={data!.counts.recipes}
                  icon="📋"
                  linkTo="/receitas"
                />
                <KpiCard
                  label="Produtos"
                  value={data!.counts.products}
                  icon="🛍️"
                  linkTo="/produtos"
                />
                <KpiCard
                  label="Cardápios"
                  value={data!.counts.menus}
                  icon="📖"
                  linkTo="/cardapio"
                />
              </>
            )}
          </KpiGrid>

          {isLoading ? (
            <Skeleton $h="5rem" />
          ) : (
            <ExpensesSummaryWidget expenses={data!.expenses} />
          )}

          <TwoCol>
            {isLoading ? (
              <>
                <Skeleton $h="14rem" />
                <Skeleton $h="14rem" />
              </>
            ) : (
              <>
                <RecentRecipesList recipes={data!.recentRecipes} />
                <TopProductsList products={data!.topProducts} />
              </>
            )}
          </TwoCol>
        </Stack>
      )}
    </>
  );
}
