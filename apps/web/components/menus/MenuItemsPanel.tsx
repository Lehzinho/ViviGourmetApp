"use client";

import { useState } from "react";
import styled from "styled-components";
import { formatBRL } from "@/lib/ingredient-math";
import type { MenuDetailRow, MenuItemRow } from "@/types/menus";
import type { ProductRow } from "@/types/products";
import { AddMenuItemModal } from "./AddMenuItemModal";
import { useAddMenuItem, useRemoveMenuItem, useUpdateMenuItem } from "@/hooks/useMenus";

const Wrapper = styled.div``;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MetaBadge = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $active }) => ($active ? "#dcfce7" : "#f4f4f5")};
  color: ${({ $active }) => ($active ? "#16a34a" : "#71717a")};
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transition};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const TableWrap = styled.div`
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

const Toggle = styled.button<{ $active: boolean }>`
  padding: 0.2rem 0.6rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: ${({ $active }) => ($active ? "#dcfce7" : "#f4f4f5")};
  color: ${({ $active }) => ($active ? "#16a34a" : "#71717a")};
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.75;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const OrderInput = styled.input`
  width: 64px;
  padding: 0.3rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.875rem;
  text-align: center;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const RemoveBtn = styled.button`
  padding: 0.3rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid #fecaca;
  background: ${({ theme }) => theme.colors.background};
  color: #dc2626;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: #dc2626;
    background: #fff1f1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyCell = styled.td`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

type MenuItemsPanelProps = {
  menu: MenuDetailRow;
  allProducts: ProductRow[];
  onBack: () => void;
};

export function MenuItemsPanel({ menu, allProducts, onBack }: MenuItemsPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [orderDraft, setOrderDraft] = useState<Record<string, string>>({});

  const addItem = useAddMenuItem();
  const updateItem = useUpdateMenuItem();
  const removeItem = useRemoveMenuItem();

  const handleToggleVisible = (item: MenuItemRow) => {
    updateItem.mutate({
      menuId: menu.id,
      itemId: item.id,
      payload: { isVisible: !item.isVisible },
    });
  };

  const handleOrderBlur = (item: MenuItemRow) => {
    const raw = orderDraft[item.id];
    if (raw === undefined) return;
    const next = parseInt(raw, 10);
    if (!Number.isNaN(next) && next !== item.order) {
      updateItem.mutate({
        menuId: menu.id,
        itemId: item.id,
        payload: { order: next },
      });
    }
    setOrderDraft((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
  };

  const handleRemove = (item: MenuItemRow) => {
    removeItem.mutate({ menuId: menu.id, itemId: item.id });
  };

  const handleAddSubmit = (payload: Parameters<typeof addItem.mutate>[0]["payload"]) => {
    setAddError(undefined);
    addItem.mutate(
      { menuId: menu.id, payload },
      {
        onSuccess: () => setAddOpen(false),
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setAddError(typeof msg === "string" ? msg : "Erro ao adicionar produto.");
        },
      },
    );
  };

  return (
    <Wrapper>
      <PanelHeader>
        <div>
          <BackBtn type="button" onClick={onBack}>
            ← Cardápios
          </BackBtn>
          <TitleRow style={{ marginTop: "0.4rem" }}>
            <PanelTitle>{menu.name}</PanelTitle>
            <MetaBadge $active={menu.isPublic}>{menu.isPublic ? "Público" : "Oculto"}</MetaBadge>
          </TitleRow>
        </div>
        <AddBtn type="button" onClick={() => setAddOpen(true)}>
          + Adicionar produto
        </AddBtn>
      </PanelHeader>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Produto</Th>
              <Th>Preço de venda</Th>
              <Th>Visível</Th>
              <Th>Ordem</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {menu.items.length === 0 ? (
              <tr>
                <EmptyCell colSpan={5}>
                  Nenhum produto neste cardápio. Clique em &quot;+ Adicionar produto&quot;.
                </EmptyCell>
              </tr>
            ) : (
              menu.items.map((item) => (
                <tr key={item.id}>
                  <Td style={{ fontWeight: 600 }}>{item.productName}</Td>
                  <Td>{formatBRL(item.sellingPrice)}</Td>
                  <Td>
                    <Toggle
                      type="button"
                      $active={item.isVisible}
                      onClick={() => handleToggleVisible(item)}
                      disabled={updateItem.isPending}
                    >
                      {item.isVisible ? "Visível" : "Oculto"}
                    </Toggle>
                  </Td>
                  <Td>
                    <OrderInput
                      type="number"
                      min={0}
                      value={orderDraft[item.id] ?? item.order}
                      onChange={(e) =>
                        setOrderDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      onBlur={() => handleOrderBlur(item)}
                    />
                  </Td>
                  <Td>
                    <RemoveBtn
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={removeItem.isPending}
                    >
                      Remover
                    </RemoveBtn>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      <AddMenuItemModal
        open={addOpen}
        allProducts={allProducts}
        existingItems={menu.items}
        onClose={() => {
          setAddOpen(false);
          setAddError(undefined);
        }}
        onSubmit={handleAddSubmit}
        isLoading={addItem.isPending}
        submitError={addError}
      />
    </Wrapper>
  );
}
