import { Mail, MessageCircle, Phone } from "lucide-react";
import type { ContactItem, SocialLink } from "@/lib/api";
import { PLATFORMS, contactHref, platformOf, socialName, socialUrl } from "@/lib/contact";

const ICON = { email: Mail, phone: Phone, whatsapp: MessageCircle } as const;

/** Every email, phone number and WhatsApp number the member chose to show, each one tap away. */
export function ContactRows({ contacts, className = "" }: { contacts: ContactItem[]; className?: string }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {contacts.map((c) => {
        const Icon = ICON[c.kind];
        return (
          <li key={`${c.kind}-${c.value}`} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-neutral-500">{c.label || (c.kind === "email" ? "Email" : c.kind === "phone" ? "Phone" : "WhatsApp")}</span>
              <a href={contactHref(c)} target={c.kind === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" className="block break-all text-sm font-semibold text-neutral-950 hover:underline dark:text-white">
                {c.value}
              </a>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The social profiles, as small labelled links. */
export function SocialPills({ socials, className = "" }: { socials: SocialLink[]; className?: string }) {
  if (!socials.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Social profiles">
      {socials.map((s) => {
        const p = platformOf(s.platform);
        return (
          <li key={s.platform}>
            <a
              href={socialUrl(s)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={`${p?.label ?? s.platform} ${socialName(s)}`.trim()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-neutral-900 shadow-2xs transition-all hover:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-[10px] font-black text-white dark:bg-white dark:text-neutral-900">{p?.short ?? "?"}</span>
              <span>{p?.label ?? s.platform}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export { PLATFORMS };
