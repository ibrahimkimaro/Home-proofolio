"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useSession } from "@/components/app/AppShell";
import { UniversalWorkForm } from "@/components/app/UniversalWorkForm";

export default function NewWorkPage() {
  const [user] = useSession();
  const router = useRouter();

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        <Suspense fallback={<div className="h-96 rounded-2xl shimmer-skeleton" />}>
          <UniversalWorkForm
            defaultCategory="work"
            onCancel={() => router.push("/work")}
            onSuccess={() => router.push("/work")}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
