"use client";

import { useReducedMotion } from "motion/react";

/**
 * The three devices that sit in front of the laptop in the hero: a phone, a smartwatch and a
 * pair of smart glasses. They are drawn with SVG and sized in container-query units (cqw) so
 * they scale as one picture with the rendered plate behind them instead of drifting out of
 * alignment. They float on their own so the scene has some life; that stops for anyone who
 * asks for reduced motion.
 */

type DeviceProps = { className?: string };

/** Small profile portrait, matching the one on the laptop screen. */
function Face({ className = "" }: DeviceProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <clipPath id="face-clip">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
        <radialGradient id="face-skin" cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#a56c47" />
          <stop offset="0.7" stopColor="#8a5738" />
          <stop offset="1" stopColor="#6e4329" />
        </radialGradient>
      </defs>
      <g clipPath="url(#face-clip)">
        <rect width="120" height="120" fill="#2d4459" />
        <path d="M6 120 C10 98 34 90 60 90 C86 90 110 98 114 120 Z" fill="#1c2027" />
        <path d="M44 90 L60 112 L76 90 L68 86 L60 96 L52 86 Z" fill="#f2f2f0" />
        <ellipse cx="60" cy="54" rx="24" ry="29" fill="url(#face-skin)" />
        <path d="M35.5 48 C33 24 48 14 61 14 C78 14 89 27 84.5 48 C82 38 75 32 60 32 C46 32 38.5 38 35.5 48 Z" fill="#14100d" />
        <ellipse cx="49.5" cy="50" rx="4.4" ry="2.7" fill="#f3ece4" />
        <ellipse cx="70.5" cy="50" rx="4.4" ry="2.7" fill="#f3ece4" />
        <circle cx="49.9" cy="50" r="2.2" fill="#2a170c" />
        <circle cx="70.9" cy="50" r="2.2" fill="#2a170c" />
        <path d="M53.5 69 C57 71.6 63 71.6 66.5 69" stroke="#3a1a12" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/** Phone showing the profile and a verified milestone. */
export function HeroPhone({ className = "" }: DeviceProps) {
  return (
    <div className={className}>
      <div className="rounded-[1.7cqw] border-[0.16cqw] border-[#3a3f47] bg-[#0b0f14] p-[0.22cqw] shadow-[0_2.4cqw_3.4cqw_-0.9cqw_rgba(0,0,0,0.85)]">
        <div className="relative overflow-hidden rounded-[1.45cqw] bg-[#0d141d]">
          {/* notch */}
          <div className="absolute left-1/2 top-[0.35cqw] h-[0.5cqw] w-[3.4cqw] -translate-x-1/2 rounded-full bg-black/85" />
          <div className="flex flex-col gap-[0.7cqw] px-[1.05cqw] pb-[1.2cqw] pt-[1.5cqw]">
            <div className="flex items-center gap-[0.6cqw]">
              <Face className="h-[2.6cqw] w-[2.6cqw] rounded-full" />
              <div className="min-w-0">
                <p className="truncate font-bold leading-tight text-white" style={{ fontSize: "0.82cqw" }}>
                  Ibrahim K.
                </p>
                <p className="truncate text-white/55" style={{ fontSize: "0.6cqw" }}>
                  Chief Product Architect
                </p>
              </div>
            </div>

            <div className="rounded-[0.6cqw] border border-emerald-400/25 bg-emerald-400/10 px-[0.7cqw] py-[0.5cqw]">
              <p className="font-semibold uppercase tracking-[0.12em] text-emerald-300" style={{ fontSize: "0.5cqw" }}>
                Verified
              </p>
              <p className="font-bold leading-tight text-white" style={{ fontSize: "0.78cqw" }}>
                12 proofs this month
              </p>
            </div>

            {/* tiny bar chart */}
            <div className="flex h-[3cqw] items-end gap-[0.28cqw]">
              {[38, 55, 44, 72, 60, 88, 66, 96].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[0.12cqw] bg-gradient-to-t from-[#2d6a9f] to-[#6fb1e0]"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>

            <div className="space-y-[0.35cqw]">
              {["Cloud Infrastructure", "Global Delivery"].map((t) => (
                <div key={t} className="flex items-center gap-[0.4cqw] rounded-[0.4cqw] bg-white/[0.05] px-[0.55cqw] py-[0.38cqw]">
                  <span className="h-[0.7cqw] w-[0.7cqw] shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate text-white/85" style={{ fontSize: "0.58cqw" }}>
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Smartwatch showing a verified ring. */
export function HeroWatch({ className = "" }: DeviceProps) {
  return (
    <div className={className}>
      <div className="rounded-[1.5cqw] border-[0.14cqw] border-[#3a3f47] bg-[#0b0f14] p-[0.24cqw] shadow-[0_2cqw_3cqw_-0.8cqw_rgba(0,0,0,0.85)]">
        <div className="relative flex flex-col items-center rounded-[1.3cqw] bg-[#0d141d] px-[0.7cqw] pb-[0.75cqw] pt-[0.85cqw]">
          <Face className="h-[2cqw] w-[2cqw] rounded-full" />
          <p className="mt-[0.35cqw] font-bold leading-none text-white" style={{ fontSize: "0.72cqw" }}>
            Verified
          </p>
          <div className="mt-[0.5cqw] flex gap-[0.4cqw]">
            {[0.85, 0.62, 0.4].map((p, i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-[1.7cqw] w-[1.7cqw]" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="3.6" />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke={["#5be3a2", "#6fb1e0", "#ffc861"][i]}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeDasharray={`${56.5 * p} 56.5`}
                  transform="rotate(-90 12 12)"
                />
              </svg>
            ))}
          </div>
          <p className="mt-[0.4cqw] text-white/55" style={{ fontSize: "0.58cqw" }}>
            9:41
          </p>
        </div>
      </div>
      {/* strap */}
      <div className="mx-auto h-[2.6cqw] w-[62%] rounded-b-[1cqw] bg-gradient-to-b from-[#23272e] to-[#0e1014]" />
    </div>
  );
}

/** Smart glasses with softly glowing lenses. */
export function HeroGlasses({ className = "" }: DeviceProps) {
  return (
    <svg viewBox="0 0 220 96" className={className} role="img" aria-label="Smart glasses">
      <defs>
        <linearGradient id="hero-gl-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f78c0" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#10243e" stopOpacity="0.98" />
          <stop offset="1" stopColor="#3a2a78" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hero-gl-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3037" />
          <stop offset="1" stopColor="#0b0c0f" />
        </linearGradient>
        <filter id="hero-gl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path d="M8 34 L2 30 L2 40 L12 46 Z" fill="url(#hero-gl-frame)" />
      <path d="M212 34 L218 30 L218 40 L208 46 Z" fill="url(#hero-gl-frame)" />
      <ellipse cx="60" cy="56" rx="44" ry="22" fill="#5aa8ff" opacity="0.45" filter="url(#hero-gl-glow)" />
      <ellipse cx="160" cy="56" rx="44" ry="22" fill="#5aa8ff" opacity="0.45" filter="url(#hero-gl-glow)" />
      <path d="M10 28 H98 C106 28 108 34 108 40 C108 66 92 82 66 82 C34 82 14 66 10 40 C9 34 9 30 10 28 Z" fill="url(#hero-gl-frame)" />
      <path d="M210 28 H122 C114 28 112 34 112 40 C112 66 128 82 154 82 C186 82 206 66 210 40 C211 34 211 30 210 28 Z" fill="url(#hero-gl-frame)" />
      <path d="M17 34 H96 C99 34 101 37 101 41 C101 62 88 75 66 75 C40 75 21 62 17 41 C17 37 17 35 17 34 Z" fill="url(#hero-gl-lens)" />
      <path d="M203 34 H124 C121 34 119 37 119 41 C119 62 132 75 154 75 C180 75 199 62 203 41 C203 37 203 35 203 34 Z" fill="url(#hero-gl-lens)" />
      <path d="M26 42 C40 38 64 38 80 44" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M130 44 C146 38 170 38 184 42" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M108 38 C110 32 110 32 112 38" stroke="#0b0c0f" strokeWidth="5" fill="none" />
      <circle cx="19" cy="30" r="4.2" fill="#07080a" stroke="#3a3f47" strokeWidth="1.2" />
      <circle cx="19" cy="30" r="1.8" fill="#6ab0ff" />
      <circle cx="29" cy="30" r="1.6" fill="#7dffb5">
        <animate attributeName="opacity" values="1;0.25;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * The three devices, positioned over the plate. Positions are percentages of the plate box so
 * they track the laptop in the render at every size.
 */
export function HeroDevices() {
  const reduce = useReducedMotion();
  const float = reduce ? "" : "pf-float";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 [perspective:1600px]">
      <div className={`${float} absolute left-[-1%] top-[30%] w-[15%] [transform:translateZ(30px)_rotateY(11deg)_rotateX(2deg)]`} style={{ animationDelay: "0.3s" }}>
        <HeroPhone />
      </div>
      <div className={`${float} absolute left-[47%] top-[57%] w-[11%] [transform:translateZ(52px)_rotateY(-5deg)_rotateX(6deg)]`} style={{ animationDelay: "1.1s", animationDuration: "4.7s" }}>
        <HeroWatch />
      </div>
      <div className={`${float} absolute left-[1%] top-[66%] w-[26%] [transform:translateZ(64px)_rotateY(13deg)_rotateX(4deg)]`} style={{ animationDelay: "0.8s", animationDuration: "6.1s" }}>
        <HeroGlasses />
      </div>
    </div>
  );
}
