"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCheck, RotateCw, Send } from "lucide-react";
import type { Channel } from "phoenix";
import {
  getPhoenixSocket,
  mergeMessages,
  sendChannelMessage,
  sendChannelReadReceipt,
  sendChannelTyping,
  setOpenTopic,
  subscribeToConversation,
  type ChatMessage,
} from "@/lib/realtime";

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/**
 * One live DM over the realtime chat: history, instant delivery, typing both ways, read ticks.
 * Used by the portfolio assistant (member side) and Admin > Support (admin side).
 */
export function SupportChat({
  me,
  topic,
  peerName,
  firstText,
  guestToken,
  className = "",
}: {
  me: { id: string; name: string; username: string };
  topic: string;
  peerName: string;
  firstText?: string; // sent once when the conversation opens (the question that triggered the hand-off)
  guestToken?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [error, setError] = useState("");
  const chan = useRef<Channel | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPing = useRef(0);
  const peerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingFirst = useRef(firstText);

  const { id: myId, name: myName, username: myUsername } = me;

  const deliver = useCallback((msg: ChatMessage) => {
    const c = chan.current;
    if (!c) return;
    const mark = (status: ChatMessage["status"]) =>
      setMessages((prev) => prev.map((m) => (m.client_id === msg.client_id && !m.seq ? { ...m, status } : m)));
    mark("sending");
    sendChannelMessage(c, msg)
      .then((stored) => setMessages((prev) => mergeMessages(prev, [stored])))
      .catch(() => mark("failed"));
  }, []);

  const send = useCallback(
    (body: string) => {
      const id = newId();
      const msg: ChatMessage = {
        id, client_id: id, text: body, author_id: myId, author_name: myName, author_username: myUsername,
        timestamp: new Date().toISOString(), status: "sending",
      };
      setMessages((prev) => [...prev, msg]);
      deliver(msg);
    },
    [myId, myName, myUsername, deliver]
  );

  useEffect(() => {
    let alive = true;
    if (!topic || !myId) return;
    setOpenTopic(topic);
    getPhoenixSocket(myId, guestToken)
      .then((socket) => {
        if (!alive) return;
        const c = subscribeToConversation(socket, topic, {
          onHistory: (page) => {
            setMessages((prev) => mergeMessages(prev, page.messages));
            const upTo = Math.max(0, ...page.messages.filter((m) => m.author_id !== myId && !m.read_at).map((m) => m.seq ?? 0));
            if (upTo) sendChannelReadReceipt(c, upTo);
            if (pendingFirst.current) {
              const t = pendingFirst.current;
              pendingFirst.current = undefined;
              send(t);
            }
          },
          onMessage: (m) => {
            setMessages((prev) => mergeMessages(prev, [m]));
            if (m.author_id !== myId && m.seq) sendChannelReadReceipt(c, m.seq);
            if (m.author_id !== myId) setPeerTyping(false);
          },
          onTyping: (e) => {
            if (e.user_id === myId) return;
            setPeerTyping(e.is_typing);
            clearTimeout(peerTimer.current);
            if (e.is_typing) peerTimer.current = setTimeout(() => setPeerTyping(false), 5000);
          },
          onPresence: () => {},
          onReadReceipt: (r) =>
            r.reader_id !== myId &&
            setMessages((prev) => prev.map((m) => (m.author_id === myId && m.seq && m.seq <= r.up_to ? { ...m, status: "read", read_at: r.read_at } : m))),
          onReaction: () => {},
          onDeleted: ({ id }) => setMessages((prev) => prev.filter((m) => m.id !== id)),
          onJoinError: (reason) => setError(`Can't reach support: ${reason}`),
        });
        chan.current = c;
      })
      .catch(() => alive && setError("Can't reach support right now. Please try again in a moment."));
    return () => {
      alive = false;
      clearTimeout(idle.current);
      clearTimeout(peerTimer.current);
      chan.current?.leave();
      chan.current = null;
      setOpenTopic("");
    };
  }, [topic, myId, send, guestToken]);

  // The first messages appear already at the bottom (no sweep down from the top); later ones glide in.
  const shownFirst = useRef(false);
  useEffect(() => {
    if (!messages.length) return;
    bottom.current?.scrollIntoView({ behavior: shownFirst.current ? "smooth" : "auto", block: "end" });
    shownFirst.current = true;
  }, [messages, peerTyping]);

  const onType = (v: string) => {
    setText(v);
    const c = chan.current;
    if (!c) return;
    if (Date.now() - lastPing.current > 2000) {
      sendChannelTyping(c, true);
      lastPing.current = Date.now();
    }
    clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      sendChannelTyping(c, false);
      lastPing.current = 0;
    }, 3000);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    send(body);
    setText("");
    clearTimeout(idle.current);
    if (chan.current) sendChannelTyping(chan.current, false);
    lastPing.current = 0;
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4 text-xs leading-relaxed">
        {error && <p className="rounded-lg bg-red-500/10 p-2.5 font-medium text-red-600">{error}</p>}
        {!error && messages.length === 0 && (
          <p className="py-6 text-center text-neutral-500">Say hello to {peerName}. Your message is saved even if they are away.</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.author_id === me.id;
            return (
              <motion.div
                key={m.client_id || m.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 font-medium ${
                    mine
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  }`}
                >
                  {m.text}
                  {mine && (
                    <span className="ml-1.5 inline-flex translate-y-0.5 opacity-80">
                      {m.status === "failed" ? (
                        <button type="button" onClick={() => deliver(m)} aria-label="Retry" className="cursor-pointer">
                          <RotateCw className="h-3 w-3" />
                        </button>
                      ) : m.status === "read" ? (
                        <CheckCheck className="h-3 w-3 text-sky-200" />
                      ) : m.status === "sending" || !m.seq ? (
                        <span className="h-3 w-3 animate-pulse rounded-full bg-white/50" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          {peerTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          maxLength={2000}
          placeholder={`Message ${peerName}…`}
          className="h-10 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 outline-none transition-colors focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
