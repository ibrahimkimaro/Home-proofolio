import { setSocial, type SocialKind } from "@/lib/api";

/**
 * "Continue the action after login" (PRD FR-AUTH-04, NFR-07): one mechanism for every feature.
 * A visitor's action is parked here, they sign in or register, and it completes afterwards.
 */
const KEY = "proofolio:pending";
const TTL_MS = 60 * 60 * 1000;

type Pending = { kind: SocialKind; key: string; returnTo: string; at: number };

/** Only same-site paths: never let ?next= send people to another site. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/** Park the action and return the login URL to send the visitor to. */
export function continueAfterLogin(kind: SocialKind, key: string): string {
  const returnTo = window.location.pathname;
  try {
    localStorage.setItem(KEY, JSON.stringify({ kind, key, returnTo, at: Date.now() } satisfies Pending));
  } catch {}
  return `/login?next=${encodeURIComponent(returnTo)}`;
}

/** Run a parked action (if fresh) and return where to go next. Always clears it. */
export async function resumePending(): Promise<string | null> {
  let p: Pending | null = null;
  try {
    p = JSON.parse(localStorage.getItem(KEY) || "null");
    localStorage.removeItem(KEY);
  } catch {}
  if (!p || Date.now() - p.at > TTL_MS) return null;
  await setSocial(p.kind, p.key, true).catch(() => {});
  return safeNext(p.returnTo);
}
