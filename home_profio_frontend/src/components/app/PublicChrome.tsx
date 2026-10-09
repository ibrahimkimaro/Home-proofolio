import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { publicMediaUrl } from "@/lib/server-api";
import { AvatarImage } from "@/components/app/AvatarImage";
import { ShareButton } from "@/components/app/ShareButton";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline/30 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/images/home-profolio-logo.jpeg"
            alt="Proofolio"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg object-cover ring-1 ring-hairline transition-transform group-hover:scale-105"
          />
          <span className="text-[15px] font-bold tracking-tight text-ink-900">Proofolio</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <ShareButton />
          <Link
            href="/start"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-paper shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <span>Build yours</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Every shared page invites the next member to turn their work into proof. */
export function PublicFooter() {
  return (
    <footer className="mx-auto mt-20 max-w-3xl px-4 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-hairline/60 bg-gradient-to-b from-paper via-paper-dim/40 to-paper-dim/70 p-8 text-center shadow-lg transition-all hover:shadow-xl sm:p-12">
        {/* Ambient subtle glow background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-48 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span>The Proof-Based Portfolio Network</span>
          </div>

          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Everything you do can become proof.
          </h2>

          <p className="mx-auto mt-2.5 max-w-lg text-[15px] leading-relaxed text-slate sm:text-base">
            Keep what you learn, build and solve — and show it with evidence. Free.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/start"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-[15px] font-bold text-paper shadow-md transition-all hover:shadow-lg active:scale-95"
            >
              <span>Build your proofolio</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Free forever
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Evidence-backed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Set up in 2 minutes
            </span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate">
        Home Proofolio · Where real craft speaks for itself.
      </p>
    </footer>
  );
}

export function PublicAvatar({ name, src, className }: { name: string; src: string | null | undefined; className: string }) {
  return <AvatarImage name={name} url={publicMediaUrl(src)} className={className} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`pf-surface rounded-2xl border border-hairline/50 bg-paper p-6 sm:p-8 ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-slate">{children}</h2>;
}
