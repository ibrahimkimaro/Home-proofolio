"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, ExternalLink, History, LayoutTemplate, Megaphone, Plus, Trash2, UserPlus } from "lucide-react";
import {
  adminAddTemplate,
  adminAudit,
  adminBusinesses,
  adminDeleteBusiness,
  adminDeleteTemplate,
  adminEditTemplate,
  adminPlatform,
  adminSaveAnnouncement,
  adminSaveRegistration,
  adminSetBusinessVisibility,
  adminTemplates,
  type AdminBusiness,
  type AdminPlatform,
  type AdminTemplate,
  type AuditEntry,
  type TemplateField,
  type Visibility,
} from "@/lib/api";
import { Badge, ConfirmButton, EmptyRow, Panel, SearchInput, formatDate, td, th, timeAgo } from "./ui";
import { RowActions } from "./OnboardingSection";

const field = "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-[13px] text-ink-800 outline-none focus:border-brass";
const KIND_LABEL: Record<string, string> = { work: "Work contexts", learning: "Learning", achievement: "Achievements", problem: "Problems" };
const FIELD_TYPES: TemplateField["type"][] = ["text", "textarea", "url", "number", "list", "select"];

// ======================= Work templates =======================

export function TemplatesSection({ onError }: { onError: (m: string) => void }) {
  const [list, setList] = useState<AdminTemplate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => adminTemplates().then(setList).catch((e) => onError(e.message)), [onError]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Change failed");
    }
  };

  if (!list) return <div className="h-64 animate-pulse rounded-2xl bg-paper" />;
  const current = list.find((t) => t.key === selected);
  const kinds = [...new Set(list.map((t) => t.kind))];

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel
        icon={LayoutTemplate}
        title="Templates"
        subtitle="Fields each kind of work asks for"
        actions={
          <button type="button" onClick={() => (setAdding(true), setSelected(null))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline px-2.5 text-[12px] font-semibold hover:border-brass cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        }
      >
        {kinds.map((k) => (
          <div key={k} className="mb-4 last:mb-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">{KIND_LABEL[k] ?? k}</p>
            <ul className="space-y-1">
              {list
                .filter((t) => t.kind === k)
                .map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => (setSelected(t.key), setAdding(false))}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] cursor-pointer ${selected === t.key ? "bg-brass/12 font-semibold" : "hover:bg-paper-dim"} ${t.active ? "" : "opacity-60"}`}
                    >
                      <span className="flex-1 truncate">{t.label}</span>
                      <span className="text-[11px] text-slate">{t.fields.length} fields · {t.used} used</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Panel>

      {adding ? (
        <TemplateEditor
          key="new"
          onCancel={() => setAdding(false)}
          onSave={(t) => run(async () => (await adminAddTemplate(t), setAdding(false), setSelected(t.key)))}
        />
      ) : current ? (
        <TemplateEditor
          key={current.key}
          template={current}
          onSave={(t) => run(() => adminEditTemplate(current.key, { label: t.label, description: t.description, fields: t.fields }))}
          onToggle={() => run(() => adminEditTemplate(current.key, { active: !current.active }))}
          onDelete={() => run(async () => (await adminDeleteTemplate(current.key), setSelected(null)))}
        />
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-hairline p-10 text-[13px] text-slate">
          Pick a template to edit its fields, or create a new one (for example “Farming” or “Healthcare”).
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
  onToggle,
  onDelete,
}: {
  template?: AdminTemplate;
  onSave: (t: { key: string; kind: string; label: string; description: string | null; fields: TemplateField[] }) => Promise<void>;
  onCancel?: () => void;
  onToggle?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [key, setKey] = useState(template?.key ?? "");
  const [kind, setKind] = useState(template?.kind ?? "work");
  const [label, setLabel] = useState(template?.label ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [fields, setFields] = useState<TemplateField[]>(template?.fields ?? []);
  const setF = (i: number, p: Partial<TemplateField>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...fields];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setFields(next);
  };
  const keyFrom = (l: string) => l.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

  return (
    <Panel
      icon={LayoutTemplate}
      title={template ? template.label : "New template"}
      subtitle={template ? `${template.key} · used by ${template.used} items${template.active ? "" : " · hidden"}` : "Fields appear when a member picks this context"}
      actions={
        template && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggle} className="h-8 rounded-lg border border-hairline px-2.5 text-[12px] font-semibold hover:border-brass cursor-pointer">
              {template.active ? "Hide" : "Show"}
            </button>
            {onDelete && (
              <ConfirmButton danger confirmLabel={template.used ? "In use — hide instead" : "Delete?"} disabled={template.used > 0} onConfirm={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            )}
          </div>
        )
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ key: key.trim(), kind, label: label.trim(), description: description.trim() || null, fields });
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-[12px] font-semibold text-slate">
            Name
            <input
              value={label}
              onChange={(e) => (setLabel(e.target.value), !template && setKey(keyFrom(e.target.value)))}
              maxLength={80}
              required
              className={`${field} mt-1`}
            />
          </label>
          <label className="text-[12px] font-semibold text-slate">
            Key {template && <span className="font-normal">(fixed)</span>}
            <input value={key} onChange={(e) => setKey(e.target.value)} disabled={!!template} required className={`${field} mt-1 font-mono disabled:opacity-60`} />
          </label>
          <label className="text-[12px] font-semibold text-slate">
            For
            <select value={kind} onChange={(e) => setKind(e.target.value)} disabled={!!template} className={`${field} mt-1 disabled:opacity-60`}>
              <option value="work">Work (a context)</option>
              <option value="learning">Learning</option>
              <option value="achievement">Achievement</option>
              <option value="problem">Problem</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate md:col-span-3">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className={`${field} mt-1`} />
          </label>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold text-slate">Fields ({fields.length}/20)</p>
          <ul className="space-y-2">
            {fields.map((f, i) => (
              <li key={i} className="grid items-center gap-2 rounded-xl border border-hairline p-2.5 md:grid-cols-[1fr_1fr_130px_auto]">
                <input aria-label="Field label" value={f.label} onChange={(e) => setF(i, { label: e.target.value, ...(template ? {} : {}) })} placeholder="Label" className={field} />
                <input aria-label="Field key" value={f.key} onChange={(e) => setF(i, { key: e.target.value })} placeholder="key" className={`${field} font-mono`} />
                <select aria-label="Field type" value={f.type} onChange={(e) => setF(i, { type: e.target.value as TemplateField["type"] })} className={field}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <RowActions
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < fields.length - 1 ? () => move(i, 1) : undefined}
                  onDelete={async () => setFields(fields.filter((_, j) => j !== i))}
                />
                {f.type === "select" && (
                  <input
                    aria-label="Options"
                    value={(f.options ?? []).join(", ")}
                    onChange={(e) => setF(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
                    placeholder="Options, separated by commas"
                    className={`${field} md:col-span-4`}
                  />
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={fields.length >= 20}
            onClick={() => setFields([...fields, { key: `field_${fields.length + 1}`, label: "", type: "text" }])}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brass-dark disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-hairline/60 pt-4">
          {onCancel && (
            <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-[13px] text-slate cursor-pointer">
              Cancel
            </button>
          )}
          <button type="submit" className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper cursor-pointer">
            {template ? "Save template" : "Create template"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

// ======================= Businesses =======================

export function BusinessesSection({ onError }: { onError: (m: string) => void }) {
  const [list, setList] = useState<AdminBusiness[] | null>(null);
  const [q, setQ] = useState("");
  const load = useCallback(() => adminBusinesses().then(setList).catch((e) => onError(e.message)), [onError]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Change failed");
    }
  };
  const rows = (list ?? []).filter((b) => [b.name, b.slug, b.type, ...b.owners].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  return (
    <Panel icon={Building2} title="Business pages" subtitle={list ? `${rows.length} of ${list.length} shown` : "Loading…"} actions={<SearchInput value={q} onChange={setQ} placeholder="Search pages…" />}>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-hairline/70">
              <th className={th}>Page</th>
              <th className={th}>Owners</th>
              <th className={`${th} text-right`}>Followers</th>
              <th className={th}>Visibility</th>
              <th className={th}>Created</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {list && rows.length === 0 ? (
              <EmptyRow colSpan={6}>{list.length ? "No pages match." : "No business pages yet."}</EmptyRow>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="hover:bg-paper-dim/60">
                  <td className={td}>
                    <p className="font-semibold text-ink-800">{b.name}</p>
                    <p className="text-[12px] capitalize text-slate">
                      {b.type} · /b/{b.slug}
                    </p>
                  </td>
                  <td className={`${td} font-mono text-[12px] text-slate`}>{b.owners.map((o) => `@${o}`).join(", ") || "—"}</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{b.followers}</td>
                  <td className={td}>
                    <select
                      aria-label={`Visibility of ${b.name}`}
                      value={b.visibility}
                      onChange={(e) => run(() => adminSetBusinessVisibility(b.slug, e.target.value as Visibility))}
                      className="input !h-8 !rounded-lg !px-2 pr-7 text-[12px]"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Link only</option>
                      <option value="private">Private</option>
                    </select>
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate`}>{formatDate(b.created_at)}</td>
                  <td className={td}>
                    <div className="flex justify-end gap-1.5">
                      {b.visibility !== "private" && (
                        <Link href={`/b/${b.slug}`} target="_blank" aria-label="Open page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-slate hover:border-brass">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <ConfirmButton danger confirmLabel="Delete?" title="Delete page" onConfirm={() => run(() => adminDeleteBusiness(b.slug))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ======================= Platform =======================

export function PlatformSection({ onError }: { onError: (m: string) => void }) {
  const [p, setP] = useState<AdminPlatform | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    adminPlatform().then(setP).catch((e) => onError(e.message));
  }, [onError]);
  if (!p) return <div className="h-64 animate-pulse rounded-2xl bg-paper" />;

  async function save(which: "registration" | "announcement") {
    try {
      if (which === "registration") await adminSaveRegistration(p!.registration);
      else await adminSaveAnnouncement({ ...p!.announcement, link: p!.announcement.link || null });
      setSaved(which);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save");
    }
  }

  const reg = p.registration;
  const ann = p.announcement;
  const TONE = { info: "bg-sky-500/10 border-sky-500/30", success: "bg-emerald-500/10 border-emerald-500/30", warning: "bg-amber-500/10 border-amber-500/30" } as const;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel
        icon={UserPlus}
        title="Sign-ups"
        subtitle="Pause new registrations without taking the site down"
        actions={
          <button type="button" onClick={() => save("registration")} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper cursor-pointer">
            {saved === "registration" ? "Saved" : "Save"}
          </button>
        }
      >
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-[14px] font-semibold text-ink-800">New members can sign up</span>
            <span className="block text-[12px] text-slate">When off, onboarding shows your message and the API refuses new accounts.</span>
          </span>
          <input type="checkbox" checked={reg.open} onChange={(e) => setP({ ...p, registration: { ...reg, open: e.target.checked } })} className="h-5 w-5 accent-current" />
        </label>
        <label className="mt-4 block text-[12px] font-semibold text-slate">
          Message while closed
          <input value={reg.closed_message} onChange={(e) => setP({ ...p, registration: { ...reg, closed_message: e.target.value } })} maxLength={200} className={`${field} mt-1`} />
        </label>
        <div className="mt-4">
          <Badge tone={reg.open ? "good" : "warn"}>{reg.open ? "Open" : "Paused"}</Badge>
        </div>
      </Panel>

      <Panel
        icon={Megaphone}
        title="Announcement"
        subtitle="A banner at the top of every member's workspace"
        actions={
          <button type="button" onClick={() => save("announcement")} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-paper cursor-pointer">
            {saved === "announcement" ? "Saved" : "Save"}
          </button>
        }
      >
        <label className="flex items-center gap-2 text-[14px] font-semibold text-ink-800">
          <input type="checkbox" checked={ann.active} onChange={(e) => setP({ ...p, announcement: { ...ann, active: e.target.checked } })} className="h-4 w-4 accent-current" />
          Show the banner
        </label>
        <label className="mt-4 block text-[12px] font-semibold text-slate">
          Message ({ann.text.length}/240)
          <textarea value={ann.text} onChange={(e) => setP({ ...p, announcement: { ...ann, text: e.target.value } })} maxLength={240} rows={2} className={`${field} mt-1 h-auto py-2`} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-slate">
            Tone
            <select value={ann.tone} onChange={(e) => setP({ ...p, announcement: { ...ann, tone: e.target.value as typeof ann.tone } })} className={`${field} mt-1`}>
              <option value="info">Information</option>
              <option value="success">Good news</option>
              <option value="warning">Warning</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate">
            Link (optional)
            <input value={ann.link ?? ""} onChange={(e) => setP({ ...p, announcement: { ...ann, link: e.target.value } })} placeholder="/discover or https://…" className={`${field} mt-1`} />
          </label>
        </div>
        {ann.text && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-[13px] text-ink-800 ${TONE[ann.tone]}`}>
            <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-slate">Preview</span>
            {ann.text}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ======================= Audit log =======================

const ACTION_LABEL: Record<string, string> = {
  "user.update": "Changed a user",
  "user.delete": "Deleted a user",
  "work.moderate": "Moderated an item",
  "work.delete": "Deleted an item",
  "business.visibility": "Changed page visibility",
  "business.delete": "Deleted a page",
  "platform.registration": "Changed sign-ups",
  "platform.announcement": "Changed the announcement",
  "onboarding.steps.update": "Edited onboarding steps",
  "onboarding.question.create": "Added a question",
  "onboarding.question.update": "Edited a question",
  "onboarding.question.delete": "Deleted a question",
  "onboarding.category.create": "Added a category",
  "onboarding.category.update": "Edited a category",
  "onboarding.category.delete": "Deleted a category",
  "onboarding.role.create": "Added a discipline",
  "onboarding.role.update": "Edited a discipline",
  "onboarding.role.delete": "Deleted a discipline",
  "template.create": "Created a template",
  "template.update": "Edited a template",
  "template.delete": "Deleted a template",
};

export function AuditSection({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    adminAudit(300).then(setRows).catch((e) => onError(e.message));
  }, [onError]);
  const shown = (rows ?? []).filter((r) => [r.action, r.target ?? "", r.admin ?? "", JSON.stringify(r.details)].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const detail = (d: Record<string, unknown>) =>
    Object.entries(d)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" · ");

  return (
    <Panel icon={History} title="Audit log" subtitle="Every admin change, newest first" actions={<SearchInput value={q} onChange={setQ} placeholder="Search actions…" />}>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-hairline/70">
              <th className={th}>When</th>
              <th className={th}>Admin</th>
              <th className={th}>Action</th>
              <th className={th}>Target</th>
              <th className={th}>Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {rows && shown.length === 0 ? (
              <EmptyRow colSpan={5}>{rows.length ? "No actions match." : "No admin actions recorded yet."}</EmptyRow>
            ) : (
              shown.map((r) => (
                <tr key={r.id} className="align-top hover:bg-paper-dim/60">
                  <td className={`${td} whitespace-nowrap text-slate`} title={new Date(r.at).toLocaleString()}>
                    {timeAgo(r.at)}
                  </td>
                  <td className={`${td} font-mono text-[12px]`}>{r.admin ? `@${r.admin}` : "—"}</td>
                  <td className={`${td} font-medium text-ink-800`}>{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className={`${td} max-w-[180px] truncate font-mono text-[12px] text-slate`}>{r.target ?? "—"}</td>
                  <td className={`${td} max-w-[320px] text-[12px] text-slate`}>{detail(r.details) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
