"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Headset,
  HelpCircle,
  LogIn,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { AppShell, displayName } from "@/components/app/AppShell";
import { SupportChat } from "@/components/chat/SupportChat";
import {
  fetchCurrentUser,
  fetchSupportAgent,
  initGuestSupport,
  type SupportAgent,
  type User,
} from "@/lib/api";
import { getOrCreateGuestSessionId } from "@/lib/guest";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "How does proof verification work on Home Proofolio?",
    a: "Every work item can include verified evidence links, including public code repositories, deployed demonstration sites, published documents, and performance benchmarks. Verified items display authentic audit trails on your public portfolio.",
  },
  {
    q: "How do guest conversations work with support?",
    a: "When you start a chat as a visitor, a persistent temporary guest ID is assigned to your device. You can refresh the page or return later without losing your conversation history with our administration team.",
  },
  {
    q: "How can I change my public username or display name?",
    a: "Navigate to Account > Profile or Account > Settings. You can update your full name, professional headline, biographical summary, and visibility permissions anytime.",
  },
  {
    q: "Who answers live support requests?",
    a: "Live support messages route directly to the platform administrators and system support team. Your conversation history is securely retained so issues can be resolved promptly.",
  },
  {
    q: "How do I make my portfolio accessible to recruiters or clients?",
    a: "Ensure your profile visibility is set to Public under Account > Settings. You can share your direct link (homeproofolio.co.tz/u/your-username) or print a verified PDF resume summary directly from your portfolio.",
  },
];

export default function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) {
    return <div className="min-h-screen bg-paper-dim" />;
  }

  if (user) {
    return (
      <AppShell user={user}>
        <SupportContent user={user} />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-paper-dim text-ink-800">
      {/* Visitor Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline/60 bg-paper/85 px-4 backdrop-blur-xl sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/home-profolio-logo.jpeg"
            alt="Proofolio"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover shadow-xs"
          />
          <span className="text-[17px] font-bold tracking-tight text-ink-900">Proofolio</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-paper-dim"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-ink-700"
          >
            <UserPlus className="h-3.5 w-3.5" /> Register
          </Link>
        </div>
      </header>

      <main className="pb-16">
        <SupportContent user={null} />
      </main>
    </div>
  );
}

function SupportContent({ user }: { user: User | null }) {
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [guestMe, setGuestMe] = useState<{ id: string; name: string; username: string } | null>(null);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(1);

  useEffect(() => {
    let active = true;

    if (user) {
      fetchSupportAgent()
        .then((a) => {
          if (active) {
            setAgent(a);
            setLoadingAgent(false);
          }
        })
        .catch((err) => {
          if (active) {
            setAgentError(err instanceof Error ? err.message : "Unable to reach support gateway.");
            setLoadingAgent(false);
          }
        });
    } else {
      // Connect as guest with persistent localStorage session
      const sessId = getOrCreateGuestSessionId();
      initGuestSupport(sessId)
        .then((data) => {
          if (active) {
            setAgent(data.agent);
            setGuestMe({ id: data.guest_id, name: data.name, username: data.username });
            setGuestToken(data.token);
            setLoadingAgent(false);
          }
        })
        .catch((err) => {
          if (active) {
            setAgentError(err instanceof Error ? err.message : "Unable to initialize visitor support.");
            setLoadingAgent(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  const me = user
    ? {
        id: user.id,
        name: displayName(user),
        username: user.username || "member",
      }
    : guestMe;

  return (
    <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper shadow-xs">
            <Headset className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Help & Support</h1>
            <p className="text-sm text-slate">Direct channel to Home Proofolio administration and platform assistance.</p>
          </div>
        </div>

        {!user && guestMe && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-hairline/80 bg-paper p-3 text-xs text-slate shadow-2xs">
            <p>
              Connected as <strong className="text-ink-900 font-semibold">{guestMe.name}</strong>. Your conversation history is securely linked to this device.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/login" className="font-semibold text-ink underline hover:text-ink-900">
                Sign in to link account
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Live Support Chat */}
        <div className="flex flex-col rounded-2xl border border-hairline bg-paper shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-hairline bg-paper-dim/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                A
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-paper" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{agent?.name || "Support Administrator"}</p>
                <p className="text-xs text-slate">Live channel &bull; Monitored by platform administrators</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="h-[460px] flex flex-col">
            {loadingAgent ? (
              <div className="m-auto flex flex-col items-center gap-2 text-slate">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                <p className="text-xs">Connecting to support channel...</p>
              </div>
            ) : agentError ? (
              <div className="m-auto max-w-sm p-6 text-center">
                <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="text-sm font-semibold text-ink-900">Support service unavailable</p>
                <p className="mt-1 text-xs text-slate">{agentError}</p>
                <p className="mt-3 text-xs text-slate">
                  You can also email us directly at{" "}
                  <a href="mailto:support@homeproofolio.co.tz" className="text-ink font-semibold underline">
                    support@homeproofolio.co.tz
                  </a>
                </p>
              </div>
            ) : agent && me ? (
              <SupportChat
                me={me}
                topic={agent.topic}
                peerName={agent.name}
                guestToken={guestToken}
                className="h-full"
              />
            ) : null}
          </div>
        </div>

        {/* Right Column: Contact info & Quick FAQs */}
        <div className="space-y-6">
          {/* Direct Contact Card */}
          <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate">Direct Inquiries</h2>
            <div className="mt-4 space-y-3">
              <a
                href="mailto:support@homeproofolio.co.tz"
                className="flex items-start gap-3 rounded-xl border border-hairline/80 bg-paper-dim/40 p-3 transition hover:border-hairline hover:bg-paper-dim"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/10 text-ink">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-900">Official Email</p>
                  <p className="truncate text-xs text-slate">support@homeproofolio.co.tz</p>
                </div>
              </a>

              <div className="flex items-start gap-3 rounded-xl border border-hairline/80 bg-paper-dim/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-900">Security & Integrity</p>
                  <p className="text-xs text-slate">Standard response window within 24 hours.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-4 w-4 text-slate" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate">Frequently Asked</h2>
            </div>
            <div className="divide-y divide-hairline">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between text-left text-xs font-semibold text-ink-900 hover:text-ink cursor-pointer"
                    >
                      <span className="pr-2">{faq.q}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-slate transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && <p className="mt-2 text-xs leading-relaxed text-slate">{faq.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
