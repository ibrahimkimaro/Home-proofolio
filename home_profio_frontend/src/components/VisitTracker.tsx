"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackVisit } from "@/lib/api";
import { getOrCreateGuestSessionId } from "@/lib/guest";

/** Reports each page the visitor opens, so Admin > Overview can count who came today. Never blocks the page. */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      trackVisit(getOrCreateGuestSessionId(), pathname, document.referrer ? new URL(document.referrer).hostname : undefined);
    } catch {}
  }, [pathname]);
  return null;
}
