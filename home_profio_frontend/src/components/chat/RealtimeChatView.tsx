"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatInbox } from "@/components/chat/ChatNotifier";
import { useCall } from "@/components/chat/CallOverlay";
import { startCall } from "@/lib/calls";
import { AttachmentView, ContactInfoPanel, UserAvatar } from "@/components/chat/ChatBits";
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
  Plus,
  Loader2,
  Crown,
  LogOut,
  UserPlus,
  Info,
  Reply,
} from "lucide-react";
import {
  User,
  fetchChatContacts,
  searchChatMembers,
  fetchChatGroups,
  fetchGroupDetail,
  createChatGroup,
  addGroupMembers,
  removeGroupMember,
  setGroupMemberRole,
  type ChatContactItem,
  type ChatGroupItem,
  type GroupDetail,
  type ChatAttachment,
  uploadChatAttachment,
} from "@/lib/api";

function formatChatTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) {
      return "Yesterday";
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
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
  messagePreview,
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
  myRole?: "admin" | "member";
}

const groupToContact = (g: ChatGroupItem): ChatContact => ({
  id: g.id,
  name: g.name,
  username: g.username,
  role: g.role,
  type: "group",
  roomId: g.roomId,
  isOnline: false,
  membersCount: g.membersCount,
  myRole: g.myRole,
  lastMessage: g.lastMessage ?? undefined,
  lastMessageTime: g.lastMessageTime ? formatChatTime(g.lastMessageTime) : undefined,
});

const memberToContact = (m: ChatContactItem): ChatContact => ({
  id: m.id,
  name: m.name,
  username: m.username,
  role: m.role,
  avatar: m.avatar || undefined,
  type: "direct",
  pairId: m.pairId,
  isOnline: false,
});

// "X joined the group", "X made Y an admin"…: stored by the backend with a "sys-" client id.
const isSystem = (m: ChatMessage) => !!m.client_id?.startsWith("sys-");

