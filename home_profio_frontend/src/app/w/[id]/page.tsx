import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";
import { getPublicWork, getTemplates, publicMediaUrl, SITE_URL } from "@/lib/server-api";
import { KINDS, kindOf, stateLabel } from "@/lib/items";
import { Card, PublicAvatar, PublicFooter, PublicHeader, SectionTitle } from "@/components/app/PublicChrome";
import { FollowButton } from "@/components/app/FollowButton";
import { WorkEngagement } from "@/components/app/Engage";
import { VisitorReturnBar } from "@/components/app/VisitorReturnBar";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await getPublicWork(id);
  if (!d) return { title: "Not found · Home Proofolio", robots: { index: false } };
  const title = `${d.work.title} · ${d.owner.display_name}`;
  const description =
    d.work.description?.slice(0, 160) ||
    `${KINDS.find((k) => k.id === kindOf(d.work))?.label} by ${d.owner.display_name} on Home Proofolio.`;
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
  const attrs = (work.custom_attributes as Record<string, unknown>) ?? {};
  const details = [
    ...(tpl?.fields ?? [])
      .filter((f) => attrs[f.key] !== undefined && attrs[f.key] !== "")
      .map((f) => ({ label: f.label, value: display(attrs[f.key]) })),
    ...(((attrs.custom as { label: string; value: string }[]) ?? []).map((c) => ({
      label: c.label,
      value: c.value,
    }))),
  ];

  return (
    <div className="theme-mono pf-ambient min-h-screen bg-paper text-ink-800">
      <VisitorReturnBar profileUsername={owner.username} />
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-4 sm:px-8">
        {/* Sleek Breadcrumb Navigation */}
        <div className="flex items-center justify-between pb-1">
          <Link
            href={`/u/${owner.username}`}
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-slate transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Portfolio</span>
            <span className="text-slate/40">/</span>
            <span className="font-semibold text-ink-900 group-hover:underline">{owner.display_name}</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Verified Evidence</span>
          </div>
        </div>

        {/* Hero Work Showcase Card */}
        <Card className="p-6 sm:p-9">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-paper-dim px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-900">
              {KINDS.find((k) => k.id === kind)?.label ?? "Work"}
            </span>
            {tpl && kind === "work" && (
              <span className="inline-flex items-center rounded-lg border border-hairline/80 px-2.5 py-1 text-xs font-medium text-slate">
                {tpl.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {stateLabel(work.status)}
            </span>
            {work.occurred_on && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(`${work.occurred_on}T00:00:00`).toLocaleDateString([], {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[34px]">
            {work.title}
          </h1>

          {/* Author Byline Row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-hairline/40 py-3.5">
            <Link href={`/u/${owner.username}`} className="group flex items-center gap-3">
              <PublicAvatar
                name={owner.display_name}
                src={owner.avatar_url}
                className="h-11 w-11 rounded-full text-[14px] ring-2 ring-hairline/80 transition-transform group-hover:scale-105"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-ink-900 group-hover:underline">
                    {owner.display_name}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="text-[13px] text-slate">
                  @{owner.username}
                  {work.context_role ? ` · ${work.context_role}` : ""}
                </span>
              </div>
            </Link>
            <FollowButton kind="work" target={work.id} />
          </div>

          {/* Description */}
          {work.description && (
            <div className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink-800 sm:text-[16px]">
              {work.description}
            </div>
          )}

          {/* Skills */}
          {work.skills.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate">
                Skills & Technologies
              </p>
              <ul className="flex flex-wrap gap-2">
                {work.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-lg border border-hairline/60 bg-paper-dim/60 px-3 py-1 text-xs font-semibold text-ink-900 transition-colors hover:bg-paper-dim"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Technical Details */}
        {details.length > 0 && (
          <Card>
            <SectionTitle>Technical Specifications</SectionTitle>
            <dl className="grid gap-3.5 sm:grid-cols-2">
              {details.map((row) => (
                <div key={row.label} className="rounded-xl border border-hairline/40 bg-paper-dim/30 p-3.5">
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-slate">{row.label}</dt>
                  <dd className="mt-1 break-words text-[14px] font-semibold text-ink-900">
                    {/^https?:\/\//.test(row.value) ? (
                      <a
                        href={row.value}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="inline-flex items-center gap-1 underline hover:opacity-80"
                      >
                        <span>{row.value.replace(/^https?:\/\/(www\.)?/, "")}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
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

        {/* Verified Proof & Evidence */}
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle>Verified Proof & Evidence</SectionTitle>
            {work.evidence_links.length > 0 && (
              <span className="text-xs font-medium text-slate">
                {work.evidence_links.length}{" "}
                {work.evidence_links.length === 1 ? "proof artifact" : "proof artifacts"}
              </span>
            )}
          </div>
          {work.evidence_links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline/80 p-6 text-center text-slate">
              <FileText className="mx-auto mb-2 h-7 w-7 text-slate/40" />
              <p className="text-[14px]">No public proof links attached to this item yet.</p>
            </div>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {work.evidence_links.map((e, i) =>
                e.visibility === "exists" ? (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-hairline/60 bg-paper-dim/40 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-dim text-slate">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink-900">{e.label || "Confidential Evidence"}</p>
                      <p className="text-[12px] text-slate">Verified private proof on record</p>
                    </div>
                    <span className="rounded-full border border-hairline bg-paper px-2.5 py-0.5 text-[11px] font-medium text-slate">
                      Private
                    </span>
                  </div>
                ) : (
                  <a
                    key={i}
                    href={publicMediaUrl(e.url) ?? e.url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="group flex items-center gap-3.5 rounded-xl border border-hairline/60 bg-paper-dim/20 p-4 transition-all hover:border-ink/40 hover:bg-paper-dim/60 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-900 shadow-2xs transition-transform group-hover:scale-105">
                      {e.url.includes("github.com") ? (
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      ) : e.type === "document" || e.url.endsWith(".pdf") ? (
                        <FileText className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Globe className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[14px] font-bold text-ink-900 group-hover:text-ink">
                          {e.label || "Proof Artifact"}
                        </p>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                      </div>
                      <p className="truncate text-[12px] text-slate">
                        {e.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </p>
                    </div>
                  </a>
                ),
              )}
            </div>
          )}
        </Card>

        {/* How it grew */}
        {source && (
          <Card>
            <SectionTitle>How it grew</SectionTitle>
            <p className="text-[15px]">
              Started as {kindOf(source) === "learning" ? "an idea" : "an item"}:{" "}
              <Link href={`/w/${source.id}`} className="font-semibold hover:underline">
                {source.title} →
              </Link>
            </p>
          </Card>
        )}

        {/* Creator Spotlight / Full Portfolio Link */}
        <div className="rounded-2xl border border-hairline/60 bg-paper-dim/40 p-6 sm:p-7">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <PublicAvatar
                name={owner.display_name}
                src={owner.avatar_url}
                className="h-13 w-13 rounded-full text-base font-bold ring-2 ring-hairline/80"
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate">Creator Portfolio</p>
                <h3 className="text-[17px] font-bold text-ink-900">{owner.display_name}</h3>
                <p className="text-xs text-slate">
                  @{owner.username}
                  {work.context_role ? ` · ${work.context_role}` : ""}
                </p>
              </div>
            </div>
            <Link
              href={`/u/${owner.username}`}
              className="group inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-paper shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <span>Explore full portfolio</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Work Community Engagement (Stars & Comments) */}
        <WorkEngagement workId={work.id} title={work.title} />
      </main>

      {/* Redesigned High-Impact Proofolio Footer */}
      <PublicFooter />
    </div>
  );
}
