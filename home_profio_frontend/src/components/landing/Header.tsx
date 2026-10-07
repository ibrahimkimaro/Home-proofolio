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
  QrCode,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export type HeaderLink = {
  href: string;
  label: string;
  shortLabel: string;
  desc: string;
  icon: LucideIcon;
  /** Only in the desktop bar on extra-wide screens (the phone menu always lists everything). */
  wide?: boolean;
};

const NAV_LINKS: HeaderLink[] = [
  {
    href: "#features",
    label: "Trust, Core Features & Compare",
    shortLabel: "Features",
    desc: "Trust and security, Verify → Curate → Share, Proofolio vs. resume",
    icon: BadgeCheck,
  },
  {
    href: "#showcase",
    label: "Living Showcase",
    shortLabel: "Showcase",
    desc: "Interactive identity preview & verified feeds",
    icon: Sparkles,
    wide: true,
  },
  {
    href: "#pipeline",
    label: "Desk to Proof Pipeline",
    shortLabel: "Pipeline",
    desc: "7-node verification hub & immutable seals",
    icon: Layers,
    wide: true,
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
  {
    href: "#connect",
    label: "CV & Connect",
    shortLabel: "Connect",
    desc: "Signed CV, QR sharing, chat and calls",
    icon: QrCode,
    wide: true,
  },
];

/**
 * The landing header, shared by both landing pages.
 *  - "light" (default): the classic page's sticky, theme-aware bar.
 *  - "night": the scroll-driven page's fixed bar over the dark stage (white type, no theme toggle).
 * `links` replaces the default anchors, for pages whose sections are named differently.
 */
export function Header({ variant = "light", links = NAV_LINKS }: { variant?: "light" | "night"; links?: HeaderLink[] }) {
  const night = variant === "night";
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

  const bar = night
    ? "fixed inset-x-0 top-0 z-50 border-b border-transparent"
    : `sticky top-0 z-50 border-b transition-all duration-300 ${scrolled || menuOpen
        ? "border-hairline/80 bg-paper/85 backdrop-blur-xl shadow-2xs"
        : "border-transparent bg-paper/0"
      }`;
  const linkCls = night ? "text-white/85 hover:text-white" : "text-slate hover:text-ink-700";
  const barH = night ? "h-16" : "h-14";
  const sheetTop = night ? "top-16" : "top-14";

  return (
    <header className={bar}>
      {night && (
        // the fade lives on its own layer: a mask on the header would also cut off the phone menu
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/45 to-transparent backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
        />
      )}
      <div className={`relative mx-auto flex ${barH} max-w-full items-center justify-between px-4 sm:px-5 ${night ? "sm:px-10" : ""}`}>
        {/* Brand Logo & Name */}
        <Link
          href="/"
          onClick={(e) => {
            setMenuOpen(false);
            if (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "")) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-label="Home Proofolio"
          className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          {night ? (
            <>
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-white/20 shadow-md">
                <Image
                  src="/images/home-profolio-logo.jpeg"
                  alt="Home Proofolio"
                  width={36}
                  height={36}
                  priority
                  className="rounded-xl object-cover"
                />
              </div>
              <span className="font-display text-[15px] sm:text-[17px] font-bold text-white tracking-tight leading-tight">
                Home Proofolio
              </span>
            </>
          ) : (
            <>
              <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-ink/10 shadow-2xs">
                <Image
                  src="/images/home-profolio-logo.jpeg"
                  alt="Home Proofolio"
                  width={32}
                  height={32}
                  priority
                  className="rounded-lg object-cover"
                />
              </div>
              <span className="font-display text-[15px] sm:text-[16px] font-bold text-ink-700 tracking-tight">Home Proofolio</span>
            </>
          )}
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-[13px] font-medium transition-colors ${linkCls} ${link.wide ? "hidden xl:block" : ""} ${night ? "sm:text-[14px] font-semibold" : ""}`}
            >
              {link.shortLabel}
            </a>
          ))}
        </nav>

        {/* Desktop Quick Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          {!night && <ThemeToggle />}
          <Link
            href="/login"
            className={night ? "rounded-full px-4 py-2 text-[14px] font-semibold text-white/90 transition-colors hover:text-white" : "btn-glass px-4 py-1.5 text-[13px] font-medium text-ink-700 hover:text-black"}
          >
            {night ? "Log In" : "Sign in"}
          </Link>
          <Link
            href="/start"
            className={night ? "rounded-lg border border-white/25 bg-[#17475a] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_24px_-8px_rgba(60,170,200,0.6)] transition-transform hover:scale-[1.03]" : "btn-glass-primary px-4 py-1.5 text-[13px] font-semibold text-paper"}
          >
            {night ? "Get Started" : "Get started"}
          </Link>
        </div>

        {/* Mobile Header Controls: Theme toggle + Animated Menu Hamburger Button */}
        <div className="flex items-center gap-1.5 md:hidden">
          {night ? (
            <Link href="/start" className="rounded-lg border border-white/25 bg-[#17475a] px-3 py-2 text-[12px] font-semibold text-white">
              Get Started
            </Link>
          ) : (
            <ThemeToggle />
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className={night ? "flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] p-0" : "btn-glass flex h-9 w-9 items-center justify-center p-0"}
          >
            <div className="relative h-4 w-4">
              <span
                className={`absolute left-0 block h-[1.75px] w-4 ${night ? "bg-white" : "bg-ink-700"} transition-all duration-300 ease-out ${menuOpen ? "top-[7px] rotate-45" : "top-[2.5px]"}`}
              />
              <span
                className={`absolute left-0 block h-[1.75px] w-4 ${night ? "bg-white" : "bg-ink-700"} transition-all duration-300 ease-out ${menuOpen ? "top-[7px] -rotate-45" : "top-[11.5px]"}`}
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
              className={`fixed inset-0 ${sheetTop} z-40 bg-black/40 backdrop-blur-md md:hidden`}
              aria-hidden="true"
            />

            {/* Apple Liquid Glass Dropdown Sheet */}
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={`fixed inset-x-0 ${sheetTop} z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b p-4 sm:p-6 shadow-2xl backdrop-blur-2xl md:hidden ${night ? "border-white/15 bg-[#0b131c]/95 text-white" : "border-hairline/80 bg-paper/95"}`}
            >
              <div className="mx-auto max-w-lg space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${night ? "text-white/60" : "text-slate"}`}>
                    Explore Platform
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${night ? "text-[#e8c777]" : "text-brass-dark"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Living Credential Network
                  </span>
                </div>

                {/* Navigation Items: Apple-style interactive frosted cards */}
                <div className="space-y-2">
                  {links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`group flex items-center justify-between rounded-2xl border p-3 backdrop-blur-md transition-all active:scale-[0.98] ${night ? "border-white/12 bg-white/[0.05] hover:bg-white/[0.09]" : "border-hairline/70 bg-paper/70 shadow-2xs hover:bg-paper hover:border-brass/50 hover:shadow-xs"}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${night ? "bg-white/10 text-white" : "bg-paper-dim text-ink-700 shadow-2xs group-hover:text-brass-dark"}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <span className={`block text-[14px] font-semibold truncate ${night ? "text-white" : "text-ink-700"}`}>{link.label}</span>
                            <span className={`block text-[11px] truncate ${night ? "text-white/55" : "text-slate"}`}>{link.desc}</span>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 ${night ? "text-white/40" : "text-slate/40 group-hover:text-ink-700"}`} />
                      </a>
                    );
                  })}
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-11 items-center justify-center gap-1.5 text-[13px] font-semibold ${night ? "rounded-xl border border-white/20 text-white hover:bg-white/10" : "btn-glass text-ink-700 hover:text-black"}`}
                  >
                    <LogIn className={`h-4 w-4 ${night ? "text-[#e8c777]" : "text-brass-dark"}`} />
                    <span>Sign in</span>
                  </Link>

                  <Link
                    href="/start"
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-11 items-center justify-center gap-1.5 text-[13px] font-semibold ${night ? "rounded-xl border border-white/25 bg-[#17475a] text-white" : "btn-glass-primary text-paper"}`}
                  >
                    <span>Get started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Bottom Control Strip */}
                {!night && (
                  <div className="flex items-center justify-between rounded-xl border border-hairline/60 bg-paper-dim/60 px-3.5 py-2.5 text-[12px] text-slate">
                    <span className="font-medium">Switch appearance</span>
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
