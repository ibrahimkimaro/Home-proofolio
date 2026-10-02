"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Loader2, Lock, Plus, X } from "lucide-react";
import {
  addRole,
  createBusiness,
  deleteRole,
  listMyBusinesses,
  listMyRoles,
  search,
  updateRole,
  type Business,
  type BusinessType,
  type Role,
  type RoleInput,
} from "@/lib/api";
import { formatMonth } from "@/lib/items";

const TYPES: { id: BusinessType; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "school", label: "School" },
  { id: "club", label: "Club" },
  { id: "ngo", label: "NGO" },
  { id: "other", label: "Other" },
];

const field = "h-11 w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none focus:border-ink/40";
const card = "pf-surface rounded-2xl border border-hairline/50 bg-paper p-5 sm:p-6";

/** FR-ROLE-01: many roles at once, past roles kept (BR-10), trust label shown (FR-ORG-05). */
export function RolesPanel() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [editing, setEditing] = useState<Role | "new" | null>(null);

  const load = () => listMyRoles().then(setRoles).catch(() => setRoles([]));
  useEffect(() => {
    load();
  }, []);

  async function end(r: Role) {
    await updateRole(r.id, {
      title: r.title,
      business_slug: r.business?.slug ?? null,
      organization_name: r.organization_name,
      start_date: r.start_date,
      end_date: new Date().toISOString().slice(0, 10),
      visibility: r.visibility,
    });
    load();
  }

  return (
    <section id="roles" className={`${card} scroll-mt-20`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Roles</h2>
        {editing === null && (
          <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1 text-[14px] font-semibold cursor-pointer">
            <Plus className="h-4 w-4" /> Add role
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px] text-slate">Student, founder, manager, volunteer — hold as many as you really do.</p>

      {editing && (
        <RoleForm
          role={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <ul className="mt-4 divide-y divide-hairline/60">
        {roles?.map((r) => (
          <li key={r.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">
                {r.title}
                {(r.business || r.organization_name) && (
                  <span className="font-normal text-slate"> at {r.business?.name ?? r.organization_name}</span>
                )}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate">
                <span>
                  {r.start_date ? formatMonth(r.start_date) : "—"} – {r.current ? "Present" : formatMonth(r.end_date)}
                </span>
                {r.business && (
                  <span className={`inline-flex items-center gap-1 ${r.trust === "confirmed" ? "text-ink-800" : ""}`}>
                    {r.trust === "confirmed" ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                    {r.trust === "confirmed" ? "Confirmed" : r.hidden_by_business ? "Not confirmed by the page" : "Waiting for confirmation"}
                  </span>
                )}
                {r.visibility === "private" && (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Only you
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-[13px]">
              {r.current && (
                <button type="button" onClick={() => end(r)} className="text-slate hover:text-ink-800 cursor-pointer" title="Keep it as a past role">
                  End
                </button>
              )}
              <button type="button" onClick={() => setEditing(r)} className="font-medium hover:underline cursor-pointer">
                Edit
              </button>
            </div>
          </li>
        ))}
        {roles?.length === 0 && !editing && <li className="py-3 text-[14px] text-slate">No roles yet.</li>}
      </ul>
    </section>
  );
}

function RoleForm({ role, onDone }: { role: Role | null; onDone: () => void }) {
  const [title, setTitle] = useState(role?.title ?? "");
  const [where, setWhere] = useState(role?.business?.name ?? role?.organization_name ?? "");
  const [slug, setSlug] = useState<string | null>(role?.business?.slug ?? null);
  const [start, setStart] = useState(role?.start_date ?? "");
  const [current, setCurrent] = useState(role ? role.current : true);
  const [end, setEnd] = useState(role?.end_date ?? "");
  const [isPublic, setIsPublic] = useState(role ? role.visibility === "public" : true);
  const [options, setOptions] = useState<{ slug: string; name: string }[]>([]);
  const [mine, setMine] = useState<Business[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyBusinesses().then(setMine).catch(() => {});
  }, []);

  useEffect(() => {
    if (slug || where.trim().length < 2) return;
    const t = setTimeout(() => search(where, "businesses").then((r) => setOptions(r.businesses ?? [])).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [where, slug]);

  const suggestions = [...mine.map((b) => ({ slug: b.slug, name: b.name })), ...options]
    .filter((o, i, a) => a.findIndex((x) => x.slug === o.slug) === i)
    .filter((o) => !slug && where.trim().length >= 1 && o.name.toLowerCase().includes(where.trim().toLowerCase()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: RoleInput = {
      title: title.trim(),
      business_slug: slug,
      organization_name: slug ? null : where.trim() || null,
      start_date: start || null,
      end_date: current ? null : end || null,
      visibility: isPublic ? "public" : "private",
    };
    try {
      if (role) await updateRole(role.id, payload);
      else await addRole(payload);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role");
      setBusy(false);
    }
  }

  async function remove() {
    if (!role) return;
    setBusy(true);
    await deleteRole(role.id).catch(() => {});
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-paper-dim p-4">
      <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title, e.g. Pharmacy Manager" aria-label="Role title" className={field} />
      <div className="relative">
        <input
          value={where}
          onChange={(e) => {
            setWhere(e.target.value);
            setSlug(null);
          }}
          maxLength={150}
          placeholder="Where — business, school, club (optional)"
          aria-label="Where"
          className={field}
        />
        {slug && <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-800" aria-label="Linked to page" />}
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-hairline bg-paper p-1 shadow-lg">
            {suggestions.slice(0, 5).map((o) => (
              <li key={o.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setSlug(o.slug);
                    setWhere(o.name);
                    setOptions([]);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-paper-dim cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-slate" /> {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {slug && !mine.some((b) => b.slug === slug) && (
        <p className="text-[12px] text-slate">Shows as self-declared until the page confirms you.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[12px] text-slate">
          Started
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-[12px] text-slate">
          Ended
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} disabled={current} className={`${field} mt-1 disabled:opacity-40`} />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-[14px]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="h-4 w-4 accent-current" />
          I still do this
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-current" />
          Show on my profile
        </label>
      </div>
      {error && <p className="text-[13px] text-berry">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        {role && (
          <button type="button" onClick={remove} className="text-[13px] text-slate hover:text-berry cursor-pointer">
            Delete role
          </button>
        )}
        <button type="button" onClick={onDone} className="ml-auto h-10 rounded-lg px-4 text-[14px] text-slate cursor-pointer">
          Cancel
        </button>
        <button type="submit" disabled={busy || !title.trim()} className="flex h-10 items-center gap-2 rounded-lg bg-ink px-5 text-[14px] font-semibold text-paper disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}

/** UC-09: create a business/organization page; creator becomes Owner, page starts private. */
export function BusinessesPanel() {
  const router = useRouter();
  const [list, setList] = useState<Business[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("business");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMyBusinesses().then(setList).catch(() => setList([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const b = await createBusiness({ name: name.trim(), type });
      router.push(`/business/${b.slug}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Businesses and organizations</h2>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1 text-[14px] font-semibold cursor-pointer">
            <Plus className="h-4 w-4" /> New page
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px] text-slate">A pharmacy, studio, club or school you run or help run.</p>

      {creating && (
        <form onSubmit={create} className="mt-4 space-y-3 rounded-xl bg-paper-dim p-4">
          <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="Name, e.g. XYZ Pharmacy" aria-label="Name" className={field} />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                aria-pressed={type === t.id}
                className={`rounded-md border px-3.5 py-1.5 text-[13px] cursor-pointer ${type === t.id ? "border-ink bg-ink text-paper" : "border-hairline bg-paper"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="h-10 rounded-lg px-4 text-[14px] text-slate cursor-pointer">
              <X className="sr-only" />
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()} className="flex h-10 items-center gap-2 rounded-lg bg-ink px-5 text-[14px] font-semibold text-paper disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Create page
            </button>
          </div>
          <p className="text-[12px] text-slate">It stays private until you publish it.</p>
        </form>
      )}

      <ul className="mt-3 divide-y divide-hairline/60">
        {list?.map((b) => (
          <li key={b.slug}>
            <Link href={`/business/${b.slug}`} className="flex items-center gap-3 py-3">
              <Building2 className="h-5 w-5 shrink-0 text-slate" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{b.name}</span>
                <span className="block text-[13px] capitalize text-slate">
                  {b.my_permission} · {b.visibility === "public" ? "Public" : b.visibility === "unlisted" ? "Link only" : "Private"}
                </span>
              </span>
              <span className="text-[13px] font-medium">Manage →</span>
            </Link>
          </li>
        ))}
        {list?.length === 0 && !creating && <li className="py-3 text-[14px] text-slate">None yet.</li>}
      </ul>
    </section>
  );
}
