/**
 * Avatar caching, so a profile photo is fetched once and then served from the device.
 *
 * The signed-in user object (including `avatar_url`) is already cached in sessionStorage by
 * AppShell, but that only caches the *pointer* — the browser still re-requests the image on
 * every load. This stores the image itself as a data URL, keyed by its source URL, so the
 * photo paints immediately with no network round trip and no flash of initials.
 *
 * The URL is part of the key, so replacing the photo produces a new key and the cache
 * self-invalidates. Everything is best-effort: if localStorage is unavailable, full, or the
 * image is too large to store, callers silently fall back to the network.
 */

const INDEX_KEY = "proofolio-avatar-cache-index";
const ENTRY_PREFIX = "proofolio-avatar:";
/** ~1.5 MB of base64 per avatar; larger images are simply not cached. */
const MAX_ENTRY_CHARS = 1_500_000;
/** Rough cap across all cached avatars. */
const MAX_TOTAL_CHARS = 4_000_000;

/**
 * Cache key for an avatar URL.
 *
 * Avatar files are stored under a random name, so a new upload always means a new URL and the
 * cache self-invalidates. The key is the URL's path rather than the whole URL because the same
 * uploads are reachable from several origins (localhost, the LAN address, the dev tunnel);
 * keying on the origin would store the identical image once per origin.
 */
function cacheKey(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

type IndexEntry = { key: string; size: number; at: number };

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    // Touching localStorage throws in private mode / blocked-cookie contexts.
    const probe = "__proofolio_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readIndex(store: Storage): IndexEntry[] {
  try {
    const raw = store.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(store: Storage, entries: IndexEntry[]) {
  try {
    store.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Index is an optimisation only; losing it just means we re-fetch.
  }
}

/** The cached data URL for an avatar, or null if there is none. */
export function readCachedAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  const store = safeStorage();
  if (!store) return null;
  try {
    return store.getItem(ENTRY_PREFIX + cacheKey(url));
  } catch {
    return null;
  }
}

/** Drop the oldest entries until the cache fits inside the budget. */
function evictToFit(store: Storage, index: IndexEntry[], incoming: number) {
  let total = index.reduce((sum, e) => sum + e.size, 0);
  const sorted = [...index].sort((a, b) => a.at - b.at);
  const removed: string[] = [];
  while (total + incoming > MAX_TOTAL_CHARS && sorted.length) {
    const oldest = sorted.shift();
    if (!oldest) break;
    try {
      store.removeItem(ENTRY_PREFIX + oldest.key);
    } catch {
      // ignore
    }
    total -= oldest.size;
    removed.push(oldest.key);
  }
  const kept = index.filter((e) => !removed.includes(e.key));
  writeIndex(store, kept);
  return kept;
}

/** Store a data URL for an avatar. Returns false when it could not be stored. */
export function writeCachedAvatar(url: string, dataUrl: string): boolean {
  if (!url || !dataUrl) return false;
  if (!dataUrl.startsWith("data:image/")) return false;
  if (dataUrl.length > MAX_ENTRY_CHARS) return false;

  const store = safeStorage();
  if (!store) return false;

  const key = cacheKey(url);
  try {
    const index = readIndex(store).filter((e) => e.key !== key);
    const kept = evictToFit(store, index, dataUrl.length);
    store.setItem(ENTRY_PREFIX + key, dataUrl);
    kept.push({ key, size: dataUrl.length, at: Date.now() });
    writeIndex(store, kept);
    return true;
  } catch {
    return false;
  }
}

export function clearCachedAvatar(url: string | null | undefined) {
  if (!url) return;
  const store = safeStorage();
  if (!store) return;
  const key = cacheKey(url);
  try {
    store.removeItem(ENTRY_PREFIX + key);
    writeIndex(store, readIndex(store).filter((e) => e.key !== key));
  } catch {
    // ignore
  }
}

/**
 * Fetch an avatar and cache it as a data URL. Safe to call repeatedly: it no-ops while a
 * fetch for the same URL is in flight. Pass `force` after the photo is replaced.
 */
const inFlight = new Map<string, Promise<string | null>>();

export function refreshAvatarCache(url: string | null | undefined, force = false): Promise<string | null> {
  if (!url || typeof window === "undefined") return Promise.resolve(null);
  if (!force && readCachedAvatar(url)) return Promise.resolve(readCachedAvatar(url));

  const existing = inFlight.get(url);
  if (existing) return existing;

  const task = (async () => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) return null;

      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (!dataUrl) return null;

      writeCachedAvatar(url, dataUrl);
      return dataUrl;
    } catch {
      // Offline, blocked, or a broken URL: the caller keeps using the network URL.
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, task);
  return task;
}
