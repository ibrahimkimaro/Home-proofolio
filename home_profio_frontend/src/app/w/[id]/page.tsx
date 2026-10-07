import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicWork, getTemplates, SITE_URL } from "@/lib/server-api";
import { KINDS, kindOf, stateLabel } from "@/lib/items";
import { Card, PublicAvatar, PublicFooter, PublicHeader, SectionTitle } from "@/components/app/PublicChrome";
import { FollowButton } from "@/components/app/FollowButton";
import { BackToPortfolio, WorkEngagement } from "@/components/app/Engage";
import { ProofChips } from "@/components/app/WorkCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await getPublicWork(id);
  if (!d) return { title: "Not found · Home Proofolio", robots: { index: false } };
  const title = `${d.work.title} · ${d.owner.display_name}`;
  const description = d.work.description?.slice(0, 160) || `${KINDS.find((k) => k.id === kindOf(d.work))?.label} by ${d.owner.display_name} on Home Proofolio.`;
  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    // Unlisted work is reachable by link but kept out of search engines (rule 3).
    robots: d.work.visibility === "public" ? undefined : { index: false },
    openGraph: { title, description, type: "article", url: `/w/${d.work.id}` },
  };
}

function display(v: unknown) {
  return Array.isArray(v) ? v.join(", ") : String(v);
}

export default async function PublicWorkPage({ params }: Props) {
  const { id } = await params;
  const d = await getPublicWork(id);
  if (!d) notFound();
  const { work, owner, source } = d;
  const kind = kindOf(work);
  const templates = await getTemplates();
  const tpl = templates.find((t) => t.key === (kind === "work" ? work.template : kind));
  const attrs = work.custom_attributes as Record<string, unknown>;
  const details = [
    ...(tpl?.fields ?? []).filter((f) => attrs[f.key] !== undefined && attrs[f.key] !== "").map((f) => ({ label: f.label, value: display(attrs[f.key]) })),
    ...(((attrs.custom as { label: string; value: string }[]) ?? []).map((c) => ({ label: c.label, value: c.value }))),
  ];

  return (
    <div className="theme-mono pf-ambient min-h-screen bg-paper text-ink-800">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-4 sm:px-8">
        <BackToPortfolio username={owner.username} name={owner.display_name} className="max-w-full" />
        <Card>
          <p className="text-[14px] text-slate">
            {KINDS.find((k) => k.id === kind)?.label}
            {tpl && kind === "work" && ` · ${tpl.label}`} · <span className="font-medium text-ink-800">{stateLabel(work.status)}</span>
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{work.title}</h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <Link href={`/u/${owner.username}`} className="flex items-center gap-3">
              <PublicAvatar name={owner.display_name} src={owner.avatar_url} className="h-10 w-10 text-[14px]" />
              <span>
                <span className="block text-[15px] font-semibold">{owner.display_name}</span>
                <span className="block text-[13px] text-slate">
                  {work.context_role ? `${work.context_role} · ` : ""}
                  {new Date(`${work.occurred_on ?? work.created_at.slice(0, 10)}T00:00:00`).toLocaleDateString([], { month: "long", year: "numeric" })}
                </span>
              </span>
            </Link>
            <FollowButton kind="work" target={work.id} />
          </div>
          {work.description && <p className="mt-6 whitespace-pre-line text-[16px] leading-relaxed">{work.description}</p>}
          {work.skills.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {work.skills.map((s) => (
                <li key={s} className="rounded-md bg-paper-dim px-3 py-1 text-[13px]">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {details.length > 0 && (
          <Card>
            <SectionTitle>Details</SectionTitle>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {details.map((row) => (
                <div key={row.label}>
                  <dt className="text-[13px] text-slate">{row.label}</dt>
                  <dd className="mt-0.5 break-words text-[15px]">
                    {/^https?:\/\//.test(row.value) ? (
                      <a href={row.value} target="_blank" rel="noreferrer nofollow" className="underline">
                        {row.value.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <Card>
          <SectionTitle>Proof</SectionTitle>
          {work.evidence_links.length === 0 ? <p className="text-[15px] text-slate">No public proof attached yet.</p> : <ProofChips work={work} />}
        </Card>

        {source && (
          <Card>
            <SectionTitle>How it grew</SectionTitle>
            <p className="text-[15px]">
              Started as {kindOf(source) === "learning" ? "an idea" : "an item"}:{" "}
              <Link href={`/w/${source.id}`} className="font-semibold hover:underline">
                {source.title}
              </Link>
            </p>
          </Card>
        )}
        <WorkEngagement workId={work.id} title={work.title} />

        <div className="flex justify-center pt-2">
          <BackToPortfolio username={owner.username} name={owner.display_name} className="max-w-full" />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
