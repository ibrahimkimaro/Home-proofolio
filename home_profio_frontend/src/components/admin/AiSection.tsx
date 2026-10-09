"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Download,
  Film,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  PenLine,
  Sparkles,
  SquarePen,
  Video,
} from "lucide-react";
import { adminAiDashboard, apiUrl, type AdminAiMode, type AiDashboard, type AiWidget } from "@/lib/api";
import { AgentOrb, type OrbState } from "@/components/ai/AgentOrb";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { BarList, ColumnChart, Funnel, Kpi, PieList } from "./charts";

/** One line of a conversation. Assistant messages may carry charts read from the database. */
type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  widgets?: AiWidget[];
  download?: AiDashboard["download"];
  seconds?: number;
  at: number;
};
type Threads = Record<AdminAiMode, Msg[]>;

const STORE = "proofolio-admin-ai-chat-v2";
const KEEP = 40; // messages per mode kept for this browser tab
const HISTORY = 6; // earlier messages sent with each request

interface ModeConfig {
  label: string;
  icon: typeof MessageSquare;
  hello: string;
  hint: string;
  placeholder: string;
  ideas: string[];
}

const MODES: Record<AdminAiMode, ModeConfig> = {
  chat: {
    label: "Chat",
    icon: MessageSquare,
    hello: "What's on your mind?",
    hint: "Talk it through. I can check real database numbers and summarize platform insights.",
    placeholder: "Message the assistant…",
    ideas: [
      "How many members joined this week?",
      "Who are the most active members?",
      "What should I focus on to grow engagement?",
      "Explain the member journey funnel",
    ],
  },
  build: {
    label: "Build",
    icon: LayoutDashboard,
    hello: "What should I build?",
    hint: "Ask for a dashboard. Interactive charts are generated directly from the live database.",
    placeholder: "Describe the dashboard you want…",
    ideas: [
      "How is the platform doing this month?",
      "Show growth over the last 90 days",
      "Where do members drop off after signing up?",
      "Show me a dashboard for @amina",
    ],
  },
  prepare: {
    label: "Prepare",
    icon: PenLine,
    hello: "What should I prepare?",
    hint: "Reports, growth stories, announcements and summaries, written from real numbers.",
    placeholder: "Describe what to write, who it's for and the period…",
    ideas: [
      "Write this month's platform report",
      "Prepare a short growth story for our social media",
      "Draft an announcement to members about publishing proof",
      "Summarise the last 90 days for a partner",
    ],
  },
  video: {
    label: "Video",
    icon: Film,
    hello: "What video concept should we create?",
    hint: "Video storyboards, TikTok/Reel scripts, showcase teasers and camera directions.",
    placeholder: "Describe the video concept, platform (Reels/YouTube) or showcase feature…",
    ideas: [
      "Create a 30s TikTok/Reel script about student proof portfolios",
      "Draft a feature teaser storyboard for verified skills",
      "Write a 60s YouTube showcase script for top achievements",
      "Outline an onboarding tutorial video breakdown",
    ],
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    hello: "What visual assets should we design?",
    hint: "Generative AI image prompts (Midjourney/DALL-E), banner concepts, and creative direction.",
    placeholder: "Describe the visual asset, banner style, or generative image prompt needed…",
    ideas: [
      "Generate a modern 3D glassmorphic hero image prompt for website",
      "Create a social share banner prompt celebrating student milestones",
      "Design a minimalist certificate proof mockup visual prompt",
      "Generate an editorial portrait concept for member spotlights",
    ],
  },
};

const EMPTY: Threads = { chat: [], build: [], prepare: [], video: [], image: [] };

function newMsg(role: Msg["role"], text: string, extra: Partial<Msg> = {}): Msg {
  const at = Date.now();
  return { id: `${role[0]}${at}`, role, text, at, ...extra };
}

