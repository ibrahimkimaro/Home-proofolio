"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Gauge,
  HardDrive,
  ListFilter,
  LogIn,
  Mail,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Timer,
  Users,
  XCircle,
} from "lucide-react";
import {
  blockIp,
  endAdminSession,
  endUserSessions,
  fetchAdminDevices,
  fetchBroadcastContacts,
  fetchBroadcasts,
  fetchIpBlocks,
  fetchSecurityEvents,
  fetchSecurityOverview,
  fetchSystemHealth,
  previewBroadcast,
  sendBroadcast,
  unblockIp,
  type AdminDevice,
  type BroadcastChannel,
  type BroadcastContact,
  type BroadcastRow,
  type BroadcastSegment,
  type IpBlock,
  type SecurityEventRow,
  type SecurityOverview,
  type SystemHealth,
} from "@/lib/api";
import { Badge, ConfirmButton, EmptyRow, FilterSelect, Panel, SearchInput, StatCard, td, th, timeAgo, type Tone } from "./ui";

type OnError = (msg: string) => void;
const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

const EVENT_LABELS: Record<string, { label: string; tone: Tone }> = {
  login_ok: { label: "Signed in", tone: "good" },
  login_failed: { label: "Wrong password", tone: "warn" },
  login_locked: { label: "Locked out", tone: "bad" },
  login_blocked: { label: "Suspended account tried", tone: "bad" },
  signup: { label: "Signed up", tone: "info" },
  otp_failed: { label: "Wrong activation code", tone: "warn" },
  otp_cancelled: { label: "Code cancelled", tone: "bad" },
  blocked: { label: "Blocked address", tone: "bad" },
};

