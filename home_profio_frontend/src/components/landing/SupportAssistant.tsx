"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Headset,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { fetchCurrentUser, fetchSupportAgent, initGuestSupport, type SupportAgent, type User } from "@/lib/api";
import { getOrCreateGuestSessionId, readGuestMemory, rememberGuestName, touchGuest, type GuestMemory } from "@/lib/guest";
import { OPEN_SUPPORT_EVENT } from "@/lib/support-ui";
import { SupportChat } from "@/components/chat/SupportChat";
import { SupportAiChat } from "./SupportAiChat";

export function SupportAssistant() {
  const [open, setOpen] = useState(false);
  // "ai": the AI assistant answers first. "faq": the visitor asked for a person (we may ask their name). "live": chat with the team.
  const [mode, setMode] = useState<"ai" | "faq" | "live">("ai");
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [viewer, setViewer] = useState<User | null>(null);
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [firstText, setFirstText] = useState<string | undefined>();
  const [guestMe, setGuestMe] = useState<{ id: string; name: string; username: string } | null>(null);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);

  // Guests: who they said they are (remembered in this browser)
  const [memory, setMemory] = useState<GuestMemory & { daysAway: number }>({ name: null, lastSeen: null, daysAway: 0 });
  const [skippedIntro, setSkippedIntro] = useState(false);
  const [iName, setIName] = useState("");
  const [iEmail, setIEmail] = useState("");

  useEffect(() => {
    // Read what we remember (browser storage, so after the first render), then note this visit,
    // so the greeting can say how long it's been.
    Promise.resolve().then(() => {
      const m = readGuestMemory();
      setMemory({ ...m, daysAway: m.lastSeen ? Math.floor((Date.now() - m.lastSeen) / 86_400_000) : 0 });
      touchGuest();
    });
  }, []);

  useEffect(() => {
    fetchCurrentUser().then(setViewer).catch(() => setViewer(null));
  }, []);

  // Once they ask for a person: if we know who they are (member, returning guest with a name, or they skipped
  // the intro), connect straight to the live chat instead of showing the name form.
  useEffect(() => {
    if (open && mode === "faq" && (viewer || memory.name || skippedIntro) && !connecting && !errorMsg) {
      connectToLiveSupport();
    }
  }, [open, viewer, memory.name, skippedIntro, mode, connecting, errorMsg]);

  // Other parts of the page can open this assistant with a question already written (see lib/support-ui).
  const connectRef = useRef<(q?: string) => void>(() => { });
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      setMode((m) => (m === "live" ? m : "faq")); // these messages are for the team, not the AI
      connectRef.current((e as CustomEvent<{ text?: string }>).detail?.text);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  async function connectToLiveSupport(initialQuestion?: string, who?: { name?: string; email?: string }) {
    setConnecting(true);
    setErrorMsg(null);

    try {
      if (viewer) {
        const a = await fetchSupportAgent();
        setAgent(a);
      } else {
        const sessId = getOrCreateGuestSessionId();
        const data = await initGuestSupport(sessId, who?.name || memory.name || undefined, who?.email);
        setAgent(data.agent);
        setGuestMe({ id: data.guest_id, name: data.display_name || data.name, username: data.username });
        setGuestToken(data.token);
        if (data.display_name) {
          rememberGuestName(data.display_name);
          setMemory((m) => ({ ...m, name: data.display_name }));
        }
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

  /** Start a live chat. A guest we don't know yet is asked what to call them first. */
  function ask(question?: string) {
    if (!viewer && !memory.name && !skippedIntro) {
      return;
    }
    connectToLiveSupport(question);
  }

  // Keep the event listener pointed at the latest version (it reads viewer and memory state).
  useEffect(() => {
    connectRef.current = ask;
  });

  const firstName = (viewer?.fullname || viewer?.username || "").trim().split(" ")[0];
  const daysAway = memory.daysAway;
  const greeting = viewer
    ? { title: `Hello, ${firstName || "there"}! 👋`, sub: "How can we help you today? Chat directly with our team." }
    : memory.name
      ? {
        title: `Welcome back, ${memory.name}! 👋`,
        sub:
          daysAway >= 1
            ? `It's been ${daysAway} day${daysAway === 1 ? "" : "s"}. We're glad you're back. How can we help today?`
            : "Good to see you again. Send us a message and we'll reply right away.",
      }
      : { title: "How can we help you?", sub: "Enter your name and message below to chat directly with our team." };

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
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed inset-x-3 bottom-4 top-16 z-50 flex flex-col overflow-hidden rounded-3xl border border-hairline/90 bg-paper shadow-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:bottom-16 sm:right-0 sm:h-[580px] sm:max-h-[85vh] sm:w-[420px] sm:rounded-2xl"
            >
              {/* Sticky Header - never hidden on phone */}
              <div className="sticky top-0 z-20 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-hairline/70 bg-paper-dim/95 backdrop-blur-md px-3.5 sm:px-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {mode !== "ai" && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode("ai");
                      }}
                      aria-label="Back to the assistant"
                      className="cursor-pointer rounded-lg p-1.5 text-slate hover:bg-paper hover:text-ink transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
                    {mode === "ai" ? <Sparkles className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] sm:text-[14px] font-bold text-ink-800">
                      {mode === "live" ? (agent?.name || "Live Support") : mode === "ai" ? "Proofolio Assistant" : "Talk to our team"}
                    </p>
                    <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {mode === "live" ? "Direct chat with Admin" : mode === "ai" ? "AI assistant • instant answers" : "Online • Help & Support"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="cursor-pointer rounded-xl p-2 text-slate hover:bg-paper hover:text-ink transition-colors active:scale-95"
                >
                  <X className="h-4 w-4 sm:h-4 sm:w-4" />
                </button>
              </div>

              {/* Body */}
              {mode === "ai" ? (
                <SupportAiChat name={firstName || memory.name} onHuman={() => setMode("faq")} />
              ) : mode === "live" && activeMe && agent ? (
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
              ) : connecting ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-paper">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brass border-t-transparent mb-3" />
                  <p className="text-sm font-semibold text-ink-900">Connecting to Support…</p>
                  <p className="text-xs text-slate mt-1">Opening direct conversation with our team</p>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-paper">
                  <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 mb-3 max-w-xs">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => connectToLiveSupport()}
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper shadow-2xs hover:bg-ink-700 transition cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden bg-paper">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {/* Clean Friendly Greeting */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm sm:text-base font-bold text-ink-900">{greeting.title}</h3>
                    </div>
                    <p className="text-xs leading-relaxed text-slate">{greeting.sub}</p>

                    {/* Immediate Friendly Onboarding Form for First-Time Guests */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const name = iName.trim();
                        if (!name || connecting) return;
                        connectToLiveSupport(undefined, {
                          name,
                          email: iEmail.trim() || undefined,
                        });
                      }}
                      className="mt-4 space-y-3"
                    >
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate mb-1">
                          Your Name <span className="text-brass-dark">*</span>
                        </label>
                        <input
                          autoFocus
                          required
                          value={iName}
                          onChange={(e) => setIName(e.target.value)}
                          maxLength={50}
                          autoComplete="name"
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full rounded-xl border border-hairline/80 bg-paper-dim/40 px-3.5 py-2.5 text-sm sm:text-xs text-ink-900 outline-none transition-colors focus:border-ink placeholder:text-slate"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate mb-1">
                          Email Address <span className="text-[10px] lowercase text-slate/70 font-normal">(optional, for replies)</span>
                        </label>
                        <input
                          type="email"
                          value={iEmail}
                          onChange={(e) => setIEmail(e.target.value)}
                          autoComplete="email"
                          placeholder="e.g. sarah@example.com"
                          className="w-full rounded-xl border border-hairline/80 bg-paper-dim/40 px-3.5 py-2.5 text-sm sm:text-xs text-ink-900 outline-none transition-colors focus:border-ink placeholder:text-slate"
                        />
                      </div>
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <button
                          type="submit"
                          disabled={!iName.trim() || connecting}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-paper shadow-2xs hover:bg-ink-700 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <MessageSquare className="h-4 w-4 text-brass" />
                          {connecting ? "Starting conversation…" : "Start Conversation"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSkippedIntro(true);
                            connectToLiveSupport();
                          }}
                          disabled={connecting}
                          className="text-[11px] font-medium text-slate hover:text-ink transition-colors cursor-pointer"
                        >
                          Skip &amp; stay anonymous
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
