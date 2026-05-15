"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { formatBRL } from "@/lib/ingredient-math";
import { Field, Label, Select } from "@/components/ingredients/form-primitives";
import type { AddMenuItemPayload, MenuItemRow } from "@/types/menus";
import type { ProductRow } from "@/types/products";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
`;

const Panel = styled.div`
  width: min(440px, 100%);
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
`;

const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.surface};
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 1.1rem;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[200]};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Body = styled.div`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PriceHint = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

const Footer = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Btn = styled.button<{ $variant?: "ghost" | "primary" }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  ${({ theme, $variant }) =>
    $variant === "primary"
      ? `
    background: ${theme.colors.primary};
    color: ${theme.colors.text.inverse};
    &:hover:not(:disabled) { background: ${theme.colors.primaryHover}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

const ErrorMsg = styled.p`
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #fff1f1;
  color: #dc2626;
  font-size: 0.8125rem;
  font-weight: 500;
`;

const EmptyHint = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

type AddMenuItemModalProps = {
  open: boolean;
  allProducts: ProductRow[];
  existingItems: MenuItemRow[];
  onClose: () => void;
  onSubmit: (payload: AddMenuItemPayload) => void;
  isLoading: boolean;
  submitError?: string;
};

export function AddMenuItemModal({
  open,
  allProducts,
  existingItems,
  onClose,
  onSubmit,
  isLoading,
  submitError,
}: AddMenuItemModalProps) {
  const existingProductIds = new Set(existingItems.map((i) => i.productId));
  const available = allProducts.filter((p) => !existingProductIds.has(p.id));

  const [productId, setProductId] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (open) {
      setProductId("");
      setIsVisible(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const selectedProduct = allProducts.find((p) => p.id === productId);
  const isValid = productId !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ productId, isVisible });
  };

  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle>Adicionar produto ao cardápio</ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

          {available.length === 0 ? (
            <EmptyHint>Todos os produtos já estão neste cardápio.</EmptyHint>
          ) : (
            <>
              <Field>
                <Label htmlFor="item-product">Produto *</Label>
                <Select
                  id="item-product"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  <option value="">Selecione um produto…</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {selectedProduct && (
                <PriceHint>Preço de venda: {formatBRL(selectedProduct.sellingPrice)}</PriceHint>
              )}

              <CheckRow>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                />
                Visível no cardápio
              </CheckRow>
            </>
          )}
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          {available.length > 0 && (
            <Btn
              type="button"
              $variant="primary"
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
            >
              {isLoading ? "Adicionando…" : "Adicionar"}
            </Btn>
          )}
        </Footer>
      </Panel>
    </Backdrop>
  );
}
