"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { Reveal } from "./Reveal";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-ink px-5 py-24 md:py-32 text-paper">
      {/* Ambient background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <div className="dotgrid-dark absolute inset-0 opacity-20" />
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brass/15 blur-[80px]" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-berry/15 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-paper/90 backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-brass" />
            <span>Start Building Undeniable Credibility</span>
          </div>

          <h2 className="mx-auto mt-6 max-w-3xl font-display text-3xl font-bold leading-tight text-paper sm:text-4xl md:text-5xl">
            Your next opportunity shouldn&apos;t have to take your word for it.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-mist">
            Create your verifiable proofolio in minutes. Connect your work, credentials, and achievements into one living, authentic record.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/start"
              className="group inline-flex items-center gap-2 rounded-full bg-brass px-8 py-4 text-[15px] font-bold text-ink shadow-lg shadow-brass/20 transition-all duration-200 hover:bg-brass-dark hover:scale-105 active:scale-95"
            >
              <span>Start your proofolio</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-[15px] font-medium text-paper backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30"
            >
              <span>Sign in to account</span>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-mist-dim border-t border-white/10 pt-8">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brass" />
              100% Free for Learners &amp; Contributors
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Cryptographically Verifiable
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brass" />
              Granular Privacy Protection
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
