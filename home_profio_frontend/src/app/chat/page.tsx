"use client";

import { Suspense } from "react";
import { AppShell, AppShellSkeleton, useSession } from "@/components/app/AppShell";
import { RealtimeChatView } from "@/components/chat/RealtimeChatView";

export default function ChatPage() {
  const [user] = useSession();
  if (!user) return <AppShellSkeleton />;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-full px-0 sm:px-6 pt-0 sm:pt-3">
        <Suspense>
          <RealtimeChatView user={user} />
        </Suspense>
      </div>
    </AppShell>
  );
}
