"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Plus,
  Search,
  Trophy,
  Medal,
  FileCheck2,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { listWork, deleteWork, type Work } from "@/lib/api";
import { AppShell, useSession } from "@/components/app/AppShell";
import { UniversalWorkForm } from "@/components/app/UniversalWorkForm";
import { stateLabel } from "@/lib/items";

export default function AchievementsPage() {
  const [user] = useSession();
  const router = useRouter();
  const [achievements, setAchievements] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const reloadAchievements = () => {
    setLoading(true);
    listWork()
      .then((data) => {
        setAchievements(data.filter((w) => w.work_type === "achievement"));
        setLoading(false);
      })
      .catch(() => {
        setAchievements([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    reloadAchievements();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this achievement?")) return;
    setDeletingId(id);
    try {
      await deleteWork(id);
      setAchievements((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete achievement.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return achievements.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [achievements, searchQuery]);

  const stats = useMemo(() => {
    const total = achievements.length;
    const totalEvidence = achievements.reduce((acc, a) => acc + (a.evidence_links?.length || 0), 0);
    return { total, totalEvidence };
  }, [achievements]);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-8 max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Independent Module
              </span>
              <span className="text-xs text-slate">Recognitions & Verified Honors</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 mt-1">
              Achievements & Honors
            </h1>
            <p className="text-sm text-slate mt-0.5">
              Certifications, tournament trophies, academic distinctions, and professional awards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-ink text-paper font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Achievement
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-hairline bg-paper shadow-2xs">
            <span className="text-xs font-semibold text-slate block">Total Accolades</span>
            <span className="text-3xl font-black text-ink-900 tabular-nums mt-1 block">{stats.total}</span>
          </div>
          <div className="p-5 rounded-2xl border border-hairline bg-paper shadow-2xs">
            <span className="text-xs font-semibold text-emerald-600 block">Certificate & Award Proofs</span>
            <span className="text-3xl font-black text-emerald-600 tabular-nums mt-1 block">{stats.totalEvidence}</span>
          </div>
          <div className="p-5 rounded-2xl border border-hairline bg-paper shadow-2xs">
            <span className="text-xs font-semibold text-blue-600 block">Verification Status</span>
            <span className="text-sm font-bold text-ink-900 mt-2 block flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Cryptographically Backed
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate">Showing {filtered.length} honors</p>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              type="text"
              placeholder="Search awards, credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-hairline bg-paper text-xs text-ink-900 focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Card List Design */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 rounded-2xl shimmer-skeleton border border-hairline" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-hairline bg-paper space-y-3">
            <div className="w-12 h-12 rounded-full bg-paper-dim flex items-center justify-center mx-auto text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-ink-900">No achievements recorded yet</h3>
            <p className="text-xs text-slate max-w-sm mx-auto">
              Add your certifications, degrees, industry awards, or sports trophies with verified certificates.
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Add Achievement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((item) => {
              const attrs = item.custom_attributes || {};
              const awardedBy = attrs.awarded_by as string | undefined;
              const level = attrs.level as string | undefined;

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/work/${item.id}/edit`)}
                  className="group relative p-6 rounded-2xl border border-hairline bg-paper hover:border-emerald-500/40 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between cursor-pointer space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Award className="w-3.5 h-3.5" />
                        Achievement
                      </span>
                      {level && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-paper-dim font-semibold text-ink-900 uppercase">
                          {level}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-ink-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-slate leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {awardedBy && (
                      <div className="p-3 rounded-xl bg-paper-dim/60 border border-hairline/60 text-xs">
                        <p className="text-slate">
                          <strong className="text-ink-800 font-semibold">Awarded By:</strong> {awardedBy}
                        </p>
                      </div>
                    )}

                    {item.skills && item.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.skills.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-paper-dim text-ink-800"
                          >
                            #{s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-hairline text-xs text-slate">
                    <div className="flex items-center gap-3">
                      {item.occurred_on && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.occurred_on).toLocaleDateString([], { month: "short", year: "numeric" })}
                        </span>
                      )}
                      {(item.evidence_links?.length || 0) > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          {item.evidence_links?.length} {item.evidence_links?.length === 1 ? "certificate" : "certificates"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/work/${item.id}/edit`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-paper-dim text-slate hover:text-ink-900 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-lg hover:bg-paper-dim text-slate hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Universal Direct Create Modal for Achievements (Bottom Sheet on Mobile, Dialog on Desktop) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>
            <div className="overflow-y-auto flex-1">
              <UniversalWorkForm
                isModal
                defaultCategory="achievement"
                onCancel={() => setCreateModalOpen(false)}
                onSuccess={() => {
                  setCreateModalOpen(false);
                  reloadAchievements();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
