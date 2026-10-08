"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Download, LayoutDashboard, Loader2, MessageSquare, PenLine, Sparkles, SquarePen } from "lucide-react";
import { adminAiDashboard, apiUrl, type AdminAiMode, type AiDashboard, type AiWidget } from "@/lib/api";
import { AgentOrb, type OrbState } from "@/components/ai/AgentOrb";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { BarList, ColumnChart, Funnel, Kpi, PieList } from "./charts";

/** One line of a conversation. Assistant messages may carry charts read from the database. */
type Msg = { id: string; role: "user" | "assistant"; text: string; widgets?: AiWidget[]; download?: AiDashboard["download"]; seconds?: number; at: number };
type Threads = Record<AdminAiMode, Msg[]>;

const STORE = "proofolio-admin-ai-chat";
const KEEP = 40; // messages per mode kept for this browser tab
const HISTORY = 6; // earlier messages sent with each request (the backend accepts up to 8)

const MODES: Record<AdminAiMode, { label: string; icon: typeof MessageSquare; hello: string; hint: string; placeholder: string; ideas: string[] }> = {
  build: {
    label: "Build",
    icon: LayoutDashboard,
    hello: "What should I build?",
    hint: "Ask for a dashboard. Charts are filled from the live database.",
    placeholder: "Describe the dashboard you want…",
    ideas: ["How is the platform doing this month?", "Show growth over the last 90 days", "Where do members drop off after signing up?", "Show me a dashboard for @amina"],
  },
  chat: {
    label: "Chat",
    icon: MessageSquare,
    hello: "What's on your mind?",
    hint: "Talk it through. I can check real numbers when you need them.",
    placeholder: "Message the assistant…",
    ideas: ["How many members joined this week?", "Who are the most active members?", "What should I focus on to grow engagement?", "Explain the member journey funnel"],
  },
  prepare: {
    label: "Prepare",
    icon: PenLine,
    hello: "What should I prepare?",
    hint: "Reports, growth stories and announcements, written from real numbers.",
    placeholder: "Describe what to write, who it's for and the period…",
    ideas: ["Write this month's platform report", "Prepare a short growth story for our social media", "Draft an announcement to members about publishing proof", "Summarise the last 90 days for a partner"],
  },
};

const EMPTY: Threads = { build: [], chat: [], prepare: [] };

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
 * Admin > AI. A ChatGPT-style assistant with three modes: Build (dashboards), Chat (conversation), Prepare (written pieces).
 * Every number is read from the database by the backend (app/ai/admin_dashboard.py), never written by the model.
 */
