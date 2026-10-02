import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeCheck, Mail } from "lucide-react";
import type { PortfolioSection, PublicProfile, Work } from "@/lib/api";
import { getPublicProfile, publicMediaUrl, SITE_URL } from "@/lib/server-api";
import { formatMonth } from "@/lib/items";
import { Card, PublicAvatar, PublicFooter, PublicHeader, SectionTitle } from "@/components/app/PublicChrome";
import { FollowButton } from "@/components/app/FollowButton";
import { WorkCard } from "@/components/app/WorkCard";
import MyPortfolio from "@/app/portfolio/My_portfolio";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await getPublicProfile(username);
  if (!p) return { title: "Not found · Home Proofolio", robots: { index: false } };
  const title = `${p.display_name} · Home Proofolio`;
  const proofs = p.works.reduce((n, w) => n + w.evidence_links.length, 0);
  const description = p.portfolio.tagline || p.headline || p.bio?.slice(0, 160) || `${p.works.length} pieces of work, ${proofs} proofs.`;
  const image = publicMediaUrl(p.avatar_url);
  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `/u/${p.username}` },
    // Settings > Privacy: the member can ask search engines not to list them.
    robots: p.allow_indexing ? undefined : { index: false, follow: false },
    openGraph: { title, description, type: "profile", url: `/u/${p.username}`, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const p = await getPublicProfile(username);
  if (!p) notFound();

  return <MyPortfolio publicProfile={p} />;
}

/** Each portfolio section, rendered in the order (and only if) the member chose it. */
function profileSections(p: PublicProfile): Record<PortfolioSection, ReactNode> {
  const pf = p.portfolio;
  const works = [
    ...pf.featured.map((id) => p.works.find((w) => w.id === id)).filter((w): w is Work => !!w),
    ...p.works.filter((w) => !pf.featured.includes(w.id)),
  ];
  return {
    about:
      p.bio || p.skills.length > 0 ? (
        <Card>
          <SectionTitle>About</SectionTitle>
          {p.bio && <p className="max-w-xl whitespace-pre-line text-[16px] leading-relaxed">{p.bio}</p>}
          {p.skills.length > 0 && (
            <ul className={`flex flex-wrap gap-2 ${p.bio ? "mt-5" : ""}`} aria-label="Skills">
              {p.skills.map((s) => (
                <li key={s.name} className="rounded-md border border-hairline bg-paper-dim px-3 py-1.5 text-[14px]">
                  {s.name}
                  <span className="ml-1.5 text-[12px] text-slate">
                    {s.proofs > 0 ? `${s.proofs} ${s.proofs === 1 ? "proof" : "proofs"}` : `${s.works} ${s.works === 1 ? "work" : "works"}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null,
    experience: p.roles.length > 0 ? <RolesCard roles={p.roles} /> : null,
    works: (
      <section aria-label="Work" className="pt-4">
        <SectionTitle>Selected works</SectionTitle>
        {works.length === 0 ? (
          <p className="text-[15px] text-slate">Nothing shared yet.</p>
        ) : (
          <ul className="space-y-3">
            {works.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </ul>
        )}
      </section>
    ),
    contact: pf.contact_email ? (
      <Card>
        <SectionTitle>Contact</SectionTitle>
        <a href={`mailto:${pf.contact_email}`} className="inline-flex items-center gap-2 text-[16px] font-medium hover:underline">
          <Mail className="h-4 w-4" /> {pf.contact_email}
        </a>
      </Card>
    ) : null,
  };
}

function RolesCard({ roles }: { roles: PublicProfile["roles"] }) {
  return (
    <Card>
      <SectionTitle>Experience</SectionTitle>
      <ul className="space-y-4">
        {roles.map((r, i) => (
          <li key={i} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[16px] font-semibold">
                {r.title}
                {r.organization && (
                  <>
                    <span className="font-normal text-slate"> at </span>
                    {r.business_slug ? (
                      <Link href={`/b/${r.business_slug}`} className="hover:underline">
                        {r.organization}
                      </Link>
                    ) : (
                      r.organization
                    )}
                  </>
                )}
              </p>
              <p className="text-[13px] text-slate">
                {r.start_date ? formatMonth(r.start_date) : ""}
                {r.start_date && " – "}
                {r.current ? "Present" : formatMonth(r.end_date)}
              </p>
            </div>
            {r.business_slug && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-slate">
                {r.trust === "confirmed" && <BadgeCheck className="h-4 w-4 text-ink-800" />}
                {r.trust === "confirmed" ? "Confirmed" : "Self-declared"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
