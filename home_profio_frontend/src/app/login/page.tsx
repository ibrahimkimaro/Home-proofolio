"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatePresence } from "motion/react";
import { ApiError, loginUser, type User } from "@/lib/api";
import { OtpDialog } from "@/components/app/Activation";
import { resumePending, safeNext } from "@/lib/pending";
import { adoptAccountAppearance, type Appearance } from "@/lib/appearance";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspended, setSuspended] = useState<User | null>(null);

  async function proceed() {
    // A parked Follow/Watch completes first, then we return to where it started (UC-12).
    const resumed = await resumePending();
    router.push(resumed ?? safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/welcome");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await loginUser({ email, password });
      adoptAccountAppearance(u.preferences?.appearance as Partial<Appearance> | undefined);
      // Not activated yet: ask for the code first. Closing it still signs them in, suspended.
      if (u.otp_pending) setSuspended(u);
      else await proceed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-paper-dim px-4 py-12">
      {/* Background ambient lighting and dotgrid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <div className="animate-drift absolute -top-24 left-1/4 h-[30rem] w-[30rem] rounded-full bg-brass/10 blur-[130px]" />
        <div className="animate-glow absolute -bottom-24 right-1/4 h-[28rem] w-[28rem] rounded-full bg-berry/10 blur-[140px]" />
        <div className="dotgrid absolute inset-0 opacity-30" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Top Floating Action Bar: Back to Home + Theme Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-hairline/80 bg-paper/80 px-4 py-2 text-[13px] font-medium text-slate shadow-2xs backdrop-blur-md transition-all hover:bg-paper hover:text-ink-700 hover:shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-brass-dark transition-transform group-hover:-translate-x-1" />
            <span>Back to landing page</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Apple-grade Glass Card */}
        <div className="overflow-hidden rounded-3xl border border-hairline/80 bg-paper/85 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="group flex flex-col items-center gap-2.5">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ink to-ink-700 shadow-md ring-4 ring-paper transition-transform group-hover:scale-105">
                <Image
                  src="/images/home-profolio-logo.jpeg"
                  alt="Home Proofolio"
                  width={40}
                  height={40}
                  className="rounded-xl object-cover"
                />
              </div>
              <span className="font-display text-lg font-bold text-ink-700">Home Proofolio</span>
            </Link>

            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink-700 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate max-w-xs">
              Access your living record of verified credentials, artifacts, and projects.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate">
                Email Address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate/60">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full pl-10 pr-3.5"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate">
                  Password
                </label>
                <span className="text-[11px] text-brass-dark hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate/60">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate/60 hover:text-ink-700 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-berry/10 p-3 text-[13px] text-berry font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-berry" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-primary mt-2 flex h-12 w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign in to Proofolio</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Onboarding Bridge: Direct link to start onboarding questions */}
          <div className="mt-8 border-t border-hairline/70 pt-6 text-center">
            <p className="text-[13px] text-slate">
              Don&apos;t have a proofolio yet?
            </p>
            <Link
              href="/start"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass/10 px-4 py-2 text-[13px] font-semibold text-brass-dark transition-all hover:bg-brass/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-brass" />
              <span>Start the onboarding questions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

          </div>
        </div>

        {/* Security / Verification Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-slate">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Encrypted Session · Verified Evidence Ledger</span>
        </div>
      </div>

      <AnimatePresence>
        {suspended && <OtpDialog user={suspended} onVerified={proceed} onClose={proceed} />}
      </AnimatePresence>
    </div>
  );
}
