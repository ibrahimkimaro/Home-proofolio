"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Lightbulb,
  Hammer,
  Wrench,
  ShieldCheck,
  Share2,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Reveal } from "./Reveal";

const STAGES = [
  {
    step: "01",
    word: "Learn",
    icon: BookOpen,
    tagline: "Capture discoveries early",
    detail: "Save research sources, reading notes, and initial questions as you explore.",
    evidence: "Study Notes · Citations · References",
    image: "/images/learn.jpeg",
    accent: "brass",
  },
  {
    step: "02",
    word: "Think",
    icon: Lightbulb,
    tagline: "Frame clear hypotheses",
    detail: "Structure problem definitions and design specs before writing code.",
    evidence: "Design Specs · RFCs · Work Plans",
    image: "/images/think.jpeg",
    accent: "berry",
  },
  {
    step: "03",
    word: "Build",
    icon: Hammer,
    tagline: "Create primary artifacts",
    detail: "Produce the code, circuits, drafts, or models that prove your execution.",
    evidence: "Git Commits · Schematics · Datasets",
    image: "/images/build.jpeg",
    accent: "brass",
  },
  {
    step: "04",
    word: "Solve",
    icon: Wrench,
    tagline: "Overcome real constraints",
    detail: "Tackle real-world problems and earn transparent attribution for solutions.",
    evidence: "Merged PRs · Fixes · Benchmarks",
    image: "/images/solve.jpeg",
    accent: "berry",
  },
  {
    step: "05",
    word: "Prove",
    icon: ShieldCheck,
    tagline: "Anchor verifiable evidence",
    detail: "Back every claim with cryptographically signed certificates and audit logs.",
    evidence: "Digital Seals · Certs · Audit Logs",
    image: "/images/Prove.jpeg",
    accent: "brass",
  },
  {
    step: "06",
    word: "Connect",
    icon: Share2,
    tagline: "Link across mentors & teams",
    detail: "Connect verified work to the peers, institutions, and clients who attest to it.",
    evidence: "Endorsements · Attestations · Co-authors",
    image: "/images/Connect.jpeg",
    accent: "berry",
  },
  {
    step: "07",
    word: "Grow",
    icon: TrendingUp,
    tagline: "Compound your credibility",
    detail: "Build a permanent, self-evident career record without resume inflation.",
    evidence: "Proof Timeline · Verifiable Reputation",
    image: "/images/verification_flow.jpg",
    accent: "brass",
  },
];

export function JourneyShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const activeStage = STAGES[activeIndex];
  const Icon = activeStage.icon;

  return (
    <section id="showcase" className="relative overflow-hidden bg-paper px-4 sm:px-5 py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-medium text-brass-dark">
                <Sparkles className="h-3.5 w-3.5" />
                The Core Journey
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl text-ink-700">
                Every proofolio follows an authentic continuum.
              </h2>
            </div>
            <p className="max-w-md text-[14px] sm:text-[15px] leading-relaxed text-slate">
              From the initial spark to peer-verified evidence, discover how each stage creates
              verifiable credibility without resume fluff.
            </p>
          </div>
        </Reveal>

        {/* Apple-grade Interactive Stage Timeline Selector */}
        <div className="mt-8 sm:mt-12 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-hairline/80 pb-3 min-w-max">
            {STAGES.map((s, idx) => {
              const StageIcon = s.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={s.word}
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveIndex(idx);
                  }}
                  className={`group relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-sm font-medium transition-all cursor-pointer ${isActive
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-paper-dim/60 text-slate hover:bg-paper-dim hover:text-ink-700"
                    }`}
                >
                  <span
                    className={`font-mono text-[10px] sm:text-[11px] font-semibold ${isActive ? "text-brass" : "text-slate/70"
                      }`}
                  >
                    {s.step}
                  </span>
                  <StageIcon
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${isActive ? "text-brass" : "text-slate/60 group-hover:text-ink-700"
                      }`}
                  />
                  <span>{s.word}</span>

                  {isActive && (
                    <motion.div
                      layoutId="active-journey-indicator"
                      className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-ink"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Spotlight Card */}
        <div className="mt-8 sm:mt-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-hairline/80 bg-paper-dim/40 shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage.word}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-center gap-6 p-4 sm:p-6 md:grid-cols-12 md:gap-12 md:p-10"
            >
              {/* Left Column: Stage Detail & Evidence Box */}
              <div className="space-y-6 md:col-span-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper shadow-sm">
                    <Icon className="h-5 w-5 text-brass" />
                  </span>
                  <div>
                    <span className="font-mono text-[12px] font-bold text-brass-dark">
                      STAGE {activeStage.step} OF 07
                    </span>
                    <h3 className="font-display text-3xl text-ink-700 md:text-4xl">
                      {activeStage.word}
                    </h3>
                  </div>
                </div>

                <p className="text-[17px] font-medium text-ink-700">
                  {activeStage.tagline}
                </p>

                <p className="text-[15px] leading-relaxed text-slate">
                  {activeStage.detail}
                </p>

                {/* Evidence Artifact Pill Box */}
                <div className="rounded-2xl border border-hairline bg-paper p-3.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate">
                    Tangible Evidence Produced
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeStage.evidence.split(" · ").map((e) => (
                      <span
                        key={e}
                        className="rounded-md bg-paper-dim px-2 py-0.5 text-[11px] font-medium text-ink-700"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Navigation arrows */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setActiveIndex((prev) => (prev > 0 ? prev - 1 : STAGES.length - 1));
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-paper text-ink-700 shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label="Previous stage"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setActiveIndex((prev) => (prev + 1) % STAGES.length);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-paper text-ink-700 shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label="Next stage"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="text-[12px] text-slate font-medium">
                    Use arrows or click stages to explore
                  </span>
                </div>
              </div>

              {/* Right Column: Visual Showcase Frame */}
              <div className="md:col-span-7">
                <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-hairline bg-paper shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeStage.image}
                    alt={activeStage.word}
                    width={1600}
                    height={1200}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Glassmorphic Stage Label Overlay */}
                  <div className="glass-panel-dark absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-paper">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-brass animate-pulse" />
                      <span className="text-[13px] font-medium">
                        Stage {activeStage.step}: {activeStage.word} in Action
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-mist-dim">
                      Proofolio Record #0{activeIndex + 1}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stage mini-card grid for instant scanability */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAGES.map((stage, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={stage.word}
                type="button"
                onClick={() => {
                  setIsAutoPlaying(false);
                  setActiveIndex(idx);
                }}
                className={`apple-card-hover group flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${isSelected
                    ? "border-brass bg-paper ring-2 ring-brass/20 shadow-md"
                    : "border-hairline bg-paper/60 hover:bg-paper hover:border-slate/40"
                  }`}
              >
                <span className="font-mono text-[10px] font-bold text-slate">
                  {stage.step}
                </span>
                <span
                  className={`mt-1 font-display text-[14px] ${isSelected ? "text-ink-700 font-bold" : "text-slate group-hover:text-ink-700"
                    }`}
                >
                  {stage.word}
                </span>
                <span className="mt-1 line-clamp-1 text-[11px] text-slate/70">
                  {stage.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
