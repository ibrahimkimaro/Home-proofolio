"use client";

import { useEffect, useRef, useState } from "react";

export type OrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

export type OrbSize = 64 | 32 | 20;

export interface AgentOrbProps {
  state?: OrbState;
  size?: OrbSize;
  showBadge?: boolean;
  className?: string;
}

const STATE_CONFIG: Record<
  OrbState,
  { label: string; desc: string; glow: string; text: string; color: [number, number, number] }
> = {
  breathing: {
    label: "Breathing",
    desc: "Calm & ready",
    glow: "from-sky-500/20 via-indigo-500/10 to-teal-500/20",
    text: "text-sky-500 dark:text-sky-400",
    color: [56, 189, 248], // sky-400
  },
  listening: {
    label: "Listening",
    desc: "Awaiting input",
    glow: "from-emerald-500/25 via-sky-500/15 to-teal-500/25",
    text: "text-emerald-500 dark:text-emerald-400",
    color: [52, 211, 153], // emerald-400
  },
  working: {
    label: "Working",
    desc: "Processing request",
    glow: "from-purple-500/30 via-sky-500/20 to-indigo-500/30",
    text: "text-purple-500 dark:text-purple-400",
    color: [168, 85, 247], // purple-500
  },
  searching: {
    label: "Searching",
    desc: "Scanning proofs & memories",
    glow: "from-amber-500/30 via-orange-500/20 to-yellow-500/30",
    text: "text-amber-500 dark:text-amber-400",
    color: [251, 191, 36], // amber-400
  },
  solving: {
    label: "Reasoning & Solving",
    desc: "Formulating logic",
    glow: "from-indigo-500/35 via-violet-500/25 to-sky-500/35",
    text: "text-indigo-500 dark:text-indigo-400",
    color: [129, 140, 248], // indigo-400
  },
  connecting: {
    label: "Connecting",
    desc: "Linking with AI Engine",
    glow: "from-cyan-500/30 via-blue-500/20 to-indigo-500/30",
    text: "text-cyan-500 dark:text-cyan-400",
    color: [34, 211, 238], // cyan-400
  },
  composing: {
    label: "Composing",
    desc: "Generating answer",
    glow: "from-rose-500/30 via-purple-500/20 to-sky-500/30",
    text: "text-rose-500 dark:text-rose-400",
    color: [244, 63, 94], // rose-500
  },
  weaving: {
    label: "Weaving",
    desc: "Synthesizing evidence",
    glow: "from-teal-500/30 via-sky-500/20 to-indigo-500/30",
    text: "text-teal-500 dark:text-teal-400",
    color: [45, 212, 191], // teal-400
  },
  shaping: {
    label: "Shaping",
    desc: "Polishing structure",
    glow: "from-blue-500/30 via-sky-500/20 to-emerald-500/30",
    text: "text-blue-500 dark:text-blue-400",
    color: [96, 165, 250], // blue-400
  },
};

export function AgentOrb({
  state = "breathing",
  size = 64,
  showBadge = false,
  className = "",
}: AgentOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meta = STATE_CONFIG[state] || STATE_CONFIG.breathing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    const startTime = performance.now();

    // High DPI scaling
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = center * 0.82;
    const [cr, cg, cb] = meta.color;

    // Harmonic ring configurations
    const dotCount = size <= 20 ? 8 : size <= 32 ? 14 : 24;
    const ringCount = size <= 20 ? 2 : size <= 32 ? 3 : 4;

    const render = (now: number) => {
      ctx.clearRect(0, 0, size, size);
      const elapsed = (now - startTime) / 1000;

      // Subtle center glow
      const grad = ctx.createRadialGradient(center, center, 2, center, center, radius);
      grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.22)`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // State-specific particle dynamics
      for (let r = 0; r < ringCount; r++) {
        const ringFrac = (r + 1) / (ringCount + 1);
        let ringRadius = radius * ringFrac;

        // Dynamic behaviors by state
        if (state === "breathing") {
          ringRadius *= 1 + 0.12 * Math.sin(elapsed * 2.2 + r * 0.8);
        } else if (state === "listening") {
          ringRadius *= 1 + 0.16 * Math.sin(elapsed * 4.5 + r * 1.2);
        } else if (state === "searching") {
          ringRadius *= 1 + 0.08 * Math.cos(elapsed * 3.0 + r);
        }

        const count = Math.round(dotCount * ringFrac * 1.4);
        const ringSpeed = (0.5 + r * 0.35) * (r % 2 === 0 ? 1 : -1);

        for (let i = 0; i < count; i++) {
          const baseAngle = (i / count) * Math.PI * 2;
          let angle = baseAngle + elapsed * ringSpeed;

          let dotX = center + Math.cos(angle) * ringRadius;
          let dotY = center + Math.sin(angle) * ringRadius;
          let dotSize = size <= 20 ? 1.2 : size <= 32 ? 1.6 : 2.2;
          let alpha = 0.6 + 0.35 * Math.sin(elapsed * 3 + i);

          if (state === "searching") {
            // Sweep meridian radar wave
            const sweepAngle = (elapsed * 3) % (Math.PI * 2);
            const diff = Math.abs(((angle - sweepAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            alpha = Math.max(0.2, 1 - diff / 1.5);
            if (diff < 0.4) dotSize *= 1.4;
          } else if (state === "solving") {
            // Constellation harmonics
            const pulse = Math.sin(elapsed * 5 + i * 2);
            dotX += pulse * 1.5;
            dotY += Math.cos(elapsed * 5 + i * 2) * 1.5;
            alpha = 0.5 + 0.5 * Math.abs(pulse);
          } else if (state === "connecting") {
            // Twin linking wave
            const wave = Math.sin(elapsed * 6 + r * 2);
            dotY += wave * 2;
            alpha = 0.7 + 0.3 * wave;
          }

          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${Math.max(0.15, Math.min(1, alpha))})`;
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, size, meta.color]);

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      {/* Ambient color glow ring */}
      <div
        className={`pointer-events-none absolute inset-0 -m-3 rounded-full bg-gradient-to-tr ${meta.glow} blur-xl transition-all duration-700`}
      />

      {/* Dotted Canvas Orb */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative block select-none"
      />

      {/* State label badge */}
      {showBadge && (
        <div className="mt-2 flex items-center gap-1.5 rounded-full border border-ink-100 bg-white/80 px-2.5 py-0.5 shadow-2xs backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/80">
          <span className={`h-1.5 w-1.5 rounded-full animate-ping ${meta.text.replace("text-", "bg-")}`} />
          <span className={`text-[10px] font-bold tracking-wide uppercase ${meta.text}`}>
            {meta.label}
          </span>
        </div>
      )}
    </div>
  );
}
