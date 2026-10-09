"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Sun,
  Moon,
  Scale,
  FlaskConical,
  TrendingUp,
  Flame,
  CheckCircle2,
  Droplet,
  Footprints,
  BatteryCharging,
  Sparkles,
  ShieldCheck,
  Award,
} from "lucide-react";

type FeatureTab = "wellness" | "pulse" | "balance" | "experiments" | "growth" | "challenges";

export function HolisticGrowthSection() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("wellness");

  return (
    <section className="relative overflow-hidden bg-[#060a0f] py-24 px-5 sm:px-10 lg:px-[8vw] text-white">
      {/* Subtle Background Glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[20%] h-[500px] w-[500px] rounded-full bg-[#1e4465]/20 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[15%] h-[400px] w-[400px] rounded-full bg-[#3d7a5a]/15 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header Badge & Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <Heart className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            <span>Beyond A Standard Portfolio</span>
          </div>

          <h2 className="mt-4 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-extrabold leading-[1.08] tracking-tight text-white">
            The Living Proof of Growth.
            <span className="mt-1 block bg-gradient-to-r from-[#90cbf5] via-[#a8e6cf] to-[#ffd3b6] bg-clip-text text-transparent">
              Mind, Craft & Wellness in One Space.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl  text-[15px] leading-relaxed text-white/70">
            Real excellence isn&apos;t just lines of code or certificates. It&apos;s the daily discipline, physical vitality,
            and experimental mindset of the human behind the work. 100% private and built for sustainable high performance.
          </p>
        </div>

        {/* Navigation Tabs - Clean, noiseless horizontal scroll on mobile, flex-wrap on desktop */}
        <div className="mt-8 sm:mt-10 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1.5 sm:flex-wrap sm:justify-center sm:gap-3 -mx-2 sm:mx-0">
          {[
            { id: "wellness", label: "Life & Wellness Tracker", shortLabel: "Wellness", icon: Heart },
            { id: "pulse", label: "Daily Pulse", shortLabel: "Daily Pulse", icon: Sun },
            { id: "balance", label: "Life Balance Radar", shortLabel: "Balance", icon: Scale },
            { id: "experiments", label: "Personal Experiments", shortLabel: "Experiments", icon: FlaskConical },
            { id: "growth", label: "Proof of Growth (Then vs Now)", shortLabel: "Growth", icon: TrendingUp },
            { id: "challenges", label: "Challenges & Milestones", shortLabel: "Challenges", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FeatureTab)}
                className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${isSelected
                  ? "bg-gradient-to-r from-[#24587c] to-[#1e785a] text-white shadow-[0_0_25px_-5px_rgba(30,120,90,0.6)] ring-1 ring-emerald-400/30"
                  : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-emerald-300" : "text-white/60"}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Showcase Card */}
        <div className="mt-8 rounded-3xl border border-white/15 bg-gradient-to-b from-[#0e1622]/90 to-[#080d14]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {activeTab === "wellness" && <WellnessView key="wellness" />}
            {activeTab === "pulse" && <PulseView key="pulse" />}
            {activeTab === "balance" && <BalanceView key="balance" />}
            {activeTab === "experiments" && <ExperimentsView key="experiments" />}
            {activeTab === "growth" && <GrowthView key="growth" />}
            {activeTab === "challenges" && <ChallengesView key="challenges" />}
          </AnimatePresence>
        </div>

        {/* Value Proposition Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-base font-bold text-white">Private by Default</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-white/65">
              Your health, sleep, and reflections are strictly private. You choose whether to share verified consistency badges or keep them for your eyes only.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <BatteryCharging className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-base font-bold text-white">Connected to Your Projects</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-white/65">
              Correlate deep work sessions with your sleep quality and energy levels to discover your peak productivity windows.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-base font-bold text-white">Wearable & Companion Ready</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-white/65">
              Designed to connect with Apple Watch, Garmin, and mobile widgets so tracking takes 10 seconds a day without context switching.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WellnessView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-12 items-center"
    >
      <div className="lg:col-span-5 space-y-4">
        <span className="inline-block rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">
          Integrated Apple Watch & Companion
        </span>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Track the Physical Stamina Behind Your Best Work.
        </h3>
        <p className="text-sm leading-relaxed text-white/70">
          Burnout happens when output disconnects from recovery. Home Proofolio logs your vital metrics alongside your project milestones, showing the full picture of a disciplined creator.
        </p>

        <ul className="space-y-2 text-xs text-white/80">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Workout & Movement (Strength, Running, Mobility)</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Restorative Sleep & Recovery Index</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Hydration & Daily Energy Check-in (1-5 scale)</span>
          </li>
        </ul>
      </div>

      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-black/60 p-4">
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="flex items-center gap-1 font-semibold">
              <Heart className="h-3.5 w-3.5 text-rose-400 animate-pulse" /> Apple Watch
            </span>
            <span className="text-[10px] text-white/50">Live</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">152</span>
            <span className="ml-1 text-xs text-rose-400 font-semibold">BPM</span>
          </div>
          <p className="mt-1 text-[11px] text-white/60">Peak Workout Zone</p>
          <div className="mt-3 flex items-end gap-1 h-6">
            {[40, 55, 75, 90, 85, 95, 70].map((v, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-rose-500" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-black/60 p-4">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="flex items-center gap-1 font-semibold">
              <Moon className="h-3.5 w-3.5 text-indigo-400" /> Sleep
            </span>
            <span className="text-[10px] text-emerald-400">92% Quality</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">7h 45m</span>
          </div>
          <p className="mt-1 text-[11px] text-white/60">Deep: 2h 10m • REM: 1h 50m</p>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: "88%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-black/60 p-4">
          <div className="flex items-center justify-between text-xs text-cyan-300">
            <span className="flex items-center gap-1 font-semibold">
              <Droplet className="h-3.5 w-3.5 text-cyan-400" /> Hydration
            </span>
            <span className="text-[10px] text-white/50">Goal: 3.0L</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">2.6L</span>
          </div>
          <p className="mt-1 text-[11px] text-white/60">8 / 10 glasses</p>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: "86%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-black/60 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1 font-semibold">
              <Footprints className="h-3.5 w-3.5 text-emerald-400" /> Steps
            </span>
            <span className="text-[10px] text-emerald-400">Done</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">11,420</span>
          </div>
          <p className="mt-1 text-[11px] text-white/60">Active Cal: 680 kcal</p>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-black/60 p-4">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1 font-semibold">
              <Flame className="h-3.5 w-3.5 text-amber-400" /> Daily Energy & Cognitive Focus
            </span>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              High Focus Mode
            </span>
          </div>
          <p className="mt-2 text-xs text-white/80">
            &quot;Morning run primed 4 hours of uninterrupted architecture and distributed systems modeling.&quot;
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/50">
            <span>Linked to: Cloud Infrastructure Launch</span>
            <span className="text-emerald-400 font-medium">● Milestone Shipped</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PulseView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-2 items-center"
    >
      <div>
        <span className="inline-block rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
          Morning & Evening Ritual
        </span>
        <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          The Two Minute Daily Pulse.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Start each morning with explicit intention, and close each evening with honest proof of what you accomplished, learned, or improved.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <Sun className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-white">Morning Focus (08:30)</h5>
              <p className="text-xs text-white/60">
                &quot;What is the ONE essential breakthrough I will deliver today?&quot;
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <Moon className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-white">Evening Harvest (20:30)</h5>
              <p className="text-xs text-white/60">
                &quot;What did I learn, solve, or refine? What failed and what does it teach me?&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/15 bg-black/60 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-white/90">Today&apos;s Active Pulse</span>
          </div>
          <span className="text-[11px] text-white/40">24-Day Streak 🔥</span>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            ☀️ Morning: Today&apos;s Primary Focus
          </label>
          <div className="mt-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white">
            Optimize database indexes on the proof ledger and complete 45-min cardio session before noon.
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
            🌙 Evening: Key Improvement & Proof
          </label>
          <div className="mt-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white">
            Reduced query latency by 42% on ledger lookups. Learned that composite index beat separate btree scans.
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] text-white/50">
          <span>Connected to: Database Scalability Project</span>
          <span className="text-emerald-400">Captured in Journal ✓</span>
        </div>
      </div>
    </motion.div>
  );
}

function BalanceView() {
  const categories = [
    { label: "Deep Work & Craft", score: 90, color: "#388ec2" },
    { label: "Physical Health & Fitness", score: 85, color: "#e85268" },
    { label: "Active Learning", score: 80, color: "#9254de" },
    { label: "Personal Growth & Rest", score: 70, color: "#52c41a" },
    { label: "Community & Relationships", score: 65, color: "#fa8c16" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-2 items-center"
    >
      <div>
        <span className="inline-block rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
          Burnout Prevention & Equilibrium
        </span>
        <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          Visual Life Balance Radar.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Great careers aren&apos;t built on sacrificing health or personal development. The Balance Radar tracks the 5 pillars of a thriving creator and warns you when one area is dangerously neglected.
        </p>

        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <strong>Optimal Harmony Detected:</strong> Health and Learning are reinforcing your Deep Work output this week.
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/15 bg-black/60 p-5 sm:p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">5-Pillar Balance Index</h4>
        {categories.map((c) => (
          <div key={c.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-white/80">{c.label}</span>
              <span className="font-bold text-white">{c.score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${c.score}%`, backgroundColor: c.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ExperimentsView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-2 items-center"
    >
      <div>
        <span className="inline-block rounded-md bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-300">
          Scientific Mindset for Builders
        </span>
        <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          Personal Experiments: Hypothesis → Lesson.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Don&apos;t just accumulate accomplishments—record what you test. Turn your workflow, code experiments, and lifestyle adjustments into actionable scientific notes.
        </p>
      </div>

      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-black/80 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="rounded bg-purple-500/20 px-2 py-0.5 font-bold text-purple-300">
            Experiment #14 • Concluded
          </span>
          <span className="text-white/40">14-Day Study</span>
        </div>

        <h4 className="text-base font-bold text-white">
          &quot;Testing whether 6am deep-work sprint outperforms late-night coding.&quot;
        </h4>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <span className="text-[10px] text-white/50 block uppercase font-semibold">Hypothesis</span>
            <p className="text-white/80 mt-1">Morning cortisol & fresh cognition will cut bug rate in half.</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <span className="text-[10px] text-emerald-400 block uppercase font-semibold">Result</span>
            <p className="text-white/90 mt-1">Shipped 2x more PRs with zero regressions over 14 days.</p>
          </div>
        </div>

        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2.5 text-xs text-purple-200">
          <strong>Key Lesson:</strong> Protect 06:30 - 09:30 unconditionally from meetings and social feeds.
        </div>
      </div>
    </motion.div>
  );
}

function GrowthView() {
  const [toggle, setToggle] = useState<"then" | "now">("now");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-2 items-center"
    >
      <div>
        <span className="inline-block rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          Evolutionary Timeline
        </span>
        <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          Proof of Growth: &quot;Then vs. Now&quot;.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Resumes only show a static title. Home Proofolio automatically captures snapshots of how your problem-solving velocity, physical habits, and codebase architecture evolved over 6, 12, or 24 months.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setToggle("then")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${toggle === "then" ? "bg-white text-black" : "border border-white/20 bg-white/5 text-white/70"
              }`}
          >
            6 Months Ago (Then)
          </button>
          <span className="text-xs text-white/40">vs.</span>
          <button
            type="button"
            onClick={() => setToggle("now")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${toggle === "now" ? "bg-emerald-400 text-black font-extrabold" : "border border-white/20 bg-white/5 text-white/70"
              }`}
          >
            Today (Now)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/60 p-5 sm:p-6 space-y-4">
        <div className="flex justify-between items-center text-xs text-white/60 border-b border-white/10 pb-2">
          <span>Snapshot Comparison</span>
          <span className="text-emerald-400 font-bold">{toggle === "now" ? "Active High-Performance State" : "Initial Foundation State"}</span>
        </div>

        {toggle === "now" ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <span className="font-bold text-emerald-300 block">Architecture Velocity: 3 Milestones / Week</span>
              <p className="text-white/80 mt-0.5">Distributed microservices, Rust & TypeScript, sub-20ms p99 latency.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <span className="font-bold text-emerald-300 block">Wellness Routine: 5x Week Cardio & Lift</span>
              <p className="text-white/80 mt-0.5">Sleep consistency 94%, resting HR reduced to 54 bpm.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <span className="font-bold text-emerald-300 block">Public Evidence: 48 Verified Proofs</span>
              <p className="text-white/80 mt-0.5">Cryptographically signed credentials, 4 open-source releases.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 opacity-70">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
              <span className="font-bold text-white/70 block">Architecture Velocity: 1 Milestone / Month</span>
              <p className="text-white/60 mt-0.5">Monolithic prototype with ad-hoc test coverage.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
              <span className="font-bold text-white/70 block">Wellness Routine: Irregular & High Stress</span>
              <p className="text-white/60 mt-0.5">Late night coding sprints, frequent burnout dips.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
              <span className="font-bold text-white/70 block">Public Evidence: 4 Basic Repos</span>
              <p className="text-white/60 mt-0.5">Unverified resume claims without verifiable proof artifacts.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChallengesView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 lg:grid-cols-2 items-center"
    >
      <div>
        <span className="inline-block rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
          Structured Mastery
        </span>
        <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          7-Day, 30-Day & 90-Day Challenges.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Habits form through uninterrupted cycles. Pick a challenge—whether it&apos;s &quot;30 Days of Rust&quot;, &quot;30 Days of Fitness&quot;, or &quot;14 Days of Networking Practice&quot;—and watch every day lock into your permanent verified ledger.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-black/60 p-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-amber-300">30 Days of System Design</span>
            <span className="text-emerald-400 font-semibold">Day 21 / 30 🔥</span>
          </div>
          <p className="text-xs text-white/70 mt-1">Publish 1 architectural breakdown daily.</p>
          <div className="mt-2.5 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: "70%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-black/60 p-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-300">30 Days of Fitness & Vitality</span>
            <span className="text-emerald-400 font-semibold">Day 28 / 30 🔥</span>
          </div>
          <p className="text-xs text-white/70 mt-1">Daily 45-min workout + 10,000 steps.</p>
          <div className="mt-2.5 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: "93%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 to-black/60 p-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-blue-300">14 Days of High-Value Networking</span>
            <span className="text-emerald-400 font-semibold">Completed 14/14 ✓</span>
          </div>
          <p className="text-xs text-white/70 mt-1">Connect with 1 industry peer and share a solution.</p>
          <div className="mt-2.5 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
