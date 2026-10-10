"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Headset, LogIn, Send, Sparkles } from "lucide-react";
import { ApiError, askSupportAi, fetchCurrentUser, initGuestSupport } from "@/lib/api";
import { getOrCreateGuestSessionId, readGuestEmail, readGuestMemory, rememberGuestEmail, rememberGuestName } from "@/lib/guest";
import { AiMarkdown } from "@/components/ai/AiMarkdown";

type Turn = { role: "user" | "assistant"; content: string };

const STORE = "proofolio_support_ai";
const IDEAS = [
  "How does this system help me?",
  "What is HOME PROOFOLIO?",
  "Is it for my kind of work?",
  "What are the privacy policies & terms?",
  "How do I start?",
];

function readTurns(): Turn[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || "[]");
    return Array.isArray(saved) ? saved.slice(-30) : [];
  } catch {
    return [];
  }
}

/**
 * The AI side of the landing page's support window. Answers from the product knowledge (POST /ai/support):
 * it sees no account and no user data. Anything about one specific account goes to the team: onHuman().
 */
export function SupportAiChat({ name, onHuman }: { name?: string | null; onHuman: () => void }) {
  // Mounted only after the visitor opens the support window, so reading storage here is safe.
  const [turns, setTurns] = useState<Turn[]>(readTurns);
  const [activeName, setActiveName] = useState<string | null>(() => {
    if (name) return name;
    if (typeof window !== "undefined") {
      const mem = readGuestMemory();
      return mem.name || null;
    }
    return null;
  });
  // Before the AI answers, a guest says who they are: a name or an email (one is enough). Members are known already.
  const [known, setKnown] = useState<boolean>(() => typeof window !== "undefined" && !!(name || readGuestMemory().name || readGuestEmail()));
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [introBusy, setIntroBusy] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser().then(() => setKnown(true)).catch(() => {});
  }, []);

  async function saveIntro(e: React.FormEvent) {
    e.preventDefault();
    const n = gName.trim();
    const em = gEmail.trim();
    if (!n && !em) {
      setIntroError("Please enter your name or your email.");
      return;
    }
    setIntroBusy(true);
    setIntroError(null);
    try {
      // Saved as a guest on this browser's session id, so the team sees who they are talking to.
      const g = await initGuestSupport(getOrCreateGuestSessionId(), n || undefined, em || undefined);
      if (g.display_name) {
        rememberGuestName(g.display_name);
        setActiveName(g.display_name);
      }
      if (em) rememberGuestEmail(em);
      setKnown(true);
    } catch (err) {
      setIntroError(err instanceof Error ? err.message : "Couldn't save that. Please check it and try again.");
    } finally {
      setIntroBusy(false);
    }
  }

  useEffect(() => {
    if (name && name !== activeName) {
      setActiveName(name);
    }
  }, [name, activeName]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-30)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setError(null);
    setInput("");
    // Earlier turns only: the message itself travels in its own field.
    const history = turns.slice(-10).map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 900)}`);
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await askSupportAi(message, history, activeName);
      if (res.name && res.name !== activeName) {
        setActiveName(res.name);
        rememberGuestName(res.name);
      }
      setTurns((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setError(
        e instanceof ApiError && (e.status === 429 || e.status === 503)
          ? e.message
          : "I couldn't answer just now. Please try again, or talk to a person.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-paper">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {!known ? (
          <form onSubmit={saveIntro} className="space-y-3">
            <Bubble role="assistant">
              <p>Welcome to HOME PROOFOLIO! Before we chat, please tell me your <strong>name</strong> or your <strong>email</strong> (one is enough).</p>
            </Bubble>
            <div className="space-y-2 pl-9">
              <input value={gName} onChange={(e) => setGName(e.target.value)} maxLength={40} placeholder="Your name" aria-label="Your name" className="w-full rounded-xl border border-hairline/80 bg-paper px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-ink" />
              <input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} maxLength={120} placeholder="Or your email" aria-label="Your email" className="w-full rounded-xl border border-hairline/80 bg-paper px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-ink" />
              {introError && <p role="alert" className="text-xs text-red-600">{introError}</p>}
              <button type="submit" disabled={introBusy || (!gName.trim() && !gEmail.trim())} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-paper transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <>
        {/* Greeting: always the first bubble, never sent to the model. */}
        <Bubble role="assistant">
          <p>
            {activeName ? (
              <>
                Hi <strong className="font-semibold text-ink-900">{activeName}</strong>! Welcome to HOME PROOFOLIO. Ask me anything about how the platform works, how it proves your skills, or how it elevates your specific work.
              </>
            ) : (
              <>
                Welcome to HOME PROOFOLIO! I&apos;m your platform assistant. Before we get started, may I ask your name so I know who I&apos;m chatting with? You can also ask me anything about how the platform helps your work.
              </>
            )}
          </p>
        </Bubble>

        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-9">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => send(idea)}
                disabled={busy}
                className="cursor-pointer rounded-full border border-hairline bg-paper-dim/60 px-3 py-1.5 text-[12px] text-ink-800 transition hover:border-brass/60 hover:text-brass-dark disabled:opacity-50"
              >
                {idea}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <Bubble key={i} role={t.role}>
            {t.role === "assistant" ? (
              <>
                <AiMarkdown content={withoutRoutes(t.content)} />
                <RouteButtons text={t.content} />
              </>
            ) : (
              <p className="whitespace-pre-wrap">{t.content}</p>
            )}
          </Bubble>
        ))}

        {busy && (
          <Bubble role="assistant">
            <span className="flex items-center gap-1 py-1" role="status" aria-label="The assistant is writing">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate" />
            </span>
          </Bubble>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30">
            {error}
          </p>
        )}
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-hairline/70 bg-paper-dim/40 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            disabled={!known}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="Ask about HOME PROOFOLIO…"
            aria-label="Your message"
            className="w-full flex-1 rounded-xl border border-hairline/80 bg-paper px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-slate focus:border-ink sm:text-xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-ink text-paper transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] leading-tight text-slate">AI assistant. It can&apos;t see accounts and can make mistakes.</p>
          <button
            type="button"
            onClick={onHuman}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline/80 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-800 transition hover:border-brass/60 hover:text-brass-dark"
          >
            <Headset className="h-3.5 w-3.5" /> Talk to a person
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Turn["role"]; children: ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-paper">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-dark" aria-hidden="true">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-hairline/70 bg-paper-dim/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-900">
        {children}
      </div>
    </div>
  );
}

/** The model may mention routes like /start in its text; show them as buttons instead of asking people to type them. */
function withoutRoutes(text: string): string {
  return text
    .replace(/\b(?:visit|go to|open|head to|type)\s+\/(?:start|login)\b[^.!\n]*[.!]?/gi, "Use the button below.")
    .replace(/\/(?:start|login)\b/g, "the button below");
}

function RouteButtons({ text }: { text: string }) {
  const start = /\/start\b|start your proofolio/i.test(text);
  const login = /\/login\b|sign in/i.test(text);
  if (!start && !login) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {start && (
        <Link href="/start" className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-semibold text-paper transition hover:bg-ink-700">
          Start your proofolio <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {login && (
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink-800 transition hover:border-brass/60">
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Link>
      )}
    </div>
  );
}
