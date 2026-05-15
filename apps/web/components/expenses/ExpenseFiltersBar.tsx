"use client";

import styled from "styled-components";
import { EXPENSE_CATEGORIES, RECURRENCE_LABELS } from "@/types/expenses";
import type { ExpenseFilters, RecurrenceType } from "@/types/expenses";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 140px;
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const FilterInput = styled.input`
  padding: 0.4rem 0.6rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8125rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const FilterSelect = styled.select`
  padding: 0.4rem 0.6rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8125rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ClearBtn = styled.button`
  padding: 0.4rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-end;

  &:hover {
    border-color: ${({ theme }) => theme.colors.neutral[400]};
  }
`;

type ExpenseFiltersBarProps = {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
};

export function ExpenseFiltersBar({ filters, onChange }: ExpenseFiltersBarProps) {
  return (
    <Bar>
      <FilterGroup>
        <FilterLabel htmlFor="filter-from">De</FilterLabel>
        <FilterInput
          id="filter-from"
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
        />
      </FilterGroup>

      <FilterGroup>
        <FilterLabel htmlFor="filter-to">Até</FilterLabel>
        <FilterInput
          id="filter-to"
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
        />
      </FilterGroup>

      <FilterGroup>
        <FilterLabel htmlFor="filter-category">Categoria</FilterLabel>
        <FilterSelect
          id="filter-category"
          value={filters.category ?? ""}
          onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
      </FilterGroup>

      <FilterGroup>
        <FilterLabel htmlFor="filter-recurrence">Recorrência</FilterLabel>
        <FilterSelect
          id="filter-recurrence"
          value={filters.recurrence ?? ""}
          onChange={(e) =>
            onChange({ ...filters, recurrence: (e.target.value || undefined) as RecurrenceType | undefined })
          }
        >
          <option value="">Todas</option>
          {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </FilterSelect>
      </FilterGroup>

      <ClearBtn
        type="button"
        onClick={() => onChange({})}
      >
        Limpar filtros
      </ClearBtn>
    </Bar>
  );
}
