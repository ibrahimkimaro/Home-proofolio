import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getPublicBusiness, SITE_URL } from "@/lib/server-api";
import { Card, PublicAvatar, PublicFooter, PublicHeader, SectionTitle } from "@/components/app/PublicChrome";
import { FollowButton } from "@/components/app/FollowButton";
import { WorkCard } from "@/components/app/WorkCard";

type Props = { params: Promise<{ slug: string }> };

const TYPE_LABEL = { business: "Business", school: "School", club: "Club", ngo: "NGO", other: "Organization" } as const;
// FR-ORG-02: interface wording follows the type.
const TEAM_LABEL = { business: "Team", school: "Staff and students", club: "Members", ngo: "Team", other: "People" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  if (!b) return { title: "Not found · Home Proofolio", robots: { index: false } };
  const title = `${b.name} · Home Proofolio`;
  const description = b.description?.slice(0, 160) || `${TYPE_LABEL[b.type]} on Home Proofolio.`;
  return { title, description, metadataBase: new URL(SITE_URL), openGraph: { title, description, url: `/b/${b.slug}` } };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  if (!b) notFound();
  const c = b.contact ?? {};

  return (
    <div className="theme-mono pf-ambient min-h-screen bg-paper text-ink-800">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-5 sm:px-8">
        <section className="overflow-hidden rounded-2xl border border-hairline/50">
          <div className="h-24 cover-mono" />
          <div className="px-6 pb-8 sm:px-10">
            <div className="flex items-end justify-between gap-4">
              <PublicAvatar name={b.name} src={null} className="-mt-10 h-20 w-20 rounded-xl text-[24px] ring-4 ring-paper" />
              <FollowButton kind="business" target={b.slug} />
            </div>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-slate">{TYPE_LABEL[b.type]}</p>
            <h1 className="mt-1 text-[30px] font-bold tracking-tight sm:text-[38px]">{b.name}</h1>
            <p className="mt-1 text-[14px] text-slate">
              {b.followers} {b.followers === 1 ? "follower" : "followers"}
            </p>
            {b.description && <p className="mt-5 max-w-xl whitespace-pre-line text-[16px] leading-relaxed">{b.description}</p>}
          </div>
        </section>

        {b.offerings && b.offerings.length > 0 && (
          <Card>
            <SectionTitle>Services and products</SectionTitle>
            <ul className="divide-y divide-hairline/60">
              {b.offerings.map((o, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[16px] font-semibold">{o.name}</p>
                    {o.description && <p className="text-[14px] text-slate">{o.description}</p>}
                    <p className="mt-0.5 text-[12px] text-slate">{o.kind === "product" ? "Product" : "Service"}</p>
                  </div>
                  {o.price && <p className="shrink-0 text-[15px] font-medium">{o.price}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {b.team && b.team.length > 0 && (
          <Card>
            <SectionTitle>{TEAM_LABEL[b.type]}</SectionTitle>
            <ul className="grid gap-4 sm:grid-cols-2">
              {b.team.map((m) => (
                <li key={`${m.username}-${m.title}`}>
                  <Link href={`/u/${m.username}`} className="flex items-center gap-3">
                    <PublicAvatar name={m.display_name} src={m.avatar_url} className="h-11 w-11 text-[14px]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{m.display_name}</span>
                      <span className="flex items-center gap-1 text-[13px] text-slate">
                        {m.title}
                        {!m.current && " (past)"}
                        {m.trust === "confirmed" ? (
                          <BadgeCheck className="h-3.5 w-3.5 text-ink-800" aria-label="Confirmed" />
                        ) : (
                          <span className="text-[11px]">· self-declared</span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {b.projects && b.projects.length > 0 && (
          <section className="pt-4">
            <SectionTitle>Projects</SectionTitle>
            <ul className="space-y-3">
              {b.projects.map((p) => (
                <WorkCard
                  key={p.work.id}
                  work={p.work}
                  byline={
                    <p className="text-[13px] text-slate">
                      by{" "}
                      <Link href={`/u/${p.author.username}`} className="font-medium text-ink-800 hover:underline">
                        {p.author.display_name}
                      </Link>
                    </p>
                  }
                />
              ))}
            </ul>
          </section>
        )}

        {Object.keys(c).length > 0 && (
          <Card>
            <SectionTitle>Contact</SectionTitle>
            <ul className="space-y-3 text-[15px]">
              {c.phone && (
                <li>
                  <a href={`tel:${c.phone}`} className="flex items-center gap-3 hover:underline">
                    <Phone className="h-4 w-4 text-slate" /> {c.phone}
                  </a>
                </li>
              )}
              {c.whatsapp && (
                <li>
                  <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline">
                    <MessageCircle className="h-4 w-4 text-slate" /> WhatsApp {c.whatsapp}
                  </a>
                </li>
              )}
              {c.email && (
                <li>
                  <a href={`mailto:${c.email}`} className="flex items-center gap-3 hover:underline">
                    <Mail className="h-4 w-4 text-slate" /> {c.email}
                  </a>
                </li>
              )}
              {c.location && (
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate" /> {c.location}
                </li>
              )}
            </ul>
          </Card>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
