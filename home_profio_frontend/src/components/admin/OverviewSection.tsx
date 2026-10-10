"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Eye, ShieldCheck, TrendingUp, Clock, KeyRound } from "lucide-react";
import { fetchAdminVisits, type AdminOtpLog, type AdminStats, type AdminUser, type AdminVisits, type VisitRange } from "@/lib/api";
import { Avatar, Badge, Panel, StatCard, timeAgo } from "./ui";
import type { AdminSection } from "./AdminShell";

const DAYS = 14;

export function OverviewSection({
  stats,
  users,
  otps,
  onNavigate,
}: {
  stats: AdminStats | null;
  users: AdminUser[];
  otps: AdminOtpLog[];
  onNavigate: (s: AdminSection) => void;
}) {
  const activeUsers = users.filter((u) => u.is_active).length;
  const verifyRate = stats?.total_otps_sent
    ? Math.round((stats.total_otps_verified / stats.total_otps_sent) * 100)
    : 0;
  const [range, setRange] = useState<VisitRange>("today");
  const [visits, setVisits] = useState<AdminVisits | null>(null);
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetchAdminVisits(range)
        .then((v) => {
          if (!live) return;
          setVisits(v);
          if (range === "today") setTodayVisitors(v.visitors);
        })
        .catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 15000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [range]);

  // Signups per day, last 14 days (local time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const signups = Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (DAYS - 1 - i));
    const key = day.toDateString();
    return { day, count: users.filter((u) => new Date(u.created_at).toDateString() === key).length };
  });
  const signupMax = Math.max(1, ...signups.map((s) => s.count));
  const signupTotal = signups.reduce((a, s) => a + s.count, 0);

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total users"
          icon={Users}
          value={stats?.total_users ?? "—"}
          hint={`${plural(stats?.admin_count ?? 0, "admin")} · ${plural(Math.max(0, (stats?.total_users ?? 0) - (stats?.admin_count ?? 0)), "member")}`}
        />
        <StatCard
          label="Active accounts"
          icon={UserCheck}
          value={activeUsers}
          hint={`${users.length - activeUsers} suspended`}
        />
        <StatCard
          label="Visitors today"
          icon={Eye}
          value={todayVisitors ?? "—"}
          hint="Unique people on the site today"
        />
        <StatCard
          label="OTP verify rate"
          icon={ShieldCheck}
          value={`${verifyRate}%`}
          hint={`${stats?.total_otps_verified ?? 0} of ${stats?.total_otps_sent ?? 0} verified`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          icon={TrendingUp}
          title="New signups"
          subtitle={`${signupTotal} in the last ${DAYS} days`}
        >
          <div>
            <div className="flex h-48 items-end gap-1.5 border-b border-hairline pb-px" role="img" aria-label={`Daily signups over the last ${DAYS} days`}>
              {signups.map(({ day, count }) => (
                <div key={day.toISOString()} className="group relative flex h-full flex-1 flex-col justify-end">
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {day.toLocaleDateString([], { month: "short", day: "numeric" })}: {count}
                  </span>
                  <div
                    className="w-full rounded-t-[4px] bg-brass transition-colors group-hover:bg-brass-dark"
                    style={{ height: count ? `${(count / signupMax) * 100}%` : "2px", opacity: count ? 1 : 0.35 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {signups.map(({ day }, i) => (
                <span key={i} className="flex-1 text-center text-[10px] tabular-nums text-slate">
                  {i % 2 === DAYS % 2 ? "" : day.getDate()}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <VisitorsPanel range={range} onRange={setRange} data={visits} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          icon={Clock}
          title="Recent signups"
          actions={
            <button type="button" onClick={() => onNavigate("users")} className="text-[12px] font-medium text-brass-dark hover:underline cursor-pointer">
              View all
            </button>
          }
        >
          <ul className="divide-y divide-hairline/60">
            {users.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Avatar name={u.fullname || u.username} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-800">{u.fullname || u.username}</p>
                  <p className="truncate text-[12px] text-slate">@{u.username}</p>
                </div>
                {!u.is_active && <Badge tone="bad">Suspended</Badge>}
                <span className="text-[12px] text-slate">{timeAgo(u.created_at)}</span>
              </li>
            ))}
            {users.length === 0 && <li className="py-6 text-center text-[13px] text-slate">No users yet.</li>}
          </ul>
        </Panel>

        <Panel
          icon={KeyRound}
          title="Recent OTP activity"
          actions={
            <button type="button" onClick={() => onNavigate("security")} className="text-[12px] font-medium text-brass-dark hover:underline cursor-pointer">
              View all
            </button>
          }
        >
          <ul className="divide-y divide-hairline/60">
            {otps.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] text-ink-800">{o.destination}</p>
                  <p className="text-[12px] text-slate">{o.purpose.replace(/_/g, " ")}</p>
                </div>
                <OtpStatusBadge otp={o} />
                <span className="text-[12px] text-slate">{timeAgo(o.created_at)}</span>
              </li>
            ))}
            {otps.length === 0 && <li className="py-6 text-center text-[13px] text-slate">No OTP activity yet.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function OtpStatusBadge({ otp }: { otp: AdminOtpLog }) {
  if (otp.is_verified) return <Badge tone="good">Verified</Badge>;
  if (new Date(otp.expires_at) < new Date()) return <Badge tone="neutral">Expired</Badge>;
  if (otp.delivery_status === "awaiting_admin") return <Badge tone="warn">To send</Badge>;
  if (otp.sent_via === "email") return <Badge tone="info">Emailed</Badge>;
  if (otp.sent_via === "admin") return <Badge tone="info">Sent by hand</Badge>;
  return <Badge tone="info">Sent</Badge>;
}

const RANGES: { id: VisitRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function VisitorsPanel({ range, onRange, data }: { range: VisitRange; onRange: (r: VisitRange) => void; data: AdminVisits | null }) {
  const max = Math.max(1, ...(data?.series.map((p) => p.visitors) ?? [1]));
  return (
    <Panel
      className="xl:col-span-2"
      icon={Eye}
      title="Website visitors"
      subtitle={data ? `${data.visitors} people · ${data.views} page views` : "Loading…"}
      actions={
        <div className="flex rounded-xl border border-hairline bg-paper p-0.5" role="tablist" aria-label="Visitor range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => onRange(r.id)}
              className={`h-7 cursor-pointer rounded-lg px-2.5 text-[12px] font-medium ${range === r.id ? "bg-ink text-paper" : "text-slate hover:text-ink-800"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-[12px] text-slate">
            <div className="rounded-xl bg-paper-dim p-2"><p className="text-lg font-bold text-ink-800">{data.new_visitors}</p>New</div>
            <div className="rounded-xl bg-paper-dim p-2"><p className="text-lg font-bold text-ink-800">{data.returning_visitors}</p>Returning</div>
            <div className="rounded-xl bg-paper-dim p-2"><p className="text-lg font-bold text-ink-800">{data.views}</p>Page views</div>
          </div>
          <div className="flex h-24 items-end gap-0.5 border-b border-hairline" role="img" aria-label="Visitors over time">
            {data.series.map((p) => (
              <div key={p.at} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-paper opacity-0 group-hover:opacity-100">
                  {new Date(p.at).toLocaleString([], data.bucket === "hour" ? { hour: "numeric" } : { month: "short", day: "numeric" })}: {p.visitors}
                </span>
                <div className="w-full rounded-t-[3px] bg-brass" style={{ height: p.visitors ? `${(p.visitors / max) * 100}%` : "2px", opacity: p.visitors ? 1 : 0.3 }} />
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">Recent visitors</p>
            <ul className="max-h-56 divide-y divide-hairline/60 overflow-y-auto">
              {data.recent.map((v) => (
                <li key={v.visitor_id} className="flex items-center gap-3 py-2 text-[12px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-800">{v.name || `Guest ${v.visitor_id.slice(0, 4).toUpperCase()}`}{v.email ? ` · ${v.email}` : ""}</p>
                    <p className="truncate text-slate">{v.device || "Unknown device"} · {v.views} {v.views === 1 ? "page" : "pages"}</p>
                  </div>
                  <span className="shrink-0 text-slate">{timeAgo(v.last_seen)}</span>
                </li>
              ))}
              {data.recent.length === 0 && <li className="py-6 text-center text-slate">No visitors in this period yet.</li>}
            </ul>
          </div>
          {data.top_pages.length > 0 && (
            <p className="text-[12px] text-slate">
              Top pages: {data.top_pages.slice(0, 4).map((p) => `${p.label} (${p.value})`).join(" · ")}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
