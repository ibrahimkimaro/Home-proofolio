"use client";

import { useEffect, useMemo, useState } from "react";
import { Headset, Search } from "lucide-react";
import { fetchOnboarding } from "@/lib/api";
import { ROLE_CATEGORIES, ROLE_OPTIONS } from "@/lib/onboarding";
import { missingDisciplineMessage, openSupport } from "@/lib/support-ui";

interface Group {
  key: string;
  label: string;
  roles: string[];
}

/** The built-in list, used until (or if) the live one can't be loaded. */
const FALLBACK: Group[] = ROLE_CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
  key: c.key,
  label: c.label,
  roles: ROLE_OPTIONS.filter((r) => r.category === c.key).map((r) => r.label),
}));

/**
 * Every discipline a member can pick when they sign up (read live from the same list the onboarding
 * uses, so the two never disagree), with a search box and a "can't find mine" button that opens a
 * live chat with support, with the request already written.
 */
export function DisciplineFinder() {
  const [groups, setGroups] = useState<Group[]>(FALLBACK);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    fetchOnboarding()
      .then((c) => {
        if (!alive || !c.categories.length) return;
        const live = c.categories
          .map((cat) => ({ key: cat.key, label: cat.label, roles: c.roles.filter((r) => r.category_key === cat.key).map((r) => r.label) }))
          .filter((g) => g.roles.length);
        if (live.length) setGroups(live);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, roles: query ? g.roles.filter((r) => r.toLowerCase().includes(query) || g.label.toLowerCase().includes(query)) : g.roles }))
        .filter((g) => g.roles.length),
    [groups, query]
  );
  const total = groups.reduce((n, g) => n + g.roles.length, 0);

  return (
    <div className="mt-10 rounded-2xl border border-hairline/80 bg-paper/70 p-4 backdrop-blur sm:mt-14 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-berry">Pick yours when you sign up</p>
          <h3 className="mt-1 font-display text-xl text-ink-700 sm:text-2xl">{total} disciplines, and counting</h3>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate/60" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search, e.g. Nurse, Farmer, Coach"
            aria-label="Search disciplines"
            className="h-10 w-full rounded-xl border border-hairline/80 bg-paper-dim/40 pl-8 pr-3 text-base text-ink-700 outline-none placeholder:text-slate/50 focus:border-brass sm:text-sm"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => (
          <div key={g.key}>
            <p className="border-b border-hairline/60 pb-1 text-[10px] font-bold uppercase tracking-wider text-brass-dark">
              {g.label} <span className="font-mono font-normal text-slate">({g.roles.length})</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {g.roles.map((r) => (
                <span key={r} className="rounded-full border border-hairline/80 bg-paper px-2.5 py-1 text-[12px] font-medium text-ink-700">
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-brass/30 bg-brass/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-ink-700">{query && !shown.length ? `Nothing matches "${q.trim()}".` : "Can't find your kind of work?"}</p>
          <p className="mt-0.5 text-[12px] text-slate">Tell our support team and chat with them live. We&apos;ll add it to the list.</p>
        </div>
        <button
          type="button"
          onClick={() => openSupport(missingDisciplineMessage(q))}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          <Headset className="h-4 w-4 text-brass" />
          Ask support to add it
        </button>
      </div>
    </div>
  );
}
