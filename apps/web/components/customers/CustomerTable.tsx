"use client";

import { useState } from "react";
import styled from "styled-components";
import type { Customer } from "@/types/customers";

const Wrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.background};
`;

const SearchBar = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 320px;
  padding: 0.45rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
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

const AvatarCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const NameBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const CustomerName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CustomerEmail = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.muted};
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

const PrimaryBtn = styled(ActionBtn)`
  margin-left: 0.4rem;
  border-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
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

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  return rtf.format(-Math.floor(days / 30), "month");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

type CustomerTableProps = {
  rows: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onNewOrder: (customer: Customer) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function CustomerTable({
  rows,
  onView,
  onEdit,
  onDelete,
  onNewOrder,
  search,
  onSearchChange,
}: CustomerTableProps) {
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => onSearchChange(value), 300);
    setDebounceTimer(timer);
  };

  return (
    <Wrapper>
      <SearchBar>
        <SearchInput
          type="text"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
        />
      </SearchBar>
      <Table>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Telefone</Th>
            <Th>Pedidos</Th>
            <Th>Total Gasto</Th>
            <Th>Última Visita</Th>
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <EmptyCell colSpan={6}>Nenhum cliente cadastrado.</EmptyCell>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>
                  <AvatarCell>
                    <Avatar>{getInitials(row.name)}</Avatar>
                    <NameBlock>
                      <CustomerName>{row.name}</CustomerName>
                      {row.email && <CustomerEmail>{row.email}</CustomerEmail>}
                    </NameBlock>
                  </AvatarCell>
                </Td>
                <Td>{row.phone}</Td>
                <Td>{row._count?.orders ?? 0}</Td>
                <AmountCell>{formatBRL(row.totalSpent ?? 0)}</AmountCell>
                <Td>{formatRelative(row.lastVisitAt)}</Td>
                <Td>
                  <ActionsCell>
                    <ActionBtn type="button" onClick={() => onView(row)}>
                      Ver perfil
                    </ActionBtn>
                    <ActionBtn type="button" style={{ marginLeft: "0.4rem" }} onClick={() => onEdit(row)}>
                      Editar
                    </ActionBtn>
                    <PrimaryBtn type="button" onClick={() => onNewOrder(row)}>
                      Nova venda
                    </PrimaryBtn>
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
