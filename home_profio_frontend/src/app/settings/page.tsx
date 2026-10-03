"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  changePassword,
  deleteAccount,
  exportDataUrl,
  getAccount,
  listSessions,
  signOutDevice,
  signOutOtherDevices,
  updateAccount,
  saveAppearancePreference,
  fetchPrivacyPreference,
  savePrivacyPreference,
  updateProfile,
  type Account,
  type DeviceSession,
  type Profile,
  type User,
  type Visibility,
} from "@/lib/api";
import { AppShell, AppShellSkeleton, useSession } from "@/components/app/AppShell";
import { ActivateButton, usePendingActivation } from "@/components/app/Activation";
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  GLASS,
  TEXT_SIZES,
  MIN_CONTRAST,
  TONES,
  applyAppearance,
  readAppearance,
  readable,
  setSyncEnabled,
  syncEnabled,
  type Appearance,
  type ThemeChoice,
  type ToneId,
} from "@/lib/appearance";

type Tab = "account" | "security" | "appearance" | "privacy" | "data";
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "security", label: "Password & security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "data", label: "Your data", icon: Download },
];

const card = "pf-surface rounded-2xl border border-hairline bg-paper p-5 shadow-sm sm:p-6";
const field = "h-11 w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none transition-colors focus:border-ink";
const label = "mb-1.5 block text-[13px] font-semibold";
const primary = "flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-[14px] font-semibold text-paper disabled:opacity-40 cursor-pointer";

export default function SettingsPage() {
  const [user, setUser] = useSession();
  if (!user) return <AppShellSkeleton />;
  return (
    <AppShell user={user}>
      <Settings user={user} onProfile={(profile) => setUser({ ...user, profile })} />
    </AppShell>
  );
}

