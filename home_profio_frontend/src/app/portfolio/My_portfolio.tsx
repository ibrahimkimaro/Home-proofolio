"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import {
  Sun,
  Moon,
  ExternalLink,
  Mail,
  Send,
  X,
  Code2,
  Database,
  Cpu,
  Globe,
  Sparkles,
  Check,
  Briefcase,
  ArrowRight,
  Layers,
  Server,
  Workflow,
  CheckCircle2,
  Palette,
  Laptop,
  Menu,
  BookOpen,
  FileText,
  AlertTriangle,
  TrendingUp,
  Award,
  ShieldCheck,
  Activity,
  Flame,
  Zap,
  CornerDownRight,
  Share2,
  BadgeCheck,
} from "lucide-react";
import { ThinkingOrb } from "@/components/ui/ThinkingOrb";
import { ShareCardButton } from "@/components/app/ShareCard";
import {
  fetchCurrentUser,
  fetchPortfolio,
  listMyRoles,
  listWork,
  mediaUrl,
  type PortfolioSection,
  type PortfolioSettings,
  type Profile,
  type PublicProfile,
  type User,
  type Work,
} from "@/lib/api";
import { formatMonth, isPublic, kindOf } from "@/lib/items";
import {
  readAppearance,
  applyAppearance,
  TONES,
  type Appearance,
  type ThemeChoice,
  type ToneId,
} from "@/lib/appearance";

export interface MyPortfolioProps {
  initialUser?: Partial<User> | null;
  initialPortfolio?: PortfolioSettings | null;
  initialWorks?: Work[] | null;
  initialRoles?: {
    title: string;
    organization?: string;
    start_date?: string | null;
    end_date?: string | null;
    current?: boolean;
    business_slug?: string | null;
    trust?: string;
  }[] | null;
  publicProfile?: PublicProfile | null;
}

