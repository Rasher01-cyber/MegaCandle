import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";
type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "tradefx_theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(storageKey) as Theme | null;
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  const systemDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemDark ? "dark" : "light";
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

const THEME_TRANSITION_MS = 260;

function animateThemeTransition() {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  window.setTimeout(() => {
    root.classList.remove("theme-transition");
  }, THEME_TRANSITION_MS);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    animateThemeTransition();
    setThemeState(t);
    try {
      localStorage.setItem(storageKey, t);
    } catch {
      /* ignore */
    }
    applyThemeToDom(t);
  };

  const toggle = () => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      animateThemeTransition();
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
      applyThemeToDom(next);
      return next;
    });
  };

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
