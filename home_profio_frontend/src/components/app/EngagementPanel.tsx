"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Eye, FileText, Loader2, Mail, MessageCircle, Star, Trash2, UserPlus, X } from "lucide-react";
import {
  declineCvRequest,
  deleteCvRequest,
  deleteComment,
  deleteVisitorMessage,
  fetchCvRequests,
  fetchEngagement,
  fetchVisitorMessages,
  readVisitorMessage,
  sendCvRequest,
  type CvRequestItem,
  type EngagedComment,
  type EngagedPerson,
  type Engagement,
  type VisitorMessageItem,
} from "@/lib/api";
import { PublicAvatar } from "@/components/app/PublicChrome";

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
};

const card = "rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5";
const smallBtn = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Star; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2 text-slate">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-slate">{hint}</p>}
    </div>
  );
}

function People({ list, empty }: { list: EngagedPerson[]; empty: string }) {
  if (!list.length) return <p className="text-[13px] text-slate">{empty}</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {list.map((p, i) => (
        <li key={`${p.username ?? p.name}-${i}`} className="flex items-center gap-2.5">
          <PublicAvatar name={p.name} src={p.avatar} className="h-8 w-8 shrink-0 text-[12px]" />
          <span className="min-w-0 text-[13px]">
            {p.username ? (
              <Link href={`/u/${p.username}`} className="block truncate font-semibold text-ink-900 hover:underline">
                {p.name}
              </Link>
            ) : (
              <span className="block truncate font-semibold text-ink-900">{p.name}</span>
            )}
            <span className="block text-[12px] text-slate">{ago(p.at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Comments({ list, onRemove }: { list: EngagedComment[]; onRemove: (c: EngagedComment) => void }) {
  if (!list.length) return <p className="text-[13px] text-slate">No comments yet.</p>;
  return (
    <ul className="space-y-3">
      {list.map((c) => (
        <li key={c.id} className="flex gap-2.5">
          <PublicAvatar name={c.name} src={c.avatar} className="h-8 w-8 shrink-0 text-[12px]" />
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-semibold text-ink-900">
              {c.username ? (
                <Link href={`/u/${c.username}`} className="hover:underline">
                  {c.name}
                </Link>
              ) : (
                c.name
              )}{" "}
              <span className="font-normal text-slate">{ago(c.at)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-line break-words text-ink-800">{c.body}</p>
          </div>
          <button type="button" onClick={() => onRemove(c)} aria-label="Remove comment" title="Remove comment" className="h-8 w-8 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * "People" on the member's own portfolio page: how many followed, starred and commented, who exactly, per work; CV
 * requests to answer; messages left by visitors without an account.
 */
export function EngagementPanel() {
  const [data, setData] = useState<Engagement | null>(null);
  const [requests, setRequests] = useState<CvRequestItem[]>([]);
  const [messages, setMessages] = useState<VisitorMessageItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([fetchEngagement(), fetchCvRequests(), fetchVisitorMessages()])
        .then(([e, r, m]) => {
          setData(e);
          setRequests(r);
          setMessages(m);
        })
        .catch(() => setNote("Couldn't load your activity.")),
    []
  );
  useEffect(() => {
    let live = true;
    Promise.all([fetchEngagement(), fetchCvRequests(), fetchVisitorMessages()])
      .then(([e, r, m]) => {
        if (!live) return;
        setData(e);
        setRequests(r);
        setMessages(m);
      })
      .catch(() => live && setNote("Couldn't load your activity."));
    const refresh = () => document.visibilityState === "visible" && load();
    window.addEventListener("proofolio:notifications-changed", load);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      window.removeEventListener("proofolio:notifications-changed", load);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function run(id: string, fn: () => Promise<void>, ok?: string) {
    setBusy(id);
    setNote(null);
    try {
      await fn();
      if (ok) setNote(ok);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function send(r: CvRequestItem) {
    await run(
      r.id,
      async () => {
        const res = await sendCvRequest(r.id);
        setNote(
          res.emailed === true
            ? `CV sent to ${r.name}${r.member_username ? " (in their notifications and by email)" : " by email"}.`
            : r.member_username
              ? `CV sent to ${r.name} in their notifications.`
              : `Approved. We couldn't email ${r.name}, so copy this link to them: ${res.link}`
        );
      }
    );
  }

  const removeComment = (c: EngagedComment) => {
    if (!window.confirm("Remove this comment?")) return;
    run(c.id, () => deleteComment(c.id));
  };

  if (!data) return <div className="mb-6 h-40 animate-pulse rounded-2xl bg-paper" />;
  const t = data.totals;
  const pendingReq = requests.filter((r) => r.status === "pending");
  const stars = t.profile_likes + t.work_likes;
  const comments = t.profile_comments + t.work_comments;

  return (
    <section id="people" aria-label="People and activity" className="mb-8 scroll-mt-20 space-y-4">
      <div className="px-1">
        <h2 className="text-[20px] font-bold tracking-tight">People &amp; activity</h2>
        <p className="mt-0.5 text-[14px] text-slate">Who followed, starred and commented on your portfolio and on each piece of work.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UserPlus} label="Followers" value={t.followers} />
        <Stat icon={Star} label="Stars" value={stars} hint={`${t.profile_likes} on your profile, ${t.work_likes} on work`} />
        <Stat icon={MessageCircle} label="Comments" value={comments} hint={`${t.profile_comments} on your profile, ${t.work_comments} on work`} />
        <Stat icon={Eye} label="Watching work" value={t.watchers} />
      </div>

      {note && (
        <p role="status" className="break-words rounded-xl bg-paper-dim px-4 py-3 text-[13px] font-medium text-ink-800">
          {note}
        </p>
      )}

      {(requests.length > 0 || messages.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.length > 0 && (
            <div className={card}>
              <h3 className="flex items-center gap-2 text-[15px] font-bold">
                <FileText className="h-4 w-4" /> CV requests {pendingReq.length > 0 && <span className="rounded-full bg-brass px-2 text-[11px] font-bold leading-5 text-white">{pendingReq.length} new</span>}
              </h3>
              <ul className="mt-3 divide-y divide-hairline/60">
                {requests.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink-900">
                          {r.member_username ? (
                            <Link href={`/u/${r.member_username}`} className="hover:underline">
                              {r.name}
                            </Link>
                          ) : (
                            r.name
                          )}{" "}
                          <span className="text-[12px] font-normal text-slate">{r.member_username ? "member" : "guest"} · {ago(r.created_at)}</span>
                        </p>
                        {r.email && <p className="break-all text-[12px] text-slate">{r.email}</p>}
                        {r.message && <p className="mt-1 break-words text-[13px] text-ink-800">&ldquo;{r.message}&rdquo;</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === "pending" ? (
                          <>
                            <button type="button" disabled={busy === r.id} onClick={() => send(r)} className={`${smallBtn} bg-ink text-paper hover:opacity-90`}>
                              {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Send CV
                            </button>
                            <button type="button" disabled={busy === r.id} onClick={() => run(r.id, async () => void (await declineCvRequest(r.id)))} className={`${smallBtn} border border-hairline text-ink-800 hover:bg-paper-dim`}>
                              <X className="h-3.5 w-3.5" /> Decline
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`text-[12px] font-semibold ${r.status === "sent" ? "text-emerald-600" : "text-slate"}`}>{r.status === "sent" ? "CV sent" : "Declined"}</span>
                            <button type="button" onClick={() => run(r.id, () => deleteCvRequest(r.id))} aria-label="Remove from list" title="Remove from list" className="h-8 w-8 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {r.status === "pending" && !r.cv_ready && (
                      <p className="mt-2 text-[12px] text-slate">
                        Your CV isn&apos;t signed yet, so it can&apos;t be shared. <Link href="/cv" className="font-semibold text-ink-900 underline">Sign it first</Link>.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.length > 0 && (
            <div className={card}>
              <h3 className="flex items-center gap-2 text-[15px] font-bold">
                <Mail className="h-4 w-4" /> Messages from visitors {messages.some((m) => !m.read) && <span className="rounded-full bg-brass px-2 text-[11px] font-bold leading-5 text-white">{messages.filter((m) => !m.read).length} new</span>}
              </h3>
              <p className="mt-0.5 text-[12px] text-slate">From people without an account. Members chat with you in Messages.</p>
              <ul className="mt-3 divide-y divide-hairline/60">
                {messages.map((m) => (
                  <li key={m.id} className="py-3 first:pt-0 last:pb-0" onMouseEnter={() => !m.read && readVisitorMessage(m.id).then(() => setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, read: true } : x)))).catch(() => {})}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink-900">
                          {m.name} {!m.read && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-brass align-middle" />} <span className="text-[12px] font-normal text-slate">{ago(m.created_at)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-line break-words text-[13px] text-ink-800">{m.body}</p>
                        {m.email ? (
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message on my portfolio")}`} className="mt-2 inline-flex items-center gap-1.5 break-all text-[12px] font-semibold text-ink-900 underline">
                            <Mail className="h-3.5 w-3.5 shrink-0" /> Reply to {m.email}
                          </a>
                        ) : (
                          <p className="mt-1 text-[12px] text-slate">They left no email.</p>
                        )}
                      </div>
                      <button type="button" onClick={() => run(m.id, () => deleteVisitorMessage(m.id))} aria-label="Delete message" title="Delete message" className="h-8 w-8 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className={card}>
        <h3 className="text-[15px] font-bold">Your profile</h3>
        <div className="mt-3 grid gap-5 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Followers · {t.followers}</p>
            <People list={data.followers} empty="No followers yet." />
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Starred by · {t.profile_likes}</p>
            <People list={data.profile.likes} empty="No stars yet." />
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Comments · {t.profile_comments}</p>
            <Comments list={data.profile.comments} onRemove={removeComment} />
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="text-[15px] font-bold">Each work</h3>
        {data.works.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate">Add work and its stars, comments and watchers show up here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline/60">
            {data.works.map((w) => {
              const isOpen = open === w.id;
              return (
                <li key={w.id} className="py-1">
                  <button type="button" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen} className="flex w-full cursor-pointer items-center gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-900">{w.title}</span>
                      <span className="block text-[12px] capitalize text-slate">
                        {w.work_type} · {w.visibility}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-[13px] text-slate">
                      <span className="inline-flex items-center gap-1" title="Stars"><Star className="h-3.5 w-3.5" /> {w.like_count}</span>
                      <span className="inline-flex items-center gap-1" title="Comments"><MessageCircle className="h-3.5 w-3.5" /> {w.comment_count}</span>
                      <span className="hidden items-center gap-1 sm:inline-flex" title="Watching"><Eye className="h-3.5 w-3.5" /> {w.watcher_count}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="grid gap-5 pb-4 lg:grid-cols-3">
                      <div>
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Starred by · {w.like_count}</p>
                        <People list={w.likes} empty="No stars yet." />
                      </div>
                      <div>
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Comments · {w.comment_count}</p>
                        <Comments list={w.comments} onRemove={removeComment} />
                      </div>
                      <div>
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Watching · {w.watcher_count}</p>
                        <People list={w.watchers} empty="Nobody is watching it." />
                        {w.visibility !== "private" && (
                          <Link href={`/w/${w.id}`} className="mt-3 inline-block text-[12px] font-semibold text-ink-900 underline">
                            Open the public page
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
