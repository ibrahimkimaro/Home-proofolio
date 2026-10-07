import { setSocial, setLike, type EngageKind, type SocialKind } from "@/lib/api";

/**
 * "Continue the action after login" (PRD FR-AUTH-04, NFR-07): one mechanism for every feature.
 * A visitor's action is parked here, they sign in or register, and it completes afterwards, back on the very page
 * (and the very place on it) where they were: the return address keeps the query and the #anchor.
 */
const KEY = "proofolio:pending";
const TTL_MS = 60 * 60 * 1000;

/** What to finish after signing in: a follow/watch, a star, or nothing (just come back, e.g. to write a comment). */
export type ParkedAction =
  | { type: "social"; kind: SocialKind; key: string }
  | { type: "like"; kind: EngageKind; key: string }
  | { type: "return" };

type Pending = { action?: ParkedAction; kind?: SocialKind; key?: string; returnTo: string; at: number };

/** Only same-site paths: never let ?next= send people to another site. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/** Park an action and return the login URL to send the visitor to. `returnTo` defaults to this very page. */
export function parkAction(action: ParkedAction, returnTo?: string): string {
  const back = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  try {
    localStorage.setItem(KEY, JSON.stringify({ action, returnTo: back, at: Date.now() } satisfies Pending));
  } catch {}
  return `/login?next=${encodeURIComponent(back)}`;
}

/** Follow/watch, as before. */
export function continueAfterLogin(kind: SocialKind, key: string): string {
  return parkAction({ type: "social", kind, key });
}

/** Run a parked action (if fresh) and return where to go next. Always clears it. */
export async function resumePending(): Promise<string | null> {
  let p: Pending | null = null;
  try {
    p = JSON.parse(localStorage.getItem(KEY) || "null");
    localStorage.removeItem(KEY);
  } catch {}
  if (!p || Date.now() - p.at > TTL_MS) return null;
  const a: ParkedAction | undefined = p.action ?? (p.kind && p.key ? { type: "social", kind: p.kind, key: p.key } : undefined);
  if (a?.type === "social") await setSocial(a.kind, a.key, true).catch(() => {});
  if (a?.type === "like") await setLike(a.kind, a.key, true).catch(() => {});
  return safeNext(p.returnTo);
}
