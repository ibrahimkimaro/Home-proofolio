"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Search, type LucideIcon } from "lucide-react";

export function Panel({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pf-surface rounded-2xl border border-hairline/80 bg-paper shadow-2xs ${className}`}>
      <header className="flex flex-col gap-3 border-b border-hairline/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brass/10 text-brass-dark">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-ink-800">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="pf-surface min-w-0 rounded-2xl border border-hairline/80 bg-paper p-4 shadow-2xs transition-colors hover:border-brass/40 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate sm:text-[12px]">{label}</span>
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass/10 text-brass-dark sm:flex">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-ink-800 sm:mt-3 sm:text-3xl">{value}</div>
      {hint && <p className="mt-1 truncate text-[12px] text-slate">{hint}</p>}
    </div>
  );
}

const TONES = {
  good: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/25",
  bad: "bg-berry/10 text-berry border-berry/25",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/25",
  neutral: "bg-paper-dim text-slate border-hairline",
  accent: "bg-brass/10 text-brass-dark border-brass/30",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate/60" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input !h-9 w-full pl-8 text-[13px]"
      />
    </div>
  );
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="input !h-9 pr-8 text-[13px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Inline two-step confirm: first click arms, second click runs. No modal needed. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirm?",
  danger = false,
  disabled = false,
  title,
}: {
  onConfirm: () => Promise<void>;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  const base =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";
  const tone = armed
    ? danger
      ? "border-berry bg-berry text-white"
      : "border-brass bg-brass text-white"
    : danger
      ? "border-hairline text-berry hover:border-berry/50 hover:bg-berry/5"
      : "border-hairline text-ink-700 hover:border-brass/50 hover:bg-brass/5";

  return (
    <button type="button" onClick={handleClick} disabled={disabled || busy} title={title} className={`${base} ${tone}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {armed ? confirmLabel : children}
    </button>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-[13px] text-slate">
        {children}
      </td>
    </tr>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass/15 text-[11px] font-bold text-brass-dark">
      {initials}
    </div>
  );
}

export const th = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate first:pl-0 last:pr-0";
export const td = "px-3 py-3 align-middle first:pl-0 last:pr-0";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
