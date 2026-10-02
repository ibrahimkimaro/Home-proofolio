"use client";

import { useState } from "react";
import { Briefcase, Trash2 } from "lucide-react";
import {
  deleteAdminWork,
  updateAdminWork,
  type AdminWork,
  type Visibility,
  type WorkStatus,
} from "@/lib/api";
import { KINDS, LIFECYCLES, kindOf, stateLabel, type Kind } from "@/lib/items";
import { ConfirmButton, EmptyRow, FilterSelect, Panel, SearchInput, formatDate, td, th } from "./ui";

const VISIBILITIES: Visibility[] = ["public", "unlisted", "private", "draft"];

export function WorksSection({
  works,
  onChanged,
  onError,
}: {
  works: AdminWork[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Kind | "all">("all");
  const [visibility, setVisibility] = useState<Visibility | "all">("all");

  const q = query.toLowerCase();
  const rows = works.filter(
    (w) =>
      (status === "all" || kindOf(w) === status) &&
      (visibility === "all" || w.visibility === visibility) &&
      [w.title, w.owner_username, w.owner_fullname, w.work_type, ...w.skills].some((v) => v.toLowerCase().includes(q)),
  );

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Action failed");
    }
  }

  const selectCls = "input !h-8 !rounded-lg !px-2 pr-7 text-[12px]";

  return (
    <Panel
      icon={Briefcase}
      title="All works & proofs"
      subtitle={`${rows.length} of ${works.length} shown`}
      actions={
        <>
          <FilterSelect
            label="Filter by type"
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: "Any type" }, { value: "capture", label: "Not shaped" }, ...KINDS.map((k) => ({ value: k.id, label: k.label }))]}
          />
          <FilterSelect
            label="Filter by visibility"
            value={visibility}
            onChange={setVisibility}
            options={[{ value: "all", label: "Any visibility" }, ...VISIBILITIES.map((v) => ({ value: v, label: cap(v) }))]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search works…" />
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b border-hairline/70">
              <th className={th}>Work</th>
              <th className={th}>Owner</th>
              <th className={th}>State</th>
              <th className={th}>Visibility</th>
              <th className={th}>Updated</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6}>{works.length ? "No works match these filters." : "No works have been recorded yet."}</EmptyRow>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-paper-dim/60">
                  <td className={`${td} max-w-[280px]`}>
                    <p className="truncate font-semibold text-ink-800">{w.title}</p>
                    <p className="truncate text-[12px] text-slate">
                      {w.work_type}
                      {w.skills.length > 0 && ` · ${w.skills.slice(0, 3).join(", ")}`}
                    </p>
                  </td>
                  <td className={td}>
                    <p className="truncate text-ink-700">{w.owner_fullname}</p>
                    <p className="font-mono text-[12px] text-slate">@{w.owner_username}</p>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Status of ${w.title}`}
                      value={w.status}
                      onChange={(e) => run(() => updateAdminWork(w.id, { status: e.target.value as WorkStatus }))}
                      className={selectCls}
                    >
                      {LIFECYCLES[kindOf(w)].map((s) => (
                        <option key={s} value={s}>
                          {stateLabel(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Visibility of ${w.title}`}
                      value={w.visibility}
                      onChange={(e) => run(() => updateAdminWork(w.id, { visibility: e.target.value as Visibility }))}
                      className={selectCls}
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {cap(v)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate`}>{formatDate(w.updated_at)}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <ConfirmButton danger title="Delete work item" confirmLabel="Delete?" onConfirm={() => run(() => deleteAdminWork(w.id))}>
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

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
