"use client";

import styled from "styled-components";

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

const Dialog = styled.div`
  width: min(440px, 100%);
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
  padding: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Desc = styled.p`
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
`;

const Btn = styled.button<{ $danger?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  ${({ theme, $danger }) =>
    $danger
      ? `background: #dc2626; color: #fff; &:hover:not(:disabled) { background: #b91c1c; } &:disabled { opacity: 0.55; cursor: not-allowed; }`
      : `background: ${theme.colors.background}; color: ${theme.colors.text.secondary}; border: 1px solid ${theme.colors.border}; &:hover { border-color: ${theme.colors.neutral[400]}; }`}
`;

type DeleteExpenseDialogProps = {
  open: boolean;
  expenseName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteExpenseDialog({
  open,
  expenseName,
  onClose,
  onConfirm,
  isLoading,
}: DeleteExpenseDialogProps) {
  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Title>Excluir despesa</Title>
        <Desc>
          Tem certeza que deseja excluir a despesa <strong>&quot;{expenseName}&quot;</strong>?
          Esta ação não pode ser desfeita.
        </Desc>
        <Actions>
          <Btn type="button" onClick={onClose}>Cancelar</Btn>
          <Btn type="button" $danger onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Excluindo…" : "Excluir"}
          </Btn>
        </Actions>
      </Dialog>
    </Backdrop>
  );
}
