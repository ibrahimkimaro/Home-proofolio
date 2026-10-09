"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CheckCircle2, Heart, Loader2, Smartphone, CreditCard, Sprout, Sparkles, Trophy, X } from "lucide-react";
import { CURRENCY, PAYMENTS_LIVE, PAY_METHODS, formatMoney, startDonation, type PayMethod } from "@/lib/payments";

/**
 * Pricing: Home Proofolio is free, and anyone who wants to can chip in. Donation cards open a payment
 * dialog (method, then details, then a confirmation with a small celebration). The charge itself is a
 * placeholder for now: see lib/payments.ts.
 */

const TIERS: { id: string; name: string; amount: number; blurb: string; icon: typeof Heart; tone: string }[] = [
  { id: "seed", name: "Seed", amount: 5000, blurb: "Keeps the lights on for a few members.", icon: Sprout, tone: "text-emerald-300" },
  { id: "grow", name: "Grow", amount: 20000, blurb: "Helps us add new disciplines and features.", icon: Sparkles, tone: "text-[#e8c777]" },
  { id: "champion", name: "Champion", amount: 50000, blurb: "Pays for support and keeps the platform free.", icon: Trophy, tone: "text-rose-300" },
];

export function PricingDonate() {
  const [open, setOpen] = useState<{ amount: number; label: string } | null>(null);
  const [custom, setCustom] = useState("");
  const customAmount = Math.floor(Number(custom.replace(/[^\d]/g, "")));
  const customOk = customAmount >= 1000;

  return (
    <>
      <div className="mt-12 grid gap-3 lg:grid-cols-[1.05fr_2fr]">
        {/* Free plan */}
        <div className="flex flex-col rounded-2xl border border-white/20 bg-white/[0.09] p-6 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e8c777]">Always free</p>
          <p className="mt-3 font-display text-4xl font-bold">{formatMoney(0)}</p>
          <p className="text-[13px] text-white/55">for every member, forever</p>
          <ul className="mt-5 space-y-2 text-[14px] text-white/80">
            {["Your proof-first profile", "Signed, shareable CV", "Chat, voice and video calls", "Private until you share"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                {t}
              </li>
            ))}
          </ul>
          <Link href="/start" className="mt-6 rounded-xl border border-white/25 bg-[#1f3a52]/85 px-5 py-3 text-center text-[13px] font-bold uppercase tracking-wide text-white transition-transform hover:scale-[1.02]">
            Start your Proofolio
          </Link>
        </div>

        {/* Donations */}
        <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-300">
            <Heart className="h-3.5 w-3.5" /> Support Home Proofolio
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold">Want to chip in? Every bit helps.</h3>
          <p className="mt-1 max-w-xl text-[14px] text-white/65">Donations are optional and never unlock anything. They just keep the platform free for the next person.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpen({ amount: t.amount, label: t.name })}
                className="group flex cursor-pointer flex-col items-start rounded-xl border border-white/15 bg-black/25 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
              >
                <t.icon className={`h-5 w-5 ${t.tone}`} />
                <span className="mt-3 text-[13px] font-semibold text-white/70">{t.name}</span>
                <span className="mt-0.5 font-display text-2xl font-bold">{formatMoney(t.amount)}</span>
                <span className="mt-2 text-[12px] leading-snug text-white/55">{t.blurb}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/80 transition-colors group-hover:text-white">
                  <Heart className="h-3.5 w-3.5" /> Donate
                </span>
              </button>
            ))}
          </div>

          <form
            className="mt-3 flex flex-col gap-2 rounded-xl border border-white/15 bg-black/25 p-3 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (customOk) setOpen({ amount: customAmount, label: "Your amount" });
            }}
          >
            <label htmlFor="donate-custom" className="text-[13px] font-semibold text-white/75 sm:w-32">
              Another amount
            </label>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-white/50">{CURRENCY}</span>
              <input
                id="donate-custom"
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
                placeholder="1,000 or more"
                className="h-11 w-full rounded-lg border border-white/20 bg-white/10 pl-12 pr-3 text-base text-white outline-none placeholder:text-white/35 focus:border-white/60"
              />
            </div>
            <button
              type="submit"
              disabled={!customOk}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 text-[13px] font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Heart className="h-4 w-4" /> Donate{customOk ? ` ${formatMoney(customAmount)}` : ""}
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>{open && <DonateDialog key="dlg" amount={open.amount} label={open.label} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

/* --------------------------------------- dialog --------------------------------------- */

type Step = "method" | "details" | "paying" | "done";

function DonateDialog({ amount, label, onClose }: { amount: number; label: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const busy = step === "paying";

  // Esc closes (unless a payment is in flight); focus moves into the dialog; the page behind doesn't scroll.
  useEffect(() => {
    panelRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  const phoneOk = /^(\+?255|0)?[67]\d{8}$/.test(phone.replace(/[\s-]/g, ""));
  const canPay = !!method && (method.kind === "card" || phoneOk);

  async function pay() {
    if (!method || !canPay) return;
    setError(null);
    setStep("paying");
    try {
      const r = await startDonation({ amount, method: method.id, phone: method.kind === "mobile" ? phone.replace(/[\s-]/g, "") : undefined });
      setReference(r.reference);
      setStep("done");
    } catch {
      setError("The payment didn't go through. You weren't charged. Please try again.");
      setStep("details");
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-title"
        initial={reduce ? false : { y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduce ? undefined : { y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-3xl border border-white/15 bg-[#0e1621] p-6 text-white shadow-2xl outline-none sm:max-w-md sm:rounded-3xl"
      >
        {step === "done" && !reduce && <Confetti />}

        {!busy && (
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 cursor-pointer rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}

        {step !== "done" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-300">Donation · {label}</p>
            <h2 id="donate-title" className="mt-1 font-display text-3xl font-bold">
              {formatMoney(amount)}
            </h2>
            {!PAYMENTS_LIVE && (
              <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[12px] leading-snug text-amber-100">
                Demo mode: payments aren&apos;t switched on yet. Nothing will be charged, and you can still try the whole flow.
              </p>
            )}
          </>
        )}

        {step === "method" && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold text-white/80">How would you like to pay?</p>
            <ul className="mt-3 space-y-2">
              {PAY_METHODS.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod(m);
                      setStep("details");
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] p-3.5 text-left transition-colors hover:border-white/40 hover:bg-white/10"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">{m.kind === "card" ? <CreditCard className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}</span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold">{m.label}</span>
                      <span className="block text-[12px] text-white/55">{m.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(step === "details" || step === "paying") && method && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold text-white/80">Paying with {method.label}</p>
            {method.kind === "mobile" ? (
              <div className="mt-3">
                <label htmlFor="donate-phone" className="text-[12px] text-white/60">
                  Mobile money number
                </label>
                <input
                  id="donate-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                  placeholder="0712 345 678"
                  className="mt-1 h-12 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-base text-white outline-none placeholder:text-white/35 focus:border-white/60 disabled:opacity-60"
                />
                <p className="mt-1.5 text-[12px] text-white/50">You&apos;ll get a prompt on this phone to approve the payment.</p>
                {phone && !phoneOk && <p className="mt-1 text-[12px] text-rose-300">Enter a Tanzanian mobile number, like 0712 345 678.</p>}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-white/15 bg-white/[0.05] p-3 text-[13px] text-white/70">You&apos;ll continue on the card provider&apos;s secure page to enter your card. We never see or store card details.</p>
            )}

            {error && <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-[12px] text-rose-100">{error}</p>}

            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={() => setStep("method")} disabled={busy} className="h-12 cursor-pointer rounded-xl border border-white/20 px-4 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40">
                Back
              </button>
              <button
                type="button"
                onClick={pay}
                disabled={!canPay || busy}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-[14px] font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {method.kind === "mobile" ? "Waiting for your approval…" : "Processing…"}
                  </>
                ) : (
                  <>Pay {formatMoney(amount)}</>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="relative py-4 text-center">
            <motion.div initial={reduce ? false : { scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/40">
              <CheckCircle2 className="h-11 w-11 text-emerald-300" />
            </motion.div>
            <h2 id="donate-title" className="mt-5 font-display text-3xl font-bold">
              Thank you!
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-white/70">
              Your {formatMoney(amount)} helps keep Home Proofolio free for the next person who needs to prove their work.
            </p>
            <p className="mt-4 inline-block rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-mono text-[12px] text-white/60">Reference {reference}</p>
            {!PAYMENTS_LIVE && <p className="mx-auto mt-3 max-w-xs text-[11px] text-amber-100/80">Demo mode: this was a practice run, so nothing was charged.</p>}
            <button type="button" onClick={onClose} className="mt-6 h-12 w-full cursor-pointer rounded-xl bg-white text-[14px] font-bold text-black transition-opacity hover:opacity-90">
              Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------- celebration -------------------------------------- */

/** A short burst of confetti over the dialog (canvas, ~3 seconds, then it stops drawing). */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (canvas.width = canvas.clientWidth * dpr);
    const h = (canvas.height = canvas.clientHeight * dpr);
    const colors = ["#5be3a2", "#ffc861", "#6fb1e0", "#ff7a90", "#c9a6ff", "#ffffff"];
    const parts = Array.from({ length: 140 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = (6 + Math.random() * 11) * dpr;
      return {
        x: w / 2,
        y: h * 0.38,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        s: (4 + Math.random() * 6) * dpr,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        c: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() < 0.3,
      };
    });
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.28 * dpr;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, 3.2 - t));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, 6.2832);
          ctx.fill();
        } else ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        ctx.restore();
      }
      if (t < 3.3) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
