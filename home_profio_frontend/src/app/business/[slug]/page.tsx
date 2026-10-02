"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Globe, Link2, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import {
  addOffering,
  decideRole,
  decideWork,
  deleteBusiness,
  deleteOffering,
  getBusinessForEditing,
  listBusinessRequests,
  listMembers,
  listOfferings,
  removeMember,
  setMember,
  updateBusiness,
  type Business,
  type BusinessMemberRow,
  type BusinessRequests,
  type BusinessSection,
  type BusinessType,
  type Offering,
  type Visibility,
} from "@/lib/api";
import { AppShell, useSession } from "@/components/app/AppShell";

const RANK = { editor: 1, admin: 2, owner: 3 } as const;
const card = "pf-surface rounded-2xl border border-hairline/50 bg-paper p-5 sm:p-6";
const field = "h-11 w-full rounded-lg border border-hairline bg-paper px-3.5 text-[14px] outline-none focus:border-ink/40";
const SECTIONS: { id: BusinessSection; label: string }[] = [
  { id: "about", label: "About" },
  { id: "services", label: "Services and products" },
  { id: "team", label: "Team" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];
const CONTACT = [
  { key: "phone", show: "show_phone", label: "Phone", placeholder: "+255 7…" },
  { key: "whatsapp", show: "show_whatsapp", label: "WhatsApp", placeholder: "+255 7…" },
  { key: "email", show: "show_email", label: "Email", placeholder: "hello@…" },
  { key: "location", show: "show_location", label: "Location", placeholder: "Street, town" },
] as const;

export default function ManageBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [user] = useSession();
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <AppShell user={user}>
      <Manage slug={slug} />
    </AppShell>
  );
}

