"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset, Trash2 } from "lucide-react";
import { clearChat, fetchSupportThreads, type SupportThread, type User } from "@/lib/api";
import { useChatInbox } from "@/components/chat/ChatNotifier";
import { SupportChat } from "@/components/chat/SupportChat";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

/** Admin > Support: members who wrote to support. Replies go out live, with typing and read ticks. */
export function SupportSection({ admin, onError }: { admin: User; onError: (m: string) => void }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [open, setOpen] = useState<SupportThread | null>(null);
  const inbox = useChatInbox(admin.id);

  const load = useCallback(
    () => fetchSupportThreads().then(setThreads).catch((e) => onError(e instanceof Error ? e.message : "Could not load support")),
    [onError]
  );
  // Reload when a new message arrives (inbox changes) and as a fallback every 20s.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, inbox?.unread]);
  useEffect(() => {
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  // "Delete chat" for myself: this thread leaves my list (the member or guest still has their copy); it returns,
  // with only the new messages, if they write again.
  async function deleteThread(t: SupportThread) {
    if (!window.confirm(`Delete your chat with ${t.name} for yourself? ${t.is_guest ? "The visitor" : "They"} keep their copy.`)) return;
    try {
      await clearChat(t.topic);
      setThreads((list) => list.filter((x) => x.topic !== t.topic));
      setOpen((o) => (o?.topic === t.topic ? null : o));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not delete the chat");
    }
  }

  const me = { id: admin.id, name: "Home Proofolio Support", username: admin.username || "support" };

  return (
    <div className="grid min-h-[560px] gap-4 lg:grid-cols-[320px_1fr]">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-paper">
        <p className="border-b border-hairline px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-slate">Conversations</p>
        {threads.length === 0 && <p className="p-6 text-center text-[13px] text-slate">No one has written to support yet.</p>}
        {threads.map((t) => {
          const unread = inbox?.unread[t.topic] ?? t.unread;
          return (
            <button
              key={t.topic}
              onClick={() => setOpen(t)}
              className={`flex w-full cursor-pointer items-start gap-3 border-b border-hairline/60 px-4 py-3 text-left transition-colors hover:bg-paper-dim ${open?.topic === t.topic ? "bg-paper-dim" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[13px] font-bold text-emerald-600">
                {t.is_guest ? "G" : (t.name || "?")[0].toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink-800">
                    <span className="truncate">{t.name}</span>
                    {t.is_guest && (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        Guest
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate">{ago(t.last_at)}</span>
                </span>
                <span className="block truncate text-[12px] text-slate">{t.last}</span>
              </span>
              {unread > 0 && <span className="mt-1 rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">{unread}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-hairline bg-paper">
        {open ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-800">
                {open.name} <span className="font-normal text-slate">@{open.username}</span>
                {open.is_guest && (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Guest Visitor
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => deleteThread(open)}
                title="Delete this chat for me"
                aria-label="Delete this chat for me"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-semibold text-berry hover:bg-berry/5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete chat
              </button>
            </div>
            <SupportChat key={open.topic} me={me} topic={open.topic} peerName={open.name} />
          </>
        ) : (
          <div className="m-auto text-center text-slate">
            <Headset className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-[13px]">Pick a conversation to reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
