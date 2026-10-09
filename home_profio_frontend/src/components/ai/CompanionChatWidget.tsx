"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  Maximize2,
  RefreshCw,
  Trash2,
  ChevronDown,
  Shield,
  Activity,
} from "lucide-react";
import { sendAiChat, fetchSessions, fetchSessionMessages, type ChatMessage } from "@/lib/ai";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { AgentOrb, type OrbState } from "@/components/ai/AgentOrb";
import { SmilingEmojiAvatar, type EmojiMood } from "@/components/ai/SmilingEmojiAvatar";
import { getCachedSessionUser, displayName } from "@/components/app/AppShell";

export function CompanionChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("proofolio_ai_chat_history");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("breathing");
  const [emojiMood, setEmojiMood] = useState<EmojiMood>("smiling");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = getCachedSessionUser();
  const userName = user ? displayName(user) : "there";

  // Load latest conversation from database if messages are empty
  const loadedFromDb = useRef(false);
  useEffect(() => {
    if (!user || loadedFromDb.current) return;
    loadedFromDb.current = true;
    fetchSessions()
      .then((list) => {
        if (list.length > 0) {
          setSessionId(list[0].id);
          if (messages.length === 0) {
            fetchSessionMessages(list[0].id, undefined, 20)
              .then((page) => {
                if (page.messages.length > 0) {
                  setMessages(page.messages);
                }
              })
              .catch(() => { });
          }
        }
      })
      .catch(() => { });
  }, [user, messages.length]);

  // Sync to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem("proofolio_ai_chat_history", JSON.stringify(messages));
    } catch { }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages, isLoading]);

  // Handle typing to trigger listening state
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!isLoading) {
      if (val.trim().length > 0) {
        setOrbState("listening");
        setEmojiMood("listening");
      } else {
        setOrbState("breathing");
        setEmojiMood("smiling");
      }
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim();
    if (!text || isLoading) return;

    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    // Transition orb states: connecting -> searching -> solving
    setOrbState("connecting");
    setEmojiMood("thinking");

    const timer1 = setTimeout(() => {
      setOrbState("searching");
    }, 600);

    const timer2 = setTimeout(() => {
      setOrbState("solving");
    }, 1400);

    try {
      const turns = newHistory.slice(-10).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
      const res = await sendAiChat(text, turns, sessionId);
      if (res.session_id) setSessionId(res.session_id);

      clearTimeout(timer1);
      clearTimeout(timer2);
      setOrbState("composing");

      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setEmojiMood("celebrating");
      setTimeout(() => setEmojiMood("smiling"), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to reach AI. Please verify backend connection.");
      setEmojiMood("smiling");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setOrbState("breathing");
      }, 1000);
    }
  };

  const clearChat = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem("proofolio_ai_chat_history");
    } catch { }
    setOrbState("breathing");
    setEmojiMood("smiling");
  };

  return (
    <>
      {/* Redesigned Floating Launcher Button with Mini Thinking Orb & Smiling Emoji Badge */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setEmojiMood("smiling");
          }}
          className="group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-3 rounded-full border border-sky-400/30 bg-[#0d1624]/90 p-1.5 pr-4 text-white shadow-2xl shadow-sky-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-sky-400/50 hover:shadow-sky-500/30 active:scale-95"
          title="Open AI Companion"
        >
          {/* Mini Thinking Orb in Launcher */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-white/10 overflow-hidden">
            <AgentOrb state={orbState} size={32} />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white">Kimmy</span>
              <span className="text-sm">😊</span>
            </div>
            <span className="text-[10px] text-sky-400 font-medium">AI Assistant</span>
          </div>
        </button>
      )}

      {/* Redesigned Modal Opening Box */}
      {isOpen && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 md:bottom-5 md:right-5 z-50 flex h-[min(560px,calc(100dvh-6rem))] w-[94vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-sky-500/30 bg-[#0d1624]/95 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl ring-1 ring-white/10 sm:w-[400px] animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                <span className="absolute -bottom-1 -right-1">
                  <SmilingEmojiAvatar mood={emojiMood} size="sm" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold leading-tight text-white">Kimmy</h3>
                  <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-mono text-sky-300 capitalize">
                    {orbState}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 flex items-center gap-1">
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/ai"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Expand to Full AI Studio"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Minimize"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-radial-gradient from-transparent to-black/30">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                {/* Thinking Orb + Smiling Avatar Hero in Opening Box */}
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/40 shadow-inner">
                    <AgentOrb state={orbState} size={32} />
                  </div>
                  <div className="mt-2">
                    <SmilingEmojiAvatar mood={emojiMood} size="md" />
                  </div>
                </div>

                {/* Welcoming Message with Smiling Emoji */}
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <span>Welcome, {userName}!</span>
                  <span className="text-base">😊</span>
                </h4>
                <p className="mt-1 text-[11px] text-white/60 max-w-[260px] leading-relaxed">
                  Habari! I am Kimmy. I can examine your work, help formulate proof evidence, or compose stories from memories.
                </p>

                {/* Quick Prompts */}
                <div className="mt-4 flex flex-col gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => handleSend("Draft a concise, verifiable proof statement for my latest project.")}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-left text-[11px] text-white/80 hover:border-sky-400/40 hover:bg-white/10 transition"
                  >
                    💡 Draft verifiable proof statement
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend("Give me recommendations to improve my portfolio showcase.")}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-left text-[11px] text-white/80 hover:border-sky-400/40 hover:bg-white/10 transition"
                  >
                    📊 Recommendations to improve portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend("Create a draft story from my recent learning memories.")}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-left text-[11px] text-white/80 hover:border-sky-400/40 hover:bg-white/10 transition"
                  >
                    📖 Turn memories into a written story
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                        <AgentOrb state={orbState} size={20} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${isUser
                        ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white"
                        : "border border-white/10 bg-white/10 text-white backdrop-blur-md"
                        }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <AiMarkdown content={m.content} />
                      )}
                      <span
                        className={`mt-1 block text-right text-[9px] ${isUser ? "text-sky-200" : "text-white/40"
                          }`}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-[11px] text-white/70">
                <AgentOrb state={orbState} size={20} />
                <span className="capitalize">
                  {orbState}...
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-2.5 text-[11px] text-rose-200">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-white/10 bg-black/40 p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Message Kimmy..."
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
