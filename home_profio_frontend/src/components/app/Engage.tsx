"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Home, Loader2, Mail, MessageCircle, Plus, Send, Share2, Sparkles, Star, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  addComment,
  askForCv,
  deleteComment,
  engageStatus,
  leaveVisitorMessage,
  setLike,
  setSocial,
  socialStatus,
  type EngageComment,
  type EngageKind,
  type EngageStatus,
} from "@/lib/api";
import { parkAction, type ParkedAction } from "@/lib/pending";
import { PublicAvatar } from "@/components/app/PublicChrome";

/**
 * Engagement on a portfolio and on each piece of work: star, comment, follow, message, ask for the CV.
 * Starring, commenting and following need an account: anyone without one gets the sign-in sheet, and after signing in
 * or creating an account they land back on this same page, at the same place (a parked return address, see lib/pending).
 */

const COMMENT_MAX = 1000;
const field =
  "w-full rounded-xl border border-hairline bg-paper px-3.5 py-2.5 text-[14px] text-ink-900 outline-none placeholder:text-slate focus:border-ink";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
/** This page with ?do=<what> (and an optional #anchor): where the visitor comes back to, ready to continue. */
const returnWith = (what: string, anchor = "") => `${window.location.pathname}?do=${what}${anchor}`;

/** Read ?do=... once (set when someone returned from signing in) and remove it from the address. */
function useResume(): string | null {
  const [what] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("do")));
  useEffect(() => {
    if (!what) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("do");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [what]);
  return what;
}

// ---------------------------------------------------------------- sheets

/** A dialog: a bottom sheet on phones, centred on larger screens. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-hairline bg-paper shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <h2 className="text-[16px] font-bold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-full p-1.5 text-slate hover:bg-paper-dim hover:text-ink-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/** "Sign in to continue": sign in or create an account, then come straight back to this page. */
export function AuthGate({ reason, action, returnTo, onClose }: { reason: string; action: ParkedAction; returnTo: string; onClose: () => void }) {
  const router = useRouter();
  return (
    <Sheet title="Sign in to continue" onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-ink-700">{reason}</p>
      <p className="mt-1 text-[13px] text-slate">It takes a minute, and you&apos;ll come right back to this page.</p>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push(parkAction(action, returnTo))}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-ink px-5 text-[14px] font-semibold text-paper hover:opacity-90"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            parkAction(action, returnTo);
            router.push("/start");
          }}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-hairline px-5 text-[14px] font-semibold text-ink-900 hover:bg-paper-dim"
        >
          Create an account
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- shared state

type Gate = { reason: string; action: ParkedAction; returnTo: string } | null;

const CHANGED = "proofolio:engage-changed";

function useEngage(kind: EngageKind, key: string) {
  const [state, setRaw] = useState<EngageStatus | null>(null);
  const [me] = useState(() => Math.random().toString(36).slice(2));
  const reload = useCallback(() => engageStatus(kind, key).then(setRaw).catch(() => {}), [kind, key]);
  // Setting it here (a star, a comment) also tells the other components showing the same thing.
  const setState = useCallback(
    (s: EngageStatus) => {
      setRaw(s);
      window.dispatchEvent(new CustomEvent(CHANGED, { detail: { kind, key, from: me } }));
    },
    [kind, key, me]
  );
  useEffect(() => {
    let live = true;
    engageStatus(kind, key)
      .then((s) => live && setRaw(s))
      .catch(() => {});
    const onChanged = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d.kind === kind && d.key === key && d.from !== me) reload();
    };
    window.addEventListener(CHANGED, onChanged);
    return () => {
      live = false;
      window.removeEventListener(CHANGED, onChanged);
    };
  }, [kind, key, me, reload]);
  return { state, setState, reload };
}

async function toggleLike(kind: EngageKind, key: string, state: EngageStatus, set: (s: EngageStatus) => void) {
  const on = !state.liked;
  set({ ...state, liked: on, likes: Math.max(0, state.likes + (on ? 1 : -1)) }); // right away; undone if it fails
  try {
    await setLike(kind, key, on);
  } catch {
    set(state);
  }
}

// ---------------------------------------------------------------- comments

