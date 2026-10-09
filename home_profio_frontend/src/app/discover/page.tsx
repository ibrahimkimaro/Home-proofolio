"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, MessageSquare, Search, ThumbsUp } from "lucide-react";
import { search, type SearchResults } from "@/lib/api";
import { KINDS, kindOf, stateLabel } from "@/lib/items";
import { AppShell, Avatar, useSession } from "@/components/app/AppShell";

type Tab = "all" | "people" | "work" | "discussions" | "businesses" | "skills";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "work", label: "Work" },
  { id: "discussions", label: "Discussions" },
  { id: "businesses", label: "Businesses" },
  { id: "skills", label: "Skills" },
];

export default function DiscoverPage() {
  const [user] = useSession();
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <AppShell user={user}>
      <Suspense>
        <Discover />
      </Suspense>
    </AppShell>
  );
}

function Discover() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const tab = (params.get("type") as Tab) || "all";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    let live = true;
    search(q, tab)
      .then((r) => live && setResults(r))
      .catch(() => live && setResults({}));
    return () => {
      live = false;
    };
  }, [q, tab]);

  function go(next: { q?: string; type?: Tab }) {
    const sp = new URLSearchParams();
    const nq = next.q ?? q;
    const nt = next.type ?? tab;
    if (nq) sp.set("q", nq);
    if (nt !== "all") sp.set("type", nt);
    setResults(null);
    router.replace(`/discover${sp.size ? `?${sp}` : ""}`);
  }

  const empty = results && Object.values(results).every((v) => !v || v.length === 0);
  const show = (t: Tab) => tab === "all" || tab === t;

  return (
    <div className="mx-auto w-full max-w-full px-4 pt-6 sm:px-6 md:pt-10">
      <h1 className="px-1 text-[26px] font-bold tracking-tight sm:text-[32px]">Discover</h1>
      <p className="mt-1 px-1 text-[15px] text-slate">People, work, businesses and skills — only what members chose to make public.</p>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: input.trim() });
        }}
        className="relative mt-6"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate" />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try “first aid”, “pharmacy”, “football”, “Python”"
          aria-label="Search"
          className="h-14 w-full rounded-xl border border-hairline bg-paper pl-12 pr-4 text-[16px] outline-none focus:border-ink/30"
        />
      </form>

      <div className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go({ type: t.id })}
            className={`shrink-0 rounded-lg px-4 py-2 text-[14px] transition-colors cursor-pointer ${tab === t.id ? "bg-ink text-paper" : "text-slate hover:bg-paper hover:text-ink-800"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-8">
        {results === null && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-paper" />
            ))}
          </div>
        )}
        {empty && <p className="py-12 text-center text-[15px] text-slate">{q ? `Nothing public matches “${q}” yet.` : "Nothing public yet."}</p>}

        {show("people") && !!results?.people?.length && (
          <Group title="People">
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.people.map((p) => (
                <li key={p.username}>
                  <Link href={`/u/${p.username}`} className="flex items-center gap-3 rounded-xl bg-paper p-4 transition-colors hover:bg-paper/60">
                    <Avatar name={p.display_name} src={p.avatar_url} className="h-11 w-11 text-[14px]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{p.display_name}</span>
                      <span className="block truncate text-[13px] text-slate">{p.headline || `@${p.username}`}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
        )}

        {show("work") && !!results?.work?.length && (
          <Group title="Work">
            <ul className="space-y-2">
              {results.work.map((w) => (
                <li key={w.id}>
                  <Link href={`/w/${w.id}`} className="block rounded-xl bg-paper p-4 transition-colors hover:bg-paper/60">
                    <span className="block text-[13px] text-slate">
                      {KINDS.find((k) => k.id === kindOf({ work_type: w.kind }))?.label} · {stateLabel(w.status)}
                      {w.proofs > 0 && ` · ${w.proofs} ${w.proofs === 1 ? "proof" : "proofs"}`}
                    </span>
                    <span className="mt-0.5 block text-[16px] font-semibold leading-snug">{w.title}</span>
                    <span className="mt-1 block text-[13px] text-slate">by {w.owner.display_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
        )}

        {show("discussions") && !!results?.discussions?.length && (
          <Group title="Discussions & Proposals">
            <ul className="space-y-3">
              {results.discussions.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/discussions?thread=${d.id}`}
                    className="block rounded-xl bg-paper p-4 transition-all hover:bg-paper/80 border border-hairline/60 hover:border-sky-500/30 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[12px] text-slate">
                      <span className="font-semibold text-sky-500 uppercase tracking-wider text-[11px]">
                        {d.category}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium text-ink">
                          <ThumbsUp className="h-3.5 w-3.5 text-sky-500" /> {d.upvotes}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate">
                          <MessageSquare className="h-3.5 w-3.5" /> {d.replies} {d.replies === 1 ? "reply" : "replies"}
                        </span>
                      </span>
                    </div>
                    <span className="mt-1.5 block text-[16px] font-bold leading-snug text-ink hover:text-sky-500 transition-colors">
                      {d.title}
                    </span>
                    <p className="mt-1 line-clamp-2 text-[13px] text-slate/90 leading-relaxed">
                      {d.content}
                    </p>
                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-hairline/40 text-[12px] text-slate">
                      <span className="flex items-center gap-2">
                        {d.author.avatar ? (
                          <Avatar name={d.author.name} src={d.author.avatar} className="h-5 w-5 text-[10px]" />
                        ) : null}
                        <span>by <strong className="font-medium text-ink">{d.author.name}</strong></span>
                      </span>
                      {d.tags && d.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {d.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-md bg-paper-dim px-2 py-0.5 text-[11px] font-medium text-slate">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
        )}

        {show("businesses") && !!results?.businesses?.length && (
          <Group title="Businesses and organizations">
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.businesses.map((b) => (
                <li key={b.slug}>
                  <Link href={`/b/${b.slug}`} className="flex items-start gap-3 rounded-xl bg-paper p-4 transition-colors hover:bg-paper/60">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{b.name}</span>
                      <span className="line-clamp-2 block text-[13px] text-slate">{b.description || b.type}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
        )}

        {show("skills") && !!results?.skills?.length && (
          <Group title="Skills">
            <ul className="flex flex-wrap gap-2">
              {results.skills.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setInput(s.name);
                      go({ q: s.name, type: "work" });
                    }}
                    className="rounded-lg bg-paper px-4 py-2 text-[14px] hover:bg-paper/60 cursor-pointer"
                  >
                    {s.name} <span className="text-[12px] text-slate">{s.works}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Group>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-slate">{title}</h2>
      {children}
    </section>
  );
}
