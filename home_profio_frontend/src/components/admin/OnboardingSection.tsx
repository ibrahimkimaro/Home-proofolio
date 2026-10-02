"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, ExternalLink, Layers, ListChecks, Lock, MessageSquareText, Plus, Save, Trash2 } from "lucide-react";
import {
  adminAddCategory,
  adminAddQuestion,
  adminAddRole,
  adminDeleteCategory,
  adminDeleteQuestion,
  adminDeleteRole,
  adminEditCategory,
  adminEditQuestion,
  adminEditRole,
  adminOnboarding,
  adminSaveSteps,
  type AdminCategory,
  type AdminOnboarding,
  type AdminQuestion,
  type AdminRole,
  type OnboardingStep,
  type OnboardingStepKey,
} from "@/lib/api";
import { Badge, ConfirmButton, Panel } from "./ui";

const STEP_ORDER: { key: OnboardingStepKey; label: string; locked?: boolean; hint: string }[] = [
  { key: "discipline", label: "1 · Discipline", locked: true, hint: "Always on — it decides which fields the first item gets." },
  { key: "work", label: "2 · First piece of work", hint: "Pre-filled from the discipline. Off = members start with an empty Home." },
  { key: "evidence", label: "3 · Evidence link", hint: "Optional proof link for the first item." },
  { key: "questions", label: "4 · Your questions", hint: "Shown only when at least one question below is active." },
  { key: "appearance", label: "5 · Appearance", hint: "Theme, background tone, accent and card style." },
  { key: "account", label: "6 · Create account", locked: true, hint: "Always on — this is where the account is created." },
];

const field = "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-[13px] text-ink-800 outline-none focus:border-brass";

export function OnboardingSection({ onError }: { onError: (msg: string) => void }) {
  const [data, setData] = useState<AdminOnboarding | null>(null);
  const load = useCallback(() => adminOnboarding().then(setData).catch((e) => onError(e.message)), [onError]);
  useEffect(() => {
    load();
  }, [load]);

  /** Run a change, then reload so counts and order stay true to the server. */
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        await load();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Change failed");
      }
    },
    [load, onError],
  );

  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-paper" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline/80 bg-paper px-5 py-4 text-[13px] text-slate">
        <span>Changes apply to the next person who opens onboarding. Nothing here edits existing members.</span>
        <a href="/start" target="_blank" className="inline-flex items-center gap-1.5 font-semibold text-brass-dark hover:underline">
          Open onboarding <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <StepsEditor steps={data.steps} onSave={(s) => run(() => adminSaveSteps(s))} />
      <QuestionsEditor questions={data.questions} run={run} />
      <DisciplinesEditor data={data} run={run} />
    </div>
  );
}

// ---------------- Steps ----------------

