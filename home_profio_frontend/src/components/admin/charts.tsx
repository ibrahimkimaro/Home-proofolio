"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Bar, Point } from "@/lib/api";

/**
 * Single-series charts in one hue (the accent). One series per chart means no legend is needed;
 * values and labels use text tokens, never the series color. Every mark has a hover tooltip.
 */

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

/** Daily points; ranges over 60 days are grouped by week so bars stay readable. */
export function bucket(points: Point[], mode: "sum" | "avg" = "sum"): { label: string; value: number; tip: string }[] {
  if (points.length <= 60) return points.map((p) => ({ label: fmtDay(p.date), value: p.value, tip: `${fmtDay(p.date)}: ${p.value}` }));
  const out: { label: string; value: number; tip: string }[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const week = points.slice(i, i + 7);
    const sum = week.reduce((n, p) => n + p.value, 0);
    const value = mode === "avg" ? Math.round((sum / week.length) * 10) / 10 : sum;
    out.push({ label: fmtDay(week[0].date), value, tip: `Week of ${fmtDay(week[0].date)}: ${value}${mode === "avg" ? " / day" : ""}` });
  }
  return out;
}

export function ColumnChart({ title, total, points, mode = "sum", height = 120 }: { title: string; total: string | number; points: Point[]; mode?: "sum" | "avg"; height?: number }) {
  const bars = bucket(points, mode);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const step = Math.ceil(bars.length / 6);
  return (
    <figure className="pf-surface min-w-0 rounded-2xl border border-hairline/80 bg-paper p-5 shadow-2xs">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate">{title}</span>
        <span className="text-[22px] font-bold tabular-nums text-ink-800">{total}</span>
      </figcaption>
      <div className="mt-4 flex items-end gap-[2px] border-b border-hairline pb-px" style={{ height }} role="img" aria-label={`${title}: ${bars.map((b) => b.tip).join(", ")}`}>
        {bars.map((b, i) => (
          <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <span
              className={`pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                i < 3 ? "left-0" : i >= bars.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
              }`}
            >
              {b.tip}
            </span>
            <div
              className="w-full rounded-t-[4px] bg-brass transition-opacity group-hover:opacity-80"
              style={{ height: b.value ? `${(b.value / max) * 100}%` : 2, opacity: b.value ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate">
        {bars.map((b, i) => (i % step === 0 || i === bars.length - 1 ? <span key={i}>{b.label}</span> : null)).filter(Boolean).slice(0, 7)}
      </div>
    </figure>
  );
}

/** Horizontal bars for categories, sorted by the caller. Direct labels; hover shows share of total. */
export function BarList({ title, bars, empty = "No data yet", format = (n: number) => String(n) }: { title: string; bars: Bar[]; empty?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((n, b) => n + b.value, 0);
  return (
    <figure className="pf-surface min-w-0 rounded-2xl border border-hairline/80 bg-paper p-5 shadow-2xs">
      <figcaption className="text-[13px] font-semibold text-slate">{title}</figcaption>
      {bars.length === 0 || total === 0 ? (
        <p className="mt-6 pb-4 text-center text-[13px] text-slate">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {bars.map((b) => (
            <li key={b.label} className="group grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-[13px]" title={`${b.label}: ${format(b.value)} (${Math.round((b.value / total) * 100)}%)`}>
              <span className="truncate text-ink-700">{b.label}</span>
              <span className="h-2.5 rounded-[4px] bg-paper-dim">
                <span className="block h-full rounded-[4px] bg-brass transition-opacity group-hover:opacity-80" style={{ width: `${(b.value / max) * 100}%`, minWidth: b.value ? 4 : 0 }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-ink-800">{format(b.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** Funnel: each step as a share of the first, with step-to-step conversion. */
export function Funnel({ steps }: { steps: { step: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <figure className="pf-surface min-w-0 rounded-2xl border border-hairline/80 bg-paper p-5 shadow-2xs">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-slate">Member journey</span>
        <span className="text-[12px] text-slate">all time</span>
      </figcaption>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => {
          const prev = i ? steps[i - 1].value : s.value;
          const conv = prev ? Math.round((s.value / prev) * 100) : null; // no rate when the previous step is empty
          return (
            <li key={s.step} className="group" title={`${s.step}: ${s.value} members (${Math.round((s.value / top) * 100)}% of sign-ups)`}>
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="text-ink-700">{s.step}</span>
                <span className="tabular-nums">
                  <span className="font-semibold text-ink-800">{s.value}</span>
                  {i > 0 && conv !== null && <span className="ml-2 text-[12px] text-slate">{conv}% of previous</span>}
                </span>
              </div>
              <div className="h-3 rounded-[4px] bg-paper-dim">
                <div className="h-full rounded-[4px] bg-brass transition-opacity group-hover:opacity-80" style={{ width: `${(s.value / top) * 100}%`, minWidth: s.value ? 4 : 0 }} />
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

/** Headline number with change vs the previous period of the same length. */
export function Kpi({ label, value, prev, hint }: { label: string; value: number; prev?: number; hint?: string }) {
  const delta = prev === undefined ? null : value - prev;
  const pct = prev ? Math.round(((value - prev) / prev) * 100) : null;
  return (
    <div className="pf-surface rounded-2xl border border-hairline/80 bg-paper p-5 shadow-2xs">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-slate">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink-800">{value.toLocaleString()}</p>
      <p className="mt-1 flex items-center gap-1 text-[12px] text-slate">
        {delta === null ? (
          hint
        ) : delta === 0 ? (
          "Same as previous period"
        ) : (
          <>
            {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-label="Up" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-label="Down" />}
            {Math.abs(delta)}
            {pct !== null && ` (${pct > 0 ? "+" : ""}${pct}%)`} vs previous period
          </>
        )}
      </p>
    </div>
  );
}

const SLICES = ["#c9a227", "#38bdf8", "#10b981", "#a855f7", "#f43f5e", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16", "#64748b", "#14b8a6", "#f97316", "#6366f1"];

/** Pie or donut with its legend beside (or under, on a phone) it. Hover a row to see its share. */
export function PieList({ title, bars, empty = "No data yet", donut = false }: { title: string; bars: Bar[]; empty?: string; donut?: boolean }) {
  const total = bars.reduce((n, b) => n + b.value, 0);
  const R = donut ? 15.915 : 8; // a pie is a ring as thick as its radius: the stroke fills it to the centre
  const C = 2 * Math.PI * R;
  let done = 0; // share already drawn, in percent
  return (
    <figure className="pf-surface min-w-0 rounded-2xl border border-hairline/80 bg-paper p-5 shadow-2xs">
      <figcaption className="text-[13px] font-semibold text-slate">{title}</figcaption>
      {bars.length === 0 || total === 0 ? (
        <p className="mt-6 pb-4 text-center text-[13px] text-slate">{empty}</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
          <svg viewBox="0 0 42 42" className="h-44 w-44 shrink-0" role="img" aria-label={title}>
            {bars.map((b, i) => {
              const pct = (b.value / total) * 100;
              const slice = (
                <circle
                  key={b.label}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  stroke={SLICES[i % SLICES.length]}
                  strokeWidth={donut ? 7 : 16}
                  strokeDasharray={`${(pct / 100) * C} ${C}`}
                  strokeDashoffset={C * 0.25 - (done / 100) * C}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{`${b.label}: ${b.value} (${Math.round(pct)}%)`}</title>
                </circle>
              );
              done += pct;
              return slice;
            })}
            {donut && (
              <text x="21" y="22.5" textAnchor="middle" className="fill-ink-800 text-[6px] font-semibold">
                {total}
              </text>
            )}
          </svg>
          <ul className="w-full min-w-0 flex-1 space-y-1.5 text-[13px]">
            {bars.map((b, i) => (
              <li key={b.label} className="flex items-center gap-2" title={`${b.label}: ${b.value} (${Math.round((b.value / total) * 100)}%)`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: SLICES[i % SLICES.length] }} />
                <span className="min-w-0 flex-1 truncate text-ink-700">{b.label}</span>
                <span className="font-semibold tabular-nums text-ink-800">{b.value}</span>
                <span className="w-9 text-right tabular-nums text-slate">{Math.round((b.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
