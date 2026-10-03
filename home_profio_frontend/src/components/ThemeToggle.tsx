"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { applyAppearance, readAppearance, syncEnabled, TONES } from "@/lib/appearance";
import { saveAppearancePreference } from "@/lib/api";

type Theme = "light" | "dark";

const isDarkNow = () => document.documentElement.classList.contains("dark");

/**
 * Light/dark switch in the headers. Goes through the same appearance settings as Settings >
 * Appearance (this device + the account when sync is on), so the choice sticks when changing
 * pages and on other devices instead of being overwritten by the account's older setting.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Whatever the pre-paint script in app/layout.tsx (or an account appearance) already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the DOM after mount
    setTheme(isDarkNow() ? "dark" : "light");
  }, []);

  function toggle() {
    const nextTheme: Theme = (theme ?? (isDarkNow() ? "dark" : "light")) === "dark" ? "light" : "dark";
    const current = readAppearance();
    // A dark-only background tone can't stay on in light mode (and vice versa): fall back to neutral.
    const tone = TONES.find((t) => t.id === current.tone);
    const next = { ...current, theme: nextTheme, tone: tone && tone.theme !== nextTheme ? "neutral" : current.tone } as typeof current;
    applyAppearance(next);
    setTheme(nextTheme);
    // Signed-out pages (login, onboarding) just get a 401 here, which is fine: the device keeps it.
    if (syncEnabled()) saveAppearancePreference(next).catch(() => {});
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
