"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { AiChart, tryParseChart } from "./AiChart";
import {
  AiWorkspace,
  OpenWorkspaceButton,
  TERMINAL_LANGS,
  TerminalPane,
  tryParseWorkspace,
  type WorkspaceSpec,
} from "./AiWorkspace";

export function AiMarkdown({ content }: { content: string }) {
  const [workspace, setWorkspace] = useState<WorkspaceSpec | null>(null);
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-inherit break-words">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const language = lines[0].match(/^[a-z0-9_:-]+$/i) ? lines[0] : "";
          const code = (language ? lines.slice(1) : lines).join("\n");
          
          const room = tryParseWorkspace(code, language);
          if (room) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setWorkspace(room)}
                className="my-2.5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-left transition hover:bg-sky-500/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{room.title}</span>
                  <span className="block text-[11px] opacity-70">Workspace · {room.items.length} {room.items.length === 1 ? "panel" : "panels"}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-sky-500 px-2.5 py-1 text-[12px] font-medium text-white">Open</span>
              </button>
            );
          }

          const chartSpec = tryParseChart(code, language);
          if (chartSpec) {
            return (
              <div key={idx} className="my-2.5">
                <AiChart spec={chartSpec} />
                <div className="flex justify-end">
                  <OpenWorkspaceButton onClick={() => setWorkspace({ title: chartSpec.title || "Chart", items: [{ kind: "chart", spec: chartSpec }] })} />
                </div>
              </div>
            );
          }

          if (TERMINAL_LANGS.includes(language.toLowerCase())) {
            return (
              <div key={idx} className="my-2.5">
                <TerminalPane text={code} title={language} />
                <div className="flex justify-end">
                  <OpenWorkspaceButton onClick={() => setWorkspace({ title: "Terminal", items: [{ kind: "terminal", title: language, text: code }] })} />
                </div>
              </div>
            );
          }

          return <CodeBlock key={idx} code={code} language={language} />;
        }

        // Regular text block with simple markdown parsing
        return <TextBlock key={idx} text={part} />;
      })}
      {workspace && <AiWorkspace spec={workspace} onClose={() => setWorkspace(null)} />}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-black/60 text-xs">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5 text-zinc-400">
        <span className="font-mono text-[11px] uppercase tracking-wider">{language || "Code"}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={pIdx} className="text-base font-bold text-ink-900 dark:text-white mt-2">
              {formatInline(trimmed.replace(/^### /, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={pIdx} className="text-lg font-bold text-ink-900 dark:text-white mt-3">
              {formatInline(trimmed.replace(/^## /, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={pIdx} className="text-xl font-bold text-ink-900 dark:text-white mt-4">
              {formatInline(trimmed.replace(/^# /, ""))}
            </h2>
          );
        }

        // List items
        const lines = trimmed.split("\n");
        const isList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* ") || /^\d+\.\s/.test(line.trim()));

        if (isList) {
          return (
            <ul key={pIdx} className="list-disc pl-5 space-y-1.5 text-inherit">
              {lines.map((line, lIdx) => {
                const cleaned = line.replace(/^[-*]\s+|\d+\.\s+/, "");
                return <li key={lIdx}>{formatInline(cleaned)}</li>;
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Where a markdown link points. "report:<file>" is a PDF the AI made for this member; only http(s) links are otherwise followed. */
function linkTarget(href: string): string | null {
  if (href.startsWith("report:")) return `${API_BASE}/ai/report/file/${encodeURIComponent(href.slice(7))}`;
  return /^https?:\/\//i.test(href) ? href : null;
}

function formatInline(str: string): (string | React.JSX.Element)[] {
  // Links: [text](target)
  const linkParts = str.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  if (linkParts.length > 1) {
    return linkParts.map((part, i) => {
      const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const target = m ? linkTarget(m[2]) : null;
      if (!m || !target) return <span key={i}>{m ? m[1] : formatInline(part)}</span>;
      const isFile = m[2].startsWith("report:");
      return (
        <a
          key={i}
          href={target}
          {...(isFile ? { download: m[2].slice(7) } : { target: "_blank", rel: "noreferrer noopener" })}
          className="font-medium text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-300"
        >
          {isFile ? "⬇ " : ""}
          {m[1]}
        </a>
      );
    });
  }
  // Bold: **text**
  const boldParts = str.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith("**") && bPart.endsWith("**")) {
      return (
        <strong key={bIdx} className="font-semibold text-ink-900 dark:text-white">
          {bPart.slice(2, -2)}
        </strong>
      );
    }
    // Inline code: `code`
    const codeParts = bPart.split(/(`.*?`)/g);
    return (
      <span key={bIdx}>
        {codeParts.map((cPart, cIdx) => {
          if (cPart.startsWith("`") && cPart.endsWith("`")) {
            return (
              <code
                key={cIdx}
                className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 font-mono text-[12px] text-sky-600 dark:text-sky-300"
              >
                {cPart.slice(1, -1)}
              </code>
            );
          }
          return cPart;
        })}
      </span>
    );
  });
}
