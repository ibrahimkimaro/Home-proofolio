import { TrendingUp } from "lucide-react";
import type { HomeData } from "@/lib/api";

/** Weekly activity: one series, one hue, hover tooltip per bar, zero weeks drawn as a hairline. */
export function ActivityChart({ weeks }: { weeks: HomeData["activity"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.changes));
  const total = weeks.reduce((n, w) => n + w.changes, 0);
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <section className="pf-surface rounded-2xl border border-hairline bg-paper p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-[18px] w-[18px] text-slate" />
          <div>
            <h2 className="text-[15px] font-semibold">Activity</h2>
            <p className="text-[12px] text-slate">Captures, shapes and publishes · last {weeks.length} weeks</p>
          </div>
        </div>
        <p className="text-[22px] font-bold tabular-nums leading-none">{total}</p>
      </header>
      <div className="mt-5 flex h-28 items-end gap-1.5 border-b border-hairline pb-px" role="img" aria-label={`${total} changes over ${weeks.length} weeks`}>
        {weeks.map((w, i) => (
          <div key={w.week} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* Edge bars anchor their tooltip inward so it never runs off-screen. */}
            <span className={`pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap ${
              i < 3 ? "left-0" : i >= weeks.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
            } rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100`}>
              Week of {fmt(w.week)}: {w.changes}
            </span>
            <div
              className="w-full rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-80"
              style={{ height: w.changes ? `${(w.changes / max) * 100}%` : "2px", opacity: w.changes ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate">
        <span>{fmt(weeks[0]?.week ?? "")}</span>
        <span>This week</span>
      </div>
    </section>
  );
}
