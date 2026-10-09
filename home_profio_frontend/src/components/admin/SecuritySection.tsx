"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, KeyRound, Smartphone, Mail, MailCheck, Search, Send, Copy, Check, Radio, RefreshCw, ScrollText, Inbox, Loader2 } from "lucide-react";
import { clearAdminOtps, deleteAdminOtp, markOtpSent, resendOtpEmail, searchOtpRecipients, sendAdminOtp, type AdminOtpLog, type OtpGenerateResponse, type OtpRecipient } from "@/lib/api";
import { Badge, ConfirmButton, EmptyRow, FilterSelect, Panel, SearchInput, td, th } from "./ui";
import { OtpStatusBadge } from "./OverviewSection";

type StatusFilter = "all" | "verified" | "to_send" | "sent" | "expired";

const QUEUE_REFRESH_MS = 20000;

/** Domains people type by mistake for the big mail providers. A hit means the email probably never arrived. */
const TYPO_DOMAINS = new Set([
  "gmial.com", "gmai.com", "gmal.com", "gamil.com", "gmail.co", "gmail.con", "gmil.com", "gnail.com", "gmail.cm", "gmaill.com",
  "hotmial.com", "hotmai.com", "hotmail.con", "hotmal.com", "yahooo.com", "yaho.com", "yahoo.con", "outlok.com", "outllook.com", "outlook.con",
]);
const looksMistyped = (email: string) => TYPO_DOMAINS.has(email.split("@")[1]?.toLowerCase() ?? "");

