"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Search,
  ExternalLink,
  Code2,
  Palette,
  Trophy,
  Pill,
  Building,
  Sparkles,
  Calendar,
  Layers,
  FileCheck2,
  Trash2,
  Edit3,
  TrendingUp,
  BarChart3,
  CheckCircle,
  LucideIcon,
} from "lucide-react";
import { listWork, deleteWork, type Work } from "@/lib/api";
import { AppShell, useSession } from "@/components/app/AppShell";
import { UniversalWorkForm } from "@/components/app/UniversalWorkForm";
import { stateLabel } from "@/lib/items";

const DOMAIN_FILTERS = [
  { id: "all", label: "All Domains" },
  { id: "developer", label: "Developer" },
  { id: "designer", label: "Graphic Designer" },
  { id: "footballer", label: "Footballer" },
  { id: "pharmacy", label: "Pharmacy Owner" },
  { id: "business", label: "Business" },
  { id: "other", label: "General" },
];

const DOMAIN_ICONS: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  developer: { icon: Code2, label: "Developer", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  designer: { icon: Palette, label: "Designer", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  footballer: { icon: Trophy, label: "Footballer", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  pharmacy: { icon: Pill, label: "Pharmacy Owner", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  business: { icon: Building, label: "Business", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  other: { icon: Sparkles, label: "General", color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
};

export default function WorkProjectsPage() {
  const [user] = useSession();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const reloadWorks = () => {
    setLoading(true);
    listWork()
      .then((data) => {
        // Filter specifically for work & projects
        setWorks(data.filter((w) => w.work_type === "work"));
        setLoading(false);
      })
      .catch(() => {
        setWorks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    reloadWorks();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this work project?")) return;
    setDeletingId(id);
    try {
      await deleteWork(id);
      setWorks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      alert("Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Items
  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      const matchDomain = selectedDomain === "all" || (w.template || "other") === selectedDomain;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.context_role?.toLowerCase().includes(q) ||
        w.skills.some((s) => s.toLowerCase().includes(q));
      return matchDomain && matchSearch;
    });
  }, [works, selectedDomain, searchQuery]);

  // Statistics Computations
  const stats = useMemo(() => {
    const total = works.length;
    const totalEvidence = works.reduce((acc, w) => acc + (w.evidence_links?.length || 0), 0);

    // Skill distribution
    const skillMap: Record<string, number> = {};
    works.forEach((w) => {
      w.skills?.forEach((s) => {
        skillMap[s] = (skillMap[s] || 0) + 1;
      });
    });
    const topSkills = Object.entries(skillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Domain breakdown
    const domainCounts: Record<string, number> = {};
    works.forEach((w) => {
      const dom = w.template || "other";
      domainCounts[dom] = (domainCounts[dom] || 0) + 1;
    });

    // Monthly activity
    const monthCounts = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    works.forEach((w) => {
      const d = new Date(w.occurred_on || w.created_at);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        monthCounts[5 - diffMonths] += 1;
      }
    });

    return {
      total,
      totalEvidence,
      topSkills,
      domainCounts,
      monthCounts,
    };
  }, [works]);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-8 max-w-full mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Independent Module
              </span>
              <span className="text-xs text-slate">Work & Projects Only</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 mt-1">
              Work & Projects
            </h1>
            <p className="text-sm text-slate mt-0.5">
              Production systems, creative deliverables, athletic seasons, and business operations backed by proof.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-ink text-paper font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Work & Project
            </button>
          </div>
        </div>

        {/* Interactive Statistics & Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Main Activity Velocity Graph Card */}
          <div className="md:col-span-8 p-6 rounded-2xl border border-hairline bg-paper shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink-900">Project Delivery Velocity</h2>
                  <p className="text-xs text-slate">Completed works & projects over the last 6 months</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-ink-900 tabular-nums">{stats.total}</span>
                <span className="text-xs text-slate block">Total projects</span>
              </div>
            </div>

            {/* Interactive Graph Visualization */}
            <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-hairline/60">
              {stats.monthCounts.map((count, idx) => {
                const maxVal = Math.max(...stats.monthCounts, 4);
                const heightPercent = Math.max((count / maxVal) * 100, 12);
                const monthLabels = ["6m ago", "5m ago", "4m ago", "3m ago", "Last mo", "This mo"];
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="relative w-full flex justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded text-[11px] font-bold bg-ink text-paper shadow-sm">
                        {count} works
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${idx === 5
                          ? "bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm"
                          : "bg-paper-dim hover:bg-blue-500/40"
                          }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate truncate">
                      {monthLabels[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Domain Breakdown Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {Object.entries(stats.domainCounts).map(([dom, cnt]) => {
                const info = DOMAIN_ICONS[dom] || DOMAIN_ICONS.other;
                const Icon = info.icon;
                return (
                  <div
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper-dim text-xs font-semibold text-ink-900 border border-hairline/50"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-600" />
                    <span>{info.label}:</span>
                    <span className="font-mono font-bold">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Verified Skills */}
          <div className="md:col-span-4 p-6 rounded-2xl border border-hairline bg-paper shadow-2xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink-900">Project Skills</h2>
                  <p className="text-xs text-slate">Technologies & tools used in projects</p>
                </div>
              </div>

              {stats.topSkills.length === 0 ? (
                <p className="text-xs text-slate py-6 text-center">No skills added yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topSkills.map(([skill, count]) => {
                    const pct = Math.min((count / Math.max(stats.total, 1)) * 100, 100);
                    return (
                      <div key={skill} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-ink-800">{skill}</span>
                          <span className="text-slate font-mono">{count} projects</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-paper-dim overflow-hidden">
                          <div
                            style={{ width: `${Math.max(pct, 15)}%` }}
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-paper-dim/80 border border-hairline/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-ink-900">Project Proofs Attached</span>
              </div>
              <span className="text-sm font-bold text-ink-900 font-mono">{stats.totalEvidence}</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          {/* Domain Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {DOMAIN_FILTERS.map((df) => (
              <button
                key={df.id}
                onClick={() => setSelectedDomain(df.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedDomain === df.id
                  ? "bg-ink text-paper shadow-2xs"
                  : "bg-paper text-slate hover:text-ink-900 hover:bg-paper-dim border border-hairline"
                  }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              type="text"
              placeholder="Search projects, skills..."
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
              <div key={i} className="h-56 rounded-2xl shimmer-skeleton border border-hairline" />
            ))}
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-hairline bg-paper space-y-3">
            <div className="w-12 h-12 rounded-full bg-paper-dim flex items-center justify-center mx-auto text-slate">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-ink-900">No projects found</h3>
            <p className="text-xs text-slate max-w-sm mx-auto">
              {searchQuery
                ? `No projects matching "${searchQuery}".`
                : "You haven't created any work or project items yet."}
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Create Work & Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredWorks.map((w) => {
              const domainKey = w.template || "other";
              const domainInfo = DOMAIN_ICONS[domainKey] || DOMAIN_ICONS.other;
              const DomainIcon = domainInfo.icon;
              const customAttrs = w.custom_attributes?.custom as { label: string; value: string }[] | undefined;
              const evidenceCount = w.evidence_links?.length || 0;

              return (
                <div
                  key={w.id}
                  onClick={() => router.push(`/work/${w.id}/edit`)}
                  className="group relative p-6 rounded-2xl border border-hairline bg-paper hover:border-ink/30 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between cursor-pointer overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Top Row: Domain Badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${domainInfo.color}`}
                        >
                          <DomainIcon className="w-3.5 h-3.5" />
                          {domainInfo.label}
                        </span>
                        {w.context_role && (
                          <span className="text-xs font-medium text-slate truncate max-w-[160px]">
                            {w.context_role}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-slate capitalize">
                          {stateLabel(w.status)}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-ink-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {w.title}
                      </h3>
                      {w.description && (
                        <p className="text-xs text-slate mt-1 line-clamp-2 leading-relaxed">
                          {w.description}
                        </p>
                      )}
                    </div>

                    {/* Dynamic Attributes Preview */}
                    {w.custom_attributes && Object.keys(w.custom_attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(w.custom_attributes)
                          .filter(([k]) => k !== "custom")
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-paper-dim text-slate capitalize"
                            >
                              <strong className="text-ink-800 font-medium">{k.replace(/_/g, " ")}:</strong>{" "}
                              {Array.isArray(v) ? v.join(", ") : String(v)}
                            </span>
                          ))}
                        {customAttrs?.slice(0, 2).map((ca, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-paper-dim text-slate"
                          >
                            <strong className="text-ink-800 font-medium">{ca.label}:</strong> {ca.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Skills Tags */}
                    {w.skills && w.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {w.skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-paper-dim text-ink-800 border border-hairline/50"
                          >
                            #{s}
                          </span>
                        ))}
                        {w.skills.length > 4 && (
                          <span className="text-[10px] text-slate self-center">
                            +{w.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-hairline text-xs text-slate">
                    <div className="flex items-center gap-3">
                      {w.occurred_on && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(w.occurred_on).toLocaleDateString([], { month: "short", year: "numeric" })}
                        </span>
                      )}
                      {evidenceCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          {evidenceCount} {evidenceCount === 1 ? "proof" : "proofs"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/work/${w.id}/edit`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-paper-dim text-slate hover:text-ink-900 cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === w.id}
                        onClick={(e) => handleDelete(w.id, e)}
                        className="p-1.5 rounded-lg hover:bg-paper-dim text-slate hover:text-red-500 cursor-pointer"
                        title="Delete"
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

      {/* Universal Direct Create Modal for Work (Bottom Sheet on Mobile, Dialog on Desktop) */}
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
                defaultCategory="work"
                onCancel={() => setCreateModalOpen(false)}
                onSuccess={() => {
                  setCreateModalOpen(false);
                  reloadWorks();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
