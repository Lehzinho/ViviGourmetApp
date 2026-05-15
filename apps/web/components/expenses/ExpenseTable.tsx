"use client";

import styled from "styled-components";
import type { Expense, RecurrenceType } from "@/types/expenses";
import { RECURRENCE_LABELS } from "@/types/expenses";

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

const RecurrenceBadge = styled.span<{ $type: RecurrenceType }>`
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.75rem;
  font-weight: 600;
  ${({ $type, theme }) => {
    if ($type === "monthly")
      return `background: #dbeafe; color: #1d4ed8;`;
    if ($type === "weekly")
      return `background: #dcfce7; color: #15803d;`;
    return `background: ${theme.colors.surface}; color: ${theme.colors.text.muted};`;
  }}
`;

const AmountCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
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

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};

type ExpenseTableProps = {
  rows: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export function ExpenseTable({ rows, onEdit, onDelete }: ExpenseTableProps) {
  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Categoria</Th>
            <Th>Recorrência</Th>
            <Th>Valor</Th>
            <Th>Data</Th>
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <EmptyCell colSpan={6}>Nenhuma despesa cadastrada.</EmptyCell>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.name}</Td>
                <Td>{row.category}</Td>
                <Td>
                  <RecurrenceBadge $type={row.recurrence}>
                    {RECURRENCE_LABELS[row.recurrence] ?? row.recurrence}
                  </RecurrenceBadge>
                </Td>
                <AmountCell>{formatBRL(row.amount)}</AmountCell>
                <Td>{formatDate(row.date)}</Td>
                <Td>
                  <ActionsCell>
                    <ActionBtn type="button" onClick={() => onEdit(row)}>
                      Editar
                    </ActionBtn>
                    <DangerBtn type="button" onClick={() => onDelete(row)}>
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
