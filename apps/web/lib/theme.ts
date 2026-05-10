export const theme = {
  colors: {
    primary: "#E8593C",
    primaryHover: "#cf4f35",
    primaryMuted: "rgba(232, 89, 60, 0.12)",
    success: "#1D9E75",
    successMuted: "rgba(29, 158, 117, 0.12)",
    background: "#ffffff",
    surface: "#fafafa",
    border: "#e4e4e7",
    neutral: {
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
    },
    text: {
      primary: "#18181b",
      secondary: "#52525b",
      muted: "#71717a",
      inverse: "#ffffff",
    },
  },
  shadows: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    md: "0 4px 12px rgba(15, 23, 42, 0.08)",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    full: "9999px",
  },
  layout: {
    sidebarWidth: "260px",
    headerHeight: "56px",
  },
  transition: "0.2s ease",
  breakpoints: {
    mobile: "768px",
  },
} as const;

export type AppTheme = typeof theme;
