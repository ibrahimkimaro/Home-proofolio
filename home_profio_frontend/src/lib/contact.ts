import type { ContactItem, SocialLink } from "@/lib/api";

/** The social platforms a member can add. The server stores only the handle; the link is built here. */
export const PLATFORMS: { id: SocialLink["platform"]; label: string; short: string; url: (h: string) => string; placeholder: string }[] = [
  { id: "instagram", label: "Instagram", short: "IG", url: (h) => `https://instagram.com/${h}`, placeholder: "username" },
  { id: "tiktok", label: "TikTok", short: "TT", url: (h) => `https://www.tiktok.com/@${h}`, placeholder: "username" },
  { id: "github", label: "GitHub", short: "GH", url: (h) => `https://github.com/${h}`, placeholder: "username" },
  { id: "facebook", label: "Facebook", short: "FB", url: (h) => `https://facebook.com/${h}`, placeholder: "username or page" },
  { id: "snapchat", label: "Snapchat", short: "SC", url: (h) => `https://www.snapchat.com/add/${h}`, placeholder: "username" },
  { id: "threads", label: "Threads", short: "TH", url: (h) => `https://www.threads.net/@${h}`, placeholder: "username" },
  { id: "x", label: "X", short: "X", url: (h) => `https://x.com/${h}`, placeholder: "username" },
  { id: "telegram", label: "Telegram", short: "TG", url: (h) => `https://t.me/${h}`, placeholder: "username" },
  { id: "linkedin", label: "LinkedIn", short: "in", url: (h) => `https://www.linkedin.com/in/${h}`, placeholder: "username" },
];

export const platformOf = (id: string) => PLATFORMS.find((p) => p.id === id);
/** The saved value is the full https link (older ones may be a bare username). Only https links are ever opened. */
const isLink = (v: string) => v.toLowerCase().startsWith("https://");
export const socialUrl = (s: SocialLink) => (isLink(s.handle) ? s.handle : platformOf(s.platform)?.url(s.handle.replace(/^@/, "")) ?? "#");
/** What to show next to the platform name: @username when the link has one, otherwise nothing (e.g. share links). */
export function socialName(s: SocialLink): string {
  if (!isLink(s.handle)) return `@${s.handle.replace(/^@/, "")}`;
  let segs: string[] = [];
  try {
    segs = new URL(s.handle).pathname.split("/").filter(Boolean);
  } catch {}
  const name = segs.length === 1 ? segs[0] : segs.length === 2 && (segs[0] === "in" || segs[0] === "add") ? segs[1] : "";
  return name ? `@${name.replace(/^@/, "")}` : "";
}

export const KIND_LABEL: Record<ContactItem["kind"], string> = { email: "Email", phone: "Phone", whatsapp: "WhatsApp" };

export const telHref = (v: string) => `tel:${v.replace(/[^\d+]/g, "")}`;
export const whatsappHref = (v: string) => `https://wa.me/${v.replace(/\D/g, "")}`;
export const contactHref = (c: ContactItem) => (c.kind === "email" ? `mailto:${c.value}` : c.kind === "phone" ? telHref(c.value) : whatsappHref(c.value));

/** All ways to reach the member: the main email first, then the extra ones. */
export function allContacts(primaryEmail: string | null | undefined, contacts: ContactItem[] | undefined): ContactItem[] {
  const list = contacts ?? [];
  const main: ContactItem[] = primaryEmail && !list.some((c) => c.kind === "email" && c.value === primaryEmail.toLowerCase()) ? [{ kind: "email", value: primaryEmail, label: null }] : [];
  return [...main, ...list];
}
