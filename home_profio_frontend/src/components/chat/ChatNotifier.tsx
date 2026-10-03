"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing, MessageCircle, Users, X } from "lucide-react";
import { acceptGroupInvite, declineGroupInvite } from "@/lib/api";
import { getOpenTopic, messagePreview, subscribeInbox, type ChatMessage, type GroupInvite, type Inbox } from "@/lib/realtime";

const TOAST_MS = 6000;
const chatHref = (topic: string) => `/chat?c=${encodeURIComponent(topic)}`;

/** Ask the notification bell to reload now (a live event changed what it should show). */
export const NOTIFICATIONS_CHANGED = "proofolio:notifications-changed";
const refreshBell = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

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
 * Group invitations pop up with Accept / Decline and stay until answered or dismissed; they are
 * also in the notification bell, so an invite sent while offline is answered from there later.
 */
export function ChatNotifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ChatMessage[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
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
              body: messagePreview(msg).slice(0, 140),
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
        onGroupInvite: (invite) => {
          refreshBell();
          setInvites((prev) => [...prev.filter((i) => i.group_id !== invite.group_id), invite]);
          if (document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission === "granted") {
            const n = new Notification(`${invite.from} invited you to "${invite.name}"`, {
              body: "Open Proofolio to accept or decline.",
              tag: `group-${invite.group_id}`,
              icon: "/images/home-profolio-logo.jpeg",
            });
            n.onclick = () => {
              window.focus();
              n.close();
            };
          }
        },
        onGroupsChanged: refreshBell,
        onNotificationsChanged: refreshBell,
      }),
    [userId, router]
  );

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const dropInvite = (groupId: string) => setInvites((prev) => prev.filter((i) => i.group_id !== groupId));

  const answer = async (invite: GroupInvite, accept: boolean) => {
    setAnswering(invite.group_id);
    setInviteError(null);
    try {
      if (accept) {
        const joined = await acceptGroupInvite(invite.group_id);
        router.push(chatHref(joined.topic));
      } else {
        await declineGroupInvite(invite.group_id);
      }
      dropInvite(invite.group_id);
    } catch (e) {
      setInviteError(e instanceof Error && e.message ? e.message : "That did not work. Try again from your notifications.");
    } finally {
      setAnswering(null);
      refreshBell();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 md:bottom-5"
    >
      {invites.map((inv) => (
        <div
          key={inv.group_id}
          role="alertdialog"
          aria-label={`Invitation to ${inv.name}`}
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-hairline bg-paper p-3 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/12 text-purple-600">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink-800">
                <span className="font-semibold">{inv.from}</span> invited you to join <span className="font-semibold">&ldquo;{inv.name}&rdquo;</span>
              </p>
              {inv.topic && <p className="truncate text-[12px] text-slate">{inv.topic}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={answering === inv.group_id}
                  onClick={() => answer(inv, true)}
                  className="cursor-pointer rounded-full bg-ink px-3.5 py-1 text-[12px] font-semibold text-paper hover:opacity-90 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={answering === inv.group_id}
                  onClick={() => answer(inv, false)}
                  className="cursor-pointer rounded-full border border-hairline px-3.5 py-1 text-[12px] font-semibold text-ink-700 hover:bg-paper-dim disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
              {inviteError && answering === null && <p className="mt-1.5 text-[11px] text-berry">{inviteError}</p>}
            </div>
            <button
              type="button"
              onClick={() => dropInvite(inv.group_id)}
              aria-label="Later (it stays in your notifications)"
              title="Later (it stays in your notifications)"
              className="shrink-0 cursor-pointer rounded-md p-1 text-slate hover:bg-paper-dim hover:text-ink-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
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
                <span className="block truncate text-[12px] text-slate">{messagePreview(t)}</span>
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
