"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  Headset,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Newspaper,
  PanelsTopLeft,
  Plus,
  Puzzle,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarImage } from "@/components/app/AvatarImage";
import { AnnouncementBar } from "@/components/app/AnnouncementBar";
import { ActivationBanner } from "@/components/app/Activation";
import { CodeBanner } from "@/components/app/CodePrompt";
import { OnboardingFlush } from "@/components/app/OnboardingFlush";
import { NotificationBell } from "@/components/app/Notifications";
import { adoptAccountAppearance, forgetAdoptedAppearance, type Appearance } from "@/lib/appearance";
import { fetchCurrentUser, logoutUser, mediaUrl, type User } from "@/lib/api";
import { UniversalWorkForm } from "@/components/app/UniversalWorkForm";
import { ChatNotifier, unreadTotal, useChatInbox } from "@/components/chat/ChatNotifier";
import { CallOverlay } from "@/components/chat/CallOverlay";

export const CAPTURE_EVENT = "proofolio:capture";
export { AppShellSkeleton } from "./AppShellSkeleton";

const SESSION_CACHE_KEY = "proofolio-session-user";
let memoryUser: User | null = null;

export function getCachedSessionUser(): User | null {
  if (memoryUser) return memoryUser;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (stored) {
        memoryUser = JSON.parse(stored);
        return memoryUser;
      }
    } catch { }
  }
  return null;
}

export function setCachedSessionUser(u: User | null) {
  memoryUser = u;
  if (typeof window !== "undefined") {
    try {
      if (u) {
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(u));
      } else {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
      }
    } catch { }
  }
}

