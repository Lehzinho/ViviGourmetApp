"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Field, Input, Label } from "@/components/ingredients/form-primitives";
import type { CreateMenuPayload, MenuRow, UpdateMenuPayload } from "@/types/menus";

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
  width: min(480px, 100%);
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

const HintText = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

type MenuModalProps =
  | {
      mode: "create";
      open: boolean;
      onClose: () => void;
      onSubmit: (payload: CreateMenuPayload) => void;
      isLoading: boolean;
      submitError?: string;
    }
  | {
      mode: "edit";
      open: boolean;
      menu: MenuRow;
      onClose: () => void;
      onSubmit: (payload: UpdateMenuPayload) => void;
      isLoading: boolean;
      submitError?: string;
    };

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MenuModal(props: MenuModalProps) {
  const { open, onClose, isLoading, submitError } = props;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (props.mode === "edit") {
      setName(props.menu.name);
      setSlug(props.menu.slug);
      setSlugManual(true);
      setIsPublic(props.menu.isPublic);
    } else {
      setName("");
      setSlug("");
      setSlugManual(false);
      setIsPublic(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!slugManual && props.mode === "create") {
      setSlug(toSlug(name));
    }
  }, [name, slugManual, props.mode]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      isPublic,
    };
    if (props.mode === "create") {
      props.onSubmit(payload as CreateMenuPayload);
    } else {
      props.onSubmit(payload as UpdateMenuPayload);
    }
  };

  if (!open) return null;

  return (
    <Backdrop role="dialog" aria-modal="true" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle>
            {props.mode === "create" ? "Novo cardápio" : "Editar cardápio"}
          </ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>

        <Body>
          {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

          <Field>
            <Label htmlFor="menu-name">Nome *</Label>
            <Input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cardápio de Verão"
            />
          </Field>

          <Field>
            <Label htmlFor="menu-slug">Slug</Label>
            <Input
              id="menu-slug"
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              placeholder="cardapio-de-verao"
            />
            <HintText>Gerado automaticamente a partir do nome. Deve ser único.</HintText>
          </Field>

          <CheckRow>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Cardápio público (visível para clientes)
          </CheckRow>
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading
              ? "Salvando…"
              : props.mode === "create"
                ? "Criar cardápio"
                : "Salvar alterações"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
