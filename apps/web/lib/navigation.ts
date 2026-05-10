export type NavIconKey = "home" | "leaf" | "book" | "package" | "wallet" | "menu";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: "home" },
  { href: "/ingredientes", label: "Ingredientes", icon: "leaf" },
  { href: "/receitas", label: "Receitas", icon: "book" },
  { href: "/produtos", label: "Produtos", icon: "package" },
  { href: "/despesas", label: "Despesas", icon: "wallet" },
  { href: "/cardapio", label: "Cardápio", icon: "menu" },
];

export const pathTitleMap: Record<string, string> = {
  dashboard: "Visão geral",
  ingredientes: "Ingredientes",
  receitas: "Receitas",
  produtos: "Produtos",
  despesas: "Despesas",
  cardapio: "Cardápio",
};
