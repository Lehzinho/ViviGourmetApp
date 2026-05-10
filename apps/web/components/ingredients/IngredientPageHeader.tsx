"use client";

import styled from "styled-components";
import type { IngredientFilter } from "@/types/ingredients";

const Wrap = styled.div`
  margin-bottom: 1.5rem;
`;

const Top = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Sub = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.muted};
  max-width: 42ch;
`;

const PrimaryBtn = styled.button`
  flex-shrink: 0;
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

const Search = styled.input`
  min-width: 220px;
  flex: 1;
  max-width: 360px;
  padding: 0.5rem 0.85rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  background: ${({ theme }) => theme.colors.background};

  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral[400]};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.2rem;
  background: ${({ theme }) => theme.colors.neutral[100]};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transition}, color ${({ theme }) => theme.transition};

  ${({ theme, $active }) =>
    $active
      ? `
    background: ${theme.colors.background};
    color: ${theme.colors.text.primary};
    box-shadow: ${theme.shadows.sm};
  `
      : `
    background: transparent;
    color: ${theme.colors.text.muted};
    &:hover { color: ${theme.colors.text.primary}; }
  `}
`;

type IngredientPageHeaderProps = {
  search: string;
  onSearchChange: (v: string) => void;
  filter: IngredientFilter;
  onFilterChange: (f: IngredientFilter) => void;
  onNewIngredient: () => void;
};

export function IngredientPageHeader({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onNewIngredient,
}: IngredientPageHeaderProps) {
  return (
    <Wrap>
      <Top>
        <div>
          <Title>Ingredientes</Title>
          <Sub>Gerencie ingredientes básicos e compostos. Integração com a API virá em breve.</Sub>
        </div>
        <PrimaryBtn type="button" onClick={onNewIngredient}>
          Novo ingrediente
        </PrimaryBtn>
      </Top>
      <Toolbar>
        <Search
          type="search"
          placeholder="Buscar por nome ou categoria…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar ingredientes"
        />
        <FilterGroup role="group" aria-label="Filtrar por tipo">
          <FilterBtn
            type="button"
            $active={filter === "all"}
            onClick={() => onFilterChange("all")}
          >
            Todos
          </FilterBtn>
          <FilterBtn
            type="button"
            $active={filter === "RAW"}
            onClick={() => onFilterChange("RAW")}
          >
            Matéria-prima
          </FilterBtn>
          <FilterBtn
            type="button"
            $active={filter === "SEMI_FINISHED"}
            onClick={() => onFilterChange("SEMI_FINISHED")}
          >
            Semiacabados
          </FilterBtn>
        </FilterGroup>
      </Toolbar>
    </Wrap>
  );
}
