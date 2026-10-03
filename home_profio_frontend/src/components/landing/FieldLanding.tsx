"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Scroll-driven landing page (test). One fixed stage behind the content: a photo per section that
 * cross-fades and drifts slowly, with a light field of dust that re-forms for each section (it
 * drifts, flows, rises, then snaps to a grid), as in the "FIELD" reference. Pure CSS/canvas 2D:
 * no WebGPU, no extra libraries, a few hundred KB of images, and everything stops for people who
 * ask for reduced motion.
 */

interface Scene {
  numeral: string;
  label: string;
  title: string;
  body: string;
  specs: [string, string][];
  image: string;
  position: string; // object-position: keeps the text baked into the photos out of frame
}

const SCENES: Scene[] = [
  {
    numeral: "I",
    label: "Capture",
    title: "Write it down while it's true.",
    body: "Add what you did, learned or solved in about a minute. It starts private and stays private until you decide to show it.",
    specs: [
      ["Starts as", "Private"],
      ["You add", "Work, learning, problems, achievements"],
      ["Takes", "About a minute"],
    ],
    image: "/images/sectionImage.jpeg",
    position: "50% 100%",
  },
  {
    numeral: "II",
    label: "Prove",
    title: "Put the proof next to the claim.",
    body: "Links, files and certificates sit beside what you say you did. Organisations can confirm the roles you held, and your CV is valid once you sign it.",
    specs: [
      ["Evidence", "Links, photos, PDFs"],
      ["Roles", "Confirmed by the organisation"],
      ["Your CV", "Signed by you"],
    ],
    image: "/images/where-your-proof-comes-from.jpeg",
    position: "50% 100%",
  },
  {
    numeral: "III",
    label: "Connect",
    title: "Be found for what you actually did.",
    body: "Share a public page, or a signed CV as a link or QR code. Message, call and work with the people you meet along the way.",
    specs: [
      ["Share", "Link or QR code"],
      ["Talk", "Direct and group chat"],
      ["Calls", "Voice and video"],
    ],
    image: "/images/problem-solving-discussion.jpeg",
    position: "50% 100%",
  },
  {
    numeral: "IV",
    label: "Everyone",
    title: "One identity. Many kinds of work.",
    body: "Developers, nurses, designers, founders, footballers: what you record fits the work you do, not a form built for someone else.",
    specs: [
      ["Fields", "Change with your kind of work"],
      ["For", "Students to founders"],
      ["Profile", "Yours to shape"],
    ],
    image: "/images/all-poples-fit-on-us.jpeg",
    position: "50% 100%",
  },
];

export function FieldLanding() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);

  // Which scene is on screen: drives the photo cross-fade and the dust's formation.
  useEffect(() => {
    const els = sections.current.filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.scene);
            activeRef.current = i;
            setActive(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Slow parallax: the stage drifts at a fraction of the scroll speed (one rAF, no React state).
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (stageRef.current) stageRef.current.style.transform = `translate3d(0, ${-window.scrollY * 0.06}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <div className="relative bg-[#0c0a08] text-[#f4efe6]">
      {/* ---------- fixed stage ---------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div ref={stageRef} className="absolute -inset-[8%] will-change-transform">
          {SCENES.map((s, i) => (
            <div key={s.image} className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: active === i ? 1 : 0 }}>
              {/* The photo sits in a box taller than the screen and pushed down, so the headline written
                  into the picture (top) and its "video replay" mark (bottom corner) fall off-screen. */}
              <motion.div
                className="absolute inset-x-0 -bottom-[16%] h-[165%]"
                animate={reduce || active !== i ? undefined : { scale: [1.02, 1.1] }}
                transition={{ duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                style={{ transformOrigin: "50% 60%" }}
              >
                <Image
                  src={s.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 260vw, 110vw"
                  quality={70}
                  priority={i === 0}
                  className="object-cover"
                  style={{ objectPosition: s.position }}
                />
              </motion.div>
            </div>
          ))}
        </div>
        {/* Darken for legibility: heavier at the left where the text sits, vignette at the edges. */}
        <div className="absolute inset-0 bg-black/30 sm:bg-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        {!reduce && <Dust activeRef={activeRef} />}
      </div>

      {/* ---------- top bar ---------- */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/45 to-transparent px-5 pb-6 pt-4 backdrop-blur-[3px] sm:px-10 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        <Link href="/" className="text-[15px] font-semibold tracking-wide text-white">
          Home Proofolio
        </Link>
        <nav className="flex items-center gap-2 text-[13px] font-semibold">
          <Link href="/login" className="rounded-full px-4 py-2 text-white/80 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link href="/start" className="rounded-full bg-white px-4 py-2 text-black transition-transform hover:scale-[1.03]">
            Get started
          </Link>
        </nav>
      </header>

      {/* ---------- progress rail ---------- */}
      <ol aria-label="Sections" className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
        {SCENES.map((s, i) => (
          <li key={s.label}>
            <a
              href={`#scene-${i}`}
              aria-label={s.label}
              aria-current={active === i}
              className={`block h-8 w-[3px] rounded-full transition-all duration-500 ${active === i ? "bg-white" : "bg-white/25 hover:bg-white/50"}`}
            />
          </li>
        ))}
      </ol>

      <main className="relative z-10">
        {/* ---------- hero ---------- */}
        <section className="flex min-h-svh flex-col justify-center px-5 pb-24 pt-28 sm:px-10 lg:px-[8vw]">
          <Rise>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e8c777]">Your work · with the proof</p>
          </Rise>
          <Rise delay={0.08}>
            <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(2.6rem,8.5vw,7rem)] font-bold leading-[0.98] tracking-tight">
              A career is easier to believe when you can see it.
            </h1>
          </Rise>
          <Rise delay={0.16}>
            <p className="mt-8 max-w-xl text-[clamp(1rem,1.6vw,1.2rem)] leading-relaxed text-white/75">
              Home Proofolio turns what you&apos;ve learned, built, solved and proved into one living record, with the evidence attached.
              Keep scrolling: it&apos;s the same story, in four rooms.
            </p>
          </Rise>
          <Rise delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/start" className="rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03]">
                Start your Proofolio
              </Link>
              <a href="#scene-0" className="rounded-full border border-white/30 px-7 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                See how it works
              </a>
            </div>
          </Rise>
          <p className="absolute bottom-8 left-5 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/45 sm:left-10 lg:left-[8vw]">Scroll</p>
        </section>

        {/* ---------- scenes ---------- */}
        {SCENES.map((s, i) => (
          <section
            key={s.label}
            id={`scene-${i}`}
            data-scene={i}
            ref={(el) => {
              sections.current[i] = el;
            }}
            className="flex min-h-svh scroll-mt-0 flex-col justify-center px-5 py-28 sm:px-10 lg:px-[8vw]"
          >
            <Rise>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e8c777]">
                {s.numeral} — {s.label}
              </p>
            </Rise>
            <Rise delay={0.07}>
              <h2 className="mt-5 max-w-[18ch] font-display text-[clamp(2.2rem,6.2vw,5rem)] font-bold leading-[1.02] tracking-tight">{s.title}</h2>
            </Rise>
            <Rise delay={0.14}>
              <p className="mt-6 max-w-xl text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-white/75">{s.body}</p>
            </Rise>
            <Rise delay={0.2}>
              <dl className="mt-10 grid max-w-2xl gap-x-10 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-3">
                {s.specs.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">{k}</dt>
                    <dd className="mt-1.5 text-[15px] font-semibold leading-snug text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </Rise>
          </section>
        ))}

        {/* ---------- closing ---------- */}
        <section className="flex min-h-[80svh] flex-col items-start justify-center px-5 py-28 sm:px-10 lg:px-[8vw]">
          <Rise>
            <h2 className="max-w-[16ch] font-display text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-[1] tracking-tight">Four rooms. One record. Yours.</h2>
          </Rise>
          <Rise delay={0.1}>
            <p className="mt-6 max-w-md text-white/70">Free to start. Everything you add is private until you choose to share it.</p>
          </Rise>
          <Rise delay={0.18}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/start" className="rounded-full bg-white px-8 py-4 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03]">
                Start your Proofolio
              </Link>
              <Link href="/login" className="rounded-full border border-white/30 px-8 py-4 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </Rise>
          <p className="mt-24 text-[10px] uppercase tracking-[0.35em] text-white/35">Home Proofolio · Build. Prove. Connect.</p>
        </section>
      </main>
    </div>
  );
}

