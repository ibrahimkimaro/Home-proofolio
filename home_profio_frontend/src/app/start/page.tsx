"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  registerUser,
  checkUsernameAvailability,
  fetchOnboarding,
  type OnboardingContent,
  type OnboardingQuestion,
  type OnboardingStepKey,
} from "@/lib/api";
import {
  ROLE_OPTIONS,
  ROLE_CATEGORIES,
  RoleCategory,
  RoleOption,
  CategoryMeta,
  slugifyName,
} from "@/lib/onboarding";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import {
  ArrowLeft,
  Search,
  Sparkles,
  ShieldCheck,
  Layers,
  Palette,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Eye,
  EyeOff,
  Headset,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { readAppearance } from "@/lib/appearance";
import { saveOnboardingData, stashOnboarding } from "@/lib/onboarding-pending";
import { SupportAssistant } from "@/components/landing/SupportAssistant";
import { missingDisciplineMessage, openSupport } from "@/lib/support-ui";
import { resumePending } from "@/lib/pending";

/** Short progress labels per step. Which steps run, and their headings, come from Admin > Onboarding. */
const STEP_LABELS: Record<OnboardingStepKey, string> = {
  discipline: "Discipline",
  work: "First piece of work",
  evidence: "The evidence & proof",
  questions: "A few questions",
  appearance: "Theme & card style",
  account: "Keep what you built",
};

/** Built-in content, used only if the onboarding API can't be reached — sign-up must never break. */
const FALLBACK: { categories: CategoryMeta[]; roles: RoleOption[] } = {
  categories: ROLE_CATEGORIES.filter((c) => c.key !== "all"),
  roles: ROLE_OPTIONS,
};

type Copy = { title: string; subtitle: string } | undefined;

export type GlassStyle = "clean" | "frosted" | "liquid";
export type AccentTone = "brass" | "emerald" | "berry" | "sky";
export type PaletteTone = "slate" | "olbongo" | "espresso" | "midnight" | "paper" | "warm-paper";

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [content, setContent] = useState<OnboardingContent | null>(null);
  const [contentFailed, setContentFailed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    fetchOnboarding().then(setContent).catch(() => setContentFailed(true));
  }, []);

  const categories: CategoryMeta[] = content
    ? content.categories.map((c) => ({ key: c.key, label: c.label }))
    : FALLBACK.categories;
  const roles: RoleOption[] = content
    ? content.roles.map((r) => ({
      key: r.key,
      label: r.label,
      category: r.category_key,
      workType: r.template,
      template: r.template,
      exampleTitle: r.example_title,
      exampleSkills: r.example_skills,
      evidenceHint: r.evidence_hint,
    }))
    : FALLBACK.roles;
  const steps = content?.steps;
  const questions = content?.questions ?? [];
  const on = (k: OnboardingStepKey) => steps?.[k]?.enabled !== false;
  // Discipline and account always run; the rest follow the admin's switches.
  const flow: OnboardingStepKey[] = [
    "discipline",
    ...(on("work") ? (["work"] as const) : []),
    ...(on("evidence") ? (["evidence"] as const) : []),
    ...(questions.length > 0 && on("questions") ? (["questions"] as const) : []),
    ...(on("appearance") ? (["appearance"] as const) : []),
    "account",
  ];
  const current = flow[Math.min(step, flow.length - 1)];
  const next = () => setStep((s) => Math.min(s + 1, flow.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const copy = (k: OnboardingStepKey): Copy => (steps?.[k] ? { title: steps[k].title, subtitle: steps[k].subtitle } : undefined);
  const getRole = (key: string) => roles.find((r) => r.key === key) ?? roles[roles.length - 1];

  const [roleKey, setRoleKey] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  // Appearance & Card Customization State
  const [glassStyle, setGlassStyle] = useState<GlassStyle>("liquid");
  const [accentTone, setAccentTone] = useState<AccentTone>("brass");
  const [palette, setPalette] = useState<PaletteTone>("slate");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameCustomized, setUsernameCustomized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Real-time username verification states
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const role = roleKey ? getRole(roleKey) : null;

  function chooseRole(key: string) {
    const r = getRole(key);
    setRoleKey(key);
    // Smart defaults: the next step arrives already filled in, never empty.
    setTitle(r.exampleTitle);
    setSkills(r.exampleSkills);
    next();
  }

  function handleDisplayNameChange(name: string) {
    setDisplayName(name);
    if (!usernameCustomized) {
      const derived = slugifyName(name);
      setUsername(derived);
    }
  }

  async function performUsernameCheck(candidate: string) {
    const clean = candidate.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean || clean.length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus("checking");
    try {
      const res = await checkUsernameAvailability(clean);
      if (res.available) {
        setUsernameStatus("available");
        setUsernameMessage(res.message);
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus(res.suggestions.length > 0 ? "taken" : "invalid");
        setUsernameMessage(res.message);
        setUsernameSuggestions(res.suggestions);
      }
    } catch {
      setUsernameStatus("idle");
    }
  }

  // Live debounced check whenever username changes. Too-short handles show as idle (see usernameShort).
  const usernameClean = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const usernameShort = usernameClean.length < 3;
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) return;

    const timer = setTimeout(() => {
      performUsernameCheck(clean);
    }, 380);

    return () => clearTimeout(timer);
  }, [username]);

  function handleSelectSuggestion(sug: string) {
    setUsername(sug);
    setUsernameCustomized(true);
    performUsernameCheck(sug);
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setSaving(true);

    try {
      // Create the account with full name, chosen handle, and phone number.
      let finalUsername = username.trim() || slugifyName(displayName);
      try {
        await registerUser({
          email,
          password,
          username: finalUsername,
          display_name: displayName,
          fullname: displayName,
          phone_number: phoneNumber.trim() || undefined,
        });
      } catch (err) {
        if (err instanceof ApiError && err.message.toLowerCase().includes("username")) {
          finalUsername = `${finalUsername}-${Math.random().toString(36).slice(2, 6)}`;
          await registerUser({
            email,
            password,
            username: finalUsername,
            display_name: displayName,
            fullname: displayName,
            phone_number: phoneNumber.trim() || undefined,
          });
        } else {
          throw err;
        }
      }

      // Registration already sent the activation code; the dashboard banner asks for it.

      // The account exists now: save everything they chose to it. The discipline becomes their headline, the first
      // work item carries their skills and evidence (private until they publish it, BR-01), and the look they picked
      // follows them to every device. Each part is retried; anything still failing is kept and saved when the app
      // opens, so signing up never ends on an error and nothing they chose is lost.
      const LEGACY: Record<string, string> = {
        developer: "developer", designer: "designer", research: "research", business: "business",
        learner: "young_learner", athlete: "sports",
      };
      const left = await saveOnboardingData({
        answers: { discipline: content ? role.key : null, answers },
        work: flow.includes("work")
          ? {
              title,
              work_type: "work",
              template: role.template ?? LEGACY[role.workType] ?? "other",
              status: "completed",
              visibility: "private",
              skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
              custom_attributes: { glass_style: glassStyle, accent_tone: accentTone, palette: palette },
              evidence_links: evidenceUrl.trim() ? [{ label: "Evidence", url: evidenceUrl.trim() }] : [],
            }
          : undefined,
        appearance: readAppearance(),
      });
      if (left) stashOnboarding(left);

      router.push((await resumePending()) ?? "/welcome?new=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-paper-dim">
      <header className="px-5 py-4 border-b border-hairline/60 bg-paper/70 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-hairline/80 bg-paper px-3 py-1.5 text-[12px] font-medium text-slate transition-all hover:bg-paper-dim hover:text-ink-700 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-brass-dark transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Back to landing page</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/home-profolio-logo.jpeg"
              alt="Home Proofolio"
              width={26}
              height={26}
              className="rounded-full object-cover"
            />
            <span className="font-display text-[15px] text-ink-700">Home Proofolio</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 sm:px-5 pb-20 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl min-w-0"
        >
          {/* Progress deliberately starts above zero — see ProgressBar. */}
          <ProgressBar value={Math.round(((step + 1) / flow.length) * 100)} label={STEP_LABELS[current]} />

          <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border border-hairline/80 bg-paper/85 backdrop-blur-2xl p-5 sm:p-8 shadow-xl transition-all">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                {content?.registration && !content.registration.open ? (
                  <RegistrationClosed message={content.registration.closed_message} />
                ) : (
                  <>
                    {current === "discipline" && (
                      <StepRole onChoose={chooseRole} categories={categories} roles={roles} copy={copy("discipline")} loading={!content && !contentFailed} />
                    )}

                    {current === "work" && role && (
                      <StepWork
                        copy={copy("work")}
                        title={title}
                        skills={skills}
                        setTitle={setTitle}
                        setSkills={setSkills}
                        onBack={back}
                        onNext={next}
                      />
                    )}

                    {current === "evidence" && role && (
                      <StepEvidence
                        copy={copy("evidence")}
                        hint={role.evidenceHint}
                        value={evidenceUrl}
                        setValue={setEvidenceUrl}
                        onBack={back}
                        onNext={next}
                      />
                    )}

                    {current === "questions" && role && (
                      <StepQuestions
                        copy={copy("questions")}
                        questions={questions}
                        answers={answers}
                        setAnswers={setAnswers}
                        onBack={back}
                        onNext={next}
                      />
                    )}

                    {current === "appearance" && role && (
                      <StepCustomization
                        copy={copy("appearance")}
                        title={title}
                        skills={skills}
                        roleLabel={role.label}
                        glassStyle={glassStyle}
                        setGlassStyle={setGlassStyle}
                        accentTone={accentTone}
                        setAccentTone={setAccentTone}
                        palette={palette}
                        setPalette={setPalette}
                        onBack={back}
                        onNext={next}
                      />
                    )}

                    {current === "account" && role && (
                      <StepKeep
                        copy={copy("account")}
                        showEntry={flow.includes("work")}
                        phoneEnabled={steps?.account?.phone_enabled !== false}
                        title={title}
                        skills={skills}
                        evidenceUrl={evidenceUrl}
                        glassStyle={glassStyle}
                        accentTone={accentTone}
                        displayName={displayName}
                        username={username}
                        phoneNumber={phoneNumber}
                        email={email}
                        password={password}
                        usernameStatus={usernameShort ? "idle" : usernameStatus}
                        usernameMessage={usernameShort ? "" : usernameMessage}
                        usernameSuggestions={usernameShort ? [] : usernameSuggestions}
                        setDisplayName={handleDisplayNameChange}
                        setUsername={setUsername}
                        setUsernameCustomized={setUsernameCustomized}
                        setPhoneNumber={setPhoneNumber}
                        setEmail={setEmail}
                        setPassword={setPassword}
                        onCheckUsername={performUsernameCheck}
                        onSelectSuggestion={handleSelectSuggestion}
                        error={error}
                        saving={saving}
                        onBack={back}
                        onSubmit={handleFinish}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-6 text-center text-[13px] text-slate">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink-700">
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
      {/* Live chat with support, available while signing up (guests can chat too). */}
      <SupportAssistant />
    </div>
  );
}

function StepRole({
  onChoose,
  categories,
  roles,
  copy,
  loading,
}: {
  onChoose: (key: string) => void;
  categories: CategoryMeta[];
  roles: RoleOption[];
  copy: Copy;
  loading: boolean;
}) {
  const [selectedCat, setSelectedCat] = useState<RoleCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const ROLE_CATEGORIES: CategoryMeta[] = [{ key: "all", label: "All Disciplines" }, ...categories];
  const ROLE_OPTIONS = roles;

  const filteredRoles = ROLE_OPTIONS.filter((r) => {
    const matchesCat = selectedCat === "all" || r.category === selectedCat;
    const matchesQuery =
      searchQuery.trim() === "" ||
      r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.exampleSkills.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl sm:text-2xl text-ink-700">{copy?.title || "What kind of work do you do?"}</h1>
        <p className="mt-1 text-[13px] sm:text-[14px] text-slate">
          {copy?.subtitle || "Pick your primary discipline. You can add more roles later — this customizes your first proof."}
        </p>
        {loading && <p className="mt-2 text-[12px] text-slate">Loading disciplines…</p>}
      </div>

      {/* Search Input & Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disciplines or skills (e.g. Developer, Accountant, Doctor, Farmer, AI...)"
            className="h-10 w-full rounded-xl border border-hairline/80 bg-paper-dim/40 pl-8 pr-3 text-base sm:text-sm text-ink-700 placeholder:text-slate/50 outline-none transition-all focus:border-brass focus:bg-paper focus:ring-1 focus:ring-brass/20"
          />
        </div>

        {/* Compact Category Scroll/Wrap */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
          {ROLE_CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCat(cat.key)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${isActive
                  ? "bg-ink text-paper shadow-2xs"
                  : "border border-hairline bg-paper text-slate hover:text-ink-700 hover:border-slate/40"
                  }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roles Grid: Compact, beautifully organized chips */}
      <div className="max-h-[380px] overflow-y-auto pr-1 space-y-4 scrollbar-none">
        {selectedCat === "all" && searchQuery === "" ? (
          // Grouped by Category for pristine organization
          ROLE_CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
            const rolesInCat = ROLE_OPTIONS.filter((r) => r.category === cat.key);
            if (rolesInCat.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center gap-1.5 border-b border-hairline/50 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brass-dark">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-slate font-mono">({rolesInCat.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rolesInCat.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => onChoose(r.key)}
                      className="group flex items-center gap-1.5 rounded-xl border border-hairline/80 bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-700 shadow-2xs transition-all hover:border-brass hover:bg-paper-dim hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate/40 group-hover:bg-brass transition-colors" />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Filtered list
          <div className="flex flex-wrap gap-1.5">
            {filteredRoles.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onChoose(r.key)}
                className="group flex items-center gap-1.5 rounded-xl border border-hairline/80 bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-700 shadow-2xs transition-all hover:border-brass hover:bg-paper-dim hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate/40 group-hover:bg-brass transition-colors" />
                <span>{r.label}</span>
              </button>
            ))}
            {filteredRoles.length === 0 && (
              <p className="py-6 text-center text-xs text-slate w-full">
                No matching role found. Try another term, choose &ldquo;General / Multidisciplinary&rdquo;, or ask support to add yours below.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Not in the list? Chat with support live and ask for it to be added. */}
      <div className="flex flex-col gap-2 rounded-xl border border-brass/30 bg-brass/10 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-ink-700">
          <span className="font-semibold">Can&apos;t find your kind of work?</span> Tell support and chat live. We&apos;ll add it.
        </p>
        <button
          type="button"
          onClick={() => openSupport(missingDisciplineMessage(searchQuery))}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          <Headset className="h-3.5 w-3.5 text-brass" />
          Ask support to add it
        </button>
      </div>
    </div>
  );
}

function StepWork({
  copy,
  title,
  skills,
  setTitle,
  setSkills,
  onBack,
  onNext,
}: {
  copy: Copy;
  title: string;
  skills: string;
  setTitle: (v: string) => void;
  setSkills: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink-700">{copy?.title || "Here's your first entry."}</h2>
      <p className="mt-2 text-[15px] text-slate">
        {copy?.subtitle || "We started it for you. Change it to something you've actually done."}
      </p>

      <label className="mt-6 flex flex-col gap-1.5 text-sm font-medium text-ink-700">
        What you did
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input min-h-20 resize-y py-2.5"
        />
      </label>

      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-ink-700">
        Skills it used
        <input value={skills} onChange={(e) => setSkills(e.target.value)} className="input" />
      </label>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Next" nextDisabled={!title.trim()} />
    </div>
  );
}

function StepEvidence({
  copy,
  hint,
  value,
  setValue,
  onBack,
  onNext,
}: {
  copy: Copy;
  hint: string;
  value: string;
  setValue: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink-700">{copy?.title || "Where's the proof?"}</h2>
      <p className="mt-2 text-[15px] text-slate">
        {hint}. You can skip this and add it later — the entry still counts.
      </p>

      <label className="mt-6 flex flex-col gap-1.5 text-sm font-medium text-ink-700">
        Link to your evidence
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          placeholder="https://…"
        />
      </label>

      <StepNav onBack={onBack} onNext={onNext} nextLabel={value.trim() ? "Next" : "Skip for now"} />
    </div>
  );
}

interface PaletteChoice {
  id: PaletteTone;
  name: string;
  theme: "dark" | "light";
  color: string;
  dotBorder?: string;
  desc: string;
}

const ONBOARDING_PALETTES: PaletteChoice[] = [
  { id: "slate", name: "Soft Slate", theme: "dark", color: "#121316", dotBorder: "#292a30", desc: "Eye-comfort dark" },
  { id: "olbongo", name: "Olbongo Dark", theme: "dark", color: "#0a0f0d", dotBorder: "#1c2720", desc: "Emerald charcoal" },
  { id: "espresso", name: "Warm Espresso", theme: "dark", color: "#161311", dotBorder: "#2f2723", desc: "Cozy warm dark" },
  { id: "midnight", name: "Midnight Navy", theme: "dark", color: "#0c1017", dotBorder: "#212938", desc: "Deep night blue" },
  { id: "paper", name: "Clean Paper", theme: "light", color: "#fbfbfd", dotBorder: "#d2d2d7", desc: "Crisp Apple light" },
  { id: "warm-paper", name: "Warm Sand", theme: "light", color: "#f7f4ee", dotBorder: "#d9d3c5", desc: "Soft reading light" },
];

const GLASS_STYLES = [
  {
    id: "clean" as const,
    label: "Clean Solid",
    desc: "Apple matte with hairline edge",
    badge: "Minimalist",
  },
  {
    id: "frosted" as const,
    label: "Frosted Glass",
    desc: "Translucent 16px soft blur",
    badge: "Modern",
  },
  {
    id: "liquid" as const,
    label: "Liquid Glass",
    desc: "Apple HIG 28px blur & specular rim",
    badge: "Recommended",
  },
];

const ACCENT_TONES = [
  { id: "brass" as const, label: "Signature Gold", bgClass: "bg-brass" },
  { id: "emerald" as const, label: "Emerald Trust", bgClass: "bg-emerald-500" },
  { id: "berry" as const, label: "Electric Berry", bgClass: "bg-berry" },
  { id: "sky" as const, label: "Apple Sky", bgClass: "bg-sky-500" },
];

function StepCustomization({
  copy,
  title,
  skills,
  roleLabel,
  glassStyle,
  setGlassStyle,
  accentTone,
  setAccentTone,
  palette,
  setPalette,
  onBack,
  onNext,
}: {
  copy: Copy;
  title: string;
  skills: string;
  roleLabel: string;
  glassStyle: GlassStyle;
  setGlassStyle: (v: GlassStyle) => void;
  accentTone: AccentTone;
  setAccentTone: (v: AccentTone) => void;
  palette: PaletteTone;
  setPalette: (v: PaletteTone) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
  const displaySkills = skillList.length > 0 ? skillList : ["Verifiable Evidence", "Primary Proof"];

  function handleSelectPalette(p: PaletteChoice) {
    setPalette(p.id);
    document.documentElement.setAttribute("data-theme", p.theme);
    document.documentElement.setAttribute("data-palette", p.id);
    document.documentElement.classList.toggle("dark", p.theme === "dark");
    try {
      localStorage.setItem("proofolio-theme", p.theme);
      localStorage.setItem("proofolio-palette", p.id);
    } catch { }
  }

  function handleSelectGlass(style: GlassStyle) {
    setGlassStyle(style);
    try {
      localStorage.setItem("proofolio-glass-style", style);
    } catch { }
  }

  function handleSelectAccent(tone: AccentTone) {
    setAccentTone(tone);
    try {
      localStorage.setItem("proofolio-accent", tone);
    } catch { }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink-700">{copy?.title || "Personalize your appearance"}</h2>
        <p className="mt-1 text-[14px] text-slate">
          Choose your eye-comfort background tone, card glass material, and signature accent color.
        </p>
      </div>

      {/* Reassurance Callout Banner */}
      <div className="rounded-2xl border border-hairline/80 bg-paper-dim/60 p-3.5 sm:p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-brass-dark shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 text-[12px] sm:text-[13px] text-slate leading-relaxed">
          <span className="font-semibold text-ink-700 block mb-0.5">
            You can change this anytime later in your Settings
          </span>
          All your appearance settings, card glass materials, and theme palettes remain fully adjustable in your profile at any time.
        </div>
      </div>

      {/* Live Interactive Card Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
            Live Proof Card Preview
          </span>
          <span className="text-[10px] text-brass-dark font-mono font-medium">Real-Time</span>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl transition-all duration-300 ${glassStyle === "liquid"
            ? "apple-glass-liquid"
            : glassStyle === "frosted"
              ? "apple-glass-frosted"
              : "apple-glass-clean"
            }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline/60 pb-2.5 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${accentTone === "brass"
                ? "text-brass-dark"
                : accentTone === "emerald"
                  ? "text-emerald-600"
                  : accentTone === "berry"
                    ? "text-berry"
                    : "text-sky-600"
                }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleLabel}
            </span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold">
              Verified Evidence
            </span>
          </div>

          <h3 className="font-display text-base sm:text-lg text-ink-700 leading-snug break-words">
            {title || "Untitled Project"}
          </h3>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {displaySkills.map((s) => (
              <span
                key={s}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${accentTone === "brass"
                  ? "border border-brass/40 bg-brass/10 text-brass-dark"
                  : accentTone === "emerald"
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                    : accentTone === "berry"
                      ? "border border-berry/40 bg-berry/10 text-berry"
                      : "border border-sky-500/40 bg-sky-500/10 text-sky-700"
                  }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Control 1: Background Palette (Eye Comfort) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Background Tone & Eye Comfort
          </label>
          <span className="text-[10px] text-slate/70">Tap to preview live</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ONBOARDING_PALETTES.map((p) => {
            const isSelected = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPalette(p)}
                className={`flex items-center gap-2 rounded-xl p-2 text-left border transition-all cursor-pointer ${isSelected
                  ? "border-brass bg-paper ring-1 ring-brass/40 shadow-xs"
                  : "border-hairline bg-paper-dim/40 hover:bg-paper hover:border-slate/40"
                  }`}
              >
                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: p.color,
                    border: `1.5px solid ${p.dotBorder || "#888"}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-ink-700 truncate leading-tight">
                    {p.name}
                  </span>
                  <span className="block text-[9px] text-slate leading-none truncate">
                    {p.desc}
                  </span>
                </div>
                {isSelected && <Check className="h-3 w-3 text-brass-dark shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 2: Apple Glass Material */}
      <div className="space-y-2">
        <label className="text-[12px] font-bold uppercase tracking-wider text-slate flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Card Glass Material (Apple HIG)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {GLASS_STYLES.map((g) => {
            const isSelected = glassStyle === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectGlass(g.id)}
                className={`flex flex-col justify-between rounded-xl p-2.5 sm:p-3 text-left border transition-all cursor-pointer ${isSelected
                  ? "border-brass bg-paper ring-1 ring-brass/40 shadow-xs"
                  : "border-hairline bg-paper-dim/40 hover:bg-paper hover:border-slate/40"
                  }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[12px] font-semibold text-ink-700">{g.label}</span>
                  <span className="rounded-full bg-brass/15 px-1.5 py-0.2 text-[9px] font-medium text-brass-dark">
                    {g.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate leading-tight">{g.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 3: Accent Tone */}
      <div className="space-y-2">
        <label className="text-[12px] font-bold uppercase tracking-wider text-slate">
          Signature Accent Tone
        </label>

        <div className="flex flex-wrap gap-2">
          {ACCENT_TONES.map((a) => {
            const isSelected = accentTone === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => handleSelectAccent(a.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 border transition-all cursor-pointer ${isSelected
                  ? "border-ink-700 bg-paper shadow-2xs font-semibold"
                  : "border-hairline bg-paper-dim/40 text-slate hover:text-ink-700 hover:border-slate/40"
                  }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${a.bgClass}`} />
                <span className="text-[11px] text-ink-700">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue to save" />
    </div>
  );
}

function StepKeep({
  copy,
  showEntry,
  phoneEnabled,
  title,
  skills,
  evidenceUrl,
  glassStyle,
  accentTone,
  displayName,
  username,
  phoneNumber,
  email,
  password,
  usernameStatus,
  usernameMessage,
  usernameSuggestions,
  setDisplayName,
  setUsername,
  setUsernameCustomized,
  setPhoneNumber,
  setEmail,
  setPassword,
  onCheckUsername,
  onSelectSuggestion,
  error,
  saving,
  onBack,
  onSubmit,
}: {
  copy: Copy;
  showEntry: boolean;
  phoneEnabled: boolean;
  title: string;
  skills: string;
  evidenceUrl: string;
  glassStyle: GlassStyle;
  accentTone: AccentTone;
  displayName: string;
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  usernameStatus: "idle" | "checking" | "available" | "taken" | "invalid";
  usernameMessage: string;
  usernameSuggestions: string[];
  setDisplayName: (v: string) => void;
  setUsername: (v: string) => void;
  setUsernameCustomized: (v: boolean) => void;
  setPhoneNumber: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  onCheckUsername: (u: string) => void;
  onSelectSuggestion: (s: string) => void;
  error: string | null;
  saving: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      {showEntry && (
        <div
          className={`mb-6 p-4 sm:p-5 rounded-2xl transition-all ${glassStyle === "liquid"
            ? "apple-glass-liquid"
            : glassStyle === "frosted"
              ? "apple-glass-frosted"
              : "apple-glass-clean"
            }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline/60 pb-2 mb-2.5">
            <p
              className={`text-[12px] font-semibold ${accentTone === "brass"
                ? "text-brass-dark"
                : accentTone === "emerald"
                  ? "text-emerald-600"
                  : accentTone === "berry"
                    ? "text-berry"
                    : "text-sky-600"
                }`}
            >
              You just built this
            </p>
            <span className="text-[10px] text-slate uppercase font-mono">Customized</span>
          </div>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink-700">{title}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skillList.map((s) => (
              <span
                key={s}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${accentTone === "brass"
                  ? "border border-brass/40 bg-brass/10 text-brass-dark"
                  : accentTone === "emerald"
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                    : accentTone === "berry"
                      ? "border border-berry/40 bg-berry/10 text-berry"
                      : "border border-sky-500/40 bg-sky-500/10 text-sky-700"
                  }`}
              >
                {s}
              </span>
            ))}
            {evidenceUrl.trim() && (
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
                1 piece of evidence
              </span>
            )}
          </div>
        </div>

      )}

      <h2 className="font-display text-2xl text-ink-700">
        {copy?.title || "Don't lose it — save it to your proofolio."}
      </h2>
      <p className="mt-2 text-[15px] text-slate">
        {copy?.subtitle || "Creating a verified account keeps this entry and lets you keep adding to it."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {/* Full Name */}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
          Your full name
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Amina Hassan"
          />
        </label>

        {/* Real-time Unique Username Validator */}
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
          <div className="flex items-center justify-between">
            <label htmlFor="username-input" className="text-sm font-medium text-ink-700">
              Username (unique public handle)
            </label>
            {usernameStatus === "available" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Available
              </span>
            )}
            {usernameStatus === "taken" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Already taken
              </span>
            )}
          </div>

          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate/60 text-sm">
              @
            </span>
            <input
              id="username-input"
              required
              value={username}
              onChange={(e) => {
                setUsernameCustomized(true);
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className={`input w-full pl-8 pr-28 transition-all ${usernameStatus === "available"
                ? "border-emerald-500/60 ring-1 ring-emerald-500/25"
                : usernameStatus === "taken"
                  ? "border-amber-500/60 ring-1 ring-amber-500/25"
                  : ""
                }`}
              placeholder="amina-hassan"
            />

            {/* In-field status indicator & Check button */}
            <div className="absolute right-2 flex items-center gap-1.5">
              {usernameStatus === "checking" && (
                <span title="Checking handle uniqueness…">
                  <Loader2 className="h-4 w-4 animate-spin text-brass-dark" />
                </span>
              )}
              {usernameStatus === "available" && (
                <span title="Handle available">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </span>
              )}
              {usernameStatus === "taken" && (
                <span title="Handle taken">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </span>
              )}

              <button
                type="button"
                onClick={() => onCheckUsername(username)}
                disabled={!username.trim() || usernameStatus === "checking"}
                className="rounded-lg border border-hairline/80 bg-paper/90 px-2 py-1 text-[11px] font-semibold text-slate hover:text-ink-700 hover:border-brass/50 transition-all cursor-pointer disabled:opacity-40"
              >
                Check
              </button>
            </div>
          </div>

          {/* Feedback & Suggestions */}
          {usernameStatus === "available" && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>@{username} is unique and ready to claim!</span>
            </div>
          )}

          {usernameStatus === "taken" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>@{username} is already taken. Try one of these:</span>
              </div>
              {usernameSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {usernameSuggestions.map((sug) => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => onSelectSuggestion(sug)}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-2xs"
                      title="Click to apply handle"
                    >
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>@{sug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <span className="text-[11px] text-slate font-mono">
            homeproofolio.org/@{username || "your-handle"}
          </span>
        </div>

        {/* Phone number (Admin > Onboarding can turn this off). Your activation code is texted here. */}
        {phoneEnabled && (
          <div className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            <div className="flex items-center justify-between">
              <label htmlFor="phone-input" className="text-sm font-medium text-ink-700">
                Phone number
              </label>
              <span className="text-[11px] text-slate">We text your activation code here</span>
            </div>

            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate/60">
                <Smartphone className="h-4 w-4" />
              </span>
              <input
                id="phone-input"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input w-full pl-9 text-[13px]"
                placeholder="+255 712 345 678"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </label>

        {/* Password */}
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
          <label htmlFor="register-password" className="text-sm font-medium text-ink-700">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full pr-11"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate/60 hover:text-ink-700 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry-dark">{error}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-glass px-5 py-2.5 text-slate hover:text-ink-700"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 flex-1 rounded-full bg-gradient-to-r from-brass-dark via-brass to-[#E6CC72] text-[15px] font-semibold text-ink shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 ring-1 ring-white/20 cursor-pointer"
          >
            {saving ? "Saving your proofolio…" : "Save my proofolio"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="btn-glass px-5 py-2.5 text-slate hover:text-ink-700"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="btn-glass-primary h-11 flex-1 text-[15px] font-medium text-paper transition-all disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function RegistrationClosed({ message }: { message: string }) {
  return (
    <div className="py-6 text-center">
      <h2 className="font-display text-2xl text-ink-700">Sign-ups are paused</h2>
      <p className="mt-2 text-[15px] text-slate">{message || "Please check back soon."}</p>
      <Link href="/login" className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper">
        I already have an account
      </Link>
    </div>
  );
}

/** Admin-defined questions (Admin > Onboarding). Answers feed the analytics charts. */
function StepQuestions({
  copy,
  questions,
  answers,
  setAnswers,
  onBack,
  onNext,
}: {
  copy: Copy;
  questions: OnboardingQuestion[];
  answers: Record<string, string | string[]>;
  setAnswers: (a: Record<string, string | string[]>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const set = (id: string, v: string | string[]) => setAnswers({ ...answers, [id]: v });
  const missing = questions.some((q) => {
    const v = answers[q.id];
    return q.required && (v === undefined || v === "" || (Array.isArray(v) && v.length === 0));
  });
  return (
    <div>
      <h2 className="font-display text-2xl text-ink-700">{copy?.title || "A few quick questions"}</h2>
      {copy?.subtitle && <p className="mt-2 text-[15px] text-slate">{copy.subtitle}</p>}
      <div className="mt-6 space-y-6">
        {questions.map((q) => {
          const v = answers[q.id];
          return (
            <fieldset key={q.id}>
              <legend className="text-sm font-medium text-ink-700">
                {q.prompt}
                {q.required ? <span className="text-berry"> *</span> : <span className="font-normal text-slate"> (optional)</span>}
              </legend>
              {q.help && <p className="mt-0.5 text-[13px] text-slate">{q.help}</p>}
              {q.kind === "text" ? (
                <input value={(v as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} maxLength={500} className="input mt-2 w-full" />
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const selected = q.kind === "multi" ? Array.isArray(v) && v.includes(o) : v === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          q.kind === "multi"
                            ? set(q.id, selected ? (v as string[]).filter((x) => x !== o) : [...((v as string[]) ?? []), o])
                            : set(q.id, o)
                        }
                        className={`rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${selected ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink-700 hover:border-slate/40"
                          }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          );
        })}
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextLabel="Next" nextDisabled={missing} />
    </div>
  );
}
