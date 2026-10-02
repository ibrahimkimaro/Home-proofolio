"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Layers,
  Users,
  ShieldCheck,
  Workflow,
  ChevronRight,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
  {
    href: "#showcase",
    label: "Living Showcase",
    shortLabel: "Showcase",
    desc: "Interactive identity preview & verified feeds",
    icon: Sparkles,
  },
  {
    href: "#pipeline",
    label: "Desk to Proof Pipeline",
    shortLabel: "Pipeline",
    desc: "7-node verification hub & immutable seals",
    icon: Layers,
  },
  {
    href: "#who-its-for",
    label: "Who It's For",
    shortLabel: "Who it's for",
    desc: "Universal attribution for any discipline",
    icon: Users,
  },
  {
    href: "#proof",
    label: "Evidence Vault",
    shortLabel: "Proof & Vault",
    desc: "Cryptographically verifiable primary records",
    icon: ShieldCheck,
  },
  {
    href: "#how-it-works",
    label: "How It Works",
    shortLabel: "How it works",
    desc: "Capture, verify, and share your living proof",
    icon: Workflow,
  },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent background scroll & enable ESC key handling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled || menuOpen
          ? "border-hairline/80 bg-paper/85 backdrop-blur-xl shadow-2xs"
          : "border-transparent bg-paper/0"
        }`}
    >
      <div className="mx-auto flex h-14 max-w-full items-center justify-between px-4 sm:px-5">
        {/* Brand Logo & Name */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-ink text-paper shadow-2xs ring-1 ring-white/10">
            <Image
              src="/images/home-profolio-logo.jpeg"
              alt="Home Proofolio"
              width={26}
              height={26}
              className="rounded-lg object-cover"
            />
          </div>
          <span className="font-display text-[15px] font-bold text-ink-700 tracking-tight">
            Home Proofolio
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-slate transition-colors hover:text-ink-700"
            >
              {link.shortLabel}
            </a>
          ))}
        </nav>

        {/* Desktop Quick Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="btn-glass px-4 py-1.5 text-[13px] font-medium text-ink-700 hover:text-black"
          >
            Sign in
          </Link>
          <Link
            href="/start"
            className="btn-glass-primary px-4 py-1.5 text-[13px] font-semibold text-paper"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Header Controls: Theme toggle + Animated Menu Hamburger Button */}
        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="btn-glass flex h-9 w-9 items-center justify-center p-0"
          >
            <div className="relative h-4 w-4">
              <span
                className={`absolute left-0 block h-[1.75px] w-4 bg-ink-700 transition-all duration-300 ease-out ${menuOpen
                    ? "top-[7px] rotate-45"
                    : "top-[2.5px]"
                  }`}
              />
              <span
                className={`absolute left-0 block h-[1.75px] w-4 bg-ink-700 transition-all duration-300 ease-out ${menuOpen
                    ? "top-[7px] -rotate-45"
                    : "top-[11.5px]"
                  }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Redesigned Apple-Style Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-md md:hidden"
              aria-hidden="true"
            />

            {/* Apple Liquid Glass Dropdown Sheet */}
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-hairline/80 bg-paper/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto max-w-lg space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                    Explore Platform
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brass-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Living Credential Network
                  </span>
                </div>

                {/* Navigation Items: Apple-style interactive frosted cards */}
                <div className="space-y-2">
                  {NAV_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center justify-between rounded-2xl border border-hairline/70 bg-paper/70 p-3 shadow-2xs backdrop-blur-md transition-all hover:bg-paper hover:border-brass/50 hover:shadow-xs active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink-700 shadow-2xs transition-transform group-hover:scale-110 group-hover:text-brass-dark">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[14px] font-semibold text-ink-700 truncate">
                              {link.label}
                            </span>
                            <span className="block text-[11px] text-slate truncate">
                              {link.desc}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate/40 transition-transform group-hover:translate-x-1 group-hover:text-ink-700" />
                      </a>
                    );
                  })}
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="btn-glass flex h-11 items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-700 hover:text-black"
                  >
                    <LogIn className="h-4 w-4 text-brass-dark" />
                    <span>Sign in</span>
                  </Link>

                  <Link
                    href="/start"
                    onClick={() => setMenuOpen(false)}
                    className="btn-glass-primary flex h-11 items-center justify-center gap-1.5 text-[13px] font-semibold text-paper"
                  >
                    <span>Get started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Bottom Control Strip */}
                <div className="flex items-center justify-between rounded-xl border border-hairline/60 bg-paper-dim/60 px-3.5 py-2.5 text-[12px] text-slate">
                  <span className="font-medium">Switch appearance</span>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
