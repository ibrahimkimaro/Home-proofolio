"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Headset, Send, Sparkles, X } from "lucide-react";
import { fetchCurrentUser, fetchSupportAgent, type SupportAgent, type User } from "@/lib/api";
import { SupportChat, TypingDots } from "@/components/chat/SupportChat";

type Msg = { sender: "assistant" | "user"; text: string; action?: "signin" };

// "Is there a real person?" — hands the visitor to a live admin instead of a canned answer.
const WANTS_HUMAN = /\b(human|real person|real one|live (chat|support|agent)|support|admin|agent|someone|talk to|speak to|contact (us|support))\b/i;
const CHIPS = ["What is your tech stack?", "Show me problems you solved", "How much proof is there?", "Talk to a person"];

/**
 * Floating assistant. Answers questions about this portfolio instantly; anything that needs a person
 * (or the "Talk to a person" button) opens a live chat with a Home Proofolio admin.
 */
export function PortfolioAssistant({ owner, answer }: { owner: string; answer: (question: string) => string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"bot" | "live">("bot");
  const [msgs, setMsgs] = useState<Msg[]>([
    { sender: "assistant", text: `Hi! I can tell you about ${owner}'s work, problems solved and skills. Need a real person? Just ask, or tap “Talk to a person”.` },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [viewer, setViewer] = useState<User | null>(null);
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [first, setFirst] = useState<string | undefined>();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser().then(setViewer).catch(() => setViewer(null));
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, thinking, mode]);

  const say = (m: Msg) => setMsgs((p) => [...p, m]);

  async function handOff(question?: string) {
    if (!viewer) {
      say({ sender: "assistant", text: "Our team answers live chats from signed-in members. Sign in and I'll connect you right away.", action: "signin" });
      return;
    }
    setThinking(true);
    say({ sender: "assistant", text: "Connecting you with the Home Proofolio team…" });
    try {
      const a = await fetchSupportAgent();
      setAgent(a);
      setFirst(question);
      setTimeout(() => {
        setThinking(false);
        setMode("live");
      }, 900);
    } catch {
      setThinking(false);
      say({ sender: "assistant", text: "Support isn't available at the moment. Please try again shortly." });
    }
  }

  function ask(raw: string) {
    const q = raw.trim();
    if (!q || thinking) return;
    say({ sender: "user", text: q });
    setInput("");
    if (WANTS_HUMAN.test(q)) return void handOff(q === "Talk to a person" ? undefined : q);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      say({ sender: "assistant", text: answer(q) });
    }, 700);
  }

  const me = viewer && { id: viewer.id, name: viewer.fullname || viewer.username || "Member", username: viewer.username || "member" };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-600/30"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "x" : "s"}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.18 }}
            className="relative"
          >
            {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-[4.5rem] right-0 flex h-[520px] max-h-[80vh] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-[#15171e] sm:w-[390px]"
          >
            <div className="flex h-16 shrink-0 items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-white">
              {mode === "live" && (
                <button onClick={() => setMode("bot")} aria-label="Back to assistant" className="cursor-pointer rounded-lg p-1 hover:bg-white/15">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                {mode === "live" ? <Headset className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-none">{mode === "live" ? agent?.name : "Portfolio Assistant"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-white/85">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {mode === "live" ? "Live chat with our team" : "Instant answers"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>

            {mode === "live" && me && agent ? (
              <SupportChat me={me} topic={agent.topic} peerName="Support" firstText={first} />
            ) : (
              <>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-4 text-xs leading-relaxed">
                  <AnimatePresence initial={false}>
                    {msgs.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[84%] rounded-2xl px-3 py-2 font-medium ${
                            m.sender === "user"
                              ? "rounded-br-sm bg-emerald-600 text-white"
                              : "rounded-bl-sm border border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                          }`}
                        >
                          {m.text}
                          {m.action === "signin" && (
                            <Link href="/login" className="mt-2 block rounded-lg bg-emerald-600 px-3 py-1.5 text-center font-bold text-white hover:bg-emerald-500">
                              Sign in
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {thinking && (
                      <motion.div key="t" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex">
                        <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                          <TypingDots />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={bottom} />
                </div>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => ask(c)}
                      className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-0.5 ${
                        c === "Talk to a person"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => (e.preventDefault(), ask(input))} className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything…"
                    className="h-10 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 outline-none transition-colors focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    aria-label="Send"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
