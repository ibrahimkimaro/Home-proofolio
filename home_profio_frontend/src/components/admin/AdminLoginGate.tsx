"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { ApiError, User } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

type AuthStatus = "checking" | "login" | "denied";

export function AdminLoginGate({
  status,
  adminUser,
  onLogin,
  onLogout,
}: {
  status: AuthStatus;
  adminUser: User | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
}) {
  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-dim">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brass-dark" />
          <p className="text-sm text-slate">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-dim px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-berry/10 text-berry">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="font-display text-2xl text-ink-700">Not an admin account</p>
        <p className="max-w-sm text-[15px] text-slate">
          <span className="font-mono font-medium text-ink-800">{adminUser?.email ?? "This account"}</span>{" "}
          is signed in but doesn&apos;t have admin access. Contact a system administrator.
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-hairline px-5 py-2.5 text-[14px] font-medium text-ink-700 hover:bg-paper transition-colors"
          >
            Sign out & try another account
          </button>
          <Link
            href="/dashboard"
            className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper hover:opacity-80 transition-opacity"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <AdminLoginForm onLogin={onLogin} />;
}

function AdminLoginForm({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid credentials or not an admin account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper-dim px-4 py-12">
      {/* Background ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <div className="animate-drift absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-brass/10 blur-[130px]" />
        <div className="animate-glow absolute -bottom-24 right-1/4 h-[26rem] w-[26rem] rounded-full bg-berry/10 blur-[140px]" />
        <div className="dotgrid absolute inset-0 opacity-25" />
      </div>

      {/* Theme toggle — top right */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-hairline/80 bg-paper/90 px-8 py-9 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">

          {/* Brand header */}
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
              <span className="font-display text-base font-bold text-ink-700">Home Proofolio</span>
            </Link>

            <div className="mt-5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brass/15 text-brass-dark">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-ink-700">
                Admin Panel Sign In
              </h1>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate max-w-[220px]">
              Restricted to verified admin accounts only.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-[12px] font-bold uppercase tracking-wider text-slate">
                Email Address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate/60">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="admin-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full pl-10 pr-3.5"
                  placeholder="admin@homeproofolio.org"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password with eye toggle */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-[12px] font-bold uppercase tracking-wider text-slate">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate/60">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="admin-password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full pl-10 pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate/60 hover:text-ink-700 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-berry/10 p-3 text-[13px] text-berry font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[14px] font-semibold text-paper shadow-sm transition-all hover:opacity-85 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign in to Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 border-t border-hairline/60 pt-5 text-center space-y-2">
            <p className="text-[12px] text-slate">Not an admin?</p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard" className="text-[13px] font-medium text-ink-700 hover:underline">
                User Dashboard
              </Link>
              <span className="text-slate/40">·</span>
              <Link href="/" className="text-[13px] font-medium text-ink-700 hover:underline">
                Back to site
              </Link>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-slate">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Session-secured · Admin accounts only</span>
        </div>
      </div>
    </div>
  );
}
