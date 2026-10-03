"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  Headset,
  HelpCircle,
  LogIn,
  MessageSquare,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { fetchCurrentUser, fetchSupportAgent, initGuestSupport, type SupportAgent, type User } from "@/lib/api";
import { getOrCreateGuestSessionId } from "@/lib/guest";
import { SupportChat } from "@/components/chat/SupportChat";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "about",
    category: "Platform",
    question: "What is Home Proofolio?",
    answer:
      "Home Proofolio is a verified professional identity platform for engineers, creators, and founders. Instead of unverified claims, you record real projects, solved problems, and cryptographic evidence backing your skills.",
  },
  {
    id: "verification",
    category: "Verification",
    question: "How do I verify my proof of work?",
    answer:
      "When publishing a work or solved problem, you can attach live repository URLs, demo endpoints, performance benchmarks, and certificate documents. Each entry has a Proof Checklist to establish credibility.",
  },
  {
    id: "portfolio",
    category: "Portfolio",
    question: "How do I set up and share my portfolio?",
    answer:
      "Navigate to your Profile to customize your headline, bio, and roles. Your public portfolio is available at /u/your-username and features responsive layouts and verified telemetry.",
  },
  {
    id: "support",
    category: "Support",
    question: "How do I contact admin support?",
    answer:
      "Click the 'Chat with Admin Support' button below. You will be connected in real-time with our administrative team for assistance with accounts, verification, and technical questions.",
  },
];

export function SupportAssistant() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"faq" | "live">("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("about");
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [viewer, setViewer] = useState<User | null>(null);
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [firstText, setFirstText] = useState<string | undefined>();
  const [guestMe, setGuestMe] = useState<{ id: string; name: string; username: string } | null>(null);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser().then(setViewer).catch(() => setViewer(null));
  }, []);

  async function connectToLiveSupport(initialQuestion?: string) {
    setConnecting(true);
    setErrorMsg(null);

    try {
      if (viewer) {
        const a = await fetchSupportAgent();
        setAgent(a);
      } else {
        const sessId = getOrCreateGuestSessionId();
        const data = await initGuestSupport(sessId);
        setAgent(data.agent);
        setGuestMe({ id: data.guest_id, name: data.name, username: data.username });
        setGuestToken(data.token);
      }
      setFirstText(initialQuestion);
      setMode("live");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Support is currently unavailable. Please try again shortly or contact support@homeproofolio.co.tz.";
      setErrorMsg(msg);
    } finally {
      setConnecting(false);
    }
  }

  function handleDirectQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || connecting) return;
    setInput("");
    connectToLiveSupport(q);
  }

  const activeMe = viewer
    ? {
        id: viewer.id,
        name: viewer.fullname || viewer.username || "Member",
        username: viewer.username || "member",
      }
    : guestMe;

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {/* Floating Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close support" : "Open support assistant"}
        className="group relative flex h-14 items-center gap-2.5 rounded-full bg-ink px-4 py-2 text-paper shadow-2xl transition-shadow hover:shadow-brass/20 cursor-pointer border border-hairline/40"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brass/20 text-brass">
          {open ? <X className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
        </span>
        <span className="text-[13px] font-semibold pr-1 hidden sm:inline-block">
          {open ? "Close" : "Support"}
        </span>
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
          </span>
        )}
      </motion.button>

      {/* Support Dialog */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-16 right-0 flex h-[580px] max-h-[85vh] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-hairline/90 bg-paper shadow-2xl sm:w-[420px]"
          >
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline/70 bg-paper-dim/80 px-4">
              <div className="flex items-center gap-3 min-w-0">
                {mode === "live" && (
                  <button
                    type="button"
                    onClick={() => setMode("faq")}
                    aria-label="Back to FAQs"
                    className="cursor-pointer rounded-lg p-1.5 text-slate hover:bg-paper hover:text-ink transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
                  <Headset className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink-800">
                    {mode === "live" ? (agent?.name || "Live Support") : "Support Assistant"}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {mode === "live" ? "Direct chat with Admin" : "Online • Help & Support"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded-lg p-1.5 text-slate hover:bg-paper hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {mode === "live" && activeMe && agent ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <SupportChat
                  me={activeMe}
                  topic={agent.topic}
                  peerName={agent.name}
                  firstText={firstText}
                  guestToken={guestToken}
                  className="flex-1"
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden bg-paper">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Clean Simple Greeting Card */}
                  <div className="rounded-2xl border border-hairline/80 bg-paper-dim/50 p-4 shadow-2xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-bold text-ink-900">
                        Hello! How can we help you?
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-slate">
                      Browse verified platform answers below or connect directly to chat with our admin team.
                    </p>

                    {/* Connect to Admin CTA Button */}
                    <div className="mt-3.5">
                      <button
                        type="button"
                        onClick={() => connectToLiveSupport()}
                        disabled={connecting}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-xs font-semibold text-paper shadow-2xs hover:bg-ink-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="h-4 w-4 text-brass" />
                        {connecting ? "Connecting to Support…" : "Chat with Admin Support"}
                      </button>
                    </div>

                    {errorMsg && (
                      <p className="mt-2 text-[11px] text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-200">
                        {errorMsg}
                      </p>
                    )}
                  </div>

                  {/* FAQ Table / Accordion */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate">
                        Frequently Asked Questions
                      </p>
                      <span className="text-[10px] text-slate font-medium">Verified info</span>
                    </div>

                    {/* Table View of FAQs */}
                    <div className="rounded-xl border border-hairline/80 overflow-hidden divide-y divide-hairline/60">
                      {FAQ_ITEMS.map((item) => {
                        const isOpen = expandedFaq === item.id;
                        return (
                          <div key={item.id} className="bg-paper transition-colors">
                            <button
                              type="button"
                              onClick={() => setExpandedFaq(isOpen ? null : item.id)}
                              className="w-full text-left p-3 flex items-center justify-between gap-2.5 hover:bg-paper-dim/40 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-brass-dark bg-brass/10 px-1.5 py-0.5 rounded">
                                  {item.category}
                                </span>
                                <span className="text-xs font-semibold text-ink-800 truncate">
                                  {item.question}
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-slate shrink-0 transition-transform duration-200 ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {isOpen && (
                              <div className="px-3.5 pb-3.5 pt-1 text-xs leading-relaxed text-slate bg-paper-dim/20">
                                <p>{item.answer}</p>
                                <div className="mt-2 pt-2 border-t border-hairline/40 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => connectToLiveSupport(item.question)}
                                    className="text-[11px] font-semibold text-brass-dark hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    Ask admin about this &rarr;
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auth shortcuts if guest */}
                  {!viewer && (
                    <div className="rounded-xl border border-hairline/60 bg-paper-dim/30 p-3 flex items-center justify-between">
                      <div className="text-[11px] text-slate font-medium">
                        Have an account?
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/login"
                          className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-800 hover:bg-paper-dim"
                        >
                          <LogIn className="h-3 w-3" /> Sign in
                        </Link>
                        <Link
                          href="/register"
                          className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper hover:bg-ink-700"
                        >
                          <UserPlus className="h-3 w-3" /> Register
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct question input bar */}
                <form
                  onSubmit={handleDirectQuestion}
                  className="flex items-center gap-2 border-t border-hairline/80 bg-paper p-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a question to ask admin support…"
                    className="flex-1 rounded-xl border border-hairline/80 bg-paper px-3 py-2 text-xs outline-none transition-colors focus:border-ink placeholder:text-slate"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || connecting}
                    aria-label="Send to support"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-paper transition-all hover:bg-ink-700 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
