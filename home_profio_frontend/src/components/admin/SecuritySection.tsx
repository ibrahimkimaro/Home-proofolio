"use client";

import { useEffect, useState } from "react";
import { KeyRound, Smartphone, Mail, Send, Copy, Check, Radio, ScrollText, Inbox, Loader2 } from "lucide-react";
import { markOtpSent, simulateAdminOtp, type AdminOtpLog } from "@/lib/api";
import { Badge, EmptyRow, FilterSelect, Panel, SearchInput, td, th } from "./ui";
import { OtpStatusBadge } from "./OverviewSection";

type StatusFilter = "all" | "verified" | "to_send" | "sent" | "expired";

const QUEUE_REFRESH_MS = 20000;

export function SecuritySection({
  otps,
  onChanged,
  onError,
}: {
  otps: AdminOtpLog[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [destination, setDestination] = useState("+255 712 345 678");
  const [channel, setChannel] = useState<"phone" | "email">("phone");
  const [purpose, setPurpose] = useState("admin_test");
  const [sending, setSending] = useState(false);
  const [latest, setLatest] = useState<{ code: string; destination: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [marking, setMarking] = useState<string | null>(null);

  // New sign-ups keep arriving while this is open: keep the delivery queue fresh.
  useEffect(() => {
    const id = setInterval(() => onChanged().catch(() => {}), QUEUE_REFRESH_MS);
    return () => clearInterval(id);
  }, [onChanged]);

  async function markSent(o: AdminOtpLog) {
    setMarking(o.id);
    try {
      await markOtpSent(o.id);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't mark the code as sent");
    } finally {
      setMarking(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim()) return;
    setSending(true);
    try {
      const res = await simulateAdminOtp({ destination: destination.trim(), channel, purpose });
      setLatest({ code: res.code, destination: res.destination });
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to dispatch OTP");
    } finally {
      setSending(false);
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  const now = new Date();
  const q = query.toLowerCase();
  const rows = otps.filter((o) => {
    const expired = !o.is_verified && new Date(o.expires_at) < now;
    const state = o.is_verified ? "verified" : expired ? "expired" : o.delivery_status === "awaiting_admin" ? "to_send" : "sent";
    if (statusFilter !== "all" && state !== statusFilter) return false;
    return [o.destination, o.code, o.purpose, o.channel].some((v) => v.toLowerCase().includes(q));
  });

  // Oldest first: whoever has waited longest gets their code first.
  const queue = otps
    .filter((o) => !o.is_verified && o.delivery_status === "awaiting_admin" && new Date(o.expires_at) > now)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/5 p-4">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-brass-dark" />
        <p className="text-[13px] leading-relaxed text-slate">
          <span className="font-semibold text-ink-800">You deliver activation codes.</span> Members never see their code
          on screen. Text or email each code below, then press Mark sent: their 15 minutes to enter it start then.
        </p>
      </div>

      <Panel
        icon={Inbox}
        title="Codes to send"
        subtitle={queue.length ? `${queue.length} waiting, oldest first` : "Nothing waiting"}
      >
        {queue.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate">
            All caught up. New sign-ups appear here automatically.
          </p>
        ) : (
          <ul className="-mx-5 divide-y divide-hairline/50">
            {queue.map((o) => {
              const body = `Your Home Proofolio activation code is ${o.code}. It expires 15 minutes after this message.`;
              const href =
                o.channel === "phone"
                  ? `sms:${o.destination.replace(/\s/g, "")}?body=${encodeURIComponent(body)}`
                  : `mailto:${o.destination}?subject=${encodeURIComponent("Your Home Proofolio activation code")}&body=${encodeURIComponent(body)}`;
              const mins = Math.max(0, Math.round((now.getTime() - new Date(o.created_at).getTime()) / 60000));
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
                    {o.channel === "phone" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink-800 tabular-nums">{o.destination}</p>
                    <p className="text-[12px] text-slate">
                      {o.channel === "phone" ? "SMS" : "Email"}, waiting {mins < 1 ? "under a minute" : `${mins} min`}
                    </p>
                  </div>
                  <CopyButton code={o.code} copied={copied === o.code} onCopy={copy} mono />
                  <a
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-800 transition-colors hover:border-brass/50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {o.channel === "phone" ? "Open SMS" : "Open email"}
                  </a>
                  <button
                    type="button"
                    onClick={() => markSent(o)}
                    disabled={marking === o.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper transition-opacity disabled:opacity-60"
                  >
                    {marking === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Mark sent
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel icon={KeyRound} title="Send test OTP" subtitle="Dispatch a code to any phone or email">
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label htmlFor="otp-dest" className="text-[12px] font-semibold text-slate">
                Destination
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate/60">
                  {channel === "phone" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </span>
                <input
                  id="otp-dest"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={channel === "phone" ? "+255 712 345 678" : "user@example.com"}
                  className="input w-full pl-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="otp-channel" className="text-[12px] font-semibold text-slate">
                  Channel
                </label>
                <select
                  id="otp-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as "phone" | "email")}
                  className="input mt-1 w-full"
                >
                  <option value="phone">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label htmlFor="otp-purpose" className="text-[12px] font-semibold text-slate">
                  Purpose
                </label>
                <select id="otp-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input mt-1 w-full">
                  <option value="admin_test">Admin test</option>
                  <option value="registration">Registration</option>
                  <option value="login">MFA login</option>
                  <option value="phone_verification">Phone verify</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send OTP"}
            </button>
          </form>

          {latest && (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-[12px] font-semibold text-emerald-600">Code sent to {latest.destination}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-ink-800">{latest.code}</span>
                <CopyButton code={latest.code} copied={copied === latest.code} onCopy={copy} />
              </div>
              <p className="mt-1 text-[12px] text-slate">Valid for 10 minutes</p>
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          icon={ScrollText}
          title="OTP log"
          subtitle={`Latest ${otps.length} dispatches`}
          actions={
            <>
              <FilterSelect
                label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "verified", label: "Verified" },
                  { value: "to_send", label: "To send" },
                  { value: "sent", label: "Sent" },
                  { value: "expired", label: "Expired" },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Search recipient, code" />
            </>
          }
        >
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-hairline/70">
                  <th className={th}>Recipient</th>
                  <th className={th}>Channel</th>
                  <th className={th}>Code</th>
                  <th className={th}>Status</th>
                  <th className={th}>Purpose</th>
                  <th className={`${th} text-right`}>Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {rows.length === 0 ? (
                  <EmptyRow colSpan={6}>No OTP records match.</EmptyRow>
                ) : (
                  rows.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-paper-dim/60">
                      <td className={`${td} font-mono text-ink-800`}>{o.destination}</td>
                      <td className={td}>
                        <Badge tone={o.channel === "phone" ? "info" : "neutral"}>
                          {o.channel === "phone" ? <Smartphone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {o.channel === "phone" ? "SMS" : "Email"}
                        </Badge>
                      </td>
                      <td className={td}>
                        <CopyButton code={o.code} copied={copied === o.code} onCopy={copy} mono />
                      </td>
                      <td className={td}>
                        <OtpStatusBadge otp={o} />
                      </td>
                      <td className={`${td} text-slate`}>{o.purpose.replace(/_/g, " ")}</td>
                      <td className={`${td} whitespace-nowrap text-right text-slate`}>
                        {new Date(o.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CopyButton({
  code,
  copied,
  onCopy,
  mono = false,
}: {
  code: string;
  copied: boolean;
  onCopy: (c: string) => void;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(code)}
      title="Copy code"
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-2 py-1 text-[12px] font-semibold text-ink-800 transition-colors hover:border-brass/50 cursor-pointer"
    >
      {mono && <span className="font-mono">{code}</span>}
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate" />}
      {!mono && (copied ? "Copied" : "Copy")}
    </button>
  );
}
