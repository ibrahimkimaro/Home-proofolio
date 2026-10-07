"use client";

import { useEffect, useRef, useState } from "react";
import { readCachedAvatar, refreshAvatarCache } from "@/lib/avatar-cache";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Photo if it loads, initials otherwise — never a broken image.
 *
 * The photo is served from a localStorage cache after the first fetch, so returning to a page
 * shows it immediately instead of flashing initials while the image downloads. The cache is
 * keyed by the URL, so changing the photo naturally misses the cache. A background refresh
 * keeps the entry current. `url` must already be absolute or /api-relative.
 */
export function AvatarImage({ name, url, className }: { name: string; url: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  // Start from the cache when we have it: this runs during render, so the cached photo is in
  // the first paint rather than arriving after a fetch.
  const [src, setSrc] = useState<string | null>(() => readCachedAvatar(url));
  const lastUrl = useRef<string | null>(url);

  useEffect(() => {
    if (lastUrl.current !== url) {
      lastUrl.current = url;
      setFailed(false);
      setSrc(readCachedAvatar(url));
    }
    if (!url) return;
    let active = true;
    refreshAvatarCache(url)
      .then((dataUrl) => {
        if (active && dataUrl) setSrc(dataUrl);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [url]);

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- member uploads come from the API origin
    return <img src={src || url} alt="" onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper ${className}`}>
      {initials(name)}
    </span>
  );
}
