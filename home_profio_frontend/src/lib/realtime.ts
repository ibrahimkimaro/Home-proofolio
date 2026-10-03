import { Socket, Channel, Presence } from "phoenix";
import { fetchChatToken, type ChatAttachment } from "@/lib/api";

export interface ChatMessage {
  id: string; // server id once stored; the client_id until then
  client_id: string;
  seq?: number; // storage order; missing = not stored yet
  topic?: string;
  recipient_id?: string | null; // DMs: the other member
  read_at?: string | null; // when the recipient read it (DMs)
  text: string;
  author_id: string;
  author_name: string;
  author_username: string;
  timestamp: string;
  status?: "sending" | "sent" | "failed" | "read";
  reply_to?: {
    id: string;
    text: string;
    author_name: string;
    author_id?: string; // missing on replies stored before it was recorded
  } | null;
  reactions?: Record<string, string[]>; // emoji -> list of user_ids
  attachment?: ChatAttachment | null; // a file (image or document); text is then an optional caption
}

/** One line for a chat list, pop-up or quoted reply: the text, or the file the message carries. */
export const messagePreview = (m: Pick<ChatMessage, "text" | "attachment">) =>
  m.text || (m.attachment ? `${m.attachment.content_type.startsWith("image/") ? "📷 Photo" : "📎"} ${m.attachment.filename}` : "");

export interface TypingEvent {
  user_id: string;
  author_name: string;
  is_typing: boolean;
  activity?: "typing" | "uploading"; // "uploading": a file is on its way
  topic: string;
}

export interface UserPresence {
  id: string;
  name: string;
  username: string;
  online_at: string;
}

/** The reader has seen every message sent to them in `topic` with seq <= up_to. */
export interface ReadReceipt {
  reader_id: string;
  up_to: number;
  read_at: string;
  topic: string;
}

export interface Page {
  messages: ChatMessage[];
  has_more: boolean; // older messages exist before this page
}

export interface Reaction {
  message_id: string;
  emoji: string;
  user_id: string;
  user_name: string;
}

function socketUrl() {
  if (process.env.NEXT_PUBLIC_REALTIME_WS_URL) return process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:4000/socket";
  // Over https (a tunnel or TLS proxy in front of :3000) the socket shares the page's origin:
  // next.config.ts proxies /socket to Phoenix. Phones need https for the microphone, i.e. for calls.
  if (window.location.protocol === "https:") return `wss://${window.location.host}/socket`;
  return `ws://${window.location.hostname || "localhost"}:4000/socket`;
}

// One socket per signed-in user. Identity is a backend-signed token (GET /chat/token), refreshed
// every 30 min so automatic reconnects keep working after the 1h expiry.
let shared: { userId: string; socket: Promise<Socket>; stop: () => void } | null = null;

export function getPhoenixSocket(userId: string, customToken?: string): Promise<Socket> {
  if (shared?.userId === userId) return shared.socket;
  shared?.stop();

  let token = customToken || "";
  let timer: ReturnType<typeof setInterval> | undefined;
  const tokenPromise = customToken ? Promise.resolve({ token: customToken }) : fetchChatToken();

  const socket = tokenPromise.then((t) => {
    token = t.token;
    if (!customToken) {
      timer = setInterval(() => fetchChatToken().then((t) => (token = t.token)).catch(() => {}), 30 * 60_000);
    }
    const s = new Socket(socketUrl(), { params: () => ({ token }) });
    s.connect();
    return s;
  });
  const entry = {
    userId,
    socket,
    stop: () => {
      clearInterval(timer);
      socket.then((s) => s.disconnect()).catch(() => {});
    },
  };
  shared = entry;
  socket.catch(() => shared === entry && (shared = null)); // let the next call retry
  return socket;
}

/**
 * Join "direct:<a>_<b>" or "room:<slug>". Every join and automatic rejoin replies with the newest
 * page of stored messages; merging it (mergeMessages) fills anything missed while disconnected.
 */
