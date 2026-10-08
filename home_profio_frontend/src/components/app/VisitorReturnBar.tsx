"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home, LogIn, User as UserIcon } from "lucide-react";
import { getCachedUser } from "@/lib/user-cache";
import { fetchCurrentUser, type User } from "@/lib/api";

interface VisitorReturnBarProps {
  profileUsername?: string;
}

export function VisitorReturnBar({ profileUsername }: VisitorReturnBarProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCachedUser({ allowStale: true }));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null));
  }, []);

  if (!mounted) return null;

  const isOwner = currentUser && profileUsername && (currentUser.username === profileUsername || currentUser.profile?.username === profileUsername);

  // If viewing own portfolio, no return bar needed
  if (isOwner) return null;

  const currentPath = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

  return (
    <aside aria-label="Visitor Account Navigation" className="fixed top-4 left-3 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto">
      {currentUser ? (
        <Link
          href="/home"
          className="group flex items-center gap-2 rounded-full border border-neutral-300/80 dark:border-white/15 bg-white/95 dark:bg-[#12141c]/95 px-3.5 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-100 shadow-md backdrop-blur-xl transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95"
          title="Return to your own account and feed"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300 transition-transform group-hover:-translate-x-0.5" />
          <Home className="h-3.5 w-3.5 text-blue-600 dark:text-brass" />
          <span className="hidden xs:inline sm:inline">Return to My Account</span>
          <span className="xs:hidden sm:hidden">My Account</span>
        </Link>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(currentPath)}`}
          className="group flex items-center gap-2 rounded-full border border-neutral-300/80 dark:border-white/15 bg-white/95 dark:bg-[#12141c]/95 px-3.5 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-100 shadow-md backdrop-blur-xl transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95"
          title="Sign in to your account"
        >
          <LogIn className="h-3.5 w-3.5 text-blue-600 dark:text-brass" />
          <span>Sign In</span>
        </Link>
      )}
    </aside>
  );
}
