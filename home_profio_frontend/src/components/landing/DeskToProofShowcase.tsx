"use client";

import {
  Layers,
  Award,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Reveal } from "./Reveal";

const ORBIT_STAGES = [
  { id: "AK", stage: "Learn", name: "Amin K.", role: "Senior Engineer", angle: 0, dot: "bg-amber-400" },
  { id: "JM", stage: "Think", name: "Juma M.", role: "Lead Designer", angle: 60, dot: "bg-purple-400" },
  { id: "SN", stage: "Build", name: "Sarah N.", role: "CPA Auditor", angle: 120, dot: "bg-sky-400" },
  { id: "RT", stage: "Solve", name: "Rashid T.", role: "Founder", angle: 180, dot: "bg-emerald-400" },
  { id: "ZB", stage: "Connect", name: "Zawadi B.", role: "Research Fellow", angle: 240, dot: "bg-rose-400" },
  { id: "DA", stage: "Grow", name: "Dr. Aisha", role: "Medical Fellow", angle: 300, dot: "bg-brass" },
];

export function DeskToProofShowcase() {
  return (
    <section id="pipeline" className="relative w-full min-w-0 overflow-hidden bg-paper px-4 sm:px-5 py-16 sm:py-24 md:py-32 border-t border-hairline/80">
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
              What begins on your desk as work drafts, verified credentials, and client deliverables transforms
              into an immutable living identity recognized across every profession, team, and accredited body.
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

              {/* Card 1: Project Drafts & Works */}
              <div
                className="animate-paper-lift flex items-center gap-3 rounded-2xl border border-hairline bg-paper-dim/80 p-3.5 sm:p-4 shadow-sm backdrop-blur transition-all"
                style={{ "--tilt": "-2deg", animationDelay: "0ms" } as React.CSSProperties}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20">
                  <Layers className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] sm:text-sm font-semibold text-ink-700 truncate">
                    Work Projects &amp; Drafts
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    designs, case studies, documents &amp; code
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
                    Licenses &amp; Diplomas
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    board certifications, degrees &amp; accreditations
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
                    Retainers &amp; Agreements
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    signed client proposals, grants &amp; retainers
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

          {/* Middle Column: The Spinning Orbiting Hub with Stages (Learn, Think, Build, Solve, Connect, Grow) */}
          <Reveal delay={0.2} className="w-full min-w-0">
            <div className="relative mx-auto flex h-72 w-72 sm:h-80 sm:w-80 shrink-0 items-center justify-center my-4 lg:my-0">
              {/* Concentric Aura Rings */}
              <span
                aria-hidden="true"
                className="animate-hub-ring absolute inset-2 sm:inset-4 rounded-full border border-brass/35"
              />
              <span
                aria-hidden="true"
                className="animate-hub-ring absolute inset-8 sm:inset-10 rounded-full border border-brass/20"
                style={{ animationDelay: "1.2s" }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-6 sm:inset-8 rounded-full bg-brass/10 blur-2xl"
              />

              {/* The Spinning Orbit Layer (28s rotation) with 6 stages evenly spaced */}
              <div className="animate-orbit absolute inset-0">
                {ORBIT_STAGES.map((node) => (
                  <span
                    key={node.stage}
                    className="absolute left-1/2 top-1/2 -ml-12 -mt-4.5 h-9 w-24 flex items-center justify-center"
                    style={{
                      transform: `rotate(${node.angle}deg) translateY(-6.4rem)`,
                    }}
                  >
                    {/* Counter-rotation to keep the badge permanently upright and readable */}
                    <span
                      title={`${node.name} (${node.role})`}
                      className="animate-orbit-counter flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-md ring-1 ring-brass/30 hover:scale-110 hover:border-brass transition-transform cursor-pointer backdrop-blur-md"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${node.dot}`} />
                      <span className="font-display tracking-tight text-[11px]">{node.stage}</span>
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
                <span className="font-display text-[10px] sm:text-[11px] font-bold text-ink-700 mt-1">
                  Proofolio
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[6px] sm:text-[9px] font-medium uppercase tracking-wider text-brass-dark">
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
                    Work Authenticated &amp; Signed
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    cryptographic audit proof #8a3f9e verified
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
                    Credentials Digitally Sealed
                  </span>
                  <span className="block text-[11px] text-slate truncate">
                    recognized by accredited boards &amp; institutions
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
                    primary evidence verifiable by clients &amp; teams
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
