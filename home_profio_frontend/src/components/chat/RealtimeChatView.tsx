"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatInbox } from "@/components/chat/ChatNotifier";
import {
  MessageSquare,
  Users,
  Search,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Send,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Shield,
  Clock,
  AlertCircle,
  User as UserIcon,
} from "lucide-react";
import { User, fetchChatContacts } from "@/lib/api";
import {
  ChatMessage,
  TypingEvent,
  UserPresence,
  getPhoenixSocket,
  subscribeToConversation,
  sendChannelMessage,
  sendChannelTyping,
  sendChannelReaction,
  sendChannelReadReceipt,
  mergeMessages,
  loadOlder,
  subscribeInbox,
  setOpenTopic,
} from "@/lib/realtime";
import { Channel, Socket } from "phoenix";

export interface ChatContact {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  type: "direct" | "group";
  pairId?: string;
  roomId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  membersCount?: number;
}

// Real contacts are loaded from /chat/contacts directly from PostgreSQL
const INITIAL_CONTACTS: ChatContact[] = [];

const COMMON_EMOJIS = ["❤️", "👍", "🔥", "🚀", "😂", "👏", "🎉", "💯", "🙏", "⚡"];

const TYPING_SEND_EVERY = 2000; // ms between "still typing" pings while keys are pressed
const TYPING_IDLE = 3000; // send "stopped typing" after this long without a key
const TYPING_SHOW_FOR = 5000; // hide someone's indicator if no ping arrives for this long

const topicOf = (c: ChatContact) => (c.type === "group" ? `room:${c.roomId || c.id}` : `direct:${c.pairId}`);
// crypto.randomUUID only exists on https/localhost; phones on the LAN use plain http.
const newClientId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Unsent messages survive a reload: kept per conversation until the server confirms them.
const outboxKey = (topic: string) => `proofolio_outbox_${topic}`;
function loadOutbox(topic: string): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(outboxKey(topic)) || "[]");
  } catch {
    return [];
  }
}
function saveOutbox(topic: string, msgs: ChatMessage[]) {
  try {
    if (msgs.length) localStorage.setItem(outboxKey(topic), JSON.stringify(msgs));
    else localStorage.removeItem(outboxKey(topic));
  } catch {
    // storage full or blocked: the message still shows as "sending"/"failed" with Retry
  }
}

function withReaction(m: ChatMessage, emoji: string, userId: string, toggle: boolean): ChatMessage {
  const users = m.reactions?.[emoji] || [];
  const has = users.includes(userId);
  const next = has ? (toggle ? users.filter((u) => u !== userId) : users) : [...users, userId];
  return { ...m, reactions: { ...m.reactions, [emoji]: next } };
}

