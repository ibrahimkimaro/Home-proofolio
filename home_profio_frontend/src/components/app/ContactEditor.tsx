"use client";

import { useState } from "react";
import { Mail, MessageCircle, Phone, Plus, Trash2, UserRound } from "lucide-react";
import type { ContactItem, SocialLink } from "@/lib/api";
import { KIND_LABEL, PLATFORMS, platformOf, socialName, socialUrl } from "@/lib/contact";

const field = "h-11 w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none focus:border-ink";
const lab = "mb-2 block text-[13px] font-semibold";
const MAX_CONTACTS = 10;

/**
 * Settings > Portfolio: the ways visitors can reach the member. Several emails (Gmail, Yahoo, iCloud, Microsoft...),
 * phone and WhatsApp numbers, and social profiles. The sign-in email and phone are one tap to add. Only what is
 * added here shows on the portfolio.
 */
export function ContactEditor({
  contacts,
  socials,
  signInEmail,
  signInPhone,
  onContacts,
  onSocials,
}: {
  contacts: ContactItem[];
  socials: SocialLink[];
  signInEmail?: string | null;
  signInPhone?: string | null;
  onContacts: (c: ContactItem[]) => void;
  onSocials: (s: SocialLink[]) => void;
}) {
  const [kind, setKind] = useState<ContactItem["kind"]>("email");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState<SocialLink["platform"]>("instagram");
  const [handle, setHandle] = useState("");

  const has = (k: ContactItem["kind"], v: string) => contacts.some((c) => c.kind === k && c.value.toLowerCase() === v.toLowerCase());
  const add = (item: ContactItem) => {
    if (has(item.kind, item.value) || contacts.length >= MAX_CONTACTS) return;
    onContacts([...contacts, item]);
  };
  const free = PLATFORMS.filter((p) => !socials.some((s) => s.platform === p.id));

  function addTyped(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    add({ kind, value: v, label: label.trim() || null });
    setValue("");
    setLabel("");
  }

  function addSocial(e: React.FormEvent) {
    e.preventDefault();
    const h = handle.trim();
    if (!h) return;
    onSocials([...socials.filter((s) => s.platform !== platform), { platform, handle: h }]);
    setHandle("");
    const next = free.find((p) => p.id !== platform);
    if (next) setPlatform(next.id);
  }

  const ICON = { email: Mail, phone: Phone, whatsapp: MessageCircle } as const;
  const placeholder = kind === "email" ? "name@yahoo.com, icloud.com, outlook.com…" : "+255 712 345 678";

  return (
    <div className="space-y-6">
      <div>
        <span className={lab}>More ways to reach you</span>
        <p className="-mt-1 mb-3 text-[12px] text-slate">Add other emails (Yahoo, iCloud, Microsoft…), phone numbers and WhatsApp. They show on your portfolio.</p>

        {(signInEmail || signInPhone) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {signInEmail && !has("email", signInEmail) && (
              <button type="button" onClick={() => add({ kind: "email", value: signInEmail, label: "Sign-in email" })} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12px] font-semibold hover:border-ink">
                <UserRound className="h-3.5 w-3.5" /> Use my sign-in email
              </button>
            )}
            {signInPhone && !has("phone", signInPhone) && (
              <button type="button" onClick={() => add({ kind: "phone", value: signInPhone, label: "Sign-in phone" })} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12px] font-semibold hover:border-ink">
                <UserRound className="h-3.5 w-3.5" /> Use my sign-in phone
              </button>
            )}
          </div>
        )}

        {contacts.length > 0 && (
          <ul className="mb-3 space-y-2">
            {contacts.map((c, i) => {
              const Icon = ICON[c.kind];
              return (
                <li key={`${c.kind}-${c.value}`} className="flex items-center gap-2.5 rounded-lg border border-hairline px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-slate" />
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block break-all font-semibold">{c.value}</span>
                    <span className="block text-[11px] text-slate">{c.label || KIND_LABEL[c.kind]}</span>
                  </span>
                  <button type="button" onClick={() => onContacts(contacts.filter((_, j) => j !== i))} aria-label={`Remove ${c.value}`} className="h-8 w-8 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={addTyped} className="grid gap-2 sm:grid-cols-[8.5rem_1fr]">
          <select value={kind} onChange={(e) => setKind(e.target.value as ContactItem["kind"])} aria-label="Type" className={`${field} cursor-pointer`}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} type={kind === "email" ? "email" : "tel"} maxLength={120} placeholder={placeholder} aria-label="Email or number" className={field} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} placeholder="Label (optional): Work, Personal…" aria-label="Label" className={`${field} sm:col-span-2`} />
          <button type="submit" disabled={!value.trim() || contacts.length >= MAX_CONTACTS} className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-hairline text-[13px] font-semibold hover:border-ink disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2">
            <Plus className="h-4 w-4" /> Add {KIND_LABEL[kind].toLowerCase()}
          </button>
        </form>
      </div>

      <div>
        <span className={lab}>Social media</span>
        {socials.length > 0 && (
          <ul className="mb-3 space-y-2">
            {socials.map((s) => (
              <li key={s.platform} className="flex items-center gap-2.5 rounded-lg border border-hairline px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-[10px] font-black text-paper">{platformOf(s.platform)?.short}</span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block font-semibold">{platformOf(s.platform)?.label}</span>
                  <a href={socialUrl(s)} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-[11px] text-slate underline">{socialName(s) || socialUrl(s).split("//")[1]?.replace("www.", "")}</a>
                </span>
                <button type="button" onClick={() => onSocials(socials.filter((x) => x.platform !== s.platform))} aria-label={`Remove ${platformOf(s.platform)?.label}`} className="h-8 w-8 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate hover:bg-berry/10 hover:text-berry">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {free.length > 0 && (
          <form onSubmit={addSocial} className="grid gap-2 sm:grid-cols-[8.5rem_1fr_auto]">
            <select value={free.some((p) => p.id === platform) ? platform : free[0].id} onChange={(e) => setPlatform(e.target.value as SocialLink["platform"])} aria-label="Platform" className={`${field} cursor-pointer`}>
              {free.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={300} placeholder="Paste your profile link (or just your username)" aria-label="Username" className={field} />
            <button type="submit" disabled={!handle.trim()} className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-semibold hover:border-ink disabled:cursor-not-allowed disabled:opacity-40">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
