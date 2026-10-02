"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing, MessageCircle, X } from "lucide-react";
import { getOpenTopic, subscribeInbox, type ChatMessage, type Inbox } from "@/lib/realtime";

const TOAST_MS = 6000;
const chatHref = (topic: string) => `/chat?c=${encodeURIComponent(topic)}`;

/** Live unread counts, "typing…" and online ids for the signed-in user (null until connected). */
export function useChatInbox(userId: string) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  useEffect(() => subscribeInbox(userId, { onChange: setInbox }), [userId]);
  return inbox;
}

export const unreadTotal = (inbox: Inbox | null) => Object.values(inbox?.unread ?? {}).reduce((a, b) => a + b, 0);

/**
 * "X sent you a message": a pop-up anywhere in the app, or a desktop notification while the tab is
 * in the background (after the member turns them on). Nothing for the chat already on screen.
 */
export function ChatNotifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ChatMessage[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    // Read after mount: Notification doesn't exist during server rendering (or on plain-http phones).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof Notification !== "undefined" && window.isSecureContext) setPermission(Notification.permission);
  }, []);

  useEffect(
    () =>
      subscribeInbox(userId, {
        onNotice: (msg) => {
          const topic = msg.topic || "";
          const hidden = document.visibilityState === "hidden";
          if (topic === getOpenTopic() && !hidden) return;
          if (hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
            const n = new Notification(`${msg.author_name} sent you a message`, {
              body: msg.text.slice(0, 140),
              tag: topic, // one per chat: newer messages replace it
              icon: "/images/home-profolio-logo.jpeg",
            });
            n.onclick = () => {
              window.focus();
              router.push(chatHref(topic));
              n.close();
            };
            return;
          }
          setToasts((prev) => [...prev.filter((t) => t.topic !== topic), msg].slice(-3));
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== msg.id)), TOAST_MS);
        },
      }),
    [userId, router]
  );

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 md:bottom-5"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-hairline bg-paper p-3 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                dismiss(t.id);
                router.push(chatHref(t.topic || ""));
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-ink-800">
                  <span className="font-semibold">{t.author_name}</span> sent you a message
                </span>
                <span className="block truncate text-[12px] text-slate">{t.text}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 cursor-pointer rounded-md p-1 text-slate hover:bg-paper-dim hover:text-ink-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {permission === "default" && (
            <button
              type="button"
              onClick={() => Notification.requestPermission().then(setPermission)}
              className="ml-12 mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
            >
              <BellRing className="h-3 w-3" /> Also alert me when Proofolio is in the background
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
