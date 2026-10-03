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
