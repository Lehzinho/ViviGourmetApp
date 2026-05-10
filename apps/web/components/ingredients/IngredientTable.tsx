"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import type { IngredientListItem } from "@/types/ingredients";
import { formatBRL, formatDateTime } from "@/lib/ingredient-math";

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th<{ $sortable?: boolean; $active?: boolean }>`
  text-align: left;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-weight: 600;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;

  &:hover {
    color: ${({ theme, $sortable }) => ($sortable ? theme.colors.primary : undefined)};
  }
`;

const Td = styled.td`
  padding: 0.7rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TypeBadge = styled.span<{ $compound?: boolean }>`
  display: inline-flex;
  padding: 0.15rem 0.5rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ theme, $compound }) =>
    $compound ? theme.colors.primaryMuted : theme.colors.successMuted};
  color: ${({ theme, $compound }) =>
    $compound ? theme.colors.primary : theme.colors.success};
`;

const ActionBtn = styled.button`
  padding: 0.3rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

type SortKey = "name" | "type" | "unit" | "unitCost" | "createdAt";
type SortDir = "asc" | "desc";

const DangerBtn = styled.button`
  padding: 0.3rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid #fecaca;
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.75rem;
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;

  &:hover {
    background: #fef2f2;
    border-color: #dc2626;
  }
`;

type IngredientTableProps = {
  items: IngredientListItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function IngredientTable({ items, onEdit, onDelete }: IngredientTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sort.key === "unitCost") return ((a.unitCost ?? 0) - (b.unitCost ?? 0)) * dir;
      if (sort.key === "type") return a.type.localeCompare(b.type) * dir;
      if (sort.key === "createdAt")
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      const va = sort.key === "unit" ? a.unitLabel : a.name;
      const vb = sort.key === "unit" ? b.unitLabel : b.name;
      return va.localeCompare(vb, "pt-BR") * dir;
    });
  }, [items, sort]);

  const toggle = (key: SortKey) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  };

  const hint = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <Card>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th
                $sortable
                $active={sort.key === "name"}
                onClick={() => toggle("name")}
              >
                Nome{hint("name")}
              </Th>
              <Th
                $sortable
                $active={sort.key === "type"}
                onClick={() => toggle("type")}
              >
                Tipo{hint("type")}
              </Th>
              <Th
                $sortable
                $active={sort.key === "unit"}
                onClick={() => toggle("unit")}
              >
                Unidade{hint("unit")}
              </Th>
              <Th
                $sortable
                $active={sort.key === "unitCost"}
                onClick={() => toggle("unitCost")}
              >
                Custo unitário{hint("unitCost")}
              </Th>
              <Th
                $sortable
                $active={sort.key === "createdAt"}
                onClick={() => toggle("createdAt")}
              >
                Criado em{hint("createdAt")}
              </Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <Td colSpan={6}>
                  <Empty>Nenhum ingrediente neste filtro.</Empty>
                </Td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id}>
                  <Td style={{ fontWeight: 600 }}>{row.name}</Td>
                  <Td>
                    <TypeBadge $compound={row.type === "SEMI_FINISHED"}>
                      {row.type === "RAW" ? "Matéria-prima" : "Semiacabado"}
                    </TypeBadge>
                  </Td>
                  <Td>{row.unitLabel}</Td>
                  <Td>
                    {row.unitCost != null ? `${formatBRL(row.unitCost)} / ${row.unitLabel}` : "—"}
                  </Td>
                  <Td style={{ color: "#71717a" }}>{formatDateTime(row.createdAt)}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <ActionBtn type="button" onClick={() => onEdit?.(row.id)}>
                        Editar
                      </ActionBtn>
                      <DangerBtn type="button" onClick={() => onDelete?.(row.id)}>
                        Excluir
                      </DangerBtn>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </Card>
  );
}