export function subscribeToConversation(
  socket: Socket,
  topic: string,
  handlers: {
    onHistory: (page: Page) => void;
    onMessage: (msg: ChatMessage) => void;
    onTyping: (typing: TypingEvent) => void;
    onPresence: (presences: UserPresence[]) => void;
    onReadReceipt: (data: ReadReceipt) => void;
    onReaction: (reaction: Reaction) => void;
    onDeleted: (data: { id: string }) => void;
    onJoinError: (reason: string) => void;
    /** Groups: an admin removed me (the server has already closed the channel). */
    onRemoved?: () => void;
  }
): Channel {
  const channel = socket.channel(topic, {});
  const presence = new Presence(channel);

  presence.onSync(() => {
    const list: UserPresence[] = [];
    presence.list((id, { metas }) => {
      const meta = metas[0] || {};
      list.push({ id, name: meta.name || id, username: meta.username || id, online_at: String(meta.online_at || "") });
    });
    handlers.onPresence(list);
  });

  channel.on("new_msg", handlers.onMessage);
  channel.on("user_typing", handlers.onTyping);
  channel.on("messages_read", handlers.onReadReceipt);
  channel.on("msg_reaction", handlers.onReaction);
  channel.on("msg_deleted", handlers.onDeleted);
  channel.on("removed", () => handlers.onRemoved?.());

  channel
    .join()
    .receive("ok", (reply: Page) => handlers.onHistory(reply))
    .receive("error", (resp: { reason?: string }) => handlers.onJoinError(resp?.reason || "could not join"));

  return channel;
}

/** Resolves once the server has stored the message (safe to retry with the same client_id). */
export function sendChannelMessage(channel: Channel, msg: ChatMessage): Promise<ChatMessage> {
  return new Promise((resolve, reject) => {
    channel
      .push("new_msg", { id: msg.client_id, text: msg.text, reply_to: msg.reply_to, attachment: msg.attachment ?? undefined })
      .receive("ok", resolve)
      .receive("error", (err: { reason?: string }) => reject(new Error(err?.reason || "not sent")))
      .receive("timeout", () => reject(new Error("timed out")));
  });
}

export function sendChannelTyping(channel: Channel, isTyping: boolean, activity: "typing" | "uploading" = "typing") {
  channel.push("typing", { is_typing: isTyping, activity });
}

export function sendChannelReaction(channel: Channel, messageId: string, emoji: string) {
  channel.push("reaction", { message_id: messageId, emoji });
}

/** Mark everything sent to me in this DM up to `upTo` as read (stored: survives reloads). */
export function sendChannelReadReceipt(channel: Channel, upTo: number) {
  channel.push("read_receipt", { up_to: upTo });
}

/** The page of messages stored just before `beforeSeq`. */
export function loadOlder(channel: Channel, beforeSeq: number): Promise<Page> {
  return new Promise((resolve, reject) => {
    channel
      .push("older", { before: beforeSeq })
      .receive("ok", resolve)
      .receive("error", () => reject(new Error("could not load older messages")))
      .receive("timeout", () => reject(new Error("timed out")));
  });
}

// ---------------------------------------------------------------------------------------------
// Inbox: the signed-in user's own channel "user:<id>", shared by the whole app (one join per
// socket; Phoenix closes a duplicate join of the same topic). Unread DM counts (from the DB on
// every (re)join), "typing…" to me in chats I don't have open, who is online, a notice per
// new DM for pop-ups, and incoming calls (src/lib/calls.ts).

export interface Inbox {
  unread: Record<string, number>; // topic -> unread DMs
  typing: Record<string, { name: string; until: number }>; // topic -> who is typing to me there
  online: Set<string>; // user ids with the app open
}

/** "incoming_call" rings this tab; "call_handled" (answered in another tab) and "call_ended" stop it. */
export interface CallInboxEvent {
  call_id: string;
  media?: "audio" | "video";
  from?: { id: string; name: string; username: string };
  reason?: string;
}

/** "group_invite": someone invited me (also stored as a notification). "groups_changed": my groups,
 * roles or notifications changed (joined/left/removed, an invite answered): reload them. */
export interface GroupInvite {
  group_id: string;
  name: string;
  topic: string;
  from: string;
}

type InboxListener = {
  onChange?: (inbox: Inbox) => void;
  onNotice?: (msg: ChatMessage) => void;
  onCall?: (event: "incoming_call" | "call_handled" | "call_ended", payload: CallInboxEvent) => void;
  onGroupInvite?: (invite: GroupInvite) => void;
  onGroupsChanged?: () => void;
  /** The notification bell should reload (a message notification appeared, or its chat was read). */
  onNotificationsChanged?: () => void;
};