function StepsEditor({ steps, onSave }: { steps: AdminOnboarding["steps"]; onSave: (s: Record<OnboardingStepKey, OnboardingStep>) => Promise<void> }) {
  const initial = Object.fromEntries(
    STEP_ORDER.map((s) => [s.key, { title: "", subtitle: "", enabled: true, ...(steps[s.key] ?? {}) }]),
  ) as Record<OnboardingStepKey, OnboardingStep>;
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = (k: OnboardingStepKey, p: Partial<OnboardingStep>) => setDraft({ ...draft, [k]: { ...draft[k], ...p } });

  return (
    <Panel
      icon={ListChecks}
      title="Steps"
      subtitle="Turn optional steps on or off and edit what each one says"
      actions={
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={async () => (setSaving(true), await onSave(draft), setSaving(false))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper disabled:opacity-40 cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save steps"}
        </button>
      }
    >
      <ol className="divide-y divide-hairline/60">
        {STEP_ORDER.map((s) => {
          const d = draft[s.key];
          return (
            <li key={s.key} className={`grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[220px_1fr] ${d.enabled ? "" : "opacity-60"}`}>
              <div>
                <label className="flex items-center gap-2 text-[14px] font-semibold text-ink-800">
                  {s.locked ? (
                    <Lock className="h-4 w-4 text-slate" aria-label="Always on" />
                  ) : (
                    <input type="checkbox" checked={d.enabled} onChange={(e) => set(s.key, { enabled: e.target.checked })} className="h-4 w-4 accent-current" />
                  )}
                  {s.label}
                </label>
                <p className="mt-1 text-[12px] text-slate">{s.hint}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input aria-label={`${s.label} heading`} value={d.title} maxLength={120} onChange={(e) => set(s.key, { title: e.target.value })} placeholder="Heading" className={field} />
                <input aria-label={`${s.label} subheading`} value={d.subtitle} maxLength={300} onChange={(e) => set(s.key, { subtitle: e.target.value })} placeholder="Sub-heading" className={field} />
                {s.key === "account" && (
                  <label className="flex items-center gap-2 text-[13px] text-ink-700 sm:col-span-2">
                    <input type="checkbox" checked={d.phone_enabled !== false} onChange={(e) => set("account", { phone_enabled: e.target.checked })} className="h-4 w-4 accent-current" />
                    Ask for a phone number (with SMS code verification)
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ---------------- Questions ----------------

function QuestionsEditor({ questions, run }: { questions: AdminQuestion[]; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function move(i: number, dir: -1 | 1) {
    const a = questions[i];
    const b = questions[i + dir];
    if (!b) return;
    await run(async () => {
      await adminEditQuestion(a.id, { sort: b.sort });
      await adminEditQuestion(b.id, { sort: a.sort });
    });
  }

  return (
    <Panel
      icon={MessageSquareText}
      title="Your questions"
      subtitle="Extra questions in their own step. Answers appear in Analytics."
      actions={
        !adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[13px] font-semibold hover:border-brass cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        )
      }
    >
      {adding && (
        <QuestionForm
          onCancel={() => setAdding(false)}
          onSave={(q) => run(async () => (await adminAddQuestion(q), setAdding(false)))}
        />
      )}
      {questions.length === 0 && !adding ? (
        <p className="py-6 text-center text-[13px] text-slate">No questions yet. The questions step is skipped until you add one.</p>
      ) : (
        <ul className="divide-y divide-hairline/60">
          {questions.map((q, i) =>
            editing === q.id ? (
              <li key={q.id} className="py-3">
                <QuestionForm
                  initial={q}
                  onCancel={() => setEditing(null)}
                  onSave={(p) => run(async () => (await adminEditQuestion(q.id, p), setEditing(null)))}
                />
              </li>
            ) : (
              <li key={q.id} className={`flex flex-wrap items-center gap-3 py-3 ${q.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink-800">
                    {q.prompt} {q.required && <span className="text-berry">*</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate">
                    <Badge>{q.kind === "single" ? "One choice" : q.kind === "multi" ? "Several choices" : "Short text"}</Badge>
                    {q.options.slice(0, 4).join(" · ")}
                    {q.options.length > 4 && ` · +${q.options.length - 4}`}
                    <span>· {q.answered} answered</span>
                    {!q.active && <Badge tone="warn">Hidden</Badge>}
                  </p>
                </div>
                <RowActions
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < questions.length - 1 ? () => move(i, 1) : undefined}
                  active={q.active}
                  onToggle={() => run(() => adminEditQuestion(q.id, { active: !q.active }))}
                  onEdit={() => setEditing(q.id)}
                  onDelete={() => run(() => adminDeleteQuestion(q.id))}
                  deleteLabel={q.answered ? `Delete + ${q.answered} answers?` : "Delete?"}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}

function QuestionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: AdminQuestion;
  onSave: (q: { prompt: string; help: string | null; kind: "single" | "multi" | "text"; options: string[]; required: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [help, setHelp] = useState(initial?.help ?? "");
  const [kind, setKind] = useState<"single" | "multi" | "text">(initial?.kind ?? "single");
  const [options, setOptions] = useState((initial?.options ?? []).join("\n"));
  const [required, setRequired] = useState(initial?.required ?? false);
  const list = options.split("\n").map((o) => o.trim()).filter(Boolean);
  const valid = prompt.trim().length >= 3 && (kind === "text" || list.length >= 2);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ prompt: prompt.trim(), help: help.trim() || null, kind, options: kind === "text" ? [] : list, required });
      }}
      className="mb-4 grid gap-3 rounded-xl border border-brass/40 bg-paper-dim/60 p-4 md:grid-cols-2"
    >
      <label className="text-[12px] font-semibold text-slate md:col-span-2">
        Question
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={200} placeholder="What brings you to Home Proofolio?" className={`${field} mt-1`} required />
      </label>
      <label className="text-[12px] font-semibold text-slate">
        Help text (optional)
        <input value={help} onChange={(e) => setHelp(e.target.value)} maxLength={300} className={`${field} mt-1`} />
      </label>
      <label className="text-[12px] font-semibold text-slate">
        Answer type
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${field} mt-1`}>
          <option value="single">One choice</option>
          <option value="multi">Several choices</option>
          <option value="text">Short text</option>
        </select>
      </label>
      {kind !== "text" && (
        <label className="text-[12px] font-semibold text-slate md:col-span-2">
          Options — one per line (2 to 12)
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={4} className={`${field} mt-1 h-auto py-2`} placeholder={"Find a job\nShow my work\nGrow my business"} />
        </label>
      )}
      <label className="flex items-center gap-2 text-[13px] text-ink-700">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 accent-current" />
        Required
      </label>
      <div className="flex justify-end gap-2 md:col-span-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-[13px] text-slate cursor-pointer">
          Cancel
        </button>
        <button type="submit" disabled={!valid} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper disabled:opacity-40 cursor-pointer">
          {initial ? "Save question" : "Add question"}
        </button>
      </div>
    </form>
  );
}

// ---------------- Disciplines ----------------

function DisciplinesEditor({ data, run }: { data: AdminOnboarding; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = useState<string | null>(data.categories[0]?.key ?? null);
  const [newCat, setNewCat] = useState("");
  const keyOf = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).padEnd(3, "x");

  async function moveCat(i: number, dir: -1 | 1) {
    const a = data.categories[i];
    const b = data.categories[i + dir];
    if (b) await run(async () => (await adminEditCategory(a.key, { sort: b.sort }), await adminEditCategory(b.key, { sort: a.sort })));
  }

  return (
    <Panel icon={Layers} title="Disciplines" subtitle="What new members pick in step 1, grouped by category">
      <ul className="space-y-3">
        {data.categories.map((c, i) => {
          const roles = data.roles.filter((r) => r.category_key === c.key);
          const isOpen = open === c.key;
          return (
            <li key={c.key} className={`rounded-xl border border-hairline ${c.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpen(isOpen ? null : c.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer" aria-expanded={isOpen}>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  <InlineText value={c.label} onSave={(label) => run(() => adminEditCategory(c.key, { label }))} className="font-semibold" />
                  <span className="shrink-0 text-[12px] text-slate">{roles.length} {roles.length === 1 ? "discipline" : "disciplines"}</span>
                  {!c.active && <Badge tone="warn">Hidden</Badge>}
                </button>
                <RowActions
                  onUp={i > 0 ? () => moveCat(i, -1) : undefined}
                  onDown={i < data.categories.length - 1 ? () => moveCat(i, 1) : undefined}
                  active={c.active}
                  onToggle={() => run(() => adminEditCategory(c.key, { active: !c.active }))}
                  onDelete={() => run(() => adminDeleteCategory(c.key))}
                  deleteLabel={roles.length ? "Empty it first" : "Delete?"}
                />
              </div>
              {isOpen && <RoleList category={c} roles={roles} templates={data.templates} run={run} keyOf={keyOf} />}
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const label = newCat.trim();
          if (label) run(async () => (await adminAddCategory({ key: keyOf(label), label }), setNewCat(""), setOpen(keyOf(label))));
        }}
      >
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category, e.g. Farming & Agriculture" maxLength={80} className={field} />
        <button type="submit" disabled={!newCat.trim()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper disabled:opacity-40 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add category
        </button>
      </form>
    </Panel>
  );
}

function RoleList({
  category,
  roles,
  templates,
  run,
  keyOf,
}: {
  category: AdminCategory;
  roles: AdminRole[];
  templates: AdminOnboarding["templates"];
  run: (fn: () => Promise<unknown>) => Promise<void>;
  keyOf: (s: string) => string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [template, setTemplate] = useState(templates[0]?.key ?? "other");

  async function move(i: number, dir: -1 | 1) {
    const a = roles[i];
    const b = roles[i + dir];
    if (b) await run(async () => (await adminEditRole(a.key, { sort: b.sort }), await adminEditRole(b.key, { sort: a.sort })));
  }

  return (
    <div className="border-t border-hairline/60 px-4 pb-4">
      <ul className="divide-y divide-hairline/50">
        {roles.map((r, i) => (
          <li key={r.key} className={`py-2.5 ${r.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink-800">{r.label}</p>
                <p className="text-[12px] text-slate">
                  Template: {templates.find((t) => t.key === r.template)?.label ?? r.template} · picked by {r.picked}
                </p>
              </div>
              <RowActions
                onUp={i > 0 ? () => move(i, -1) : undefined}
                onDown={i < roles.length - 1 ? () => move(i, 1) : undefined}
                active={r.active}
                onToggle={() => run(() => adminEditRole(r.key, { active: !r.active }))}
                onEdit={() => setEditing(editing === r.key ? null : r.key)}
                onDelete={() => run(() => adminDeleteRole(r.key))}
              />
            </div>
            {editing === r.key && <RoleEditor role={r} templates={templates} onSave={(p) => run(async () => (await adminEditRole(r.key, p), setEditing(null)))} />}
          </li>
        ))}
        {roles.length === 0 && <li className="py-3 text-[13px] text-slate">No disciplines in this category yet.</li>}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const l = label.trim();
          if (!l) return;
          run(async () => {
            await adminAddRole({ key: keyOf(l), label: l, category_key: category.key, template, example_title: "", example_skills: "", evidence_hint: "" });
            setLabel("");
          });
        }}
      >
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`New discipline in ${category.label}`} maxLength={100} className={`${field} min-w-0 flex-1`} />
        <select aria-label="Work template" value={template} onChange={(e) => setTemplate(e.target.value)} className={`${field} w-auto`}>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!label.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[13px] font-semibold hover:border-brass disabled:opacity-40 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </form>
    </div>
  );
}

function RoleEditor({ role, templates, onSave }: { role: AdminRole; templates: AdminOnboarding["templates"]; onSave: (p: Partial<AdminRole>) => Promise<void> }) {
  const [d, setD] = useState({
    label: role.label,
    template: role.template,
    example_title: role.example_title,
    example_skills: role.example_skills,
    evidence_hint: role.evidence_hint,
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <form onSubmit={(e) => (e.preventDefault(), onSave(d))} className="mt-3 grid gap-2 rounded-xl bg-paper-dim/60 p-3 md:grid-cols-2">
      <label className="text-[12px] font-semibold text-slate">
        Name
        <input value={d.label} onChange={set("label")} maxLength={100} className={`${field} mt-1`} required />
      </label>
      <label className="text-[12px] font-semibold text-slate">
        Work template
        <select value={d.template} onChange={set("template")} className={`${field} mt-1`}>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[12px] font-semibold text-slate md:col-span-2">
        Example first entry (pre-filled for the member)
        <input value={d.example_title} onChange={set("example_title")} maxLength={200} className={`${field} mt-1`} />
      </label>
      <label className="text-[12px] font-semibold text-slate">
        Example skills
        <input value={d.example_skills} onChange={set("example_skills")} maxLength={200} className={`${field} mt-1`} />
      </label>
      <label className="text-[12px] font-semibold text-slate">
        Evidence hint
        <input value={d.evidence_hint} onChange={set("evidence_hint")} maxLength={200} className={`${field} mt-1`} />
      </label>
      <div className="flex justify-end md:col-span-2">
        <button type="submit" className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper cursor-pointer">
          Save discipline
        </button>
      </div>
    </form>
  );
}

// ---------------- shared ----------------

export function RowActions({
  onUp,
  onDown,
  active,
  onToggle,
  onEdit,
  onDelete,
  deleteLabel = "Delete?",
}: {
  onUp?: () => void;
  onDown?: () => void;
  active?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  deleteLabel?: string;
}) {
  const icon = "flex h-8 w-8 items-center justify-center rounded-lg text-slate hover:bg-paper-dim hover:text-ink-800 disabled:opacity-25 cursor-pointer";
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Move up" disabled={!onUp} onClick={onUp} className={icon}>
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Move down" disabled={!onDown} onClick={onDown} className={icon}>
        <ArrowDown className="h-4 w-4" />
      </button>
      {onToggle && (
        <button type="button" aria-label={active ? "Hide" : "Show"} title={active ? "Hide from onboarding" : "Show in onboarding"} onClick={onToggle} className={icon}>
          {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      )}
      {onEdit && (
        <button type="button" onClick={onEdit} className="h-8 rounded-lg border border-hairline px-2.5 text-[12px] font-medium text-ink-700 hover:border-brass cursor-pointer">
          Edit
        </button>
      )}
      {onDelete && (
        <ConfirmButton danger confirmLabel={deleteLabel} onConfirm={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </ConfirmButton>
      )}
    </div>
  );
}

function InlineText({ value, onSave, className = "" }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value);
  return (
    <input
      aria-label="Name"
      value={v}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`min-w-0 rounded-md bg-transparent px-1 text-[14px] text-ink-800 outline-none hover:bg-paper-dim focus:bg-paper-dim ${className}`}
    />
  );
}
