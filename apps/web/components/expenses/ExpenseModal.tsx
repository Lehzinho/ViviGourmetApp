"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { EXPENSE_CATEGORIES, RECURRENCE_LABELS } from "@/types/expenses";
import type { CreateExpensePayload, Expense, RecurrenceType, UpdateExpensePayload } from "@/types/expenses";
import { Field, Input, Label, Select } from "@/components/ingredients/form-primitives";

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

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
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
  expense?: never;
  onSubmit: (payload: CreateExpensePayload) => void;
};
type EditMode = {
  mode: "edit";
  expense: Expense;
  onSubmit: (payload: UpdateExpensePayload) => void;
};

type ExpenseModalProps = (CreateMode | EditMode) & {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  submitError?: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

export function ExpenseModal({
  mode,
  open,
  expense,
  onClose,
  onSubmit,
  isLoading,
  submitError,
}: ExpenseModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("monthly");
  const [date, setDate] = useState(TODAY);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && expense) {
      setName(expense.name);
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setRecurrence(expense.recurrence as RecurrenceType);
      setDate(expense.date.slice(0, 10));
      setNotes(expense.notes ?? "");
    } else {
      setName("");
      setAmount("");
      setCategory(EXPENSE_CATEGORIES[0]);
      setRecurrence("monthly");
      setDate(TODAY);
      setNotes("");
    }
  }, [open, mode, expense]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isValid = name.trim() !== "" && amount !== "" && Number(amount) > 0 && date !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    const payload = {
      name: name.trim(),
      amount: Number(amount),
      category,
      recurrence,
      date,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    (onSubmit as (p: CreateExpensePayload) => void)(payload);
  };

  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle>{mode === "create" ? "Nova despesa" : "Editar despesa"}</ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>×</CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

          <Field>
            <Label htmlFor="exp-name">Nome da despesa *</Label>
            <Input
              id="exp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Aluguel do espaço"
            />
          </Field>

          <Row2>
            <Field>
              <Label htmlFor="exp-category">Categoria *</Label>
              <Select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof EXPENSE_CATEGORIES[number])}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="exp-recurrence">Recorrência *</Label>
              <Select
                id="exp-recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Field>
          </Row2>

          <Row2>
            <Field>
              <Label htmlFor="exp-amount">Valor (R$) *</Label>
              <Input
                id="exp-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </Field>

            <Field>
              <Label htmlFor="exp-date">Data *</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </Row2>

          <Field>
            <Label htmlFor="exp-notes">Observações</Label>
            <Textarea
              id="exp-notes"
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
              ? mode === "create" ? "Adicionando…" : "Salvando…"
              : mode === "create" ? "Adicionar despesa" : "Salvar alterações"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
