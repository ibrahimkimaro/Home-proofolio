"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { ArrowUpRight, Globe, Lock, SlidersHorizontal } from "lucide-react";
import type { User } from "@/lib/api";
import { Avatar, displayName } from "@/components/app/AppShell";

/** A living miniature of the public portfolio. Tapping it opens the customize page. */
export function PortfolioPreview({ user, roles, publicCount }: { user: User; roles: string[]; publicCount: number }) {
  const reduce = useReducedMotionConfig();
  const [i, setI] = useState(0);
  const p = user.profile;
  const titles = roles.length ? roles : [p.headline || `@${p.username}`];
  const isLive = p.visibility === "public" || p.visibility === "unlisted";

  useEffect(() => {
    if (reduce || titles.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % titles.length), 2400);
    return () => clearInterval(t);
  }, [reduce, titles.length]);

  return (
    <Link
      href="/portfolio"
      aria-label="Customize your public portfolio"
      className="group flex flex-col pf-surface rounded-2xl border border-hairline bg-paper p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Mini browser frame */}
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-paper-dim">
        <span aria-hidden="true" className="pf-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-paper/90 to-transparent" />
        <div className="mx-auto mt-2.5 flex w-fit items-center gap-2 rounded-md border border-hairline bg-paper px-2.5 py-1">
          {[10, 14, 12, 16].map((w, k) => (
            <span key={k} className="h-1 rounded-sm bg-hairline" style={{ width: w }} />
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 pt-4">
          <Avatar name={displayName(user)} src={p.avatar_url} className="h-10 w-10 text-[12px] ring-2 ring-paper" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">{displayName(user)}</p>
            <div className="relative h-4 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={i}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="truncate text-[11px] uppercase tracking-wider text-slate"
                >
                  {titles[i % titles.length]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Alternating center-spine timeline, in miniature */}
        <div className="relative mx-4 mb-4 mt-3 h-24">
          <span aria-hidden="true" className="pf-spine absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/40" />
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              aria-hidden="true"
              className="pf-card absolute flex w-[44%] items-center"
              style={{ top: k * 32, [k % 2 ? "right" : "left"]: 0, animationDelay: `${0.4 + k * 0.45}s`, flexDirection: k % 2 ? "row-reverse" : "row" }}
            >
              <span className="flex-1 space-y-1 rounded-md border border-hairline bg-paper p-1.5">
                <span className="block h-1 w-3/4 rounded-sm bg-ink/70" />
                <span className="block h-1 w-1/2 rounded-sm bg-hairline" />
              </span>
              <span className="h-px w-2 bg-ink/40" />
              <span className={`h-2 w-2 shrink-0 rounded-full border-2 border-ink bg-paper ${k % 2 ? "-mr-1" : "-ml-1"} translate-x-0`} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">Your portfolio</p>
          <p className="flex items-center gap-1 text-[12px] text-slate">
            {isLive ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isLive ? `Live · ${publicCount} public ${publicCount === 1 ? "item" : "items"}` : "Private — publish to share"}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[13px] font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Customize
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
