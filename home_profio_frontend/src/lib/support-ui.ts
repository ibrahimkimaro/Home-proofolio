/**
 * Opens the floating support assistant from anywhere on the page and starts a live chat with the
 * support admin, with the visitor's first message already filled in. The assistant (mounted once per
 * page) listens for this event, so callers don't need a reference to it.
 */
export const OPEN_SUPPORT_EVENT = "pf:open-support";

export function openSupport(text?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ text?: string }>(OPEN_SUPPORT_EVENT, { detail: { text } }));
}

/** The message sent when someone can't find their discipline in the list. */
export function missingDisciplineMessage(typed?: string) {
  const t = typed?.trim();
  return t
    ? `Hi! I couldn't find my kind of work in the list: "${t}". Could you please add it?`
    : "Hi! I couldn't find my kind of work in the list. Could you please add it?";
}