export function AiSection({ onError }: { onError: (msg: string) => void }) {
  // This section only mounts in the browser (after the admin sign-in check), so reading storage here is safe.
  const [threads, setThreads] = useState<Threads>(readThreads);
  const [mode, setMode] = useState<AdminAiMode>("build");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<AdminAiMode | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const messages = threads[mode];
  const m = MODES[mode];

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(threads));
    } catch {}
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, mode]);

  // Grow the box with its text, up to a limit, like ChatGPT.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    // Empty: one line. Measuring then can read a wrapped placeholder while the layout is still settling.
    if (input) box.style.height = `${Math.min(box.scrollHeight, 200)}px`;
  }, [input]);

  function add(target: AdminAiMode, msg: Msg) {
    setThreads((prev) => ({ ...prev, [target]: [...prev[target], msg].slice(-KEEP) }));
  }

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    const target = mode;
    const history = threads[target]
      .slice(-HISTORY)
      .map((x) => `${x.role === "user" ? "User" : "Assistant"}: ${x.text.slice(0, 600)}`);
    add(target, newMsg("user", prompt));
    setInput("");
    setBusy(target);
    try {
      const result = await adminAiDashboard(prompt, history, target);
      add(target, newMsg("assistant", result.reply, { widgets: result.widgets, download: result.download, seconds: result.seconds }));
    } catch (e) {
      // Take the unanswered question back out and return it to the box, so they can try again.
      setThreads((prev) => ({ ...prev, [target]: prev[target].slice(0, -1) }));
      setInput(prompt);
      onError(e instanceof Error ? e.message : "The AI could not answer");
    } finally {
      setBusy(null);
      boxRef.current?.focus();
    }
  }

  return (
    <div className="pf-surface flex h-[calc(100dvh-10.5rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-paper shadow-2xs">
      {/* Mode switch */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline/60 px-3 py-2.5 sm:px-4">
        <div role="tablist" aria-label="Assistant mode" className="flex rounded-xl bg-paper-dim p-1">
          {(Object.keys(MODES) as AdminAiMode[]).map((key) => {
            const Icon = MODES[key].icon;
            const active = key === mode;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition sm:px-4 ${
                  active ? "bg-paper text-ink-800 shadow-2xs" : "text-slate hover:text-ink-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {MODES[key].label}
                {busy === key && !active && <Loader2 className="h-3 w-3 animate-spin text-brass-dark" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setThreads((prev) => ({ ...prev, [mode]: [] }))}
          disabled={messages.length === 0 || busy === mode}
          title="New conversation"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-slate transition hover:bg-paper-dim hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SquarePen className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && busy !== mode ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
            <AgentOrb state="breathing" size={64} />
            <h2 className="mt-5 text-[22px] font-semibold text-ink-800">{m.hello}</h2>
            <p className="mt-1.5 text-[13px] text-slate">{m.hint}</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {m.ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => send(idea)}
                  disabled={!!busy}
                  className="cursor-pointer rounded-xl border border-hairline px-4 py-3 text-left text-[13px] text-ink-700 transition hover:border-brass/50 hover:bg-paper-dim disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-paper-dim px-4 py-2.5 text-[14px] text-ink-800 sm:max-w-[70%]">{msg.text}</p>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-3">
                  <Avatar />
                  <div className="min-w-0 flex-1 space-y-4">
                    {msg.text && (
                      <div className="text-[14px] text-ink-700">
                        <AiMarkdown content={msg.text} />
                      </div>
                    )}
                    {msg.widgets && msg.widgets.length > 0 && <Widgets widgets={msg.widgets} />}
                    {msg.download && (
                      <a
                        href={apiUrl(msg.download.url)}
                        download={msg.download.name}
                        className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3.5 py-2 text-[13px] font-medium text-ink-800 shadow-2xs transition hover:bg-paper-dim"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF · {msg.download.label}
                      </a>
                    )}
                    <p className="text-[11px] text-slate">
                      {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {msg.seconds != null && ` · ${msg.seconds}s`}
                      {msg.widgets && msg.widgets.length > 0 && ` · ${msg.widgets.length} ${msg.widgets.length === 1 ? "chart" : "charts"}`}
                    </p>
                  </div>
                </div>
              ),
            )}
            {busy === mode && <Thinking mode={mode} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 pb-3 pt-1 sm:px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-hairline bg-paper px-4 py-2.5 shadow-xs focus-within:border-brass/50"
        >
          <label htmlFor="admin-ai-input" className="sr-only">
            Message
          </label>
          <textarea
            id="admin-ai-input"
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
            className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[14px] text-ink-800 outline-none placeholder:text-slate"
          />
          <button
            type="submit"
            disabled={!input.trim() || !!busy}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate">Reads counts from the live database, never private content. It cannot change anything.</p>
      </div>
    </div>
  );
}

/** What the assistant is doing while a reply is on its way, as orb states with a caption. [seconds from start, state, caption] */
const STEPS: Record<AdminAiMode, [number, OrbState, string][]> = {
  build: [
    [0, "connecting", "Connecting to the model…"],
    [2, "searching", "Reading the database…"],
    [8, "weaving", "Building the charts…"],
    [25, "composing", "Writing the summary…"],
  ],
  chat: [
    [0, "connecting", "Connecting to the model…"],
    [2, "solving", "Thinking…"],
    [15, "composing", "Writing the answer…"],
  ],
  prepare: [
    [0, "connecting", "Connecting to the model…"],
    [2, "searching", "Gathering the numbers…"],
    [10, "solving", "Planning the piece…"],
    [22, "composing", "Writing…"],
    [45, "shaping", "Polishing…"],
  ],
};

/** The thinking row: mounted only while a reply is pending, so its clock starts with each request. */
function Thinking({ mode }: { mode: AdminAiMode }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = STEPS[mode];
  const [, state, caption] = [...steps].reverse().find(([at]) => seconds >= at) ?? steps[0];
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <AgentOrb state={state} size={32} />
      <span className="text-[13px] text-slate">
        <span className="animate-pulse">{caption}</span>
        {seconds >= 5 && <span className="ml-2 tabular-nums text-slate/70">{seconds}s</span>}
      </span>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass/10">
      <Sparkles className="h-3.5 w-3.5 text-brass-dark" />
    </div>
  );
}

/** Headline numbers go full width in a row of cards; charts sit two to a row. */
function Widgets({ widgets }: { widgets: AiWidget[] }) {
  const kpis = widgets.filter((w) => w.type === "kpis");
  const charts = widgets.filter((w) => w.type !== "kpis");
  return (
    <>
      {kpis.map((w, i) =>
        w.type === "kpis" ? (
          <div key={`k${i}`}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate">{w.title}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {w.items.map((k) => (
                <Kpi key={k.label} label={k.label} value={k.value} prev={k.prev} hint={k.hint} />
              ))}
            </div>
          </div>
        ) : null,
      )}
      {charts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {charts.map((w, i) => {
            if (w.type === "columns") return <ColumnChart key={i} title={w.title} total={w.total} points={w.points} mode={w.mode} />;
            if (w.type === "bars") {
              return w.view === "pie" || w.view === "donut"
                ? <PieList key={i} title={w.title} bars={w.bars} empty={w.empty} donut={w.view === "donut"} />
                : <BarList key={i} title={w.title} bars={w.bars} empty={w.empty} />;
            }
            if (w.type === "funnel") return <Funnel key={i} steps={w.steps} />;
            return null;
          })}
        </div>
      )}
    </>
  );
}
