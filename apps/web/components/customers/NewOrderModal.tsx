"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { useProducts } from "@/hooks/useProducts";
import type { Customer, CreateOrderPayload, CreateOrderItemPayload } from "@/types/customers";
import { PAYMENT_METHOD_LABELS } from "@/types/customers";
import { Field, Label, Select } from "@/components/ingredients/form-primitives";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
`;

const Panel = styled.div`
  width: min(580px, 100%);
  max-height: 90vh;
  overflow-y: auto;
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
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.background};
  z-index: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ModalSubtitle = styled.span`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-left: 0.5rem;
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
  gap: 1.25rem;
`;

const SectionLabel = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 100px auto;
  gap: 0.5rem;
  align-items: start;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 0.45rem 0.6rem;
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
`;

const ItemMeta = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.muted};
  grid-column: 1 / -1;
`;

const RemoveBtn = styled.button`
  padding: 0.4rem 0.5rem;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.background};
  color: #dc2626;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  margin-top: 1.6rem;

  &:hover {
    background: #fff1f1;
    border-color: #dc2626;
  }
`;

const AddItemBtn = styled.button`
  align-self: flex-start;
  padding: 0.4rem 0.8rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PaymentOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const PaymentOption = styled.button<{ $active: boolean }>`
  padding: 0.4rem 0.85rem;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1.5px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primaryMuted : theme.colors.background)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transition};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 70px;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Footer = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  position: sticky;
  bottom: 0;
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

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type OrderItemState = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

type NewOrderModalProps = {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (payload: CreateOrderPayload) => void;
  isLoading: boolean;
  submitError?: string;
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

export function NewOrderModal({
  open,
  customer,
  onClose,
  onSubmit,
  isLoading,
  submitError,
}: NewOrderModalProps) {
  const { data: products = [] } = useProducts();
  const [items, setItems] = useState<OrderItemState[]>([
    { productId: "", quantity: "1", unitPrice: "" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setItems([{ productId: "", quantity: "1", unitPrice: "" }]);
    setPaymentMethod("");
    setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              unitPrice: product ? String(product.sellingPrice) : "",
            }
          : item,
      ),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: "1", unitPrice: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const isValid =
    items.length > 0 &&
    items.every(
      (item) =>
        item.productId &&
        parseFloat(item.quantity) > 0 &&
        parseFloat(item.unitPrice) > 0,
    );

  const handleSubmit = () => {
    if (!isValid) return;
    const payload: CreateOrderPayload = {
      ...(customer ? { customerId: customer.id } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      items: items.map(
        (item): CreateOrderItemPayload => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        }),
      ),
    };
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle>
            Nova venda
            {customer && <ModalSubtitle>— {customer.name}</ModalSubtitle>}
          </ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>×</CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

          <div>
            <SectionLabel>Produtos</SectionLabel>
            {items.map((item, index) => {
              const product = products.find((p) => p.id === item.productId);
              const lineTotal =
                (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
              return (
                <div key={index} style={{ marginBottom: "0.75rem" }}>
                  <ItemRow>
                    <Field style={{ margin: 0 }}>
                      <Label htmlFor={`prod-${index}`}>Produto</Label>
                      <Select
                        id={`prod-${index}`}
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                      >
                        <option value="">Selecionar produto…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field style={{ margin: 0 }}>
                      <Label htmlFor={`qty-${index}`}>Qtd</Label>
                      <NumberInput
                        id={`qty-${index}`}
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, quantity: e.target.value } : it,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field style={{ margin: 0 }}>
                      <Label htmlFor={`price-${index}`}>Preço (R$)</Label>
                      <NumberInput
                        id={`price-${index}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, unitPrice: e.target.value } : it,
                            ),
                          )
                        }
                        placeholder={product ? String(product.sellingPrice) : "0,00"}
                      />
                    </Field>
                    {items.length > 1 && (
                      <RemoveBtn type="button" onClick={() => handleRemoveItem(index)}>
                        ×
                      </RemoveBtn>
                    )}
                  </ItemRow>
                  {lineTotal > 0 && (
                    <ItemMeta>Total: {formatBRL(lineTotal)}</ItemMeta>
                  )}
                </div>
              );
            })}
            <AddItemBtn type="button" onClick={handleAddItem}>
              + Adicionar produto
            </AddItemBtn>
          </div>

          <div>
            <SectionLabel>Forma de pagamento</SectionLabel>
            <PaymentOptions>
              {PAYMENT_METHODS.map((method) => (
                <PaymentOption
                  key={method}
                  type="button"
                  $active={paymentMethod === method}
                  onClick={() =>
                    setPaymentMethod((prev) => (prev === method ? "" : method))
                  }
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </PaymentOption>
              ))}
            </PaymentOptions>
          </div>

          <Field>
            <Label htmlFor="order-notes">Observações</Label>
            <Textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais…"
            />
          </Field>

          <Divider />

          <TotalRow>
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </TotalRow>
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? "Registrando…" : "Registrar venda"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