export function RealtimeChatView({ user }: { user: User }) {
  const me = user.id;
  const [contacts, setContacts] = useState<ChatContact[]>(INITIAL_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "group">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; until: number }>>({});
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]); // in the open conversation
  const inbox = useChatInbox(me); // unread counts, "typing…" to me elsewhere, who is online
  const unread = inbox?.unread ?? {};
  const onlineIds = inbox?.online ?? new Set<string>();
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState<ChatMessage | null>(null);

  // New Chat Modals
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTopic, setNewGroupTopic] = useState("");

  // Mobile WhatsApp-style view toggle: show conversations list vs active chat room
  const [showMobileChat, setShowMobileChat] = useState(false);

  const channelRef = useRef<Channel | null>(null);
  const topicRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingSentAt = useRef(0);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Fetch real registered users from DB
  useEffect(() => {
    let active = true;
    fetchChatContacts()
      .then((realUsers) => {
        if (!active) return;
        setLoadingContacts(false);
        if (!realUsers || realUsers.length === 0) return;
        const realContacts: ChatContact[] = realUsers.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          avatar: u.avatar || undefined,
          type: "direct",
          pairId: u.pairId,
          isOnline: false,
        }));
        setContacts((prev) => {
          const userGroups = prev.filter((c) => c.type === "group");
          return [...realContacts, ...userGroups];
        });
        setSelectedContact((prev) => prev || realContacts[0]);
      })
      .catch((err) => {
        if (active) setLoadingContacts(false);
        console.warn("[RealtimeChat] Could not load database contacts:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Follow the newest message (not when older pages are prepended).
  const newestKey = messages.at(-1)?.client_id;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [newestKey, typingUsers]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Keep this conversation's unsent messages in the outbox (topicRef is switched before messages are).
  useEffect(() => {
    if (topicRef.current) saveOutbox(topicRef.current, messages.filter((m) => !m.seq && m.author_id === me));
  }, [messages, me]);

  // Drop typing indicators whose pings stopped (e.g. the typist closed the tab).
  useEffect(() => {
    const t = setInterval(
      () =>
        setTypingUsers((prev) => {
          const live = Object.entries(prev).filter(([, v]) => v.until > Date.now());
          return live.length === Object.keys(prev).length ? prev : Object.fromEntries(live);
        }),
      1000
    );
    return () => clearInterval(t);
  }, []);

  // Connect to Phoenix (one shared socket per user)
  useEffect(() => {
    let alive = true;
    let cleanup: (() => void) | undefined;
    getPhoenixSocket(me)
      .then((s) => {
        if (!alive) return;
        setSocket(s);
        setSocketConnected(s.isConnected());
        const refs = [
          s.onOpen(() => setSocketConnected(true)),
          s.onError(() => setSocketConnected(false)),
          s.onClose(() => setSocketConnected(false)),
        ];
        cleanup = () => s.off(refs);
      })
      .catch(() => alive && setChatError("Chat is unavailable right now. Try reloading the page."));
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [me]);

  // Previews for chats that aren't open (unread counts and pop-ups live in the shared inbox).
  useEffect(
    () =>
      subscribeInbox(me, {
        onNotice: (msg) =>
          setContacts((prev) =>
            prev.map((c) => (topicOf(c) === msg.topic ? { ...c, lastMessage: msg.text, lastMessageTime: "Just now" } : c))
          ),
      }),
    [me]
  );

  // Open the chat a notification linked to (/chat?c=<topic>), then drop the param.
  const router = useRouter();
  const wantedTopic = useSearchParams().get("c");
  useEffect(() => {
    const target = wantedTopic && contacts.find((c) => topicOf(c) === wantedTopic);
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedContact(target);
    setShowMobileChat(true);
    router.replace("/chat");
  }, [wantedTopic, contacts, router]);

  // Send (or resend) one message. Same client_id = stored once, so retrying is always safe.
  const deliver = useCallback((msg: ChatMessage) => {
    const chan = channelRef.current;
    const topic = topicRef.current;
    if (!chan) return; // stays in the outbox; sent when the conversation joins
    const mark = (status: ChatMessage["status"]) =>
      setMessages((prev) => prev.map((m) => (m.client_id === msg.client_id && !m.seq ? { ...m, status } : m)));
    mark("sending");
    sendChannelMessage(chan, msg)
      .then((stored) => topicRef.current === topic && setMessages((prev) => mergeMessages(prev, [stored])))
      .catch(() => topicRef.current === topic && mark("failed"));
  }, []);

  // Join the selected conversation
  useEffect(() => {
    if (!socket || !selectedContact) return;
    const topic = topicOf(selectedContact);
    const isDirect = selectedContact.type === "direct";
    const live = () => topicRef.current === topic;
    let unseenUpTo = 0; // read receipt held back while the tab is hidden
    topicRef.current = topic;
    // Reset per-conversation state as part of switching the subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(loadOutbox(topic));
    setTypingUsers({});
    setChatError(null);
    setHasOlder(false);
    setOpenTopic(topic);

    // One stored receipt: "read everything sent to me here up to seq N".
    const markRead = (msgs: ChatMessage[]) => {
      if (!isDirect) return;
      const upTo = Math.max(0, ...msgs.filter((m) => m.author_id !== me && !m.read_at).map((m) => m.seq ?? 0));
      if (!upTo) return;
      if (document.visibilityState === "visible") sendChannelReadReceipt(chan, upTo);
      else unseenUpTo = Math.max(unseenUpTo, upTo);
    };

    const chan = subscribeToConversation(socket, topic, {
      onHistory: (page) => {
        if (!live()) return;
        // A full page that starts after everything we have = we missed more than a page while away:
        // start over from this page (older ones load on demand) rather than show a silent hole.
        const newest = Math.max(0, ...messagesRef.current.map((m) => m.seq ?? 0));
        const gap = page.has_more && newest > 0 && (page.messages[0]?.seq ?? 0) > newest;
        setMessages((prev) => mergeMessages(gap ? prev.filter((m) => !m.seq) : prev, page.messages));
        if (gap || newest === 0) setHasOlder(page.has_more);
        markRead(page.messages);
        loadOutbox(topic).forEach(deliver); // anything unsent from before the (re)connect
      },
      onMessage: (msg) => {
        if (!live()) return;
        setMessages((prev) => mergeMessages(prev, [msg]));
        markRead([msg]);
        setContacts((prev) =>
          prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: msg.text, lastMessageTime: "Just now" } : c))
        );
      },
      onTyping: (e: TypingEvent) => {
        if (!live() || e.user_id === me) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (e.is_typing) next[e.user_id] = { name: e.author_name, until: Date.now() + TYPING_SHOW_FOR };
          else delete next[e.user_id];
          return next;
        });
      },
      onPresence: (list) => live() && setOnlineUsers(list),
      onReadReceipt: (data) =>
        live() &&
        data.reader_id !== me &&
        setMessages((prev) =>
          prev.map((m) => (m.author_id === me && m.seq && m.seq <= data.up_to ? { ...m, status: "read", read_at: data.read_at } : m))
        ),
      onReaction: (r) =>
        live() && setMessages((prev) => prev.map((m) => (m.id === r.message_id ? withReaction(m, r.emoji, r.user_id, false) : m))),
      onDeleted: ({ id }) => live() && setMessages((prev) => prev.filter((m) => m.id !== id)),
      onJoinError: (reason) => live() && setChatError(`Can't open this chat: ${reason}`),
    });
    channelRef.current = chan;

    const onVisible = () => {
      if (document.visibilityState === "visible" && unseenUpTo) {
        sendChannelReadReceipt(chan, unseenUpTo);
        unseenUpTo = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      chan.leave();
      setOpenTopic("");
      if (channelRef.current === chan) channelRef.current = null;
    };
  }, [socket, selectedContact, me, deliver]);

  const stopTyping = () => {
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = null;
    if (typingSentAt.current && channelRef.current) sendChannelTyping(channelRef.current, false);
    typingSentAt.current = 0;
  };

  // Throttled: one "typing" ping every TYPING_SEND_EVERY while keys are pressed, "stopped" when idle.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!channelRef.current) return;
    if (Date.now() - typingSentAt.current > TYPING_SEND_EVERY) {
      sendChannelTyping(channelRef.current, true);
      typingSentAt.current = Date.now();
    }
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = setTimeout(stopTyping, TYPING_IDLE);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const clientId = newClientId();
    const msg: ChatMessage = {
      id: clientId,
      client_id: clientId,
      text,
      author_id: me,
      author_name: user.fullname || "User",
      author_username: user.username || me,
      timestamp: new Date().toISOString(),
      status: "sending",
      reply_to: replyMessage
        ? { id: replyMessage.id, text: replyMessage.text, author_name: replyMessage.author_name }
        : undefined,
    };

    setMessages((prev) => [...prev, msg]);
    setInputText("");
    setReplyMessage(null);
    setShowEmojiPicker(false);
    if (selectedContact) {
      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: text, lastMessageTime: "Just now" } : c))
      );
    }
    stopTyping();
    deliver(msg);
  };

  const handleLoadOlder = async () => {
    const chan = channelRef.current;
    const oldest = messages.find((m) => m.seq)?.seq;
    if (!chan || !oldest) return;
    const topic = topicRef.current;
    setLoadingOlder(true);
    try {
      const page = await loadOlder(chan, oldest);
      if (topicRef.current !== topic) return;
      setMessages((prev) => mergeMessages(prev, page.messages));
      setHasOlder(page.has_more);
    } catch {
      setChatError("Couldn't load older messages. Try again.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? withReaction(m, emoji, me, true) : m)));
    if (channelRef.current) sendChannelReaction(channelRef.current, messageId, emoji);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    // Room ids are [a-z0-9-]{1,64} (enforced by the chat server).
    const slug = newGroupName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
    if (!slug) return;

    const newGroup: ChatContact = {
      id: `group-${slug}`,
      name: newGroupName.trim(),
      username: slug,
      role: newGroupTopic || "Community group",
      type: "group",
      roomId: slug,
      lastMessage: "Group created. Start the real-time discussion!",
      lastMessageTime: "Just now",
      isOnline: true,
    };

    setContacts([newGroup, ...contacts.filter((c) => c.id !== newGroup.id)]);
    setSelectedContact(newGroup);
    setNewGroupName("");
    setNewGroupTopic("");
    setShowNewGroupModal(false);
    setShowMobileChat(true);
  };

  // Filtered contacts
  const filteredContacts = contacts.filter((c) => {
    const matchTab =
      activeTab === "all" ||
      (activeTab === "direct" && c.type === "direct") ||
      (activeTab === "group" && c.type === "group");
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // Someone typing to me in a chat that isn't open (the inbox drops stale entries every second).
  const typingTo = (c: ChatContact) => !!inbox?.typing[topicOf(c)];
  const typingNames = Object.values(typingUsers).map((t) => t.name);
  const isCurrentTyping = typingNames.length > 0;
  const typingLabel = `${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} typing…`;
  const peerOnline =
    selectedContact?.type === "direct" ? onlineIds.has(selectedContact.id) : (selectedContact ? onlineUsers.length > 1 : false);

  return (
    <div className="w-full h-[calc(100dvh-125px)] sm:h-[calc(100vh-140px)] sm:min-h-[580px] rounded-none sm:rounded-3xl border-0 sm:border border-hairline bg-paper sm:shadow-2xl flex overflow-hidden">
      {/* ========================================================
          LEFT SIDEBAR: Conversation List (WhatsApp / Instagram style)
          ======================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-hairline flex-col bg-paper shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"
          }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-hairline bg-paper-dim/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-ink text-paper font-bold flex items-center justify-center text-sm shadow-sm">
                {(user.profile?.display_name || user.username || "P")[0].toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-paper" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900 leading-tight">
                {user.profile?.display_name || user.username || "My Proofolio"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                />
                <span className="text-[11px] font-semibold text-slate">
                  {socketConnected ? "Elixir Phoenix Live" : "Connecting..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewDmModal(true)}
              title="New Direct Message"
              className="p-2 rounded-xl text-slate hover:text-ink hover:bg-paper-dim transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNewGroupModal(true)}
              title="Create Group"
              className="p-2 rounded-xl text-slate hover:text-ink hover:bg-paper-dim transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-hairline/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats, groups, peers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-paper-dim text-xs text-ink-900 placeholder:text-slate focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 mt-2.5">
            {[
              { id: "all", label: "All Chats" },
              { id: "direct", label: "Direct (1:1)" },
              { id: "group", label: "Groups" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${activeTab === tab.id
                    ? "bg-ink text-paper"
                    : "bg-paper-dim text-slate hover:text-ink"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-hairline/40">
          {loadingContacts ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-2xl bg-paper-dim shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-paper-dim rounded-md w-3/4" />
                    <div className="h-2.5 bg-paper-dim rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-slate">
              <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No registered members found</p>
              <p className="text-[11px] text-slate mt-0.5">Invite peers to start chatting.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    setShowMobileChat(true);
                  }}
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition-all cursor-pointer ${isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/20 border-l-4 border-blue-600"
                      : "hover:bg-paper-dim/60"
                    }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${contact.type === "group"
                          ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}
                    >
                      {contact.type === "group" ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        contact.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {(contact.type === "direct" ? onlineIds.has(contact.id) : contact.isOnline) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-paper" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[13px] font-bold text-ink-900 truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] text-slate font-medium shrink-0">
                        {contact.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate truncate font-medium flex items-center gap-1">
                      {typingTo(contact) ? (
                        <span className="font-semibold text-emerald-600">typing…</span>
                      ) : (
                        contact.lastMessage || `@${contact.username}`
                      )}
                    </p>
                  </div>

                  {unread[topicOf(contact)] > 0 && (
                    <span
                      aria-label={`${unread[topicOf(contact)]} unread`}
                      className="ml-1 min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0"
                    >
                      {unread[topicOf(contact)] > 99 ? "99+" : unread[topicOf(contact)]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT PANEL: WhatsApp / Instagram Chat View
          ======================================================== */}
      <div
        className={`bg-paper flex-col ${showMobileChat
            ? "fixed inset-0 z-50 flex h-[100dvh] md:relative md:inset-auto md:z-auto md:h-auto md:flex-1 md:flex overflow-hidden"
            : "hidden md:flex md:flex-1 relative overflow-hidden"
          }`}
      >
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-radial from-paper-dim/60 to-paper-dim/20">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-ink-900 mb-1">Direct Real-Time Chat</h3>
            <p className="text-xs text-slate max-w-sm">
              Select any registered member from the database to start a live encrypted conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 sm:h-16 px-3.5 sm:px-5 border-b border-hairline bg-paper/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 pt-[env(safe-area-inset-top)] sm:pt-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* WhatsApp-style Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileChat(false)}
                  className="p-1.5 -ml-1 rounded-xl text-slate hover:text-ink hover:bg-paper-dim md:hidden shrink-0 cursor-pointer"
                  title="Back to conversation list"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5 text-ink-900" />
                </button>
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${selectedContact.type === "group"
                        ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                        : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      }`}
                  >
                    {selectedContact.type === "group" ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      selectedContact.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {peerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink-900 truncate flex items-center gap-2">
                    {selectedContact.name}
                    {selectedContact.type === "group" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        Group Channel
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate truncate font-medium flex items-center gap-1.5">
                    {isCurrentTyping ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                        {typingLabel}
                      </span>
                    ) : peerOnline ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Now
                      </span>
                    ) : (
                      selectedContact.role
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate">
                <button
                  onClick={() => alert("Audio call feature connecting via WebRTC...")}
                  title="Voice Call"
                  className="p-2 rounded-xl hover:bg-paper-dim hover:text-ink transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => alert("Video call feature connecting via WebRTC...")}
                  title="Video Call"
                  className="p-2 rounded-xl hover:bg-paper-dim hover:text-ink transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  title="More Options"
                  className="p-2 rounded-xl hover:bg-paper-dim hover:text-ink transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream (WhatsApp Wallpaper Background) */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-radial from-paper-dim/60 to-paper-dim/20">
              {/* Channel Banner */}
              <div className="text-center my-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-paper border border-hairline text-slate shadow-2xs">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  Messages are stored on Proofolio and can be reviewed by admins for safety
                </span>
              </div>

              {chatError && (
                <div role="alert" className="mx-auto max-w-md rounded-xl border border-berry/30 bg-berry/10 px-3 py-2 text-center text-xs font-semibold text-berry">
                  {chatError}
                </div>
              )}

              {hasOlder && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-hairline bg-paper text-slate hover:text-ink disabled:opacity-50 cursor-pointer"
              >
                {loadingOlder ? "Loading…" : "Load older messages"}
              </button>
            </div>
          )}

          {messages.map((msg) => {
                const isMe = msg.author_id === me;
                return (
                  <div
                    key={msg.client_id || msg.id}
                    className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
                  >
                    {/* Author Name in Groups */}
                    {!isMe && selectedContact.type === "group" && (
                      <span className="text-[10px] font-bold text-slate ml-3 mb-1">
                        {msg.author_name}
                      </span>
                    )}

                    <div className="relative max-w-[85%] sm:max-w-[70%]">
                      {/* Replied Snippet */}
                      {msg.reply_to && (
                        <div
                          className={`text-xs p-2 mb-1 rounded-xl border border-hairline/60 ${isMe ? "bg-white/10 text-paper/80" : "bg-paper-dim text-slate"
                            }`}
                        >
                          <span className="font-bold block text-[10px]">
                            {msg.reply_to.author_name}
                          </span>
                          <p className="truncate line-clamp-1">{msg.reply_to.text}</p>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl shadow-xs transition-all relative ${isMe
                            ? "bg-emerald-600 text-white rounded-br-xs"
                            : "bg-paper text-ink-900 border border-hairline rounded-bl-xs"
                          }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {msg.text}
                        </p>

                        {/* Metadata & Status Ticks */}
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${isMe ? "text-emerald-100" : "text-slate"
                            }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe && (
                            <span title={msg.status === "read" ? "Read" : msg.status === "sent" ? "Sent" : msg.status === "failed" ? "Not sent" : "Sending"}>
                              {msg.status === "read" ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-300" aria-label="Read" />
                              ) : msg.status === "sent" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-200" aria-label="Sent" />
                              ) : msg.status === "failed" ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-200" aria-label="Not sent" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-emerald-200" aria-label="Sending" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {isMe && msg.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => deliver(msg)}
                          className="mt-1 text-[11px] font-semibold text-berry hover:underline cursor-pointer"
                        >
                          Not sent · Tap to retry
                        </button>
                      )}

                      {/* Reactions Badge */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 -mb-2 z-10 relative">
                          {Object.entries(msg.reactions).map(([emoji, users]) =>
                            users.length > 0 ? (
                              <span
                                key={emoji}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-paper border border-hairline text-xs shadow-xs"
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-bold text-slate">
                                  {users.length}
                                </span>
                              </span>
                            ) : null
                          )}
                        </div>
                      )}

                      {/* Quick Reaction Hover Menu */}
                      <div
                        className={`absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-full bg-paper border border-hairline shadow-md z-20 ${isMe ? "right-0" : "left-0"
                          }`}
                      >
                        {["❤️", "👍", "🔥", "😂"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="w-6 h-6 hover:scale-125 transition-transform text-xs flex items-center justify-center cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setReplyMessage(msg)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-slate hover:text-ink cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Live Typing Bar */}
            {isCurrentTyping && (
              <div className="px-6 py-1.5 bg-paper-dim/80 border-t border-hairline text-xs font-semibold text-emerald-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{typingLabel}</span>
              </div>
            )}

            {/* Reply Bar Preview */}
            {replyMessage && (
              <div className="px-4 py-2 border-t border-hairline bg-paper-dim/60 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold text-ink-900 block">
                    Replying to {replyMessage.author_name}
                  </span>
                  <p className="text-slate line-clamp-1">{replyMessage.text}</p>
                </div>
                <button
                  onClick={() => setReplyMessage(null)}
                  className="p-1 text-slate hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Emoji Selector Tray */}
            {showEmojiPicker && (
              <div className="p-3 border-t border-hairline bg-paper flex items-center gap-2 overflow-x-auto">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-paper-dim text-lg flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar (WhatsApp / Instagram Style) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3.5 border-t border-hairline bg-paper flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-xl text-slate hover:text-ink hover:bg-paper-dim transition-colors cursor-pointer"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => alert("Upload file proof (PDF, image, commit artifact)...")}
                className="p-2 rounded-xl text-slate hover:text-ink hover:bg-paper-dim transition-colors cursor-pointer"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder={`Message ${selectedContact.name}...`}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 h-11 px-4 rounded-xl border border-hairline bg-paper-dim text-sm text-ink-900 placeholder:text-slate focus:outline-none focus:border-ink transition-colors"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="h-11 px-5 rounded-xl bg-ink text-paper font-semibold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </>
        )}
      </div>

      {/* ========================================================
          MODAL: New Direct Message (1-on-1) - Mobile Bottom Sheet
          ======================================================== */}
      {showNewDmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setShowNewDmModal(false)}
          />
          <div className="relative w-full sm:max-w-md h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl p-5 sm:p-6 space-y-4 flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-1 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
              <h3 className="text-base font-bold text-ink-900">
                Start New Direct Message (1:1)
              </h3>
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="p-1 rounded-lg text-slate hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate shrink-0">
              Select a verified engineer or professional to start a private real-time chat.
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {contacts
                .filter((c) => c.type === "direct")
                .map((peer) => (
                  <button
                    key={peer.id}
                    onClick={() => {
                      setSelectedContact(peer);
                      setShowNewDmModal(false);
                      setShowMobileChat(true);
                    }}
                    className="w-full p-3 rounded-xl border border-hairline hover:border-ink flex items-center gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">
                      {peer.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-ink-900 block">
                        {peer.name}
                      </span>
                      <span className="text-[11px] text-slate block">{peer.role}</span>
                    </div>
                  </button>
                ))}
            </div>

            <div className="pt-2 border-t border-hairline sm:hidden">
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="w-full h-12 rounded-xl border border-hairline text-sm font-semibold text-slate hover:bg-paper-dim flex items-center justify-center cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Create New Group - Mobile Bottom Sheet
          ======================================================== */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setShowNewGroupModal(false)}
          />
          <div className="relative w-full sm:max-w-md h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl p-5 sm:p-6 space-y-4 flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-1 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
              <h3 className="text-base font-bold text-ink-900">
                Create Real-Time Group Channel
              </h3>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="p-1 rounded-lg text-slate hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Guild"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate mb-1">
                  Topic & Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Real-time consensus, Raft implementations, Kafka streaming"
                  value={newGroupTopic}
                  onChange={(e) => setNewGroupTopic(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="w-full sm:w-auto px-4 h-12 sm:h-10 rounded-xl border border-hairline text-sm font-semibold text-slate hover:bg-paper-dim cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 h-12 sm:h-10 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 active:scale-[0.99] cursor-pointer flex items-center justify-center"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
