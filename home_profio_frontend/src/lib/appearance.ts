/**
 * Appearance preferences, shared by onboarding's last step and Settings > Appearance.
 * Stored per device; app/layout.tsx applies them before first paint. Keys match onboarding.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type ToneId = "neutral" | "paper" | "warm-paper" | "slate" | "olbongo" | "espresso" | "midnight";
export type AccentId = "graphite" | "brass" | "emerald" | "berry" | "sky" | "ocean" | "forest" | "cocoa" | "plum" | "clay" | "custom";
export type GlassId = "clean" | "frosted" | "liquid";
export type TextSize = "small" | "default" | "large" | "xlarge";

const KEY = {
  theme: "proofolio-theme",
  tone: "proofolio-palette",
  accent: "proofolio-accent",
  custom: "proofolio-accent-custom",
  glass: "proofolio-glass-style",
  text: "proofolio-text",
  motion: "proofolio-motion",
  contrast: "proofolio-contrast",
  sync: "proofolio-appearance-sync",
};

export const TEXT_SIZES: { id: TextSize; label: string; scale: number }[] = [
  { id: "small", label: "Small", scale: 0.92 },
  { id: "default", label: "Default", scale: 1 },
  { id: "large", label: "Large", scale: 1.1 },
  { id: "xlarge", label: "Extra large", scale: 1.2 },
];

/** Background tones. `page` / `card` / `line` are only for drawing swatches; the real values live in globals.css. */
export const TONES: { id: ToneId; label: string; hint: string; theme: "light" | "dark"; page: string; card: string; line: string }[] = [
  { id: "neutral", label: "Neutral", hint: "Clean white", theme: "light", page: "#fafafa", card: "#ffffff", line: "#e5e7eb" },
  { id: "warm-paper", label: "Warm Sand", hint: "Soft reading light", theme: "light", page: "#f3eee4", card: "#fdfbf7", line: "#e2dccf" },
  { id: "slate", label: "Soft Slate", hint: "Eye-comfort dark", theme: "dark", page: "#121316", card: "#191b20", line: "#292a30" },
  { id: "olbongo", label: "Olbongo Dark", hint: "Emerald charcoal", theme: "dark", page: "#0a0f0d", card: "#111814", line: "#1c2720" },
  { id: "espresso", label: "Warm Espresso", hint: "Cozy warm dark", theme: "dark", page: "#161311", card: "#1f1a17", line: "#2f2723" },
  { id: "midnight", label: "Midnight Navy", hint: "Deep night blue", theme: "dark", page: "#0c1017", card: "#131822", line: "#212938" },
];

/** Accents, pre-darkened to ≥4.5:1 on every light tone (see globals.css). */
export const ACCENTS: { id: Exclude<AccentId, "custom">; label: string; ink: string }[] = [
  { id: "graphite", label: "Graphite", ink: "#111111" },
  { id: "brass", label: "Signature Gold", ink: "#836919" },
  { id: "emerald", label: "Emerald Trust", ink: "#0a7854" },
  { id: "berry", label: "Electric Berry", ink: "#a8384a" },
  { id: "sky", label: "Apple Sky", ink: "#0a73a3" },
  { id: "ocean", label: "Ocean", ink: "#0f3d5e" },
  { id: "forest", label: "Forest", ink: "#1f4d36" },
  { id: "cocoa", label: "Cocoa", ink: "#4a3426" },
  { id: "plum", label: "Plum", ink: "#4b2a5a" },
  { id: "clay", label: "Clay", ink: "#8a3b25" },
];

export const GLASS: { id: GlassId; label: string; hint: string }[] = [
  { id: "clean", label: "Clean solid", hint: "Matte card with a hairline edge" },
  { id: "frosted", label: "Frosted glass", hint: "Translucent, soft blur" },
  { id: "liquid", label: "Liquid glass", hint: "Deep blur with a light rim" },
];

export interface Appearance {
  theme: ThemeChoice;
  tone: ToneId;
  accent: AccentId;
  custom: string;
  glass: GlassId;
  text: TextSize;
  motion: "system" | "reduce";
  contrast: "default" | "more";
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "light",
  tone: "neutral",
  accent: "graphite",
  custom: "#2563eb",
  glass: "clean",
  text: "default",
  motion: "system",
  contrast: "default",
};

