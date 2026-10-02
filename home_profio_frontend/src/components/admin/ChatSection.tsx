"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, CheckCheck, Gauge, Inbox, Keyboard, Lock, MessagesSquare, ShieldAlert, Timer, Users } from "lucide-react";
import type { Channel } from "phoenix";
import type { User } from "@/lib/api";
import { getPhoenixSocket } from "@/lib/realtime";
import { StackedBars } from "./MonitorSections";
import { Panel, StatCard } from "./ui";

// Chat analytics from the "admin:monitor" channel (realtime_chat AdminChannel). The server only
// ever sends counts and timings here: no message text, names, or who talks to whom.
type Stats = {
  total: number;
  last_hour: number;
  last_day: number;
  direct_day: number;
  senders_day: number;
  conversations_day: number;
  unread: number;
  median_read_secs: number | null;
  hourly: { hour: number; direct: number; room: number }[];
};
type Sent = { at: number; store_us: number };

const STATS_EVERY = 30_000;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const span = (s: number | null) =>
  s == null ? "–" : s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;

/** The last 24 hours as 24 hourly buckets (hours without messages included), oldest first. */
function last24h(hourly: Stats["hourly"], now: number) {
  const byHour = new Map(hourly.map((h) => [h.hour * 1000, h]));
  const top = Math.floor(now / 3_600_000) * 3_600_000;
  return Array.from({ length: 24 }, (_, i) => {
    const t = top - (23 - i) * 3_600_000;
    const h = byHour.get(t);
    return { label: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), a: h?.direct ?? 0, b: h?.room ?? 0 };
  });
}

