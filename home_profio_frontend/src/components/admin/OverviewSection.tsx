"use client";

import { Users, UserCheck, Briefcase, ShieldCheck, TrendingUp, BarChart3, Clock, KeyRound } from "lucide-react";
import { type AdminOtpLog, type AdminStats, type AdminUser, type AdminWork } from "@/lib/api";
import { KINDS, kindOf, type Kind } from "@/lib/items";
import { Avatar, Badge, Panel, StatCard, timeAgo } from "./ui";
import type { AdminSection } from "./AdminShell";

const DAYS = 14;

export function OverviewSection({
  stats,
  users,
  works,
  otps,
  onNavigate,
}: {
  stats: AdminStats | null;
  users: AdminUser[];
  works: AdminWork[];
  otps: AdminOtpLog[];
  onNavigate: (s: AdminSection) => void;
}) {
  const activeUsers = users.filter((u) => u.is_active).length;
  const verifyRate = stats?.total_otps_sent
    ? Math.round((stats.total_otps_verified / stats.total_otps_sent) * 100)
    : 0;
  const publicWorks = works.filter((w) => w.visibility === "public").length;

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

  const byStatus = [{ id: "capture" as Kind, label: "Not shaped" }, ...KINDS].map((k) => ({
    status: k.label,
    count: works.filter((w) => kindOf(w) === k.id).length,
  }));
  const statusMax = Math.max(1, ...byStatus.map((s) => s.count));

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
          label="Works & proofs"
          icon={Briefcase}
          value={stats?.total_works ?? "—"}
          hint={`${publicWorks} public`}
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

        <Panel className="xl:col-span-2" icon={BarChart3} title="Works by type" subtitle={`${works.length} total`}>
          <ul className="space-y-2.5">
            {byStatus.map(({ status, count }) => (
              <li key={status} className="grid grid-cols-[88px_1fr_32px] items-center gap-3 text-[12px]">
                <span className="capitalize text-slate">{status}</span>
                <div className="h-2.5 rounded-full bg-paper-dim">
                  <div
                    className="h-full rounded-full bg-brass"
                    style={{ width: `${(count / statusMax) * 100}%`, minWidth: count ? 6 : 0 }}
                  />
                </div>
                <span className="text-right font-semibold tabular-nums text-ink-800">{count}</span>
              </li>
            ))}
          </ul>
        </Panel>
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
  return <Badge tone="info">Sent</Badge>;
}
