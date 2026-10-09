"use client";

import Image from "next/image";
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Headset, KeyRound, LogOut, ShieldAlert } from "lucide-react";
import { OtpDialog } from "@/components/app/Activation";
import { setCachedSessionUser } from "@/components/app/AppShell";
import { SupportChat } from "@/components/chat/SupportChat";
import { fetchCurrentUser, fetchSupportAgent, logoutUser, type SupportAgent, type User } from "@/lib/api";

/**
 * Where an account lands when its 15 minutes to activate ran out. Nothing else in the app opens: only the
 * support chat (to ask for help or a new code) and the code dialog, until the account is activated.
 */
export default function SuspendedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCurrentUser()
      .then((u) => {
        if (!live) return;
        setCachedSessionUser(u);
        if (!u.suspended) router.replace("/home"); // active again (or not suspended after all)
        else setUser(u);
      })
      .catch(() => live && router.replace("/login"));
    fetchSupportAgent()
      .then((a) => live && setAgent(a))
      .catch((e) => live && setAgentError(e instanceof Error ? e.message : "Support isn't available right now."));
    return () => {
      live = false;
    };
  }, [router]);

  async function signOut() {
    setCachedSessionUser(null);
    await logoutUser().catch(() => {});
    router.replace("/login");
  }

  function activated() {
    setDialog(false);
    fetchCurrentUser()
      .then((u) => {
        setCachedSessionUser(u);
        router.replace("/home");
      })
      .catch(() => router.replace("/login"));
  }

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <div className="min-h-screen bg-paper-dim text-ink-800">
      <header className="flex h-16 items-center justify-between border-b border-hairline/60 bg-paper px-4 sm:px-8">
        <span className="flex items-center gap-2.5">
          <Image src="/images/home-profolio-logo.jpeg" alt="Proofolio" width={32} height={32} className="h-8 w-8 rounded-lg object-cover shadow-xs" />
          <span className="text-[17px] font-bold tracking-tight text-ink-900">Proofolio</span>
        </span>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-paper-dim"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-berry/30 bg-berry/10 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-berry/15 text-berry">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h1 className="mt-3 text-xl font-bold text-ink-900">Your account is suspended</h1>
            <p className="mt-1.5 text-[14px] text-ink-700">
              You didn&apos;t activate it within 15 minutes of receiving your code. Until you activate it, the rest of Home Proofolio is closed:
              you can only talk to support. Enter a code to get back in.
            </p>
            <button
              type="button"
              onClick={() => setDialog(true)}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper hover:opacity-90"
            >
              <KeyRound className="h-4 w-4" /> Enter activation code
            </button>
            <p className="mt-3 text-[12px] text-slate">
              No code, or it expired? The dialog can ask for a new one, or ask support in the chat and they will send it.
            </p>
          </div>
        </section>

        <section className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
              <Headset className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink-900">Home Proofolio Support</p>
              <p className="text-[12px] text-slate">The only chat open on a suspended account</p>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {agent ? (
              <SupportChat
                me={{ id: user.id, name: user.fullname || user.username || "Member", username: user.username || user.id }}
                topic={agent.topic}
                peerName={agent.name}
                firstText={`Hello, my account was suspended because I didn't activate it in time. Can you send me a new activation code? (${user.email})`}
                className="h-full"
              />
            ) : (
              <p className="p-6 text-center text-[13px] text-slate">{agentError ?? "Connecting to support…"}</p>
            )}
          </div>
        </section>
      </main>

      <AnimatePresence>{dialog && <OtpDialog user={user} onVerified={activated} onClose={() => setDialog(false)} />}</AnimatePresence>
    </div>
  );
}
