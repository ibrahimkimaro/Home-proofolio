"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CreditCard, Heart, Layers } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HeroDesk } from "@/components/landing/HeroDesk";
import { HolisticGrowthSection } from "@/components/landing/HolisticGrowthSection";
import { JourneyShowcase } from "@/components/landing/JourneyShowcase";
import { PricingDonate } from "@/components/landing/PricingDonate";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { DeskToProofShowcase } from "@/components/landing/DeskToProofShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer, type FooterColumn } from "@/components/landing/Footer";
import { Header, type HeaderLink } from "@/components/landing/Header";

/**
 * The home page: a scroll-driven story over one fixed stage. The stage swaps between a dark room
 * (the opening, with the laptop and devices) and a different photographed setting for each section,
 * with slow drift, parallax and a light field of dust that re-forms for every room. Canvas 2D and
 * CSS only (no WebGPU, no extra libraries); everything stops for people who ask for reduced motion.
 */

type Bg = { kind: "room" } | { kind: "photo"; src: string; position: string };

// One background per section, in page order. Photos sit in a box taller than the screen and pushed
// down, so the words and watermarks baked into them fall off-screen.
const BACKGROUNDS: Bg[] = [
  { kind: "room" },
  { kind: "photo", src: "/images/sectionImage.jpeg", position: "50% 100%" },
  { kind: "photo", src: "/images/where-your-proof-comes-from.jpeg", position: "50% 100%" },
  { kind: "photo", src: "/images/cv-certificates-proof.jpeg", position: "50% 100%" },
  { kind: "photo", src: "/images/all-poples-fit-on-us.jpeg", position: "50% 100%" },
  { kind: "photo", src: "/images/problem-solving-discussion.jpeg", position: "50% 100%" },
  { kind: "photo", src: "/images/Connect.jpeg", position: "50% 100%" },
];


const EVIDENCE: { label: string; kind: string; body: string; example: string }[] = [
  { label: "Code & repos", kind: "Git commits & PR diffs", body: "Verifiable author signatures and test records, without exposing proprietary code.", example: "Merged PR · test suite green" },
  { label: "Certifications", kind: "PDF with digital seal", body: "Tamper-proof credentials issued directly by accredited institutions.", example: "Certified Public Accountant, Part II" },
  { label: "Research & data", kind: "Notebooks & preprints", body: "Open datasets and peer-reviewed preprint records with immutable timestamps.", example: "Microgrid telemetry dataset v2.4" },
  { label: "Match & video reels", kind: "Timestamped video", body: "Timestamped match plays linked directly to verified team sheets.", example: "U-20 regional league, match 14" },
  { label: "Business ledgers", kind: "Anonymised ledgers & audits", body: "Verify commercial achievements without revealing confidential data.", example: "VAT reconciliation model 2026" },
];

const FEATURES: { title: string; body: string }[] = [
  { title: "Start small, expand as you go", body: "Pick your work type and only the relevant fields appear: zero clutter, zero friction." },
  { title: "One person, many disciplines", body: "Link achievements across roles and institutions into one permanent, verified profile." },
  { title: "Honest status, without false claims", body: "Every milestone reflects the truth, whether you're building, testing or done." },
  { title: "Solve real challenges together", body: "Work on real organisational problems and earn direct, verified attribution." },
];


const CONNECT_SPECS: [string, string][] = [
  ["Share", "Link or QR code"],
  ["Talk", "Direct and group chat"],
  ["Calls", "Voice and video"],
];

// The shared header and footer, pointed at this page's sections.
const HEADER_LINKS: HeaderLink[] = [
  { href: "#growth-section", label: "Life & Wellness", shortLabel: "Wellness", desc: "Vitality, daily pulse, and experiments", icon: Heart },
  { href: "#scene-1", label: "Platform", shortLabel: "Platform", desc: "The journey from a first note to a permanent record", icon: Layers },
  { href: "#pipeline", label: "Features", shortLabel: "Features", desc: "Do the work once, proven everywhere", icon: BadgeCheck },
  { href: "#scene-6", label: "Pricing", shortLabel: "Pricing", desc: "Free to start", icon: CreditCard },
];

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Life & Wellness", href: "#growth-section" },
      { label: "How it works", href: "#scene-1" },
      { label: "Proof, not claims", href: "#scene-2" },
      { label: "Who it's for", href: "#scene-4" },
      { label: "Connect", href: "#scene-5" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Get started", href: "/start" },
    ],
  },
];

