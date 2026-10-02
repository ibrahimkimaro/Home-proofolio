"use client";

import {
  GitBranch,
  Award,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Reveal } from "./Reveal";

const ORBIT_MEMBERS = [
  { id: "AK", name: "Amin K.", role: "Senior Engineer", angle: 0 },
  { id: "JM", name: "Juma M.", role: "Lead Designer", angle: 72 },
  { id: "SN", name: "Sarah N.", role: "CPA Auditor", angle: 144 },
  { id: "RT", name: "Rashid T.", role: "Founder", angle: 216 },
  { id: "ZB", name: "Zawadi B.", role: "Research Fellow", angle: 288 },
];

export function DeskToProofShowcase() {
  return (
    <section id="pipeline" className="relative w-full  min-w-0 overflow-hidden bg-paper px-4 sm:px-5 py-16 sm:py-24 md:py-32 border-t border-hairline/80">
      <div className="max-w-full min-w-0">
        {/* Section Heading */}
        <Reveal className="w-full min-w-0">
          <div className="mx-auto max-w-3xl text-center space-y-3 sm:space-y-4 mb-12 sm:mb-16">
            <p className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-brass-dark">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Direct Pipeline
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-5xl text-ink-700 tracking-tight break-words">
              Do the work once. <span className="text-brass-dark">Proven everywhere.</span>
            </h2>
            <p className="text-[14px] sm:text-[16px] leading-relaxed text-slate max-w-2xl mx-auto">
              What begins on your desk as raw files, local commits, and paper certificates transforms
              into an immutable living identity recognized across every team, client, and accredited body.
            </p>
          </div>
        </Reveal>

        {/* 3-Column Pipeline: Desk -> Spinning Hub -> Verified Everywhere */}
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] w-full min-w-0">
          {/* Left Column: On the desk today */}
          <Reveal delay={0.1} className="w-full min-w-0">
            <div className="space-y-3.5 w-full min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate">
                On the desk today
              </p>

              {/* Card 1: Local Git Repo */}
              <div
                className="animate-paper-lift flex items-center gap-3 rounded-2xl border border-hairline bg-paper-dim/80 p-3.5 sm:p-4 shadow-sm backdrop-blur transition-all"
                style={{ "--tilt": "-2deg", animationDelay: "0ms" } as React.CSSProperties}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20">
                  <GitBranch className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Local Git Repository
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    unverified code & branch commits
                  </span>
                </span>
              </div>

              {/* Card 2: Certificate Paper */}
              <div
                className="animate-paper-lift flex items-center gap-3 rounded-2xl border border-hairline bg-paper-dim/80 p-3.5 sm:p-4 shadow-sm backdrop-blur transition-all"
                style={{ "--tilt": "1.5deg", animationDelay: "320ms" } as React.CSSProperties}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20">
                  <Award className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    PDF Exam Certificate
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    saved in local downloads folder
                  </span>
                </span>
              </div>

              {/* Card 3: Scope of Work */}
              <div
                className="animate-paper-lift flex items-center gap-3 rounded-2xl border border-hairline bg-paper-dim/80 p-3.5 sm:p-4 shadow-sm backdrop-blur transition-all"
                style={{ "--tilt": "-1deg", animationDelay: "640ms" } as React.CSSProperties}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Client Retainer Agreement
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    signed offline, unindexed
                  </span>
                </span>
              </div>

              {/* Animated Rail Connector to the Hub (desktop) */}
              <div className="relative hidden h-px bg-gradient-to-r from-hairline to-brass/40 lg:block mt-2">
                <span
                  className="animate-rail absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-brass"
                  style={{ animationDelay: "0ms", "--rail": "100%" } as React.CSSProperties}
                />
                <span
                  className="animate-rail absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-brass"
                  style={{ animationDelay: "320ms", "--rail": "100%" } as React.CSSProperties}
                />
                <span
                  className="animate-rail absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-brass"
                  style={{ animationDelay: "640ms", "--rail": "100%" } as React.CSSProperties}
                />
              </div>
            </div>
          </Reveal>

          {/* Middle Column: The Spinning Orbiting Hub with AK, JM, SN, RT, ZB */}
          <Reveal delay={0.2} className="w-full min-w-0">
            <div className="relative mx-auto flex h-60 w-60 sm:h-72 sm:w-72 shrink-0 items-center justify-center my-4 lg:my-0">
              {/* Concentric Aura Rings */}
              <span
                aria-hidden="true"
                className="animate-hub-ring absolute inset-4 sm:inset-6 rounded-full border border-brass/35"
              />
              <span
                aria-hidden="true"
                className="animate-hub-ring absolute inset-10 sm:inset-12 rounded-full border border-brass/20"
                style={{ animationDelay: "1.2s" }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-8 sm:inset-10 rounded-full bg-brass/10 blur-2xl"
              />

              {/* The Spinning Orbit Layer (26s rotation) */}
              <div className="animate-orbit absolute inset-0">
                {ORBIT_MEMBERS.map((member) => (
                  <span
                    key={member.id}
                    className="absolute left-1/2 top-1/2 -ml-4 -mt-4 h-8 w-8"
                    style={{
                      transform: `rotate(${member.angle}deg) translateY(-5.8rem)`,
                    }}
                  >
                    {/* Counter-rotation to keep the badge and initials permanently upright */}
                    <span
                      title={`${member.name} (${member.role})`}
                      className="animate-orbit-counter flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-paper text-[10px] font-bold text-ink-700 shadow-md ring-1 ring-brass/30 hover:scale-110 transition-transform cursor-pointer"
                    >
                      {member.id}
                    </span>
                  </span>
                ))}
              </div>

              {/* Center Brand Card */}
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-3xl border border-hairline bg-paper p-2.5 shadow-2xl z-10 transition-transform hover:scale-105">
                <Image
                  src="/images/home-profolio-logo.jpeg"
                  alt="Home Proofolio"
                  width={34}
                  height={34}
                  className="rounded-full object-cover shadow-2xs"
                />
                <span className="font-display text-[12px] sm:text-[13px] font-bold text-ink-700 mt-1">
                  Proofolio
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-medium uppercase tracking-wider text-brass-dark">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  one network
                </span>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Done once, everywhere */}
          <Reveal delay={0.3} className="w-full min-w-0">
            <div className="space-y-3.5 w-full min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate">
                Done once, everywhere
              </p>

              {/* Card 1: Commit Signed */}
              <div
                className="animate-record-in flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-sm transition-all"
                style={{ animationDelay: "0ms" }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Commit Merged & Signed
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    immutable tree hash #8a3f9e verified
                  </span>
                </span>
              </div>

              {/* Card 2: Digital Seal */}
              <div
                className="animate-record-in flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-sm transition-all"
                style={{ animationDelay: "320ms" }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Credential Digitally Sealed
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    verified by National Board
                  </span>
                </span>
              </div>

              {/* Card 3: Profile Live */}
              <div
                className="animate-record-in flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-sm transition-all"
                style={{ animationDelay: "640ms" }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass-dark ring-1 ring-inset ring-brass/30">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Proofolio Profile Live
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    primary evidence verifiable by anyone
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