let inbox: Inbox = { unread: {}, typing: {}, online: new Set() };
let inboxUser = "";
let userChannel: Channel | null = null;
let openTopic = ""; // the chat on screen: its messages are read as they arrive
const listeners = new Set<InboxListener>();

const without = <T,>(obj: Record<string, T>, key: string) => {
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
};
function setInbox(patch: Partial<Inbox>) {
  inbox = { ...inbox, ...patch };
  listeners.forEach((l) => l.onChange?.(inbox));
}

function startInbox(userId: string) {
  if (inboxUser === userId) return;
  inboxUser = userId;
  inbox = { unread: {}, typing: {}, online: new Set() };
  getPhoenixSocket(userId)
    .then((socket) => {
      const ch = socket.channel(`user:${userId}`, {});
      ch.on("notice", (msg: ChatMessage) => {
        const t = msg.topic || "";
        setInbox({
          typing: without(inbox.typing, t), // they sent it, so they stopped typing
          unread: t === openTopic ? inbox.unread : { ...inbox.unread, [t]: (inbox.unread[t] ?? 0) + 1 },
        });
        listeners.forEach((l) => l.onNotice?.(msg));
      });
      ch.on("typing", (e: TypingEvent) =>
        setInbox({
          typing: e.is_typing
            ? { ...inbox.typing, [e.topic]: { name: e.author_name, until: Date.now() + 5000 } }
            : without(inbox.typing, e.topic),
        })
      );
      ch.on("online", (p: { ids: string[] }) => setInbox({ online: new Set(p.ids) }));
      for (const event of ["incoming_call", "call_handled", "call_ended"] as const) {
        ch.on(event, (p: CallInboxEvent) => listeners.forEach((l) => l.onCall?.(event, p)));
      }
      ch.on("group_invite", (p: GroupInvite) => listeners.forEach((l) => l.onGroupInvite?.(p)));
      ch.on("groups_changed", () => listeners.forEach((l) => l.onGroupsChanged?.()));
      ch.on("notifications_changed", () => listeners.forEach((l) => l.onNotificationsChanged?.()));
      userChannel = ch;
      ch.join().receive("ok", (reply: { unread: Record<string, number> }) => setInbox({ unread: without(reply.unread, openTopic) }));
      // Typing pings stop silently when someone closes the tab: expire them.
      setInterval(() => {
        const live = Object.entries(inbox.typing).filter(([, v]) => v.until > Date.now());
        if (live.length !== Object.keys(inbox.typing).length) setInbox({ typing: Object.fromEntries(live) });
      }, 1000);
    })
    .catch(() => (inboxUser = "")); // retried by the next subscriber
}

/** Listen to the inbox (starts it on first use). Returns the unsubscribe function. */
export function subscribeInbox(userId: string, listener: InboxListener): () => void {
  startInbox(userId);
  listeners.add(listener);
  listener.onChange?.(inbox);
  return () => {
    listeners.delete(listener);
  };
}

/** Which chat is on screen ("" = none): its notices don't count as unread. */
export function setOpenTopic(topic: string) {
  openTopic = topic;
  if (topic) setInbox({ unread: without(inbox.unread, topic) });
}

export const getOpenTopic = () => openTopic;

/** Push on the user's own channel (e.g. "decline_call"); resolves on the server's ok. */
export function pushInbox(event: string, payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userChannel) return reject(new Error("not connected"));
    userChannel
      .push(event, payload)
      .receive("ok", () => resolve())
      .receive("error", (e: { reason?: string }) => reject(new Error(e?.reason || "failed")))
      .receive("timeout", () => reject(new Error("timed out")));
  });
}

/** Add or update messages (matched by server id, or by client_id for our own pending ones), in storage order. */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const out = [...prev];
  for (const m of incoming) {
    const i = out.findIndex((x) => x.id === m.id || (x.client_id === m.client_id && x.author_id === m.author_id));
    if (i >= 0) out[i] = { ...out[i], ...m, status: m.read_at || out[i].status === "read" ? "read" : "sent" };
    else out.push({ ...m, status: m.read_at ? "read" : m.seq ? "sent" : m.status });
  }
  const order = (m: ChatMessage) => m.seq ?? Number.MAX_SAFE_INTEGER; // unsent last, in send order
  return out.sort((a, b) => order(a) - order(b));
}
