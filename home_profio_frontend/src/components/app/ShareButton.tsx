"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Native share sheet on phones (WhatsApp, etc.), copy link elsewhere. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: document.title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this page"
      className="flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3.5 text-[13px] font-medium hover:border-ink/40 cursor-pointer"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
