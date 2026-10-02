"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileCheck,
  ShieldCheck,
  Lock,
  Eye,
  GitBranch,
  Award,
  Video,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Reveal } from "./Reveal";

const EVIDENCE_CATEGORIES = [
  {
    id: "repos",
    label: "Code & Repos",
    format: "Git Commits & PR Diffs",
    privacy: "Public / Private Hash",
    sampleName: "clinic-intake-system/commit#8a3f9e",
    issuer: "GitHub / Git Tree Hash",
    detail: "Verifiable author signatures and test records without exposing proprietary code.",
    icon: GitBranch,
  },
  {
    id: "certs",
    label: "Certifications",
    format: "PDF with Digital Seal",
    privacy: "Verifiable Credential",
    sampleName: "Certified Public Accountant (CPA) Part II",
    issuer: "National Board of Accountants & Auditors",
    detail: "Tamper-proof credentials issued directly by accredited institutions.",
    icon: Award,
  },
  {
    id: "research",
    label: "Research & Data",
    format: "Data Notebooks & Preprints",
    privacy: "Open Access DOI",
    sampleName: "Microgrid Telemetry Dataset v2.4",
    issuer: "IEEE Research Repository",
    detail: "Open datasets and peer-reviewed preprint records with immutable timestamps.",
    icon: Database,
  },
  {
    id: "media",
    label: "Match & Video Reels",
    format: "Timestamped 4K Video",
    privacy: "Public Stream",
    sampleName: "U-20 Regional League Match 14",
    issuer: "Official League Scouting Board",
    detail: "Timestamped match plays linked directly to verified team sheets.",
    icon: Video,
  },
  {
    id: "docs",
    label: "Business Ledgers",
    format: "Anonymized Ledgers & Audits",
    privacy: "Privacy-Preserved ZK-Proof",
    sampleName: "VAT Reconciliation Model 2026",
    issuer: "Corporate Supervisory Board",
    detail: "Verify complex commercial achievements without revealing confidential data.",
    icon: Lock,
  },
];

const CHAIN = [
  { step: "Skill", desc: "Capability" },
  { step: "Work", desc: "Assignment" },
  { step: "Problem", desc: "Challenge" },
  { step: "Artifact", desc: "Proof File" },
  { step: "Outcome", desc: "Impact" },
];

export function ProofSection() {
  const [selectedCategory, setSelectedCategory] = useState(EVIDENCE_CATEGORIES[0]);

  const ActiveIcon = selectedCategory.icon;

  return (
    <section id="proof" className="relative overflow-hidden bg-paper-dim px-5 py-24 md:py-32">
      <div className="mx-auto max-w-full">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Chain of Proof & Concept */}
          <div className="lg:col-span-6 space-y-8">
            <Reveal>
              <div className="space-y-4">
                <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brass-dark">
                  <Sparkles className="h-3.5 w-3.5" />
                  Verifiable Provenance
                </p>
                <h2 className="font-display text-3xl text-ink-700 md:text-4xl">
                  Where is the proof?
                </h2>
                <p className="text-[17px] leading-relaxed text-slate">
                  That&apos;s the single question Home Proofolio is built to answer. Every claim links
                  to primary evidence — and sensitive files stay protected with granular privacy
                  controls, so your reputation remains verifiable without disclosing confidential data.
                </p>
              </div>
            </Reveal>

            {/* The 5-Step Chain of Evidence */}
            <Reveal delay={0.1}>
              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate">
                  The Immutable Chain of Evidence
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1">
                  {CHAIN.map((c, i) => (
                    <div
                      key={c.step}
                      className={`flex items-center ${i === CHAIN.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
                    >
                      <div className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 shadow-2xs text-center transition-all hover:border-brass hover:shadow-xs">
                        <span className="block font-display text-[13px] font-bold text-ink-700">
                          {c.step}
                        </span>
                        <span className="block text-[10px] text-slate">{c.desc}</span>
                      </div>
                      {i < CHAIN.length - 1 && (
                        <span className="hidden sm:inline mx-1 text-slate font-bold">&rarr;</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Visual preview frame */}
            <Reveal delay={0.2}>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline bg-paper shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/where-your-proof-comes-from.jpeg"
                  alt="Where your proof comes from"
                  width={1600}
                  height={1200}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="glass-panel-dark absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl px-3.5 py-2 text-paper">
                  <span className="text-[12px] font-medium">Real-World Evidence Sources</span>
                  <span className="text-[11px] text-mist-dim font-mono">100% Attributable</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Evidence Vault */}
          <div className="lg:col-span-6 space-y-6">
            <Reveal delay={0.15}>
              <div className="rounded-3xl border border-hairline/90 bg-paper p-4 sm:p-6 md:p-8 shadow-xl">
                {/* Vault Header */}
                <div className="flex items-start justify-between gap-3 border-b border-hairline/80 pb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg sm:text-xl text-ink-700">
                      Interactive Evidence Vault
                    </h3>
                    <p className="text-[12px] sm:text-[13px] text-slate mt-0.5">
                      Tap any evidence type to inspect verification details
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 shadow-2xs">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>

                {/* Evidence Type Pills: Mobile horizontal scroll & desktop wrap */}
                <div className="mt-4 -mx-1 px-1 flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap sm:overflow-visible">
                  {EVIDENCE_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${isSelected
                            ? "bg-ink text-paper shadow-xs"
                            : "bg-paper-dim border border-hairline text-slate hover:text-ink-700 hover:border-slate/40"
                          }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Live Verifiable Card Inspector */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCategory.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 rounded-2xl border border-hairline/80 bg-paper-dim/40 p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-brass shadow-sm">
                          <ActiveIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brass-dark">
                            Evidence File Spec
                          </span>
                          <h4 className="font-display text-[14px] sm:text-[16px] text-ink-700 break-words">
                            {selectedCategory.sampleName}
                          </h4>
                        </div>
                      </div>
                      <span className="self-start sm:self-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {selectedCategory.privacy}
                      </span>
                    </div>

                    <p className="text-[13px] sm:text-[14px] leading-relaxed text-slate">
                      {selectedCategory.detail}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-hairline/60 pt-3 text-[12px]">
                      <div className="flex items-center gap-1.5 text-slate">
                        <span className="font-medium text-ink-700">Format:</span>
                        <span>{selectedCategory.format}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate">
                        <span className="font-medium text-ink-700">Authority:</span>
                        <span>{selectedCategory.issuer}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Additional 8 accepted evidence chips */}
                <div className="mt-5 border-t border-hairline/70 pt-3.5">
                  <p className="text-[10px] font-bold text-slate uppercase tracking-wider mb-2">
                    Other Accepted Evidential Media
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Architecture Schematics",
                      "Automated Test Suites",
                      "UI Design Systems",
                      "Client Retainer SOWs",
                      "DOI Citations",
                      "Regulatory Approvals",
                      "Competition Trophies",
                      "Supervisory Sign-offs",
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-hairline/70 bg-paper px-2 py-0.5 text-[11px] font-medium text-slate shadow-2xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
