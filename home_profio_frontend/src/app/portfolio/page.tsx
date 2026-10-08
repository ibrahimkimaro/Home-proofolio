"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Moon,
  Palette,
  Plus,
  Sliders,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import {
  readAppearance,
  applyAppearance,
  TONES,
  type Appearance,
  type ToneId,
  type ThemeChoice,
} from "@/lib/appearance";
import {
  fetchCvRequests,
  fetchPortfolio,
  fetchVisitorMessages,
  listMyRoles,
  listWork,
  savePortfolio,
  updateProfile,
  type PortfolioSection,
  type PortfolioSettings,
  type Profile,
  type User,
  type Work,
} from "@/lib/api";
import { KINDS, isPublic, kindOf, stateLabel } from "@/lib/items";
import { AppShell, Avatar, displayName, useSession } from "@/components/app/AppShell";
import { EngagementPanel } from "@/components/app/EngagementPanel";
import { ContactEditor } from "@/components/app/ContactEditor";

const SECTION_LABEL: Record<PortfolioSection, string> = {
  about: "About",
  experience: "Experience timeline",
  works: "Selected works",
  contact: "Contact",
};
const ALL: PortfolioSection[] = ["about", "experience", "works", "contact"];
const card = "pf-surface rounded-2xl border border-hairline bg-paper p-5 shadow-sm";
const field = "h-11 w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none focus:border-ink";
const label = "mb-2 block text-[13px] font-semibold";

export default function PortfolioPage() {
  const [user, setUser] = useSession();
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <AppShell user={user}>
      <Customize user={user} onProfile={(profile) => setUser({ ...user, profile })} />
    </AppShell>
  );
}

