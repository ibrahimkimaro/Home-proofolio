"use client";

import { AnimatePresence, motion, useAnimationControls, useReducedMotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Mail, MessageSquareText, X } from "lucide-react";
import { ApiError, fetchMyCodes, verifyMyCode, type MemberCode } from "@/lib/api";
import { NOTIFICATIONS_CHANGED } from "@/components/chat/ChatNotifier";

/** Ask the code dialog to open (the bell's code notice does this). */
export const OPEN_CODE_DIALOG = "proofolio:enter-code";
const LENGTH = 6;
const POLL_MS = 120_000;
const EASE = [0.22, 1, 0.36, 1] as const;

type Held = MemberCode & { until: number };

/** Codes an admin sent this member that are still usable: refreshed by live events, every 30s and on focus. */
function useMemberCodes() {
  const [codes, setCodes] = useState<Held[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    fetchMyCodes()
      .then((r) => {
        const t = Date.now();
        setCodes(r.map((c) => ({ ...c, until: t + c.expires_in_seconds * 1000 })));
        setNow(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);

  return { codes: codes.filter((c) => c.until > now), now, reload: load };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Shown while a code an admin sent is waiting to be entered (2FA sign-in, password change, phone
 * verification...), like the activation banner: the button opens a dialog for the code.
 */
export function CodeBanner() {
  const { codes, now, reload } = useMemberCodes();
  const reduce = useReducedMotionConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => {
      reload();
      setOpen(true);
    };
    window.addEventListener(OPEN_CODE_DIALOG, show);
    return () => window.removeEventListener(OPEN_CODE_DIALOG, show);
  }, [reload]);

  const first = codes[0];
  return (
    <>
      <AnimatePresence initial={false}>
        {first && (
          <motion.div
            key="code-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              role="status"
              className="relative mx-4 mt-4 flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-brass/40 bg-brass/10 p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 shadow-xs"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass/25 text-brass-dark ring-1 ring-brass/30 shadow-xs">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tracking-tight text-ink">
                    {first.label} is ready{codes.length > 1 ? ` (+${codes.length - 1} more)` : ""}
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate leading-relaxed">
                    We sent it {first.channel === "email" ? "to your email" : "by SMS"} ({first.destination}). Enter it to continue. It expires in about{" "}
                    <span className="font-medium text-ink/80">{Math.max(1, Math.round((first.until - now) / 60000))} min</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="relative shrink-0 cursor-pointer self-start rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper shadow-xs transition-all hover:scale-[1.02] hover:bg-ink/90 active:scale-[0.98] sm:self-center"
              >
                Enter code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <CodeDialog
            codes={codes}
            onClose={() => {
              setOpen(false);
              reload();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

type Phase = "entering" | "verifying" | "verified" | "expired";

function CodeDialog({ codes, onClose }: { codes: Held[]; onClose: () => void }) {
  const reduce = useReducedMotionConfig();
  const [phase, setPhase] = useState<Phase>("entering");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const input = useRef<HTMLInputElement>(null);
  const row = useAnimationControls();
  const first = codes[0];
  const left = first ? Math.max(0, Math.ceil((first.until - now) / 1000)) : 0;
  const expired = phase === "entering" && (!first || left === 0);
  const canClose = phase !== "verifying";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && canClose && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canClose, onClose]);

  async function submit(code: string) {
    setPhase("verifying");
    setError(null);
    try {
      const r = await verifyMyCode(code);
      setDone(r.label);
      setPhase("verified");
      setTimeout(onClose, reduce ? 500 : 1600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check the code. Try again.");
      setValue("");
      if (err instanceof ApiError && (err.status === 410 || err.status === 429)) {
        setPhase("expired");
        return;
      }
      setPhase("entering");
      if (!reduce) row.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.45 } });
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  function onCode(raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, LENGTH);
    setValue(v);
    setError(null);
    if (v.length === LENGTH) submit(v);
  }

  const Icon = first?.channel === "email" ? Mail : MessageSquareText;
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-title"
        className="relative w-full max-w-[26rem] overflow-hidden rounded-[28px] border border-hairline bg-paper px-6 pb-6 pt-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] sm:px-8"
        initial={{ opacity: 0, y: reduce ? 0 : 40, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 24 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      >
        {canClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-paper-dim hover:text-ink">
            <X className="h-[18px] w-[18px]" />
          </button>
        )}

        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            phase === "verified" ? "bg-emerald-500/15 text-emerald-500" : expired || phase === "expired" ? "bg-berry/10 text-berry" : "bg-brass/15 text-brass-dark"
          }`}
        >
          {phase === "verified" ? (
            <motion.svg viewBox="0 0 48 48" className="h-10 w-10" initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} aria-hidden="true">
              <motion.path d="M12 25 L21 34 L37 15" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, delay: 0.15 }} />
            </motion.svg>
          ) : (
            <Icon className="h-9 w-9" />
          )}
        </div>

        <h2 id="code-title" className="mt-5 font-display text-[22px] text-ink">
          {phase === "verified" ? "Verified" : expired || phase === "expired" ? "That code has expired" : first ? first.label : "Enter your code"}
        </h2>
        <p className="mx-auto mt-1.5 max-w-[19rem] text-[14px] leading-relaxed text-slate">
          {phase === "verified"
            ? `${done ?? "Your code"} is confirmed.`
            : expired || phase === "expired"
              ? "Ask the Home Proofolio team to send you a new one."
              : `Enter the 6-digit code we sent ${first?.channel === "email" ? "to your email" : "by SMS"} (${first?.destination ?? ""}).`}
        </p>

        {phase !== "verified" && !(expired || phase === "expired") && (
          <>
            <motion.div animate={row} className="mt-6">
              <input
                ref={input}
                value={value}
                onChange={(e) => onCode(e.target.value)}
                disabled={phase === "verifying"}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={LENGTH}
                aria-label="6-digit code"
                placeholder="••••••"
                className="h-14 w-full rounded-2xl border border-hairline bg-paper-dim/60 text-center font-mono text-[28px] font-bold tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-slate/40 focus:border-brass disabled:opacity-60"
              />
            </motion.div>
            <p role="alert" className="mt-3 min-h-[20px] text-[13px] font-medium text-berry">
              {error}
            </p>
            <p className="mt-1 text-[12px] tabular-nums text-slate">{phase === "verifying" ? "Checking…" : `Expires in ${clock(left)}`}</p>
          </>
        )}

        {(expired || phase === "expired") && (
          <button type="button" onClick={onClose} className="mt-6 h-11 w-full cursor-pointer rounded-xl bg-ink text-[14px] font-semibold text-paper transition-opacity hover:opacity-90">
            Close
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
