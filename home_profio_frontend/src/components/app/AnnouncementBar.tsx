"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Info, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { fetchPlatform, type Announcement } from "@/lib/api";

const TONE = {
  info: { icon: Info, cls: "border-sky-500/30 bg-sky-500/10" },
  success: { icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/10" },
  warning: { icon: AlertTriangle, cls: "border-amber-500/30 bg-amber-500/10" },
} as const;

const KEY = "proofolio-dismissed-announcement";

/** Admin > Platform > Announcement. Dismissing hides this exact message; a new message shows again. */
export function AnnouncementBar() {
  const [a, setA] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchPlatform()
      .then(({ announcement }) => {
        let dismissed: string | null = null;
        try {
          dismissed = localStorage.getItem(KEY);
        } catch {}
        if (announcement && dismissed !== announcement.text) setA(announcement);
      })
      .catch(() => {});
  }, []);

  if (!a) return null;
  const { icon: Icon, cls } = TONE[a.tone] ?? TONE.info;
  return (
    <div role="status" className={`mx-4 mt-4 flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[14px] text-ink-800 sm:mx-6 ${cls}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">{a.text}</p>
      {a.link && (
        <Link href={a.link} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold hover:underline">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          try {
            localStorage.setItem(KEY, a.text);
          } catch {}
          setA(null);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-black/5 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
