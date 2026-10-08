"use client";

import { AnimatePresence, motion, useAnimationControls, useReducedMotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, Mail, MessageSquareText, Smartphone, X } from "lucide-react";
import {
  ApiError,
  getActivationStatus,
  fetchCurrentUser,
  sendActivationCode,
  verifyAccount,
  type ActivationStatus,
  type User,
} from "@/lib/api";

/** Match the server (backend/app/api/deps.py CODE_TTL). */
const CODE_TTL_S = 15 * 60;
/** How often to check whether an admin has sent the code yet. */
const POLL_MS = 8000;
const LENGTH = 6;
const EASE = [0.22, 1, 0.36, 1] as const;
const R = 54;
const CIRC = 2 * Math.PI * R;
const ACTIVATED = "proofolio:activated";

type Phase = "loading" | "entering" | "verifying" | "verified" | "expired";

/** Whether this account still needs activating; flips everywhere at once when any dialog succeeds. */
export function usePendingActivation(user: User) {
  const [activated, setActivated] = useState(false);
  useEffect(() => {
    const on = () => setActivated(true);
    window.addEventListener(ACTIVATED, on);
    return () => window.removeEventListener(ACTIVATED, on);
  }, []);
  return !!user.otp_pending && !activated;
}

function mask(destination: string, channel: string) {
  if (channel === "email") {
    const [name, domain] = destination.split("@");
    return `${name.slice(0, 1)}•••@${domain}`;
  }
  return destination.length > 4 ? `${destination.slice(0, -4).replace(/\d/g, "•")}${destination.slice(-4)}` : destination;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Enter the activation code. An admin delivers each code by hand (Admin > Security), so the dialog
 * waits for that, then counts down 15 minutes. A suspended account can close this and come back later
 * (dashboard banner, Settings, next login).
 */
export function OtpDialog({
  user,
  onVerified,
  onClose,
}: {
  user: User;
  onVerified: (user: User) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotionConfig();
  const [state, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<ActivationStatus | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const waiting = !!info && !info.sent;
  const left = info?.sent ? Math.max(0, Math.ceil((receivedAt + (info.expires_in_seconds ?? 0) * 1000 - now) / 1000)) : 0;
  const resendIn = info ? Math.max(0, Math.ceil((receivedAt + info.resend_in_seconds * 1000 - now) / 1000)) : 0;
  const phase: Phase = state === "entering" && info?.sent && left === 0 ? "expired" : state;
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const row = useAnimationControls();
  const started = useRef(false);

  const adopt = useCallback((r: ActivationStatus) => {
    setInfo(r);
    setReceivedAt(Date.now());
    setNow(Date.now());
    setPhase((p) => (p === "loading" || p === "expired" ? "entering" : p));
  }, []);

  const send = useCallback(
    async (channel: "phone" | "email") => {
      setSending(true);
      setError(null);
      setNotice(null);
      try {
        const r = await sendActivationCode(channel);
        adopt(r);
        setValue("");
        setNotice(`New code requested for ${mask(r.destination, r.channel)}.`);
        requestAnimationFrame(() => input.current?.focus());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't request a code. Check your connection and try again.");
        setPhase((p) => (p === "loading" ? "expired" : p));
      } finally {
        setSending(false);
      }
    },
    [adopt],
  );

  // Pick up the code requested at sign-up; only request a new one if there isn't one.
  useEffect(() => {
    if (started.current) return; // Strict Mode runs effects twice in dev
    started.current = true;
    getActivationStatus()
      .then((r) => {
        if (!r) return send(user.phone_number ? "phone" : "email");
        adopt(r);
        requestAnimationFrame(() => input.current?.focus());
      })
      .catch(() => send(user.phone_number ? "phone" : "email"));
  }, [adopt, send, user.phone_number]);

  // While the code is waiting for an admin, check now and then whether it has gone out.
  useEffect(() => {
    if (!waiting || phase !== "entering") return;
    const id = setInterval(() => {
      getActivationStatus()
        .then((r) => {
          if (!r) return setPhase("expired");
          if (r.sent) setNotice("Your code has been sent. You have 15 minutes to enter it.");
          adopt(r);
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [waiting, phase, adopt]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tick against fixed times, so a throttled background tab doesn't drift.
  useEffect(() => {
    if (phase !== "entering" && phase !== "verifying") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const canClose = phase !== "verifying" && phase !== "verified";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && canClose && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canClose, onClose]);

  async function submit(value: string) {
    setPhase("verifying");
    setError(null);
    setNotice(null);
    try {
      const u = await verifyAccount(value);
      setPhase("verified");
      // After the check animation: banners listening for this unmount, taking this dialog with them.
      setTimeout(() => {
        onVerified(u);
        window.dispatchEvent(new Event(ACTIVATED));
      }, reduce ? 300 : 1400);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't check the code. Try again.";
      setError(msg);
      setValue("");
      if (err instanceof ApiError && err.status === 410) {
        setPhase("expired");
        return;
      }
      setPhase("entering");
      if (!reduce) row.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.45 } });
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  // One real input holds the whole code, so typing, paste and SMS autofill can't drop digits.
  function onCode(raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, LENGTH);
    setValue(v);
    setError(null);
    if (v.length === LENGTH) submit(v);
  }

  const urgent = phase === "entering" && !waiting && left <= 60;
  const channel = info?.channel ?? (user.phone_number ? "phone" : "email");
  const other = channel === "phone" ? "email" : "phone";
  const canSwitch = other === "email" || !!user.phone_number;
  const ringColor =
    phase === "verified" ? "var(--color-emerald-500)" : urgent || phase === "expired" ? "var(--color-berry)" : "var(--color-brass)";
  // Waiting for delivery: a short arc orbits. Sent: the ring drains over 15 minutes.
  const ringFill =
    phase === "verified" ? 1 : phase === "expired" ? 0 : phase === "loading" || waiting ? 0.22 : left / CODE_TTL_S;
  const spinning = (phase === "loading" || (waiting && phase === "entering")) && !reduce;
  const DeliveryIcon = channel === "email" ? Mail : MessageSquareText;

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
        aria-labelledby="otp-title"
        aria-describedby="otp-desc"
        className="relative w-full max-w-[26rem] overflow-hidden rounded-[28px] border border-hairline bg-paper px-6 pb-6 pt-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] sm:px-8"
        initial={{ opacity: 0, y: reduce ? 0 : 40, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 24 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      >
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close. You can activate later."
            className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-paper-dim hover:text-ink"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}

        {/* The ring is the one loud element: an orbiting arc while the code is on its way,
            then a 15-minute drain (berry in the last minute), emerald on success. */}
        <motion.div
          className="relative mx-auto h-[132px] w-[132px]"
          animate={urgent && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={urgent ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        >
          <motion.svg
            viewBox="0 0 132 132"
            className="h-full w-full"
            aria-hidden="true"
            initial={{ rotate: -90 }}
            animate={spinning ? { rotate: [-90, 270] } : { rotate: -90 }}
            transition={spinning ? { duration: 2.4, repeat: Infinity, ease: "linear" } : { duration: 0.6, ease: EASE }}
          >
            <circle cx="66" cy="66" r={R} fill="none" strokeWidth="6" className="stroke-hairline" />
            <motion.circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC, stroke: "var(--color-brass)" }}
              animate={{ strokeDashoffset: CIRC * (1 - ringFill), stroke: ringColor }}
              transition={{
                duration: reduce ? 0 : phase === "entering" && !waiting ? 0.5 : 0.8,
                ease: phase === "entering" && !waiting ? "linear" : EASE,
              }}
            />
          </motion.svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "verified" ? (
                <motion.svg
                  key="check"
                  viewBox="0 0 48 48"
                  className="h-12 w-12 text-emerald-500"
                  initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  aria-hidden="true"
                >
                  <motion.path
                    d="M12 25 L21 34 L37 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.1, duration: reduce ? 0 : 0.45, ease: EASE }}
                  />
                </motion.svg>
              ) : phase === "loading" ? (
                <motion.div key="load" exit={{ opacity: 0 }}>
                  <Loader2 className="h-7 w-7 animate-spin text-slate" />
                </motion.div>
              ) : waiting && phase !== "expired" ? (
                <motion.div
                  key="waiting"
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <motion.span
                    animate={reduce ? undefined : { y: [0, -3, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <DeliveryIcon className="h-8 w-8 text-brass-dark" strokeWidth={1.6} />
                  </motion.span>
                  <span className="mt-1.5 block text-[12px] text-slate">on its way</span>
                </motion.div>
              ) : (
                <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <span
                    className={`block text-[34px] font-semibold leading-none tabular-nums tracking-tight transition-colors ${
                      urgent || phase === "expired" ? "text-berry" : "text-ink"
                    }`}
                  >
                    {clock(left)}
                  </span>
                  <span className="mt-1.5 block text-[12px] text-slate">{phase === "expired" ? "expired" : "left"}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <h2 id="otp-title" className="mt-6 text-[22px] font-semibold tracking-tight text-ink">
          {phase === "verified" ? "Account activated" : phase === "expired" ? "This code has expired" : "Activate your account"}
        </h2>
        <p id="otp-desc" className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-relaxed text-slate">
          {phase === "verified" ? (
            "You can now publish and share your work."
          ) : phase === "expired" ? (
            "Ask for a new code to keep going. Your account is safe and stays as it is."
          ) : info ? (
            waiting ? (
              <>
                Our team is sending a 6-digit code to{" "}
                <span className="font-medium text-ink tabular-nums">{mask(info.destination, info.channel)}</span>. It usually
                arrives within a few minutes; you&apos;ll have 15 minutes to enter it.
              </>
            ) : (
              <>
                Enter the 6-digit code we sent to{" "}
                <span className="font-medium text-ink tabular-nums">{mask(info.destination, info.channel)}</span>. Until then,
                you can look around but can&apos;t publish.
              </>
            )
          ) : (
            "Checking your code…"
          )}
        </p>

        {phase !== "verified" && (
          <>
            <motion.div animate={row} className="relative mx-auto mt-7 flex w-fit justify-center gap-2 sm:gap-2.5">
              {Array.from({ length: LENGTH }, (_, i) => {
                const active = focused && phase === "entering" && i === Math.min(value.length, LENGTH - 1);
                return (
                  <div
                    key={i}
                    aria-hidden="true"
                    className={`flex h-14 w-11 items-center justify-center rounded-2xl border-2 text-[24px] font-semibold tabular-nums text-ink transition-all duration-150 sm:w-12 ${
                      phase !== "entering" ? "opacity-50" : ""
                    } ${
                      active
                        ? "-translate-y-0.5 border-brass bg-paper shadow-[0_8px_20px_-8px_rgba(201,162,39,0.55)]"
                        : error && phase === "entering"
                          ? "border-berry/70 bg-paper-dim"
                          : value[i]
                            ? "border-ink/25 bg-paper-dim"
                            : "border-transparent bg-paper-dim"
                    }`}
                  >
                    {value[i] ??
                      (active && <span className="h-6 w-0.5 animate-pulse rounded-full bg-brass" />)}
                  </div>
                );
              })}
              <input
                ref={input}
                value={value}
                onChange={(e) => onCode(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={phase !== "entering"}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={LENGTH}
                aria-label="6-digit code"
                aria-invalid={!!error && phase === "entering"}
                className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
              />
            </motion.div>

            <div className="mt-4 min-h-[22px] text-[13px]" aria-live="polite">
              {phase === "verifying" ? (
                <span className="inline-flex items-center gap-1.5 text-slate">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the code…
                </span>
              ) : error ? (
                <span className="font-medium text-berry">{error}</span>
              ) : notice ? (
                <span className="text-emerald-600 dark:text-emerald-400">{notice}</span>
              ) : null}
            </div>

            {phase === "expired" && (
              <button
                type="button"
                onClick={() => send(channel)}
                disabled={sending}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-paper transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Ask for a new code
              </button>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium">
              {phase !== "expired" && (
                <button
                  type="button"
                  onClick={() => send(channel)}
                  disabled={sending || resendIn > 0 || phase !== "entering"}
                  className="cursor-pointer text-brass-dark transition-opacity hover:underline disabled:cursor-default disabled:text-slate disabled:no-underline"
                >
                  {resendIn > 0 ? `New code in ${clock(resendIn)}` : "Send a new code"}
                </button>
              )}
              {canSwitch && (
                <button
                  type="button"
                  onClick={() => send(other)}
                  disabled={sending || phase === "verifying" || (phase === "entering" && resendIn > 0)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-brass-dark transition-opacity hover:underline disabled:cursor-default disabled:text-slate disabled:no-underline"
                >
                  {other === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {other === "email" ? "Send to my email instead" : "Text it to my phone instead"}
                </button>
              )}
            </div>

            {canClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-4 cursor-pointer text-[13px] text-slate transition-colors hover:text-ink"
              >
                Do this later
              </button>
            )}
          </>
        )}

        {/* Screen readers hear delivery and the countdown at a few checkpoints, not every tick. */}
        <span className="sr-only" aria-live="assertive">
          {phase === "entering" && !waiting && (left === 60 || left === 10) ? `${left} seconds left to enter the code` : ""}
        </span>
      </motion.div>
    </motion.div>
  );
}

/** A button that opens the activation dialog. */
export function ActivateButton({
  user,
  className,
  children = "Activate now",
}: {
  user: User;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <AnimatePresence>
        {open && <OtpDialog user={user} onVerified={() => setOpen(false)} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

/** Sent by the bell when the activation notice is clicked: open the dialog to type the code. */
export const OPEN_ACTIVATION = "proofolio:open-activation";

/**
 * Shown across the app while the account isn't active. Once an admin has delivered the code, a bar counts down
 * the 15 minutes: when it runs out the account is suspended (support only, see /suspended). The chime and the
 * browser notification for the code's arrival come from the notification bell, which hears about it at once.
 */
export function ActivationBanner({ user }: { user: User }) {
  const pending = usePendingActivation(user);
  const reduce = useReducedMotionConfig();
  const [info, setInfo] = useState<ActivationStatus | null>(null);
  const [at, setAt] = useState(0);
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    getActivationStatus()
      .then((r) => {
        setInfo(r);
        setAt(Date.now());
        setNow(Date.now());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pending) return;
    const first = setTimeout(refresh, 0);
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), 60_000);
    const onChange = () => refresh();
    window.addEventListener("proofolio:notifications-changed", onChange);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ACTIVATION, onOpen);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("proofolio:notifications-changed", onChange);
      window.removeEventListener(OPEN_ACTIVATION, onOpen);
    };
  }, [pending, refresh]);

  const left = info?.suspends_in_seconds != null ? Math.max(0, Math.ceil(info.suspends_in_seconds - (now - at) / 1000)) : null;
  const counting = left !== null && left > 0;
  const expired = left === 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [counting]);
  useEffect(() => {
    if (!expired) return;
    // Time is up: ask the server (it decides) and go to the suspended page if so.
    fetchCurrentUser()
      .then((u) => (u.suspended ? window.location.assign("/suspended") : refresh()))
      .catch(() => {});
  }, [expired, refresh]);

  const urgent = left !== null && left <= 120;
  return (
    <AnimatePresence initial={false}>
      {pending && (
        <motion.div
          key="activate"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          className="overflow-hidden"
        >
          <div
            role="status"
            className={`relative mx-4 mt-4 flex flex-col gap-3.5 overflow-hidden rounded-2xl border p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 shadow-xs ${
              urgent ? "border-berry/40 bg-berry/10" : "border-brass/40 bg-brass/10"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${urgent ? "bg-berry/20 text-berry ring-1 ring-berry/30" : "bg-brass/25 text-brass-dark ring-1 ring-brass/30"}`}>
                <KeyRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                {left !== null ? (
                  <>
                    <p className="text-[14px] font-semibold tracking-tight text-ink">
                      Your code has arrived: enter it within <span className="tabular-nums font-bold">{clock(left)}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate leading-relaxed">
                      When the time runs out your account is suspended: you can only contact support until you activate it.
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={CODE_TTL_S} aria-valuenow={left} aria-label="Time left to activate">
                      <div
                        className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? "bg-berry" : "bg-brass-dark"}`}
                        style={{ width: `${Math.min(100, (left / CODE_TTL_S) * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold tracking-tight text-ink">Your account isn&apos;t active yet</p>
                    <p className="mt-0.5 text-[13px] text-slate leading-relaxed">
                      Enter the code we send you to publish and share your work. Until then everything stays private, and you can send up to 5
                      messages to other members.
                    </p>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative shrink-0 cursor-pointer self-start rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper shadow-xs transition-all hover:scale-[1.02] hover:bg-ink/90 active:scale-[0.98] sm:self-center"
            >
              Activate now
            </button>
          </div>
          <AnimatePresence>
            {open && <OtpDialog user={user} onVerified={() => setOpen(false)} onClose={() => setOpen(false)} />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