export function SecuritySection({
  otps,
  onChanged,
  onError,
}: {
  otps: AdminOtpLog[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [marking, setMarking] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);

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

  async function emailAgain(o: AdminOtpLog) {
    setResending(o.id);
    try {
      await resendOtpEmail(o.id);
      setResent(o.id);
      setTimeout(() => setResent((r) => (r === o.id ? null : r)), 4000);
      // The email goes out in the background: look again in a moment.
      setTimeout(() => onChanged().catch(() => {}), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't email the code again");
    } finally {
      setResending(null);
    }
  }

  async function removeOne(o: AdminOtpLog) {
    try {
      await deleteAdminOtp(o.id);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't delete the code");
    }
  }

  async function clearList(scope: "finished" | "all") {
    try {
      await clearAdminOtps(scope);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't clear the list");
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

  // Emailed by the system and still waiting to be used: here so you can step in when someone says
  // "I never got it" (a mistyped address, a spam folder). Newest first.
  const emailed = otps
    .filter((o) => !o.is_verified && o.sent_via === "email" && o.delivery_status === "sent" && new Date(o.expires_at) > now)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/5 p-4">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-brass-dark" />
        <p className="text-[13px] leading-relaxed text-slate">
          <span className="font-semibold text-ink-800">Codes for email addresses go out by themselves.</span> Members never see
          their code on screen. Anything the system couldn&apos;t email, and every SMS code, waits below for you: send it, then press
          Mark sent (their 15 minutes start then). If someone says they never got their email, find them under Recently emailed.
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
                      {o.channel === "phone" ? "SMS" : "Email (the automatic email didn't go out)"}, waiting {mins < 1 ? "under a minute" : `${mins} min`}
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

      <Panel
        icon={MailCheck}
        title="Recently emailed"
        subtitle={emailed.length ? `${emailed.length} still waiting to be used` : "Nothing waiting"}
      >
        {emailed.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate">No emailed codes are waiting to be used.</p>
        ) : (
          <ul className="-mx-5 divide-y divide-hairline/50">
            {emailed.map((o) => {
              const body = `Your Home Proofolio activation code is ${o.code}. It expires 15 minutes after this message.`;
              const href = `mailto:${o.destination}?subject=${encodeURIComponent("Your Home Proofolio activation code")}&body=${encodeURIComponent(body)}`;
              const mistyped = looksMistyped(o.destination);
              const left = Math.max(0, Math.round((new Date(o.expires_at).getTime() - now.getTime()) / 60000));
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink-800">{o.destination}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-slate">
                      Emailed automatically, {left} min left
                      {mistyped && (
                        <Badge tone="warn">
                          <AlertTriangle className="h-3 w-3" /> Check the address: looks mistyped
                        </Badge>
                      )}
                    </p>
                  </div>
                  <CopyButton code={o.code} copied={copied === o.code} onCopy={copy} mono />
                  <button
                    type="button"
                    onClick={() => emailAgain(o)}
                    disabled={resending === o.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-800 transition-colors hover:border-brass/50 disabled:opacity-60"
                  >
                    {resending === o.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : resent === o.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {resent === o.id ? "Emailed again" : "Email again"}
                  </button>
                  <a
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-800 transition-colors hover:border-brass/50"
                  >
                    <Send className="h-3.5 w-3.5" /> Send by hand
                  </a>
                  <button
                    type="button"
                    onClick={() => markSent(o)}
                    disabled={marking === o.id}
                    title="Use this after you gave them the code yourself (another address, WhatsApp, a call). Their 15 minutes start again."
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper transition-opacity disabled:opacity-60"
                  >
                    {marking === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    I sent it
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SendCodePanel copied={copied} onCopy={copy} onChanged={onChanged} onError={onError} />

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
              <ConfirmButton onConfirm={() => clearList("finished")} confirmLabel="Clear used and expired?" title="Remove used and expired codes from this list">
                <Trash2 className="h-3.5 w-3.5" /> Clear finished
              </ConfirmButton>
              <ConfirmButton onConfirm={() => clearList("all")} danger confirmLabel="Delete ALL codes?" title="Remove every code, including ones members are still waiting to use">
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </ConfirmButton>
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
                  <th className={th}><span className="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/50">
                {rows.length === 0 ? (
                  <EmptyRow colSpan={7}>No OTP records match.</EmptyRow>
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
                      <td className={td}>
                        <ConfirmButton onConfirm={() => removeOne(o)} danger confirmLabel="Delete?" title="Delete this code from the list">
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
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

const PURPOSES = [
  { value: "activation", label: "Account verification" },
  { value: "login", label: "2FA sign-in" },
  { value: "registration", label: "Registration" },
  { value: "password_change", label: "Password change" },
  { value: "phone_verification", label: "Phone verification" },
  { value: "admin_test", label: "Test" },
];

/**
 * Send someone a verification code. Pick a member (an email shows with their name, a phone shows the
 * number) or type any address. Email goes out at once; a phone number can't be texted from here, so that
 * code waits in "Codes to send" for you. A member is also told in the app (never with the code in it).
 */
function SendCodePanel({
  copied,
  onCopy,
  onChanged,
  onError,
}: {
  copied: string | null;
  onCopy: (code: string) => void;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [purpose, setPurpose] = useState("activation");
  const [destination, setDestination] = useState("");
  const [picked, setPicked] = useState<OtpRecipient | null>(null);
  const [options, setOptions] = useState<OtpRecipient[]>([]);
  const [showList, setShowList] = useState(false);
  const [sending, setSending] = useState(false);
  const [latest, setLatest] = useState<OtpGenerateResponse | null>(null);

  // Suggestions follow what's typed (a short pause first, so it isn't one request per key).
  useEffect(() => {
    if (!showList) return;
    let live = true;
    const t = setTimeout(() => {
      searchOtpRecipients(picked ? "" : destination)
        .then((r) => live && setOptions(r))
        .catch(() => live && setOptions([]));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [destination, showList, picked]);

  function changeChannel(next: "email" | "phone") {
    setChannel(next);
    setDestination("");
    setPicked(null);
    setLatest(null);
  }

  function choose(u: OtpRecipient) {
    const value = channel === "email" ? u.email : u.phone;
    if (!value) return;
    setPicked(u);
    setDestination(value);
    setShowList(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim()) return;
    setSending(true);
    try {
      setLatest(await sendAdminOtp({ destination: destination.trim(), channel, purpose }));
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't send the code");
    } finally {
      setSending(false);
    }
  }

  const emailed = latest?.delivery === "emailed";
  return (
    <Panel icon={KeyRound} title="Send a code" subtitle="Verification, 2FA sign-in, registration, password change">
      <form onSubmit={handleSend} className="space-y-4">
        <div role="radiogroup" aria-label="Send by" className="grid grid-cols-2 gap-2">
          {(["email", "phone"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => changeChannel(c)}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                channel === c ? "border-ink bg-ink text-paper" : "border-hairline text-ink-700 hover:border-brass/50"
              }`}
            >
              {c === "email" ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {c === "email" ? "Email" : "SMS (by you)"}
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="otp-dest" className="text-[12px] font-semibold text-slate">
            {channel === "email" ? "Member or email address" : "Member or phone number"}
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate/60">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="otp-dest"
              required
              autoComplete="off"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setPicked(null);
                setShowList(true);
              }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder={channel === "email" ? "Search a name, or type an email" : "Search a name, or type a number"}
              className="input w-full pl-9"
            />
          </div>
          {showList && options.length > 0 && (
            <ul role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-hairline bg-paper shadow-lg">
              {options.map((u) => {
                const value = channel === "email" ? u.email : u.phone;
                return (
                  <li key={u.id} role="option" aria-selected={picked?.id === u.id} aria-disabled={!value}>
                    <button
                      type="button"
                      disabled={!value}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(u)}
                      className="flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left transition-colors hover:bg-paper-dim disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-[13px] font-semibold text-ink-800">{u.name}</span>
                      <span className="text-[12px] text-slate">
                        {value ?? "No phone number on file"}
                        {channel === "email" ? "" : ` · ${u.email}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-1.5 text-[12px] text-slate">
            {picked ? (
              <>
                <span className="font-semibold text-ink-800">{picked.name}</span> will also be told in the app (without the code).
              </>
            ) : (
              "If this belongs to a member, they are told in the app too (without the code)."
            )}
          </p>
        </div>

        <div>
          <label htmlFor="otp-purpose" className="text-[12px] font-semibold text-slate">
            What is it for?
          </label>
          <select id="otp-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input mt-1 w-full">
            {PURPOSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={sending || !destination.trim()}
          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {sending ? "Sending…" : channel === "email" ? "Email the code" : "Get the code to send"}
        </button>
      </form>

      {latest && (
        <div className={`mt-5 rounded-xl border p-4 ${emailed ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
          <p className={`text-[12px] font-semibold ${emailed ? "text-emerald-600" : "text-amber-700"}`}>{latest.message}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-bold tracking-[0.3em] text-ink-800">{latest.code}</span>
            <CopyButton code={latest.code} copied={copied === latest.code} onCopy={onCopy} />
          </div>
          <p className="mt-1 text-[12px] text-slate">
            Valid for {Math.round(latest.expires_in_seconds / 60)} minutes
            {!emailed && latest.channel === "phone" && (
              <>
                {" · "}
                <a
                  className="font-semibold text-brass-dark hover:underline"
                  href={`sms:${latest.destination.replace(/\s/g, "")}?body=${encodeURIComponent(`Your Home Proofolio code is ${latest.code}. It expires in ${Math.round(latest.expires_in_seconds / 60)} minutes. Never share it.`)}`}
                >
                  Open SMS
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </Panel>
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
