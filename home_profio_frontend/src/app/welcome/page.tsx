"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useAnimationControls, useReducedMotionConfig } from "motion/react";
import { Check, Hourglass } from "lucide-react";
import { fetchCurrentUser, type User } from "@/lib/api";
import { firstName } from "@/lib/items";

const HOLD_MS = 5200;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <Welcome />
    </Suspense>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Welcome() {
  const router = useRouter();
  const isNew = useSearchParams().get("new") === "1";
  const reduce = useReducedMotionConfig();
  const [user, setUser] = useState<User | null>(null);
  const card = useAnimationControls();

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const go = () => router.replace("/home");
    const t = setTimeout(go, HOLD_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && go();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [user, router]);

  if (!user) return <div className="min-h-screen bg-paper" />;

  const full = user.profile?.display_name || user.fullname || user.username || "friend";
  const name = firstName(full);
  const handle = user.profile?.username || user.username;
  const active = !user.otp_pending;
  const d = (s: number) => (reduce ? 0 : s);
  const words = (isNew ? `Karibu, ${name}.` : `Welcome back, ${name}.`).split(" ");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-16 text-center">
      {/* Desk: dot grid and one warm light under the card */}
      <div aria-hidden="true" className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/20 blur-[110px]"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: d(1.6), ease: "easeOut" }}
      />

      {/* The proof card lifts off the desk, its record fills in, then it's stamped. */}
      <motion.div
        className="relative w-full max-w-[22rem] [perspective:1200px]"
        initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 70, rotate: reduce ? -2 : -9, scale: reduce ? 1 : 0.92 }}
        animate={{ opacity: 1, y: 0, rotate: -2, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16, mass: 0.9, delay: d(0.15) }}
      >
        <motion.div
          animate={card}
          className="relative rounded-[26px] border border-hairline bg-paper p-6 text-left shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35),0_2px_0_rgba(255,255,255,0.6)_inset]"
        >
          <div className="flex items-center gap-3.5">
            <motion.span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-paper"
              initial={{ scale: reduce ? 1 : 0.4, opacity: reduce ? 1 : 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: d(0.6) }}
            >
              {initials(full) || "P"}
            </motion.span>
            <motion.div
              className="min-w-0"
              initial={{ opacity: 0, x: reduce ? 0 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: d(0.5), delay: d(0.75), ease: EASE }}
            >
              <p className="truncate text-[17px] font-semibold tracking-tight text-ink">{full}</p>
              {handle && <p className="truncate text-[13px] text-slate">@{handle}</p>}
            </motion.div>
          </div>

          {/* Record lines: the work, learning and problems solved that will fill this card */}
          <div className="mt-6 space-y-3" aria-hidden="true">
            {[0.92, 0.7, 0.48].map((w, i) => (
              <div key={i} className="h-2.5 overflow-hidden rounded-full bg-paper-dim">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brass to-brass-dark"
                  style={{ width: `${w * 100}%`, originX: 0 }}
                  initial={{ scaleX: reduce ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: d(0.55), delay: d(1.0 + i * 0.18), ease: EASE }}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-end justify-between">
            <motion.p
              className="text-[12px] text-slate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: d(1.5), duration: d(0.5) }}
            >
              {active ? "Account active" : "Waiting for activation"}
            </motion.p>

            {/* Stamp lands with a small thud on the card */}
            <motion.span
              aria-hidden="true"
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                active
                  ? "bg-emerald-500 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)]"
                  : "border-2 border-dashed border-brass text-brass-dark"
              }`}
              initial={{ scale: reduce ? 1 : 2.2, opacity: reduce ? 1 : 0, rotate: reduce ? -12 : -40 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ type: "spring", stiffness: 420, damping: 15, delay: d(1.65) }}
              onAnimationComplete={() => {
                if (!reduce) card.start({ y: [0, 4, 0], transition: { duration: 0.28, ease: "easeOut" } });
              }}
            >
              {active ? <Check className="h-7 w-7" strokeWidth={3} /> : <Hourglass className="h-6 w-6" strokeWidth={2} />}
            </motion.span>
          </div>
        </motion.div>

        {/* The sheet underneath, so the card reads as lifted from a stack */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-2 -z-10 h-full rounded-[26px] border border-hairline bg-paper-dim"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 4 }}
          transition={{ delay: d(0.5), duration: d(0.6), ease: EASE }}
        />
      </motion.div>

      <h1 className="relative mt-14 text-[clamp(2.25rem,7vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="mr-[0.25em] inline-block last:mr-0"
            initial={{ opacity: 0, y: reduce ? 0 : 22, filter: reduce ? "none" : "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: d(2.0 + i * 0.12), duration: d(0.7), ease: EASE }}
          >
            {word}
          </motion.span>
        ))}
      </h1>

      <motion.p
        className="relative mt-4 max-w-[28rem] text-[17px] leading-relaxed text-slate"
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: d(2.5), duration: d(0.6), ease: EASE }}
      >
        {isNew
          ? "Everything you do, learn and solve can become proof. This card is where it starts."
          : "Your record is right where you left it."}
        {!active && " Enter the code we send you to activate your account and start publishing."}
      </motion.p>

      <motion.button
        type="button"
        onClick={() => router.replace("/home")}
        className="relative mt-9 cursor-pointer rounded-full bg-ink px-8 py-3.5 text-[15px] font-semibold text-paper transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: d(2.8), duration: d(0.5), ease: EASE }}
      >
        {isNew ? "Go to my space" : "Continue"}
      </motion.button>

      {/* Auto-continue progress */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] bg-brass"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
      />
    </main>
  );
}
