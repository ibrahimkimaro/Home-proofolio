"use client";

import { motion } from "motion/react";

/**
 * Progress never starts at zero — the first step already reads as partly done,
 * so the flow feels like something already underway rather than a blank slate.
 */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink-700">{label}</span>
        <span className="text-[13px] tabular-nums text-slate">{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brass-dark via-brass to-[#E6CC72]"
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
