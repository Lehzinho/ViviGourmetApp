"use client";

import { useState, type ReactNode } from "react";
import styled from "styled-components";
import { dashboardNav } from "@/lib/navigation";
import { useMe } from "@/hooks/useMe";
import { Header } from "./Header";
import { Sidebar, SidebarBackdrop } from "./Sidebar";

const Shell = styled.div`
  min-height: 100vh;
`;

const Body = styled.div`
  @media (min-width: 769px) {
    padding-left: ${({ theme }) => theme.layout.sidebarWidth};
  }
`;

const Main = styled.main`
  padding: 1.25rem 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

type AppShellProps = {
  children: ReactNode;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = useMe();

  const initials = me?.user?.name ? getInitials(me.user.name) : "VG";

  return (
    <Shell>
      <Sidebar
        navItems={dashboardNav}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <SidebarBackdrop visible={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Body>
        <Header onOpenSidebar={() => setMobileOpen(true)} userInitials={initials} />
        <Main>{children}</Main>
      </Body>
    </Shell>
  );
}
