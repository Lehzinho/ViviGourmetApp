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

const Body = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const ConflictList = styled.ul`
  margin: 0.5rem 0 1rem;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: #dc2626;
`;

const Footer = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
`;

const Btn = styled.button<{ $variant?: "danger" | "ghost" }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  ${({ theme, $variant }) =>
    $variant === "danger"
      ? `
    background: #dc2626;
    color: #fff;
    &:hover:not(:disabled) { background: #b91c1c; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

type DeleteRecipeDialogProps = {
  open: boolean;
  recipeName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  conflictList?: string[];
};

export function DeleteRecipeDialog({
  open,
  recipeName,
  onClose,
  onConfirm,
  isLoading,
  conflictList = [],
}: DeleteRecipeDialogProps) {
  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Title>Excluir receita</Title>
        <Body>
          Deseja excluir <strong>{recipeName}</strong>? Esta ação não pode ser desfeita.
        </Body>
        {conflictList.length > 0 && (
          <>
            <Body style={{ color: "#dc2626", marginTop: "0.5rem" }}>
              Esta receita está em uso nos seguintes produtos:
            </Body>
            <ConflictList>
              {conflictList.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ConflictList>
          </>
        )}
        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            $variant="danger"
            onClick={onConfirm}
            disabled={isLoading || conflictList.length > 0}
          >
            {isLoading ? "Excluindo…" : "Excluir"}
          </Btn>
        </Footer>
      </Dialog>
    </Backdrop>
  );
}
