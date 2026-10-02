"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleDashed, FileQuestion, Send, Share2, type LucideIcon } from "lucide-react";
import { fetchHome, type HomeData, type User, type Work } from "@/lib/api";
import { firstName, greeting } from "@/lib/items";
import { AppShell, Avatar, CAPTURE_EVENT, displayName, useSession } from "@/components/app/AppShell";
import { CaptureBar, type CaptureHandle } from "@/components/app/CaptureBar";
import { ItemRow, PublishReview, ShapeSheet } from "@/components/app/Items";
import { PortfolioPreview } from "@/components/app/PortfolioPreview";
import { ActivityChart } from "@/components/app/ActivityChart";

const LIST_MAX = 4;

export default function HomePage() {
  const [user] = useSession();
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <AppShell user={user}>
      <Home user={user} />
    </AppShell>
  );
}

function Home({ user }: { user: User }) {
  const [data, setData] = useState<HomeData | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Work | null>(null);
  const [reviewing, setReviewing] = useState<Work | null>(null);
  const captureRef = useRef<CaptureHandle>(null);

  const load = useCallback(
    () =>
      fetchHome()
        .then((d) => (setData(d), setFailed(false)))
        .catch(() => setFailed(true)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // "Add" in the nav focuses the capture box.
  useEffect(() => {
    const focus = () => captureRef.current?.focus();
    window.addEventListener(CAPTURE_EVENT, focus);
    if (new URLSearchParams(window.location.search).has("capture")) {
      history.replaceState(null, "", "/home");
      setTimeout(focus, 50);
    }
    return () => window.removeEventListener(CAPTURE_EVENT, focus);
  }, []);

  const isNew = data !== null && data.counts.items === 0;
  const hello = `${greeting()}, ${firstName(displayName(user))}`;

  // PRD: a new member sees only the capture bar and one line of guidance.
  if (isNew) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-[12vh] sm:px-6">
        <h1 className="mb-6 px-1 text-[28px] font-bold tracking-tight sm:text-[34px]">{hello}</h1>
        <CaptureBar ref={captureRef} onCaptured={() => load()} />
        <p className="mt-5 px-2 text-[15px] leading-relaxed text-slate">
          Start with one thing you did, learned or solved recently. It stays private until you choose to share it.
        </p>
      </div>
    );
  }

  const lists = data
    ? ([
      { key: "keep_going", title: "Keep going", icon: CircleDashed, items: data.keep_going },
      { key: "needs_proof", title: "Needs proof", icon: FileQuestion, items: data.needs_proof },
      { key: "ready", title: "Ready to publish", icon: Send, items: data.ready },
    ] as const).filter((l) => l.items.length > 0)
    : [];

  return (
    <div className="mx-auto w-full max-w-full space-y-4 px-4 pt-6 sm:px-6 md:pt-8">
      <IdentityBanner user={user} hello={hello} data={data} />

      <div className="grid items-start gap-4 lg:grid-cols-12">
        {/* Left: act — capture, then the three action lists */}
        <div className="space-y-4 lg:col-span-8">
          <section>
            <p className="mb-2 px-1 text-[13px] font-semibold text-slate">Capture</p>
            <CaptureBar ref={captureRef} onCaptured={() => load()} />
          </section>

          {failed && data === null && (
            <div className="pf-surface rounded-2xl border border-hairline bg-paper p-6 text-center">
              <p className="text-[15px] text-slate">Couldn&apos;t load your lists. Your captures are safe.</p>
              <button type="button" onClick={() => load()} className="mt-3 rounded-lg bg-ink px-5 py-2 text-[14px] font-semibold text-paper cursor-pointer">
                Try again
              </button>
            </div>
          )}

          {data === null && !failed && (
            <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-paper" />
              ))}
            </div>
          )}

          {data &&
            (lists.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 [&>*:last-child:nth-child(odd)]:md:col-span-2">
                {lists.map((l) => (
                  <Tile key={l.key} title={l.title} icon={l.icon} count={l.items.length}>
                    <ul className="-mx-2">
                      {l.items.slice(0, LIST_MAX).map((w) => (
                        <ItemRow
                          key={w.id}
                          work={w}
                          onOpen={() => setOpen(w)}
                          action={
                            l.key === "ready" ? (
                              <button
                                type="button"
                                onClick={() => setReviewing(w)}
                                className="mr-1 h-8 shrink-0 rounded-lg bg-ink px-3.5 text-[12px] font-semibold text-paper cursor-pointer"
                              >
                                Review
                              </button>
                            ) : undefined
                          }
                        />
                      ))}
                    </ul>
                    {l.items.length > LIST_MAX && (
                      <Link href="/work" className="mt-1 block px-1 text-[13px] font-medium text-slate hover:text-ink-800">
                        {l.items.length - LIST_MAX} more in Work & Projects →
                      </Link>
                    )}
                  </Tile>
                ))}
              </div>
            ) : (
              <div className="pf-surface rounded-2xl border border-hairline bg-paper p-8 text-center text-[15px] text-slate">You&apos;re all caught up. Capture something new.</div>
            ))}
        </div>

        {/* Right: the public face and momentum */}
        <div className="space-y-4 lg:col-span-4">
          <section>
            <p className="mb-2 px-1 text-[13px] font-semibold text-slate">Public face</p>
            {data ? (
              <PortfolioPreview user={user} roles={data.portfolio.roles.length ? data.portfolio.roles : data.roles} publicCount={data.counts.public} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-paper" />
            )}
          </section>
          {data && <ActivityChart weeks={data.activity} />}
        </div>
      </div>

      {open && <ShapeSheet key={open.id} work={open} onClose={() => setOpen(null)} onSaved={() => load()} onDeleted={() => load()} />}
      {reviewing && <PublishReview work={reviewing} onClose={() => setReviewing(null)} onPublished={() => load()} />}
    </div>
  );
}

