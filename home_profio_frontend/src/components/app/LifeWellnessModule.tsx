"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  Sun,
  Moon,
  Scale,
  FlaskConical,
  Flame,
  Droplet,
  Footprints,
  Plus,
  TrendingUp,
  Award,
  Sparkles,
  Lock,
} from "lucide-react";

interface DailyPulseState {
  morningFocus: string;
  eveningReflection: string;
  sleepHours: number;
  waterGlasses: number;
  workoutMins: number;
  steps: number;
  energyLevel: number; // 1 - 5
}

interface Experiment {
  id: string;
  title: string;
  hypothesis: string;
  result?: string;
  status: "active" | "concluded";
}

const DEFAULT_PULSE: DailyPulseState = {
  morningFocus: "Ship the scalable Redis cache architecture and do a 40-min cardio run.",
  eveningReflection: "Cache hit ratio reached 96%. Discovered that TTL jitter prevents cache stampedes.",
  sleepHours: 7.5,
  waterGlasses: 7,
  workoutMins: 45,
  steps: 9850,
  energyLevel: 4,
};

const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: "exp-1",
    title: "6am Deep Work Sprint",
    hypothesis: "Morning cognitive focus will eliminate afternoon bug regressions.",
    result: "Shipped 2x more PRs with zero regressions over 14 days.",
    status: "concluded",
  },
  {
    id: "exp-2",
    title: "Zero Meeting Thursdays",
    hypothesis: "A continuous 8-hour focus block will accelerate product prototype completion by 3 days.",
    status: "active",
  },
];

