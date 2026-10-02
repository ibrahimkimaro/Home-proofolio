"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  Award,
  Sparkles,
  Lock,
  ArrowRight,
  Code2,
  Activity,
  ExternalLink,
} from "lucide-react";

type ProofCategory = "all" | "code" | "cert" | "problem";

interface ProofItem {
  id: string;
  category: "code" | "cert" | "problem";
  title: string;
  summary: string;
  issuerOrOrg: string;
  verifiedDate: string;
  badge: string;
  badgeTone: "brass" | "berry" | "emerald";
  hash: string;
  stats: string;
}

const SAMPLE_PROOFS: ProofItem[] = [
  {
    id: "clinic-intake",
    category: "code",
    title: "Clinic Patient Intake System",
    summary: "Offline-first sync preventing data loss across hospital shifts.",
    issuerOrOrg: "Muhimbili Health IT",
    verifiedDate: "Aug 2026",
    badge: "Production Code",
    badgeTone: "emerald",
    hash: "Verified SHA-256",
    stats: "Verified Artifact",
  },
  {
    id: "forensic-audit",
    category: "cert",
    title: "Forensic Audit & VAT Ledger Model",
    summary: "Statutory VAT reconciliation algorithm tested on corporate ledgers.",
    issuerOrOrg: "UDSM Commerce Faculty",
    verifiedDate: "June 2026",
    badge: "Accredited Cert",
    badgeTone: "brass",
    hash: "Verified Sign-off",
    stats: "Verified Artifact",
  },
  {
    id: "solar-firmware",
    category: "problem",
    title: "Community Solar Microgrid Telemetry",
    summary: "Adaptive load-balancing controller stabilizing village microgrids.",
    issuerOrOrg: "Renewable Tech Consortium",
    verifiedDate: "July 2026",
    badge: "Accepted Solution",
    badgeTone: "berry",
    hash: "Merged Solution",
    stats: "Verified Artifact",
  },
];

