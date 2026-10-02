import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { publicMediaUrl } from "@/lib/server-api";
import { AvatarImage } from "@/components/app/AvatarImage";
import { ShareButton } from "@/components/app/ShareButton";

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/images/home-profolio-logo.jpeg" alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
        <span className="text-[14px] font-bold tracking-tight">Proofolio</span>
      </Link>
      <div className="flex items-center gap-2">
        <ShareButton />
        <Link href="/start" className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-paper">
          Build yours
        </Link>
      </div>
    </header>
  );
}

/** Every shared page invites the next member. */
export function PublicFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-3xl px-5 pb-16 sm:px-8">
      <div className="rounded-2xl bg-paper-dim p-8 text-center">
        <p className="text-[20px] font-bold tracking-tight">Everything you do can become proof.</p>
        <p className="mt-2 text-[15px] text-slate">Keep what you learn, build and solve — and show it with evidence. Free.</p>
        <Link href="/start" className="mt-6 inline-flex rounded-lg bg-ink px-6 py-3 text-[15px] font-semibold text-paper">
          Build your proofolio
        </Link>
      </div>
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
