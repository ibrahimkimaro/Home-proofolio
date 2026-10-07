"use client";

import Link from "next/link";
import { FileCheck2, Lock, MessagesSquare, QrCode, Video } from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * The classic page's take on two scenes from the main landing page: the self-signing CV and
 * connecting with people (share, talk, call), plus the "free to start" pricing note.
 */

const CV_INTRO =
  "Your CV fills itself from what you've done, you sign it to make it valid, and anyone can open it from a link or a QR code.";
const CONNECT_INTRO =
  "Share a public page, or a signed CV as a link or QR code. Message, call and work with the people you meet along the way.";
const CONNECT_SPECS: [string, string][] = [
  ["Share", "Link or QR code"],
  ["Talk", "Direct and group chat"],
  ["Calls", "Voice and video"],
];
const PRICING_NOTE = "Free to start. Everything you add is private until you choose to share it.";

const CONNECT_ICONS = [QrCode, MessagesSquare, Video];

export function CvConnect() {
  return (
    <section id="connect" className="relative overflow-hidden bg-paper-dim/60 px-4 py-16 sm:px-5 sm:py-24 md:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        <div className="dotgrid absolute inset-0 opacity-30" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
        <Reveal className="h-full">
          <div className="flex h-full flex-col rounded-2xl border border-hairline/80 bg-paper/80 p-6 shadow-2xs backdrop-blur-xl sm:p-8">
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-berry sm:text-[13px]">
              <FileCheck2 className="h-3.5 w-3.5" />
              Your CV
            </p>
            <h2 className="mt-2 font-display text-2xl text-ink-700 sm:text-3xl md:text-4xl">A CV that proves itself.</h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-slate sm:text-[16px]">{CV_INTRO}</p>
            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Fills itself from your proofs", "You sign it to make it valid", "Opens from a link or QR code"].map((step, i) => (
                <li key={step} className="rounded-xl border border-hairline/80 bg-paper-dim/60 p-3.5">
                  <span className="font-mono text-[11px] text-brass-dark">0{i + 1}</span>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-ink-700">{step}</p>
                </li>
              ))}
            </ol>

            {/* a signed CV, as the person receiving the link sees it */}
            <div className="mt-6 flex items-center gap-4 rounded-xl border border-hairline/80 bg-paper p-4 shadow-2xs lg:mt-auto">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-hairline bg-paper-dim text-ink-700">
                <QrCode className="h-10 w-10" aria-hidden />
              </div>
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold text-ink-700">Amina Hassan · CV, version 3</p>
                <p className="mt-0.5 truncate text-slate">18 proofs · each line links to its evidence</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                  Signed by Amina
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="h-full">
          <div className="flex h-full flex-col rounded-2xl border border-white/15 bg-ink p-6 text-paper shadow-2xl ring-1 ring-white/10 sm:p-8">
            <p className="text-[12px] font-medium text-brass sm:text-[13px]">Connect</p>
            <h2 className="mt-2 font-display text-2xl text-paper sm:text-3xl md:text-4xl">Be found for what you actually did.</h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-mist sm:text-[16px]">{CONNECT_INTRO}</p>
            <dl className="mt-6 grid gap-4 border-t border-white/10 pb-6 pt-5 sm:grid-cols-3">
              {CONNECT_SPECS.map(([k, v], i) => {
                const Icon = CONNECT_ICONS[i];
                return (
                  <div key={k}>
                    <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-mist-dim">
                      <Icon className="h-3.5 w-3.5 text-brass" aria-hidden />
                      {k}
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold text-paper">{v}</dd>
                  </div>
                );
              })}
            </dl>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
              <p className="inline-flex max-w-xs items-start gap-2 text-[13px] text-mist">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                {PRICING_NOTE}
              </p>
              <Link href="/start" className="rounded-full bg-brass px-6 py-3 text-[14px] font-bold text-ink transition hover:scale-105 hover:bg-brass-dark">
                Start free
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
