"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, LayoutDashboard, Maximize2, Terminal, X } from "lucide-react";

import { AiChart, tryParseChart, type ChartSpec } from "./AiChart";

/** One panel in the workspace: a chart, a terminal session, or a note. */
export type WorkspaceItem =
  | { kind: "chart"; spec: ChartSpec }
  | { kind: "terminal"; title?: string; text: string }
  | { kind: "text"; title?: string; text: string };

export interface WorkspaceSpec {
  title: string;
  items: WorkspaceItem[];
}

export const TERMINAL_LANGS = ["terminal", "bash", "sh", "shell", "console", "cmd", "powershell", "ps1", "zsh"];

/**
 * Reads a ```workspace block the AI wrote:
 *   {"title": "...", "items": [{"type": "chart", "data": [...]}, {"type": "terminal", "text": "..."}, {"type": "text", "text": "..."}]}
 * Returns null while the JSON is incomplete or has nothing to show, so the block falls back to plain code.
 */
export function tryParseWorkspace(code: string, language: string): WorkspaceSpec | null {
  if (language.toLowerCase() !== "workspace") return null;
  try {
    const raw = JSON.parse(code.trim());
    if (!raw || !Array.isArray(raw.items)) return null;
    const items: WorkspaceItem[] = [];
    for (const it of raw.items) {
      if (!it || typeof it !== "object") continue;
      const type = String(it.type ?? "").toLowerCase();
      if (type === "terminal" && typeof it.text === "string") items.push({ kind: "terminal", title: it.title, text: it.text });
      else if ((type === "text" || type === "markdown" || type === "note") && typeof it.text === "string") items.push({ kind: "text", title: it.title, text: it.text });
      else if (Array.isArray(it.data)) {
        const spec = tryParseChart(JSON.stringify({ ...it, type: it.chart_type || (type === "chart" ? it.chart || "bar" : type) }), "chart");
        if (spec) items.push({ kind: "chart", spec });
      }
    }
    return items.length ? { title: typeof raw.title === "string" && raw.title ? raw.title : "Workspace", items } : null;
  } catch {
    return null;
  }
}

/** A terminal-looking pane: dark, monospaced, scrolls sideways instead of wrapping. */
export function TerminalPane({ text, title, tall = false }: { text: string; title?: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14] text-xs shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-1.5 text-zinc-400">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <i className="h-2 w-2 rounded-full bg-rose-400/70" />
            <i className="h-2 w-2 rounded-full bg-amber-400/70" />
            <i className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </span>
          <Terminal className="h-3 w-3 shrink-0" />
          <span className="truncate font-mono text-[11px]">{title || "terminal"}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => { });
          }}
          className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className={`overflow-auto p-3 font-mono text-[12px] leading-relaxed text-emerald-100/90 ${tall ? "max-h-[60vh]" : "max-h-72"}`}>
        {text.split("\n").map((line, i) => (
          <div key={i} className={/^\s*(\$|>|PS [^>]*>|#)\s/.test(line) ? "text-sky-300" : undefined}>{line || " "}</div>
        ))}
      </pre>
    </div>
  );
}

function Panel({ item }: { item: WorkspaceItem }) {
  if (item.kind === "chart") return <div className="[&>div]:my-0"><AiChart spec={item.spec} tall /></div>;
  if (item.kind === "terminal") return <TerminalPane text={item.text} title={item.title} tall />;
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4 text-[13px] leading-relaxed text-ink-800">
      {item.title && <h4 className="mb-1.5 text-[13px] font-semibold">{item.title}</h4>}
      <p className="whitespace-pre-wrap break-words">{item.text}</p>
    </div>
  );
}

/**
 * The workspace: the AI's wide room for charts, terminal output and notes. Full screen at any size
 * (full width, no max width), one column on a phone and two on a wide screen. Esc or the X closes it.
 */
export function AiWorkspace({ spec, onClose }: { spec: WorkspaceSpec; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={spec.title} className="fixed inset-0 z-[70] flex h-dvh w-full max-w-none flex-col bg-paper-dim">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-paper px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <LayoutDashboard className="h-4 w-4 shrink-0 text-sky-500" />
          <h2 className="truncate text-[15px] font-semibold text-ink-800">{spec.title}</h2>
          <span className="hidden shrink-0 text-[11px] text-slate sm:inline">{spec.items.length} {spec.items.length === 1 ? "panel" : "panels"}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close workspace" className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800">
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
          {spec.items.map((item, i) => (
            // A lone panel, or a terminal next to charts, takes the whole row.
            <div key={i} className={item.kind === "terminal" || spec.items.length === 1 ? "xl:col-span-2" : undefined}>
              <Panel item={item} />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The small button shown in the chat under a chart or terminal block: open it in the workspace. */
export function OpenWorkspaceButton({ label = "Open in workspace", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800">
      <Maximize2 className="h-3 w-3" />
      {label}
    </button>
  );
}