/** Fade + rise as it enters the screen (once). Static for reduced motion. */
function Rise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 38 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The field's dust: one set of motes that re-forms for each section, the way the reference's one
 * buffer becomes meadow, tide, ember and lattice. Positions are a blend of four formulas, eased
 * toward whichever section is on screen. ~100 dots, paused when the tab is hidden.
 */
function Dust({ activeRef }: { activeRef: { current: number } }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0,
      h = 0,
      dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const N = window.innerWidth < 640 ? 60 : 110;
    // Fixed pseudo-random seeds so the field looks the same on every visit.
    const rnd = (i: number, k: number) => {
      const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const motes = Array.from({ length: N }, (_, i) => ({ x: rnd(i, 1), y: rnd(i, 2), s: 0.5 + rnd(i, 3) * 1.6, p: rnd(i, 4) * 6.28 }));
    const weights = [1, 0, 0, 0];
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      // Ease the four formation weights toward the active section.
      for (let k = 0; k < 4; k++) weights[k] += ((k === activeRef.current ? 1 : 0) - weights[k]) * Math.min(1, dt * 1.6);

      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const m = motes[i];
        // I — drift: slow rise with a sway.
        const driftX = m.x + Math.sin(t * 0.25 + m.p) * 0.02;
        const driftY = (m.y - t * 0.012 * m.s + 4) % 1;
        // II — flow: rows of waves moving sideways.
        const row = Math.floor(m.y * 9) / 9;
        const flowX = (m.x + t * 0.03 * m.s + 4) % 1;
        const flowY = row + Math.sin(flowX * 9 + t * 0.9 + row * 6) * 0.03;
        // III — rise: fast, from the bottom, fading out near the top.
        const riseY = (m.y - t * 0.05 * m.s + 4) % 1;
        const riseX = m.x + Math.sin(t * 0.6 + m.p) * 0.03 * (1 - riseY);
        // IV — order: snapped to a grid, twinkling.
        const gx = Math.round(m.x * 14) / 14;
        const gy = Math.round(m.y * 8) / 8;

        const x = (driftX * weights[0] + flowX * weights[1] + riseX * weights[2] + gx * weights[3]) * w;
        const y = (driftY * weights[0] + flowY * weights[1] + riseY * weights[2] + gy * weights[3]) * h;
        const fade = weights[2] * Math.sin(Math.min(1, riseY) * Math.PI) + (1 - weights[2]) * 1;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + m.p * 3);
        const alpha = (0.18 + 0.4 * (weights[3] * twinkle + (1 - weights[3]) * 0.55)) * fade;
        const r = m.s * (weights[3] > 0.5 ? 1.4 : 1) * (0.8 + weights[2] * 0.6);

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = weights[2] > 0.4 ? "#ffb35c" : "#f3dca0";
        if (weights[3] > 0.5) ctx.fillRect(x - r, y - r, r * 2, r * 2);
        else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.2832);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible") {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, [activeRef]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