function IdentityBanner({ user, hello, data }: { user: User; hello: string; data: HomeData | null }) {
  const p = user.profile;
  const roles = data?.roles.length ? data.roles : p.headline ? [p.headline] : [];
  const stats: [string, number | undefined][] = [
    ["Followers", data?.counts.followers],
    ["Proofs", data?.counts.proofs],
    ["Public items", data?.counts.public],
    ["Days active", data?.counts.days_active],
  ];
  return (
    <section className="pf-surface rounded-2xl border border-hairline bg-paper shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={displayName(user)} src={p.avatar_url} className="h-14 w-14 text-[18px]" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{hello}</h1>
          <p className="truncate text-[14px] text-slate">{roles.length ? roles.join(" • ") : `@${p.username}`}</p>
        </div>
        <Link
          href={`/u/${p.username}`}
          target="_blank"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-hairline px-4 text-[14px] font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <Share2 className="h-4 w-4" />
          View live site
        </Link>
      </div>
      <dl className="grid grid-cols-2 border-t border-hairline sm:grid-cols-4">
        {stats.map(([label, value], i) => (
          <div key={label} className={`border-hairline px-5 py-3.5 sm:px-6 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
            <dd className="text-[20px] font-bold tabular-nums">{value ?? "–"}</dd>
            <dt className="text-[12px] text-slate">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Tile({ title, icon: Icon, count, children }: { title: string; icon: LucideIcon; count: number; children: ReactNode }) {
  return (
    <section className="flex flex-col pf-surface rounded-2xl border border-hairline bg-paper p-5 shadow-sm">
      <header className="mb-2 flex items-center gap-2.5">
        <Icon className="h-[18px] w-[18px] text-slate" />
        <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
        <span className="rounded-md bg-paper-dim px-2 py-0.5 text-[12px] tabular-nums text-slate">{count}</span>
      </header>
      {children}
    </section>
  );
}