/** Loads the signed-in user with instant synchronous cache; sends visitors to /login. */
export function useSession() {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(getCachedSessionUser);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((u) => {
        if (!active) return;
        setCachedSessionUser(u);
        adoptAccountAppearance(u.preferences?.appearance as Partial<Appearance> | undefined);
        setUserState(u);
      })
      .catch(() => {
        if (!active) return;
        setCachedSessionUser(null);
        router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  const setUser = (value: User | null | ((prev: User | null) => User | null)) => {
    setUserState((prev) => {
      const updated = typeof value === "function" ? value(prev) : value;
      setCachedSessionUser(updated);
      return updated;
    });
  };

  return [user, setUser] as const;
}

export function displayName(u: User) {
  return u.profile?.display_name || u.fullname || u.username || u.email;
}

export function Avatar({ name, src, className = "h-9 w-9 text-[13px]" }: { name: string; src?: string | null; className?: string }) {
  return <AvatarImage name={name} url={mediaUrl(src)} className={className} />;
}

const PLACES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/discover", label: "Discover", icon: Compass },
];

export interface CommunityItem {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  color: string;
}

const COMMUNITY_ITEMS: CommunityItem[] = [
  {
    href: "/work",
    label: "Work & Projects",
    sub: "Showcases & repos",
    icon: Briefcase,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    href: "/problems",
    label: "Problems Solved",
    sub: "Bugs & root causes",
    icon: Puzzle,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    href: "/learning",
    label: "Ideas & Learning",
    sub: "Concepts & notes",
    icon: BookOpen,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    href: "/achievements",
    label: "Achievements",
    sub: "Awards & milestones",
    icon: Award,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    href: "/discussions",
    label: "Discussions",
    sub: "Community debates",
    icon: MessageSquare,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    href: "/articles",
    label: "Articles",
    sub: "Longform guides",
    icon: Newspaper,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    sub: "Verified showcase",
    icon: PanelsTopLeft,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    href: "/cv",
    label: "Curriculum Vitae",
    sub: "Signed CV to share",
    icon: FileText,
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  {
    href: "/profile#roles",
    label: "Roles & Orgs",
    sub: "Teams & companies",
    icon: Users,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  {
    href: "/discover",
    label: "Discover Feed",
    sub: "Trending proofs",
    icon: Compass,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
];

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [communityHubOpen, setCommunityHubOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string | undefined>(undefined);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const chatUnread = unreadTotal(useChatInbox(user.id));
  const badgeFor = (href: string) => (href === "/chat" ? chatUnread : 0);

  const isCommunityActive = [
    "/work",
    "/problems",
    "/learning",
    "/achievements",
    "/discussions",
    "/articles",
    "/portfolio",
    "/cv",
    "/discover",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    setCommunityHubOpen(false);
  }, [pathname]);

  function add() {
    if (pathname.startsWith("/discussions")) {
      window.dispatchEvent(new CustomEvent("open-new-discussion"));
      return;
    }
    if (pathname.startsWith("/problems")) {
      setModalCategory("problem");
    } else if (pathname.startsWith("/learning")) {
      setModalCategory("learning");
    } else if (pathname.startsWith("/achievements")) {
      setModalCategory("achievement");
    } else if (pathname.startsWith("/work")) {
      setModalCategory("work");
    } else {
      setModalCategory(undefined);
    }
    setCreateModalOpen(true);
  }

  async function signOut() {
    setCachedSessionUser(null);
    await logoutUser().catch(() => { });
    forgetAdoptedAppearance();
    router.replace("/login");
  }

  // Not activated in time: only /suspended (support + the code dialog) is open.
  const suspended = !!user.suspended;
  useEffect(() => {
    if (suspended) router.replace("/suspended");
  }, [suspended, router]);
  if (suspended) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <div className="theme-mono pf-ambient flex min-h-screen w-full max-w-full overflow-x-hidden bg-paper-dim text-ink-800">
      {/* Desktop sidebar: the places, community, and public face */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-paper px-3 md:flex">
        <Link href="/home" className="flex h-16 shrink-0 items-center gap-2.5 px-3">
          <Image src="/images/home-profolio-logo.jpeg" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
          <span className="text-[15px] font-bold tracking-tight">Proofolio</span>
        </Link>
        <nav aria-label="Main" className="mt-3 space-y-6 pb-6">
          <Suspense>
            <MainLinks isActive={isActive} badgeFor={badgeFor} />
          </Suspense>
          <SideGroup title="Community & Content">
            <SideLink href="/work" label="Work & Projects" icon={Briefcase} active={isActive("/work")} />
            <SideLink href="/problems" label="Problems Solved" icon={Puzzle} active={isActive("/problems")} />
            <SideLink href="/learning" label="Ideas & Learning" icon={BookOpen} active={isActive("/learning")} />
            <SideLink href="/achievements" label="Achievements" icon={Award} active={isActive("/achievements")} />
            <SideLink href="/discussions" label="Discussions" icon={MessageSquare} active={isActive("/discussions")} />
            <SideLink href="/articles" label="Articles" icon={Newspaper} active={isActive("/articles")} />
          </SideGroup>
          <SideGroup title="Public face">
            <SideLink href="/portfolio" label="Portfolio" icon={PanelsTopLeft} active={isActive("/portfolio")} />
            <SideLink href="/cv" label="Curriculum Vitae (CV)" icon={FileText} active={isActive("/cv")} />
          </SideGroup>
          <SideGroup title="Account">
            <SideLink href="/profile" label="Profile" icon={UserRound} active={isActive("/profile")} />
            <SideLink href="/settings" label="Settings" icon={Settings} active={isActive("/settings")} />
            <SideLink href="/support" label="Help & Support" icon={Headset} active={isActive("/support")} />
          </SideGroup>
        </nav>
      </aside>

      <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden">
        {/* Top bar: search, Add, account (desktop) / logo, account (mobile) */}
        <header
          className="sticky top-0 z-30 flex h-16 w-full items-center gap-3 border-b border-hairline/50 bg-paper/85 px-4 backdrop-blur-xl sm:px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2.5 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
              <Image src="/images/home-profolio-logo.jpeg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-cover shadow-xs" />
              <span className="text-[16px] font-bold tracking-tight text-ink-900">Proofolio</span>
            </Link>
          </div>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString().trim();
              router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
            }}
            className="relative hidden max-w-md flex-1 md:block"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <input
              name="q"
              type="search"
              placeholder="Search people, work, skills"
              aria-label="Search"
              className="h-10 w-full rounded-lg bg-paper-dim pl-10 pr-4 text-[14px] outline-none transition-shadow focus:ring-2 focus:ring-ink/10"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={add}
              className="hidden h-10 items-center gap-2 rounded-lg bg-ink px-5 text-[14px] font-semibold text-paper transition-transform hover:scale-[1.02] active:scale-[0.98] md:flex cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
            <NotificationBell />
            <AccountMenu user={user} onSignOut={signOut} />
          </div>
        </header>

        <ActivationBanner user={user} />
        <CodeBanner />
        <OnboardingFlush />
        <AnnouncementBar />
        <main className={`flex-1 ${pathname === "/chat" ? "pb-0 md:pb-12 overflow-hidden" : "pb-28 md:pb-12"}`}>{children}</main>
      </div>

      <ChatNotifier userId={user.id} />
      <CallOverlay userId={user.id} />

      {/* Mobile bottom bar: Home, Messages, Add, Community Hub, Profile */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-hairline/60 bg-paper/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid h-16 grid-cols-5 items-center">
          {/* 1. Home */}
          <TabLink href="/home" label="Home" icon={Home} active={isActive("/home")} />

          {/* 2. Messages */}
          <TabLink href="/chat" label="Messages" icon={MessageSquare} active={isActive("/chat")} badge={badgeFor("/chat")} />

          {/* 3. Center Add Button */}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={add}
              aria-label="Add"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg shadow-black/20 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="h-6 w-6" />
            </button>
          </li>

          {/* 4. Community Floating Hub Trigger (replaces Discover) */}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setCommunityHubOpen((open) => !open)}
              aria-label="Community Hub"
              aria-expanded={communityHubOpen}
              className={`flex flex-col items-center gap-1 text-[11px] w-full transition-all cursor-pointer ${isCommunityActive || communityHubOpen ? "font-semibold text-ink-800" : "text-slate hover:text-ink-800"
                }`}
            >
              <span className="relative">
                <LayoutGrid
                  className={`h-[22px] w-[22px] transition-all duration-200 ${communityHubOpen ? "scale-115 text-ink rotate-45" : ""
                    }`}
                  strokeWidth={isCommunityActive || communityHubOpen ? 2.2 : 1.8}
                />
                {isCommunityActive && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-paper" />
                )}
              </span>
              Community
            </button>
          </li>

          {/* 5. Profile */}
          <TabLink href="/profile" label="Profile" icon={UserRound} active={isActive("/profile")} />
        </ul>
      </nav>

      {/* Floating Community Hub Popover on Mobile */}
      {communityHubOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden animate-in fade-in duration-200">
          {/* Blurred translucent backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setCommunityHubOpen(false)}
          />

          {/* Floating Community Island Card */}
          <div
            className="relative z-10 mx-3 mb-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[calc(85vh-4.75rem)] overflow-y-auto rounded-3xl bg-paper/95 dark:bg-stone-900/95 backdrop-blur-2xl border border-hairline/80 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35)] p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-8 zoom-in-95 duration-200 ease-out"
          >
            {/* Grabber indicator & Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-hairline/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-ink/10 text-ink flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink-900 tracking-tight">Community & Ecosystem</h3>
                  <p className="text-[10px] text-slate">Explore verified work, problems & proofs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommunityHubOpen(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3x3 Grid of All Community Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {COMMUNITY_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setCommunityHubOpen(false)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 text-center group cursor-pointer ${active
                      ? "bg-ink text-paper border-ink shadow-sm"
                      : "bg-paper-dim/40 hover:bg-paper-dim border-hairline/50 hover:border-hairline"
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${active ? "bg-paper/20 text-paper border-transparent" : item.color
                        }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span
                      className={`mt-1.5 text-[11px] font-semibold tracking-tight leading-tight line-clamp-1 ${active ? "text-paper" : "text-ink-900"
                        }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] line-clamp-1 leading-none mt-0.5 ${active ? "text-paper/80" : "text-slate"
                        }`}
                    >
                      {item.sub}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Universal Direct Create Modal (Bottom sheet on mobile, dialog on desktop) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>
            <div className="overflow-y-auto flex-1">
              <UniversalWorkForm
                isModal
                defaultCategory={modalCategory}
                onCancel={() => setCreateModalOpen(false)}
                onSuccess={(saved) => {
                  setCreateModalOpen(false);
                  if (saved.work_type === "problem") router.push("/problems");
                  else if (saved.work_type === "learning") router.push("/learning");
                  else if (saved.work_type === "achievement") router.push("/achievements");
                  else router.push("/work");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CountBadge({ n, className = "" }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      aria-label={`${n} unread`}
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function SideLink({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors ${active ? "bg-ink font-semibold text-paper" : "text-slate hover:bg-paper-dim hover:text-ink-800"
        }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      {label}
      <CountBadge n={badge} className="ml-auto" />
    </Link>
  );
}

function SideGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate/80">{title}</p>
      <ul className="space-y-0.5">{Array.isArray(children) ? children.map((c, i) => <li key={i}>{c}</li>) : <li>{children}</li>}</ul>
    </div>
  );
}

function MainLinks({ isActive, badgeFor }: { isActive: (href: string) => boolean; badgeFor: (href: string) => number }) {
  return (
    <ul className="space-y-0.5">
      {PLACES.map(({ href, label, icon }) => (
        <li key={href}>
          <SideLink href={href} label={label} icon={icon} active={isActive(href)} badge={badgeFor(href)} />
        </li>
      ))}
    </ul>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center gap-1 text-[11px] ${active ? "font-semibold text-ink-800" : "text-slate"}`}
      >
        <span className="relative">
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
          <CountBadge n={badge} className="absolute -right-2.5 -top-1.5" />
        </span>
        {label}
      </Link>
    </li>
  );
}

function AccountMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = displayName(user);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account"
        className="rounded-full ring-offset-2 ring-offset-paper transition-shadow hover:ring-2 hover:ring-hairline cursor-pointer"
      >
        <Avatar name={name} src={user.profile?.avatar_url} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-hairline/70 bg-paper p-2 shadow-xl">
          <div className="border-b border-hairline/60 px-3 pb-3 pt-2">
            <p className="truncate text-[14px] font-semibold">{name}</p>
            <p className="truncate text-[12px] text-slate">@{user.profile?.username}</p>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-[14px]">
            <span className="text-slate">Theme</span>
            <ThemeToggle />
          </div>
          <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-paper-dim">
            <UserRound className="h-4 w-4" /> Profile
          </Link>
          <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-paper-dim">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <Link href="/support" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-paper-dim">
            <Headset className="h-4 w-4 text-emerald-600" /> Help & Support
          </Link>
          {user.is_admin && (
            <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-paper-dim">
              <Shield className="h-4 w-4" /> Admin console
            </Link>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-berry hover:bg-berry/5 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
