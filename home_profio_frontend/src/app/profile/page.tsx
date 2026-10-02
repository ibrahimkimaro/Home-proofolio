"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Copy, Globe, Link2, Loader2, Lock, ArrowUpRight, Trash2 } from "lucide-react";
import {
  checkUsernameAvailability,
  listWork,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type Profile,
  type User,
  type Visibility,
  type Work,
} from "@/lib/api";
import { KINDS, isPublic, kindOf } from "@/lib/items";
import { AppShell, Avatar, useSession } from "@/components/app/AppShell";
import { BusinessesPanel, RolesPanel } from "@/components/app/RolesPanel";

export default function ProfilePage() {
  const [user, setUser] = useSession();
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <AppShell user={user}>
      <ProfileEditor user={user} onProfile={(profile) => setUser({ ...user, profile })} />
    </AppShell>
  );
}

const VIS_OPTIONS: { id: Visibility; label: string; hint: string; icon: typeof Globe }[] = [
  { id: "public", label: "Public", hint: "Anyone can find and open it", icon: Globe },
  { id: "unlisted", label: "Link only", hint: "Only people you share the link with", icon: Link2 },
  { id: "private", label: "Private", hint: "Visitors see “not found”", icon: Lock },
];

function ProfileEditor({ user, onProfile }: { user: User; onProfile: (p: Profile) => void }) {
  const p = user.profile;
  const [form, setForm] = useState({
    display_name: p.display_name,
    headline: p.headline ?? "",
    bio: p.bio ?? "",
    username: p.username,
  });
  const [usernameState, setUsernameState] = useState<{ ok: boolean; message: string; suggestions: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listWork()
      .then((all) => setWorks(all.filter((w) => isPublic(w) && kindOf(w) !== "capture")))
      .catch(() => { });
  }, []);

  // Live username availability (debounced), skipped when unchanged.
  useEffect(() => {
    const name = form.username.trim().toLowerCase();
    if (name === p.username) return;
    const t = setTimeout(() => {
      checkUsernameAvailability(name)
        .then((r) => setUsernameState({ ok: r.available, message: r.message, suggestions: r.suggestions }))
        .catch(() => { });
    }, 400);
    return () => clearTimeout(t);
  }, [form.username, p.username]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false);
    if (k === "username") setUsernameState(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const usernameChanged = form.username.trim().toLowerCase() !== p.username;
  const dirty =
    form.display_name !== p.display_name ||
    form.headline !== (p.headline ?? "") ||
    form.bio !== (p.bio ?? "") ||
    usernameChanged;
  const canSave = dirty && form.display_name.trim() && !(usernameChanged && usernameState && !usernameState.ok);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        display_name: form.display_name.trim(),
        headline: form.headline,
        bio: form.bio,
        ...(usernameChanged ? { username: form.username.trim().toLowerCase() } : {}),
      });
      onProfile(updated);
      setForm((f) => ({ ...f, username: updated.username }));
      setUsernameState(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setVisibility(v: Visibility) {
    setError(null);
    try {
      onProfile(await updateProfile({ visibility: v }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change visibility");
    }
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      onProfile(await uploadAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  const publicUrl = typeof window === "undefined" ? `/u/${p.username}` : `${window.location.origin}/u/${p.username}`;
  const isVisible = p.visibility === "public" || p.visibility === "unlisted";

  const input =
    "h-12 w-full rounded-xl border border-hairline bg-paper px-4 text-[15px] outline-none transition-colors focus:border-ink/40";

  return (
    <div className="mx-auto w-full max-w-full px-4 pt-6 sm:px-6 md:pt-10">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Identity + edit form */}
        <div className="space-y-4 lg:col-span-8">
          <form onSubmit={save} className="overflow-hidden pf-surface rounded-2xl border border-hairline/50 bg-paper">
            <div className="h-28 cover-mono sm:h-36" />
            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-12 flex items-end gap-4">
                <div className="relative">
                  <Avatar name={form.display_name} src={p.avatar_url} className="h-24 w-24 text-[28px] ring-4 ring-paper" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={photoBusy}
                    aria-label={p.avatar_url ? "Change photo" : "Add photo"}
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper ring-4 ring-paper transition-transform hover:scale-105 cursor-pointer"
                  >
                    {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (onPhoto(e.target.files?.[0]), (e.target.value = ""))} />
                </div>
                {p.avatar_url && (
                  <button
                    type="button"
                    onClick={async () => onProfile(await removeAvatar())}
                    className="mb-1 flex items-center gap-1 text-[13px] text-slate hover:text-berry cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove photo
                  </button>
                )}
              </div>

              <div className="mt-8 space-y-5">
                <Field label="Name" htmlFor="name">
                  <input id="name" value={form.display_name} onChange={set("display_name")} maxLength={150} required className={input} />
                </Field>
                <Field label="Headline" htmlFor="headline" hint={`${form.headline.length}/160`}>
                  <input
                    id="headline"
                    value={form.headline}
                    onChange={set("headline")}
                    maxLength={160}
                    placeholder="Accounting student · Founder of XYZ Pharmacy"
                    className={input}
                  />
                </Field>
                <Field label="Bio" htmlFor="bio" hint={`${form.bio.length}/600`}>
                  <textarea
                    id="bio"
                    value={form.bio}
                    onChange={set("bio")}
                    maxLength={600}
                    rows={4}
                    placeholder="A few lines about what you do and what you care about."
                    className={`${input} h-auto resize-none py-3 leading-relaxed`}
                  />
                </Field>
                <Field label="Username" htmlFor="username">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate">@</span>
                    <input
                      id="username"
                      value={form.username}
                      onChange={set("username")}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`${input} pl-9`}
                    />
                  </div>
                  {usernameChanged && usernameState && (
                    <p className={`mt-2 text-[13px] ${usernameState.ok ? "text-ink-800" : "text-berry"}`}>
                      {usernameState.message}
                      {usernameState.suggestions.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {usernameState.suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, username: s }))}
                              className="rounded-md bg-paper-dim px-2.5 py-0.5 text-[12px] text-ink-800 hover:bg-hairline cursor-pointer"
                            >
                              @{s}
                            </button>
                          ))}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="mt-2 truncate text-[13px] text-slate">Your link: {publicUrl.replace(p.username, form.username.trim().toLowerCase() || p.username)}</p>
                </Field>
              </div>

              {error && <p className="mt-5 text-[14px] text-berry">{error}</p>}

              <div className="mt-8 flex items-center justify-end gap-3">
                {saved && !dirty && (
                  <span className="flex items-center gap-1 text-[14px] text-ink-800">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!canSave || saving}
                  className="flex h-11 items-center gap-2 rounded-lg bg-ink px-7 text-[15px] font-semibold text-paper transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </div>
          </form>
          <RolesPanel />
          <BusinessesPanel />
        </div>

        {/* Visibility, sharing, published work */}
        <div className="space-y-4 lg:col-span-4">
          <section className="pf-surface rounded-2xl border border-hairline/50 bg-paper p-5">
            <h2 className="mb-3 text-[15px] font-semibold">Who can see your profile</h2>
            <div className="space-y-1.5" role="radiogroup" aria-label="Profile visibility">
              {VIS_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
                const active = p.visibility === id || (id === "private" && p.visibility === "draft");
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setVisibility(id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer ${active ? "border-ink bg-paper-dim" : "border-transparent hover:bg-paper-dim"
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{label}</span>
                      <span className="block text-[12px] text-slate">{hint}</span>
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pf-surface rounded-2xl border border-hairline/50 bg-paper p-5">
            <h2 className="text-[15px] font-semibold">Share</h2>
            <p className="mt-1 text-[13px] text-slate">
              {isVisible ? "Put this link in your WhatsApp status, CV or LinkedIn." : "Make your profile public or link-only to share it."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!isVisible}
                onClick={() => {
                  navigator.clipboard?.writeText(publicUrl).catch(() => { });
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-ink text-[14px] font-semibold text-paper disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <Link
                href={`/u/${p.username}`}
                className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-hairline text-[14px] font-semibold hover:border-ink/40"
              >
                View as visitor <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="pf-surface rounded-2xl border border-hairline/50 bg-paper p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">On your profile</h2>
              <span className="text-[13px] text-slate">{works.length}</span>
            </div>
            {works.length === 0 ? (
              <p className="mt-2 text-[13px] text-slate">Nothing published yet. Publish from Home when something has proof.</p>
            ) : (
              <ul className="mt-2 divide-y divide-hairline/50">
                {works.slice(0, 5).map((w) => (
                  <li key={w.id} className="py-2.5">
                    <p className="truncate text-[14px] font-medium">{w.title}</p>
                    <p className="text-[12px] text-slate">{KINDS.find((k) => k.id === kindOf(w))?.label}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/work" className="mt-2 block text-[13px] font-medium text-slate hover:text-ink-800">
              Manage in Work & Projects →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-slate">
          {label}
        </label>
        {hint && <span className="text-[12px] tabular-nums text-slate/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
