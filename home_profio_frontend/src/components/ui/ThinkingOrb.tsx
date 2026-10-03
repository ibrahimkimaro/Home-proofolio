"use client";

import { useEffect, useRef } from "react";

export type OrbState = "thinking" | "solving" | "orbit" | "pulse";

interface ThinkingOrbProps {
  size?: number; // Size in CSS pixels (e.g. 64, 80, 120, 200)
  state?: OrbState;
  color?: string; // Optional custom hex/rgb, defaults to theme-aware
  className?: string;
  label?: string;
}

/**
 * ThinkingOrb
 * Inspired by Jakub Antalik's Thinking Orbs (github.com/Jakubantalik/thinking-orbs).
 * High-performance 2D Canvas rendering concentric rings of pulsating, harmonic
 * orbital particles representing active reasoning, verification, and AI identity.
 */
export function ThinkingOrb({
  size = 72,
  state = "thinking",
  color,
  className = "",
  label = "Reasoning & Proof Verification Engine",
}: ThinkingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let animId: number;
    let startTime = performance.now();

    // Setup high-DPI scaling
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    context.scale(dpr, dpr);

    // Orbital ring definitions: [radiusFraction, dotCount, speed, dotSize, harmonicFrequency]
    const rings = [
      { r: 0.18, count: 6, speed: 0.0016, dotSize: 2.2, freq: 3, amp: 0.03 },
      { r: 0.32, count: 12, speed: -0.0012, dotSize: 2.5, freq: 4, amp: 0.05 },
      { r: 0.46, count: 18, speed: 0.0009, dotSize: 2.8, freq: 5, amp: 0.07 },
      { r: 0.60, count: 24, speed: -0.0007, dotSize: 3.0, freq: 6, amp: 0.06 },
      { r: 0.76, count: 32, speed: 0.0005, dotSize: 2.4, freq: 7, amp: 0.05 },
    ];

    const isDarkMode = () =>
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    function render(currentTime: number) {
      if (!context) return;
      const elapsed = currentTime - startTime;
      context.clearRect(0, 0, size, size);

      const center = size / 2;
      const maxRadius = (size / 2) * 0.94;
      const dark = isDarkMode();

      // Base palette
      const baseR = dark ? 52 : 30;
      const baseG = dark ? 211 : 41;
      const baseB = dark ? 153 : 59; // emerald/cyan hues

      // Subtle glow at center
      const grad = context.createRadialGradient(
        center,
        center,
        2,
        center,
        center,
        maxRadius * 0.8
      );
      grad.addColorStop(
        0,
        dark ? "rgba(52, 211, 153, 0.12)" : "rgba(16, 185, 129, 0.08)"
      );
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = grad;
      context.beginPath();
      context.arc(center, center, maxRadius, 0, Math.PI * 2);
      context.fill();

      // Render concentric harmonic rings
      rings.forEach((ring, ringIdx) => {
        const baseRadius = ring.r * maxRadius;

        for (let i = 0; i < ring.count; i++) {
          const baseAngle = (i / ring.count) * (Math.PI * 2);
          const angle = baseAngle + elapsed * ring.speed;

          // Harmonic displacement wave
          let waveOffset = 0;
          if (state === "thinking" || state === "solving") {
            waveOffset =
              Math.sin(angle * ring.freq + elapsed * 0.003) *
              (ring.amp * maxRadius);
          } else if (state === "pulse") {
            waveOffset = Math.sin(elapsed * 0.004 + ringIdx) * 3;
          }

          const currentR = Math.max(4, baseRadius + waveOffset);
          const x = center + Math.cos(angle) * currentR;
          const y = center + Math.sin(angle) * currentR;

          // Pulse opacity based on position and time
          const pulse =
            0.5 + 0.5 * Math.sin(angle * 2 + elapsed * 0.002 + ringIdx);
          const alpha = 0.35 + pulse * 0.6;

          // Draw the dotted particle
          context.beginPath();
          context.arc(x, y, ring.dotSize * (0.8 + 0.3 * pulse), 0, Math.PI * 2);

          if (color) {
            context.fillStyle = color;
          } else {
            context.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
          }
          context.fill();
        }
      });

      // Central core dot
      context.beginPath();
      context.arc(
        center,
        center,
        3 + Math.sin(elapsed * 0.004) * 0.8,
        0,
        Math.PI * 2
      );
      context.fillStyle = dark
        ? "rgba(52, 211, 153, 0.9)"
        : "rgba(16, 185, 129, 0.9)";
      context.fill();

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size, state, color]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block pointer-events-none"
      />
    </div>
  );
}
