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
  width: min(420px, 100%);
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  padding: 1.5rem;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Body = styled.p`
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const ConflictList = styled.ul`
  margin: 0.5rem 0 0;
  padding: 0 0 0 1.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
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

  ${({ theme, $danger }) =>
    $danger
      ? `
    border: none;
    background: #dc2626;
    color: #ffffff;
    &:hover:not(:disabled) { background: #b91c1c; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  `
      : `
    border: 1px solid ${theme.colors.border};
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

type DeleteConfirmDialogProps = {
  open: boolean;
  ingredientName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  conflictList?: string[];
};

export function DeleteConfirmDialog({
  open,
  ingredientName,
  onClose,
  onConfirm,
  isLoading,
  conflictList,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  const hasConflict = conflictList && conflictList.length > 0;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={onClose}
    >
      <Dialog onClick={(e) => e.stopPropagation()}>
        {hasConflict ? (
          <>
            <Title id="delete-dialog-title">Não é possível excluir</Title>
            <Body>
              <strong>{ingredientName}</strong> está sendo usado nas seguintes
              receitas e não pode ser excluído:
              <ConflictList>
                {conflictList!.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ConflictList>
            </Body>
            <Footer>
              <Btn type="button" onClick={onClose}>
                Fechar
              </Btn>
            </Footer>
          </>
        ) : (
          <>
            <Title id="delete-dialog-title">Excluir ingrediente</Title>
            <Body>
              Deseja excluir <strong>{ingredientName}</strong>? Esta ação não
              pode ser desfeita.
            </Body>
            <Footer>
              <Btn type="button" onClick={onClose}>
                Cancelar
              </Btn>
              <Btn
                type="button"
                $danger
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Excluindo…" : "Excluir"}
              </Btn>
            </Footer>
          </>
        )}
      </Dialog>
    </Backdrop>
  );
}
