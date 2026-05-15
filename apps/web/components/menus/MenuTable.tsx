"use client";

import styled from "styled-components";
import { formatDateTime } from "@/lib/ingredient-math";
import type { MenuRow } from "@/types/menus";

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
`;

const SlugChip = styled.span`
  font-family: monospace;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 0.15rem 0.45rem;
`;

const Badge = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $active }) => ($active ? "#dcfce7" : "#f4f4f5")};
  color: ${({ $active }) => ($active ? "#16a34a" : "#71717a")};
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  border-color: #fecaca;
  color: #dc2626;

  &:hover {
    border-color: #dc2626;
    background: #fff1f1;
  }
`;

const EmptyCell = styled.td`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

type MenuTableProps = {
  rows: MenuRow[];
  onManage: (id: string) => void;
  onEdit: (row: MenuRow) => void;
  onDelete: (row: MenuRow) => void;
};

export function MenuTable({ rows, onManage, onEdit, onDelete }: MenuTableProps) {
  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Slug</Th>
            <Th>Produtos</Th>
            <Th>Público</Th>
            <Th>Criado em</Th>
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <EmptyCell colSpan={6}>Nenhum cardápio cadastrado.</EmptyCell>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td style={{ fontWeight: 600 }}>{row.name}</Td>
                <Td>
                  <SlugChip>{row.slug}</SlugChip>
                </Td>
                <Td>{row.itemCount}</Td>
                <Td>
                  <Badge $active={row.isPublic}>{row.isPublic ? "Público" : "Oculto"}</Badge>
                </Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
                <Td>
                  <ActionsCell>
                    <ActionBtn type="button" onClick={() => onManage(row.id)}>
                      Gerenciar
                    </ActionBtn>
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
