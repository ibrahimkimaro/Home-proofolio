"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Bell, Building2, FileText, KeyRound, Mail, Star, Megaphone, MessageCircle, PhoneMissed, ShieldAlert, UserPlus, Users, type LucideIcon } from "lucide-react";
import {
  acceptGroupInvite,
  declineGroupInvite,
  fetchNotifications,
  markNotificationsRead,
  signOutOtherDevices,
  type AppNotification,
} from "@/lib/api";
import { NOTIFICATIONS_CHANGED } from "@/components/chat/ChatNotifier";
import { OPEN_CODE_DIALOG } from "@/components/app/CodePrompt";
import { OPEN_ACTIVATION } from "@/components/app/Activation";
import { allowed, desktopAllowed, playAlert, playChime } from "@/lib/chime";

// A fallback: live events (invites, joins) reload the bell at once via NOTIFICATIONS_CHANGED.
const POLL_MS = 180_000;

const ICONS: Record<string, { icon: LucideIcon; cls: string }> = {
  follow: { icon: UserPlus, cls: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  business: { icon: Building2, cls: "bg-brass/15 text-brass-dark" },
  activated: { icon: BadgeCheck, cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  signin: { icon: ShieldAlert, cls: "bg-berry/12 text-berry" },
  broadcast: { icon: Megaphone, cls: "bg-ink/8 text-ink-700" },
  code: { icon: KeyRound, cls: "bg-brass/15 text-brass-dark" },
  like: { icon: Star, cls: "bg-brass/15 text-brass-dark" },
  comment: { icon: MessageCircle, cls: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  cv_request: { icon: FileText, cls: "bg-purple-500/12 text-purple-600 dark:text-purple-400" },
  cv_sent: { icon: FileText, cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  visitor_message: { icon: Mail, cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  activation: { icon: KeyRound, cls: "bg-brass/15 text-brass-dark" },
  message: { icon: MessageCircle, cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  call: { icon: PhoneMissed, cls: "bg-berry/12 text-berry" },
  group_invite: { icon: Users, cls: "bg-purple-500/12 text-purple-600 dark:text-purple-400" },
  group: { icon: Users, cls: "bg-purple-500/12 text-purple-600 dark:text-purple-400" },
};

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** The bell in the app header: follows, business decisions, activation, sign-in alerts and admin messages. */
export function NotificationBell() {
  const router = useRouter();
  const reduce = useReducedMotionConfig();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [secured, setSecured] = useState<string | null>(null);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null); // ids already shown, to chime only for what is new

  // Something new arrived while the page is open: a sound (the activation code gets the attention one), and a
  // browser notification if the tab is in the background. Messages and invitations have their own alerts.
  const announce = useCallback((n: AppNotification) => {
    if (n.kind === "message" || n.kind === "group_invite" || n.kind === "call") return;
    const important = n.kind === "activation" || n.kind === "code";
    if (!allowed(important ? "code" : "activity")) return;
    if (important) playAlert();
    else playChime("activity");
    if (important && document.visibilityState === "hidden" && desktopAllowed("code") && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const note = new Notification(n.title, { body: n.body ?? undefined, tag: n.kind, icon: "/images/home-profolio-logo.jpeg" });
      note.onclick = () => {
        window.focus();
        note.close();
      };
    }
  }, []);

  const load = useCallback(() => {
    fetchNotifications()
      .then((r) => {
        if (seen.current) r.items.filter((n) => !n.read && !seen.current!.has(n.id)).forEach(announce);
        seen.current = new Set([...(seen.current ?? []), ...r.items.map((n) => n.id)]);
        setItems(r.items);
        setUnread(r.unread);
        setLoaded(true);
      })
      .catch(() => {});
  }, [announce]);

  // Fresh on open, every minute, when the tab comes back, and right after activation.
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("proofolio:activated", load);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("proofolio:activated", load);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function readLocally(ids: string[] | null) {
    const hit = (n: AppNotification) => ids === null || ids.includes(n.id);
    const newlyRead = items.filter((n) => hit(n) && !n.read).length;
    setUnread((u) => Math.max(0, u - newlyRead));
    // Read means done: it leaves the panel (the server only sends unread ones, too).
    setItems((list) => list.filter((n) => !hit(n)));
  }

  function openItem(n: AppNotification) {
    if (!n.read) {
      readLocally([n.id]);
      markNotificationsRead([n.id]).catch(() => {});
    }
    // A code notice opens the dialog to type the code, like the banner's button.
    if (n.kind === "activation") {
      setOpen(false);
      window.dispatchEvent(new Event(OPEN_ACTIVATION));
      return;
    }
    if (n.kind === "code") {
      setOpen(false);
      window.dispatchEvent(new Event(OPEN_CODE_DIALOG));
      return;
    }
    if (n.link && n.kind !== "group_invite") {
      setOpen(false);
      router.push(n.link);
    }
  }

  async function notMe(n: AppNotification) {
    await signOutOtherDevices().catch(() => {});
    readLocally([n.id]);
    markNotificationsRead([n.id]).catch(() => {});
    setSecured(n.id);
  }

  // The invite link is /chat?g=<group id>. Answering it updates the row on the server (it stops being an invite).
  async function answerInvite(n: AppNotification, accept: boolean) {
    const groupId = new URLSearchParams((n.link ?? "").split("?")[1] ?? "").get("g");
    if (!groupId || busyInvite) return;
    setBusyInvite(n.id);
    try {
      if (accept) {
        const joined = await acceptGroupInvite(groupId);
        setOpen(false);
        load();
        router.push(`/chat?c=${encodeURIComponent(joined.topic)}`);
      } else {
        await declineGroupInvite(groupId);
        load();
      }
    } catch {
      load();
    } finally {
      setBusyInvite(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-paper-dim"
      >
        <motion.span
          key={unread}
          animate={unread && !reduce ? { rotate: [0, -14, 12, -8, 5, 0] } : undefined}
          transition={{ duration: 0.6 }}
          className="flex"
        >
          <Bell className="h-[20px] w-[20px]" strokeWidth={1.8} />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: reduce ? 1 : 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-berry px-1 text-[11px] font-bold leading-none text-white ring-2 ring-paper tabular-nums"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -6, scale: reduce ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-x-3 top-16 z-50 origin-top-right overflow-hidden rounded-2xl border border-hairline/70 bg-paper shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-hairline/60 px-4 py-3">
              <p className="text-[15px] font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    readLocally(null);
                    markNotificationsRead().catch(() => {});
                  }}
                  className="cursor-pointer text-[13px] font-medium text-brass-dark hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <ul className="max-h-[min(70vh,28rem)] overflow-y-auto">
              {loaded && items.length === 0 && (
                <li className="px-6 py-10 text-center text-[14px] text-slate">
                  You&apos;re all caught up. New messages, follows and alerts will show up here.
                </li>
              )}
              {items.map((n) => {
                const { icon: Icon, cls } = ICONS[n.kind] ?? ICONS.broadcast;
                return (
                  <li key={n.id} className="border-b border-hairline/40 last:border-0">
                    <div
                      role={n.link ? "link" : undefined}
                      tabIndex={n.link ? 0 : undefined}
                      onClick={() => openItem(n)}
                      onKeyDown={(e) => e.key === "Enter" && openItem(n)}
                      className={`flex gap-3 px-4 py-3 transition-colors ${n.link ? "cursor-pointer hover:bg-paper-dim" : ""} ${
                        n.read ? "" : "bg-brass/[0.04]"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}>
                        <Icon className="h-[17px] w-[17px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[14px] leading-snug ${n.read ? "text-ink-700" : "font-semibold text-ink"}`}>{n.title}</p>
                        {n.body && <p className="mt-0.5 text-[13px] leading-snug text-slate">{n.body}</p>}
                        {n.kind === "signin" &&
                          (secured === n.id ? (
                            <p className="mt-2 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                              Other devices are signed out. Change your password in Settings to finish.
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                notMe(n);
                              }}
                              className="mt-2 cursor-pointer rounded-full border border-berry/40 px-3 py-1 text-[12px] font-semibold text-berry transition-colors hover:bg-berry/5"
                            >
                              This wasn&apos;t me
                            </button>
                          ))}
                        {n.kind === "group_invite" && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busyInvite === n.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                answerInvite(n, true);
                              }}
                              className="cursor-pointer rounded-full bg-ink px-3.5 py-1 text-[12px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyInvite === n.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                answerInvite(n, false);
                              }}
                              className="cursor-pointer rounded-full border border-hairline px-3.5 py-1 text-[12px] font-semibold text-ink-700 transition-colors hover:bg-paper-dim disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        <p className="mt-1 text-[12px] text-slate/80">{ago(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          aria-label="Mark as read"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            readLocally([n.id]);
                            markNotificationsRead([n.id]).catch(() => {});
                          }}
                          className="group -mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-paper-dim"
                        >
                          <span className="h-2 w-2 rounded-full bg-berry transition-transform group-hover:scale-125" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