const previewOf = messagePreview;

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

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
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; until: number; uploading?: boolean }>>({});
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]); // in the open conversation
  const inbox = useChatInbox(me); // unread counts, "typing…" to me elsewhere, who is online
  const unread = inbox?.unread ?? {};
  const onlineIds = inbox?.online ?? new Set<string>();
  const call = useCall();
  const inCall = !!call && call.phase !== "ended";
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState<ChatMessage | null>(null);

  // New Chat Modals & Member Discovery
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [discoveredMembers, setDiscoveredMembers] = useState<ChatContact[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTopic, setNewGroupTopic] = useState("");

  // Groups: who to invite, the 3-dot menu, and the member list with admin controls.
  const [groupPicks, setGroupPicks] = useState<ChatContact[]>([]);
  const [pickQuery, setPickQuery] = useState("");
  const [pickResults, setPickResults] = useState<ChatContact[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupDetail | null>(null);
  const [groupNotice, setGroupNotice] = useState<string | null>(null);
  const [sideNotice, setSideNotice] = useState<string | null>(null);

  // 1:1 details panel (3-dot menu > Contact info), the file being uploaded, and the message a
  // quoted reply jumped to (briefly highlighted).
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [upload, setUpload] = useState<{ filename: string; progress: number; error?: string } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askedForTopic = useRef("");

  // Mobile WhatsApp-style view toggle: show conversations list vs active chat room
  const [showMobileChat, setShowMobileChat] = useState(false);

  const channelRef = useRef<Channel | null>(null);
  const topicRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingSentAt = useRef(0);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Fetch active conversations from DB
  useEffect(() => {
    let active = true;
    fetchChatContacts()
      .then((realUsers) => {
        if (!active) return;
        setLoadingContacts(false);
        if (!realUsers || realUsers.length === 0) {
          setContacts((prev) => prev.filter((c) => c.type === "group"));
          return;
        }
        const realContacts: ChatContact[] = realUsers.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          avatar: u.avatar || undefined,
          type: "direct",
          pairId: u.pairId,
          isOnline: false,
          lastMessage: u.lastMessage,
          lastMessageTime: u.lastMessageTime ? formatChatTime(u.lastMessageTime) : undefined,
          unreadCount: u.unreadCount,
        }));
        setContacts((prev) => {
          const userGroups = prev.filter((c) => c.type === "group");
          return [...realContacts, ...userGroups];
        });
        setSelectedContact((prev) => {
          if (prev) {
            const found = realContacts.find((c) => c.id === prev.id);
            return found || prev;
          }
          return realContacts[0] || null;
        });
      })
      .catch((err) => {
        if (active) setLoadingContacts(false);
        console.warn("[RealtimeChat] Could not load active conversations:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Search registered non-guest members when opening New DM modal
  useEffect(() => {
    if (!showNewDmModal) {
      setMemberSearchQuery("");
      setDiscoveredMembers([]);
      return;
    }
    let active = true;
    setLoadingMembers(true);
    const timer = setTimeout(() => {
      searchChatMembers(memberSearchQuery)
        .then((members) => {
          if (!active) return;
          setLoadingMembers(false);
          const mapped: ChatContact[] = (members || []).map((m) => ({
            id: m.id,
            name: m.name,
            username: m.username,
            role: m.role,
            avatar: m.avatar || undefined,
            type: "direct",
            pairId: m.pairId,
            isOnline: false,
          }));
          setDiscoveredMembers(mapped);
        })
        .catch(() => {
          if (active) setLoadingMembers(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showNewDmModal, memberSearchQuery]);

  const handleSelectMember = (peer: ChatContact) => {
    setContacts((prev) => {
      const exists = prev.find((c) => c.id === peer.id);
      if (exists) return prev;
      return [peer, ...prev];
    });
    setSelectedContact(peer);
    setShowNewDmModal(false);
    setShowMobileChat(true);
  };

  // Groups I belong to (accepted). Merged in next to the direct chats.
  const mergeGroups = useCallback(() => {
    return fetchChatGroups()
      .then((groups) => {
        const mapped = groups.map(groupToContact);
        setContacts((prev) => [...prev.filter((c) => c.type !== "group"), ...mapped]);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    mergeGroups();
  }, [mergeGroups]);

  // Member picker (used when creating a group and when an admin adds people).
  const pickerOpen = showNewGroupModal || (showGroupInfo && groupInfo?.my_role === "admin");
  useEffect(() => {
    if (!pickerOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      searchChatMembers(pickQuery)
        .then((r) => active && setPickResults(r.map(memberToContact)))
        .catch(() => {});
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [pickerOpen, pickQuery]);

  const loadGroupInfo = useCallback((id: string) => {
    return fetchGroupDetail(id)
      .then(setGroupInfo)
      .catch(() => setGroupInfo(null));
  }, []);

  const openGroupInfo = () => {
    if (selectedContact?.type !== "group") return;
    setShowChatMenu(false);
    setGroupNotice(null);
    setPickQuery("");
    setGroupInfo(null);
    setShowGroupInfo(true);
    loadGroupInfo(selectedContact.id);
  };

  const closeGroupInfo = () => {
    setShowGroupInfo(false);
    setPickQuery("");
  };

  const groupAction = async (fn: () => Promise<unknown>, ok?: string) => {
    if (!selectedContact) return;
    try {
      await fn();
      setGroupNotice(ok ?? null);
      await loadGroupInfo(selectedContact.id);
      mergeGroups();
    } catch (e) {
      setGroupNotice(errText(e, "That did not work. Try again."));
    }
  };

  const handleInviteToGroup = (peer: ChatContact) =>
    selectedContact &&
    groupAction(() => addGroupMembers(selectedContact.id, [peer.id]), `Invitation sent to ${peer.name}.`);
  const handleRoleChange = (userId: string, role: "admin" | "member") =>
    selectedContact && groupAction(() => setGroupMemberRole(selectedContact.id, userId, role));
  const handleRemoveMember = (userId: string, name: string) => {
    if (!selectedContact || !window.confirm(`Remove ${name} from this group?`)) return;
    groupAction(() => removeGroupMember(selectedContact.id, userId));
  };
  // Group chats show each sender's profile picture beside their messages (like WhatsApp): the
  // members' pictures, by user id, for the open group. Former members fall back to their initial.
  const [roomAvatars, setRoomAvatars] = useState<Record<string, string | null>>({});
  const loadRoomAvatars = useCallback((groupId: string) => {
    fetchGroupDetail(groupId)
      .then((d) => setRoomAvatars(Object.fromEntries(d.members.map((m) => [m.user_id, m.avatar ?? null]))))
      .catch(() => {});
  }, []);
  const openGroupId = selectedContact?.type === "group" ? selectedContact.id : null;
  useEffect(() => {
    if (openGroupId) loadRoomAvatars(openGroupId);
  }, [openGroupId, loadRoomAvatars]);

  // Live group changes (someone joined/left/was removed, roles, an invite answered): refresh the list
  // and the open member panel. Kept in a ref so the realtime subscriptions don't resubscribe.
  const refreshGroupsRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshGroupsRef.current = () => {
      mergeGroups();
      if (selectedContact?.type === "group") loadRoomAvatars(selectedContact.id);
      if (showGroupInfo && selectedContact?.type === "group") loadGroupInfo(selectedContact.id);
    };
  }, [mergeGroups, loadGroupInfo, loadRoomAvatars, showGroupInfo, selectedContact]);

  // An admin removed me: the server already closed the room; drop it from the screen.
  const removedFromGroup = useCallback((group: ChatContact) => {
    setContacts((prev) => prev.filter((c) => c.id !== group.id));
    setSelectedContact((prev) => (prev?.id === group.id ? null : prev));
    setShowMobileChat(false);
    setShowChatMenu(false);
    setShowGroupInfo(false);
    setSideNotice(`You were removed from "${group.name}".`);
  }, []);

  const handleLeaveGroup = async () => {
    if (!selectedContact || !window.confirm(`Leave "${selectedContact.name}"?`)) return;
    try {
      await removeGroupMember(selectedContact.id, me);
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedContact(null);
      setShowMobileChat(false);
      setShowChatMenu(false);
      closeGroupInfo();
    } catch (e) {
      setGroupNotice(errText(e, "Could not leave the group."));
    }
  };

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
          setContacts((prev) => {
            const existing = prev.find((c) => topicOf(c) === msg.topic);
            if (existing) {
              return prev.map((c) =>
                topicOf(c) === msg.topic
                  ? { ...c, lastMessage: messagePreview(msg), lastMessageTime: "Just now" }
                  : c
              );
            }
            fetchChatContacts()
              .then((updated) => {
                if (updated && updated.length) {
                  const mapped: ChatContact[] = updated.map((u) => ({
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    role: u.role,
                    avatar: u.avatar || undefined,
                    type: "direct",
                    pairId: u.pairId,
                    isOnline: false,
                    lastMessage: u.lastMessage,
                    lastMessageTime: u.lastMessageTime ? formatChatTime(u.lastMessageTime) : "Just now",
                    unreadCount: u.unreadCount,
                  }));
                  setContacts((current) => {
                    const userGroups = current.filter((c) => c.type === "group");
                    return [...mapped, ...userGroups];
                  });
                }
              })
              .catch(() => {});
            return prev;
          }),
        onGroupsChanged: () => refreshGroupsRef.current(),
      }),
    [me]
  );

  // Open the chat a notification linked to (/chat?c=<topic>), then drop the param.
  const router = useRouter();
  const wantedTopic = useSearchParams().get("c");
  useEffect(() => {
    const target = wantedTopic && contacts.find((c) => topicOf(c) === wantedTopic);
    if (!target) {
      // Just accepted a group invite elsewhere: it is not in this list yet. Ask once.
      if (wantedTopic?.startsWith("room:") && askedForTopic.current !== wantedTopic) {
        askedForTopic.current = wantedTopic;
        mergeGroups();
      }
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedContact(target);
    setShowMobileChat(true);
    router.replace("/chat");
  }, [wantedTopic, contacts, router, mergeGroups]);

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
        if (!isDirect && isSystem(msg)) refreshGroupsRef.current(); // joined / left / roles changed
        setContacts((prev) =>
          prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: previewOf(msg), lastMessageTime: "Just now" } : c))
        );
      },
      onTyping: (e: TypingEvent) => {
        if (!live() || e.user_id === me) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (e.is_typing) next[e.user_id] = { name: e.author_name, until: Date.now() + TYPING_SHOW_FOR, uploading: e.activity === "uploading" };
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
      onRemoved: () => live() && removedFromGroup(selectedContact),
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
  }, [socket, selectedContact, me, deliver, removedFromGroup]);

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

  /** Send text, a file with an optional caption, or both; quoting replyMessage if one is set. */
  const sendMessage = (text: string, attachment?: ChatAttachment) => {
    if (!text && !attachment) return;
    const clientId = newClientId();
    const msg: ChatMessage = {
      id: clientId,
      client_id: clientId,
      text,
      attachment: attachment ?? null,
      author_id: me,
      author_name: user.fullname || "User",
      author_username: user.username || me,
      timestamp: new Date().toISOString(),
      status: "sending",
      reply_to: replyMessage
        ? { id: replyMessage.id, text: previewOf(replyMessage).slice(0, 200), author_name: replyMessage.author_name, author_id: replyMessage.author_id }
        : undefined,
    };

    setMessages((prev) => [...prev, msg]);
    setReplyMessage(null);
    setShowEmojiPicker(false);
    if (selectedContact) {
      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: previewOf(msg), lastMessageTime: "Just now" } : c))
      );
    }
    stopTyping();
    deliver(msg);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    sendMessage(text);
  };

  // Paperclip: upload the file (others see "… is sending a file"), then send it, with whatever is
  // typed as its caption. The upload is owned by me; the chat server only accepts my own files.
  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again still fires
    if (!file || upload) return;
    if (file.size > 10 * 1024 * 1024) {
      setUpload({ filename: file.name, progress: 0, error: "Files can be up to 10 MB." });
      return;
    }
    const chan = channelRef.current;
    const ping = chan ? setInterval(() => sendChannelTyping(chan, true, "uploading"), TYPING_SEND_EVERY) : null;
    if (chan) sendChannelTyping(chan, true, "uploading");
    setUpload({ filename: file.name, progress: 0 });
    try {
      const att = await uploadChatAttachment(file, (p) => setUpload((u) => (u ? { ...u, progress: p } : u)));
      const caption = inputText.trim();
      setInputText("");
      setUpload(null);
      sendMessage(caption, att);
    } catch (err) {
      setUpload({ filename: file.name, progress: 0, error: errText(err, "Upload failed. Try again.") });
    } finally {
      if (ping) clearInterval(ping);
      if (chan) sendChannelTyping(chan, false);
    }
  };

  const startReply = (msg: ChatMessage) => {
    setReplyMessage(msg);
    inputRef.current?.focus();
  };

  // Tap a quoted reply (or a file in Contact info): scroll to the original and flash it.
  const jumpToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 1600);
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (name.length < 2 || creatingGroup) return;
    setCreatingGroup(true);
    setGroupError(null);
    try {
      // The server makes me the admin and sends each picked member an invitation to accept or decline.
      const created = await createChatGroup(name, newGroupTopic.trim(), groupPicks.map((p) => p.id));
      const group = groupToContact(created);
      setContacts((prev) => [group, ...prev.filter((c) => c.id !== group.id)]);
      setSelectedContact(group);
      setNewGroupName("");
      setNewGroupTopic("");
      setGroupPicks([]);
      setPickQuery("");
      setShowNewGroupModal(false);
      setShowMobileChat(true);
    } catch (err) {
      setGroupError(errText(err, "Could not create the group. Try again."));
    } finally {
      setCreatingGroup(false);
    }
  };

  const togglePick = (peer: ChatContact) =>
    setGroupPicks((prev) => (prev.some((p) => p.id === peer.id) ? prev.filter((p) => p.id !== peer.id) : [...prev, peer]));

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
  const sendingFile = Object.values(typingUsers).some((t) => t.uploading);
  const typingLabel = `${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} ${sendingFile ? "sending a file…" : "typing…"}`;
  const peerOnline =
    selectedContact?.type === "direct" ? onlineIds.has(selectedContact.id) : (selectedContact ? onlineUsers.length > 1 : false);
  // The open chat as the (live-refreshed) list knows it: member count and my role stay current
  // without swapping selectedContact, which would rejoin the conversation.
  const liveSelected = selectedContact ? (contacts.find((c) => c.id === selectedContact.id) ?? selectedContact) : null;

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
              <UserAvatar
                name={user.profile?.display_name || user.username || "P"}
                src={user.profile?.avatar_url}
                className="w-10 h-10 rounded-full text-sm shadow-sm"
              />
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
                  {socketConnected ? "online" : "Connecting..."}
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

        {sideNotice && (
          <div role="status" className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-hairline bg-paper-dim px-3 py-2 text-xs font-semibold text-ink-700">
            <span className="flex-1">{sideNotice}</span>
            <button type="button" onClick={() => setSideNotice(null)} aria-label="Dismiss" className="cursor-pointer text-slate hover:text-ink">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
            searchQuery.trim() ? (
              <div className="p-6 text-center text-slate">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-ink" />
                <p className="text-xs font-bold text-ink-900">No chats found</p>
                <p className="text-[11px] text-slate mt-1 mb-4">No active conversations match &quot;{searchQuery}&quot;.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMemberSearchQuery(searchQuery);
                    setShowNewDmModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink text-paper text-xs font-semibold cursor-pointer hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Search All Members</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-slate">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-ink" />
                <p className="text-xs font-bold text-ink-900">No conversations yet</p>
                <p className="text-[11px] text-slate mt-1 mb-4">Start chatting with verified members and peers.</p>
                <button
                  type="button"
                  onClick={() => setShowNewDmModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-ink text-paper text-xs font-semibold cursor-pointer hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Conversation</span>
                </button>
              </div>
            )
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
                    {contact.type === "group" ? (
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <UserAvatar name={contact.name} src={contact.avatar} className="w-11 h-11 rounded-2xl text-sm shadow-xs" />
                    )}
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
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-ink-900 mb-1">Your Direct Messages</h3>
            <p className="text-xs text-slate max-w-sm mb-5">
              Send private, end-to-end synchronized messages to peers and collaborators across Proofolio.
            </p>
            <button
              type="button"
              onClick={() => setShowNewDmModal(true)}
              className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Conversation</span>
            </button>
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
                <button
                  type="button"
                  onClick={() => (selectedContact.type === "group" ? openGroupInfo() : setShowContactInfo(true))}
                  title={selectedContact.type === "group" ? "Group members" : "Contact info"}
                  className="relative cursor-pointer"
                >
                  {selectedContact.type === "group" ? (
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : (
                    <UserAvatar name={selectedContact.name} src={selectedContact.avatar} className="w-10 h-10 rounded-2xl text-sm shadow-xs" />
                  )}
                  {peerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper" />
                  )}
                </button>

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
                {/* 1:1 calls only: group calls would need a media server (SFU) rather than peer-to-peer. */}
                {selectedContact.type === "direct" &&
                  (["audio", "video"] as const).map((media) => (
                    <button
                      key={media}
                      onClick={() => startCall({ id: selectedContact.id, name: selectedContact.name, username: selectedContact.username }, media)}
                      disabled={inCall}
                      title={inCall ? "You're already in a call" : media === "audio" ? "Voice call" : "Video call"}
                      aria-label={media === "audio" ? "Voice call" : "Video call"}
                      className="p-2 rounded-xl hover:bg-paper-dim hover:text-ink transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {media === "audio" ? <Phone className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                  ))}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChatMenu((v) => !v)}
                    title="More options"
                    aria-label="More options"
                    aria-expanded={showChatMenu}
                    className="p-2 rounded-xl hover:bg-paper-dim hover:text-ink transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showChatMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowChatMenu(false)} />
                      <div
                        role="menu"
                        className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-hairline bg-paper py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                      >
                        {selectedContact.type === "group" ? (
                          <>
                            <MenuItem icon={Users} onClick={openGroupInfo}>
                              Members{liveSelected?.membersCount ? ` (${liveSelected.membersCount})` : ""}
                            </MenuItem>
                            {liveSelected?.myRole === "admin" && (
                              <MenuItem icon={UserPlus} onClick={openGroupInfo}>
                                Add members
                              </MenuItem>
                            )}
                            <MenuItem icon={LogOut} danger onClick={handleLeaveGroup}>
                              Leave group
                            </MenuItem>
                          </>
                        ) : (
                          <>
                            <MenuItem
                              icon={Info}
                              onClick={() => {
                                setShowChatMenu(false);
                                setShowContactInfo(true);
                              }}
                            >
                              Contact info & shared files
                            </MenuItem>
                            <MenuItem
                              icon={UserIcon}
                              onClick={() => {
                                setShowChatMenu(false);
                                router.push(`/u/${selectedContact.username}`);
                              }}
                            >
                              View full profile
                            </MenuItem>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
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

              {messages.map((msg, i) => {
                const isMe = msg.author_id === me;
                // Groups, others' messages: picture + name on the first of a run from the same person.
                const prev = messages[i - 1];
                const groupOther = !isMe && selectedContact.type === "group";
                const firstOfRun = !prev || prev.author_id !== msg.author_id || isSystem(prev);
                if (isSystem(msg)) {
                  return (
                    <div key={msg.client_id || msg.id} className="flex justify-center">
                      <span className="max-w-[85%] rounded-full border border-hairline bg-paper px-3 py-1 text-center text-[11px] font-semibold text-slate shadow-2xs">
                        {msg.text}
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={msg.client_id || msg.id}
                    id={`msg-${msg.id}`}
                    className={`relative flex flex-col group rounded-2xl transition-colors duration-500 ${isMe ? "items-end" : "items-start"} ${
                      groupOther ? "pl-9" : ""
                    } ${groupOther && !firstOfRun ? "-mt-2.5" : ""} ${highlightId === msg.id ? "bg-amber-300/25" : ""}`}
                  >
                    {/* Groups: sender's picture and name, once per run of their messages */}
                    {groupOther && firstOfRun && (
                      <>
                        <span className="absolute left-0 top-0" title={`${msg.author_name} (@${msg.author_username})`}>
                          <UserAvatar name={msg.author_name} src={roomAvatars[msg.author_id]} className="w-7 h-7 rounded-full text-[11px]" />
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ml-1 mb-1">
                          {msg.author_name}
                        </span>
                      </>
                    )}

                    <div className="relative max-w-[85%] sm:max-w-[70%]">
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl shadow-xs transition-all relative ${isMe
                          ? "bg-emerald-600 text-white rounded-br-xs"
                          : "bg-paper text-ink-900 border border-hairline rounded-bl-xs"
                          }`}
                      >
                        {/* The message this one replies to: tap to jump to it */}
                        {msg.reply_to && (
                          <button
                            type="button"
                            onClick={() => jumpToMessage(msg.reply_to!.id)}
                            title="Show the original message"
                            className={`block w-full text-left text-xs px-2.5 py-1.5 mb-2 rounded-lg border-l-4 cursor-pointer ${
                              isMe ? "bg-white/15 border-white/70 text-emerald-50" : "bg-paper-dim border-emerald-500 text-slate"
                            }`}
                          >
                            <span className={`font-bold block text-[11px] ${isMe ? "text-white" : "text-emerald-700 dark:text-emerald-400"}`}>
                              {msg.reply_to.author_id === me ? "You" : msg.reply_to.author_name}
                            </span>
                            <span className="line-clamp-2 break-words">{msg.reply_to.text}</span>
                          </button>
                        )}

                        {msg.attachment && <AttachmentView att={msg.attachment} mine={isMe} />}

                        {msg.text && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                            {msg.text}
                          </p>
                        )}

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

                      {/* Reply to this message: always visible on touch screens, on hover with a mouse */}
                      {msg.seq && (
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          aria-label="Reply to this message"
                          title="Reply"
                          className={`absolute top-3 ${isMe ? "-left-9" : "-right-9"} p-1.5 rounded-full bg-paper border border-hairline text-slate shadow-xs hover:text-ink cursor-pointer transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}

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
                          onClick={() => startReply(msg)}
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
              <div className="px-4 py-2 border-t border-hairline bg-paper-dim/60 flex items-center gap-3">
                <Reply className="w-4 h-4 text-emerald-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => jumpToMessage(replyMessage.id)}
                  className="min-w-0 flex-1 text-left text-xs border-l-4 border-emerald-500 pl-2.5 cursor-pointer"
                  title="Show the message"
                >
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                    Replying to {replyMessage.author_id === me ? "yourself" : replyMessage.author_name}
                  </span>
                  <span className="text-slate line-clamp-1">{previewOf(replyMessage)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMessage(null)}
                  aria-label="Cancel reply"
                  className="p-1 text-slate hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File on its way (or why it failed) */}
            {upload && (
              <div className="px-4 py-2 border-t border-hairline bg-paper-dim/60 flex items-center gap-3 text-xs">
                {upload.error ? (
                  <AlertCircle className="w-4 h-4 text-berry shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900 truncate">{upload.filename}</p>
                  {upload.error ? (
                    <p className="text-berry">{upload.error}</p>
                  ) : (
                    <div className="mt-1 h-1.5 rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                    </div>
                  )}
                </div>
                {upload.error && (
                  <button type="button" onClick={() => setUpload(null)} aria-label="Dismiss" className="p-1 text-slate hover:text-ink cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
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

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                onChange={handlePickFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!upload && !upload.error}
                title="Send a photo or document (up to 10 MB)"
                aria-label="Attach a file"
                className="p-2 rounded-xl text-slate hover:text-ink hover:bg-paper-dim transition-colors cursor-pointer disabled:opacity-40"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={upload && !upload.error ? "Add a caption…" : `Message ${selectedContact.name}...`}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 min-w-0 h-11 px-4 rounded-xl border border-hairline bg-paper-dim text-sm text-ink-900 placeholder:text-slate focus:outline-none focus:border-ink transition-colors"
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
          <div className="relative w-full sm:max-w-md h-[80vh] max-h-[80vh] sm:h-[540px] sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl p-5 sm:p-6 space-y-4 flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-1 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
              <div>
                <h3 className="text-base font-bold text-ink-900">
                  New Direct Message
                </h3>
                <p className="text-[11px] text-slate mt-0.5">
                  Search members by name or username to start chatting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="p-1 rounded-lg text-slate hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Type member name or @username..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-xl bg-paper-dim text-xs text-ink-900 placeholder:text-slate focus:outline-none focus:ring-1 focus:ring-ink"
              />
              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {loadingMembers ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-paper-dim shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-paper-dim rounded-md w-3/4" />
                        <div className="h-2.5 bg-paper-dim rounded-md w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : discoveredMembers.length === 0 ? (
                <div className="py-10 text-center text-slate">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-ink" />
                  <p className="text-xs font-semibold text-ink-900">
                    {memberSearchQuery ? "No members match your search" : "No members available"}
                  </p>
                  <p className="text-[11px] text-slate mt-0.5">
                    {memberSearchQuery ? "Try searching with a different name or username" : "Invite other verified professionals to Proofolio."}
                  </p>
                </div>
              ) : (
                discoveredMembers.map((peer) => {
                  const hasExistingChat = contacts.some((c) => c.id === peer.id);
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => handleSelectMember(peer)}
                      className="w-full p-3 rounded-xl border border-hairline hover:border-ink flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={peer.name} src={peer.avatar} className="w-10 h-10 rounded-xl text-xs" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-ink-900 block truncate group-hover:text-blue-600 transition-colors">
                            {peer.name}
                          </span>
                          <span className="text-[11px] text-slate block truncate">
                            {peer.role || `@${peer.username}`}
                          </span>
                        </div>
                      </div>

                      {hasExistingChat ? (
                        <span className="text-[10px] font-semibold text-slate bg-paper-dim px-2 py-0.5 rounded-full shrink-0">
                          Active chat
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                          Start
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-hairline sm:hidden">
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="w-full h-11 rounded-xl border border-hairline text-sm font-semibold text-slate hover:bg-paper-dim flex items-center justify-center cursor-pointer"
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

              <div>
                <label className="block text-xs font-semibold text-slate mb-1">Add members</label>
                <p className="text-[11px] text-slate mb-2">
                  Each person gets an invitation to accept. You&apos;ll be the group admin.
                </p>
                {groupPicks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {groupPicks.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        {p.name}
                        <button type="button" onClick={() => togglePick(p)} aria-label={`Remove ${p.name}`} className="cursor-pointer rounded-full hover:text-ink">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <MemberPicker
                  query={pickQuery}
                  onQuery={setPickQuery}
                  results={pickResults}
                  isPicked={(p) => groupPicks.some((g) => g.id === p.id)}
                  onPick={togglePick}
                  actionLabel={(picked) => (picked ? "Added" : "Add")}
                />
              </div>

              {groupError && (
                <p role="alert" className="rounded-xl border border-berry/30 bg-berry/10 px-3 py-2 text-xs font-semibold text-berry">
                  {groupError}
                </p>
              )}

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
                  disabled={creatingGroup}
                  className="w-full sm:w-auto px-5 h-12 sm:h-10 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {creatingGroup && <Loader2 className="w-4 h-4 animate-spin" />}
                  {groupPicks.length ? `Create & invite ${groupPicks.length}` : "Create group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          PANEL: Group members (3-dot menu > Members): who is admin, who is still invited,
          and admin controls (invite, make/remove admin, remove, cancel invite).
          ======================================================== */}
      {showContactInfo && selectedContact?.type === "direct" && (
        <ContactInfoPanel
          userId={selectedContact.id}
          fallbackName={selectedContact.name}
          onClose={() => setShowContactInfo(false)}
          onOpenProfile={(username) => router.push(`/u/${username}`)}
          onJumpTo={(id) => {
            setShowContactInfo(false);
            setTimeout(() => jumpToMessage(id), 150);
          }}
        />
      )}

      {showGroupInfo && selectedContact?.type === "group" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={closeGroupInfo} />
          <div className="relative w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl p-5 sm:p-6 flex flex-col gap-4 z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-hairline shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-ink-900 truncate">{groupInfo?.name ?? selectedContact.name}</h3>
                {groupInfo?.topic && <p className="text-xs text-slate mt-0.5">{groupInfo.topic}</p>}
              </div>
              <button type="button" onClick={closeGroupInfo} aria-label="Close" className="p-1 rounded-lg text-slate hover:text-ink cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {groupNotice && (
              <p className="shrink-0 rounded-xl bg-paper-dim px-3 py-2 text-xs font-semibold text-ink-700">{groupNotice}</p>
            )}

            <div className="flex-1 overflow-y-auto space-y-5 min-h-0">
              {!groupInfo ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate" />
                </div>
              ) : (
                <>
                  {groupInfo.my_role === "admin" && (
                    <section>
                      <h4 className="text-xs font-bold text-slate uppercase tracking-wide mb-2">Add members</h4>
                      <MemberPicker
                        query={pickQuery}
                        onQuery={setPickQuery}
                        results={pickResults.filter((p) => !groupInfo.members.some((m) => m.user_id === p.id))}
                        isPicked={() => false}
                        onPick={handleInviteToGroup}
                        actionLabel={() => "Invite"}
                      />
                    </section>
                  )}

                  {(["member", "invited"] as const).map((status) => {
                    const list = groupInfo.members.filter((m) => m.status === status);
                    if (!list.length) return null;
                    return (
                      <section key={status}>
                        <h4 className="text-xs font-bold text-slate uppercase tracking-wide mb-2">
                          {status === "member" ? `Members · ${list.length}` : `Invited, waiting to accept · ${list.length}`}
                        </h4>
                        <ul className="space-y-1">
                          {list.map((m) => {
                            const canManage = groupInfo.my_role === "admin" && !m.is_me;
                            return (
                              <li key={m.user_id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-paper-dim/60">
                                <div className="relative shrink-0">
                                  <UserAvatar name={m.name} src={m.avatar} className="w-9 h-9 rounded-xl text-xs" />
                                  {status === "member" && (m.is_me || onlineIds.has(m.user_id)) && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-bold text-ink-900 truncate flex items-center gap-1.5">
                                    {m.name}
                                    {m.is_me && <span className="text-[10px] font-semibold text-slate">(you)</span>}
                                  </p>
                                  <p className="text-[11px] text-slate truncate">@{m.username}</p>
                                </div>
                                {m.role === "admin" && status === "member" && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-brass/15 px-2 py-0.5 text-[10px] font-bold text-brass-dark shrink-0">
                                    <Crown className="w-3 h-3" /> Admin
                                  </span>
                                )}
                                {canManage && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {status === "member" && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoleChange(m.user_id, m.role === "admin" ? "member" : "admin")}
                                        className="rounded-lg border border-hairline px-2 py-1 text-[10px] font-semibold text-ink-700 hover:bg-paper-dim cursor-pointer"
                                      >
                                        {m.role === "admin" ? "Remove admin" : "Make admin"}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(m.user_id, m.name)}
                                      title={status === "member" ? "Remove from group" : "Cancel invitation"}
                                      aria-label={status === "member" ? `Remove ${m.name}` : `Cancel invitation for ${m.name}`}
                                      className="rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </>
              )}
            </div>

            <div className="pt-3 border-t border-hairline shrink-0">
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="w-full h-11 rounded-xl border border-berry/30 text-sm font-semibold text-berry hover:bg-berry/5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Leave group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  children,
  danger,
}: {
  icon: typeof Users;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium cursor-pointer hover:bg-paper-dim ${
        danger ? "text-berry" : "text-ink-800"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </button>
  );
}

/** Search registered members and pick them (create a group) or invite them (an admin, in the panel). */
function MemberPicker({
  query,
  onQuery,
  results,
  isPicked,
  onPick,
  actionLabel,
}: {
  query: string;
  onQuery: (q: string) => void;
  results: ChatContact[];
  isPicked: (p: ChatContact) => boolean;
  onPick: (p: ChatContact) => void;
  actionLabel: (picked: boolean) => string;
}) {
  return (
    <div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search members by name or @username"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
        />
      </div>
      <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
        {results.length === 0 ? (
          <li className="py-3 text-center text-[11px] text-slate">{query ? "No members match." : "No members to show."}</li>
        ) : (
          results.slice(0, 30).map((p) => {
            const picked = isPicked(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p)}
                  aria-pressed={picked}
                  className={`w-full flex items-center gap-3 rounded-xl p-2 text-left cursor-pointer transition-colors ${
                    picked ? "bg-purple-500/10" : "hover:bg-paper-dim"
                  }`}
                >
                  <UserAvatar name={p.name} src={p.avatar} className="w-8 h-8 rounded-lg text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-ink-900 truncate">{p.name}</span>
                    <span className="block text-[11px] text-slate truncate">@{p.username}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                      picked ? "bg-purple-600 text-white" : "bg-paper-dim text-ink-700"
                    }`}
                  >
                    {picked ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {actionLabel(picked)}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
