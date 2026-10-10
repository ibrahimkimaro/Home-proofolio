"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { adminAnalytics, type AdminAnalytics } from "@/lib/api";
import { BarList, ColumnChart, Funnel, Kpi } from "./charts";

const RANGES = [7, 30, 90, 365] as const;
const KIND_LABEL: Record<string, string> = { capture: "Not shaped", work: "Work", learning: "Learning", achievement: "Achievement", problem: "Problem" };
const VIS_LABEL: Record<string, string> = { public: "Public", unlisted: "Link only", private: "Only me", draft: "Draft" };

export function AnalyticsSection({ onError }: { onError: (msg: string) => void }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    adminAnalytics(days)
      .then((d) => live && setData(d))
      .catch((e) => onError(e instanceof Error ? e.message : "Couldn't load analytics"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [days, onError]);

  const sum = (k: keyof AdminAnalytics["series"]) => (data ? data.series[k].reduce((n, p) => n + p.value, 0) : 0);
  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-slate">
          <BarChart3 className="h-4 w-4" /> Live from the database {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </p>
        <div className="flex rounded-xl border border-hairline bg-paper p-1" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={days === r}
              onClick={() => (setLoading(true), setDays(r))}
              className={`h-8 rounded-lg px-3 text-[13px] font-medium cursor-pointer ${days === r ? "bg-ink text-paper" : "text-slate hover:text-ink-800"}`}
            >
              {r === 365 ? "1 year" : `${r} days`}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-paper" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="New members" value={t!.new_users} prev={t!.new_users_prev} />
            <Kpi label="Active members" value={t!.active_members} prev={t!.active_members_prev} />
            <Kpi label="Public profiles" value={t!.public_profiles} />
            <Kpi label="Follows" value={t!.follows} />
          </div>

          {/* Small multiples: one measure per chart, same time axis — never a dual axis. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ColumnChart title="Sign-ups" total={sum("signups")} points={data.series.signups} />
            <ColumnChart title="Active members per day" total={t!.active_members} points={data.series.active_members} mode="avg" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ColumnChart title="Captured" total={sum("captures")} points={data.series.captures} height={90} />
            <ColumnChart title="Captures shaped" total={sum("shaped")} points={data.series.shaped} height={90} />
            <ColumnChart title="Published" total={sum("published")} points={data.series.published} height={90} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Funnel steps={data.funnel} />
            <BarList title="Disciplines chosen at sign-up" bars={data.disciplines} empty="No sign-ups through onboarding yet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Items by type" bars={data.by_kind.map((b) => ({ ...b, label: KIND_LABEL[b.label] ?? b.label }))} />
            <BarList title="Items by visibility" bars={data.by_visibility.map((b) => ({ ...b, label: VIS_LABEL[b.label] ?? b.label }))} />
            <BarList title="Top skills" bars={data.top_skills} />
          </div>

          {data.questions.length > 0 && (
            <div>
              <h2 className="mb-3 text-[15px] font-semibold text-ink-800">Onboarding answers</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.questions.map((q) => (
                  <BarList
                    key={q.id}
                    title={`${q.prompt} · ${q.responses} ${q.responses === 1 ? "response" : "responses"}${q.active ? "" : " · hidden"}`}
                    bars={q.options}
                    empty="No answers yet"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
