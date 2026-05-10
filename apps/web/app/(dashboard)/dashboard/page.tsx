"use client";

import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiClient } from "@/lib/apiClient";

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  margin-top: 0.5rem;
`;

const Card = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
`;

const CardLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.35rem;
`;

const CardValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusOk = styled.span`
  color: ${({ theme }) => theme.colors.success};
  font-weight: 600;
`;

const StatusBad = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
`;

type HealthPayload = { ok: boolean; service?: string };

export default function DashboardPage() {
  const health = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthPayload>("/health");
      return data;
    },
    retry: 1,
  });

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Resumo do tenant e status dos serviços usados pelo dashboard."
        actionLabel="Novo ingrediente"
        onAction={() => {}}
      />
      <Grid>
        <Card>
          <CardLabel>API</CardLabel>
          <CardValue>
            {health.isLoading ? "…" : null}
            {health.isError ? <StatusBad>Offline</StatusBad> : null}
            {health.data ? (
              health.data.ok ? <StatusOk>Online</StatusOk> : <StatusBad>Indisponível</StatusBad>
            ) : null}
          </CardValue>
        </Card>
        <Card>
          <CardLabel>Serviço</CardLabel>
          <CardValue style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            {health.data?.service ?? "—"}
          </CardValue>
        </Card>
      </Grid>
    </>
  );
}