export function ChatSection({ admin, onError }: { admin: User; onError: (msg: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [typing, setTyping] = useState<Record<number, number>>({}); // opaque ref -> expires at
  const [sent, setSent] = useState<Sent[]>([]); // live, last 5 minutes
  const [refused, setRefused] = useState(0);
  const [reads, setReads] = useState(0);
  const [joined, setJoined] = useState(false);
  const [rtt, setRtt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const chanRef = useRef<Channel | null>(null);

  useEffect(() => {
    let alive = true;
    let chan: Channel | undefined;
    getPhoenixSocket(admin.id)
      .then((socket) => {
        if (!alive) return;
        chan = socket.channel("admin:monitor", {});
        chanRef.current = chan;
        chan.on("msg", (m: { store_us: number }) =>
          setSent((prev) => [...prev.filter((x) => Date.now() - x.at < 300_000), { at: Date.now(), store_us: m.store_us }])
        );
        chan.on("typing", (t: { ref: number; on: boolean }) =>
          setTyping((prev) => {
            const next = { ...prev };
            if (t.on) next[t.ref] = Date.now() + 5000;
            else delete next[t.ref];
            return next;
          })
        );
        chan.on("read", () => setReads((n) => n + 1));
        chan.on("refused", () => setRefused((n) => n + 1));
        chan.on("online", (p: { count: number }) => setOnline(p.count));
        chan.onError(() => setJoined(false));
        // Also fires on every automatic rejoin, refreshing the numbers.
        chan
          .join()
          .receive("ok", (reply: { stats: Stats }) => {
            setJoined(true);
            setStats(reply.stats);
          })
          .receive("error", (e: { reason?: string }) => onError(`Chat analytics: ${e?.reason || "could not connect"}`));
      })
      .catch(() => onError("Chat analytics: the chat service is unreachable"));
    return () => {
      alive = false;
      chan?.leave();
      chanRef.current = null;
    };
  }, [admin.id, onError]);

  // Every 2s: clock (rates, typing expiry) and a round-trip probe. Every 30s: fresh totals.
  useEffect(() => {
    let ticks = 0;
    const t = setInterval(() => {
      setNow(Date.now());
      const chan = chanRef.current;
      if (!chan) return;
      const t0 = performance.now();
      chan
        .push("ping", {}, 4000)
        .receive("ok", () => setRtt(performance.now() - t0))
        .receive("timeout", () => setRtt(null));
      if (++ticks % (STATS_EVERY / 2000) === 0) chan.push("stats", {}).receive("ok", setStats);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const typingNow = Object.values(typing).filter((until) => until > now).length;
  const perMinute = sent.filter((x) => now - x.at < 60_000).length;
  const saveMs = median(sent.map((x) => x.store_us / 1000));
  const hours = stats ? last24h(stats.hourly, now) : [];
  const directShare = stats?.last_day ? Math.round((stats.direct_day / stats.last_day) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Online now" value={online ?? "–"} icon={Users} hint="People with the app open" />
        <StatCard label="Typing now" value={joined ? typingNow : "–"} icon={Keyboard} hint="Across all chats" />
        <StatCard label="Messages / min" value={joined ? perMinute : "–"} icon={MessagesSquare} hint="Sent in the last 60 seconds" />
        <StatCard
          label="Round trip"
          value={joined && rtt != null ? `${Math.round(rtt)} ms` : "–"}
          icon={Gauge}
          hint={joined ? "Admin ↔ chat server, every 2s" : "Connecting to the chat service…"}
        />
      </div>

      <Panel icon={BarChart3} title="Messages per hour" subtitle="Last 24 hours, direct and group chats">
        {stats ? (
          <>
            <StackedBars
              rows={hours}
              a={{ name: "Direct", cls: "bg-emerald-500 dark:bg-emerald-600" }}
              b={{ name: "Group", cls: "bg-sky-500 dark:bg-sky-600" }}
              height={140}
            />
            <details className="mt-3 text-[12px] text-slate">
              <summary className="cursor-pointer select-none font-medium hover:text-ink-800">Show as table</summary>
              <table className="mt-2 w-full max-w-sm tabular-nums">
                <thead>
                  <tr className="text-left">
                    <th className="py-1 font-semibold">Hour</th>
                    <th className="py-1 text-right font-semibold">Direct</th>
                    <th className="py-1 text-right font-semibold">Group</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.label} className="border-t border-hairline/50">
                      <td className="py-1">{h.label}</td>
                      <td className="py-1 text-right text-ink-800">{h.a}</td>
                      <td className="py-1 text-right text-ink-800">{h.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p className="py-8 text-center text-[13px] text-slate">Loading…</p>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Messages, 24h"
          value={stats?.last_day ?? "–"}
          icon={MessagesSquare}
          hint={stats ? `${stats.last_hour} in the last hour · ${stats.total} all time` : undefined}
        />
        <StatCard label="Active senders, 24h" value={stats?.senders_day ?? "–"} icon={Users} hint="Members who sent at least one" />
        <StatCard
          label="Active chats, 24h"
          value={stats?.conversations_day ?? "–"}
          icon={MessagesSquare}
          hint={directShare == null ? undefined : `${directShare}% of messages are direct`}
        />
        <StatCard label="Median time to read" value={span(stats?.median_read_secs ?? null)} icon={CheckCheck} hint="Direct messages, last 7 days" />
        <StatCard label="Unread backlog" value={stats?.unread ?? "–"} icon={Inbox} hint="Direct messages not read yet" />
        <StatCard label="Save time" value={saveMs == null ? "–" : `${saveMs.toFixed(1)} ms`} icon={Timer} hint="Median, last 5 minutes" />
        <StatCard label="Read receipts" value={joined ? reads : "–"} icon={CheckCheck} hint="Since you opened this page" />
        <StatCard label="Blocked as spam" value={joined ? refused : "–"} icon={ShieldAlert} hint="Over the 30-burst / 2 per s limit" />
      </div>

      <p className="flex items-center gap-2 text-[12px] text-slate">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Private by design: the chat server sends this page counts and timings only, never message text, names, or who talks to whom.
      </p>
    </div>
  );
}
