"use client";

import Link from "next/link";
import styled from "styled-components";
import { APP_NAME } from "@/lib/constants";

const Main = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  letter-spacing: -0.03em;
`;

const Subtitle = styled.p`
  margin: 0 0 1.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
  max-width: 40ch;
`;

const CTALink = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.25rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

export default function HomePage() {
  return (
    <Main>
      <Title>{APP_NAME}</Title>
      <Subtitle>Precificação e cardápio para o seu negócio gourmet.</Subtitle>
      <CTALink href="/login">Entrar</CTALink>
    </Main>
  );
}
