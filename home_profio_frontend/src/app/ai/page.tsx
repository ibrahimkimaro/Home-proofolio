"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Download, History, SquarePen, Sliders, Trash2, X } from "lucide-react";
import { AppShell, useSession, displayName } from "@/components/app/AppShell";
import {
  streamAiChat,
  fetchSessions,
  fetchSessionMessages,
  deleteSession,
  type ChatSession,
  fetchCompanion,
  updateCompanion,
  getWorkReportDownloadUrl,
  type CompanionConfig,
  type ChatMessage,
} from "@/lib/ai";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { AgentOrb, type OrbState } from "@/components/ai/AgentOrb";

const STORE = "proofolio_ai_session"; // the open conversation, so a reload comes back to it
const PAGE = 30; // messages per page when opening a chat or scrolling up

/** What the AI reports it is doing, as the orb state and caption. "connecting" is the wait before it reports anything. */
const STATES: Record<string, [OrbState, string]> = {
  connecting: ["connecting", "Connecting…"],
  thinking: ["working", "Thinking…"],
  reasoning: ["solving", "Reasoning…"],
  searching: ["searching", "Searching your work…"],
  composing: ["composing", "Writing the answer…"],
};

export default function AiPage() {
  const [user] = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiState, setAiState] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [companion, setCompanion] = useState<CompanionConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Settings form state
  const [formName, setFormName] = useState("Kimmy");
  const [formRelation, setFormRelation] = useState("personal assistant");
  const [formPersonality, setFormPersonality] = useState("friendly");
  const [formStyle, setFormStyle] = useState("concise");
  const [formProactivity, setFormProactivity] = useState<"on_request" | "occasional" | "active">("occasional");
  const [formCustom, setFormCustom] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>(["projects", "memories"]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<{ height: number; top: number } | null>(null); // measured just before older messages go in
  const instantRef = useRef(false); // the next scroll to the bottom should jump, not glide
  const boxRef = useRef<HTMLTextAreaElement>(null);

  /** Open a saved conversation at its newest messages; older ones load as the reader scrolls up. */
  const openSession = useCallback(async (id: string) => {
    setOpeningChat(true);
    setError(null);
    try {
      const page = await fetchSessionMessages(id, undefined, PAGE);
      instantRef.current = true;
      setSessionId(id);
      setMessages(page.messages);
      setHasMore(page.hasMore);
      try { localStorage.setItem(STORE, id); } catch { }
    } catch {
      try { localStorage.removeItem(STORE); } catch { }
    } finally {
      setOpeningChat(false);
    }
  }, []);

  // After a reload, come back to the conversation that was open, or restore latest from database.
  const restored = useRef(false);
  useEffect(() => {
    if (!user || restored.current) return;
    restored.current = true;
    let id: string | null = null;
    try { id = localStorage.getItem(STORE); } catch { }
    if (id) {
      void openSession(id);
      fetchSessions().then(setSessions).catch(() => {});
    } else {
      fetchSessions().then((list) => {
        setSessions(list);
        if (list.length > 0) {
          void openSession(list[0].id);
        }
      }).catch(() => {});
    }
  }, [user, openSession]);

  const loadOlder = async () => {
    const first = messages[0];
    if (!sessionId || !hasMore || loadingOlder || !first?.created_at) return;
    setLoadingOlder(true);
    try {
      const page = await fetchSessionMessages(sessionId, first.created_at, PAGE);
      const el = scrollRef.current;
      if (el) anchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
    } catch {
      setError("Couldn't load earlier messages. Scroll up to try again.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const onScroll = () => {
    if ((scrollRef.current?.scrollTop ?? 1) < 160) void loadOlder();
  };

  const toggleHistory = async () => {
    const opening = !historyOpen;
    setHistoryOpen(opening);
    if (opening) setSessions(await fetchSessions().catch(() => []));
  };

  const removeSession = async (id: string) => {
    await deleteSession(id).catch(() => { });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === sessionId) clearChat();
  };

  // Load companion config
  useEffect(() => {
    if (!user) return;
    fetchCompanion()
      .then((cfg) => {
        setCompanion(cfg);
        if (cfg.name) setFormName(cfg.name);
        if (cfg.relationship_type) setFormRelation(cfg.relationship_type);
        if (cfg.personality) setFormPersonality(cfg.personality);
        if (cfg.communication_style) setFormStyle(cfg.communication_style);
        if (cfg.proactivity) setFormProactivity(cfg.proactivity);
        if (cfg.custom_instructions) setFormCustom(cfg.custom_instructions);
        if (cfg.access_permissions) setFormPermissions(cfg.access_permissions);
      })
      .catch(() => { });
  }, [user]);

  // Older messages added above keep the reader where they were; a newly opened chat jumps to its newest message;
  // a new message glides down. Runs before paint, so there is no visible jump.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (anchorRef.current) {
      el.scrollTop = el.scrollHeight - anchorRef.current.height + anchorRef.current.top;
      anchorRef.current = null;
    } else if (instantRef.current) {
      el.scrollTop = el.scrollHeight;
      instantRef.current = false;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading, error]);

  // Grow the box with its text, up to a limit, like ChatGPT.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    // Empty: one line. Measuring then can read a wrapped placeholder while the layout is still settling.
    if (input) box.style.height = `${Math.min(box.scrollHeight, 200)}px`;
  }, [input]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAiState("connecting");
    setIsLoading(true);

    try {
      const saved = await streamAiChat(text, sessionId, setAiState, (info) => {
        setSessionId(info.id);
        setAiState("thinking"); // the server has the message: "Connecting…" is over
        try { localStorage.setItem(STORE, info.id); } catch { }
      });
      setMessages((prev) => [...prev, saved]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the AI companion. Please try again.");
    } finally {
      setIsLoading(false);
      boxRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setHasMore(false);
    setError(null);
    try { localStorage.removeItem(STORE); } catch { }
  };

  const copyMessage = (m: ChatMessage) => {
    navigator.clipboard
      ?.writeText(m.content)
      .then(() => {
        setCopiedId(m.id);
        setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
      })
      .catch(() => { });
  };

  const saveCompanionSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const updated = await updateCompanion({
        name: formName,
        relationship_type: formRelation,
        personality: formPersonality,
        communication_style: formStyle,
        proactivity: formProactivity,
        custom_instructions: formCustom,
        access_permissions: formPermissions,
      });
      setCompanion(updated);
      setSettingsSuccess(true);
      setTimeout(() => {
        setSettingsSuccess(false);
        setSettingsOpen(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update companion settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (!user) return null;

  const companionName = companion?.name || "Kimmy";
  const firstName = displayName(user).split(" ")[0];
  const headerOrb: OrbState = input.trim() ? "listening" : "breathing";
  const iconButton =
    "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <AppShell user={user}>
      <div className="mx-auto flex h-[calc(100dvh-4.25rem-4.5rem-env(safe-area-inset-bottom,0px))] sm:h-[calc(100vh-5.5rem)] w-full max-w-7xl flex-col">
        {/* Header: who you are talking to, and a few quiet actions */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline/70 px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-ink-800">{companionName}</h1>
              <p className="truncate text-[11px] text-slate">{isLoading ? STATES[aiState]?.[1] ?? "Thinking…" : "Your AI companion"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <a href={getWorkReportDownloadUrl()} target="_blank" rel="noreferrer" className={iconButton} title="Download a PDF report of your work">
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Report</span>
            </a>
            <button type="button" onClick={() => setSettingsOpen(true)} className={iconButton} title="Companion settings">
              <Sliders className="h-4 w-4" />
              <span className="hidden md:inline">Settings</span>
            </button>
            <button type="button" onClick={toggleHistory} className={iconButton} title="Previous chats">
              <History className="h-4 w-4" />
              <span className="hidden md:inline">History</span>
            </button>
            <button type="button" onClick={clearChat} disabled={(messages.length === 0 && !sessionId) || isLoading} className={iconButton} title="New chat">
              <SquarePen className="h-4 w-4" />
              <span className="hidden md:inline">New chat</span>
            </button>
          </div>
        </header>

        {/* Conversation */}
        <div ref={scrollRef} onScroll={onScroll} style={{ overflowAnchor: "none" }} className="flex-1 overflow-y-auto">
          {openingChat ? (
            <p className="py-10 text-center text-[13px] text-slate">Opening chat…</p>
          ) : messages.length === 0 && !isLoading ? (
            <div className="mx-auto flex h-full max-w-full flex-col items-center justify-center px-6 text-center">
              <AgentOrb state={headerOrb} size={64} />
              <h2 className="mt-6 text-[22px] font-semibold text-ink-800 sm:text-[26px]">
                Hi {firstName}, how can I help?
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate">
                Ask {companionName} about your work, learning and memories, or to help you write about them. Kiswahili works too.
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
              {hasMore && (
                <div className="flex justify-center">
                  <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="cursor-pointer rounded-full px-3 py-1 text-[12px] text-slate transition hover:bg-paper-dim hover:text-ink-800 disabled:cursor-default">
                    {loadingOlder ? "Loading earlier messages…" : "Load earlier messages"}
                  </button>
                </div>
              )}
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p
                      title={m.timestamp}
                      className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl border border-hairline bg-paper px-4 py-2.5 shadow-2xs text-[14px] leading-relaxed text-ink-800 sm:max-w-[75%]"
                    >
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="group flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500/20 via-indigo-500/15 to-teal-500/20">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500/80" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] leading-relaxed text-ink-800">
                        <AiMarkdown content={m.content} />
                      </div>
                      {/* Quiet actions, ChatGPT style: always on touch screens, on hover with a mouse */}
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => copyMessage(m)}
                          aria-label="Copy answer"
                          className="flex items-center gap-1 rounded-md p-1 hover:bg-paper-dim hover:text-ink-800 cursor-pointer"
                        >
                          {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === m.id && <span>Copied</span>}
                        </button>
                        <span>{m.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {isLoading && <Thinking state={aiState} />}

            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-3 pb-3 pt-1 sm:px-5">
          {error && (
            <div role="alert" className="mx-auto mb-2 flex max-w-3xl items-start gap-2 rounded-xl border border-berry/30 bg-berry/10 px-3 py-2 text-[12px] text-berry">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-hairline bg-paper px-4 py-2 shadow-xs transition focus-within:border-sky-500/50"
          >
            <label htmlFor="ai-message" className="sr-only">
              Message {companionName}
            </label>
            <textarea
              id="ai-message"
              ref={boxRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${companionName}…`}
              className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] text-ink-800 outline-none placeholder:text-slate sm:text-[14px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 hidden text-center text-[11px] text-slate sm:block">
            {companionName} reads your own data only, never changes it, and can make mistakes.
          </p>
        </div>
      </div>

      {/* Previous chats */}
      {historyOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setHistoryOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-sm flex-col border-l border-hairline bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <h3 className="text-[14px] font-semibold text-ink-800">Previous chats</h3>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-slate">No saved chats yet. Your conversations will appear here.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className={`group flex items-center gap-1 rounded-xl px-3 py-2 transition hover:bg-paper-dim ${s.id === sessionId ? "bg-paper-dim" : ""}`}>
                    <button
                      type="button"
                      onClick={() => { setHistoryOpen(false); if (s.id !== sessionId) void openSession(s.id); }}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className="truncate text-[13px] font-medium text-ink-800">{s.title}</p>
                      <p className="text-[11px] text-slate">{new Date(s.updated_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                    </button>
                    <button type="button" onClick={() => void removeSession(s.id)} aria-label="Delete chat" className="cursor-pointer rounded-md p-1.5 text-slate opacity-60 transition hover:bg-berry/10 hover:text-berry [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Companion Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-ink-100 bg-white p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
              <div className="flex items-center gap-2.5">
                <AgentOrb state="solving" size={20} />
                <h3 className="text-base font-bold text-ink-900 dark:text-white">
                  Companion Settings & Personality
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                  Companion Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 focus:border-sky-500 focus:outline-hidden dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                  placeholder="e.g. Kimmy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={formRelation}
                    onChange={(e) => setFormRelation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 focus:border-sky-500 focus:outline-hidden dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                    placeholder="e.g. personal assistant"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                    Personality
                  </label>
                  <input
                    type="text"
                    value={formPersonality}
                    onChange={(e) => setFormPersonality(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 focus:border-sky-500 focus:outline-hidden dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                    placeholder="e.g. friendly, inspiring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                  Proactivity Level
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["on_request", "occasional", "active"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormProactivity(lvl)}
                      className={`rounded-xl border py-2 text-xs font-semibold capitalize transition ${formProactivity === lvl
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                        : "border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
                        }`}
                    >
                      {lvl.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                  Access Permissions (Read-Only)
                </label>
                <p className="text-[11px] text-ink-400">
                  Select which areas of your account {companionName} can read to assist you.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "projects",
                    "memories",
                    "wellness",
                    "profile",
                    "learning",
                    "achievements",
                  ].map((perm) => {
                    const active = formPermissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => togglePermission(perm)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${active
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400"
                          : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
                          }`}
                      >
                        {active ? "✓ " : "+ "}
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-700 dark:text-ink-300">
                  Custom Instructions
                </label>
                <textarea
                  value={formCustom}
                  onChange={(e) => setFormCustom(e.target.value)}
                  placeholder="e.g. Always respond in bullet points; prefer concise code snippets."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white p-2.5 text-xs text-ink-900 focus:border-sky-500 focus:outline-hidden dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
              {settingsSuccess && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Saved successfully!
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCompanionSettings}
                  disabled={savingSettings}
                  className="rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Persona"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/** The thinking row: mounted only while a reply is pending, so its clock starts with each message. */
function Thinking({ state }: { state: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const [orb, caption] = STATES[state] ?? STATES.thinking;
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <AgentOrb state={orb} size={32} />
      <span className="text-[13px] text-slate">
        <span className="animate-pulse">{caption}</span>
        {seconds >= 5 && <span className="ml-2 tabular-nums text-slate/70">{seconds}s</span>}
      </span>
    </div>
  );
}
