/**
 * ThemeController — light/dark mode toggler (§4.1).
 *
 * - Reads the user's preference from localStorage on mount.
 * - Falls back to OS preference (prefers-color-scheme).
 * - Sets `data-theme="dark"` on <html>, which the CSS file maps to the
 *   dark token palette (`:root[data-theme="dark"]`).
 * - The current theme is exposed on `data-theme` so SSR is correct.
 *
 * Renders as a small icon button in the corner of the page.
 */

"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const STORAGE_KEY = "marketplace_theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeController() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readStoredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md",
        "border border-[var(--color-border)] bg-[var(--color-card)]",
        "text-[var(--color-muted-foreground)]",
        "hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]",
        "transition-colors"
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
    >
      {mounted ? (
        theme === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="block h-4 w-4" />
      )}
    </button>
  );
}