export function LifeWellnessModule() {
  const [pulse, setPulse] = useState<DailyPulseState>(DEFAULT_PULSE);
  const [experiments, setExperiments] = useState<Experiment[]>(DEFAULT_EXPERIMENTS);
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpHypo, setNewExpHypo] = useState("");
  const [showAddExp, setShowAddExp] = useState(false);
  const [activeTab, setActiveTab] = useState<"wellness" | "pulse" | "balance" | "experiments">("wellness");

  // Load from localStorage if available
  useEffect(() => {
    try {
      const savedPulse = localStorage.getItem("hp_daily_pulse");
      if (savedPulse) setPulse(JSON.parse(savedPulse));
      const savedExp = localStorage.getItem("hp_experiments");
      if (savedExp) setExperiments(JSON.parse(savedExp));
    } catch {
      // ignore
    }
  }, []);

  const savePulse = (updated: DailyPulseState) => {
    setPulse(updated);
    try {
      localStorage.setItem("hp_daily_pulse", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const addExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpHypo.trim()) return;
    const item: Experiment = {
      id: `exp-${Date.now()}`,
      title: newExpTitle.trim(),
      hypothesis: newExpHypo.trim(),
      status: "active",
    };
    const updated = [item, ...experiments];
    setExperiments(updated);
    localStorage.setItem("hp_experiments", JSON.stringify(updated));
    setNewExpTitle("");
    setNewExpHypo("");
    setShowAddExp(false);
  };

  return (
    <div className="pf-surface w-full max-w-full rounded-2xl border border-hairline bg-paper p-5 sm:p-6 shadow-sm overflow-hidden">
      {/* Header with Privacy Indicator */}
      <div className="flex w-full max-w-full flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold text-ink-900">Life, Wellness &amp; Daily Pulse</h2>
            <span className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-semibold text-emerald-700">
              <Lock className="h-3 w-3" /> Private by Default
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-slate">
            The stamina, habits and personal experiments behind your verified achievements.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-lg border border-hairline bg-paper-dim p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("wellness")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition cursor-pointer ${activeTab === "wellness" ? "bg-paper text-ink shadow-sm" : "text-slate hover:text-ink"
              }`}
          >
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            <span>Vitality</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pulse")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition cursor-pointer ${activeTab === "pulse" ? "bg-paper text-ink shadow-sm" : "text-slate hover:text-ink"
              }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Daily Pulse</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("balance")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition cursor-pointer ${activeTab === "balance" ? "bg-paper text-ink shadow-sm" : "text-slate hover:text-ink"
              }`}
          >
            <Scale className="h-3.5 w-3.5 text-blue-500" />
            <span>Life Balance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("experiments")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition cursor-pointer ${activeTab === "experiments" ? "bg-paper text-ink shadow-sm" : "text-slate hover:text-ink"
              }`}
          >
            <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
            <span>Experiments</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-4">
        {/* ── 1. Wellness / Vitality Tab ── */}
        {activeTab === "wellness" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Workout */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-3.5">
                <div className="flex items-center justify-between text-xs text-slate">
                  <span className="flex items-center gap-1 font-semibold text-rose-600">
                    <Heart className="h-3.5 w-3.5" /> Workout
                  </span>
                  <span>Goal: 45m</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink-900">{pulse.workoutMins}</span>
                  <span className="text-xs text-slate">minutes</span>
                </div>
                <div className="mt-2.5 flex gap-1">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => savePulse({ ...pulse, workoutMins: m })}
                      className={`flex-1 rounded py-1 text-[11px] font-semibold cursor-pointer ${pulse.workoutMins === m ? "bg-rose-600 text-white" : "border border-hairline bg-paper text-slate hover:bg-paper-dim"
                        }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-3.5">
                <div className="flex items-center justify-between text-xs text-slate">
                  <span className="flex items-center gap-1 font-semibold text-indigo-600">
                    <Moon className="h-3.5 w-3.5" /> Sleep
                  </span>
                  <span className="text-emerald-600 font-medium">Optimal</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink-900">{pulse.sleepHours}</span>
                  <span className="text-xs text-slate">hours</span>
                </div>
                <div className="mt-2.5 flex gap-1">
                  {[6, 7, 7.5, 8.5].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => savePulse({ ...pulse, sleepHours: h })}
                      className={`flex-1 rounded py-1 text-[11px] font-semibold cursor-pointer ${pulse.sleepHours === h ? "bg-indigo-600 text-white" : "border border-hairline bg-paper text-slate hover:bg-paper-dim"
                        }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Hydration */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-3.5">
                <div className="flex items-center justify-between text-xs text-slate">
                  <span className="flex items-center gap-1 font-semibold text-cyan-600">
                    <Droplet className="h-3.5 w-3.5" /> Water
                  </span>
                  <span>Goal: 8 cups</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink-900">{pulse.waterGlasses}</span>
                  <span className="text-xs text-slate">glasses ({(pulse.waterGlasses * 0.25).toFixed(1)}L)</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => savePulse({ ...pulse, waterGlasses: Math.max(0, pulse.waterGlasses - 1) })}
                    className="h-6 w-6 rounded border border-hairline bg-paper text-xs font-bold text-slate hover:bg-paper-dim"
                  >
                    -
                  </button>
                  <div className="h-2 flex-1 rounded-full bg-paper overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, (pulse.waterGlasses / 8) * 100)}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => savePulse({ ...pulse, waterGlasses: pulse.waterGlasses + 1 })}
                    className="h-6 w-6 rounded border border-hairline bg-paper text-xs font-bold text-slate hover:bg-paper-dim"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Energy Level */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-3.5">
                <div className="flex items-center justify-between text-xs text-slate">
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <Flame className="h-3.5 w-3.5" /> Focus Energy
                  </span>
                  <span>{pulse.energyLevel >= 4 ? "Peak" : "Steady"}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink-900">{pulse.energyLevel}</span>
                  <span className="text-xs text-slate">/ 5 rating</span>
                </div>
                <div className="mt-2.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => savePulse({ ...pulse, energyLevel: level })}
                      className={`flex-1 rounded py-1 text-[11px] font-semibold cursor-pointer ${pulse.energyLevel === level ? "bg-amber-600 text-white" : "border border-hairline bg-paper text-slate hover:bg-paper-dim"
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Apple Watch & Wearable Sync Status */}
            <div className="flex items-center justify-between rounded-xl border border-hairline bg-paper p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-ink-900">Apple Watch &amp; Companion Ready</span>
                <span className="text-slate hidden sm:inline">&bull; Real-time HR: 152 BPM logged during workout</span>
              </div>
              <span className="text-slate font-medium">Daily Streak: 24 Days 🔥</span>
            </div>
          </div>
        )}

        {/* ── 2. Daily Pulse Tab ── */}
        {activeTab === "pulse" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Morning Focus */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                  <Sun className="h-4 w-4" />
                  <span>Morning Focus: What is your primary breakthrough today?</span>
                </div>
                <textarea
                  rows={3}
                  value={pulse.morningFocus}
                  onChange={(e) => savePulse({ ...pulse, morningFocus: e.target.value })}
                  placeholder="Set one clear intention for your work or learning today..."
                  className="mt-2 w-full rounded-lg border border-hairline bg-paper p-2.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <span className="text-[11px] text-slate">Tip: Connect this to an active milestone.</span>
              </div>

              {/* Evening Reflection */}
              <div className="rounded-xl border border-hairline bg-paper-dim p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                  <Moon className="h-4 w-4" />
                  <span>Evening Harvest: What did you accomplish or learn?</span>
                </div>
                <textarea
                  rows={3}
                  value={pulse.eveningReflection}
                  onChange={(e) => savePulse({ ...pulse, eveningReflection: e.target.value })}
                  placeholder="Record what you solved, learned, or improved..."
                  className="mt-2 w-full rounded-lg border border-hairline bg-paper p-2.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <span className="text-[11px] text-slate">Automatically captured into your personal Progress Journal.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Life Balance Tab ── */}
        {activeTab === "balance" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Deep Work", score: 90, color: "bg-blue-600" },
                { label: "Physical Health", score: 85, color: "bg-rose-600" },
                { label: "Active Learning", score: 80, color: "bg-purple-600" },
                { label: "Personal Growth", score: 75, color: "bg-emerald-600" },
                { label: "Community", score: 70, color: "bg-amber-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-hairline bg-paper-dim p-3.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate">{item.label}</span>
                    <span className="text-ink-900">{item.score}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-paper overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800">
              <strong>Equilibrium Analysis:</strong> Your physical vitality is actively supporting your engineering output this week. No burnout signals detected.
            </div>
          </div>
        )}

        {/* ── 4. Experiments Tab ── */}
        {activeTab === "experiments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-900">Personal Problem-Solving Experiments</span>
              <button
                type="button"
                onClick={() => setShowAddExp(!showAddExp)}
                className="flex items-center gap-1 text-xs font-semibold text-ink-800 hover:text-ink cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> New Experiment
              </button>
            </div>

            {showAddExp && (
              <form onSubmit={addExperiment} className="rounded-xl border border-hairline bg-paper-dim p-3.5 space-y-2">
                <input
                  type="text"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="Experiment title (e.g. 6am deep-work sprint)"
                  className="w-full rounded border border-hairline bg-paper p-2 text-xs text-ink-900"
                />
                <textarea
                  rows={2}
                  value={newExpHypo}
                  onChange={(e) => setNewExpHypo(e.target.value)}
                  placeholder="Hypothesis: 'I am testing whether [action] will result in [outcome]'..."
                  className="w-full rounded border border-hairline bg-paper p-2 text-xs text-ink-900"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddExp(false)}
                    className="rounded px-3 py-1 text-xs text-slate hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-ink px-4 py-1 text-xs font-semibold text-paper"
                  >
                    Save Experiment
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {experiments.map((exp) => (
                <div key={exp.id} className="rounded-xl border border-hairline bg-paper-dim p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ink-900">{exp.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${exp.status === "concluded" ? "bg-emerald-500/10 text-emerald-700" : "bg-purple-500/10 text-purple-700"
                      }`}>
                      {exp.status === "concluded" ? "Concluded" : "In Progress"}
                    </span>
                  </div>
                  <p className="text-xs text-slate leading-relaxed">
                    <strong>Hypothesis:</strong> {exp.hypothesis}
                  </p>
                  {exp.result && (
                    <p className="text-xs text-emerald-800 font-medium pt-1 border-t border-hairline">
                      <strong>Result:</strong> {exp.result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
