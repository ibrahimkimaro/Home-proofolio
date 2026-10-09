"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ExternalLink,
  BarChart3,
  ListChecks,
  LayoutTemplate,
  Building2,
  Settings2,
  History,
  Activity,
  KeyRound,
  Megaphone,
  MonitorSmartphone,
  ShieldAlert,
  MessagesSquare,
  LifeBuoy,
  Sparkles,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User } from "@/lib/api";
import { Avatar } from "./ui";

export type AdminSection =
  | "overview"
  | "analytics"
  | "ai"
  | "ai_monitoring"
  | "users"
  | "works"
  | "businesses"
  | "onboarding"
  | "templates"
  | "platform"
  | "security"
  | "threats"
  | "devices"
  | "health"
  | "messages"
  | "chat"
  | "support"
  | "audit";

type NavItem = { id: AdminSection; label: string; icon: LucideIcon; description: string; group: string };

export const NAV: NavItem[] = [
  { id: "overview", group: "Insights", label: "Overview", icon: LayoutDashboard, description: "System health and activity at a glance" },
  { id: "analytics", group: "Insights", label: "Analytics", icon: BarChart3, description: "Growth, engagement and the onboarding funnel" },
  { id: "ai", group: "Insights", label: "AI dashboards", icon: Sparkles, description: "Ask in plain words, get charts from live data" },
  { id: "ai_monitoring", group: "Insights", label: "AI monitoring", icon: Cpu, description: "Model rate limits, token quotas, and per-user usage management" },
  { id: "health", group: "Insights", label: "System health", icon: Activity, description: "Is the app up, how fast and how busy" },

  { id: "users", group: "People & content", label: "Users", icon: Users, description: "Manage accounts, roles and access" },
  { id: "works", group: "People & content", label: "Works & Proofs", icon: Briefcase, description: "Moderate every work item on the platform" },
  { id: "support", group: "People & content", label: "Support", icon: LifeBuoy, description: "Live chat with members who need a person" },
  { id: "chat", group: "People & content", label: "Chat analytics", icon: MessagesSquare, description: "Live chat activity in numbers only: no messages, no names" },
  { id: "businesses", group: "People & content", label: "Businesses", icon: Building2, description: "Business, school and club pages" },
  { id: "onboarding", group: "Configure", label: "Onboarding", icon: ListChecks, description: "Steps, questions and disciplines new members see" },
  { id: "templates", group: "Configure", label: "Work templates", icon: LayoutTemplate, description: "The fields each kind of work asks for" },
  { id: "platform", group: "Configure", label: "Platform", icon: Settings2, description: "Sign-ups and the site-wide announcement" },
  { id: "messages", group: "Configure", label: "Messages", icon: Megaphone, description: "Message groups of members in-app, by SMS or email" },
  { id: "threats", group: "Security", label: "Threats", icon: ShieldAlert, description: "Sign-in activity, attack alerts and blocked addresses" },
  { id: "devices", group: "Security", label: "Devices", icon: MonitorSmartphone, description: "Every signed-in device, with remote sign-out" },
  { id: "security", group: "Security", label: "Activation codes", icon: KeyRound, description: "Codes to send so members can activate their accounts" },
  { id: "audit", group: "Security", label: "Audit log", icon: History, description: "Every change made by an admin" },
];

export function AdminShell({
  section,
  onNavigate,
  counts,
  admin,
  onLogout,
  onRefresh,
  refreshing,
  lastUpdated,
  children,
}: {
  section: AdminSection;
  onNavigate: (s: AdminSection) => void;
  counts: Partial<Record<AdminSection, number>>;
  admin: User;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: Date | null;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Shell only mounts client-side (after the auth check), so reading storage here is safe.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("proofolio-admin-collapsed") === "1";
    } catch {
      return false;
    }
  });

  // `overflow-x: hidden` on body makes it a scroll container and breaks the sticky sidebar/header; clip avoids that. Admin only.
  useEffect(() => {
    document.body.style.overflowX = "clip";
    return () => {
      document.body.style.overflowX = "";
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("proofolio-admin-collapsed", next ? "1" : "0");
    } catch { }
  }

  const current = NAV.find((n) => n.id === section)!;
  const adminName = admin.fullname || admin.profile?.display_name || admin.email;

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center gap-2.5 border-b border-hairline/70 ${compact ? "justify-center px-2" : "px-5"}`}>
        <Image
          src="/images/home-profolio-logo.jpeg"
          alt="Home Proofolio"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-hairline"
        />
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink-800">Proofolio</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brass-dark">Admin Console</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-4">
        {[...new Set(NAV.map((n) => n.group))].map((group, gi) => (
          <div key={group} className={gi ? "mt-5" : ""}>
            {!compact ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate/80">{group}</p>
            ) : gi ? (
              <div className="mx-3 mb-3 border-t border-hairline/60" />
            ) : null}
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map(({ id, label, icon: Icon }) => {
                const active = id === section;
                const count = counts[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(id);
                        setMobileOpen(false);
                      }}
                      title={compact ? label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl py-2 text-[14px] font-medium transition-colors cursor-pointer ${compact ? "justify-center px-2" : "px-3"
                        } ${active
                          ? "bg-brass/12 text-ink-800"
                          : "text-slate hover:bg-paper-dim hover:text-ink-800"
                        }`}
                    >
                      {active && (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brass" aria-hidden="true" />
                      )}
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brass-dark" : ""}`} />
                      {!compact && <span className="flex-1 truncate text-left">{label}</span>}
                      {!compact && count !== undefined && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${active ? "bg-brass/20 text-brass-dark" : "bg-paper-dim text-slate"
                            }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!compact && (
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate/80">Shortcuts</p>
        )}
        <ul className={`space-y-1 ${compact ? "mt-6 border-t border-hairline/60 pt-4" : ""}`}>
          {[
            { href: "/dashboard", label: "My dashboard" },
            { href: "/start", label: "Onboarding flow" },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                target="_blank"
                title={compact ? l.label : undefined}
                className={`flex items-center gap-3 rounded-xl py-2 text-[13px] text-slate transition-colors hover:bg-paper-dim hover:text-ink-800 ${compact ? "justify-center px-2" : "px-3"
                  }`}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {!compact && <span className="truncate">{l.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Admin card */}
      <div className="shrink-0 border-t border-hairline/70 p-3">
        <div className={`flex items-center gap-2.5 rounded-xl p-2 ${compact ? "flex-col" : ""}`}>
          <Avatar name={adminName} />
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-800">{adminName}</p>
              <p className="truncate text-[11px] text-slate">{admin.email}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate transition-colors hover:bg-berry/10 hover:text-berry cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pf-ambient flex min-h-screen w-full bg-paper-dim text-ink-800">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-hairline/70 bg-paper transition-[width] duration-200 lg:block ${collapsed ? "w-[76px]" : "w-64"
          }`}
      >
        {sidebar(collapsed)}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"
            }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-hairline bg-paper shadow-2xl transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate hover:bg-paper-dim cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          {sidebar(false)}
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0  flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-hairline/70 bg-paper/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-700 hover:bg-paper-dim lg:hidden cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate hover:bg-paper-dim hover:text-ink-800 lg:flex cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] text-slate sm:block">Admin / {current.label}</p>
            <h1 className="truncate text-[16px] font-bold text-ink-800 sm:text-[17px]">{current.label}</h1>
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
            title="Refresh data"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline/80 bg-paper text-ink-700 transition-colors hover:bg-paper-dim disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-brass-dark" : ""}`} />
          </button>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-[13px] text-slate">{current.description}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
