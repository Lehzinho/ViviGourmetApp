"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import styled, { css } from "styled-components";

const CardWrap = styled.div<{ $clickable: boolean }>`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: box-shadow ${({ theme }) => theme.transition};

  ${({ $clickable, theme }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        box-shadow: ${theme.shadows.md};
      }
    `}
`;

const IconWrap = styled.div`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-bottom: 0.25rem;
`;

const Value = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1;
`;

const Label = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

type KpiCardProps = {
  label: string;
  value: number | string;
  icon: ReactNode;
  suffix?: string;
  linkTo?: string;
};

export function KpiCard({ label, value, icon, suffix, linkTo }: KpiCardProps) {
  const inner = (
    <CardWrap $clickable={!!linkTo}>
      <IconWrap>{icon}</IconWrap>
      <Value>{value}</Value>
      <Label>
        {label}
        {suffix ? ` — ${suffix}` : ""}
      </Label>
    </CardWrap>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }

  return inner;
}
