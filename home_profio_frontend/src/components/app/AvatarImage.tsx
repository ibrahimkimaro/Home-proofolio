"use client";

import { useState } from "react";

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

/** Photo if it loads, initials otherwise — never a broken image. `url` must already be absolute or /api-relative. */
export function AvatarImage({ name, url, className }: { name: string; url: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- member uploads come from the API origin
    return <img src={url} alt="" onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper ${className}`}>
      {initials(name)}
    </span>
  );
}
