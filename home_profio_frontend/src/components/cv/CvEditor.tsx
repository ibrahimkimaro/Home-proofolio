"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { Cv, CvData, CvEntry, CvLevel, CvReferee } from "@/lib/api";

const uid = () => globalThis.crypto?.randomUUID?.().slice(0, 12) ?? Math.random().toString(36).slice(2, 14);
const LEVELS = ["Basic", "Fair", "Good", "Very good", "Excellent"];

/**
 * Everything the member can change on their CV. Defaults come from Proofolio (profile, roles,
 * skills from work items); what's typed here overrides or adds to them and is saved automatically.
 */
export function CvEditor({ cv, onChange }: { cv: Cv; onChange: (data: CvData) => void }) {
  const d = cv.data;
  const set = <K extends keyof CvData>(key: K, value: CvData[K]) => onChange({ ...d, [key]: value });

  return (
    <div className="space-y-3">
      <Section title="Personal details" hint="Empty fields use your profile" defaultOpen>
        <Field label="Full name" value={d.name} placeholder={cv.profile.name} onChange={(v) => set("name", v)} />
        <Field label="Professional title" value={d.title} placeholder={cv.profile.title || "e.g. Project Manager"} onChange={(v) => set("title", v)} />
        <Field label="About me" value={d.about} placeholder={cv.profile.about || "A short summary of who you are and what you do"} onChange={(v) => set("about", v)} multiline max={1200} />
        <Field label="Address" value={d.address} placeholder="e.g. Dar es Salaam, Tanzania" onChange={(v) => set("address", v)} />
        <Toggle label={`Show my phone${cv.profile.phone ? ` (${cv.profile.phone})` : " (none on your account)"}`} on={d.show_phone} onChange={(v) => set("show_phone", v)} />
        <Toggle label={`Show my email (${cv.profile.email})`} on={d.show_email} onChange={(v) => set("show_email", v)} />
      </Section>

      <Section title="Work experience" hint={`${cv.roles.length} from your profile${d.jobs.length ? `, ${d.jobs.length} added` : ""}`}>
        {cv.roles.length === 0 && (
          <p className="text-[12px] text-slate">
            No roles yet. <Link href="/profile#roles" className="font-semibold text-ink underline">Add roles in your profile</Link> and they appear here
            automatically, or add a job below.
          </p>
        )}
        {cv.roles.map((r) => {
          const shown = !d.hidden_roles.includes(r.id);
          return (
            <div key={r.id} className="rounded-xl border border-hairline p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink-900">{r.title}</p>
                  <p className="text-[11px] text-slate">{[r.organization, r.start?.slice(0, 7), r.end ? r.end.slice(0, 7) : "present"].filter(Boolean).join(" · ")}</p>
                </div>
                <Toggle
                  compact
                  label="On CV"
                  on={shown}
                  onChange={(v) => set("hidden_roles", v ? d.hidden_roles.filter((x) => x !== r.id) : [...d.hidden_roles, r.id])}
                />
              </div>
              {shown && (
                <Points
                  label="Duties and achievements"
                  points={d.role_points[r.id] ?? []}
                  onChange={(pts) => set("role_points", { ...d.role_points, [r.id]: pts })}
                />
              )}
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-slate">
          Edit job titles and dates in <Link href="/profile#roles" className="font-semibold text-ink underline">your profile</Link>. Other jobs:
        </p>
        <Entries kind="job" entries={d.jobs} onChange={(v) => set("jobs", v)} />
      </Section>

      <Section title="Education" hint={d.education.length ? `${d.education.length}` : "None yet"}>
        <Entries kind="education" entries={d.education} onChange={(v) => set("education", v)} />
      </Section>

      <Section title="Skills" hint="From the skills on your work">
        {cv.skills.length === 0 && <p className="text-[12px] text-slate">Skills you tag on your work appear here automatically.</p>}
        {cv.skills.map((s) => {
          const hidden = d.hidden_skills.some((h) => h.toLowerCase() === s.name.toLowerCase());
          const rated = d.skills.find((x) => x.name.toLowerCase() === s.name.toLowerCase());
          return (
            <div key={s.name} className="flex items-center gap-2">
              <span className={`min-w-0 flex-1 truncate text-[13px] ${hidden ? "text-slate line-through" : "text-ink-900"}`}>{s.name}</span>
              {!hidden && (
                <LevelSelect
                  value={rated?.level ?? s.level}
                  onChange={(level) => set("skills", [...d.skills.filter((x) => x.name.toLowerCase() !== s.name.toLowerCase()), { name: s.name, level }])}
                />
              )}
              <Toggle
                compact
                label="On CV"
                on={!hidden}
                onChange={(v) =>
                  set("hidden_skills", v ? d.hidden_skills.filter((h) => h.toLowerCase() !== s.name.toLowerCase()) : [...d.hidden_skills, s.name])
                }
              />
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-slate">More skills:</p>
        <LevelList
          items={d.skills.filter((x) => !cv.skills.some((s) => s.name.toLowerCase() === x.name.toLowerCase()))}
          placeholder="e.g. Budgeting"
          onChange={(extra) => set("skills", [...d.skills.filter((x) => cv.skills.some((s) => s.name.toLowerCase() === x.name.toLowerCase())), ...extra])}
        />
      </Section>

      <Section title="Languages" hint={d.languages.map((l) => l.name).join(", ") || "None yet"}>
        <LevelList items={d.languages} placeholder="e.g. Kiswahili" onChange={(v) => set("languages", v)} />
      </Section>

      <Section title="Referees" hint={d.referees.length ? `${d.referees.length}` : "None yet"}>
        <Referees referees={d.referees} onChange={(v) => set("referees", v)} />
      </Section>

      <Section title="Links" hint={d.links.map((l) => l.label).join(", ") || "LinkedIn, website…"}>
        {d.links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={l.label}
              maxLength={40}
              placeholder="LinkedIn"
              onChange={(e) => set("links", d.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className={`${input} w-28 shrink-0`}
            />
            <input
              value={l.url}
              maxLength={300}
              placeholder="https://linkedin.com/in/you"
              onChange={(e) => set("links", d.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              className={`${input} min-w-0 flex-1`}
            />
            <RemoveButton onClick={() => set("links", d.links.filter((_, j) => j !== i))} />
          </div>
        ))}
        {d.links.length < 8 && <AddButton onClick={() => set("links", [...d.links, { label: "", url: "" }])}>Add link</AddButton>}
      </Section>

      <Section title="Hobbies" hint={d.hobbies.join(", ") || "None yet"}>
        <Chips items={d.hobbies} max={12} placeholder="e.g. Reading" onChange={(v) => set("hobbies", v)} />
      </Section>
    </div>
  );
}

const input =
  "h-10 rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink-900 placeholder:text-slate/70 focus:border-ink focus:outline-none";

function Section({ title, hint, defaultOpen, children }: { title: string; hint?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="rounded-2xl border border-hairline bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
          {hint && <span className="block truncate text-[11px] text-slate">{hint}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 border-t border-hairline px-4 py-4">{children}</div>}
    </section>
  );
}

function Field({ label, value, placeholder, onChange, multiline, max = 120 }: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate">{label}</span>
      {multiline ? (
        <textarea value={value} placeholder={placeholder} maxLength={max} rows={4} onChange={(e) => onChange(e.target.value)} className={`${input} h-auto w-full py-2 leading-relaxed`} />
      ) : (
        <input value={value} placeholder={placeholder} maxLength={max} onChange={(e) => onChange(e.target.value)} className={`${input} w-full`} />
      )}
    </label>
  );
}

function Toggle({ label, on, onChange, compact }: { label: string; on: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 ${compact ? "shrink-0" : "justify-between"}`}>
      <span className={compact ? "text-[11px] font-semibold text-slate" : "text-[13px] text-ink-800"}>{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-4" />
    </label>
  );
}

function LevelSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${input} h-9 w-28 shrink-0 px-2`} aria-label="Level">
      {LEVELS.map((l, i) => (
        <option key={l} value={i + 1}>
          {l}
        </option>
      ))}
    </select>
  );
}

function LevelList({ items, placeholder, onChange }: { items: CvLevel[]; placeholder: string; onChange: (v: CvLevel[]) => void }) {
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={it.name}
            maxLength={60}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            className={`${input} min-w-0 flex-1`}
          />
          <LevelSelect value={it.level} onChange={(level) => onChange(items.map((x, j) => (j === i ? { ...x, level } : x)))} />
          <RemoveButton onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, { name: "", level: 3 }])}>Add</AddButton>
    </>
  );
}

/** One bullet per line. */
function Points({ label, points, onChange }: { label: string; points: string[]; onChange: (v: string[]) => void }) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-[11px] font-semibold text-slate">{label} (one per line, up to 8)</span>
      <textarea
        value={points.join("\n")}
        rows={Math.max(2, Math.min(8, points.length + 1))}
        placeholder={"Led a team of 5\nCut delivery time by 30%"}
        onChange={(e) => onChange(e.target.value.split("\n").slice(0, 8).map((p) => p.slice(0, 200)))}
        className={`${input} h-auto w-full py-2 leading-relaxed`}
      />
    </label>
  );
}

function Entries({ kind, entries, onChange }: { kind: "job" | "education"; entries: CvEntry[]; onChange: (v: CvEntry[]) => void }) {
  const edu = kind === "education";
  const patch = (i: number, p: Partial<CvEntry>) => onChange(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  return (
    <>
      {entries.map((e, i) => (
        <div key={e.id} className="space-y-2 rounded-xl border border-hairline p-3">
          <div className="flex gap-2">
            <input value={e.title} maxLength={160} placeholder={edu ? "Qualification, e.g. BSc Computer Science" : "Job title"} onChange={(ev) => patch(i, { title: ev.target.value })} className={`${input} min-w-0 flex-1`} />
            <RemoveButton onClick={() => onChange(entries.filter((_, j) => j !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={e.organization} maxLength={120} placeholder={edu ? "School / university" : "Employer"} onChange={(ev) => patch(i, { organization: ev.target.value })} className={input} />
            <input value={e.place} maxLength={120} placeholder="City" onChange={(ev) => patch(i, { place: ev.target.value })} className={input} />
            <input value={e.start} maxLength={20} placeholder="From (e.g. 2019)" onChange={(ev) => patch(i, { start: ev.target.value })} className={input} />
            <input value={e.end} maxLength={20} placeholder="To (e.g. 2023 / Present)" onChange={(ev) => patch(i, { end: ev.target.value })} className={input} />
          </div>
          <Points label={edu ? "Key subjects or achievements" : "Duties and achievements"} points={e.points} onChange={(points) => patch(i, { points })} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...entries, { id: uid(), title: "", organization: "", place: "", start: "", end: "", points: [] }])}>
        {edu ? "Add education" : "Add a job"}
      </AddButton>
    </>
  );
}

function Referees({ referees, onChange }: { referees: CvReferee[]; onChange: (v: CvReferee[]) => void }) {
  const patch = (i: number, p: Partial<CvReferee>) => onChange(referees.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <>
      <p className="text-[11px] text-slate">Ask your referees first: their contact details are printed on your CV.</p>
      {referees.map((r, i) => (
        <div key={r.id} className="space-y-2 rounded-xl border border-hairline p-3">
          <div className="flex gap-2">
            <input value={r.name} maxLength={120} placeholder="Full name" onChange={(e) => patch(i, { name: e.target.value })} className={`${input} min-w-0 flex-1`} />
            <RemoveButton onClick={() => onChange(referees.filter((_, j) => j !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={r.title} maxLength={120} placeholder="Position" onChange={(e) => patch(i, { title: e.target.value })} className={input} />
            <input value={r.organization} maxLength={120} placeholder="Organisation" onChange={(e) => patch(i, { organization: e.target.value })} className={input} />
            <input value={r.phone} maxLength={40} placeholder="Phone" inputMode="tel" onChange={(e) => patch(i, { phone: e.target.value })} className={input} />
            <input value={r.email} maxLength={160} placeholder="Email" inputMode="email" onChange={(e) => patch(i, { email: e.target.value })} className={input} />
          </div>
        </div>
      ))}
      {referees.length < 6 && (
        <AddButton onClick={() => onChange([...referees, { id: uid(), name: "", title: "", organization: "", phone: "", email: "" }])}>Add referee</AddButton>
      )}
    </>
  );
}

function Chips({ items, max, placeholder, onChange }: { items: string[]; max: number; placeholder: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().slice(0, 60);
    if (v && items.length < max && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {items.map((h) => (
          <span key={h} className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-2.5 py-1 text-[12px] font-medium text-ink-800">
            {h}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== h))} aria-label={`Remove ${h}`} className="cursor-pointer text-slate hover:text-ink">
              ×
            </button>
          </span>
        ))}
      </div>
      {items.length < max && (
        <div className="flex gap-2">
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            className={`${input} min-w-0 flex-1`}
          />
          <button type="button" onClick={add} className="h-10 cursor-pointer rounded-xl border border-hairline px-3 text-[13px] font-semibold hover:bg-paper-dim">
            Add
          </button>
        </div>
      )}
    </>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-hairline px-3 py-2 text-[12px] font-semibold text-ink-700 hover:border-ink/40 hover:bg-paper-dim">
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate hover:bg-berry/10 hover:text-berry">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
