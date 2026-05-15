"use client";

import styled from "styled-components";
import { formatDateTime } from "@/lib/ingredient-math";
import type { RecipeRow } from "@/types/recipes";

const Wrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.background};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.65rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  vertical-align: middle;

  &:last-child {
    white-space: nowrap;
  }
`;

const ActionBtn = styled.button`
  padding: 0.3rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transition};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const DangerBtn = styled(ActionBtn)`
  margin-left: 0.4rem;
  border-color: #fecaca;
  color: #dc2626;

  &:hover {
    border-color: #dc2626;
    background: #fff1f1;
  }
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
`;

const EmptyCell = styled.td`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const UNIT_LABEL: Record<string, string> = {
  GRAM: "g",
  ML: "ml",
  UNIT: "un",
};

type RecipeTableProps = {
  rows: RecipeRow[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function RecipeTable({ rows, onEdit, onDelete }: RecipeTableProps) {
  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Rendimento</Th>
            <Th>Criado em</Th>
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <EmptyCell colSpan={4}>Nenhuma receita cadastrada.</EmptyCell>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.name}</Td>
                <Td>
                  {row.yield} {UNIT_LABEL[row.yieldUnit] ?? row.yieldUnit}
                </Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
                <Td>
                  <ActionsCell>
                    <ActionBtn type="button" onClick={() => onEdit(row.id)}>
                      Editar
                    </ActionBtn>
                    <DangerBtn type="button" onClick={() => onDelete(row.id)}>
                      Excluir
                    </DangerBtn>
                  </ActionsCell>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Wrapper>
  );
}
