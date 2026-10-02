"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  ChevronDown,
  X,
  Link2,
  Paperclip,
  Trash2,
  Loader2,
  Globe,
  Lock,
  FileText,
  Plus,
  ArrowRightLeft,
  Building2,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  deleteWork,
  fetchTemplates,
  linkWorkToBusiness,
  listMyBusinesses,
  listWorkBusinesses,
  mediaUrl,
  search,
  turnIntoWork,
  unlinkWorkFromBusiness,
  updateWork,
  uploadFile,
  type Business,
  type EvidenceLink,
  type EvidenceVisibility,
  type TemplateField,
  type Visibility,
  type Work,
  type WorkInput,
  type WorkTemplate,
} from "@/lib/api";
import {
  EVIDENCE_TYPES,
  KINDS,
  LIFECYCLES,
  guessEvidenceType,
  isPublic,
  kindLabel,
  kindOf,
  stateLabel,
  toInput,
  type Kind,
} from "@/lib/items";

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

/** A quiet list row: title + one line of meta. Everything else lives behind the tap. */
export function ItemRow({ work, onOpen, action }: { work: Work; onOpen: () => void; action?: ReactNode }) {
  const kind = kindOf(work);
  return (
    <li className="group flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-paper-dim cursor-pointer"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-ink-800">{work.title}</span>
          <span className="block truncate text-[13px] text-slate">
            {kindLabel(kind)}
            {kind !== "capture" && ` · ${stateLabel(work.status)}`} · {timeAgo(work.updated_at)}
          </span>
        </span>
        {!action && <ChevronRight className="h-4 w-4 shrink-0 text-slate/50 transition-transform group-hover:translate-x-0.5" />}
      </button>
      {action}
    </li>
  );
}

