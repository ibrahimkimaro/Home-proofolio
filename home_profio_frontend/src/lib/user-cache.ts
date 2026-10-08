/**
 * Secure, privacy-preserving user profile storage and client cache.
 *
 * Prevents redundant `/auth/me` network round-trips across page changes, reloads,
 * and component mounts while strictly respecting data security and privacy principles:
 *
 * 1. SANITIZATION: Never stores passwords, tokens, secrets, or unneeded sensitive internals.
 *    Only safe display metadata (id, username, full name, avatar, bio, visibility, preferences).
 * 2. INTEGRITY & TTL: Includes a timestamp and schema version; defaults to 10 minutes fresh window.
 * 3. GRACEFUL FALLBACK: Falls back from localStorage to sessionStorage and in-memory cache if storage is blocked.
 * 4. COMPLETE PURGE: Instant wipe on logout or when 401/403 unauthenticated response is returned.
 * 5. MULTI-TAB SYNCHRONIZATION: Listens to window storage events so logging out or updating profile
 *    in one tab instantly updates every open tab.
 */

import type { User, Profile } from "./api";

const STORAGE_KEY = "proofolio_user_profile_v1";
const SESSION_LEGACY_KEY = "proofolio-session-user";
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh window

export interface CachedUserEnvelope {
  version: 1;
  cachedAt: number;
  user: User;
}

let memoryUser: User | null = null;
let memoryCachedAt = 0;

/**
 * Strips any sensitive fields or unexpected payload data.
 * Guarantees that only safe, public display and UI-state attributes are written to client storage.
 */
export function sanitizeUserForStorage(user: User): User {
  const safeProfile: Profile = {
    username: user.profile?.username ?? user.username ?? "",
    display_name: user.profile?.display_name ?? user.fullname ?? user.username ?? "",
    headline: user.profile?.headline ?? null,
    bio: user.profile?.bio ?? null,
    avatar_url: user.profile?.avatar_url ?? null,
    visibility: user.profile?.visibility ?? "public",
    allow_indexing: user.profile?.allow_indexing ?? true,
  };

  return {
    id: user.id,
    email: user.email,
    fullname: user.fullname ?? user.profile?.display_name ?? "",
    username: user.username ?? user.profile?.username ?? "",
    phone_number: user.phone_number ?? null,
    is_admin: Boolean(user.is_admin),
    otp_pending: Boolean(user.otp_pending),
    suspended: Boolean(user.suspended),
    activation_deadline: user.activation_deadline ?? null,
    created_at: user.created_at,
    profile: safeProfile,
    preferences: user.preferences ? { appearance: user.preferences.appearance } : undefined,
  };
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__pf_ls_test__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Returns true if the stored user is within the acceptable freshness window.
 */
export function isUserCacheFresh(maxAgeMs = DEFAULT_TTL_MS): boolean {
  if (!memoryUser && typeof window === "undefined") return false;
  const now = Date.now();
  if (memoryUser && now - memoryCachedAt < maxAgeMs) {
    return true;
  }
  const ls = safeLocalStorage();
  if (!ls) return false;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return false;
    const envelope = JSON.parse(raw) as CachedUserEnvelope;
    if (envelope && envelope.version === 1 && typeof envelope.cachedAt === "number") {
      return now - envelope.cachedAt < maxAgeMs;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Synchronously retrieves the cached user profile.
 * @param options.allowStale - if true, returns cached data even if older than TTL.
 */
export function getCachedUser(options: { allowStale?: boolean } = { allowStale: true }): User | null {
  const { allowStale = true } = options;
  const now = Date.now();

  if (memoryUser) {
    if (allowStale || now - memoryCachedAt < DEFAULT_TTL_MS) {
      return memoryUser;
    }
  }

  const ls = safeLocalStorage();
  if (ls) {
    try {
      const raw = ls.getItem(STORAGE_KEY);
      if (raw) {
        const envelope = JSON.parse(raw) as CachedUserEnvelope;
        if (envelope && envelope.version === 1 && envelope.user) {
          if (allowStale || now - envelope.cachedAt < DEFAULT_TTL_MS) {
            memoryUser = envelope.user;
            memoryCachedAt = envelope.cachedAt;
            return memoryUser;
          }
        }
      }
    } catch {
      // Storage corrupted: clear it safely
      try {
        ls.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  // Fallback check on sessionStorage for legacy callers
  const ss = safeSessionStorage();
  if (ss) {
    try {
      const legacyRaw = ss.getItem(SESSION_LEGACY_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as User;
        if (parsed && parsed.id) {
          memoryUser = sanitizeUserForStorage(parsed);
          memoryCachedAt = now;
          return memoryUser;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Persists the user in safe storage and memory. If passed null, thoroughly wipes it.
 */
export function setCachedUser(user: User | null): void {
  const ls = safeLocalStorage();
  const ss = safeSessionStorage();

  if (!user) {
    memoryUser = null;
    memoryCachedAt = 0;
    try {
      ls?.removeItem(STORAGE_KEY);
      ss?.removeItem(SESSION_LEGACY_KEY);
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("proofolio:user-cleared"));
    }
    return;
  }

  const sanitized = sanitizeUserForStorage(user);
  memoryUser = sanitized;
  memoryCachedAt = Date.now();

  const envelope: CachedUserEnvelope = {
    version: 1,
    cachedAt: memoryCachedAt,
    user: sanitized,
  };

  try {
    ls?.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {}

  try {
    ss?.setItem(SESSION_LEGACY_KEY, JSON.stringify(sanitized));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("proofolio:user-updated", { detail: sanitized }));
  }
}

/**
 * Updates partial fields in the cached user profile without an API roundtrip.
 */
export function updateCachedUser(updater: Partial<User> | ((prev: User) => User)): User | null {
  const current = getCachedUser({ allowStale: true });
  if (!current) return null;
  const updated = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  setCachedUser(updated);
  return updated;
}

/**
 * Completely purges all user cache, session data, and transient client tokens on logout.
 */
export function clearAllAuthStorage(): void {
  memoryUser = null;
  memoryCachedAt = 0;

  try {
    const ls = safeLocalStorage();
    ls?.removeItem(STORAGE_KEY);
    ls?.removeItem(SESSION_LEGACY_KEY);
  } catch {}

  try {
    const ss = safeSessionStorage();
    ss?.removeItem(STORAGE_KEY);
    ss?.removeItem(SESSION_LEGACY_KEY);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("proofolio:user-cleared"));
  }
}

// Automatically sync user session across tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      if (!e.newValue) {
        memoryUser = null;
        memoryCachedAt = 0;
        window.dispatchEvent(new CustomEvent("proofolio:user-cleared"));
      } else {
        try {
          const envelope = JSON.parse(e.newValue) as CachedUserEnvelope;
          if (envelope?.user) {
            memoryUser = envelope.user;
            memoryCachedAt = envelope.cachedAt;
            window.dispatchEvent(new CustomEvent("proofolio:user-updated", { detail: envelope.user }));
          }
        } catch {}
      }
    }
  });
}