function bytes(n: number | null | undefined) {
  if (n == null) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function duration(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit" });

/** Two series per hour, stacked: a legend names both, each bar has a tooltip. */
export function StackedBars({
  rows,
  a,
  b,
  height = 120,
}: {
  rows: { label: string; a: number; b: number }[];
  a: { name: string; cls: string };
  b: { name: string; cls: string };
  height?: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.a + r.b));
  const step = Math.ceil(rows.length / 6) || 1;
  if (!rows.length) return <p className="py-8 text-center text-[13px] text-slate">No activity in this period yet.</p>;
  return (
    <figure>
      <div className="mb-3 flex gap-4 text-[12px] text-slate">
        {[a, b].map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.cls}`} /> {s.name}
          </span>
        ))}
      </div>
      <div
        className="flex items-end gap-[3px] border-b border-hairline pb-px"
        style={{ height }}
        role="img"
        aria-label={rows.map((r) => `${r.label}: ${r.a} ${a.name}, ${r.b} ${b.name}`).join("; ")}
      >
        {rows.map((r, i) => (
          <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <span
              className={`pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                i < 3 ? "left-0" : i >= rows.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
              }`}
            >
              {r.label}: {r.a} {a.name.toLowerCase()}, {r.b} {b.name.toLowerCase()}
            </span>
            {r.b > 0 && <div className={`w-full rounded-t-[3px] ${b.cls}`} style={{ height: `${(r.b / max) * 100}%` }} />}
            <div
              className={`w-full ${r.b ? "" : "rounded-t-[3px]"} ${a.cls}`}
              style={{ height: r.a ? `${(r.a / max) * 100}%` : 2, opacity: r.a ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate">
        {rows.map((r, i) => (i % step === 0 || i === rows.length - 1 ? <span key={i}>{r.label}</span> : null)).filter(Boolean).slice(0, 7)}
      </div>
    </figure>
  );
}

function usePoll(fn: () => Promise<void>, ms: number) {
  useEffect(() => {
    fn();
    const id = setInterval(() => document.visibilityState === "visible" && fn(), ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}

// ======================= Threats =======================

const WINDOWS = [
  { value: "24", label: "Last 24 hours" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
];

export function ThreatsSection({ onError }: { onError: OnError }) {
  const [hours, setHours] = useState("24");
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [blocks, setBlocks] = useState<IpBlock[]>([]);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [kind, setKind] = useState("all");
  const [ipFilter, setIpFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [newIp, setNewIp] = useState("");
  const [reason, setReason] = useState("");
  const [blockFor, setBlockFor] = useState("24");

  const load = useCallback(async () => {
    try {
      const [o, b] = await Promise.all([fetchSecurityOverview(Number(hours)), fetchIpBlocks()]);
      setData(o);
      setBlocks(b);
    } catch (e) {
      onError(msg(e, "Couldn't load security data"));
    }
  }, [hours, onError]);
  usePoll(load, 20000);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await fetchSecurityEvents({ kind: kind === "all" ? undefined : kind, ip: ipFilter.trim(), email: emailFilter.trim() }));
    } catch (e) {
      onError(msg(e, "Couldn't load the event log"));
    }
  }, [kind, ipFilter, emailFilter, onError]);
  useEffect(() => {
    const t = setTimeout(loadEvents, 300);
    return () => clearTimeout(t);
  }, [loadEvents]);

  async function block(ip: string, why: string, h: number | null) {
    try {
      await blockIp(ip, why, h);
      setNewIp("");
      setReason("");
      await load();
    } catch (e) {
      onError(msg(e, "Couldn't block that address"));
    }
  }

  async function unblock(ip: string) {
    try {
      await unblockIp(ip);
      await load();
    } catch (e) {
      onError(msg(e, "Couldn't unblock that address"));
    }
  }

  const c = data?.counts ?? {};
  const timeline = (data?.timeline ?? []).map((t) => ({ label: hourLabel(t.hour), a: t.ok, b: t.failed }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate">
          Every sign-in attempt, lockout and wrong activation code is recorded here. Patterns that look like an attack
          raise an alert, and you can block the address behind it.
        </p>
        <FilterSelect label="Time window" value={hours} onChange={setHours} options={WINDOWS} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Sign-ins" value={c.login_ok ?? 0} icon={LogIn} />
        <StatCard label="Failed sign-ins" value={c.login_failed ?? 0} icon={XCircle} />
        <StatCard label="Lockouts" value={c.login_locked ?? 0} icon={Clock} />
        <StatCard label="Blocked requests" value={c.blocked ?? 0} icon={Ban} />
        <StatCard label="Signed-in devices" value={data?.active_sessions ?? 0} icon={MonitorSmartphone} />
      </div>

      <Panel
        icon={ShieldAlert}
        title="Alerts"
        subtitle={data ? (data.alerts.length ? `${data.alerts.length} need a look` : "Nothing suspicious") : "Checking…"}
      >
        {!data ? (
          <p className="py-6 text-center text-[13px] text-slate">Loading…</p>
        ) : data.alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-[14px] text-slate">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            No attack patterns right now. Alerts appear for repeated wrong passwords from one address, one address trying many
            accounts, one account attacked from many places, and activation-code guessing.
          </div>
        ) : (
          <ul className="-mx-5 divide-y divide-hairline/50">
            {data.alerts.map((a, i) => (
              <li key={i} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    a.severity === "high" ? "bg-berry/12 text-berry" : "bg-amber-500/12 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink-800">
                    {a.title}
                    <Badge tone={a.severity === "high" ? "bad" : "warn"}>{a.severity === "high" ? "High" : "Medium"}</Badge>
                    {a.blocked && <Badge tone="neutral">Blocked</Badge>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate">{a.detail}</p>
                  <p className="mt-0.5 text-[12px] text-slate/80">Last seen {timeAgo(a.last_seen)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIpFilter(a.ip ?? "");
                      setEmailFilter(a.email ?? "");
                      setKind("all");
                      document.getElementById("security-events")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-[12px] font-medium text-ink-700 hover:border-brass/50"
                  >
                    <ListFilter className="h-3.5 w-3.5" /> Events
                  </button>
                  {a.ip && !a.blocked && (
                    <ConfirmButton danger confirmLabel="Block 24h?" onConfirm={() => block(a.ip!, a.title, 24)}>
                      <Ban className="h-3.5 w-3.5" /> Block
                    </ConfirmButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel icon={Activity} title="Sign-ins, last 24 hours" subtitle="Successful compared with failed or locked out">
          <StackedBars
            rows={timeline}
            a={{ name: "Successful", cls: "bg-emerald-500" }}
            b={{ name: "Failed", cls: "bg-berry" }}
          />
        </Panel>

        <Panel icon={XCircle} title="Most failed sign-ins by address" subtitle="In the selected window">
          {data?.top_ips.length ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hairline/70">
                  <th className={th}>Address</th>
                  <th className={th}>Failed</th>
                  <th className={th}>Last</th>
                  <th className={`${th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {data.top_ips.map((t) => (
                  <tr key={t.ip}>
                    <td className={`${td} font-mono text-ink-800`}>{t.ip}</td>
                    <td className={`${td} tabular-nums`}>{t.failed}</td>
                    <td className={`${td} text-slate`}>{timeAgo(t.last_seen)}</td>
                    <td className={`${td} text-right`}>
                      {t.blocked ? (
                        <Badge tone="neutral">Blocked</Badge>
                      ) : (
                        <ConfirmButton danger confirmLabel="Block 24h?" onConfirm={() => block(t.ip, "Many failed sign-ins", 24)}>
                          <Ban className="h-3.5 w-3.5" /> Block
                        </ConfirmButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-8 text-center text-[13px] text-slate">No failed sign-ins in this window.</p>
          )}
        </Panel>
      </div>

      <Panel icon={Ban} title="Blocked addresses" subtitle="Requests from these addresses are refused everywhere">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newIp.trim()) block(newIp.trim(), reason.trim(), blockFor === "0" ? null : Number(blockFor));
          }}
          className="mb-5 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto_auto]"
        >
          <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="IP address, e.g. 41.59.10.20" aria-label="IP address" className="input !h-9 text-[13px]" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (for your team)" aria-label="Reason" className="input !h-9 text-[13px]" />
          <FilterSelect
            label="Block for"
            value={blockFor}
            onChange={setBlockFor}
            options={[
              { value: "1", label: "1 hour" },
              { value: "24", label: "24 hours" },
              { value: "168", label: "7 days" },
              { value: "0", label: "Until removed" },
            ]}
          />
          <button type="submit" disabled={!newIp.trim()} className="h-9 cursor-pointer rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper disabled:opacity-40">
            Block address
          </button>
        </form>
        {blocks.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-slate">No addresses are blocked.</p>
        ) : (
          <ul className="-mx-5 divide-y divide-hairline/50">
            {blocks.map((b) => (
              <li key={b.ip} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-[13px]">
                <span className="font-mono font-semibold text-ink-800">{b.ip}</span>
                {b.active ? <Badge tone="bad">Active</Badge> : <Badge tone="neutral">Expired</Badge>}
                <span className="min-w-0 flex-1 truncate text-slate">{b.reason || "No reason given"}</span>
                <span className="text-[12px] text-slate">
                  {b.expires_at ? `Until ${new Date(b.expires_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Until removed"}
                </span>
                <ConfirmButton confirmLabel="Unblock?" onConfirm={() => unblock(b.ip)}>
                  Unblock
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div id="security-events">
        <Panel
          icon={ListFilter}
          title="Event log"
          subtitle={`Latest ${events.length} events`}
          actions={
            <>
              <FilterSelect
                label="Event type"
                value={kind}
                onChange={setKind}
                options={[{ value: "all", label: "All events" }, ...Object.entries(EVENT_LABELS).map(([value, { label }]) => ({ value, label }))]}
              />
              <SearchInput value={ipFilter} onChange={setIpFilter} placeholder="IP address" />
              <SearchInput value={emailFilter} onChange={setEmailFilter} placeholder="Email" />
            </>
          }
        >
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead>
                <tr className="border-b border-hairline/70">
                  <th className={th}>When</th>
                  <th className={th}>Event</th>
                  <th className={th}>Account</th>
                  <th className={th}>Address</th>
                  <th className={th}>Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {events.length === 0 ? (
                  <EmptyRow colSpan={5}>No events match.</EmptyRow>
                ) : (
                  events.map((e) => {
                    const l = EVENT_LABELS[e.kind] ?? { label: e.kind, tone: "neutral" as Tone };
                    return (
                      <tr key={e.id} className="hover:bg-paper-dim/60">
                        <td className={`${td} whitespace-nowrap text-slate`} title={new Date(e.created_at).toLocaleString()}>
                          {timeAgo(e.created_at)}
                        </td>
                        <td className={td}>
                          <Badge tone={l.tone}>{l.label}</Badge>
                        </td>
                        <td className={`${td} text-ink-800`}>{e.email ?? "–"}</td>
                        <td className={td}>
                          {e.ip ? (
                            <button type="button" onClick={() => setIpFilter(e.ip!)} className="cursor-pointer font-mono text-ink-700 hover:underline">
                              {e.ip}
                            </button>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className={`${td} text-slate`}>{e.device}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ======================= Devices =======================

export function DevicesSection({ onError }: { onError: OnError }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminDevice[] | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const recent = (iso: string) => loadedAt - new Date(iso).getTime() < 15 * 60_000;

  const load = useCallback(async () => {
    try {
      setRows(await fetchAdminDevices(q.trim()));
      setLoadedAt(Date.now());
    } catch (e) {
      onError(msg(e, "Couldn't load devices"));
    }
  }, [q, onError]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const people = useMemo(() => new Set((rows ?? []).map((r) => r.user_id)).size, [rows]);
  const online = (rows ?? []).filter((r) => recent(r.last_seen_at)).length;

  async function run(fn: () => Promise<void>, fail: string) {
    try {
      await fn();
      await load();
    } catch (e) {
      onError(msg(e, fail));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Signed-in devices" value={rows?.length ?? "–"} icon={MonitorSmartphone} />
        <StatCard label="People" value={rows ? people : "–"} icon={Users} />
        <StatCard label="Active in 15 min" value={rows ? online : "–"} icon={Activity} />
      </div>

      <Panel
        icon={MonitorSmartphone}
        title="Devices & sessions"
        subtitle="Every browser or phone currently signed in, most recently used first"
        actions={<SearchInput value={q} onChange={setQ} placeholder="Name, email or IP" />}
      >
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline/70">
                <th className={th}>Member</th>
                <th className={th}>Device</th>
                <th className={th}>Address</th>
                <th className={th}>Signed in</th>
                <th className={th}>Last active</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/50">
              {rows === null ? (
                <EmptyRow colSpan={6}>Loading…</EmptyRow>
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={6}>No signed-in devices match.</EmptyRow>
              ) : (
                rows.map((r) => {
                  const fresh = recent(r.last_seen_at);
                  return (
                    <tr key={r.id} className="hover:bg-paper-dim/60">
                      <td className={td}>
                        <p className="font-semibold text-ink-800">
                          {r.name} {r.is_admin && <Badge tone="accent">Admin</Badge>}
                        </p>
                        <p className="text-[12px] text-slate">@{r.username}</p>
                      </td>
                      <td className={td} title={r.user_agent ?? ""}>
                        <span className="inline-flex items-center gap-1.5 text-ink-700">
                          {/Android|iPhone/.test(r.device) ? <Smartphone className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
                          {r.device}
                        </span>
                      </td>
                      <td className={`${td} font-mono text-slate`}>{r.ip ?? "–"}</td>
                      <td className={`${td} whitespace-nowrap text-slate`}>{timeAgo(r.created_at)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${fresh ? "bg-emerald-500" : "bg-hairline"}`} aria-hidden="true" />
                          {fresh ? "Active now" : timeAgo(r.last_seen_at)}
                        </span>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-2">
                          <ConfirmButton confirmLabel="Sign out?" onConfirm={() => run(() => endAdminSession(r.id), "Couldn't sign out that device")}>
                            Sign out
                          </ConfirmButton>
                          {!r.is_admin && (
                            <ConfirmButton danger confirmLabel="All devices?" onConfirm={() => run(() => endUserSessions(r.user_id), "Couldn't sign them out")}>
                              Everywhere
                            </ConfirmButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[12px] text-slate">
          To stop someone signing back in, suspend their account in Users: that also signs them out everywhere.
        </p>
      </Panel>
    </div>
  );
}

// ======================= System health =======================

const STATUS = {
  ok: { label: "All systems normal", cls: "border-emerald-500/30 bg-emerald-500/10", icon: CheckCircle2, iconCls: "text-emerald-500" },
  degraded: { label: "Running with problems", cls: "border-amber-500/30 bg-amber-500/10", icon: AlertTriangle, iconCls: "text-amber-600" },
  down: { label: "Service down", cls: "border-berry/30 bg-berry/10", icon: XCircle, iconCls: "text-berry" },
} as const;

export function HealthSection({ onError }: { onError: OnError }) {
  const [h, setH] = useState<SystemHealth | null>(null);
  const load = useCallback(async () => {
    try {
      setH(await fetchSystemHealth());
    } catch (e) {
      onError(msg(e, "Couldn't reach the server"));
    }
  }, [onError]);
  usePoll(load, 10000);

  if (!h) return <p className="py-12 text-center text-[13px] text-slate">Checking the system…</p>;

  const s = STATUS[h.status];
  const t = h.traffic;
  const errRate = t.requests ? (t.errors_5xx / t.requests) * 100 : 0;
  const diskUsed = 1 - h.storage.disk_free_bytes / h.storage.disk_total_bytes;
  const perMinute = h.per_minute.map((m) => ({
    label: new Date(m.minute * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    a: m.requests - m.errors,
    b: m.errors,
  }));
  const hourly = (h.activity.hourly ?? []).map((r) => ({ label: hourLabel(r.hour), a: r.logins, b: r.signups }));

  return (
    <div className="space-y-6">
      <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 ${s.cls}`}>
        <s.icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconCls}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-800">{s.label}</p>
          {h.issues.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-[13px] text-ink-700">
              {h.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-slate">API, database and storage are responding normally. Checked {timeAgo(h.checked_at)}.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <StatCard label="Uptime" value={duration(h.api.uptime_s)} hint="Since last restart" icon={Timer} />
        <StatCard label="Database" value={h.database.ok ? `${h.database.ping_ms} ms` : "Down"} hint="Time to answer" icon={Database} />
        <StatCard label="Requests" value={`${t.per_minute}/min`} hint="Last 15 minutes" icon={Activity} />
        <StatCard label="Server errors" value={`${errRate.toFixed(1)}%`} hint={`${t.errors_5xx} in 15 min`} icon={AlertTriangle} />
        <StatCard label="Response time" value={`${t.p95_ms} ms`} hint="95% of requests faster" icon={Gauge} />
        <StatCard label="Online now" value={h.activity.online_15m ?? "–"} hint="Active in 15 min" icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel icon={Activity} title="Traffic, last 30 minutes" subtitle="Requests per minute; server errors in red">
          <StackedBars rows={perMinute} a={{ name: "Requests", cls: "bg-brass" }} b={{ name: "Server errors", cls: "bg-berry" }} />
        </Panel>
        <Panel icon={LogIn} title="Sign-ins and sign-ups, last 24 hours">
          <StackedBars rows={hourly} a={{ name: "Sign-ins", cls: "bg-emerald-500" }} b={{ name: "Sign-ups", cls: "bg-sky-500" }} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            {[
              ["Members", h.activity.users],
              ["Works", h.activity.works],
              ["Sign-ins (24h)", h.activity.logins_24h],
              ["Sign-ups (24h)", h.activity.signups_24h],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-slate">{k}</dt>
                <dd className="text-[18px] font-bold tabular-nums text-ink-800">{v ?? "–"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel icon={HardDrive} title="Storage">
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-slate">Database size</dt>
              <dd className="font-semibold tabular-nums">{bytes(h.database.size_bytes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Uploaded files</dt>
              <dd className="font-semibold tabular-nums">{bytes(h.storage.uploads_bytes)}</dd>
            </div>
            <div>
              <div className="flex justify-between">
                <dt className="text-slate">Disk</dt>
                <dd className="font-semibold tabular-nums">{bytes(h.storage.disk_free_bytes)} free of {bytes(h.storage.disk_total_bytes)}</dd>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-dim" role="img" aria-label={`Disk ${Math.round(diskUsed * 100)}% used`}>
                <div className={`h-full rounded-full ${diskUsed > 0.9 ? "bg-berry" : "bg-brass"}`} style={{ width: `${diskUsed * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Database connections</dt>
              <dd className="font-semibold tabular-nums">{h.database.connections ?? "–"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Versions</dt>
              <dd className="text-right text-slate">PostgreSQL {h.database.version.split(" ")[0]}, Python {h.api.python}</dd>
            </div>
          </dl>
        </Panel>

        <Panel icon={Gauge} title="Slowest routes" subtitle="Average time, last 15 minutes" className="xl:col-span-2">
          {t.slowest.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate">No requests yet since the last restart.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hairline/70">
                  <th className={th}>Route</th>
                  <th className={`${th} text-right`}>Average</th>
                  <th className={`${th} text-right`}>Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {t.slowest.map((r) => (
                  <tr key={r.route}>
                    <td className={`${td} font-mono text-ink-800`}>{r.route}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.avg_ms} ms</td>
                    <td className={`${td} text-right tabular-nums text-slate`}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel icon={AlertTriangle} title="Recent server errors" subtitle="Requests that failed on our side">
        {h.recent_errors.length === 0 ? (
          <div className="flex items-center gap-3 py-3 text-[14px] text-slate">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> No server errors since the last restart.
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-hairline/70">
                  <th className={th}>When</th>
                  <th className={th}>Request</th>
                  <th className={th}>Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {h.recent_errors.map((e, i) => (
                  <tr key={i}>
                    <td className={`${td} whitespace-nowrap text-slate`}>{timeAgo(new Date(e.at * 1000).toISOString())}</td>
                    <td className={`${td} font-mono text-ink-800`}>
                      {e.method} {e.route} <Badge tone="bad">{e.status}</Badge>
                    </td>
                    <td className={`${td} font-mono text-[12px] text-berry`}>{e.error ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ======================= Messages =======================

const CHANNELS: { id: BroadcastChannel; label: string; icon: typeof Megaphone; hint: string }[] = [
  { id: "in_app", label: "In-app", icon: Megaphone, hint: "Appears in their notification bell right away." },
  { id: "sms", label: "SMS", icon: MessageSquare, hint: "Only members with a phone number. You send it from the list below." },
  { id: "email", label: "Email", icon: Mail, hint: "Every member's email address. You send it from the list below." },
];
const SEGMENTS: { value: BroadcastSegment; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "active", label: "Activated accounts" },
  { value: "unactivated", label: "Not yet activated" },
];
const SEGMENT_LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.value, s.label]));

function downloadCsv(contacts: BroadcastContact[], channel: BroadcastChannel) {
  const q = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["name,username,phone,email", ...contacts.map((c) => [c.name, c.username, c.phone, c.email].map(q).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `proofolio-${channel}-recipients.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function MessagesSection({ onError }: { onError: OnError }) {
  const [channel, setChannel] = useState<BroadcastChannel>("in_app");
  const [segment, setSegment] = useState<BroadcastSegment>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [result, setResult] = useState<{ channel: BroadcastChannel; recipients: number; contacts: BroadcastContact[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchBroadcasts());
    } catch (e) {
      onError(msg(e, "Couldn't load message history"));
    }
  }, [onError]);
  usePoll(loadHistory, 60000);

  useEffect(() => {
    let live = true;
    previewBroadcast(channel, segment)
      .then((r) => live && setCount(r.count))
      .catch(() => live && setCount(null));
    return () => {
      live = false;
    };
  }, [channel, segment]);

  const needsTitle = channel !== "sms";
  const ready = body.trim() && (!needsTitle || subject.trim()) && !!count;
  const smsParts = Math.ceil(body.length / 160) || 1;

  async function send() {
    try {
      const r = await sendBroadcast({ channel, segment, subject, body });
      setResult({ channel, recipients: r.recipients, contacts: r.contacts });
      setSubject("");
      setBody("");
      await loadHistory();
    } catch (e) {
      onError(msg(e, "Couldn't send the message"));
    }
  }

  async function exportAgain(b: BroadcastRow) {
    try {
      downloadCsv(await fetchBroadcastContacts(b.segment, b.channel), b.channel);
    } catch (e) {
      onError(msg(e, "Couldn't export the list"));
    }
  }

  return (
    <div className="space-y-6">
      <Panel icon={Send} title="New message" subtitle="Write once, reach a whole group of members">
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Send by" className="grid grid-cols-3 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={channel === c.id}
                  onClick={() => setChannel(c.id)}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                    channel === c.id ? "border-ink bg-ink text-paper" : "border-hairline text-ink-700 hover:border-brass/50"
                  }`}
                >
                  <c.icon className="h-4 w-4" /> {c.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-slate">{CHANNELS.find((c) => c.id === channel)!.hint}</p>

            {needsTitle && (
              <label className="block text-[13px] font-medium text-ink-700">
                Title
                <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} className="input mt-1 w-full" placeholder="e.g. New: share cards are here" />
              </label>
            )}
            <label className="block text-[13px] font-medium text-ink-700">
              Message
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={5}
                className="input mt-1 w-full resize-y py-2"
                placeholder="Keep it short and say what you want people to do."
              />
              <span className="mt-1 block text-right text-[12px] tabular-nums text-slate">
                {body.length} characters{channel === "sms" ? `, ${smsParts} SMS each` : ""}
              </span>
            </label>
          </div>

          <aside className="flex flex-col gap-4 rounded-2xl bg-paper-dim p-4">
            <label className="block text-[13px] font-medium text-ink-700">
              Send to
              <select value={segment} onChange={(e) => setSegment(e.target.value as BroadcastSegment)} className="input mt-1 w-full">
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-[12px] text-slate">Recipients</p>
              <p className="text-[28px] font-bold tabular-nums text-ink-800">{count ?? "–"}</p>
            </div>
            <div className="mt-auto">
              <ConfirmButton disabled={!ready} confirmLabel={`Send to ${count ?? 0}?`} onConfirm={send}>
                <Send className="h-3.5 w-3.5" /> {channel === "in_app" ? "Send now" : "Prepare list"}
              </ConfirmButton>
            </div>
          </aside>
        </div>

        {result && (
          <div className="mt-5 rounded-2xl border border-brass/40 bg-brass/5 p-4">
            {result.channel === "in_app" ? (
              <p className="flex items-center gap-2 text-[14px] text-ink-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sent to {result.recipients} {result.recipients === 1 ? "member's" : "members'"} notification bell.
              </p>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-ink-800">
                  Send this {result.channel === "sms" ? "SMS" : "email"} to {result.recipients}{" "}
                  {result.recipients === 1 ? "person" : "people"} yourself
                </p>
                <p className="mt-1 text-[13px] text-slate">
                  No {result.channel === "sms" ? "SMS" : "email"} service is connected yet. Copy the list into your phone or mail tool,
                  or download it as a spreadsheet.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(result.contacts.map((c) => c.to).filter(Boolean).join(result.channel === "sms" ? ", " : "; ")).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[12px] font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : result.channel === "sms" ? "Copy numbers" : "Copy emails"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCsv(result.contacts, result.channel)}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[12px] font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Panel>

      <Panel icon={Megaphone} title="Sent messages" subtitle="Newest first">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline/70">
                <th className={th}>When</th>
                <th className={th}>Message</th>
                <th className={th}>Group</th>
                <th className={th}>Delivery</th>
                <th className={`${th} text-right`}>People</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/50">
              {history.length === 0 ? (
                <EmptyRow colSpan={5}>No messages sent yet.</EmptyRow>
              ) : (
                history.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className={`${td} whitespace-nowrap text-slate`}>{timeAgo(b.created_at)}</td>
                    <td className={td}>
                      <p className="font-semibold text-ink-800">{b.subject || (b.channel === "sms" ? "SMS" : "Message")}</p>
                      <p className="line-clamp-2 max-w-md text-slate">{b.body}</p>
                      {b.sent_by && <p className="text-[12px] text-slate/80">by {b.sent_by}</p>}
                    </td>
                    <td className={`${td} text-slate`}>{SEGMENT_LABEL[b.segment]}</td>
                    <td className={td}>
                      {b.delivery === "manual" ? (
                        <span className="flex flex-col items-start gap-1">
                          <Badge tone="warn">{b.channel === "sms" ? "SMS" : "Email"}, sent by hand</Badge>
                          <button type="button" onClick={() => exportAgain(b)} className="cursor-pointer text-[12px] text-brass-dark hover:underline">
                            Export list again
                          </button>
                        </span>
                      ) : (
                        <Badge tone="good">In-app, delivered</Badge>
                      )}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{b.recipients}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