export default function MyPortfolio({
  initialUser,
  initialPortfolio,
  initialWorks,
  initialRoles,
  publicProfile,
}: MyPortfolioProps) {
  // State
  const [user, setUser] = useState<Partial<User> | null>(() => {
    if (publicProfile) {
      return {
        profile: {
          username: publicProfile.username,
          display_name: publicProfile.display_name,
          avatar_url: publicProfile.avatar_url,
          bio: publicProfile.bio,
          headline: publicProfile.headline,
          visibility: "public",
        } as Profile,
      };
    }
    return initialUser ?? null;
  });

  const [portfolio, setPortfolio] = useState<PortfolioSettings | null>(
    publicProfile ? publicProfile.portfolio : initialPortfolio ?? null
  );

  const [works, setWorks] = useState<Work[]>(
    publicProfile ? publicProfile.works : initialWorks ?? []
  );

  const [roles, setRoles] = useState<
    {
      title: string;
      organization?: string;
      start_date?: string | null;
      end_date?: string | null;
      current?: boolean;
      business_slug?: string | null;
      trust?: string;
    }[]
  >(
    publicProfile
      ? publicProfile.roles.map((r) => ({ ...r, organization: r.organization ?? undefined }))
      : initialRoles ?? []
  );

  // Theme & Appearance State
  const [appearance, setAppearance] = useState<Appearance | null>(() => {
    if (typeof window !== "undefined") {
      return readAppearance();
    }
    return null;
  });
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contact form state
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  // Global Scroll-Driven Top Progress Bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Load client data & appearance on mount
  useEffect(() => {
    // Saved appearance lives in the browser, so it's read after mount (reading it during render would
    // make the server and client markup differ).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance(readAppearance());

    if (publicProfile || (initialUser && initialPortfolio)) return;

    let active = true;
    Promise.all([
      fetchCurrentUser().catch(() => null),
      fetchPortfolio().catch(() => null),
      listWork().catch(() => []),
      listMyRoles().catch(() => []),
    ]).then(([u, p, w, r]) => {
      if (!active) return;
      if (u) setUser(u);
      if (p) setPortfolio(p);
      if (w) setWorks(w.filter((item: Work) => isPublic(item) && kindOf(item) !== "capture"));
      if (r) {
        setRoles(
          r.map((x) => ({
            title: x.title,
            organization: x.organization_name || x.business?.name || "",
            start_date: x.start_date,
            end_date: x.end_date,
            current: x.current,
            business_slug: x.business?.slug ?? null,
            trust: x.trust,
          }))
        );
      }
    });

    return () => {
      active = false;
    };
  }, [publicProfile, initialUser, initialPortfolio]);

  // Handle Theme and Tone Changes
  const handleThemeChange = (theme: ThemeChoice) => {
    if (!appearance) return;
    const next: Appearance = { ...appearance, theme };
    setAppearance(next);
    applyAppearance(next);
  };

  const handleToneChange = (tone: ToneId) => {
    if (!appearance) return;
    const next: Appearance = {
      ...appearance,
      tone,
      theme: TONES.find((t) => t.id === tone)?.theme || appearance.theme,
    };
    setAppearance(next);
    applyAppearance(next);
  };

  // Derived user details
  const profile = user?.profile;
  // Only the member's own data: never fill a profile with someone else's name, bio or email.
  const username = profile?.username || user?.username || "";
  const displayName = profile?.display_name || user?.fullname || username;
  const bio = portfolio?.tagline || profile?.headline || profile?.bio || "";
  // Public contact is opt-in (Portfolio settings); the sign-in email is private.
  const contactEmailAddress = portfolio?.contact_email || "";
  const verified = publicProfile ? !!publicProfile.verified : !!user && !user.otp_pending;

  // Role list for the animated hero role switcher
  const roleList: string[] = portfolio?.roles?.length
    ? portfolio.roles
    : roles.length
      ? roles.map((r) => r.title)
      : profile?.headline
        ? [profile.headline]
        : [];

  // Dynamic typing / switching for the role switcher
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  useEffect(() => {
    if (roleList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentRoleIndex((prev) => (prev + 1) % roleList.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [roleList.length]);

  // Stats calculation
  const totalProofs = useMemo(() => {
    return works.reduce((sum, w) => sum + (w.evidence_links?.length || 0), 0);
  }, [works]);

  // Skills the member actually attached to work, strongest first (works, then proofs).
  const skillStats = useMemo(() => {
    const m = new Map<string, { name: string; works: number; proofs: number }>();
    for (const w of works) {
      for (const raw of w.skills ?? []) {
        const k = raw.trim().toLowerCase();
        if (!k) continue;
        const e = m.get(k) ?? { name: raw.trim(), works: 0, proofs: 0 };
        e.works += 1;
        e.proofs += w.evidence_links?.length ?? 0;
        m.set(k, e);
      }
    }
    return [...m.values()].sort((a, b) => b.works - a.works || b.proofs - a.proofs || a.name.localeCompare(b.name));
  }, [works]);

  const verifiedProofsCount = useMemo(() => {
    return works.filter((w) => w.evidence_links && w.evidence_links.length > 0).length;
  }, [works]);

  // Categorize Works into typed segments
  const projectWorks = useMemo(
    () => works.filter((w) => w.work_type === "work" || (!w.work_type && kindOf(w) === "work")),
    [works]
  );
  const problemWorks = useMemo(
    () => works.filter((w) => w.work_type === "problem" || kindOf(w) === "problem"),
    [works]
  );
  const learningWorks = useMemo(
    () => works.filter((w) => w.work_type === "learning" || kindOf(w) === "learning"),
    [works]
  );
  const achievementWorks = useMemo(
    () => works.filter((w) => w.work_type === "achievement" || kindOf(w) === "achievement"),
    [works]
  );



  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmailAddress) return;
    // There is no messaging service: hand the message to the visitor's own email app.
    const subject = `Hello from ${contactName || "a visitor"} via Home Proofolio`;
    const body = `${contactMsg}\n\n${contactName}${contactEmail ? ` (${contactEmail})` : ""}`;
    window.location.href = `mailto:${contactEmailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setContactSubmitted(true);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (id.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const isDarkMode =
    appearance?.theme === "dark" ||
    (appearance?.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] dark:bg-[#0B0D13] text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white transition-colors duration-300 relative overflow-x-hidden font-sans">
      {/* ==========================================
          Scroll-Driven Top Progress Bar
          ========================================== */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-blue-600 via-brass-dark to-purple-600 dark:from-brass dark:via-white dark:to-purple-400 z-50 origin-left shadow-xs"
        style={{ scaleX }}
      />

      {/* ==========================================
          Header & Floating Pill Navbar (Responsive for all screens)
          ========================================== */}
      <header className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-full px-3 sm:px-6 flex justify-center pointer-events-none">
        <motion.nav
          initial={{ y: -25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="pointer-events-auto h-13 sm:h-14 w-fit max-w-[96vw] px-4 sm:px-6 rounded-full border border-neutral-200/90 dark:border-neutral-800 bg-white/90 dark:bg-[#13151b]/90 backdrop-blur-xl shadow-md sm:shadow-lg flex items-center justify-between gap-3 sm:gap-6 transition-all relative"
        >
          {/* Brand Wordmark */}
          <a
            href="#home"
            className="text-xs sm:text-sm font-black tracking-widest text-neutral-950 dark:text-white uppercase whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            PROOFOLIO<span className="text-blue-600 dark:text-brass">.</span>
          </a>

          {/* Desktop Anchor Nav Links */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs xl:text-[13px] font-bold text-neutral-600 dark:text-neutral-300">
            <a href="#home" onClick={(e) => scrollToSection(e, "#home")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Home
            </a>
            <a href="#about" onClick={(e) => scrollToSection(e, "#about")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              About
            </a>
            <a href="#experience" onClick={(e) => scrollToSection(e, "#experience")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Experience
            </a>
            <a href="#projects" onClick={(e) => scrollToSection(e, "#projects")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Works
            </a>
            <a href="#problems" onClick={(e) => scrollToSection(e, "#problems")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Problems Solved
            </a>
            <a href="#articles" onClick={(e) => scrollToSection(e, "#articles")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Articles
            </a>
            <a href="#contact" onClick={(e) => scrollToSection(e, "#contact")} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              Contact
            </a>
          </div>

          {/* Theme & Palette Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            <button
              type="button"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Customize Theme & Tone"
              aria-label="Customize Theme & Tone"
            >
              <Palette className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange(isDarkMode ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-brass" /> : <Moon className="h-4 w-4 text-neutral-800" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              aria-label="Toggle menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Theme Dropdown */}
            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-12 right-0 w-68 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#15171e] shadow-2xl z-50 text-xs flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                      Portfolio Theme
                    </span>
                    <button
                      onClick={() => setThemeMenuOpen(false)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                      Color Mode
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={`py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${appearance?.theme === "light"
                          ? "bg-white text-neutral-950 shadow-xs"
                          : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-950"
                          }`}
                      >
                        <Sun className="w-3 h-3" /> Light
                      </button>
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={`py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${appearance?.theme === "dark"
                          ? "bg-[#1f222b] text-white shadow-xs"
                          : "text-neutral-600 dark:text-neutral-300 hover:text-white"
                          }`}
                      >
                        <Moon className="w-3 h-3" /> Dark
                      </button>
                      <button
                        onClick={() => handleThemeChange("system")}
                        className={`py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${appearance?.theme === "system"
                          ? "bg-white dark:bg-[#1f222b] text-neutral-950 dark:text-white shadow-xs"
                          : "text-neutral-600 dark:text-neutral-300"
                          }`}
                      >
                        <Laptop className="w-3 h-3" /> Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                      Comfort Tones
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TONES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleToneChange(t.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${appearance?.tone === t.id
                            ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 font-bold text-neutral-950 dark:text-white ring-1 ring-neutral-900 dark:ring-white"
                            : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
                            }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 shrink-0"
                            style={{ backgroundColor: t.page }}
                          />
                          <span className="truncate text-[11px]">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Drawer Menu */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-56 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#15171e] shadow-2xl z-50 flex flex-col gap-1 text-sm font-bold lg:hidden"
                >
                  <a href="#home" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Home
                  </a>
                  <a href="#about" onClick={(e) => { scrollToSection(e, "#about"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    About Me
                  </a>
                  <a href="#experience" onClick={(e) => { scrollToSection(e, "#experience"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Experience
                  </a>
                  <a href="#skills" onClick={(e) => { scrollToSection(e, "#about"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Tech Stack
                  </a>
                  <a href="#projects" onClick={(e) => { scrollToSection(e, "#projects"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Works & Projects
                  </a>
                  <a href="#problems" onClick={(e) => { scrollToSection(e, "#problems"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Problems Solved
                  </a>
                  <a href="#articles" onClick={(e) => { scrollToSection(e, "#articles"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Articles & Writing
                  </a>
                  <a href="#contact" onClick={(e) => { scrollToSection(e, "#contact"); setMobileMenuOpen(false); }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Contact
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.nav>
      </header>

      {/* ==========================================
          GLOBAL PAGE WRAPPER WITH FULL-BLEED SECTIONS
          ========================================== */}
      <main className="w-full scroll-smooth">
        {/* ==========================================
            1. HERO SECTION (Fluid Full-Bleed Layout)
            ========================================== */}
        <section
          id="home"
          className="w-full min-h-[92vh] pt-28 sm:pt-36 pb-16 flex flex-col justify-center relative overflow-hidden border-b border-neutral-200/90 dark:border-neutral-800"
        >
          {/* Ambient wide-screen gradient background */}
          <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.15),transparent)]" />
          <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-600/5 blur-3xl pointer-events-none animate-float-slow" />
          <div className="absolute bottom-10 -right-32 w-96 h-96 rounded-full bg-purple-500/10 dark:bg-purple-600/5 blur-3xl pointer-events-none animate-float-reverse" />
          <div className="absolute top-12 right-1/4 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-600/5 blur-3xl pointer-events-none animate-pulse-glow" />

          {/* Main Container: 1200px max, centered, responsive padding */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Left Content Block (Col span 7) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 flex flex-col justify-center order-2 lg:order-1"
              >
                {/* H1 Headline: balanced & refined typography */}
                <h1 className="text-[19px] sm:text-[21px] font-bold text-neutral-600 dark:text-neutral-400 tracking-tight leading-snug">
                  Hi, I&apos;m{" "}
                  <span className="text-[26px] sm:text-[30px] font-black text-neutral-950 dark:text-white ml-1">
                    {displayName}
                  </span>
                  {verified && (
                    <BadgeCheck
                      role="img"
                      aria-label="Verified account"
                      className="ml-2 inline-block h-[0.75em] w-[0.75em] -translate-y-[0.1em] text-emerald-500"
                    />
                  )}
                </h1>

                {/* Sub-headline: Role Switcher (Proportional & Smooth) */}
                <div className="h-8 sm:h-9 overflow-hidden flex items-center my-2 sm:my-2.5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentRoleIndex}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="flex items-center"
                    >
                      <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-neutral-700 dark:text-neutral-200">
                        {roleList[currentRoleIndex]}
                      </span>
                      <span className="ml-1 text-blue-600 dark:text-brass animate-pulse font-light text-base sm:text-lg">|</span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bio Block */}
                <p className="text-sm sm:text-base leading-relaxed max-w-xl text-neutral-600 dark:text-neutral-300 my-3 sm:my-4 font-medium">
                  {bio}
                </p>

                {/* Action Button Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-2">
                  <a
                    href="#projects"
                    onClick={(e) => scrollToSection(e, "#projects")}
                    className="h-11 px-7 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-md hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                  >
                    See my work
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <a
                    href="#problems"
                    onClick={(e) => scrollToSection(e, "#problems")}
                    className="h-11 px-6 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-900 dark:text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Problems Solved
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </a>

                  <a
                    href="#contact"
                    onClick={(e) => scrollToSection(e, "#contact")}
                    className="h-11 px-6 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-900 dark:text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Contact
                    <Mail className="w-4 h-4" />
                  </a>

                  {username && (
                    <ShareCardButton
                      data={{ name: displayName, username, headline: profile?.headline, verified, works: works.length, proofs: totalProofs }}
                      isPublic={profile?.visibility === "public" || profile?.visibility === "unlisted"}
                      className="h-12 px-6 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-900 dark:text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                    />
                  )}
                </div>

                {/* Social Links (only what the member shared) */}
                <div className={`mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 items-center gap-3 ${contactEmailAddress ? "flex" : "hidden"}`}>
                  <span className="text-xs uppercase tracking-widest font-extrabold text-neutral-500 dark:text-neutral-400">
                    Connect:
                  </span>
                  {contactEmailAddress && (
                    <a
                      href={`mailto:${contactEmailAddress}`}
                      className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:border-neutral-900 text-neutral-900 dark:text-white transition-all shadow-2xs"
                      title="Direct Email"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Right Media Card Block (Col span 5) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 flex justify-center relative order-1 lg:order-2"
              >
                <div className="relative w-full max-w-[360px] sm:max-w-[420px] aspect-square">
                  <div className="w-full h-full rounded-3xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-2xl relative flex items-center justify-center p-3 group">
                    {profile?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={mediaUrl(profile.avatar_url) || profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-gradient-to-b from-neutral-100 to-neutral-300 dark:from-neutral-800 dark:to-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden border border-neutral-200 dark:border-neutral-800">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-neutral-900/10 dark:border-white/20 flex items-center justify-center font-black text-4xl sm:text-6xl text-neutral-900 dark:text-white shadow-inner bg-white/40 dark:bg-black/40 backdrop-blur-sm">
                          {displayName.charAt(0)}
                        </div>
                        <span className="mt-4 text-xs font-black tracking-widest uppercase text-neutral-800 dark:text-neutral-200">
                          @{username}
                        </span>
                        {verified && (
                          <span className="text-[11px] font-bold text-neutral-500 mt-1">
                            Verified account on Proofolio
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Thinking Orb floating status pill */}
                  <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-20">
                    <div className="p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-[#13151b]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 shadow-xl flex items-center gap-2.5">
                      <ThinkingOrb size={34} state="thinking" />
                      <div className="pr-1 hidden sm:block text-left">
                        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400">Thinking Orb</p>
                        <p className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100">Live Reasoning</p>
                      </div>
                    </div>
                  </div>

                  {/* Overlay badge: only real numbers */}
                  {totalProofs > 0 && (
                    <div className="absolute -bottom-6 -left-4 sm:-left-8 z-20 max-w-[280px]">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex items-center gap-3 bg-white/95 dark:bg-[#15171e]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl shadow-xl"
                      >
                        <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-neutral-900 dark:text-white block">
                            {totalProofs} {totalProofs === 1 ? "proof" : "proofs"} attached
                          </span>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                            Links, files and photos
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Wide-Screen Telemetry Bar (Anchors wide & zoomed-out screens) */}
            <div className="mt-16 pt-8 border-t border-neutral-200/90 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13151b] shadow-2xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 block">
                  Total Works
                </span>
                <span className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-1 block">
                  {works.length}
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  Things done and made
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13151b] shadow-2xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 block">
                  Proofs
                </span>
                <span className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-1 block">
                  {totalProofs}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  Evidence attached
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13151b] shadow-2xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 block">
                  Problems Solved
                </span>
                <span className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-1 block">
                  {problemWorks.length}
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                  Recorded and explained
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13151b] shadow-2xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 block">
                  Learning
                </span>
                <span className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-1 block">
                  {learningWorks.length}
                </span>
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
                  Ideas and lessons
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13151b] shadow-2xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 block">
                  Account
                </span>
                <span className={`text-2xl sm:text-3xl font-black mt-1 block ${verified ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
                  {verified ? "Verified" : "Not verified"}
                </span>
                <span className="text-[11px] font-bold text-neutral-500 mt-0.5 block">
                  {verified ? "Activated with a delivered code" : "Activation pending"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            2. ABOUT ME SECTION
            ========================================== */}
        <section id="about" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
          >
            <div className="text-center mb-16">
              <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
                BIOGRAPHY
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                About {displayName.split(" ")[0]}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column (Col 4): Profile Card */}
              <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-xl">
                <div className="w-20 h-20 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-black text-2xl mb-6 shadow-md">
                  {displayName.charAt(0)}
                </div>
                <h3 className="text-xl font-black text-neutral-950 dark:text-white">
                  {displayName}
                </h3>
                {profile?.headline && (
                  <p className="text-xs uppercase tracking-wider font-extrabold text-blue-600 dark:text-brass mt-1 mb-4">
                    {profile.headline}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium mb-6">
                  {profile?.bio || bio}
                </p>

                <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-xs font-bold">
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Works</span>
                    <span className="text-neutral-950 dark:text-white">{works.length}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Proofs</span>
                    <span className="text-neutral-950 dark:text-white">{totalProofs}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Account</span>
                    <span className={verified ? "text-emerald-600 font-extrabold" : "text-neutral-500"}>{verified ? "Verified" : "Not verified yet"}</span>
                  </div>
                </div>

                {contactEmailAddress && (
                  <a
                    href={`mailto:${contactEmailAddress}`}
                    className="mt-6 w-full py-3 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                  >
                    <Mail className="w-4 h-4" />
                    Send an email
                  </a>
                )}
              </div>

              {/* Right Column (Col 8): skills backed by the member's own work */}
              <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-md">
                <h3 className="text-lg font-black text-neutral-950 dark:text-white">Skills backed by work</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Each skill counts the pieces of work it appears in, and the proof attached.</p>
                {skillStats.length === 0 ? (
                  <p className="mt-6 text-sm text-neutral-500">No skills linked to work yet.</p>
                ) : (
                  <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skillStats.slice(0, 12).map((k) => (
                      <li key={k.name} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
                        <span className="font-bold text-neutral-950 dark:text-white">{k.name}</span>
                        <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
                          {k.works} {k.works === 1 ? "work" : "works"}, {k.proofs} {k.proofs === 1 ? "proof" : "proofs"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ==========================================
            3. EXPERIENCE TIMELINE (Responsive Axis)
            ========================================== */}
        {roles.length > 0 && <ExperienceSection roles={roles} />}

        {/* ==========================================
            5. SELECTED WORKS & PRODUCTION SYSTEMS (4-Col Fluid)
            ========================================== */}
        {works.length > 0 && <SelectedWorksSection works={projectWorks.length > 0 ? projectWorks : works} />}

        {/* ==========================================
            6. PROBLEMS SOLVED SHOWCASE (Root-Cause Engineering)
            ========================================== */}
        {problemWorks.length > 0 && <ProblemsSolvedSection problemWorks={problemWorks} />}

        {/* ==========================================
            7. ARTICLES, PUBLICATIONS & INSIGHTS
            ========================================== */}
        {learningWorks.length > 0 && <ArticlesSection learningWorks={learningWorks} />}

        {/* ==========================================
            9. VERIFIED ACHIEVEMENTS & CREDENTIALS
            ========================================== */}
        {achievementWorks.length > 0 && <AchievementsSection achievementWorks={achievementWorks} />}

        {/* ==========================================
            11. CONTACT SECTION
            ========================================== */}
        {contactEmailAddress && <ContactSection
          contactEmail={contactEmailAddress}
          submitted={contactSubmitted}
          name={contactName}
          email={contactEmail}
          message={contactMsg}
          setName={setContactName}
          setEmail={setContactEmail}
          setMessage={setContactMsg}
          onSubmit={handleContactSubmit}
        />}
      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="w-full border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0d12] py-12 px-4 sm:px-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-bold text-neutral-950 dark:text-white">
              &copy; {new Date().getFullYear()} {displayName}. All verified records signed.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
              Powered by Home Proofolio &middot; Living Professional Identity & Proof of Work
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs uppercase font-extrabold tracking-widest text-neutral-600 dark:text-neutral-400">
            <a href="#home" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
              Back to Top
            </a>
            <Link href="/portfolio" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
              Manage Portfolio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 3. EXPERIENCE TIMELINE COMPONENT
// ==========================================
function ExperienceSection({
  roles,
}: {
  roles: {
    title: string;
    organization?: string;
    start_date?: string | null;
    end_date?: string | null;
    current?: boolean;
    business_slug?: string | null;
    trust?: string;
  }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: spineProgress } = useScroll({
    target: containerRef,
    offset: ["start 75%", "end 75%"],
  });

  const timelineItems = useMemo(() => {
    if (roles && roles.length > 0) {
      return roles.map((r) => ({
        year: r.start_date
          ? `${formatMonth(r.start_date)} - ${r.current || !r.end_date ? "Present" : formatMonth(r.end_date)}`
          : r.current
            ? "Present"
            : "",
        role: r.title,
        org: r.organization || "",
        desc: "",
        tags: [] as string[],
      }));
    }

    return [];
  }, [roles]);

  return (
    <section id="experience" ref={containerRef} className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            CAREER & ROLES
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Experience
          </h2>
        </div>

        <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2.5px] bg-neutral-200 dark:bg-neutral-800 md:-translate-x-1/2" />
          <motion.div
            className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2.5px] bg-neutral-950 dark:bg-white md:-translate-x-1/2 origin-top"
            style={{ scaleY: spineProgress }}
          />

          <div className="space-y-12 sm:space-y-16">
            {timelineItems.map((item, index) => {
              const isOdd = index % 2 === 0;
              return (
                <div key={index} className="relative w-full flex items-center pl-10 md:pl-0">
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-neutral-900 border-2 border-neutral-950 dark:border-white absolute left-4 md:left-1/2 -translate-x-1/2 top-8 z-10 shadow-md" />

                  <div className={`w-full md:w-1/2 ${isOdd ? "md:pr-12 md:text-left" : "md:pl-12 md:ml-auto md:text-left"}`}>
                    <div className="p-6 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-md hover:shadow-2xl transition-all">
                      <span className="text-xs font-black tracking-widest text-blue-600 dark:text-brass uppercase block mb-1">
                        {item.year}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-neutral-950 dark:text-white">
                        {item.role}
                      </h3>
                      <h4 className="text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mt-0.5 mb-3 font-extrabold">
                        {item.org}
                      </h4>
                      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 mb-5 font-medium">
                        {item.desc}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-3 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg uppercase font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ==========================================
// 5. SELECTED WORKS & PRODUCTION SYSTEMS
// ==========================================
function SelectedWorksSection({ works }: { works: Work[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const displayWorks = useMemo(() => {
    if (works && works.length > 0) {
      return works.map((w, i) => ({
        id: w.id,
        num: `0${i + 1}`,
        title: w.title,
        desc: w.description || "",
        tags: (w.skills ?? []).slice(0, 4),
        proofCount: w.evidence_links?.length ?? 0,
        link: `/w/${w.id}`,
        status: w.status,
      }));
    }

    return [];
  }, [works]);

  return (
    <section id="projects" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            VERIFIED WORK
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Selected Works
          </h2>
        </div>

        {/* Adaptive fluid grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayWorks.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.015 }}
              className="flex flex-col justify-between rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 overflow-hidden bg-white dark:bg-[#13151b] shadow-md hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="bg-neutral-950 p-6 flex flex-col justify-between min-h-[160px] relative">
                <div className="flex justify-between items-center z-10">
                  <span className="text-[11px] font-black tracking-widest text-neutral-400 uppercase">
                    {item.num}
                  </span>
                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {item.proofCount} {item.proofCount === 1 ? "proof" : "proofs"}
                  </span>
                </div>

                <div className="my-auto py-2">
                  <Code2 className="w-8 h-8 text-neutral-400 group-hover:text-blue-400 transition-colors" />
                </div>

                <div className="flex flex-wrap gap-1.5 z-10">
                  {item.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-extrabold bg-white/10 text-neutral-200 px-2 py-0.5 rounded uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-neutral-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-brass transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 mt-2.5 mb-6 line-clamp-3 font-medium">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <Link
                    href={item.link}
                    className="w-full py-2.5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-white text-xs font-bold uppercase tracking-wider text-center text-neutral-950 dark:text-white flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-2xs"
                  >
                    See the work and proof
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ==========================================
// 6. PROBLEMS SOLVED SHOWCASE (Root Cause Engineering)
// ==========================================
function ProblemsSolvedSection({ problemWorks }: { problemWorks: Work[] }) {
  const problems = useMemo(() => {
    if (problemWorks && problemWorks.length > 0) {
      // The problem template's own fields; each box shows only if the member filled it in.
      const attr = (p: Work, key: string) => {
        const v = (p.custom_attributes as Record<string, unknown> | undefined)?.[key];
        return typeof v === "string" ? v.trim() : "";
      };
      return problemWorks.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        boxes: [
          { label: "The problem", text: p.description?.trim() || "" },
          { label: "Who is affected", text: attr(p, "who_is_affected") },
          { label: "Why it matters", text: attr(p, "impact") },
          { label: "What was tried", text: attr(p, "tried") },
        ].filter((b) => b.text),
        proofs: p.evidence_links?.length ?? 0,
        link: `/w/${p.id}`,
      }));
    }

    return [];
  }, [problemWorks]);

  return (
    <section id="problems" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden bg-neutral-50/50 dark:bg-[#0e1017]/40">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            ROOT CAUSE ANALYSIS
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Problems Solved
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {problems.map((prob, idx) => (
            <motion.div
              key={prob.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="p-7 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-lg flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                <h3 className="text-lg font-black text-neutral-950 dark:text-white mb-4">
                  {prob.title}
                </h3>

                <div className="space-y-4 text-xs font-medium leading-relaxed">
                  {prob.boxes.map((box) => (
                    <div key={box.label} className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                      <span className="text-[10px] font-black uppercase text-neutral-500 block mb-1">{box.label}</span>
                      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{box.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">
                  {prob.proofs} {prob.proofs === 1 ? "proof" : "proofs"}
                </span>

                <Link
                  href={prob.link}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  See details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ==========================================
// 7. ARTICLES & TECHNICAL PUBLICATIONS
// ==========================================
function ArticlesSection({ learningWorks }: { learningWorks: Work[] }) {
  const articles = useMemo(() => {
    if (learningWorks && learningWorks.length > 0) {
      return learningWorks.map((l, i) => ({
        id: l.id,
        tag: "Learning",
        readTime: `${l.evidence_links?.length ?? 0} ${(l.evidence_links?.length ?? 0) === 1 ? "proof" : "proofs"}`,
        date: formatMonth(l.occurred_on || l.created_at.slice(0, 10)),
        title: l.title,
        abstract: l.description || "",
        link: `/w/${l.id}`,
      }));
    }

    return [];
  }, [learningWorks]);

  return (
    <section id="articles" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            PUBLICATIONS & LEARNING
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Articles & Ideas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {articles.map((art, idx) => (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="p-7 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 mb-4">
                  <span className="text-purple-600 dark:text-purple-400 uppercase tracking-wider font-black">
                    {art.tag}
                  </span>
                  <span>{art.readTime}</span>
                </div>

                <h3 className="text-xl font-black text-neutral-950 dark:text-white group-hover:text-purple-600 dark:group-hover:text-brass transition-colors mb-3">
                  {art.title}
                </h3>

                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium line-clamp-3">
                  {art.abstract}
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">{art.date}</span>
                <Link
                  href={art.link}
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-950 dark:text-white hover:text-purple-600 transition-colors"
                >
                  Read more
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ==========================================
// 9. ACHIEVEMENTS & CREDENTIALS
// ==========================================
function AchievementsSection({ achievementWorks }: { achievementWorks: Work[] }) {
  const achievements = useMemo(() => {
    if (achievementWorks && achievementWorks.length > 0) {
      return achievementWorks.map((a, i) => ({
        id: a.id,
        year: formatMonth(a.occurred_on || a.created_at.slice(0, 10)),
        title: a.title,
        issuer: `${a.evidence_links?.length ?? 0} ${(a.evidence_links?.length ?? 0) === 1 ? "proof" : "proofs"}`,
        desc: a.description || "",
        link: `/w/${a.id}`,
      }));
    }

    return [];
  }, [achievementWorks]);

  return (
    <section id="achievements" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            CREDENTIALS & HONORS
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Achievements
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {achievements.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="p-7 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  {item.year} &middot; {item.issuer}
                </span>
                <h3 className="text-lg font-black text-neutral-950 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Link
                  href={item.link}
                  className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                >
                  Verify Authenticity &rarr;
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}


// ==========================================
// 11. CONTACT SECTION COMPONENT
// ==========================================
function ContactSection({
  contactEmail,
  submitted,
  name,
  email,
  message,
  setName,
  setEmail,
  setMessage,
  onSubmit,
}: {
  contactEmail: string;
  submitted: boolean;
  name: string;
  email: string;
  message: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setMessage: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section id="contact" className="w-full border-t border-neutral-200/90 dark:border-neutral-800 py-24 sm:py-32 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <p className="text-xs tracking-widest text-neutral-400 font-semibold mb-2 uppercase">
            DIRECT INQUIRIES
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Get In Touch
          </h2>
        </div>

        <div className="max-w-5xl 2xl:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Contact Context & Direct Details */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Email</span>
                <a href={`mailto:${contactEmail}`} className="text-neutral-950 dark:text-white hover:underline text-sm font-semibold break-all">
                  {contactEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Right: The Form Card */}
          <div className="lg:col-span-7 p-6 sm:p-10 rounded-3xl border-2 border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#13151b] shadow-2xl">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-neutral-950 dark:text-white">
                  Check your email app
                </h3>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 max-w-sm mx-auto font-medium">
                  Your message opened there, addressed to {contactEmail}. Press send in your email app to deliver it.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5 sm:gap-6">
                <div className="flex flex-col">
                  <label className="text-xs uppercase tracking-widest font-extrabold text-neutral-700 dark:text-neutral-300 mb-2">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="h-12 px-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 text-sm font-medium text-neutral-950 dark:text-white focus:border-neutral-950 dark:focus:border-white outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs uppercase tracking-widest font-extrabold text-neutral-700 dark:text-neutral-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="h-12 px-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 text-sm font-medium text-neutral-950 dark:text-white focus:border-neutral-950 dark:focus:border-white outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs uppercase tracking-widest font-extrabold text-neutral-700 dark:text-neutral-300 mb-2">
                    Your message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Outline your project scope, technical problem, timeline, or engineering opportunity..."
                    className="min-h-[140px] p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 text-sm font-medium text-neutral-950 dark:text-white focus:border-neutral-950 dark:focus:border-white outline-none transition-colors resize-y"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer shadow-md"
                >
                  Open in my email app
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
