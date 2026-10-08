"use client";

import React from "react";

/**
 * High-fidelity shimmer skeleton that mirrors the structure and aesthetics of MyPortfolio.
 * Adapts dynamically to light and dark themes using semantic tokens and the .animate-shimmer effect.
 */
export function PortfolioShimmer() {
  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#0e1015] text-neutral-900 dark:text-[#f4efe6] transition-colors duration-300 font-sans">
      {/* Top Accent Shimmer Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500/20 via-brass/60 to-emerald-500/20 animate-pulse" />

      {/* ==========================================
          HEADER SKELETON
          ========================================== */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-[#0e1015]/75 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
            <div className="flex flex-col gap-1.5">
              <div className="w-28 h-3.5 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
              <div className="w-16 h-2 rounded-md bg-neutral-200/70 dark:bg-neutral-800/70 animate-shimmer" />
            </div>
          </div>

          {/* Desktop Nav Pills */}
          <div className="hidden md:flex items-center gap-2 p-1 rounded-full bg-neutral-100/90 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="w-16 h-7 rounded-full bg-white dark:bg-neutral-700 shadow-xs animate-shimmer" />
            <div className="w-20 h-7 rounded-full bg-transparent" />
            <div className="w-18 h-7 rounded-full bg-transparent" />
            <div className="w-22 h-7 rounded-full bg-transparent" />
            <div className="w-16 h-7 rounded-full bg-transparent" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <div className="w-24 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
          </div>
        </div>
      </header>

      {/* ==========================================
          HERO SECTION SKELETON
          ========================================== */}
      <section className="relative overflow-hidden border-b border-neutral-200/90 dark:border-neutral-800 pt-16 sm:pt-24 pb-20">
        {/* Ambient Gradient Glows */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.15),transparent)]" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-amber-500/10 dark:bg-amber-600/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-600/5 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left Content (Span 7) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 animate-pulse" />
                <div className="w-36 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
              </div>

              {/* Big Headline */}
              <div className="space-y-3 mb-4">
                <div className="w-64 sm:w-80 h-8 sm:h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
                <div className="w-48 sm:w-60 h-6 sm:h-7 rounded-lg bg-neutral-200/80 dark:bg-neutral-800/80 animate-shimmer" />
              </div>

              {/* Bio Paragraph */}
              <div className="space-y-2.5 max-w-xl my-4">
                <div className="w-full h-3.5 rounded-md bg-neutral-200/75 dark:bg-neutral-800/75 animate-shimmer" />
                <div className="w-[92%] h-3.5 rounded-md bg-neutral-200/75 dark:bg-neutral-800/75 animate-shimmer" />
                <div className="w-[70%] h-3.5 rounded-md bg-neutral-200/75 dark:bg-neutral-800/75 animate-shimmer" />
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
                <div className="w-36 h-11 rounded-full bg-neutral-900/15 dark:bg-white/15 animate-shimmer" />
                <div className="w-32 h-11 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/40 animate-shimmer" />
              </div>

              {/* Proof Strip Metrics */}
              <div className="grid grid-cols-3 gap-3 mt-10 pt-6 border-t border-neutral-200/70 dark:border-neutral-800/70 max-w-lg">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/50">
                    <div className="w-12 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
                    <div className="w-16 h-2.5 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card Showcase (Span 5) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl shadow-xl">
                {/* Floating Avatar & Pulse */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-neutral-200 dark:bg-neutral-800 border-4 border-white dark:border-neutral-800 shadow-md animate-shimmer" />
                    <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500/40 border-2 border-white dark:border-neutral-900 animate-pulse" />
                  </div>
                  <div className="space-y-2 w-full flex flex-col items-center">
                    <div className="w-40 h-5 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
                    <div className="w-28 h-3.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800/70 animate-shimmer" />
                  </div>

                  {/* Badges and Chips */}
                  <div className="flex flex-wrap justify-center gap-2 mt-2 w-full">
                    <div className="w-20 h-6 rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 animate-shimmer" />
                    <div className="w-24 h-6 rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 animate-shimmer" />
                    <div className="w-16 h-6 rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 animate-shimmer" />
                  </div>

                  {/* Card bottom details */}
                  <div className="w-full pt-4 mt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
                    <div className="w-24 h-3 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                    <div className="w-16 h-3 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          WORKS SECTION SKELETON
          ========================================== */}
      <section className="py-20 border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="w-24 h-3 rounded-md bg-amber-500/40 dark:bg-amber-400/30 uppercase tracking-widest mb-2 animate-pulse" />
              <div className="w-56 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
              <div className="w-16 h-8 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
              <div className="w-20 h-8 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 p-5 flex flex-col gap-4 shadow-sm"
              >
                {/* Visual Banner placeholder */}
                <div className="w-full aspect-video rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />

                {/* Card Title & Meta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-4 rounded-md bg-neutral-200/80 dark:bg-neutral-800/80 animate-shimmer" />
                    <div className="w-14 h-3 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                  </div>
                  <div className="w-4/5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-shimmer" />
                  <div className="w-full h-3.5 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                </div>

                {/* Proof Seal Tag */}
                <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="w-28 h-6 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 animate-pulse" />
                  <div className="w-16 h-4 rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          CAPABILITIES & SKILLS SKELETON
          ========================================== */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="w-44 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-6 animate-shimmer" />
          <div className="flex flex-wrap gap-2.5 max-w-3xl">
            {[24, 20, 28, 16, 22, 32, 18, 26, 20].map((width, idx) => (
              <div
                key={idx}
                style={{ width: `${width * 4}px` }}
                className="h-8 rounded-full bg-neutral-200/80 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 animate-shimmer"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