function Settings({ user, onProfile }: { user: User; onProfile: (p: Profile) => void }) {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hash.slice(1);
      return TABS.some((t) => t.id === h) ? (h as Tab) : "account";
    }
    return "account";
  });

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === h)) setTab(h as Tab);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function go(t: Tab) {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 pt-6 sm:px-6 md:pt-8">
      <h1 className="px-1 text-[26px] font-bold tracking-tight sm:text-[30px]">Settings</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-col md:px-0">
          {TABS.map(({ id, label: l, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors cursor-pointer ${tab === id ? "bg-ink font-semibold text-paper" : "text-slate hover:bg-paper hover:text-ink-800"
                }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              {l}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          {tab === "account" && <AccountSection user={user} />}
          {tab === "security" && <SecuritySection />}
          {tab === "appearance" && <AppearanceSection />}
          {tab === "privacy" && <PrivacySection profile={user.profile} onProfile={onProfile} />}
          {tab === "data" && <DataSection username={user.profile.username} />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-slate">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Status({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p className="text-[13px] text-berry">{error}</p>;
  if (ok)
    return (
      <p className="flex items-center gap-1 text-[13px]">
        <Check className="h-4 w-4" /> {ok}
      </p>
    );
  return null;
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={`${field} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate hover:text-ink-800 cursor-pointer"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ---------- Account ----------

function AccountSection({ user }: { user: User }) {
  const pending = usePendingActivation(user);
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    getAccount()
      .then((a) => (setAccount(a), setEmail(a.email), setPhone(a.phone_number ?? "")))
      .catch(() => setError("Couldn't load your account"));
  }, []);

  if (!account) return <div className="h-64 animate-pulse rounded-2xl bg-paper" />;
  const emailChanged = email.trim().toLowerCase() !== account.email.toLowerCase();
  const dirty = emailChanged || phone.trim() !== (account.phone_number ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const a = await updateAccount({ email: email.trim(), phone_number: phone.trim() || null, ...(emailChanged ? { current_password: password } : {}) });
      setAccount(a);
      setPassword("");
      setOk(emailChanged ? "Email updated — use it next time you sign in" : "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {pending && (
        <Section title="Activate account" hint="Your account is suspended until you enter the code we sent. Codes last 15 minutes; you can send a new one by SMS or email.">
          <ActivateButton
            user={user}
            className="rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Activate account
          </ActivateButton>
        </Section>
      )}
      <Section title="Sign-in details" hint="Private. Never shown on your profile.">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
          </div>
          {emailChanged && (
            <div>
              <label htmlFor="email-pw" className={label}>
                Current password <span className="font-normal text-slate">— needed to change your email</span>
              </label>
              <PasswordInput id="email-pw" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>
          )}
          <div>
            <label htmlFor="phone" className={label}>
              Phone number
            </label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 7…" autoComplete="tel" className={field} />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Status error={error} ok={ok} />
            <button type="submit" disabled={!dirty || busy || (emailChanged && !password)} className={`${primary} ml-auto`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </Section>

      <Section title="Profile and username" hint="Name, photo, headline, bio and your public link live on your profile.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px]">
            <span className="text-slate">Your link:</span> /u/{user.profile.username}
          </p>
          <Link href="/profile" className="flex h-10 items-center rounded-lg border border-hairline px-4 text-[14px] font-semibold hover:border-ink">
            Edit profile
          </Link>
        </div>
        <p className="mt-4 text-[13px] text-slate">
          Member since {new Date(account.created_at).toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
      </Section>
    </>
  );
}

// ---------- Security ----------

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}
const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"];

function deviceName(ua: string | null) {
  if (!ua) return { name: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return { name: os ? `${browser} on ${os}` : browser, mobile: /iPhone|iPad|Android|Mobile/.test(ua) };
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);

  const loadSessions = () => listSessions().then(setSessions).catch(() => setSessions([]));
  useEffect(() => {
    loadSessions();
  }, []);

  const score = next.length < 8 ? 0 : strength(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSave = current && next.length >= 8 && next === confirm && !busy;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setOk("Password changed. Other devices were signed out.");
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <>
      <Section title="Change password" hint="Use at least 8 characters. Changing it signs out your other devices.">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="current" className={label}>
              Current password
            </label>
            <PasswordInput id="current" value={current} onChange={setCurrent} autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="new" className={label}>
              New password
            </label>
            <PasswordInput id="new" value={next} onChange={setNext} autoComplete="new-password" />
            {next && (
              <div className="mt-2 flex items-center gap-3" aria-live="polite">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-1 flex-1 rounded-sm ${i <= score ? "bg-ink" : "bg-hairline"}`} />
                  ))}
                </div>
                <span className="w-16 text-right text-[12px] text-slate">{STRENGTH[score]}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirm" className={label}>
              Confirm new password
            </label>
            <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            {mismatch && <p className="mt-1.5 text-[12px] text-berry">Passwords don&apos;t match</p>}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Status error={error} ok={ok} />
            <button type="submit" disabled={!canSave} className={`${primary} ml-auto`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Change password
            </button>
          </div>
        </form>
      </Section>

      <Section title="Where you're signed in" hint="Sign out any device you don't recognise.">
        {sessions === null ? (
          <div className="h-24 animate-pulse rounded-lg bg-paper-dim" />
        ) : (
          <ul className="divide-y divide-hairline">
            {sessions.map((s) => {
              const d = deviceName(s.user_agent);
              const Icon = d.mobile ? Smartphone : Monitor;
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-slate" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">
                      {d.name}
                      {s.current && <span className="ml-2 rounded-md bg-paper-dim px-1.5 py-0.5 text-[11px] font-semibold">This device</span>}
                    </p>
                    <p className="text-[12px] text-slate">Signed in {new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  {!s.current && (
                    <button
                      type="button"
                      onClick={async () => (await signOutDevice(s.id), loadSessions())}
                      className="h-9 rounded-lg border border-hairline px-3 text-[13px] font-medium hover:border-ink cursor-pointer"
                    >
                      Sign out
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {others > 0 && (
          <button
            type="button"
            onClick={async () => (await signOutOtherDevices(), loadSessions())}
            className="mt-3 flex items-center gap-2 text-[13px] font-semibold hover:underline cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign out of all other devices ({others})
          </button>
        )}
      </Section>
    </>
  );
}

// ---------- Appearance ----------
// Same four choices as the last onboarding step, so what people picked there shows up (and can change) here.

function AppearanceSection() {
  const [a, setA] = useState<Appearance>(readAppearance);
  const [draft, setDraft] = useState(a.custom);
  const [sync, setSync] = useState(syncEnabled);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const custom = readable(draft);

  // Save to the account shortly after the last change, so it follows the member to other devices.
  useEffect(() => {
    if (!sync) return;
    const t = setTimeout(() => {
      setSaved("saving");
      saveAppearancePreference(a)
        .then(() => setSaved("saved"))
        .catch(() => setSaved("error"));
    }, 600);
    return () => clearTimeout(t);
  }, [a, sync]);

  function update(patch: Partial<Appearance>) {
    const next = { ...a, ...patch };
    setA(next);
    applyAppearance(next);
  }

  function chooseTone(id: ToneId) {
    const tone = TONES.find((t) => t.id === id)!;
    // A tone belongs to a theme (as in onboarding); picking one switches to it.
    update({ tone: id, theme: tone.theme });
  }

  function pickCustom(hex: string) {
    setDraft(hex);
    if (/^#[0-9a-f]{6}$/i.test(hex)) update({ accent: "custom", custom: readable(hex).color });
  }

  const themes: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Match device", icon: Monitor },
  ];
  const ring = (on: boolean) => (on ? "border-ink ring-1 ring-ink" : "border-hairline hover:border-ink/40");

  return (
    <>
      <Section title="Preview" hint="Changes apply instantly across your workspace and the pages you view, on this device.">
        <ProofCardPreview />
      </Section>

      <Section title="Theme">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {themes.map(({ id, label: l, icon: Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={a.theme === id} onClick={() => update({ theme: id })} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium transition-colors cursor-pointer ${ring(a.theme === id)}`}>
              <Icon className="h-4 w-4" /> {l}
              {a.theme === id && <Check className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background tone" hint="Eye-comfort surfaces. Dark tones switch you to dark mode; Warm Sand to light.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Background tone">
          {TONES.map((t) => {
            const on = a.tone === t.id || (t.id === "neutral" && a.tone === "paper");
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => chooseTone(t.id)} className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${ring(on)}`}>
                <span aria-hidden="true" className="block rounded-lg border p-2" style={{ background: t.page, borderColor: t.line }}>
                  <span className="block rounded-md border p-2" style={{ background: t.card, borderColor: t.line }}>
                    <span className="block h-1.5 w-3/4 rounded-sm" style={{ background: t.theme === "dark" ? "#e5e7eb" : "#111111" }} />
                    <span className="mt-1.5 block h-1 w-1/2 rounded-sm" style={{ background: t.line }} />
                  </span>
                </span>
                <span className="mt-2 flex items-center gap-1.5 px-0.5 text-[14px] font-medium">
                  {t.theme === "dark" ? <Moon className="h-3.5 w-3.5 text-slate" /> : <Sun className="h-3.5 w-3.5 text-slate" />}
                  {t.label}
                  {on && <Check className="ml-auto h-4 w-4" />}
                </span>
                <span className="block px-0.5 text-[12px] text-slate">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent color" hint="Text, buttons and highlights. Every option stays readable — bright colors are deepened for contrast.">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={a.accent === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => update({ accent: c.id })}
              className={`flex aspect-square items-center justify-center rounded-lg border-2 ring-1 ring-inset ring-hairline transition-transform hover:scale-105 cursor-pointer ${a.accent === c.id ? "border-ink" : "border-transparent"}`}
              style={{ background: c.ink }}
            >
              {a.accent === c.id && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-slate">{a.accent === "custom" ? "Custom color" : ACCENTS.find((c) => c.id === a.accent)?.label}</p>

        <div className={`mt-4 flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors ${ring(a.accent === "custom")}`}>
          <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-hairline" style={{ background: custom.color }}>
            <span className="sr-only">Pick a custom accent color</span>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft) ? draft : "#2563eb"} onChange={(e) => pickCustom(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">Custom</p>
            <p className="text-[12px] text-slate">
              {custom.adjusted
                ? `Deepened to ${custom.color} so text stays readable (${custom.ratio.toFixed(1)}:1).`
                : `Contrast ${custom.ratio.toFixed(1)}:1 — readable (needs ${MIN_CONTRAST}:1).`}
            </p>
          </div>
          <input
            aria-label="Custom color hex"
            value={draft}
            maxLength={7}
            onChange={(e) => pickCustom(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
            className="h-10 w-28 rounded-lg border border-hairline bg-paper px-3 font-mono text-[13px] uppercase outline-none focus:border-ink"
          />
        </div>
      </Section>

      <Section title="Card style" hint="The material of cards across your workspace and public pages.">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Card style">
          {GLASS.map((g) => (
            <button key={g.id} type="button" role="radio" aria-checked={a.glass === g.id} onClick={() => update({ glass: g.id })} className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${ring(a.glass === g.id)}`}>
              <span aria-hidden="true" className="relative block h-16 overflow-hidden rounded-lg bg-paper-dim">
                <span className="absolute -right-3 -top-4 h-14 w-14 rounded-full bg-ink/40 blur-md" />
                <span className="absolute -bottom-4 left-2 h-10 w-10 rounded-full bg-ink/25 blur-md" />
                <span
                  className="absolute inset-x-3 inset-y-3 rounded-md border border-hairline"
                  style={
                    g.id === "clean"
                      ? { background: "var(--color-paper)" }
                      : g.id === "frosted"
                        ? { background: "color-mix(in oklab, var(--color-paper) 72%, transparent)", backdropFilter: "blur(8px)" }
                        : { background: "color-mix(in oklab, var(--color-paper) 55%, transparent)", backdropFilter: "blur(14px) saturate(150%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)" }
                  }
                />
              </span>
              <span className="mt-2 flex items-center gap-2 text-[14px] font-medium">
                {g.label}
                {a.glass === g.id && <Check className="ml-auto h-4 w-4" />}
              </span>
              <span className="block text-[12px] text-slate">{g.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Accessibility" hint="Make the app easier to read and calmer to use. Applies on every page.">
        <span className={label}>Text size</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Text size">
          {TEXT_SIZES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={a.text === t.id}
              onClick={() => update({ text: t.id })}
              className={`flex h-16 flex-col items-center justify-center rounded-xl border transition-colors cursor-pointer ${ring(a.text === t.id)}`}
            >
              <span className="font-semibold leading-none" style={{ fontSize: 16 * t.scale }}>
                Aa
              </span>
              <span className="mt-1 text-[12px] text-slate">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 divide-y divide-hairline">
          <Toggle
            on={a.motion === "reduce"}
            onChange={(on) => update({ motion: on ? "reduce" : "system" })}
            title="Reduce motion"
            hint="Turns off animations and sliding transitions. Your device setting is always respected too."
          />
          <Toggle
            on={a.contrast === "more"}
            onChange={(on) => update({ contrast: on ? "more" : "default" })}
            title="Higher contrast"
            hint="Darker secondary text and stronger edges on cards and inputs."
          />
        </div>
      </Section>

      <Section title="Your devices">
        <Toggle
          on={sync}
          onChange={(on) => {
            setSyncEnabled(on);
            setSync(on);
            setSaved("idle");
          }}
          title="Use this appearance on all my devices"
          hint={
            sync
              ? saved === "saving"
                ? "Saving to your account…"
                : saved === "error"
                  ? "Couldn't save to your account — it still applies on this device."
                  : "Saved to your account. It applies wherever you sign in."
              : "Only this device. Other devices keep their own look."
          }
        />
      </Section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            const reset: Appearance = { ...DEFAULT_APPEARANCE, custom: a.custom };
            setA(reset);
            applyAppearance(reset);
          }}
          className="h-9 rounded-lg px-3 text-[13px] text-slate hover:text-ink-800 cursor-pointer"
        >
          Reset to default
        </button>
      </div>
    </>
  );
}

function Toggle({ on, onChange, title, hint }: { on: boolean; onChange: (on: boolean) => void; title: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="block text-[12px] text-slate">{hint}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
    </label>
  );
}

/** A real proof card drawn with the live tokens, on an ambient background so glass is visible. */
function ProofCardPreview() {
  return (
    <div className="pf-ambient theme-mono relative overflow-hidden rounded-xl border border-hairline bg-paper-dim p-5 sm:p-8">
      <div className="pf-surface relative mx-auto max-w-md rounded-2xl border border-hairline bg-paper p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
            <Shield className="h-3.5 w-3.5" /> Work · Completed
          </span>
          <span className="rounded-md border border-hairline px-2 py-0.5 text-[11px] text-slate">2 proofs</span>
        </div>
        <p className="text-[17px] font-semibold leading-snug">Stock tracking sheet for a community pharmacy</p>
        <p className="mt-1 text-[13px] text-slate">Cut expired stock losses by tracking batches weekly.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Inventory", "Excel", "Audit"].map((s) => (
            <span key={s} className="rounded-md border border-hairline bg-paper-dim px-2 py-0.5 text-[12px]">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <span className="flex h-9 items-center rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper">View case</span>
          <span className="flex h-9 items-center rounded-lg border border-hairline px-4 text-[13px] font-semibold">Share</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Privacy ----------

function PrivacySection({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const save = async (p: Parameters<typeof updateProfile>[0]) => {
    setError(null);
    try {
      onProfile(await updateProfile(p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };
  const vis: { id: Visibility; label: string; hint: string; icon: LucideIcon }[] = [
    { id: "public", label: "Public", hint: "Anyone can open it, and it appears in Discover", icon: Globe },
    { id: "unlisted", label: "Link only", hint: "Only people you share the link with", icon: Link2 },
    { id: "private", label: "Private", hint: "Visitors see “not found”", icon: Lock },
  ];
  const indexing = profile.allow_indexing ?? true;

  return (
    <>
      <Section title="Who can see your profile" hint="Each item also has its own visibility. New items always start private.">
        <div className="space-y-2" role="radiogroup" aria-label="Profile visibility">
          {vis.map(({ id, label: l, hint, icon: Icon }) => {
            const on = profile.visibility === id || (id === "private" && profile.visibility === "draft");
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => save({ visibility: id })}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer ${on ? "border-ink" : "border-hairline hover:border-ink/40"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{l}</span>
                  <span className="block text-[12px] text-slate">{hint}</span>
                </span>
                {on && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Search engines">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-[14px] font-medium">Let Google and others show my profile</span>
            <span className="block text-[12px] text-slate">When off, your public pages ask search engines not to list them. People with your link can still open them.</span>
          </span>
          <input type="checkbox" checked={indexing} onChange={(e) => save({ allow_indexing: e.target.checked })} className="peer sr-only" />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
        </label>
        {error && <p className="mt-3 text-[13px] text-berry">{error}</p>}
      </Section>

      <ChatPrivacy />
    </>
  );
}

/** Whether people you chat with see your phone number in a chat's Contact info. Off unless turned on. */
function ChatPrivacy() {
  const [showPhone, setShowPhone] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchPrivacyPreference()
      .then((p) => setShowPhone(p.show_phone_in_chat))
      .catch(() => setShowPhone(false));
  }, []);
  const toggle = async (on: boolean) => {
    setError(null);
    setShowPhone(on);
    try {
      await savePrivacyPreference({ show_phone_in_chat: on });
    } catch (err) {
      setShowPhone(!on);
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };
  return (
    <Section title="Chat">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-[14px] font-medium">Show my phone number in chat</span>
          <span className="block text-[12px] text-slate">
            People you message see it in the chat&apos;s Contact info. Off by default: it&apos;s the number you sign in with.
          </span>
        </span>
        <input
          type="checkbox"
          checked={!!showPhone}
          disabled={showPhone === null}
          onChange={(e) => toggle(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
      </label>
      {error && <p className="mt-3 text-[13px] text-berry">{error}</p>}
    </Section>
  );
}

// ---------- Your data ----------

function DataSection({ username }: { username: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password, confirm);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Download your data" hint="Your profile, every item and its history, roles, pages you manage, follows and file list — in one JSON file.">
        <a href={exportDataUrl()} download={`proofolio-${username}.json`} className={`${primary} w-fit`}>
          <Download className="h-4 w-4" /> Download my data
        </a>
      </Section>

      <section className="rounded-2xl border border-berry/40 bg-paper p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-berry">
          <Trash2 className="h-4 w-4" /> Delete account
        </h2>
        <p className="mt-1 text-[13px] text-slate">
          Permanently removes your profile, every item, your files and your roles. This can&apos;t be undone — download your data first if you want a copy.
        </p>
        <form onSubmit={remove} className="mt-5 space-y-4">
          <div>
            <label htmlFor="del-pw" className={label}>
              Password
            </label>
            <PasswordInput id="del-pw" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="del-confirm" className={label}>
              Type <span className="font-mono">DELETE</span> to confirm
            </label>
            <input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className={field} />
          </div>
          {error && <p className="text-[13px] text-berry">{error}</p>}
          <button
            type="submit"
            disabled={!password || confirm !== "DELETE" || busy}
            className="flex h-10 items-center gap-2 rounded-lg bg-berry px-5 text-[14px] font-semibold text-white disabled:opacity-40 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete my account
          </button>
        </form>
      </section>
    </>
  );
}