/** The comments on a profile or a work, and the box to write one (or the way to sign in first). */
export function CommentsThread({
  kind,
  target,
  state,
  setState,
  askSignIn,
  autoFocus,
}: {
  kind: EngageKind;
  target: string;
  state: EngageStatus;
  setState: (s: EngageStatus) => void;
  askSignIn: (reason: string, action: ParkedAction, returnTo: string) => void;
  autoFocus?: boolean;
}) {
  const draftKey = `proofolio:draft:${kind}:${target}`;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && state.signed_in) box.current?.focus();
  }, [autoFocus, state.signed_in]);

  function type(v: string) {
    setText(v);
    try {
      if (v) localStorage.setItem(draftKey, v);
      else localStorage.removeItem(draftKey);
    } catch {}
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const c = await addComment(kind, target, body);
      setState({ ...state, comment_count: state.comment_count + 1, comments: [c, ...state.comments] });
      type("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post your comment");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: EngageComment) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(c.id);
      setState({ ...state, comment_count: Math.max(0, state.comment_count - 1), comments: state.comments.filter((x) => x.id !== c.id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete it");
    }
  }

  return (
    <div>
      {state.self ? (
        <p className="rounded-xl bg-paper-dim px-4 py-3 text-[13px] text-slate">This is your own page. Visitors can comment here, and you can remove any comment.</p>
      ) : state.signed_in ? (
        <form onSubmit={post} className="space-y-2">
          <textarea
            ref={box}
            value={text}
            onChange={(e) => type(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            className={`${field} resize-y`}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-slate">{text.length}/{COMMENT_MAX}</span>
            <button
              type="submit"
              disabled={!text.trim() || busy}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Comment
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => askSignIn("Sign in or create an account to join the conversation. Your comment is kept while you do.", { type: "return" }, returnWith("comment", "#comments"))}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-hairline px-4 py-3 text-left text-[14px] text-slate hover:border-ink/40 hover:text-ink-900"
        >
          <span>Write a comment…</span>
          <span className="shrink-0 text-[12px] font-semibold text-ink-900">Sign in</span>
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-berry">{error}</p>}

      <ul className="mt-5 space-y-4" aria-label="Comments">
        {state.comments.length === 0 && <li className="py-4 text-center text-[14px] text-slate">No comments yet. Be the first.</li>}
        {state.comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <PublicAvatar name={c.author.name} src={c.author.avatar} className="h-9 w-9 shrink-0 text-[13px]" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                {c.author.username ? (
                  <Link href={`/u/${c.author.username}`} className="font-semibold text-ink-900 hover:underline">
                    {c.author.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-ink-900">{c.author.name}</span>
                )}
                <span className="text-slate">{ago(c.created_at)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-800">{c.body}</p>
            </div>
            {c.can_delete && (
              <button
                type="button"
                onClick={() => remove(c)}
                aria-label="Delete comment"
                title="Delete comment"
                className="h-8 w-8 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {state.comment_count > state.comments.length && <p className="mt-3 text-center text-[12px] text-slate">Showing the latest {state.comments.length} of {state.comment_count}.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- modals: CV and message

function Done({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-6 w-6" />
      </span>
      <p className="mt-3 text-[16px] font-bold text-ink-900">{title}</p>
      <p className="mt-1 text-[14px] text-slate">{text}</p>
      <button type="button" onClick={onClose} className="mt-5 h-10 cursor-pointer rounded-xl bg-ink px-6 text-[14px] font-semibold text-paper hover:opacity-90">
        Done
      </button>
    </div>
  );
}

/** Ask for the CV. The owner chooses whether to send it. A visitor gives a name and an email so it can reach them. */
function CvModal({ username, name, signedIn, onClose }: { username: string; name: string; signedIn: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await askForCv(username, signedIn ? { message: form.message, website: form.website } : form);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`Ask ${name} for their CV`} onClose={onClose}>
      {sent ? (
        <Done title="Request sent" text={`${name} will decide whether to send it${signedIn ? ". You'll be notified here" : ", and it comes to your email"}.`} onClose={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[13px] text-slate">{name} is told right away and decides whether to share their CV with you.</p>
          {!signedIn && (
            <>
              <input value={form.name} onChange={set("name")} required minLength={2} maxLength={100} placeholder="Your name" aria-label="Your name" autoComplete="name" className={field} />
              <input value={form.email} onChange={set("email")} required type="email" maxLength={255} placeholder="Your email (the CV is sent here)" aria-label="Your email" autoComplete="email" className={field} />
            </>
          )}
          <textarea value={form.message} onChange={set("message")} maxLength={500} rows={3} placeholder="A short note (optional): who you are, what for" aria-label="A note" className={`${field} resize-y`} />
          <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p role="alert" className="text-[13px] text-berry">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-semibold text-paper hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Ask for the CV
          </button>
        </form>
      )}
    </Sheet>
  );
}

/** A message from someone without an account: a name and an email so the reply can reach them. */
function VisitorMessageModal({ username, name, onClose }: { username: string; name: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await leaveVisitorMessage(username, form);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`Message ${name}`} onClose={onClose}>
      {sent ? (
        <Done title="Message sent" text={`${name} was notified${form.email ? " and can reply to your email" : ""}.`} onClose={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[13px] text-slate">
            You are a guest, so give a name and an email for the reply. Have an account? <Link href="/login" className="font-semibold text-ink-900 underline">Sign in</Link> to chat directly.
          </p>
          <input value={form.name} onChange={set("name")} required minLength={2} maxLength={100} placeholder="Your name" aria-label="Your name" autoComplete="name" className={field} />
          <input value={form.email} onChange={set("email")} type="email" maxLength={255} placeholder="Your email (so they can reply)" aria-label="Your email" autoComplete="email" className={field} />
          <textarea value={form.message} onChange={set("message")} required minLength={2} maxLength={1000} rows={4} placeholder="Your message" aria-label="Your message" className={`${field} resize-y`} />
          <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p role="alert" className="text-[13px] text-berry">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-semibold text-paper hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send message
          </button>
        </form>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- floating actions on a portfolio

type Panel = null | "comments" | "cv" | "message";

/**
 * The buttons floating on someone's portfolio: star, comment, follow, message, ask for the CV. A column at the right of
 * larger screens, a bar along the bottom of phones. Hidden for the owner.
 */
export function ProfileActions({ username, displayName, preview = false }: { username: string; displayName: string; preview?: boolean }) {
  const router = useRouter();
  const { state, setState } = useEngage("profile", username);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const resume = useResume();
  const resumed = useRef(false);

  useEffect(() => {
    let live = true;
    socialStatus("user", username)
      .then((s) => live && setFollowing(s.active))
      .catch(() => live && setFollowing(false));
    return () => {
      live = false;
    };
  }, [username]);

  // Back from signing in: open what they were doing.
  useEffect(() => {
    if (!state || resumed.current || !resume) return;
    resumed.current = true;
    const open = resume === "comment" ? "comments" : resume === "cv" ? "cv" : resume === "message" ? "message" : null;
    if (open) setTimeout(() => setPanel(open), 0);
  }, [state, resume]);

  if (!state || (state.self && !preview)) return null;
  const signedIn = state.signed_in;
  const askSignIn = (reason: string, action: ParkedAction, returnTo: string) => setGate({ reason, action, returnTo });

  function star() {
    if (!signedIn) return askSignIn(`Sign in to star ${displayName}'s portfolio.`, { type: "like", kind: "profile", key: username }, here());
    toggleLike("profile", username, state!, setState);
  }
  async function follow() {
    if (!signedIn) return askSignIn(`Sign in to follow ${displayName} and hear about new work.`, { type: "social", kind: "user", key: username }, here());
    const on = !following;
    setFollowing(on);
    try {
      await setSocial("user", username, on);
    } catch {
      setFollowing(!on);
    }
  }
  function message() {
    if (!signedIn) return askSignIn(`Sign in to message ${displayName} and chat directly.`, { type: "return" }, returnWith("message"));
    router.push(`/chat?to=${encodeURIComponent(username)}`);
  }

  const firstName = displayName.trim().split(" ")[0] || "Member";

  const items = [
    ...(signedIn
      ? [
          {
            id: "home",
            label: "My Account",
            icon: Home,
            onClick: () => router.push("/home"),
            active: false,
            tooltip: "Return to your account home",
          },
        ]
      : []),
    {
      id: "star",
      label: state.liked ? "Starred" : "Star",
      icon: Star,
      onClick: star,
      count: state.likes,
      active: state.liked,
      tooltip: state.liked ? `You endorsed ${firstName}` : `Star ${firstName}'s portfolio`,
    },
    {
      id: "comment",
      label: "Comment",
      icon: MessageCircle,
      onClick: () => {
        if (!signedIn) return askSignIn(`Sign in to comment on ${displayName}'s portfolio.`, { type: "return" }, returnWith("comment", "#comments"));
        setPanel("comments");
      },
      count: state.comment_count,
      active: false,
      tooltip: "Leave notes & feedback",
    },
    {
      id: "follow",
      label: following ? "Following" : "Follow",
      icon: following ? Check : Plus,
      onClick: follow,
      active: !!following,
      tooltip: following ? "Following for updates" : `Follow ${firstName}`,
    },
    {
      id: "message",
      label: "Message",
      icon: Mail,
      onClick: message,
      active: false,
      tooltip: `Direct message ${firstName}`,
    },
    {
      id: "cv",
      label: "Signed CV",
      icon: FileText,
      onClick: () => {
        if (!signedIn) return askSignIn(`Sign in to request ${displayName}'s verified proof-backed CV.`, { type: "return" }, returnWith("cv"));
        setPanel("cv");
      },
      active: true,
      tooltip: `Request ${firstName}'s verified proof-backed CV`,
    },
  ];

  return (
    <>
      {/* ============================================================
          DESKTOP / LAPTOP VIEW: Sleek Vertical Floating Dock on Right Edge
          ============================================================ */}
      <motion.nav
        aria-label={`Engage with ${displayName}`}
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex fixed right-6 bottom-10 z-40 select-none flex-col items-end"
      >
        <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-neutral-300/80 dark:border-white/15 bg-white/90 dark:bg-[#12141c]/90 text-neutral-900 dark:text-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.25),0_0_25px_rgba(201,162,39,0.14)] backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Subtle Ambient Pulse Ring */}
          <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-brass/30 to-emerald-500/20 opacity-50 blur-xs animate-pulse" />

          {/* Top Brand/Creator Indicator */}
          <div className="relative pb-1.5 border-b border-neutral-200/80 dark:border-white/10 flex items-center justify-center w-full" title={`Creator: ${displayName}`}>
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>

          {/* Vertical Action Buttons */}
          <div className="relative flex flex-col items-center gap-2">
            {items.map((it) => {
              const isCv = it.id === "cv";
              const isStar = it.id === "star";
              const isFollow = it.id === "follow";

              return (
                <div key={it.id} className="relative group">
                  <motion.button
                    type="button"
                    onClick={it.onClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label={it.label}
                    aria-pressed={it.active}
                    className={`relative flex items-center justify-center w-11 h-11 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCv
                        ? "bg-gradient-to-tr from-amber-500 via-brass to-amber-400 text-neutral-950 font-black shadow-md shadow-amber-500/30 hover:brightness-110 ring-2 ring-amber-400/40"
                        : it.active
                        ? isStar
                          ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-neutral-950 font-black shadow-sm"
                          : isFollow
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                          : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                        : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 border border-neutral-200/50 dark:border-white/5"
                    }`}
                  >
                    <it.icon
                      className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                        isStar && it.active ? "fill-current text-neutral-950" : ""
                      } ${isCv ? "text-neutral-950" : ""}`}
                    />

                    {/* Badge Count if any */}
                    {typeof it.count === "number" && it.count > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-black shadow-sm ${
                          isStar && it.active
                            ? "bg-neutral-950 text-amber-300 ring-1 ring-amber-400"
                            : "bg-amber-500 text-neutral-950"
                        }`}
                      >
                        {it.count > 99 ? "99+" : it.count}
                      </span>
                    )}
                  </motion.button>

                  {/* Micro-Tooltip appearing to the LEFT of the button */}
                  <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover:flex items-center z-50 transition-all opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 duration-150">
                    <div className="whitespace-nowrap rounded-xl bg-neutral-950 text-white dark:bg-[#1a1d28] dark:border dark:border-white/15 px-3 py-1.5 text-[11px] font-semibold shadow-2xl flex items-center gap-1.5">
                      <span>{it.tooltip}</span>
                    </div>
                    <div className="w-2 h-2 -ml-1 rotate-45 bg-neutral-950 dark:bg-[#1a1d28]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.nav>

      {/* ============================================================
          MOBILE VIEW: Floating Action Trigger at Right Corner + Vertical Speed Dial
          ============================================================ */}
      <div className="flex md:hidden fixed bottom-6 right-5 z-40 flex-col items-end select-none">
        {/* Vertical Line of Action Buttons (Speed Dial) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col-reverse items-end gap-2.5 mb-3.5"
            >
              {items.map((it, idx) => {
                const isCv = it.id === "cv";
                const isStar = it.id === "star";

                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    {/* Action Label Pill */}
                    <span className="rounded-full bg-neutral-950/85 dark:bg-[#12141c]/90 text-white backdrop-blur-md px-3 py-1 text-[11px] font-semibold shadow-md border border-white/10">
                      {it.tooltip}
                    </span>

                    {/* Action Circle Button */}
                    <motion.button
                      type="button"
                      onClick={() => {
                        it.onClick();
                        setMobileOpen(false);
                      }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={it.label}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
                        isCv
                          ? "bg-gradient-to-r from-amber-500 via-brass to-amber-400 text-neutral-950 font-black shadow-amber-500/30 ring-2 ring-amber-400/50"
                          : it.active
                          ? isStar
                            ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-neutral-950"
                            : "bg-emerald-600 text-white"
                          : "bg-neutral-900/90 dark:bg-neutral-800/90 text-white border border-white/15"
                      }`}
                    >
                      <it.icon className={`h-5 w-5 ${isStar && it.active ? "fill-current" : ""}`} />

                      {/* Badge count if any */}
                      {typeof it.count === "number" && it.count > 0 && (
                        <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                          {it.count > 99 ? "99+" : it.count}
                        </span>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button (FAB) Trigger */}
        <motion.button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label={mobileOpen ? "Close actions" : "Engage with creator"}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all cursor-pointer ${
            mobileOpen
              ? "bg-neutral-900 dark:bg-neutral-800 text-white border border-white/20 rotate-90"
              : "bg-gradient-to-tr from-amber-500 via-brass to-amber-400 text-neutral-950 font-black shadow-amber-500/40 ring-4 ring-amber-400/20"
          }`}
        >
          {/* Subtle Ping Pulse when Closed */}
          {!mobileOpen && (
            <span className="pointer-events-none absolute inset-0 rounded-full bg-amber-400/40 animate-ping opacity-60" />
          )}

          <AnimatePresence mode="wait">
            {mobileOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Sparkles className="w-6 h-6 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {panel === "comments" && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label="Comments">
          <button type="button" aria-label="Close comments" onClick={() => setPanel(null)} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]" />
          <aside className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-hairline bg-paper shadow-2xl sm:max-w-lg md:max-h-none md:max-w-md md:rounded-none md:rounded-l-3xl" id="comments">
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <h2 className="text-[16px] font-bold text-ink-900">Comments{state.comment_count ? ` · ${state.comment_count}` : ""}</h2>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="cursor-pointer rounded-full p-1.5 text-slate hover:bg-paper-dim hover:text-ink-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <CommentsThread kind="profile" target={username} state={state} setState={setState} askSignIn={askSignIn} autoFocus />
            </div>
          </aside>
        </div>
      )}
      {panel === "cv" && <CvModal username={username} name={displayName} signedIn={signedIn} onClose={() => setPanel(null)} />}
      {panel === "message" && <VisitorMessageModal username={username} name={displayName} onClose={() => setPanel(null)} />}
      {gate && <AuthGate reason={gate.reason} action={gate.action} returnTo={gate.returnTo} onClose={() => setGate(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- one piece of work

/** Under a work, article or problem: star, share, and the conversation. Signing in sends the visitor back here. */
export function WorkEngagement({ workId, title }: { workId: string; title: string }) {
  const { state, setState } = useEngage("work", workId);
  const [gate, setGate] = useState<Gate>(null);
  const [copied, setCopied] = useState(false);
  const resume = useResume();
  const section = useRef<HTMLElement>(null);

  // Back from signing in to write a comment: scroll to the conversation.
  useEffect(() => {
    if (resume === "comment" && state) setTimeout(() => section.current?.scrollIntoView({ block: "start" }), 50);
  }, [resume, state]);

  if (!state) return <div className="h-40 animate-pulse rounded-2xl bg-paper" />;

  function star() {
    if (!state!.signed_in) return setGate({ reason: `Sign in to star "${title}".`, action: { type: "like", kind: "work", key: workId }, returnTo: here() });
    toggleLike("work", workId, state!, setState);
  }
  async function share() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  const btn = "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition-colors";
  return (
    <section ref={section} id="comments" className="pf-surface scroll-mt-4 rounded-2xl border border-hairline/50 bg-paper p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2.5">
        {!state.self && (
          <button type="button" onClick={star} aria-pressed={state.liked} className={`${btn} ${state.liked ? "border-ink bg-ink text-paper" : "border-hairline text-ink-900 hover:bg-paper-dim"}`}>
            <Star className={`h-4 w-4 ${state.liked ? "fill-current" : ""}`} /> {state.liked ? "Starred" : "Star"}
          </button>
        )}
        <span className="inline-flex h-11 items-center gap-1.5 px-1 text-[14px] text-slate" aria-label={`${state.likes} stars, ${state.comment_count} comments`}>
          <Star className="h-4 w-4" /> {state.likes}
          <MessageCircle className="ml-3 h-4 w-4" /> {state.comment_count}
        </span>
        <button type="button" onClick={share} className={`${btn} ml-auto border-hairline text-ink-900 hover:bg-paper-dim`}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />} {copied ? "Link copied" : "Share"}
        </button>
      </div>
      <h2 className="mb-4 mt-7 text-[13px] font-semibold uppercase tracking-wider text-slate">Comments</h2>
      <CommentsThread kind="work" target={workId} state={state} setState={setState} askSignIn={(reason, action, returnTo) => setGate({ reason, action, returnTo })} />
      {gate && <AuthGate reason={gate.reason} action={gate.action} returnTo={gate.returnTo} onClose={() => setGate(null)} />}
    </section>
  );
}

/** A calm way back to the owner's portfolio from one of their works. */
export function BackToPortfolio({ username, name, className = "" }: { username: string; name: string; className?: string }) {
  return (
    <Link
      href={`/u/${username}`}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-hairline bg-paper px-4 text-[13px] font-semibold text-ink-900 shadow-2xs transition-colors hover:bg-paper-dim ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="truncate">Back to {name}&apos;s portfolio</span>
    </Link>
  );
}

// ---------------------------------------------------------------- the community card on a portfolio

/**
 * On the portfolio page itself, as you scroll: who starred it and what people said, kept short. Tap for the full list
 * or the whole conversation. Followers show as a count.
 */
export function CommunitySection({ username, displayName, followers }: { username: string; displayName: string; followers?: number }) {
  const { state, setState } = useEngage("profile", username);
  const [sheet, setSheet] = useState<null | "stars" | "comments">(null);
  const [gate, setGate] = useState<Gate>(null);
  if (!state) return null;
  const names = state.stars.slice(0, 2).map((p) => p.name.split(" ")[0]);
  const more = state.likes - names.length;
  const starLine =
    state.likes === 0
      ? "No stars yet."
      : `${names.join(", ")}${more > 0 ? ` and ${more} ${more === 1 ? "other" : "others"}` : ""} starred this portfolio.`;
  const latest = state.comments.slice(0, 2);
  const askSignIn = (reason: string, action: ParkedAction, returnTo: string) => setGate({ reason, action, returnTo });
  const card = "rounded-3xl border-2 border-neutral-200 bg-white p-5 shadow-md dark:border-neutral-700/80 dark:bg-[#13151b] sm:p-6";
  const link =
    "mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-neutral-200 px-4 text-[13px] font-bold text-neutral-900 transition-colors hover:border-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:border-white";

  return (
    <section id="community" aria-label="Stars and comments" className="w-full border-t border-neutral-200/90 py-16 dark:border-neutral-800 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">Community</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">Stars &amp; comments</h2>
          </div>
          {typeof followers === "number" && followers > 0 && (
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {followers} {followers === 1 ? "follower" : "followers"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={card}>
            <div className="flex items-center gap-2 text-neutral-500">
              <Star className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Stars</span>
            </div>
            <p className="mt-2 text-4xl font-black text-neutral-950 dark:text-white">{state.likes}</p>
            {state.stars.length > 0 && (
              <div className="mt-3 flex -space-x-2">
                {state.stars.slice(0, 6).map((p, i) => (
                  <PublicAvatar key={`${p.username ?? p.name}-${i}`} name={p.name} src={p.avatar} className="h-9 w-9 rounded-full border-2 border-white text-[12px] dark:border-[#13151b]" />
                ))}
                {state.likes > 6 && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[11px] font-bold text-neutral-700 dark:border-[#13151b] dark:bg-neutral-800 dark:text-neutral-200">
                    +{state.likes - 6}
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{starLine}</p>
            {state.likes > 0 && (
              <button type="button" onClick={() => setSheet("stars")} className={link}>
                See who
              </button>
            )}
          </div>

          <div className={card}>
            <div className="flex items-center gap-2 text-neutral-500">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Comments</span>
            </div>
            <p className="mt-2 text-4xl font-black text-neutral-950 dark:text-white">{state.comment_count}</p>
            {latest.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Nothing here yet. Start the conversation.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {latest.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <PublicAvatar name={c.author.name} src={c.author.avatar} className="h-8 w-8 shrink-0 rounded-full text-[12px]" />
                    <p className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="font-bold text-neutral-950 dark:text-white">{c.author.name}</span>{" "}
                      <span className="line-clamp-2 break-words">{c.body}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setSheet("comments")} className={link}>
              {state.comment_count > latest.length ? `Read all ${state.comment_count}` : state.comment_count ? "Open the conversation" : "Write a comment"}
            </button>
          </div>
        </div>
      </div>

      {sheet === "stars" && (
        <Sheet title={`Starred by ${state.likes}`} onClose={() => setSheet(null)}>
          <ul className="space-y-3">
            {state.stars.map((p, i) => (
              <li key={`${p.username ?? p.name}-${i}`} className="flex items-center gap-3">
                <PublicAvatar name={p.name} src={p.avatar} className="h-10 w-10 shrink-0 text-[13px]" />
                {p.username ? (
                  <Link href={`/u/${p.username}`} className="min-w-0 truncate text-[14px] font-semibold text-ink-900 hover:underline">
                    {p.name}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate text-[14px] font-semibold text-ink-900">{p.name}</span>
                )}
              </li>
            ))}
          </ul>
          {state.likes > state.stars.length && (
            <p className="mt-4 text-center text-[12px] text-slate">
              Showing the latest {state.stars.length} of {state.likes}.
            </p>
          )}
          {!state.self && !state.liked && (
            <button
              type="button"
              onClick={() => {
                if (!state.signed_in) return askSignIn(`Sign in to star ${displayName}'s portfolio.`, { type: "like", kind: "profile", key: username }, here());
                toggleLike("profile", username, state, setState);
              }}
              className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-semibold text-paper hover:opacity-90"
            >
              <Star className="h-4 w-4" /> Star this portfolio
            </button>
          )}
        </Sheet>
      )}
      {sheet === "comments" && (
        <Sheet title={`Comments${state.comment_count ? ` · ${state.comment_count}` : ""}`} onClose={() => setSheet(null)}>
          <CommentsThread kind="profile" target={username} state={state} setState={setState} askSignIn={askSignIn} />
        </Sheet>
      )}
      {gate && <AuthGate reason={gate.reason} action={gate.action} returnTo={gate.returnTo} onClose={() => setGate(null)} />}
    </section>
  );
}