function get(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function put(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
}

export function readAppearance(): Appearance {
  const theme = get(KEY.theme);
  const tone = get(KEY.tone);
  const accent = get(KEY.accent);
  const glass = get(KEY.glass);
  return {
    theme: theme === "dark" || theme === "system" ? theme : "light",
    tone: TONES.some((t) => t.id === tone) || tone === "paper" ? (tone as ToneId) : "neutral",
    accent: accent === "custom" || ACCENTS.some((a) => a.id === accent) ? (accent as AccentId) : "graphite",
    custom: /^#[0-9a-f]{6}$/i.test(get(KEY.custom) ?? "") ? get(KEY.custom)! : "#2563eb",
    glass: glass === "frosted" || glass === "liquid" ? glass : "clean",
    text: TEXT_SIZES.some((t) => t.id === get(KEY.text)) ? (get(KEY.text) as TextSize) : "default",
    motion: get(KEY.motion) === "reduce" ? "reduce" : "system",
    contrast: get(KEY.contrast) === "more" ? "more" : "default",
  };
}

/** Persist and apply to <html>. Mirrors the inline script in app/layout.tsx. */
export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const dark = a.theme === "dark" || (a.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  put(KEY.theme, a.theme === "system" ? null : a.theme);
  if (a.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", a.theme);
  root.classList.toggle("dark", dark);

  const tone = a.tone === "neutral" || a.tone === "paper" ? null : a.tone;
  put(KEY.tone, tone);
  if (tone) root.setAttribute("data-palette", tone);
  else root.removeAttribute("data-palette");

  put(KEY.accent, a.accent === "graphite" ? null : a.accent);
  put(KEY.custom, a.custom);
  if (a.accent === "graphite") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", a.accent);
  if (a.accent === "custom") root.style.setProperty("--pf-ink", a.custom);
  else root.style.removeProperty("--pf-ink");

  put(KEY.glass, a.glass === "clean" ? null : a.glass);
  if (a.glass === "clean") root.removeAttribute("data-glass");
  else root.setAttribute("data-glass", a.glass);

  // Accessibility: text size, motion, contrast. Defaults remove the attribute.
  const flags: [keyof typeof KEY, string, string | null][] = [
    ["text", "data-text", a.text === "default" ? null : a.text],
    ["motion", "data-motion", a.motion === "reduce" ? "reduce" : null],
    ["contrast", "data-contrast", a.contrast === "more" ? "more" : null],
  ];
  for (const [k, attr, v] of flags) {
    put(KEY[k], v);
    if (v) root.setAttribute(attr, v);
    else root.removeAttribute(attr);
  }
}

// ---- sync across devices (stored in the member's account) ----

export function syncEnabled() {
  return get(KEY.sync) !== "off";
}

export function setSyncEnabled(on: boolean) {
  put(KEY.sync, on ? null : "off");
}

const same = (a: Appearance, b: Appearance) => (Object.keys(DEFAULT_APPEARANCE) as (keyof Appearance)[]).every((k) => a[k] === b[k]);

const ADOPTED = "proofolio-appearance-adopted";

/** On sign-out: the next account to sign in here gets its own saved appearance. */
export function forgetAdoptedAppearance() {
  try {
    sessionStorage.removeItem(ADOPTED);
  } catch {}
}

/**
 * On sign-in: if this account saved an appearance and sync is on, use it on this device too.
 * Once per browser session: every page re-reads the account, and re-applying it there would undo a
 * theme just switched on this device (e.g. dark mode turning back to light when changing pages).
 */
export function adoptAccountAppearance(saved: Partial<Appearance> | undefined | null) {
  if (!saved || !syncEnabled() || typeof document === "undefined") return;
  try {
    if (sessionStorage.getItem(ADOPTED)) return;
    sessionStorage.setItem(ADOPTED, "1");
  } catch {}
  const next = { ...DEFAULT_APPEARANCE, ...saved } as Appearance;
  if (!same(next, readAppearance())) applyAppearance(next);
}

// ---- contrast (WCAG relative luminance) for custom accents ----

export const MIN_CONTRAST = 4.5;
const LIGHT_SURFACES = ["#fafafa", "#f3eee4"]; // neutral + warm sand pages

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b = "#fafafa") {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const worst = (hex: string) => Math.min(...LIGHT_SURFACES.map((s) => contrast(hex, s)));

/** Darken toward black just enough to stay readable on every light tone. */
export function readable(hex: string): { color: string; adjusted: boolean; ratio: number } {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return { color: "#111111", adjusted: true, ratio: worst("#111111") };
  if (worst(hex) >= MIN_CONTRAST) return { color: hex.toLowerCase(), adjusted: false, ratio: worst(hex) };
  const [r, g, b] = channels(hex);
  for (let k = 0.975; k > 0; k -= 0.025) {
    const c = "#" + [r, g, b].map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("");
    if (worst(c) >= MIN_CONTRAST) return { color: c, adjusted: true, ratio: worst(c) };
  }
  return { color: "#111111", adjusted: true, ratio: worst("#111111") };
}
