"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  Code2,
  Palette,
  Trophy,
  Microscope,
  Briefcase,
  Building,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Reveal } from "./Reveal";

const ROLES = [
  {
    id: "students",
    icon: GraduationCap,
    name: "Students & Learners",
    detail: "Verify capstones, coursework, and early projects before graduation.",
    sampleProof: "Capstones · Coursework · Diplomas",
    accent: "brass",
  },
  {
    id: "engineers",
    icon: Code2,
    name: "Developers & Engineers",
    detail: "Ship verified code commits, architectural RFCs, and test suites.",
    sampleProof: "Git Commits · RFCs · Systems",
    accent: "emerald",
  },
  {
    id: "creators",
    icon: Palette,
    name: "Designers & Creators",
    detail: "Showcase design systems, user research, and prototype specs.",
    sampleProof: "Design Systems · Research · UX",
    accent: "berry",
  },
  {
    id: "athletes",
    icon: Trophy,
    name: "Athletes & Players",
    detail: "Track verified match footage, stats, and coach attestations.",
    sampleProof: "Match Reels · Stats · Sign-offs",
    accent: "brass",
  },
  {
    id: "researchers",
    icon: Microscope,
    name: "Researchers & Academics",
    detail: "Index preprints, datasets, and peer-reviewed methodologies.",
    sampleProof: "Preprints · Datasets · Papers",
    accent: "emerald",
  },
  {
    id: "founders",
    icon: Building,
    name: "Founders & Builders",
    detail: "Prove company milestones, business traction, and filings.",
    sampleProof: "Filings · Milestones · Audits",
    accent: "berry",
  },
  {
    id: "professionals",
    icon: Briefcase,
    name: "Professionals",
    detail: "Document career impact and leadership with signed references.",
    sampleProof: "Briefs · References · Impact",
    accent: "brass",
  },
];

export function WhoItsFor() {
  const [selectedRole, setSelectedRole] = useState<string>("students");

  return (
    <section id="who-its-for" className="relative overflow-hidden bg-paper-dim/60 px-4 sm:px-5 py-16 sm:py-24 md:py-32">
      {/* Background ambient accents */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <div className="dotgrid absolute inset-0 opacity-30" />
      </div>

      <div className="relative mx-auto max-w-full">
        <Reveal>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-berry">
                <Sparkles className="h-3.5 w-3.5" />
                Universal Attribution
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl text-ink-700">
                One identity. Any discipline.
              </h2>
            </div>
            <p className="max-w-md text-[14px] sm:text-[16px] leading-relaxed text-slate">
              Home Proofolio doesn&apos;t assume you only write code. A person holds multiple roles
              and real craft across industries — one verified profile carries them all.
            </p>
          </div>
        </Reveal>

        {/* Roles Grid Cards */}
        <div className="mt-10 sm:mt-14 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role, idx) => {
            const Icon = role.icon;
            const isHovered = selectedRole === role.id;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                onClick={() => setSelectedRole(role.id)}
                className={`apple-card-hover group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-6 transition-all cursor-pointer ${isHovered
                    ? "border-ink-700/40 apple-glass-frosted shadow-xl ring-1 ring-ink-700/10"
                    : "border-hairline/80 bg-paper/75 backdrop-blur-xl hover:bg-paper/95 shadow-2xs hover:shadow-md"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${role.accent === "brass"
                          ? "bg-brass/15 text-brass-dark"
                          : role.accent === "emerald"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-berry/15 text-berry"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-paper-dim text-slate group-hover:bg-ink group-hover:text-paper transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-lg sm:text-xl text-ink-700 group-hover:text-black">
                    {role.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] sm:text-[14px] text-slate">
                    {role.detail}
                  </p>
                </div>

                <div className="mt-4 border-t border-hairline/60 pt-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {role.sampleProof.split(" · ").map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-paper-dim px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Special 8th Card: The Unified Identity Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.35 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-br from-ink/95 via-ink-800/95 to-ink-900/95 backdrop-blur-2xl p-4 sm:p-6 text-paper shadow-2xl sm:col-span-2 lg:col-span-2 ring-1 ring-white/10"
          >
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-brass">
                <Sparkles className="h-3.5 w-3.5" />
                Cross-Disciplinary Profile
              </span>
              <h3 className="font-display text-2xl text-paper">
                You are more than a one-line job title.
              </h3>
              <p className="text-[14px] leading-relaxed text-mist max-w-xl">
                Hold degrees, code projects, volunteering, and research in one verifiable place — without juggling separate resumes.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-mist-dim border-t border-white/10 pt-3">
              <span className="font-medium text-paper">Direct shareable links</span>
              <span>&middot;</span>
              <span className="text-brass">Zero resume fluff</span>
              <span>&middot;</span>
              <span>Cryptographic provenance</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
