"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styled from "styled-components";
import { NavIcon } from "@/components/layout/nav-icons";
import { APP_NAME } from "@/lib/constants";
import { clearStoredTokens } from "@/lib/apiClient";
import { useMe } from "@/hooks/useMe";
import type { NavItem } from "@/lib/navigation";

const Aside = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: ${({ theme }) => theme.layout.sidebarWidth};
  height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  transform: translateX(0);
  transition: transform ${({ theme }) => theme.transition};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    transform: translateX(${({ $open }) => ($open ? "0" : "-100%")});
    box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.md : "none")};
  }
`;

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 1.1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const LogoMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  font-size: 0.85rem;
`;

const LogoText = styled.span`
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Nav = styled.nav`
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryMuted : "transparent"};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryMuted};
  }
`;

const UserCard = styled.div`
  margin: 0.75rem;
  margin-top: auto;
  padding: 0.85rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UserInfo = styled.div``;

const UserName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const UserHint = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.15rem;
`;

const LogoutBtn = styled.button`
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  text-align: left;
  transition: background ${({ theme }) => theme.transition};

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

type SidebarProps = {
  navItems: NavItem[];
  mobileOpen: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ navItems, mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();

  const userName = me?.user?.name ?? "Usuário";
  const companyName = me?.company?.name ?? "Conectado";

  function handleLogout() {
    clearStoredTokens();
    document.cookie = "vivi_logged_in=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  }

  return (
    <Aside $open={mobileOpen} aria-label="Menu principal">
      <LogoRow>
        <LogoMark>VG</LogoMark>
        <LogoText>{APP_NAME}</LogoText>
      </LogoRow>
      <Nav>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              $active={active}
              prefetch
              onClick={() => onNavigate?.()}
            >
              <NavIcon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          );
        })}
      </Nav>
      <UserCard>
        <UserInfo>
          <UserName>{userName}</UserName>
          <UserHint>{companyName}</UserHint>
        </UserInfo>
        <LogoutBtn type="button" onClick={handleLogout}>
          Sair da conta
        </LogoutBtn>
      </UserCard>
    </Aside>
  );
}

const Backdrop = styled.button<{ $visible: boolean }>`
  display: none;
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: ${({ $visible }) => ($visible ? "block" : "none")};
    position: fixed;
    inset: 0;
    z-index: 30;
    border: none;
    margin: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.35);
    cursor: pointer;
  }
`;

export function SidebarBackdrop({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Backdrop type="button" $visible={visible} aria-label="Fechar menu" onClick={onClose} />
  );
}
