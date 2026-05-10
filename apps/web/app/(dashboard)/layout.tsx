import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardSectionLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
