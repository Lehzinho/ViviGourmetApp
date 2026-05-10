"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { pathTitleMap } from "@/lib/navigation";

const Wrap = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 1.25rem;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
`;

const MenuBtn = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: inline-flex;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[200]};
  }
`;

const Breadcrumbs = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Crumb = styled.li`
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &:not(:last-child)::after {
    content: "/";
    color: ${({ theme }) => theme.colors.neutral[400]};
    margin-left: 0.35rem;
    font-weight: 400;
  }
`;

const CrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const CrumbCurrent = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconBtn = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const NotifyDot = styled.span`
  position: absolute;
  top: 8px;
  right: 9px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  border: 2px solid ${({ theme }) => theme.colors.background};
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

type HeaderProps = {
  onOpenSidebar: () => void;
  userInitials?: string;
};

function useBreadcrumbSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [{ href: "/dashboard", label: "Visão geral", current: true as const }];
  }
  const main = segments[0];
  const label = pathTitleMap[main] ?? main;
  return [
    { href: "/dashboard", label: "Painel", current: false as const },
    { href: `/${main}`, label, current: true as const },
  ];
}

export function Header({ onOpenSidebar, userInitials = "U" }: HeaderProps) {
  const pathname = usePathname();
  const crumbs = useBreadcrumbSegments(pathname);

  return (
    <Wrap>
      <Left>
        <MenuBtn type="button" aria-label="Abrir menu" onClick={onOpenSidebar}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 7h14M5 12h14M5 17h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </MenuBtn>
        <Breadcrumbs>
          {crumbs.map((c) => (
            <Crumb key={c.href + c.label}>
              {c.current ? (
                <CrumbCurrent>{c.label}</CrumbCurrent>
              ) : (
                <CrumbLink href={c.href}>{c.label}</CrumbLink>
              )}
            </Crumb>
          ))}
        </Breadcrumbs>
      </Left>
      <Right>
        <IconBtn type="button" aria-label="Notificações">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          <NotifyDot />
        </IconBtn>
        <Avatar aria-hidden>{userInitials.slice(0, 2).toUpperCase()}</Avatar>
      </Right>
    </Wrap>
  );
}
