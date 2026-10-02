"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useSession } from "@/components/app/AppShell";
import { UniversalWorkForm } from "@/components/app/UniversalWorkForm";
import { getWork, type Work } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workId = resolvedParams.id;
  const [user] = useSession();
  const router = useRouter();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workId) return;
    getWork(workId)
      .then((data: Work) => {
        setWork(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load item");
        setLoading(false);
      });
  }, [workId]);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-ink-800 mb-3" />
            <p className="text-sm text-slate">Loading work item...</p>
          </div>
        ) : error || !work ? (
          <div className="p-8 text-center bg-paper rounded-2xl border border-hairline">
            <p className="text-sm text-red-500 mb-4">{error || "Item not found"}</p>
            <button
              onClick={() => router.push("/work")}
              className="px-4 py-2 bg-ink text-paper rounded-xl text-sm font-semibold cursor-pointer"
            >
              Back to Works
            </button>
          </div>
        ) : (
          <UniversalWorkForm
            initialWork={work}
            onCancel={() => router.push("/work")}
            onSuccess={() => router.push("/work")}
          />
        )}
      </div>
    </AppShell>
  );
}