function Customize({ user, onProfile }: { user: User; onProfile: (p: Profile) => void }) {
  const [saved, setSaved] = useState<PortfolioSettings | null>(null);
  const [s, setS] = useState<PortfolioSettings | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [roleTitles, setRoleTitles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance | null>(null);

  const [activeTab, setActiveTab] = useState<"customize" | "activity">("customize");
  const [pendingInquiries, setPendingInquiries] = useState(0);

  useEffect(() => {
    setAppearance(readAppearance());
    fetchPortfolio().then((p) => (setSaved(p), setS(p))).catch(() => setError("Couldn't load your portfolio settings"));
    listWork().then((all) => setWorks(all.filter((w) => isPublic(w) && kindOf(w) !== "capture"))).catch(() => { });
    listMyRoles().then((r) => setRoleTitles(r.filter((x) => x.current).map((x) => x.title))).catch(() => { });
    Promise.all([fetchCvRequests(), fetchVisitorMessages()])
      .then(([r, m]) => {
        setPendingInquiries(r.filter((x) => x.status === "pending").length + m.filter((x) => !x.read).length);
      })
      .catch(() => {});
  }, []);

  function updateTheme(theme: ThemeChoice) {
    if (!appearance) return;
    const next = { ...appearance, theme };
    setAppearance(next);
    applyAppearance(next);
  }

  function updateTone(tone: ToneId) {
    if (!appearance) return;
    const next = { ...appearance, tone, theme: TONES.find((t) => t.id === tone)?.theme || appearance.theme };
    setAppearance(next);
    applyAppearance(next);
  }

  if (!s) return <div className="mx-auto mt-10 h-64 max-w-6xl animate-pulse rounded-2xl bg-paper" />;

  const set = <K extends keyof PortfolioSettings>(k: K, v: PortfolioSettings[K]) => setS({ ...s, [k]: v });
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const p = user.profile;
  const isLive = p.visibility === "public" || p.visibility === "unlisted";
  const order: PortfolioSection[] = [...s.sections, ...ALL.filter((x) => !s.sections.includes(x))];

  function move(sec: PortfolioSection, dir: -1 | 1) {
    const list = [...order];
    const i = list.indexOf(sec);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("sections", list.filter((x) => s!.sections.includes(x)));
  }

  function toggleSection(sec: PortfolioSection) {
    set("sections", s!.sections.includes(sec) ? s!.sections.filter((x) => x !== sec) : order.filter((x) => x === sec || s!.sections.includes(x)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await savePortfolio({ ...s!, roles: s!.roles.map((r) => r.trim()).filter(Boolean), contact_email: s!.contact_email?.trim() || null });
      setSaved(next);
      setS(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className=" max-w-full px-4 pt-6 sm:px-6 md:pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[30px]">Portfolio Studio</h1>
          <p className="mt-1 text-[14px] text-slate">Shape what visitors see. Only items you made Public appear on your live profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLive && (
            <button
              type="button"
              onClick={async () => onProfile(await updateProfile({ visibility: "public" }))}
              className="flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-[14px] font-semibold hover:border-ink cursor-pointer"
            >
              <Globe className="h-4 w-4" /> Make profile public
            </button>
          )}
          <Link
            href={p?.username ? `/portfolio/preview?u=${encodeURIComponent(p.username)}` : "/portfolio/preview"}
            target="_blank"
            className="flex h-10 items-center gap-2 rounded-lg bg-ink-700 text-paper px-4 text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Eye className="h-4 w-4" /> Preview Portfolio
          </Link>
          <Link
            href={`/u/${p.username}`}
            target="_blank"
            className="flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-[14px] font-semibold hover:border-ink"
          >
            <Globe className="h-4 w-4" /> Open live
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-hairline/60 pb-3">
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-paper-dim p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("customize")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === "customize"
                ? "bg-paper text-ink-900 shadow-xs"
                : "text-slate hover:text-ink-800"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Customize & Layout</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === "activity"
                ? "bg-paper text-ink-900 shadow-xs"
                : "text-slate hover:text-ink-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Audience & Activity</span>
            {pendingInquiries > 0 && (
              <span className="rounded-full bg-brass px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingInquiries}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate">
          <span className={`inline-block h-2 w-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span>{isLive ? "Publicly live" : "Private portfolio"}</span>
        </div>
      </div>

      {/* Pending inquiries alert banner if currently on customize tab */}
      {pendingInquiries > 0 && activeTab === "customize" && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brass/30 bg-brass/10 px-4 py-2.5 text-[13px] text-ink-900">
          <span className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-brass animate-pulse" />
            You have {pendingInquiries} pending visitor {pendingInquiries === 1 ? "inquiry" : "inquiries"} (CV requests or messages).
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className="font-bold underline hover:opacity-80 cursor-pointer"
          >
            View in Activity →
          </button>
        </div>
      )}

      {activeTab === "activity" ? (
        <EngagementPanel onPendingCount={setPendingInquiries} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
        {/* Settings */}
        <div className="space-y-4 lg:col-span-5">
          {/* Quick Jump Navigation Chips on Laptop */}
          <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
            <a href="#hero-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Hero</a>
            <a href="#roles-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Roles</a>
            <a href="#sections-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Sections</a>
            <a href="#featured-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Featured ({s.featured.length}/6)</a>
            <a href="#contact-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Contact</a>
            <a href="#theme-sec" className="rounded-md bg-paper-dim px-2.5 py-1 text-[11px] font-bold text-slate hover:text-ink-900 transition-colors">Theme</a>
          </div>

          <section id="hero-sec" className={`${card} scroll-mt-24`}>
            <label htmlFor="tagline" className={label}>
              Hero statement
            </label>
            <textarea
              id="tagline"
              rows={3}
              maxLength={200}
              value={s.tagline ?? ""}
              onChange={(e) => set("tagline", e.target.value || null)}
              placeholder="What you build, solve and investigate — in one or two lines."
              className={`${field} h-auto resize-none py-2.5 leading-relaxed`}
            />
            <p className="mt-1 text-right text-[12px] tabular-nums text-slate">{(s.tagline ?? "").length}/200</p>
          </section>

          <section id="roles-sec" className={`${card} scroll-mt-24`}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={label}>Rotating roles</span>
              {roleTitles.length > 0 && (
                <button type="button" onClick={() => set("roles", roleTitles.slice(0, 6))} className="text-[12px] font-medium text-slate hover:text-ink-800 cursor-pointer">
                  Use my roles
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {s.roles.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    aria-label={`Role ${i + 1}`}
                    value={r}
                    maxLength={60}
                    onChange={(e) => set("roles", s.roles.map((x, j) => (j === i ? e.target.value : x)))}
                    className={field}
                  />
                  <button
                    type="button"
                    aria-label="Remove role"
                    onClick={() => set("roles", s.roles.filter((_, j) => j !== i))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline text-slate hover:text-berry cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            {s.roles.length < 6 && (
              <button type="button" onClick={() => set("roles", [...s.roles, ""])} className="mt-2 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer">
                <Plus className="h-4 w-4" /> Add a role
              </button>
            )}
          </section>

          <section id="sections-sec" className={`${card} scroll-mt-24`}>
            <span className={label}>Sections</span>
            <ul className="divide-y divide-hairline">
              {order.map((sec, i) => {
                const on = s.sections.includes(sec);
                return (
                  <li key={sec} className="flex items-center gap-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec)}
                      aria-pressed={on}
                      aria-label={`${on ? "Hide" : "Show"} ${SECTION_LABEL[sec]}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline cursor-pointer"
                    >
                      {on ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate" />}
                    </button>
                    <span className={`flex-1 text-[14px] ${on ? "" : "text-slate line-through"}`}>{SECTION_LABEL[sec]}</span>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(sec, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate hover:bg-paper-dim disabled:opacity-30 cursor-pointer">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(sec, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate hover:bg-paper-dim disabled:opacity-30 cursor-pointer">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="featured-sec" className={`${card} scroll-mt-24`}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={label}>Featured works</span>
              <span className="text-[12px] tabular-nums text-slate">{s.featured.length}/6</span>
            </div>
            {works.length === 0 ? (
              <p className="text-[13px] text-slate">Nothing public yet. Publish from Home or Work to feature it here.</p>
            ) : (
              <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {works.map((w) => {
                  const on = s.featured.includes(w.id);
                  const full = !on && s.featured.length >= 6;
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        disabled={full}
                        aria-pressed={on}
                        onClick={() => set("featured", on ? s.featured.filter((x) => x !== w.id) : [...s.featured, w.id])}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-paper-dim disabled:opacity-40 cursor-pointer"
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-ink bg-ink text-paper" : "border-hairline"}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{w.title}</span>
                          <span className="block text-[12px] text-slate">
                            {KINDS.find((k) => k.id === kindOf(w))?.label} · {stateLabel(w.status)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section id="metrics-sec" className={`${card} space-y-4 scroll-mt-24`}>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-[14px] font-semibold">Show metrics</span>
                <span className="block text-[12px] text-slate">Years active, proofs and public items in the hero</span>
              </span>
              <input type="checkbox" checked={s.show_metrics} onChange={(e) => set("show_metrics", e.target.checked)} className="peer sr-only" />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
            </label>
            <div>
              <label htmlFor="contact" className={label}>
                Contact email <span className="font-normal text-slate">(optional, shown publicly)</span>
              </label>
              <input id="contact" type="email" value={s.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value || null)} placeholder="you@example.com" className={field} />
            </div>
          </section>

          <section id="contact-sec" className={`${card} space-y-4 scroll-mt-24`}>
            <div>
              <h2 className="text-[15px] font-bold">Contact &amp; social</h2>
              <p className="text-[12px] text-slate">Everything you add here shows in your portfolio&apos;s contact area. Remove it and it disappears.</p>
            </div>
            <ContactEditor
              contacts={s.contacts ?? []}
              socials={s.socials ?? []}
              signInEmail={user.email}
              signInPhone={user.phone_number}
              onContacts={(c) => set("contacts", c)}
              onSocials={(x) => set("socials", x)}
            />
          </section>

          {/* Theme & Palette Comfort Tone */}
          <section id="theme-sec" className={`${card} space-y-4 scroll-mt-24`}>
            <div>
              <span className={label}>Portfolio Theme & Comfort Tone</span>
              <p className="text-[12px] text-slate mb-3">Choose the aesthetic and eye-comfort tone for your portfolio.</p>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(["light", "dark", "system"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateTheme(m)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[13px] font-semibold transition-all cursor-pointer ${
                      appearance?.theme === m
                        ? "border-ink bg-paper text-ink font-bold shadow-xs"
                        : "border-hairline text-slate hover:text-ink hover:border-ink/50"
                    }`}
                  >
                    {m === "light" && <Sun className="h-3.5 w-3.5" />}
                    {m === "dark" && <Moon className="h-3.5 w-3.5" />}
                    {m === "system" && <Palette className="h-3.5 w-3.5" />}
                    <span className="capitalize">{m}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateTone(t.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[12px] transition-all cursor-pointer ${
                      appearance?.tone === t.id
                        ? "border-ink bg-paper font-bold text-ink ring-1 ring-ink"
                        : "border-hairline text-slate hover:bg-paper-dim"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-hairline shrink-0"
                      style={{ backgroundColor: t.page }}
                    />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Live structural preview */}
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-24 flex flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate">
                <span>Interactive Live Preview</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <Link
                href={user?.profile?.username ? `/portfolio/preview?u=${encodeURIComponent(user.profile.username)}` : "/portfolio/preview"}
                target="_blank"
                className="flex items-center gap-1 text-xs font-semibold text-ink-900 hover:underline"
              >
                <span>Full screen preview</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-hidden pf-surface rounded-2xl border border-hairline bg-paper shadow-sm flex flex-col lg:max-h-[calc(100vh-8.5rem)]">
              <Preview user={user} s={s} works={works} roleTitles={roleTitles} />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Save bar */}
      {activeTab === "customize" && (
        <div className="sticky bottom-20 z-20 mt-6 md:bottom-4">
          <div className={`mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-hairline bg-paper/95 p-2 pl-4 shadow-md backdrop-blur transition-opacity ${dirty || error ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <p className={`flex-1 text-[13px] ${error ? "text-berry" : "text-slate"}`}>{error ?? "You have unsaved changes"}</p>
            <button type="button" onClick={() => setS(saved)} className="h-9 rounded-lg px-3 text-[13px] text-slate cursor-pointer">
              Discard
            </button>
            <button type="button" onClick={save} disabled={busy} className="flex h-9 items-center gap-2 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper disabled:opacity-60 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ user, s, works, roleTitles }: { user: User; s: PortfolioSettings; works: Work[]; roleTitles: string[] }) {
  const p = user.profile;
  const featured = [
    ...s.featured.map((id) => works.find((w) => w.id === id)).filter(Boolean),
    ...works.filter((w) => !s.featured.includes(w.id)),
  ] as Work[];
  const isLive = p.visibility === "public" || p.visibility === "unlisted";

  const block = (sec: PortfolioSection) => {
    switch (sec) {
      case "about":
        return p.bio ? (
          <p className="text-[13px] leading-relaxed text-ink-800">{p.bio}</p>
        ) : (
          <p className="text-[12px] italic text-slate">Add a bio on your Profile to fill this.</p>
        );
      case "experience": {
        const rolesToShow = roleTitles.length > 0 ? roleTitles.slice(0, 4) : s.roles.filter(Boolean).slice(0, 4);
        return rolesToShow.length > 0 ? (
          <div className="space-y-2">
            {rolesToShow.map((role, idx) => (
              <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-hairline/60 bg-paper-dim/30 px-3 py-2 text-[12px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-ink-900 truncate">{role}</span>
                <span className="text-slate text-[11px] ml-auto">Active</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] italic text-slate">Add rotating roles to showcase experience.</p>
        );
      }
      case "works":
        return featured.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {featured.slice(0, 6).map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-hairline/80 bg-paper-dim/30 p-3 transition-all hover:border-ink/40"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
                    {KINDS.find((k) => k.id === kindOf(w))?.label ?? "Work"}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {stateLabel(w.status)}
                  </span>
                </div>
                <p className="line-clamp-2 text-[12px] font-bold text-ink-900 leading-snug">{w.title}</p>
                {w.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.skills.slice(0, 2).map((sk) => (
                      <span key={sk} className="rounded bg-paper px-1.5 py-0.5 text-[9px] text-slate border border-hairline">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] italic text-slate">No public work featured yet.</p>
        );
      case "contact":
        return (
          <div className="flex flex-wrap gap-2 text-[12px]">
            {s.contact_email && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper-dim/40 px-3 py-1 font-semibold text-ink-900">
                ✉ {s.contact_email}
              </span>
            )}
            {(s.contacts ?? []).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper-dim/40 px-3 py-1 text-slate">
                {c.label}: {c.value}
              </span>
            ))}
            {(s.socials ?? []).map((soc, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-paper-dim/40 px-3 py-1 text-slate capitalize">
                {soc.platform}
              </span>
            ))}
            {!s.contact_email && (s.contacts ?? []).length === 0 && (s.socials ?? []).length === 0 && (
              <span className="italic text-slate">Follow button only — no direct contact displayed.</span>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2 text-[12px] text-slate bg-paper-dim/40 shrink-0">
        <span className="flex items-center gap-1.5 font-medium">
          {isLive ? <Globe className="h-3.5 w-3.5 text-emerald-600" /> : <Lock className="h-3.5 w-3.5 text-amber-600" />}
          /u/{p.username}
        </span>
        <Link href={`/u/${p.username}`} target="_blank" className="flex items-center gap-1 font-semibold text-ink-800 hover:underline">
          Visit live <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-slate">Hi, I&apos;m</p>
            <p className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">{displayName(user)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate">
              {(s.roles.filter(Boolean).length ? s.roles.filter(Boolean) : [p.headline ?? ""]).join(" • ")}
            </p>
            {s.tagline && <p className="mt-2.5 text-[13px] leading-relaxed text-ink-800">{s.tagline}</p>}
          </div>
          <div className="hidden w-36 shrink-0 rounded-xl border border-hairline p-3 sm:block">
            <Avatar name={displayName(user)} src={p.avatar_url} className="mx-auto h-14 w-14 text-[16px]" />
            {s.show_metrics && (
              <ul className="mt-2.5 space-y-1.5 text-[10px]">
                {[
                  [Clock, "Years active"],
                  [Award, "Top credential"],
                  [CheckCircle2, `${works.length} public`],
                ].map(([Icon, text], i) => {
                  const I = Icon as typeof Clock;
                  return (
                    <li key={i} className="flex items-center gap-1.5 rounded-md border border-hairline px-2 py-0.5 text-slate">
                      <I className="h-3 w-3 text-emerald-600" /> {text as string}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {s.sections.map((sec) => (
          <div key={sec} className="border-t border-hairline/50 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate">{SECTION_LABEL[sec]}</p>
            {block(sec)}
          </div>
        ))}
        {s.sections.length === 0 && <p className="text-[13px] text-slate italic">All sections are hidden.</p>}
      </div>
    </>
  );
}
