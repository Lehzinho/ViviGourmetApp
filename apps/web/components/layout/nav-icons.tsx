import type { NavIconKey } from "@/lib/navigation";

type IconProps = { size?: number; className?: string };

export function NavIcon({ name, size = 20, className }: IconProps & { name: NavIconKey }) {
  const s = size;
  switch (name) {
    case "home":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "leaf":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 18C10 10 15 6 20 5c-1 8-6 14-14 13h-2l2-2c2-1 3.5-2 4.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "book":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 4h10a4 4 0 014 4v12a2 2 0 00-2-2H5V4zM5 4H4a2 2 0 00-2 2v14a2 2 0 002 2h1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "package":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l8 4v6l-8 4-8-4V7l8-4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 12l8-4M12 12v9M12 12L4 8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 10h18v4H3" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="15.5" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
