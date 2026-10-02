"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Plus } from "lucide-react";
import { setSocial, socialStatus, type SocialKind } from "@/lib/api";
import { continueAfterLogin } from "@/lib/pending";

/** Follow a person/business or watch a work item. Visitors are sent to log in and the action completes after. */
export function FollowButton({ kind, target }: { kind: SocialKind; target: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ active: boolean; signed_in: boolean; self?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    socialStatus(kind, target).then(setState).catch(() => setState({ active: false, signed_in: false }));
  }, [kind, target]);

  if (!state || state.self) return null;
  const verb = kind === "work" ? "Watch" : "Follow";

  async function toggle() {
    if (!state!.signed_in) return router.push(continueAfterLogin(kind, target));
    setBusy(true);
    try {
      await setSocial(kind, target, !state!.active);
      setState({ ...state!, active: !state!.active });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={state.active}
      className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[14px] font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
        state.active ? "border border-hairline text-ink-800 hover:border-ink/40" : "bg-ink text-paper"
      }`}
    >
      {state.active ? <Check className="h-4 w-4" /> : kind === "work" ? <Eye className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {state.active ? (kind === "work" ? "Watching" : "Following") : verb}
    </button>
  );
}
