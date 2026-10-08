export interface CompanionConfig {
  name?: string;
  relationship_type?: string;
  personality?: string;
  communication_style?: string;
  languages?: string[];
  purpose?: string[];
  proactivity?: "on_request" | "occasional" | "active";
  memory_preferences?: {
    remember?: string[];
    forget?: string[];
  };
  access_permissions?: string[];
  custom_instructions?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  created_at?: string; // set on saved messages: the cursor for loading earlier ones
}

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function toChatMessage(m: SavedMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function sendAiChat(
  message: string,
  history: string[] = [],
  sessionId?: string | null
): Promise<{ reply: string; session_id?: string }> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, history, session_id: sessionId || null }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "AI model is unavailable" }));
    throw new Error(errorBody.detail || `AI error (${res.status})`);
  }

  return res.json();
}

/** Like sendAiChat, but reports what the AI is really doing ("thinking", "searching", "composing") while it works. */
export async function streamAiChat(
  message: string,
  sessionId: string | null,
  onState: (state: string) => void = () => {},
  onSession: (session: ChatSession) => void = () => {},
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/ai/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok || !res.body) {
    const errorBody = await res.json().catch(() => ({ detail: "AI model is unavailable" }));
    throw new Error(errorBody.detail || `AI error (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let saved: SavedMessage | null = null;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.session) onSession(event.session);
    else if (event.state) onState(event.state);
    else if (event.error) throw new Error(event.error);
    else if (event.message) saved = event.message;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  handle(buffer);

  if (saved === null) throw new Error("AI model is unavailable");
  return toChatMessage(saved);
}

/** The user's earlier conversations, most recent first. */
export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/ai/sessions`, { credentials: "include" });
  if (!res.ok) throw new Error("Could not load your chats");
  return res.json();
}

/** One page of a conversation: the newest messages, or the ones before `before`. Oldest first. */
export async function fetchSessionMessages(
  sessionId: string,
  before?: string,
  limit = 30,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  const res = await fetch(`${API_BASE}/ai/sessions/${sessionId}/messages?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Could not load this chat");
  const page = await res.json();
  return { messages: (page.messages as SavedMessage[]).map(toChatMessage), hasMore: page.has_more };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ai/sessions/${sessionId}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Could not delete this chat");
}

export async function fetchCompanion(): Promise<CompanionConfig> {
  const res = await fetch(`${API_BASE}/ai/companion`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load companion settings");
  }

  return res.json();
}

export async function updateCompanion(config: Partial<CompanionConfig>): Promise<CompanionConfig> {
  const res = await fetch(`${API_BASE}/ai/companion`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: "Failed to update companion" }));
    throw new Error(errorBody.detail || "Failed to update companion");
  }

  return res.json();
}

export function getWorkReportDownloadUrl(): string {
  return `${API_BASE}/ai/report/work`;
}
