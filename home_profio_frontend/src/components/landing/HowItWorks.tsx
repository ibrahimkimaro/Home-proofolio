"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FilePlus,
  UserCheck,
  Activity,
  HelpCircle,
  CheckCircle2,
  Lock,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import { Reveal } from "./Reveal";

function Panel({
  children,
  badge,
  icon: Icon,
}: {
  children: React.ReactNode;
  badge: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-hairline/80 bg-paper-dim/80 p-4 sm:p-6 md:p-8 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/60 pb-3 mb-3.5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-brass-dark min-w-0">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{badge}</span>
        </div>
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate shrink-0">
          Interactive Mock
        </span>
      </div>
      {children}
    </div>
  );
}

function Pill({
  children,
  tone = "brass",
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "brass" | "berry" | "ink" | "emerald";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    brass: active ? "bg-brass text-ink font-bold shadow-xs" : "bg-brass/15 text-brass-dark hover:bg-brass/25",
    berry: active ? "bg-berry text-paper font-bold shadow-xs" : "bg-berry/15 text-berry hover:bg-berry/25",
    ink: active ? "bg-ink text-paper font-bold shadow-xs" : "bg-paper-dim text-slate hover:text-ink-700",
    emerald: active ? "bg-emerald-600 text-white font-bold shadow-xs" : "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] sm:text-[12px] font-medium transition-all cursor-pointer ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function InteractiveFormMock() {
  const [context, setContext] = useState<"school" | "opensource" | "client">("school");

  return (
    <Panel badge="Context-Aware Dynamic Form" icon={FilePlus}>
      <p className="text-[12px] sm:text-[13px] text-slate font-medium">Select Context:</p>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
        <Pill
          // tone="brass"
          active={context === "school"}
          onClick={() => setContext("school")}
        >
          School Capstone
        </Pill>
        <Pill
          // tone="emerald"
          active={context === "opensource"}
          onClick={() => setContext("opensource")}
        >
          Open-Source PR
        </Pill>
        <Pill
          // tone="berry"
          active={context === "client"}
          onClick={() => setContext("client")}
        >
          Commercial Work
        </Pill>
      </div>

      <div className="mt-3.5 space-y-2.5 rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-2xs">
        <div>
          <label className="text-[10px] sm:text-[11px] font-bold text-slate uppercase">Project Title</label>
          <div className="mt-1 rounded-lg border border-hairline/80 bg-paper-dim px-3 py-2 text-[12px] sm:text-[13px] font-medium text-ink-700 break-words">
            {context === "school"
              ? "Redesigned School Library Checkout System"
              : context === "opensource"
                ? "ClinicOS Offline Sync Queue Module"
                : "Enterprise VAT Ledger Audit Reconciliation"}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {context === "school" && (
            <motion.div
              key="school"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2 pt-1 border-t border-hairline/60"
            >
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-brass/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-brass-dark">
                  Academic: CS-402
                </span>
                <span className="rounded-md bg-brass/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-brass-dark">
                  Supervisor Sign-Off
                </span>
              </div>
              <p className="text-[11px] text-slate">
                3 academic fields revealed · Sensitive commercial fields remain hidden.
              </p>
            </motion.div>
          )}

          {context === "opensource" && (
            <motion.div
              key="opensource"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2 pt-1 border-t border-hairline/60"
            >
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700 break-all">
                  github.com/clinicos/core
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                  Merged PR #412
                </span>
              </div>
              <p className="text-[11px] text-slate">
                Git commits and author tokens verified automatically.
              </p>
            </motion.div>
          )}

          {context === "client" && (
            <motion.div
              key="client"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2 pt-1 border-t border-hairline/60"
            >
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-berry/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-berry">
                  Zero-Knowledge Proof
                </span>
                <span className="rounded-md bg-berry/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-berry">
                  NDA Protected Scope
                </span>
              </div>
              <p className="text-[11px] text-slate">
                Client privacy enforced — only verified outcome benchmarks are shared.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function InteractiveRolesMock() {
  const [activeRole, setActiveRole] = useState<"student" | "developer" | "founder">("developer");

  return (
    <Panel badge="One Person, Many Roles" icon={UserCheck}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="font-display text-base sm:text-lg text-ink-700">Amina Hassan</h4>
          <p className="text-[11px] sm:text-[12px] text-slate">One profile, linked to 3 independent sectors</p>
        </div>
        <span className="self-start sm:self-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">
          Verified Individual
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5 sm:gap-2">
        <Pill
          tone="brass"
          active={activeRole === "student"}
          onClick={() => setActiveRole("student")}
        >
          Accounting Degree
        </Pill>
        <Pill
          tone="emerald"
          active={activeRole === "developer"}
          onClick={() => setActiveRole("developer")}
        >
          Full-Stack Dev
        </Pill>
        <Pill
          tone="berry"
          active={activeRole === "founder"}
          onClick={() => setActiveRole("founder")}
        >
          Pharmacy Founder
        </Pill>
      </div>

      <div className="mt-3.5 rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-2xs">
        <AnimatePresence mode="wait">
          {activeRole === "student" && (
            <motion.div
              key="student"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <span className="text-[10px] font-bold uppercase text-brass-dark">Active Role Scope</span>
              <p className="text-[12px] sm:text-[13px] font-semibold text-ink-700">
                Bachelor of Commerce (Accounting) · Year 3
              </p>
              <p className="text-[11px] sm:text-[12px] text-slate">
                Coursework, statutory audit simulation reports, and Dean&apos;s list citations.
              </p>
            </motion.div>
          )}

          {activeRole === "developer" && (
            <motion.div
              key="developer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <span className="text-[10px] font-bold uppercase text-emerald-700">Active Role Scope</span>
              <p className="text-[12px] sm:text-[13px] font-semibold text-ink-700">
                Core Contributor @ ClinicOS &amp; SolarMesh
              </p>
              <p className="text-[11px] sm:text-[12px] text-slate">
                TypeScript, Rust microservices, SQLite offline databases, and peer-reviewed PRs.
              </p>
            </motion.div>
          )}

          {activeRole === "founder" && (
            <motion.div
              key="founder"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <span className="text-[10px] font-bold uppercase text-berry">Active Role Scope</span>
              <p className="text-[12px] sm:text-[13px] font-semibold text-ink-700">
                Operations Lead @ Afya Pharmacy Network
              </p>
              <p className="text-[11px] sm:text-[12px] text-slate">
                Inventory automation, statutory compliance with pharmacy board, and supplier contracts.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function InteractiveStatusMock() {
  const [items, setItems] = useState([
    { id: 1, label: "Garden IoT Sensor", status: "Building", progress: 65, tone: "brass" as const },
    { id: 2, label: "Tax Algorithm Benchmark", status: "Testing", progress: 90, tone: "emerald" as const },
    { id: 3, label: "Mobile Settlement Gateway", status: "Blocked", progress: 40, tone: "berry" as const },
  ]);

  const toggleStatus = (id: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus =
          item.status === "Blocked"
            ? "Building"
            : item.status === "Building"
              ? "Testing"
              : item.status === "Testing"
                ? "Done"
                : "Blocked";
        const nextProgress =
          nextStatus === "Blocked" ? 30 : nextStatus === "Building" ? 60 : nextStatus === "Testing" ? 85 : 100;
        const nextTone =
          nextStatus === "Done"
            ? "emerald"
            : nextStatus === "Testing"
              ? "emerald"
              : nextStatus === "Building"
                ? "brass"
                : "berry";
        return { ...item, status: nextStatus, progress: nextProgress, tone: nextTone };
      })
    );
  };

  return (
    <Panel badge="Honest Progress Status" icon={Activity}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <p className="text-[11px] sm:text-[12px] text-slate font-medium">Click any item to simulate progress</p>
        <span className="text-[10px] sm:text-[11px] font-mono text-brass-dark">No Fake Resumes</span>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {items.map((row) => (
          <div
            key={row.id}
            onClick={() => toggleStatus(row.id)}
            className="rounded-2xl border border-hairline bg-paper p-3 sm:p-3.5 shadow-2xs hover:border-slate/40 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-[12px] sm:text-[13px]">
              <span className="font-medium text-ink-700 min-w-0 flex-1 truncate pr-1">{row.label}</span>
              <Pill tone={row.tone} active={true}>
                {row.status}
              </Pill>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
                <div
                  className={`h-full transition-all duration-500 ${row.tone === "emerald"
                    ? "bg-emerald-500"
                    : row.tone === "brass"
                      ? "bg-brass"
                      : "bg-berry"
                    }`}
                  style={{ width: `${row.progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate">{row.progress}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-slate">
        In-progress work is transparently tracked as building or testing.
      </p>
    </Panel>
  );
}

function InteractiveProblemMock() {
  const [solutionAccepted, setSolutionAccepted] = useState(true);

  return (
    <Panel badge="Decoupled Attribution" icon={HelpCircle}>
      <div className="rounded-2xl border border-hairline bg-paper p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-berry/15 px-2 py-0.5 text-[10px] font-bold text-berry">
            Open Problem #89
          </span>
          <span className="text-[11px] text-slate">Muhimbili Clinic</span>
        </div>
        <h4 className="mt-2 font-display text-[13px] sm:text-[15px] text-ink-700 break-words">
          Clinic intake queue loses emergency patient notes between shift handoffs.
        </h4>
        <div className="mt-2.5 flex items-center gap-2.5 text-[11px] sm:text-[12px] text-slate">
          <span>4 proposals</span>
          <span>&middot;</span>
          <span className="text-emerald-700 font-semibold">1 Accepted Solution</span>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[11px] sm:text-[12px] font-bold text-emerald-800 truncate">
              Accepted Solver: Amina Hassan
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSolutionAccepted((v) => !v)}
            className="text-[11px] text-emerald-700 underline font-medium cursor-pointer shrink-0"
          >
            {solutionAccepted ? "Hide Diff" : "Show Diff"}
          </button>
        </div>

        {solutionAccepted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] sm:text-[12px] text-emerald-900 space-y-1"
          >
            <p className="font-mono text-[10px] sm:text-[11px] text-emerald-700 break-words">
              PR #402: Added local indexedDB storage + TLS background sync.
            </p>
            <p className="text-[11px] text-slate">
              Direct public attribution awarded to the verified solver.
            </p>
          </motion.div>
        )}
      </div>
    </Panel>
  );
}

const ROWS = [
  {
    eyebrow: "Adding Work",
    title: "Start small, expand as you go",
    body: "Pick your work type and only relevant fields appear — zero clutter, zero friction.",
    mock: <InteractiveFormMock />,
  },
  {
    eyebrow: "Your Identity",
    title: "One individual, multiple disciplines",
    body: "Link achievements across roles and institutions into one permanent, verified profile.",
    mock: <InteractiveRolesMock />,
  },
  {
    eyebrow: "Work in Progress",
    title: "Honest status, without false claims",
    body: "Every milestone reflects verifiable truth — whether building, testing, or completed.",
    mock: <InteractiveStatusMock />,
  },
  {
    eyebrow: "Problem Solving",
    title: "Solve authentic challenges collaboratively",
    body: "Solve real-world organizational challenges and earn direct verified attribution.",
    mock: <InteractiveProblemMock />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-paper px-4 sm:px-5 py-16 sm:py-14 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-brass-dark">
              <Sparkles className="h-3.5 w-3.5" />
              The Mechanism
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl text-ink-700">
              How Home Proofolio Works
            </h2>
            <p className="mt-3 text-[11px] sm:text-[11px] leading-relaxed text-slate">
              Experience the core interactions that separate proof from claims. Try the interactive
              cards below to test how the system captures and verifies work.
            </p>
          </div>
        </Reveal>

        <div className="mt-5 sm:mt-16 flex flex-col gap-12 sm:gap-20 md:gap-28">
          {ROWS.map((row, i) => (
            <Reveal key={row.title}>
              <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <p className="text-[12px] sm:text-[12px] font-medium text-berry">{row.eyebrow}</p>
                  <h3 className="mt-2 font-display text-[15px] sm:text-2xl md:text-3xl text-ink-700">
                    {row.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-[12px] sm:text-[15px] leading-relaxed text-slate">
                    {row.body}
                  </p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>{row.mock}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
