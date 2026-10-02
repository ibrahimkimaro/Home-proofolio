import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import type { Work } from "@/lib/api";
import { KINDS, kindOf, stateLabel } from "@/lib/items";
import { publicMediaUrl } from "@/lib/server-api";

export function ProofChips({ work }: { work: Work }) {
  if (work.evidence_links.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {work.evidence_links.map((e, i) =>
        e.visibility === "exists" ? (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-paper-dim px-3 py-1.5 text-[13px] text-slate">
            <Lock className="h-3.5 w-3.5" /> Private proof on file
          </span>
        ) : (
          <a
            key={i}
            href={publicMediaUrl(e.url) ?? e.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-1.5 text-[13px] font-medium hover:border-ink/40"
          >
            {e.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ),
      )}
    </div>
  );
}

/** BR-02: the true state is always shown next to the type. */
export function WorkCard({ work, byline }: { work: Work; byline?: React.ReactNode }) {
  const kind = kindOf(work);
  return (
    <li className="rounded-2xl border border-hairline/50 p-6 transition-colors hover:border-hairline">
      <p className="text-[13px] text-slate">
        {KINDS.find((k) => k.id === kind)?.label ?? "Work"} · {stateLabel(work.status)}
        {work.occurred_on && ` · ${new Date(`${work.occurred_on}T00:00:00`).toLocaleDateString([], { month: "short", year: "numeric" })}`}
      </p>
      <Link href={`/w/${work.id}`} className="mt-1 block text-[19px] font-semibold leading-snug hover:underline">
        {work.title}
      </Link>
      {byline}
      {work.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-[15px] leading-relaxed text-slate">{work.description}</p>}
      {work.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {work.skills.map((s) => (
            <li key={s} className="rounded-md bg-paper-dim px-2.5 py-0.5 text-[12px]">
              {s}
            </li>
          ))}
        </ul>
      )}
      <ProofChips work={work} />
    </li>
  );
}
