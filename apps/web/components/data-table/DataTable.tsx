"use client";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import styled from "styled-components";

export type DataTableColumn<T> = {
  id: keyof T & string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataTableColumn<T>[];
  data: T[];
  filterPlaceholder?: string;
  /** Campos usados na busca textual (default: todas as colunas com accessor implícito). */
  filterKeys?: (keyof T & string)[];
  pageSize?: number;
  emptyMessage?: string;
};

function cellSortValue<T extends Record<string, unknown>>(
  col: DataTableColumn<T>,
  row: T,
): string | number {
  if (col.accessor) return col.accessor(row);
  const v = row[col.id];
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return v;
  return String(v);
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const SearchInput = styled.input`
  min-width: 200px;
  flex: 1;
  max-width: 320px;
  padding: 0.45rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  background: ${({ theme }) => theme.colors.background};

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primaryMuted};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Meta = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
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
  padding: 0.65rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const NavBtn = styled.button`
  padding: 0.35rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.8125rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SortHint = styled.span`
  margin-left: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.75;
`;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  filterPlaceholder = "Buscar…",
  filterKeys,
  pageSize = 10,
  emptyMessage = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  const keys =
    filterKeys ?? (columns.map((c) => c.id) as (keyof T & string)[]);

  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ id: keyof T & string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const normalizedFilter = filter.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedFilter) return data;
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(normalizedFilter)),
    );
  }, [data, keys, normalizedFilter]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortable) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = cellSortValue(col, a);
      const vb = cellSortValue(col, b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const toggleSort = (id: keyof T & string) => {
    const col = columns.find((c) => c.id === id);
    if (!col?.sortable) return;
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sorted.length);

  return (
    <Card>
      <Toolbar>
        <SearchInput
          type="search"
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar tabela"
        />
        <Meta>
          {sorted.length} {sorted.length === 1 ? "linha" : "linhas"}
        </Meta>
      </Toolbar>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.id === col.id;
                return (
                  <Th
                    key={String(col.id)}
                    style={col.width ? { width: col.width } : undefined}
                    $sortable={col.sortable}
                    $active={active}
                    onClick={() => toggleSort(col.id)}
                  >
                    {col.header}
                    {col.sortable ? (
                      <SortHint>{active ? (sort?.dir === "asc" ? "▲" : "▼") : "↕"}</SortHint>
                    ) : null}
                  </Th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <Td colSpan={columns.length}>{emptyMessage}</Td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr key={String("id" in row && row.id != null ? row.id : `row-${i}`)}>
                  {columns.map((col) => (
                    <Td key={String(col.id)}>
                      {col.render ? col.render(row) : String(cellSortValue(col, row))}
                    </Td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
      <Footer>
        <Meta>
          Mostrando {from}–{to} de {sorted.length}
        </Meta>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <NavBtn
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </NavBtn>
          <NavBtn
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </NavBtn>
        </div>
      </Footer>
    </Card>
  );
}
