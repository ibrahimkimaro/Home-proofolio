"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export const HERO_PERSON = {
  name: "Ibrahim Kimaro",
  title: "Chief Product Architect",
  about:
    "Proven tech leader, core expertise and verified achievements across complex product lifecycles and organisational solutions.",
};

export function HeroStudio() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen bg-[#070c12] text-white selection:bg-[#3d8fc0] selection:text-white">
      {/* ── Chrome / Desktop App Window Frame ── */}
      <header className="border-b border-white/10 bg-[#0d131a] px-4 py-2 text-xs text-white/70">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 hidden rounded-t-md bg-[#161f2b] px-3 py-1 font-mono text-[11px] text-white/80 sm:inline-block">
              HOME PROOFOLIO - Landing
            </span>
          </div>
          <div className="hidden flex-1 max-w-md rounded-md bg-[#080d14] px-3 py-1 text-center font-mono text-[11px] text-white/50 md:block">
            app.homeproofolio.com/design
          </div>
          <div className="flex items-center gap-2 text-white/40 text-[11px]">
            <span>100%</span>
          </div>
        </div>
      </header>

      {/* ── Main SaaS Navigation Bar ── */}
      <nav className="relative z-30 border-b border-white/5 bg-[#090e15]/90 px-5 backdrop-blur-md sm:px-10 lg:px-[5vw]">
        <div className="mx-auto flex h-20 max-w-[1560px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white to-white/70 text-black font-black text-lg shadow-sm">
              H
            </div>
            <span className="font-display font-extrabold tracking-wider text-base uppercase text-white">
              HOME <span className="font-semibold text-white/80">PROOFOLIO</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 text-[14px] font-medium text-white/75 md:flex">
            <Link href="#platform" className="transition hover:text-white">Platform</Link>
            <Link href="#features" className="transition hover:text-white">Features</Link>
            <Link href="#pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/login" className="transition hover:text-white">Log In</Link>
            <Link
              href="/start"
              className="rounded-lg bg-[#2778a5] px-5 py-2.5 font-semibold text-white transition hover:bg-[#318fc2] shadow-[0_0_20px_-3px_rgba(49,143,194,0.6)]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white md:hidden"
          >
            <span className={`h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full border-b border-white/10 bg-[#0a1017] p-6 shadow-2xl backdrop-blur-xl md:hidden">
            <div className="flex flex-col space-y-4 text-base font-medium">
              <Link href="#platform" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Platform</Link>
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Features</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Pricing</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Log In</Link>
              <Link
                href="/start"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 block w-full rounded-lg bg-[#2778a5] py-3 text-center font-bold text-white shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SCENE (Split: Hardware Scene Left | Hero Copy Right) ── */}
      <section className="relative flex min-h-[calc(100vh-120px)] items-center overflow-hidden px-5 py-16 sm:px-10 lg:px-[5vw]">
        {/* Background Ambience (Room & Desk) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_40%_45%,#132537_0%,#091118_60%,#04070a_100%)]" />
          {/* Wall mounted display in background */}
          <div className="absolute right-[8%] top-[12%] h-[240px] w-[360px] rounded-lg border border-white/5 bg-gradient-to-br from-[#121f2d]/40 to-[#0b131a]/60 opacity-40 blur-[4px]" />
          {/* Polished desk edge */}
          <div className="absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-[#080504] via-[#140e0a] to-transparent [clip-path:polygon(0_32%,100%_12%,100%_100%,0_100%)]" />
          {/* Glow from the laptop hitting the desk */}
          <div className="absolute left-[15%] bottom-[12%] h-[120px] w-[55%] rounded-full bg-[#52a6df]/15 blur-[65px]" />
        </div>

        {/* Hero Grid Container */}
        <div className="relative z-10 mx-auto grid w-full max-w-[1560px] items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-14">

          {/* LEFT: 3D Hardware Array (MacBook, Phone, Watch, Glasses) */}
          <div className="relative mx-auto w-full max-w-[880px] [container-type:inline-size]">
            <div className="relative w-full" style={{ aspectRatio: "100 / 74" }}>

              {/* Laptop Realistic Perspective Base & Shadow */}
              <div className="absolute left-[8%] top-[8%] w-[88%]" style={{ perspective: "1600px" }}>
                <div style={{ transform: "rotateY(7deg) rotateX(3deg)" }}>

                  {/* Laptop Screen Bezel */}
                  <div className="relative rounded-[1.6cqw] border-[0.6cqw] border-[#1d2228] bg-[#020508] p-[0.7cqw] shadow-[0_3cqw_7cqw_-1cqw_rgba(0,0,0,0.95),0_0_4cqw_rgba(77,163,222,0.3)]">
                    {/* Top Webcam Notch */}
                    <div className="absolute top-[0.7cqw] left-1/2 h-[0.7cqw] w-[5cqw] -translate-x-1/2 rounded-b-md bg-[#1d2228]" />

                    {/* Realistic SaaS Dashboard Screen UI */}
                    <div className="aspect-[16/10] overflow-hidden rounded-[0.9cqw] bg-[#0c141d]">
                      <MacBookDashboardContent />
                    </div>
                  </div>

                  {/* MacBook Bottom Deck & Hinge */}
                  <div className="mx-auto -mt-[0.2cqw] h-[2.2cqw] w-[103%] -translate-x-[1.5%] rounded-b-[1.8cqw] bg-gradient-to-b from-[#8c949e] via-[#5c636d] to-[#2c3138] shadow-[0_2cqw_3cqw_rgba(0,0,0,0.8)] [clip-path:polygon(1.5%_0,98.5%_0,100%_100%,0_100%)]">
                    <div className="mx-auto h-[0.5cqw] w-[16%] rounded-b-[0.6cqw] bg-black/40" />
                  </div>
                </div>
              </div>

              {/* Floating iPhone (Left) */}
              <motion.div
                animate={reduce ? {} : { y: [-6, 6, -6] }}
                transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
                className="absolute -left-[3%] top-[20%] w-[18%] drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)]"
              >
                <div className="rounded-[3cqw] border-[0.3cqw] border-white/25 bg-white/[0.08] p-[0.4cqw] backdrop-blur-md">
                  <div className="overflow-hidden rounded-[2.6cqw] border-[0.4cqw] border-[#15191f] bg-black p-[0.8cqw]" style={{ aspectRatio: "9/18.5" }}>
                    <div className="flex h-full flex-col bg-gradient-to-b from-[#0e1c2a] to-[#070e16] p-[0.8cqw] text-white">
                      <div className="mx-auto h-[0.7cqw] w-[3.5cqw] rounded-full bg-black mb-2" />
                      <div className="flex items-center gap-1">
                        <Avatar className="h-[2.6cqw] w-[2.6cqw]" />
                        <span className="text-[0.75cqw] font-semibold">Ibrahim K.</span>
                      </div>
                      <div className="mt-2 text-[0.7cqw] text-white/60">Verified Evidence</div>
                      <div className="text-[1.8cqw] font-bold">12</div>
                      {/* Live Chart */}
                      <svg viewBox="0 0 100 40" className="mt-1 w-full">
                        <polyline points="0,30 15,22 30,26 45,14 60,18 75,8 100,12" fill="none" stroke="#5bb4ea" strokeWidth="2" />
                      </svg>
                      <div className="mt-auto flex items-end gap-[0.4cqw] pb-2">
                        {[40, 65, 50, 85, 60, 95].map((val, i) => (
                          <div key={i} className="flex-1 rounded-t-sm bg-[#388ec2]" style={{ height: `${val * 0.4}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Smart Glasses (Front Left Desk) */}
              <div className="absolute left-[3%] bottom-[6%] w-[25%] drop-shadow-[0_15px_20px_rgba(0,0,0,0.9)]">
                <SmartGlassesSVG />
              </div>

              {/* Floating Smartwatch (Front Center) */}
              <motion.div
                animate={reduce ? {} : { y: [4, -5, 4] }}
                transition={{ duration: 4.2, ease: "easeInOut", repeat: Infinity, delay: 0.4 }}
                className="absolute left-[44%] bottom-[4%] w-[13%] drop-shadow-[0_25px_30px_rgba(0,0,0,0.9)]"
              >
                <div className="flex flex-col items-center">
                  <div className="h-[3cqw] w-[65%] rounded-t-md bg-[#191d24]" />
                  <div className="w-full rounded-[2.5cqw] border-[0.4cqw] border-[#292e37] bg-black p-[0.4cqw]">
                    <div className="flex aspect-square flex-col items-center justify-center rounded-[2cqw] bg-gradient-to-b from-[#102436] to-[#08121b] p-1 text-center text-white">
                      <span className="text-[#ff5268] text-[1.4cqw]">♥</span>
                      <span className="text-[0.9cqw] font-bold">152 bpm</span>
                      <span className="text-[0.6cqw] text-emerald-400">● Verified</span>
                    </div>
                  </div>
                  <div className="h-[3cqw] w-[65%] rounded-b-md bg-[#191d24]" />
                </div>
              </motion.div>

            </div>
          </div>

          {/* RIGHT: Typography & High-Conversion SaaS CTA */}
          <div className="lg:pl-4">
            <h1 className="font-display text-[clamp(2.3rem,4vw,3.9rem)] font-extrabold leading-[1.06] tracking-tight text-white">
              Build Your Professional Proof-of-Work.
              <span className="mt-1 block text-[#f4f7fa]">Curate. Verify. Showcase.</span>
            </h1>

            <p className="mt-6 text-[clamp(1.1rem,1.6vw,1.45rem)] leading-snug text-white/70">
              Elevate Your Career Beyond a Resume.
            </p>

            {/* Main Action Button */}
            <div className="mt-8">
              <Link
                href="/start"
                className="inline-block w-full max-w-md rounded-lg bg-[#2778a5] py-4 px-8 text-center text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_35px_-5px_rgba(39,120,165,0.7)] transition hover:bg-[#2f8ec2] hover:scale-[1.01]"
              >
                START YOUR FREE ARCHIVE
              </Link>
              <p className="mt-3 text-[12px] text-white/50">
                Secure. Verified. Yours. No credit card required.
              </p>
              <p className="mt-1 text-[12px] font-medium text-white/40">
                Join 50k+ professionals globally.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER SECTIONS (Trust, Features, Comparison) ── */}
      <BottomSection />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Laptop Internal Interface: exact dark-mode structure from reference design
───────────────────────────────────────────────────────────────────────────── */

function MacBookDashboardContent() {
  return (
    <div className="flex h-full w-full bg-[#0a111a] text-white" style={{ fontSize: "1cqw" }}>
      {/* Mini App Sidebar */}
      <div className="flex w-[5%] flex-col items-center gap-[1.2cqw] border-r border-white/5 bg-[#070b11] py-[1.2cqw]">
        <div className="h-[1.6cqw] w-[1.6cqw] rounded bg-white" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-[1.1cqw] w-[1.1cqw] rounded ${i === 0 ? "bg-[#4da3de]" : "bg-white/20"}`} />
        ))}
      </div>

      {/* Profile & Main Content Area */}
      <div className="flex-1 p-[1.4cqw] overflow-hidden">
        {/* Profile Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-[1cqw]">
          <div className="flex items-center gap-[1cqw]">
            <Avatar className="h-[5.5cqw] w-[5.5cqw] rounded-full ring-[0.2cqw] ring-[#3786ba]" />
            <div>
              <div className="flex items-center gap-[0.6cqw]">
                <h2 className="text-[1.6cqw] font-bold">{HERO_PERSON.name}</h2>
                <span className="rounded bg-emerald-500/20 px-[0.5cqw] py-[0.1cqw] text-[0.65cqw] font-semibold text-emerald-400">
                  Verified Profile
                </span>
              </div>
              <p className="text-[0.95cqw] text-white/70">{HERO_PERSON.title}</p>
              <p className="mt-[0.2cqw] max-w-[36cqw] truncate text-[0.7cqw] text-white/40">
                {HERO_PERSON.about}
              </p>
            </div>
          </div>
          <button className="rounded border border-white/20 bg-white/5 px-[0.8cqw] py-[0.3cqw] text-[0.8cqw] font-medium text-white/80">
            2. Profile
          </button>
        </div>

        {/* Dashboard 2-Column Grid */}
        <div className="mt-[1cqw] grid grid-cols-[1.65fr_1fr] gap-[1cqw]">
          {/* Left Column: Milestones & Graph */}
          <div className="space-y-[0.8cqw]">
            <div>
              <span className="text-[0.9cqw] font-bold text-white/90">Verified Project Milestones</span>
              <div className="mt-[0.5cqw] grid grid-cols-3 gap-[0.5cqw]">
                <MilestoneCard title="Cloud Infrastructure" status="3 days ago" prog="3/3" color="from-[#1e4465] to-[#122335]" />
                <MilestoneCard title="Global Delivery Engine" status="1 day ago" prog="2/3" color="from-[#3a3562] to-[#1d1b38]" />
                <MilestoneCard title="Product Strategy Q1" status="5 days ago" prog="5/5" color="from-[#5a3a2d] to-[#2b1b15]" />
              </div>
            </div>

            {/* Interactive Spider/Learning Path */}
            <div className="rounded-[0.6cqw] border border-white/5 bg-white/[0.02] p-[0.7cqw]">
              <span className="text-[0.8cqw] font-semibold text-white/80">Learning Path</span>
              <div className="relative mt-2 h-[8cqw] w-full">
                <svg viewBox="0 0 200 70" className="h-full w-full">
                  <line x1="100" y1="35" x2="35" y2="20" stroke="#3786ba" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="100" y1="35" x2="45" y2="55" stroke="#3786ba" strokeWidth="1" />
                  <line x1="100" y1="35" x2="160" y2="20" stroke="#3786ba" strokeWidth="1" />
                  <line x1="100" y1="35" x2="155" y2="55" stroke="#3786ba" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx="100" cy="35" r="12" fill="#1b4566" stroke="#4da3de" strokeWidth="1.5" />
                  <text x="100" y="37" textAnchor="middle" fontSize="5" fill="#fff" fontWeight="bold">Verified Skills</text>
                  {/* Nodes */}
                  <rect x="15" y="14" width="36" height="10" rx="3" fill="#0d1b28" stroke="#3786ba" strokeWidth="0.8" />
                  <text x="33" y="21" textAnchor="middle" fontSize="4" fill="#a4d1f2">Architecture</text>
                  <rect x="25" y="50" width="36" height="10" rx="3" fill="#0d1b28" stroke="#3786ba" strokeWidth="0.8" />
                  <text x="43" y="57" textAnchor="middle" fontSize="4" fill="#a4d1f2">Kubernetes</text>
                  <rect x="140" y="14" width="38" height="10" rx="3" fill="#0d1b28" stroke="#3786ba" strokeWidth="0.8" />
                  <text x="159" y="21" textAnchor="middle" fontSize="4" fill="#a4d1f2">System Design</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column: Verified Skills & Project Tags */}
          <div className="space-y-[0.8cqw]">
            <div className="rounded-[0.6cqw] border border-white/5 bg-white/[0.02] p-[0.7cqw]">
              <span className="text-[0.85cqw] font-bold text-white/90">Verified Skills</span>
              <div className="mt-2 space-y-[0.4cqw]">
                {["Python Architecture", "Cloud Engineering", "Data Modeling", "Market Research"].map((skill) => (
                  <div key={skill} className="flex items-center gap-[0.5cqw] text-[0.75cqw] text-white/80">
                    <span className="flex h-[1.1cqw] w-[1.1cqw] items-center justify-center rounded-full bg-emerald-400 text-[0.65cqw] font-bold text-black">✓</span>
                    {skill}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[0.8cqw] font-semibold text-white/70">Project Tags</span>
              <div className="mt-1.5 flex flex-wrap gap-[0.4cqw]">
                {["Blockchain", "Cloud", "Agile", "TypeScript"].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-[0.6cqw] py-[0.15cqw] text-[0.65cqw] text-white/60">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestoneCard({ title, status, prog, color }: { title: string; status: string; prog: string; color: string }) {
  return (
    <div className={`rounded-[0.5cqw] bg-gradient-to-br ${color} p-[0.6cqw] border border-white/10`}>
      <div className="flex justify-between items-center text-[0.6cqw] text-white/60">
        <span>{prog}</span>
        <span>{status}</span>
      </div>
      <p className="mt-1 font-semibold leading-tight text-[0.75cqw] text-white">{title}</p>
      <span className="mt-1.5 inline-block rounded bg-emerald-400/80 px-[0.3cqw] py-[0.05cqw] text-[0.55cqw] font-bold text-black">
        verified
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Avatar & SVG Elements
───────────────────────────────────────────────────────────────────────────── */

function Avatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="50" fill="#1b2a3a" />
      <circle cx="50" cy="40" r="20" fill="#a4714f" />
      <path d="M20 90 C 20 65, 80 65, 80 90 Z" fill="#0d141e" />
    </svg>
  );
}

function SmartGlassesSVG() {
  return (
    <svg viewBox="0 0 200 80" className="w-full">
      <defs>
        <linearGradient id="lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2e76a8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#14283c" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Frames */}
      <rect x="15" y="20" width="75" height="42" rx="10" fill="url(#lens)" stroke="#222830" strokeWidth="4" />
      <rect x="110" y="20" width="75" height="42" rx="10" fill="url(#lens)" stroke="#222830" strokeWidth="4" />
      <path d="M90 32 Q 100 26 110 32" stroke="#222830" strokeWidth="4" fill="none" />
      {/* Subtle HUD Glow */}
      <circle cx="32" cy="35" r="3" fill="#60b8f6" opacity="0.8" />
      <circle cx="168" cy="35" r="3" fill="#58e0a5" opacity="0.8" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bottom Section: Trust, Features, Compare Proofolio vs. Resume
───────────────────────────────────────────────────────────────────────────── */

export function BottomSection() {
  const [tab, setTab] = useState<"Verify" | "Curate" | "Share">("Verify");
  const [compare, setCompare] = useState<"proofolio" | "resume">("proofolio");

  return (
    <div className="border-t border-white/10 bg-[#06090e] px-5 py-20 sm:px-10 lg:px-[5vw]">
      <div className="mx-auto grid max-w-[1560px] gap-12 lg:grid-cols-3">
        {/* 1. Trust and Security */}
        <div>
          <h3 className="text-xl font-bold">Trust and Security</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Proof is a suitable identity to maximize the new currency with verified validation and comprehensive ownership.
          </p>
        </div>

        {/* 2. Core Features (Verify -> Curate -> Share) */}
        <div>
          <h3 className="text-xl font-bold">Core Features</h3>
          <p className="text-xs text-white/40">(Verify → Curate → Share)</p>
          <div className="mt-4 flex gap-2">
            {(["Verify", "Curate", "Share"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition ${tab === item ? "bg-[#2778a5] text-white" : "border border-white/10 bg-white/5 text-white/60"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Compare Proofolio vs. Resume */}
        <div>
          <h3 className="text-xl font-bold">Compare Proofolio vs. Resume</h3>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setCompare("proofolio")}
              className={`rounded px-5 py-2 text-xs font-bold transition ${compare === "proofolio" ? "bg-[#2778a5] text-white" : "border border-white/10 text-white/60"
                }`}
            >
              Proofolio
            </button>
            <span className="text-xs text-white/40">VS.</span>
            <button
              onClick={() => setCompare("resume")}
              className={`rounded px-5 py-2 text-xs font-bold transition ${compare === "resume" ? "bg-[#2778a5] text-white" : "border border-white/10 text-white/60"
                }`}
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}