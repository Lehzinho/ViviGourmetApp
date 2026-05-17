"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Field, Input, Label } from "@/components/ingredients/form-primitives";
import type { CreateCustomerPayload, Customer, UpdateCustomerPayload } from "@/types/customers";

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
  width: min(520px, 100%);
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

const Textarea = styled.textarea`
  width: 100%;
  min-height: 80px;
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

type CreateMode = {
  mode: "create";
  customer?: never;
  onSubmit: (payload: CreateCustomerPayload) => void;
};
type EditMode = {
  mode: "edit";
  customer: Customer;
  onSubmit: (payload: UpdateCustomerPayload) => void;
};

type CustomerModalProps = (CreateMode | EditMode) & {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  submitError?: string;
};

export function CustomerModal({
  mode,
  open,
  customer,
  onClose,
  onSubmit,
  isLoading,
  submitError,
}: CustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email ?? "");
      setNotes(customer.notes ?? "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
    }
  }, [open, mode, customer]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isValid = name.trim() !== "" && phone.trim() !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    const payload: CreateCustomerPayload = {
      name: name.trim(),
      phone: phone.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    (onSubmit as (p: CreateCustomerPayload) => void)(payload);
  };

  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle>
            {mode === "create" ? "Novo cliente" : "Editar cliente"}
          </ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>×</CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

          <Field>
            <Label htmlFor="cust-name">Nome *</Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Maria Silva"
            />
          </Field>

          <Field>
            <Label htmlFor="cust-phone">Telefone *</Label>
            <Input
              id="cust-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </Field>

          <Field>
            <Label htmlFor="cust-email">E-mail</Label>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </Field>

          <Field>
            <Label htmlFor="cust-notes">Observações</Label>
            <Textarea
              id="cust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais…"
            />
          </Field>
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading
              ? mode === "create" ? "Cadastrando…" : "Salvando…"
              : mode === "create" ? "Cadastrar cliente" : "Salvar alterações"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
