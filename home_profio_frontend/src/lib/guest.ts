"use client";

const GUEST_STORAGE_KEY = "proofolio_guest_session";

/**
 * Returns a persistent unique guest session ID stored in localStorage.
 * Survives page refreshes and browser restarts.
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === "undefined") {
    return "guest-session-placeholder";
  }

  let sessionId = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!sessionId || sessionId.length < 10) {
    sessionId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function clearGuestSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }
}

const NAME_KEY = "proofolio_guest_name";
const SEEN_KEY = "proofolio_guest_seen";

export interface GuestMemory {
  /** What this visitor told us to call them (null if they never did). */
  name: string | null;
  /** When this browser last visited, as a timestamp (null on the first visit). */
  lastSeen: number | null;
}

/** What we remember about this visitor, so we can greet them when they come back. Never throws. */
export function readGuestMemory(): GuestMemory {
  try {
    const seen = Number(localStorage.getItem(SEEN_KEY));
    return { name: localStorage.getItem(NAME_KEY) || null, lastSeen: seen > 0 ? seen : null };
  } catch {
    return { name: null, lastSeen: null };
  }
}

/** Note that they are here now (call after reading the memory, so the greeting can say how long it's been). */
export function touchGuest(): void {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {}
}

export function rememberGuestName(name: string | null): void {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
  } catch {}
}

const EMAIL_KEY = "proofolio_guest_email";

export function readGuestEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export function rememberGuestEmail(email: string | null): void {
  try {
    if (email) localStorage.setItem(EMAIL_KEY, email);
  } catch {}
}