function readThreads(): Threads {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    return saved && typeof saved === "object" ? { ...EMPTY, ...saved } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Redesigned Admin > AI.
 * Maximize space for conversation and charts.
 * Features a sleek floating dock at the bottom with quick mode switching: Chat (Default), Build, Prepare, Video, Image.
 */
export function AiSection({ onError }: { onError: (msg: string) => void }) {
  const [threads, setThreads] = useState<Threads>(readThreads);
  // Default mode is CHAT as requested by user
  const [mode, setMode] = useState<AdminAiMode>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<AdminAiMode | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const messages = threads[mode] || [];
  const m = MODES[mode];

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(threads));
    } catch {}
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, mode]);

  // Grow the textarea with its text smoothly
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    if (input) box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
  }, [input]);

  function add(target: AdminAiMode, msg: Msg) {
    setThreads((prev) => ({ ...prev, [target]: [...(prev[target] || []), msg].slice(-KEEP) }));
  }

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    const target = mode;
    const history = (threads[target] || [])
      .slice(-HISTORY)
      .map((x) => `${x.role === "user" ? "User" : "Assistant"}: ${x.text.slice(0, 600)}`);

    add(target, newMsg("user", prompt));
    setInput("");
    setBusy(target);
    try {
      const result = await adminAiDashboard(prompt, history, target);
      add(
        target,
        newMsg("assistant", result.reply, {
          widgets: result.widgets,
          download: result.download,
          seconds: result.seconds,
        })
      );
    } catch (e) {
      // Revert the unanswered prompt into the box
      setThreads((prev) => ({ ...prev, [target]: (prev[target] || []).slice(0, -1) }));
      setInput(prompt);
      onError(e instanceof Error ? e.message : "The AI assistant could not answer");
    } finally {
      setBusy(null);
      boxRef.current?.focus();
    }
  }

  const modeKeys: AdminAiMode[] = ["chat", "build", "prepare", "video", "image"];

  return (
    <div className="relative flex min-h-[calc(100dvh-9rem)] w-full flex-col">
      {/* Conversation Area (Maximum Space, no tight borders) */}
      <div className="flex-1 overflow-y-auto pb-44 pt-2 sm:pb-48">
        {messages.length === 0 && busy !== mode ? (
          <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-8 text-center">
            <AgentOrb state="breathing" size={64} />
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink-800 sm:text-3xl">
              {m.hello}
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate">{m.hint}</p>

            <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
              {m.ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => send(idea)}
                  disabled={!!busy}
                  className="group flex cursor-pointer items-start justify-between rounded-2xl border border-hairline bg-paper p-3.5 text-left text-xs text-ink-700 shadow-2xs transition hover:border-brass/50 hover:bg-paper-dim disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-medium">{idea}</span>
                  <ArrowUp className="h-3.5 w-3.5 shrink-0 rotate-45 text-slate opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6 px-3 py-4 sm:px-6">
            {messages.map((msg) => {
              const hasChart =
                (msg.widgets && msg.widgets.length > 0) ||
                msg.text.includes("```chart") ||
                msg.text.includes("```nivo") ||
                msg.text.includes("```json:chart") ||
                msg.text.includes('"type": "bar') ||
                msg.text.includes('"type": "pie');

              return msg.role === "user" ? (
                <div key={msg.id} className="mx-auto flex w-full max-w-4xl justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-paper-dim px-4.5 py-3 text-sm font-medium text-ink-800 shadow-2xs sm:max-w-[75%]">
                    {msg.text}
                  </p>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={hasChart ? "w-full max-w-full px-1 sm:px-4" : "mx-auto w-full max-w-4xl"}
                >
                  <div className="flex gap-3.5">
                    <Avatar />
                    <div className="min-w-0 flex-1 space-y-4">
                      {msg.text && (
                        <div className="rounded-3xl border border-hairline/80 bg-paper p-5 text-sm text-ink-800 shadow-2xs">
                          <AiMarkdown content={msg.text} />
                        </div>
                      )}
                      {msg.widgets && msg.widgets.length > 0 && <Widgets widgets={msg.widgets} />}
                      {msg.download && (
                        <a
                          href={apiUrl(msg.download.url)}
                          download={msg.download.name}
                          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-paper px-4 py-2.5 text-xs font-semibold text-ink-800 shadow-2xs transition hover:bg-paper-dim"
                        >
                          <Download className="h-4 w-4 text-brass-dark" />
                          Download Report · {msg.download.label}
                        </a>
                      )}
                      <p className="text-[11px] text-slate">
                        {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.seconds != null && ` · ${msg.seconds}s`}
                        {msg.widgets && msg.widgets.length > 0 && (
                          <span>
                            {" "}
                            · {msg.widgets.length} {msg.widgets.length === 1 ? "chart" : "charts"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {busy === mode && (
              <div className="mx-auto w-full max-w-4xl">
                <Thinking mode={mode} />
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* FLOATING BOTTOM DOCK (Message bar & mode switchers floating at bottom) */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none lg:left-64">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-2">
          {/* Floating Mode Switcher Bar */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-hairline/80 bg-paper/90 p-1.5 shadow-lg backdrop-blur-xl">
            <div role="tablist" aria-label="Assistant mode" className="flex items-center gap-1">
              {modeKeys.map((key) => {
                const Icon = MODES[key].icon;
                const active = key === mode;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(key)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-ink text-paper shadow-xs"
                        : "text-slate hover:bg-paper-dim hover:text-ink-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{MODES[key].label}</span>
                    {busy === key && !active && (
                      <Loader2 className="h-3 w-3 animate-spin text-brass-dark" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mx-1 h-4 w-px bg-hairline/80" />

            <button
              type="button"
              onClick={() => setThreads((prev) => ({ ...prev, [mode]: [] }))}
              disabled={messages.length === 0 || busy === mode}
              title="New conversation"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-slate transition hover:bg-paper-dim hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SquarePen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>

          {/* Floating Composer Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex w-full items-end gap-2 rounded-3xl border border-hairline/80 bg-paper/95 p-2 shadow-2xl backdrop-blur-2xl transition focus-within:border-brass/70 focus-within:ring-2 focus-within:ring-brass/15 sm:p-2.5"
          >
            <label htmlFor="admin-ai-floating-input" className="sr-only">
              Message
            </label>
            <textarea
              id="admin-ai-floating-input"
              ref={boxRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={1000}
              placeholder={m.placeholder}
              className="max-h-[160px] flex-1 resize-none bg-transparent px-3 py-1.5 text-sm text-ink-800 outline-none placeholder:text-slate"
            />
            <button
              type="submit"
              disabled={!input.trim() || !!busy}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-30 shadow-xs"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate/75 drop-shadow-2xs">
            Admin AI reads live platform telemetry and authorized data only. Default mode is <strong>Chat</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

/** What the assistant is doing while a reply is on its way, as orb states with a caption. */
const STEPS: Record<AdminAiMode, [number, OrbState, string][]> = {
  chat: [
    [0, "connecting", "Connecting to Gemini model…"],
    [2, "solving", "Thinking…"],
    [15, "composing", "Writing the answer…"],
  ],
  build: [
    [0, "connecting", "Connecting to Gemini model…"],
    [2, "searching", "Reading live database…"],
    [8, "weaving", "Building dashboard charts…"],
    [25, "composing", "Writing summary insights…"],
  ],
  prepare: [
    [0, "connecting", "Connecting to Gemini model…"],
    [2, "searching", "Gathering platform metrics…"],
    [10, "solving", "Planning the report…"],
    [22, "composing", "Writing piece…"],
    [45, "shaping", "Polishing draft…"],
  ],
  video: [
    [0, "connecting", "Connecting to Gemini model…"],
    [2, "searching", "Developing video concept…"],
    [8, "weaving", "Structuring storyboard & scenes…"],
    [20, "composing", "Writing camera & audio cues…"],
  ],
  image: [
    [0, "connecting", "Connecting to Gemini model…"],
    [2, "solving", "Exploring visual aesthetic…"],
    [8, "shaping", "Crafting prompt parameters…"],
    [18, "composing", "Refining lighting & color palette…"],
  ],
};

/** The thinking row: mounted only while a reply is pending, so its clock starts with each request. */
function Thinking({ mode }: { mode: AdminAiMode }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = STEPS[mode] || STEPS.chat;
  const [, state, caption] = [...steps].reverse().find(([at]) => seconds >= at) ?? steps[0];
  return (
    <div className="flex items-center gap-3 py-2" role="status" aria-live="polite">
      <AgentOrb state={state} size={32} />
      <span className="text-xs text-slate">
        <span className="animate-pulse">{caption}</span>
        {seconds >= 5 && <span className="ml-2 tabular-nums text-slate/70">{seconds}s</span>}
      </span>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

/** Headline numbers go full width in a row of cards; charts sit two to a row. */
function Widgets({ widgets }: { widgets: AiWidget[] }) {
  const kpis = widgets.filter((w) => w.type === "kpis");
  const charts = widgets.filter((w) => w.type !== "kpis");
  return (
    <div className="space-y-4">
      {kpis.map((w, i) =>
        w.type === "kpis" ? (
          <div key={`k${i}`}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate">{w.title}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {w.items.map((k) => (
                <Kpi key={k.label} label={k.label} value={k.value} prev={k.prev} hint={k.hint} />
              ))}
            </div>
          </div>
        ) : null
      )}
      {charts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {charts.map((w, i) => {
            if (w.type === "columns")
              return <ColumnChart key={i} title={w.title} total={w.total} points={w.points} mode={w.mode} />;
            if (w.type === "bars") {
              return w.view === "pie" || w.view === "donut" ? (
                <PieList key={i} title={w.title} bars={w.bars} empty={w.empty} donut={w.view === "donut"} />
              ) : (
                <BarList key={i} title={w.title} bars={w.bars} empty={w.empty} />
              );
            }
            if (w.type === "funnel") return <Funnel key={i} steps={w.steps} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}
