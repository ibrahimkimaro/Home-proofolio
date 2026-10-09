"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Heart, Laptop, Smartphone, Eye, Sparkles } from "lucide-react";

type Props = {
  underFixedHeader?: boolean;
  fadeTo?: string;
  id?: string;
  "data-scene"?: number;
};

export function HeroDesk({ underFixedHeader = false, fadeTo = "to-[#0a1119]", id, ...rest }: Props) {
  const [activePin, setActivePin] = useState<string | null>("watch");

  const DEVICES = [
    {
      id: "watch",
      name: "Apple Watch",
      title: "Life & Wellness Tracker",
      desc: "Tracks resting HR, workouts, sleep quality & daily energy. 100% private to you.",
      badge: "152 BPM • Peak Cardio Logged",
      icon: Heart,
      accent: "rose",
      color: "border-rose-500/40 bg-rose-500/10 text-rose-300",
      activeBorder: "ring-2 ring-rose-500/50 border-rose-500/60 bg-[#140f18]/90",
    },
    {
      id: "laptop",
      name: "MacBook Pro",
      title: "Verified Work Architecture",
      desc: "Cryptographic project milestones, verified skill spider graphs, and career credentials.",
      badge: "Multi-Discipline Portfolio • Verified",
      icon: Laptop,
      accent: "sky",
      color: "border-sky-500/40 bg-sky-500/10 text-sky-300",
      activeBorder: "ring-2 ring-sky-500/50 border-sky-500/60 bg-[#0d1624]/90",
    },
    {
      id: "phone",
      name: "iPhone Companion",
      title: "Daily Pulse Companion",
      desc: "Morning focus intent & evening review. Instant capture of notes, milestones & habits.",
      badge: "Synced with Encrypted Ledger",
      icon: Smartphone,
      accent: "emerald",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      activeBorder: "ring-2 ring-emerald-500/50 border-emerald-500/60 bg-[#0d1c16]/90",
    },
    {
      id: "glasses",
      name: "Smart AR Glasses",
      title: "Cognitive Focus State",
      desc: "Ambient visual cues for deep focus sessions, experiment reviews & active goals.",
      badge: "Ambient Focus Active",
      icon: Eye,
      accent: "purple",
      color: "border-purple-500/40 bg-purple-500/10 text-purple-300",
      activeBorder: "ring-2 ring-purple-500/50 border-purple-500/60 bg-[#161022]/90",
    },
  ];

  return (
    <section
      id={id}
      data-scene={rest["data-scene"]}
      className={`relative overflow-hidden bg-[#05080c] text-white lg:min-h-[100svh] flex flex-col justify-center ${underFixedHeader ? "pt-24 lg:pt-20" : "pt-12"
        }`}
    >
      {/* Background Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,#122234_0%,#081018_60%,#04070a_100%)]" />
        <div className="absolute top-[20%] left-[10%] h-[350px] w-[350px] rounded-full bg-[#388ec2]/12 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] h-[350px] w-[350px] rounded-full bg-[#e85268]/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1560px] px-5 sm:px-10 lg:px-[5vw] py-8 lg:py-12">
        {/* Top Text / Copy Section - Animated with smooth entrance choreography */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 font-display text-[clamp(2.1rem,4.6vw,4.2rem)] font-extrabold leading-[1.05] tracking-tight text-white"
          >
            Build. Prove. Connect.
            <span className="mt-1 block text-[clamp(2.1rem,3.6vw,3.4rem)] font-extrabold bg-gradient-to-r from-[#90cbf5] via-[#ffffff] to-[#a8e6cf] bg-clip-text text-transparent">
              A living professional identity for every discipline.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-4 mb-5 max-w-2xl text-[15px] leading-snug text-white/70"
          >
            A simple place to show who you are, what you do, what you’ve built, what you’ve learned, and how you’ve grown.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/start"
              className="rounded-lg bg-[#2778a5] px-8 py-3.5 text-center text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_35px_-5px_rgba(39,120,165,0.7)] transition hover:scale-[1.03] active:scale-95 hover:bg-[#318fc2]"
            >
              Start Your Free Archive
            </Link>
            <a
              href="#growth-section"
              className="rounded-lg border border-white/20 bg-white/5 px-6 py-3.5 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              Explore Life &amp; Wellness Tracker →
            </a>
          </motion.div>
        </motion.div>

        {/* ── Centerpiece: Clean, Unobstructed Multi-Device Showcase Stage ── */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-8 sm:mt-12 w-full max-w-[1240px]"
        >
          <div className="group relative aspect-[1024/559] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-[#070b10] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
            <Image
              src="/images/hero-devices-showcase.jpg"
              alt="Home Proofolio complete hardware showcase: MacBook dashboard, mobile companion, smart AR glasses, and Apple Watch health tracker on a studio desk"
              fill
              priority
              quality={95}
              sizes="(min-width: 1280px) 1240px, (min-width: 1024px) 90vw, 100vw"
              className="object-contain"
            />

            {/* Subtle Gradient Framing to melt edges */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#05080c] to-transparent pointer-events-none" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />

            {/* ── Interactive Hotspot Pins (Non-Obstructive Pulse Markers) ── */}
            {/* 1. Apple Watch */}
            <div
              className="absolute right-[4.5%] bottom-[16%] z-20 cursor-pointer"
              onMouseEnter={() => setActivePin("watch")}
              onClick={() => setActivePin("watch")}
              title="Apple Watch: Life & Wellness Tracker"
            >
              <div className="relative flex items-center justify-center">
                <span className={`absolute h-7 w-7 rounded-full bg-rose-500/40 ${activePin === "watch" ? "animate-ping" : ""}`} />
                <button
                  type="button"
                  aria-label="Apple Watch Wellness Tracker"
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg transition-transform ${activePin === "watch" ? "bg-rose-500 scale-125 ring-2 ring-white/80" : "bg-rose-500/80 hover:scale-110"
                    }`}
                >
                  <Heart className="h-3 w-3 fill-current" />
                </button>
              </div>
            </div>

            {/* 2. MacBook */}
            <div
              className="absolute left-[54%] top-[12%] z-20 cursor-pointer"
              onMouseEnter={() => setActivePin("laptop")}
              onClick={() => setActivePin("laptop")}
              title="MacBook: Verified Work Architecture"
            >
              <div className="relative flex items-center justify-center">
                <span className={`absolute h-7 w-7 rounded-full bg-sky-500/40 ${activePin === "laptop" ? "animate-ping" : ""}`} />
                <button
                  type="button"
                  aria-label="Laptop Verified Architecture"
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg transition-transform ${activePin === "laptop" ? "bg-sky-500 scale-125 ring-2 ring-white/80" : "bg-sky-500/80 hover:scale-110"
                    }`}
                >
                  <Laptop className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 3. iPhone */}
            <div
              className="absolute left-[13%] top-[34%] z-20 cursor-pointer"
              onMouseEnter={() => setActivePin("phone")}
              onClick={() => setActivePin("phone")}
              title="iPhone: Daily Pulse Companion"
            >
              <div className="relative flex items-center justify-center">
                <span className={`absolute h-7 w-7 rounded-full bg-emerald-500/40 ${activePin === "phone" ? "animate-ping" : ""}`} />
                <button
                  type="button"
                  aria-label="iPhone Mobile Companion"
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-black shadow-lg transition-transform ${activePin === "phone" ? "bg-emerald-400 scale-125 ring-2 ring-white/80" : "bg-emerald-500/80 hover:scale-110"
                    }`}
                >
                  <Smartphone className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 4. Smart Glasses */}
            <div
              className="absolute left-[34%] bottom-[12%] z-20 cursor-pointer"
              onMouseEnter={() => setActivePin("glasses")}
              onClick={() => setActivePin("glasses")}
              title="Smart Glasses: Cognitive Focus State"
            >
              <div className="relative flex items-center justify-center">
                <span className={`absolute h-7 w-7 rounded-full bg-purple-500/40 ${activePin === "glasses" ? "animate-ping" : ""}`} />
                <button
                  type="button"
                  aria-label="Smart AR Glasses"
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg transition-transform ${activePin === "glasses" ? "bg-purple-500 scale-125 ring-2 ring-white/80" : "bg-purple-500/80 hover:scale-110"
                    }`}
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Wrapped Interactive Feature Deck (Positioned Cleanly Below Devices) ── */}
          {/* Solves the issue: screen and watch are never blocked, and wraps perfectly on all screens */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {DEVICES.map((dev) => {
              const Icon = dev.icon;
              const isSelected = activePin === dev.id;
              return (
                <div
                  key={dev.id}
                  onClick={() => setActivePin(dev.id)}
                  onMouseEnter={() => setActivePin(dev.id)}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer backdrop-blur-xl ${isSelected
                    ? dev.activeBorder + " shadow-lg shadow-black/40 scale-[1.02]"
                    : "border-white/10 bg-[#0c121d]/75 hover:bg-[#0c121d]/95 hover:border-white/20"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dev.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-mono text-white/50">{dev.name}</span>
                  </div>

                  <h3 className="mt-3 text-[14px] sm:text-[15px] font-bold text-white tracking-tight">
                    {dev.title}
                  </h3>

                  <p className="mt-1.5 text-[12px] leading-relaxed text-white/70 line-clamp-2">
                    {dev.desc}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                    <span className="truncate">{dev.badge}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Caption Bar Below Showcase */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50 px-2">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Studio Ecosystem
              </span>
              <span className="hidden sm:inline">Click any device card or pin to highlight features</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Secure &bull; Verified &bull; Yours</span>
              <span>Trusted across all disciplines</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Edge gradient fade */}
      <div aria-hidden className={`h-16 w-full bg-gradient-to-b from-transparent ${fadeTo}`} />
    </section>
  );
}
