"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Heart,
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { AvatarImage } from "@/components/app/AvatarImage";
import { mediaUrl, type User } from "@/lib/api";

interface LogoutModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onConfirm: (feedback?: { rating?: number; feedback?: string }) => Promise<void>;
}

const RATING_LABELS: Record<number, { text: string; emoji: string }> = {
  1: { text: "Needs improvement", emoji: "😕" },
  2: { text: "Fair experience", emoji: "🙂" },
  3: { text: "Good experience", emoji: "👍" },
  4: { text: "Great experience!", emoji: "✨" },
  5: { text: "Loved it! Outstanding", emoji: "🌟" },
};

export function LogoutModal({ isOpen, user, onClose, onConfirm }: LogoutModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeRating = hoverRating ?? rating;
  const displayName = user.profile?.display_name || user.fullname || user.username || user.email;
  const username = user.profile?.username || user.username || "member";

  async function handleSubmit(direct = false) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload =
        !direct && rating > 0
          ? {
              rating,
              feedback: feedback.trim() || undefined,
            }
          : undefined;
      await onConfirm(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-950/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-hairline/80 bg-paper/95 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 transition-all animate-in zoom-in-95 duration-200">
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brass/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-berry/15 blur-3xl"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-slate hover:bg-paper-dim hover:text-ink-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berry/10 text-berry ring-1 ring-berry/20 shadow-xs">
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <h2 id="logout-modal-title" className="text-[17px] font-bold text-ink-900 tracking-tight">
              Ready to sign out?
            </h2>
            <p className="text-[12px] text-slate">
              Your session and drafts are securely preserved.
            </p>
          </div>
        </div>

        {/* System & Account Preview Card */}
        <div className="mt-5 rounded-2xl border border-hairline/70 bg-paper-dim/60 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AvatarImage
              name={displayName}
              url={mediaUrl(user.profile?.avatar_url)}
              className="h-11 w-11 text-sm shadow-xs ring-2 ring-paper"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-900">{displayName}</p>
              <p className="truncate text-[12px] text-slate">@{username}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Synced
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-hairline/50 pt-2.5 text-[11px] text-slate">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-brass" />
              Safe to leave
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
              Proofolio Cloud Active
            </span>
          </div>
        </div>

        {/* Star Rating Section */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-ink-800">
              Rate your experience today
            </label>
            {activeRating > 0 && (
              <span className="text-[12px] font-medium text-brass-dark flex items-center gap-1 animate-in fade-in">
                {RATING_LABELS[activeRating]?.emoji} {RATING_LABELS[activeRating]?.text}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-2 rounded-2xl border border-hairline/60 bg-paper p-3 shadow-2xs">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= activeRating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  disabled={isSubmitting}
                  className="group relative p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-7 w-7 transition-colors duration-150 ${
                      isFilled
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.45)]"
                        : "text-slate/40 group-hover:text-amber-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Optional Note */}
        <div className="mt-4">
          <label htmlFor="logout-feedback" className="block text-[12px] font-medium text-slate mb-1">
            Any suggestions before you go? <span className="text-slate/60 font-normal">(optional)</span>
          </label>
          <textarea
            id="logout-feedback"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
            disabled={isSubmitting}
            placeholder="Tell us what you liked or how we can make Proofolio better..."
            className="w-full resize-none rounded-xl border border-hairline/80 bg-paper px-3 py-2 text-[12px] text-ink-800 placeholder-slate/50 shadow-2xs focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass disabled:opacity-60"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-hairline/80 bg-paper py-2.5 text-[13px] font-semibold text-slate hover:bg-paper-dim hover:text-ink-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Stay Signed In
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-berry px-4 py-2.5 text-[13px] font-semibold text-paper shadow-md hover:bg-berry-dark active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Skip Link */}
        <div className="mt-2.5 text-center">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="text-[11px] text-slate/80 hover:text-ink-800 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Skip feedback & sign out immediately
          </button>
        </div>
      </div>
    </div>
  );
}