const RAIL = ["Start", "Wellness", "Journey", "Proof", "CV", "Everyone", "Connect", "Begin"];

export function FieldLanding() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  // Which room is on screen: drives the background cross-fade and the dust's formation.
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
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
        if (stageRef.current) stageRef.current.style.transform = `translate3d(0, ${-window.scrollY * 0.04}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <div className="relative bg-[#0a1119] text-[#f4efe6]">
      {/* ---------- fixed stage ---------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div ref={stageRef} className="absolute -inset-[6%] will-change-transform">
          {BACKGROUNDS.map((bg, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: active === i ? 1 : 0 }}>
              {bg.kind === "room" ? (
                <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_35%,#16293b_0%,#0c151f_55%,#070b10_100%)]" />
              ) : (
                <motion.div
                  className="absolute inset-0 h-full w-full"
                  animate={reduce || active !== i ? undefined : { scale: [1.01, 1.05] }}
                  transition={{ duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                  style={{ transformOrigin: "50% 50%" }}
                >
                  <Image
                    src={bg.src}
                    alt=""
                    fill
                    sizes="100vw"
                    quality={90}
                    priority={i === 1}
                    className="object-cover"
                    style={{ objectPosition: bg.position }}
                  />
                </motion.div>
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-black/35 sm:bg-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        {!reduce && <Dust activeRef={activeRef} />}
      </div>

      <Header variant="night" links={HEADER_LINKS} />

      {/* ---------- progress rail ---------- */}
      <ol aria-label="Sections" className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
        {RAIL.map((label, i) => (
          <li key={label}>
            <a
              href={`#scene-${i}`}
              aria-label={label}
              title={label}
              aria-current={active === i}
              className={`block h-7 w-[3px] rounded-full transition-all duration-500 ${active === i ? "bg-white" : "bg-white/25 hover:bg-white/50"}`}
            />
          </li>
        ))}
      </ol>

      <main className="relative z-10">
        <HeroDesk id="scene-0" data-scene={0} underFixedHeader />

        {/* ---------- Beyond Normal Portfolio: Life, Wellness & Proof of Growth ---------- */}
        <div id="growth-section" data-scene={0} className="pf-night">
          <HolisticGrowthSection />
        </div>

        {/* ---------- Journey (the previous landing page's showcase) ---------- */}
        <div id="scene-1" data-scene={1} className="pf-night">
          <JourneyShowcase />
        </div>

        {/* ---------- Desk to proof (from the previous landing page) ---------- */}
        <div data-scene={1} className="pf-night">
          <DeskToProofShowcase />
        </div>

        {/* ---------- II · Proof ---------- */}
        <Scene n={2} numeral="II" label="Proof" title="Where your proof comes from." intro="Real-world evidence sources, each one attributable to you.">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EVIDENCE.map((e, i) => (
              <Card key={e.label} delay={i * 0.05}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e8c777]">{e.label}</p>
                <h3 className="mt-2 text-[17px] font-bold leading-snug">{e.kind}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/70">{e.body}</p>
                <p className="mt-4 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-[12px] font-semibold text-white/80">{e.example}</p>
              </Card>
            ))}
          </ul>
        </Scene>

        {/* ---------- III · CV and features ---------- */}
        <Scene n={3} numeral="III" label="Your CV" title="A CV that proves itself." intro="Your CV fills itself from what you've done, you sign it to make it valid, and anyone can open it from a link or a QR code.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Card key={f.title} delay={i * 0.06}>
                <h3 className="text-[17px] font-bold leading-snug">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/70">{f.body}</p>
              </Card>
            ))}
          </ul>
        </Scene>

        {/* ---------- Who it's for (the previous landing page's section, with the live discipline list) ---------- */}
        <div id="scene-4" data-scene={4} className="pf-night">
          <WhoItsFor />
        </div>

        {/* ---------- V · Connect ---------- */}
        <div id="connect" className="scroll-mt-16">
          <Scene n={5} numeral="V" label="Connect" title="Be found for what you actually did." intro="Share a public page, or a signed CV as a link or QR code. Message, call and work with the people you meet along the way.">
            <dl className="grid max-w-2xl gap-x-10 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-3">
              {CONNECT_SPECS.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">{k}</dt>
                  <dd className="mt-1.5 text-[15px] font-semibold leading-snug text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </Scene>
        </div>

        {/* ---------- How it works: the interactive demos (from the previous landing page) ---------- */}
        <div data-scene={5} className="pf-night">
          <HowItWorks />
        </div>

        {/* ---------- closing ---------- */}
        <section id="scene-6" data-scene={6} className="flex min-h-[90svh] flex-col justify-center px-5 py-28 sm:px-10 lg:px-[8vw]">
          <Rise>
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e8c777]">Pricing</p>
            <h2 className="max-w-[20ch] font-display text-[clamp(2.2rem,6vw,4.8rem)] font-bold leading-[1.02] tracking-tight">Free to use. Open to support.</h2>
          </Rise>
          <Rise delay={0.1}>
            <p className="mt-5 max-w-xl text-white/70">Everything you add is private until you choose to share it. If Home Proofolio helps you, you can help keep it free for others.</p>
          </Rise>
          <div className="max-w-6xl">
            <PricingDonate />
          </div>
          <p className="mt-8 text-[14px] text-white/60">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-white underline underline-offset-4 hover:text-[#e8c777]">
              Sign in to your account
            </Link>
          </p>
        </section>
      </main>

      <Footer variant="night" columns={FOOTER_COLUMNS} />
    </div>
  );
}