export function Hero() {
  const [activeCategory, setActiveCategory] = useState<ProofCategory>("all");

  const filteredProofs =
    activeCategory === "all"
      ? SAMPLE_PROOFS
      : SAMPLE_PROOFS.filter((p) => p.category === activeCategory);

  return (
    <section className="relative overflow-hidden bg-paper max-w-full px-5 pb-24 pt-16 md:pb-36 md:pt-24">
      {/* Ambient background glows & dotgrid texture - optimized for 120Hz smooth scrolling */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden contain-strict"
      >
        <div className="absolute -left-20 -top-24 h-[32rem] w-[32rem] rounded-full bg-brass/10 blur-[100px] opacity-70" />
        <div className="absolute -right-20 top-12 h-[34rem] w-[34rem] rounded-full bg-berry/10 blur-[110px] opacity-70" />
        <div className="absolute bottom-10 left-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-500/8 blur-[100px] opacity-60" />
        <div className="dotgrid absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-paper to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Top Header Block */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 rounded-full border border-hairline/80 bg-paper-dim/80 px-4 py-1.5 text-[13px] font-medium text-ink-700 shadow-xs backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brass opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brass-dark" />
            </span>
            <span>Build. Prove. Connect.</span>
            <span className="text-slate/60">|</span>
            <span className="text-slate font-normal">Next-Gen Credential Network</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-3xl font-display text-[2.75rem] leading-[1.04] text-ink-700 md:text-[4.5rem]"
          >
            A career is easier to believe when you can{" "}
            <span className="bg-gradient-to-r from-ink-700 via-brass-dark to-berry bg-clip-text text-transparent">
              see it happen.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-slate md:text-[20px]"
          >
            Home Proofolio turns what you&apos;ve learned, built, solved, and contributed into a
            living record with cryptographically verified artifacts — for developers, researchers,
            students, and founders.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            <Link
              href="/start"
              className="btn-glass-primary group inline-flex items-center gap-2 px-7 py-3.5 text-[15px]"
            >
              <span>Start your proofolio</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="btn-glass inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-medium"
            >
              <Activity className="h-4 w-4 text-brass-dark" />
              <span>See how verification works</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-slate"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Cryptographically signed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brass-dark" />
              Artifact-first evidence
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-berry" />
              Granular privacy levels
            </span>
          </motion.div>
        </div>

        {/* Live Interactive Proof Window & Floating Cards (Inspired by Olbongo + Apple HIG) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          {/* Subtle glow beneath mockup window */}
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brass/15 via-berry/10 to-emerald-500/10 blur-2xl"
          />

          {/* Simulated App Window */}
          <div className="relative overflow-hidden rounded-2xl border border-hairline/80 bg-paper/85 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
            {/* macOS / Web App Header Bar */}
            <div className="flex items-center justify-between border-b border-hairline/80 bg-paper-dim/90 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/90 transition-transform hover:scale-110" />
                <span className="h-3 w-3 rounded-full bg-amber-400/90 transition-transform hover:scale-110" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/90 transition-transform hover:scale-110" />
              </div>

              {/* URL / Status Bar */}
              <div className="flex items-center gap-2 rounded-lg border border-hairline/60 bg-paper px-3 py-1 text-[11px] font-medium text-slate">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span className="font-mono text-ink-700">homeproofolio.org/usr/amina.hassan</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[12px] font-medium text-brass-dark">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Live Proof Stream</span>
              </div>
            </div>

            {/* Profile Overview Strip inside the Window */}
            <div className="border-b border-hairline/70 bg-gradient-to-b from-paper to-paper-dim/50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ink to-ink-700 text-lg font-bold text-paper shadow-md">
                    AH
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-paper">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl text-ink-700">Amina Hassan</h3>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Verified Identity
                      </span>
                    </div>
                    <p className="text-[13px] text-slate mt-0.5">
                      Accounting Student @ UDSM · Full-Stack Contributor @ ClinicOS
                    </p>
                  </div>
                </div>

                {/* Proof Metrics counter */}
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="rounded-xl border border-hairline bg-paper px-3.5 py-2 text-center shadow-2xs">
                    <p className="font-display text-base font-bold text-ink-700">18</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate">Proofs</p>
                  </div>
                  <div className="rounded-xl border border-hairline bg-paper px-3.5 py-2 text-center shadow-2xs">
                    <p className="font-display text-base font-bold text-brass-dark">4</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate">Accepted PRs</p>
                  </div>
                  <div className="rounded-xl border border-hairline bg-paper px-3.5 py-2 text-center shadow-2xs">
                    <p className="font-display text-base font-bold text-emerald-600">100%</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate">Signed</p>
                  </div>
                </div>
              </div>

              {/* Interactive Category Filter Pills */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`cursor-pointer rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${activeCategory === "all"
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper border border-hairline text-slate hover:text-ink-700"
                    }`}
                >
                  All Evidence (18)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("code")}
                  className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${activeCategory === "code"
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper border border-hairline text-slate hover:text-ink-700"
                    }`}
                >
                  <Code2 className="h-3 w-3" />
                  Code &amp; Repositories
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("cert")}
                  className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${activeCategory === "cert"
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper border border-hairline text-slate hover:text-ink-700"
                    }`}
                >
                  <Award className="h-3 w-3" />
                  Certifications &amp; Audits
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("problem")}
                  className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${activeCategory === "problem"
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper border border-hairline text-slate hover:text-ink-700"
                    }`}
                >
                  <GitBranch className="h-3 w-3" />
                  Problem Solutions
                </button>
              </div>
            </div>

            {/* Proof Items Stream */}
            <div className="divide-y divide-hairline/60 bg-paper p-4 sm:p-6 space-y-4 sm:space-y-0">
              <AnimatePresence mode="popLayout">
                {filteredProofs.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, delay: idx * 0.06 }}
                    className="apple-card-hover group rounded-xl border border-hairline/80 bg-paper-dim/40 p-4 transition-all hover:bg-paper sm:my-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.badgeTone === "emerald"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : item.badgeTone === "brass"
                                  ? "bg-brass/20 text-brass-dark"
                                  : "bg-berry/20 text-berry"
                              }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {item.badge}
                          </span>
                          <span className="text-[12px] text-slate font-medium">
                            {item.issuerOrOrg}
                          </span>
                        </div>
                        <h4 className="font-display text-[16px] text-ink-700 group-hover:text-black">
                          {item.title}
                        </h4>
                        <p className="text-[13px] leading-relaxed text-slate max-w-2xl">
                          {item.summary}
                        </p>
                      </div>

                      {/* Hash & Verification Pill */}
                      <div className="mt-2 shrink-0 sm:mt-0 sm:text-right">
                        <span className="inline-block rounded-md bg-paper border border-hairline px-2.5 py-1 font-mono text-[10px] text-slate shadow-2xs">
                          {item.hash}
                        </span>
                        <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                          {item.verifiedDate}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Artifact Details Bar */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between border-t border-hairline/50 pt-2.5 text-[12px] text-slate">
                      <span className="font-mono text-[11px] text-slate">{item.stats}</span>
                      <span className="inline-flex items-center gap-1 font-medium text-brass-dark hover:underline">
                        <span>Inspect cryptographic seal</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Floating Floating Card 1: Verifiable Seal (Inspired by Olbongo's floating badge) */}
          <div className="animate-float-slow absolute -top-8 -right-4 z-20 hidden md:block">
            <div className="glass-panel flex items-center gap-3 rounded-2xl p-3.5 shadow-xl ring-1 ring-black/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-ink-700">Verifiable Credential</p>
                <p className="text-[10px] text-slate">SHA-256 Proof · Immutable</p>
                <span className="mt-0.5 inline-block text-[9px] font-semibold text-emerald-700">
                  ● 100% Authentic Artifact
                </span>
              </div>
            </div>
          </div>

          {/* Floating Card 2: Contributor Problem Solved */}
          <div className="animate-float-reverse absolute -bottom-6 -left-6 z-20 hidden md:block">
            <div className="glass-panel flex items-center gap-3 rounded-2xl p-3.5 shadow-xl ring-1 ring-black/5 max-w-xs">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/20 text-brass-dark">
                <GitBranch className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-700 truncate">
                  Problem Solved &amp; Credited
                </p>
                <p className="text-[10px] text-slate truncate">
                  Intake Queue Synchronization
                </p>
                <p className="text-[9px] font-medium text-berry">
                  Distinct author &amp; solver attribution
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
