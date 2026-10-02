"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const storedTheme = (localStorage.getItem("proofolio-theme") as Theme | null) ?? null;
    const storedPalette = localStorage.getItem("proofolio-palette");
    const system: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = storedTheme ?? system;

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    if (storedPalette) {
      document.documentElement.setAttribute("data-palette", storedPalette);
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");

    try {
      localStorage.setItem("proofolio-theme", next);
    } catch {
      // storage unavailable
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-hairline/80 bg-paper/80 text-ink-700 shadow-2xs backdrop-blur-md transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 cursor-pointer ${className}`}
    >
      {theme === null ? (
        <span className="block h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4 text-brass transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-ink-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
