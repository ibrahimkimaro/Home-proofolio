"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset } from "lucide-react";
import { fetchSupportThreads, type SupportThread, type User } from "@/lib/api";
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
                {(t.name || "?")[0].toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-ink-800">{t.name}</span>
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
            <p className="border-b border-hairline px-4 py-3 text-[14px] font-semibold text-ink-800">
              {open.name} <span className="font-normal text-slate">@{open.username}</span>
            </p>
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