function Scene({ n, numeral, label, title, intro, children }: { n: number; numeral: string; label: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={`scene-${n}`} data-scene={n} className="flex min-h-svh flex-col justify-center px-5 py-28 sm:px-10 lg:px-[8vw]">
      <Rise>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e8c777]">
          {numeral} — {label}
        </p>
      </Rise>
      <Rise delay={0.07}>
        <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(2.1rem,5.6vw,4.4rem)] font-bold leading-[1.03] tracking-tight">{title}</h2>
      </Rise>
      <Rise delay={0.14}>
        <p className="mt-5 max-w-2xl text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-white/72">{intro}</p>
      </Rise>
      <div className="mt-10 max-w-6xl">{children}</div>
    </section>
  );
}

/** Frosted card that rises in when it scrolls into view. */
function Card({ children, delay = 0, wide = false }: { children: ReactNode; delay?: number; wide?: boolean }) {
  const reduce = useReducedMotion();
  const cls = `rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md ${wide ? "sm:col-span-2" : ""}`;
  if (reduce) return <li className={cls}>{children}</li>;
  return (
    <motion.li
      className={cls}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.li>
  );
}

/** Fade + rise as it enters the screen (once). Static for reduced motion. */
function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
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
 * The field's dust: one set of motes that re-forms for each section (it drifts, flows, rises, then
 * snaps to a grid, and the cycle repeats). Positions are a blend of four formulas, eased toward the
 * one for the section on screen. ~100 dots, paused when the tab is hidden.
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
      const formation = activeRef.current % 4;
      for (let k = 0; k < 4; k++) weights[k] += ((k === formation ? 1 : 0) - weights[k]) * Math.min(1, dt * 1.6);

      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const m = motes[i];
        // drift: slow rise with a sway
        const driftX = m.x + Math.sin(t * 0.25 + m.p) * 0.02;
        const driftY = (m.y - t * 0.012 * m.s + 4) % 1;
        // flow: rows of waves moving sideways
        const row = Math.floor(m.y * 9) / 9;
        const flowX = (m.x + t * 0.03 * m.s + 4) % 1;
        const flowY = row + Math.sin(flowX * 9 + t * 0.9 + row * 6) * 0.03;
        // rise: fast, from the bottom, fading out near the top
        const riseY = (m.y - t * 0.05 * m.s + 4) % 1;
        const riseX = m.x + Math.sin(t * 0.6 + m.p) * 0.03 * (1 - riseY);
        // order: snapped to a grid, twinkling
        const gx = Math.round(m.x * 14) / 14;
        const gy = Math.round(m.y * 8) / 8;

        const x = (driftX * weights[0] + flowX * weights[1] + riseX * weights[2] + gx * weights[3]) * w;
        const y = (driftY * weights[0] + flowY * weights[1] + riseY * weights[2] + gy * weights[3]) * h;
        const fade = weights[2] * Math.sin(Math.min(1, riseY) * Math.PI) + (1 - weights[2]);
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