/** Bottom sheet on phones, side panel on desktop. */
function Sheet({ label, onClose, children, footer }: { label: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[94vh] w-full flex-col rounded-t-2xl bg-paper shadow-2xl outline-none animate-[sheetUp_.22s_cubic-bezier(.22,1,.36,1)] md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-2xl md:animate-[sheetIn_.22s_cubic-bezier(.22,1,.36,1)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-hairline md:hidden" />
        {children}
        <div className="flex items-center gap-2 border-t border-hairline/60 px-6 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

const VIS: { id: Visibility; label: string; icon: typeof Globe }[] = [
  { id: "private", label: "Only me", icon: Lock },
  { id: "unlisted", label: "Link only", icon: Link2 },
  { id: "public", label: "Public", icon: Globe },
];

const EV_VIS: { id: EvidenceVisibility; label: string }[] = [
  { id: "public", label: "Visible" },
  { id: "exists", label: "Show it exists" },
  { id: "private", label: "Hidden" },
];

/** Shape an item: say what it is, the relevant fields appear, attach proof, choose who sees it. */
export function ShapeSheet({
  work,
  onClose,
  onSaved,
  onDeleted,
}: {
  work: Work;
  onClose: () => void;
  onSaved: (w: Work) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<WorkInput>(() => toInput(work));
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [link, setLink] = useState("");
  const [skill, setSkill] = useState("");
  const [more, setMore] = useState(Boolean(work.context_role || work.occurred_on || (work.custom_attributes?.custom as unknown[])?.length));
  const [busy, setBusy] = useState<"save" | "upload" | "delete" | "turn" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
  }, []);

  const kind = kindOf({ work_type: draft.work_type });
  const set = <K extends keyof WorkInput>(k: K, v: WorkInput[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const attrs = draft.custom_attributes as Record<string, unknown>;
  const setAttr = (key: string, value: unknown) => set("custom_attributes", { ...attrs, [key]: value });

  const contexts = templates.filter((t) => t.kind === "work");
  const fieldsTemplate =
    kind === "work" ? templates.find((t) => t.key === draft.template) : templates.find((t) => t.key === kind && t.kind === kind);
  const proof = draft.evidence_links;

  function keepAttrsFor(tpl?: WorkTemplate) {
    const keep = new Set(["custom", ...(tpl?.fields.map((f) => f.key) ?? [])]);
    return Object.fromEntries(Object.entries(attrs).filter(([k]) => keep.has(k)));
  }

  function chooseKind(k: Exclude<Kind, "capture">) {
    const tpl = k === "work" ? templates.find((t) => t.key === draft.template) : templates.find((t) => t.key === k);
    setDraft((d) => ({
      ...d,
      work_type: k,
      status: LIFECYCLES[k].includes(d.status) ? d.status : LIFECYCLES[k][0],
      template: k === "work" ? d.template : null,
      custom_attributes: keepAttrsFor(tpl),
    }));
  }

  function chooseContext(key: string) {
    const tpl = templates.find((t) => t.key === key);
    setDraft((d) => ({ ...d, template: key, custom_attributes: keepAttrsFor(tpl) }));
  }

  function addProof(url: string, label: string, contentType?: string) {
    set("evidence_links", [...proof, { label, url, type: guessEvidenceType(url, contentType), visibility: "public" }]);
  }

  function addLink() {
    const raw = link.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      addProof(url, new URL(url).hostname.replace(/^www\./, ""));
      setLink("");
    } catch {
      setError("That doesn't look like a link");
    }
  }

  function updateProof(i: number, patch: Partial<EvidenceLink>) {
    set("evidence_links", proof.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  function addSkill() {
    const parts = skill.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    set("skills", Array.from(new Set([...draft.skills, ...parts])));
    setSkill("");
  }

  async function onFile(file?: File) {
    if (!file) return;
    setBusy("upload");
    setError(null);
    try {
      const up = await uploadFile(file);
      addProof(up.url, up.name, up.content_type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (draft.visibility !== "private" && draft.work_type === "capture") {
      setError("Say what this is before sharing it.");
      return;
    }
    // A link typed but not yet added still counts (state updates would land too late).
    const raw = link.trim();
    const typed: EvidenceLink[] = [];
    if (raw) {
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        typed.push({ label: new URL(url).hostname.replace(/^www\./, ""), url, type: guessEvidenceType(url), visibility: "public" });
      } catch {
        setError("That doesn't look like a link");
        return;
      }
    }
    setBusy("save");
    setError(null);
    try {
      onSaved(await updateWork(work.id, { ...draft, title: draft.title.trim() || "Untitled", evidence_links: [...draft.evidence_links, ...typed] }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(null);
    }
  }

  async function turnInto() {
    setBusy("turn");
    try {
      await updateWork(work.id, draft);
      onSaved(await turnIntoWork(work.id));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn into work");
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy("delete");
    try {
      await deleteWork(work.id);
      onDeleted(work.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(null);
    }
  }

  const label = "mb-2 block text-[13px] font-semibold text-slate";
  const field = "w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none transition-colors focus:border-ink/40";
  const chip = (on: boolean) =>
    `rounded-md border px-3.5 py-1.5 text-[13px] transition-colors cursor-pointer ${
      on ? "border-ink bg-ink text-paper" : "border-hairline text-ink-700 hover:border-ink/40"
    }`;

  return (
    <Sheet
      label="Shape item"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={remove}
            disabled={!!busy}
            aria-label="Delete"
            className={`flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] transition-colors cursor-pointer ${
              confirmDelete ? "bg-berry text-white" : "text-slate hover:text-berry"
            }`}
          >
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {confirmDelete && "Delete for good?"}
          </button>
          {kind === "learning" && draft.status !== "turned_into_project" && (
            <button
              type="button"
              onClick={turnInto}
              disabled={!!busy}
              className="flex h-11 items-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-semibold hover:border-ink/40 cursor-pointer"
            >
              {busy === "turn" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Turn into work
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!!busy}
            className="ml-auto flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between px-6 pb-2 pt-4">
        <span className="flex items-center gap-1.5 text-[13px] text-slate">
          {isPublic(work) ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {isPublic(work) ? "On your profile" : work.visibility === "unlisted" ? "Link only" : "Only you"} · captured{" "}
          {new Date(work.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-paper-dim cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-6 pb-8">
        <textarea
          aria-label="Title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          rows={2}
          maxLength={200}
          className="w-full resize-none bg-transparent text-[22px] font-bold leading-snug text-ink-800 outline-none"
        />

        <div>
          <span className={label}>What is this?</span>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => chooseKind(k.id)}
                aria-pressed={kind === k.id}
                className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                  kind === k.id ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink/40"
                }`}
              >
                <span className="block text-[14px] font-semibold">{k.label}</span>
                <span className={`block text-[12px] leading-snug ${kind === k.id ? "text-paper/70" : "text-slate"}`}>{k.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {kind === "work" && contexts.length > 0 && (
          <div>
            <span className={label}>Context</span>
            <div className="flex flex-wrap gap-2">
              {contexts.map((t) => (
                <button key={t.key} type="button" onClick={() => chooseContext(t.key)} aria-pressed={draft.template === t.key} className={chip(draft.template === t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {kind !== "capture" && (
          <>
            <div>
              <label htmlFor="story" className={label}>
                Story
              </label>
              <textarea
                id="story"
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
                rows={3}
                placeholder="What happened, what you did, what changed."
                className="w-full resize-none rounded-xl bg-paper-dim px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-slate/70 focus:ring-2 focus:ring-ink/10"
              />
            </div>

            {fieldsTemplate && fieldsTemplate.fields.length > 0 && (
              <div className="space-y-4">
                {fieldsTemplate.fields.map((f) => (
                  <DynamicField key={f.key} f={f} value={attrs[f.key]} onChange={(v) => setAttr(f.key, v)} className={field} labelClass={label} />
                ))}
              </div>
            )}

            <div>
              <label htmlFor="skill" className={label}>
                Skills
              </label>
              {draft.skills.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                  {draft.skills.map((s) => (
                    <li key={s} className="flex items-center gap-1 rounded-md bg-paper-dim py-1 pl-3 pr-1 text-[13px]">
                      {s}
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        onClick={() => set("skills", draft.skills.filter((x) => x !== s))}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-slate hover:bg-hairline cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                id="skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addSkill())}
                onBlur={addSkill}
                placeholder="Type a skill and press Enter"
                className={`${field} h-11`}
              />
            </div>
          </>
        )}

        <div>
          <span className={label}>Proof</span>
          {proof.length === 0 && <p className="mb-3 text-[14px] text-slate">Where is the proof? A link, a photo, a document.</p>}
          <ul className="mb-3 space-y-2">
            {proof.map((p, i) => (
              <li key={`${p.url}-${i}`} className="rounded-xl bg-paper-dim p-3">
                <div className="flex items-center gap-2.5 text-[14px]">
                  <FileText className="h-4 w-4 shrink-0 text-slate" />
                  <input
                    aria-label="Proof name"
                    value={p.label}
                    onChange={(e) => updateProof(i, { label: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                  />
                  <a href={mediaUrl(p.url) ?? p.url} target="_blank" rel="noreferrer" className="text-[12px] text-slate hover:underline">
                    Open
                  </a>
                  <button
                    type="button"
                    aria-label={`Remove ${p.label}`}
                    onClick={() => set("evidence_links", proof.filter((_, j) => j !== i))}
                    className="text-slate hover:text-berry cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2 pl-6">
                  <select
                    aria-label="Proof type"
                    value={p.type ?? "link"}
                    onChange={(e) => updateProof(i, { type: e.target.value })}
                    className="h-8 rounded-lg border border-hairline bg-paper px-2 text-[12px] outline-none"
                  >
                    {EVIDENCE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Who can see this proof"
                    value={p.visibility ?? "public"}
                    onChange={(e) => updateProof(i, { visibility: e.target.value as EvidenceVisibility })}
                    className="h-8 rounded-lg border border-hairline bg-paper px-2 text-[12px] outline-none"
                  >
                    {EV_VIS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  {p.visibility && p.visibility !== "public" && <EyeOff className="h-4 w-4 self-center text-slate" aria-hidden="true" />}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
              <input
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                onBlur={addLink}
                placeholder="Paste a link"
                className={`${field} h-11 pl-9`}
              />
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy === "upload"}
              aria-label="Upload photo or file"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline hover:border-ink/40 disabled:opacity-50 cursor-pointer"
            >
              {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
          </div>
        </div>

        {kind !== "capture" && (
          <div>
            <label htmlFor="stage" className={label}>
              Stage
            </label>
            <select id="stage" value={draft.status} onChange={(e) => set("status", e.target.value)} className={`${field} h-11`}>
              {LIFECYCLES[kind].map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <span className={label}>Who can see it</span>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper-dim p-1" role="radiogroup" aria-label="Visibility">
            {VIS.map(({ id, label: l, icon: Icon }) => {
              const on = draft.visibility === id || (id === "private" && draft.visibility === "draft");
              const disabled = kind === "capture" && id !== "private";
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => set("visibility", id)}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer ${
                    on ? "bg-paper shadow-sm" : "text-slate hover:text-ink-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {l}
                </button>
              );
            })}
          </div>
          {kind === "capture" && <p className="mt-2 text-[13px] text-slate">Say what this is before sharing it.</p>}
        </div>

        {kind !== "capture" && (
          <div>
            <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-[14px] font-semibold cursor-pointer" aria-expanded={more}>
              <ChevronDown className={`h-4 w-4 transition-transform ${more ? "" : "-rotate-90"}`} />
              More details
            </button>
            {more && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="role" className={label}>
                    Your role
                  </label>
                  <input
                    id="role"
                    value={draft.context_role ?? ""}
                    onChange={(e) => set("context_role", e.target.value || null)}
                    maxLength={200}
                    placeholder="Team lead, volunteer, solo…"
                    className={`${field} h-11`}
                  />
                </div>
                <div>
                  <label htmlFor="when" className={label}>
                    When it happened
                  </label>
                  <input
                    id="when"
                    type="date"
                    value={draft.occurred_on ?? ""}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set("occurred_on", e.target.value || null)}
                    className={`${field} h-11`}
                  />
                  <p className="mt-1 text-[12px] text-slate">For older work. The date you captured it is kept too.</p>
                </div>
                <CustomDetails value={(attrs.custom as { label: string; value: string }[]) ?? []} onChange={(v) => setAttr("custom", v)} labelClass={label} field={field} />
                <BusinessLinks workId={work.id} labelClass={label} field={field} />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-[14px] text-berry">{error}</p>}
      </div>
    </Sheet>
  );
}

function DynamicField({
  f,
  value,
  onChange,
  className,
  labelClass,
}: {
  f: TemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  className: string;
  labelClass: string;
}) {
  const id = `f-${f.key}`;
  let input: ReactNode;
  if (f.type === "textarea") {
    input = (
      <textarea id={id} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} className={`${className} resize-none py-2.5`} />
    );
  } else if (f.type === "number") {
    input = (
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${className} h-11`}
      />
    );
  } else if (f.type === "list") {
    input = (
      <input
        id={id}
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1))}
        onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder={f.placeholder ?? "Separate with commas"}
        className={`${className} h-11`}
      />
    );
  } else if (f.type === "select") {
    input = (
      <select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} className={`${className} h-11`}>
        <option value="">—</option>
        {f.options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  } else {
    input = (
      <input
        id={id}
        type={f.type === "url" ? "url" : "text"}
        inputMode={f.type === "url" ? "url" : undefined}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (f.type === "url" && v && !/^https?:\/\//i.test(v)) onChange(`https://${v}`);
        }}
        placeholder={f.placeholder}
        className={`${className} h-11`}
      />
    );
  }
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {f.label}
      </label>
      {input}
    </div>
  );
}

function CustomDetails({
  value,
  onChange,
  labelClass,
  field,
}: {
  value: { label: string; value: string }[];
  onChange: (v: { label: string; value: string }[]) => void;
  labelClass: string;
  field: string;
}) {
  return (
    <div>
      <span className={labelClass}>Your own details</span>
      <ul className="space-y-2">
        {value.map((row, i) => (
          <li key={i} className="flex gap-2">
            <input
              aria-label="Detail name"
              value={row.label}
              maxLength={40}
              onChange={(e) => onChange(value.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
              placeholder="Name"
              className={`${field} h-10 w-2/5`}
            />
            <input
              aria-label="Detail value"
              value={row.value}
              maxLength={300}
              onChange={(e) => onChange(value.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
              placeholder="Value"
              className={`${field} h-10 flex-1`}
            />
            <button type="button" aria-label="Remove detail" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate hover:text-berry cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...value, { label: "", value: "" }])}
        className="mt-2 flex items-center gap-1 text-[13px] font-medium text-slate hover:text-ink-800 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" /> Add a detail
      </button>
    </div>
  );
}

/** Link this work to a business page; it appears there once the business accepts (FR-ORG-09). */
function BusinessLinks({ workId, labelClass, field }: { workId: string; labelClass: string; field: string }) {
  const [links, setLinks] = useState<{ status: string; slug: string; name: string }[]>([]);
  const [mine, setMine] = useState<Business[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    listWorkBusinesses(workId).then(setLinks).catch(() => {});
    listMyBusinesses().then(setMine).catch(() => {});
  }, [workId]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => search(q, "businesses").then((r) => setFound(r.businesses ?? [])).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function link(slug: string, name: string) {
    const r = await linkWorkToBusiness(workId, slug);
    setLinks((l) => [...l.filter((x) => x.slug !== slug), { slug, name, status: r.status }]);
    setQ("");
    setFound([]);
  }

  const options = [...mine.map((b) => ({ slug: b.slug, name: b.name })), ...(q.trim().length >= 2 ? found : [])].filter(
    (o, i, a) => !links.some((l) => l.slug === o.slug) && a.findIndex((x) => x.slug === o.slug) === i,
  );

  return (
    <div>
      <span className={labelClass}>Business / Organization</span>
      {links.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {links.map((l) => (
            <li key={l.slug} className="flex items-center gap-2 rounded-lg bg-paper-dim px-3 py-2 text-[14px]">
              <Building2 className="h-4 w-4 text-slate" />
              <span className="flex-1 truncate">{l.name}</span>
              <span className="text-[12px] text-slate">{l.status === "accepted" ? "Shown on their page" : l.status === "pending" ? "Waiting for them" : "Not accepted"}</span>
              <button
                type="button"
                aria-label={`Unlink ${l.name}`}
                onClick={async () => (await unlinkWorkFromBusiness(workId, l.slug), setLinks((x) => x.filter((y) => y.slug !== l.slug)))}
                className="text-slate hover:text-berry cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a business, school or club" className={`${field} h-11`} />
      {options.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {options.slice(0, 5).map((o) => (
            <li key={o.slug}>
              <button type="button" onClick={() => link(o.slug, o.name)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-paper-dim cursor-pointer">
                <Plus className="h-3.5 w-3.5 text-slate" /> {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** UC-08: review what visitors will see, then choose Public or Link only. */
export function PublishReview({ work, onClose, onPublished }: { work: Work; onClose: () => void; onPublished: (w: Work) => void }) {
  const [vis, setVis] = useState<"public" | "unlisted">("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = kindOf(work);
  const shown = work.evidence_links.filter((e) => (e.visibility ?? "public") !== "private");

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      onPublished(await updateWork(work.id, { ...toInput(work), visibility: vis }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish");
      setBusy(false);
    }
  }

  return (
    <Sheet
      label="Review before publishing"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 rounded-lg px-4 text-[14px] text-slate hover:text-ink-800 cursor-pointer">
            Not now
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="ml-auto flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-[15px] font-semibold text-paper disabled:opacity-60 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {vis === "public" ? "Publish" : "Share by link"}
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between px-6 pb-2 pt-4">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Eye className="h-4 w-4" /> This is what visitors will see
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-paper-dim cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
        <article className="rounded-2xl border border-hairline/60 p-6">
          <p className="text-[13px] text-slate">
            {kindLabel(kind)} · {stateLabel(work.status)}
          </p>
          <h2 className="mt-1 text-[19px] font-semibold leading-snug">{work.title}</h2>
          {work.description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate">{work.description}</p>}
          {work.skills.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {work.skills.map((s) => (
                <li key={s} className="rounded-md bg-paper-dim px-2.5 py-0.5 text-[12px]">
                  {s}
                </li>
              ))}
            </ul>
          )}
          {shown.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {shown.map((e, i) => (
                <span key={i} className="rounded-md border border-hairline px-3 py-1 text-[13px]">
                  {e.visibility === "exists" ? "Private proof on file" : e.label}
                </span>
              ))}
            </div>
          )}
        </article>
        {work.evidence_links.length > shown.length && (
          <p className="text-[13px] text-slate">{work.evidence_links.length - shown.length} hidden proof stays private.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["public", "Public", "On your profile and in search"],
              ["unlisted", "Link only", "Only people with the link"],
            ] as const
          ).map(([id, l, hint]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVis(id)}
              aria-pressed={vis === id}
              className={`rounded-xl border p-4 text-left cursor-pointer ${vis === id ? "border-ink bg-paper-dim" : "border-hairline"}`}
            >
              <span className="block text-[14px] font-semibold">{l}</span>
              <span className="block text-[12px] text-slate">{hint}</span>
            </button>
          ))}
        </div>
        {error && <p className="text-[14px] text-berry">{error}</p>}
      </div>
    </Sheet>
  );
}