function Manage({ slug }: { slug: string }) {
  const [b, setB] = useState<Business | null | "missing">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBusinessForEditing(slug).then(setB).catch(() => setB("missing"));
  }, [slug]);

  const patch = useCallback(
    async (p: Parameters<typeof updateBusiness>[1]) => {
      setError(null);
      try {
        setB(await updateBusiness(slug, p));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
        return false;
      }
    },
    [slug],
  );

  if (b === null) return <div className="mx-auto mt-10 h-40 max-w-3xl animate-pulse rounded-2xl bg-paper" />;
  if (b === "missing") return <p className="mt-20 text-center text-[15px] text-slate">You don&apos;t manage this page.</p>;

  const perm = b.my_permission ?? "editor";
  const can = (level: keyof typeof RANK) => RANK[perm] >= RANK[level];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-6 sm:px-6 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[13px] text-slate">
            {{ business: "Business", school: "School", club: "Club", ngo: "NGO", other: "Organization" }[b.type]} · You&apos;re {perm === "owner" ? "an owner" : `an ${perm}`}
          </p>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">{b.name}</h1>
        </div>
        {b.visibility !== "private" && b.visibility !== "draft" && (
          <Link href={`/b/${b.slug}`} className="flex items-center gap-1 text-[14px] font-semibold hover:underline">
            View page <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {error && <p className="rounded-xl bg-berry/10 px-4 py-3 text-[14px] text-berry">{error}</p>}

      {can("admin") && (
        <Card title="Who can see this page">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper-dim p-1" role="radiogroup">
            {(
              [
                ["private", "Private", Lock],
                ["unlisted", "Link only", Link2],
                ["public", "Public", Globe],
              ] as [Visibility, string, typeof Globe][]
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={b.visibility === id}
                onClick={() => patch({ visibility: id })}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium cursor-pointer ${b.visibility === id ? "bg-paper shadow-sm" : "text-slate"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[13px] font-semibold text-slate">Sections visitors see</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => {
              const on = (b.section_visibility[s.id] ?? "public") === "public";
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch({ section_visibility: { [s.id]: on ? "private" : "public" } })}
                  className={`flex items-center gap-1 rounded-md border px-3.5 py-1.5 text-[13px] cursor-pointer ${on ? "border-ink bg-ink text-paper" : "border-hairline text-slate"}`}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <About b={b} onSave={patch} />
      <Offerings slug={slug} />
      {can("admin") && <Requests slug={slug} />}
      <Contact b={b} onSave={patch} canPublish={can("admin")} />
      <People slug={slug} isOwner={can("owner")} />

      {can("owner") && <DangerZone slug={slug} />}
    </div>
  );
}

function Card({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className={card}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-slate">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function About({ b, onSave }: { b: Business; onSave: (p: Partial<Business>) => Promise<boolean> }) {
  const [name, setName] = useState(b.name);
  const [type, setType] = useState<BusinessType>(b.type);
  const [description, setDescription] = useState(b.description ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = name !== b.name || type !== b.type || description !== (b.description ?? "");
  return (
    <Card title="About">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSave({ name: name.trim(), type, description: description.trim() || null })) setSaved(true);
        }}
      >
        <input required value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} maxLength={150} aria-label="Name" className={field} />
        <select value={type} onChange={(e) => (setType(e.target.value as BusinessType), setSaved(false))} aria-label="Type" className={field}>
          <option value="business">Business</option>
          <option value="school">School</option>
          <option value="club">Club</option>
          <option value="ngo">NGO</option>
          <option value="other">Other</option>
        </select>
        <textarea
          value={description}
          onChange={(e) => (setDescription(e.target.value), setSaved(false))}
          rows={4}
          maxLength={3000}
          placeholder="What you do, who you serve, since when."
          aria-label="Description"
          className={`${field} h-auto resize-none py-3 leading-relaxed`}
        />
        <div className="flex items-center justify-end gap-3">
          {saved && !dirty && <span className="text-[13px] text-ink-800">Saved</span>}
          <button type="submit" disabled={!dirty} className="h-10 rounded-lg bg-ink px-5 text-[14px] font-semibold text-paper disabled:opacity-40 cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </Card>
  );
}

function Offerings({ slug }: { slug: string }) {
  const [list, setList] = useState<Offering[]>([]);
  const [form, setForm] = useState<Omit<Offering, "id">>({ kind: "service", name: "", description: null, price: null });
  useEffect(() => {
    listOfferings(slug).then(setList).catch(() => {});
  }, [slug]);

  return (
    <Card title="Services and products">
      <ul className="divide-y divide-hairline/60">
        {list.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{o.name}</span>
              <span className="block text-[13px] text-slate">
                {o.kind === "product" ? "Product" : "Service"}
                {o.price && ` · ${o.price}`}
              </span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${o.name}`}
              onClick={async () => (await deleteOffering(slug, o.id), setList((l) => l.filter((x) => x.id !== o.id)))}
              className="text-slate hover:text-berry cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_140px_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const o = await addOffering(slug, { ...form, name: form.name.trim(), price: form.price?.trim() || null });
          setList((l) => [...l, o]);
          setForm({ kind: form.kind, name: "", description: null, price: null });
        }}
      >
        <select aria-label="Kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Offering["kind"] })} className={field}>
          <option value="service">Service</option>
          <option value="product">Product</option>
        </select>
        <input required aria-label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Blood pressure check" className={field} />
        <input aria-label="Price" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (optional)" className={field} />
        <button type="submit" disabled={!form.name.trim()} className="flex h-11 items-center justify-center gap-1 rounded-lg bg-ink px-4 text-[14px] font-semibold text-paper disabled:opacity-40 cursor-pointer">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
    </Card>
  );
}

function Requests({ slug }: { slug: string }) {
  const [r, setR] = useState<BusinessRequests | null>(null);
  const load = useCallback(() => listBusinessRequests(slug).then(setR).catch(() => {}), [slug]);
  useEffect(() => {
    load();
  }, [load]);
  if (!r || (r.roles.length === 0 && r.works.length === 0)) return null;

  const btn = "h-9 rounded-lg px-4 text-[13px] font-semibold cursor-pointer";
  return (
    <Card title="Waiting for you" hint="People who say they work here, and work they linked to this page.">
      <ul className="divide-y divide-hairline/60">
        {r.roles.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1 text-[14px]">
              <Link href={`/u/${x.username}`} className="font-semibold hover:underline">
                {x.display_name}
              </Link>{" "}
              says they are <span className="font-semibold">{x.title}</span>
            </span>
            <button type="button" onClick={async () => (await decideRole(slug, x.id, "reject"), load())} className={`${btn} text-slate`}>
              Not them
            </button>
            <button type="button" onClick={async () => (await decideRole(slug, x.id, "confirm"), load())} className={`${btn} bg-ink text-paper`}>
              Confirm
            </button>
          </li>
        ))}
        {r.works.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1 text-[14px]">
              <Link href={`/w/${x.work_id}`} className="font-semibold hover:underline">
                {x.title}
              </Link>{" "}
              by {x.display_name}
            </span>
            <button type="button" onClick={async () => (await decideWork(slug, x.id, "reject"), load())} className={`${btn} text-slate`}>
              Decline
            </button>
            <button type="button" onClick={async () => (await decideWork(slug, x.id, "accept"), load())} className={`${btn} bg-ink text-paper`}>
              Show on page
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Contact({ b, onSave, canPublish }: { b: Business; onSave: (p: Partial<Business>) => Promise<boolean>; canPublish: boolean }) {
  const [values, setValues] = useState(() => Object.fromEntries(CONTACT.map((c) => [c.key, b[c.key] ?? ""])) as Record<string, string>);
  return (
    <Card title="Contact" hint="Each detail stays hidden until you turn it on.">
      <ul className="space-y-3">
        {CONTACT.map((c) => (
          <li key={c.key} className="flex items-center gap-3">
            <input
              aria-label={c.label}
              value={values[c.key]}
              onChange={(e) => setValues({ ...values, [c.key]: e.target.value })}
              onBlur={() => values[c.key] !== (b[c.key] ?? "") && onSave({ [c.key]: values[c.key].trim() || null })}
              placeholder={`${c.label} — ${c.placeholder}`}
              className={field}
            />
            <label className={`flex shrink-0 items-center gap-2 text-[13px] ${canPublish ? "" : "opacity-40"}`}>
              <input
                type="checkbox"
                disabled={!canPublish}
                checked={b[c.show]}
                onChange={(e) => onSave({ [c.show]: e.target.checked })}
                className="h-4 w-4 accent-current"
              />
              Public
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function People({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [list, setList] = useState<BusinessMemberRow[]>([]);
  const [username, setUsername] = useState("");
  const [perm, setPerm] = useState<BusinessMemberRow["permission"]>("editor");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => listMembers(slug).then(setList).catch(() => {}), [slug]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Who can manage this page" hint="Permissions are separate from job titles: a Manager title doesn't let anyone edit.">
      <ul className="divide-y divide-hairline/60">
        {list.map((m) => (
          <li key={m.username} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1 text-[14px]">
              <span className="font-semibold">{m.display_name}</span> <span className="text-slate">@{m.username}</span>
            </span>
            <span className="text-[13px] capitalize text-slate">{m.permission}</span>
            {isOwner && (
              <button
                type="button"
                aria-label={`Remove ${m.username}`}
                onClick={async () => {
                  setError(null);
                  try {
                    await removeMember(slug, m.username);
                    load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not remove");
                  }
                }}
                className="text-slate hover:text-berry cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await setMember(slug, username.replace(/^@/, "").trim(), perm);
              setUsername("");
              load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not add");
            }
          }}
        >
          <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" aria-label="Username" className={`${field} min-w-0 flex-1`} />
          <select value={perm} onChange={(e) => setPerm(e.target.value as BusinessMemberRow["permission"])} aria-label="Permission" className={`${field} w-auto`}>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button type="submit" className="h-11 rounded-lg bg-ink px-4 text-[14px] font-semibold text-paper cursor-pointer">
            Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-[13px] text-berry">{error}</p>}
    </Card>
  );
}

function DangerZone({ slug }: { slug: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex items-center justify-between gap-3 px-2 py-4">
      <p className="text-[13px] text-slate">Deleting removes the page for everyone. Roles on people&apos;s profiles stay as plain text.</p>
      <button
        type="button"
        onClick={async () => {
          if (!armed) return setArmed(true);
          setBusy(true);
          await deleteBusiness(slug);
          router.push("/profile");
        }}
        className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold cursor-pointer ${armed ? "bg-berry text-white" : "text-berry"}`}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {armed ? "Delete for good?" : "Delete page"}
      </button>
    </section>
  );
}
