"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  Share2,
  Bookmark,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Eye,
  X,
} from "lucide-react";
import { AppShell, useSession } from "@/components/app/AppShell";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
  };
  category: string;
  coverGradient: string;
  views: number;
}

const ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Zero-Downtime Migration of PostgreSQL Schema with Large JSONB Work Records",
    excerpt: "How we refactored dynamic attribute indexing and validated custom template schemas without locking production databases.",
    content: `When scaling professional identity platforms, dynamic attributes pose a classic dilemma: rigid relational schemas fail to adapt to multidisciplinary careers, while unstructured JSON models risk corrupted schemas and impossible queries.

In this deep-dive, we explore how combining strict Pydantic model validation on the API layer with PostgreSQL's JSONB storage provides the optimal balance of schema flexibility and cryptographic proof verification.

Key principles applied:
1. Universal Core Fields remain first-class indexed columns (title, occurred_on, visibility, user_id).
2. Domain-specific attributes live inside custom_attributes validated against live database templates.
3. Multiple values (arrays of frameworks, design tools, pharmaceutical services) are normalized at write time.`,
    readTime: "6 min read",
    publishedAt: "Oct 2026",
    author: {
      name: "Engineering Team",
      role: "Proofolio Platform Architecture",
    },
    category: "Engineering",
    coverGradient: "from-blue-600 to-indigo-700",
    views: 1420,
  },
  {
    id: "a2",
    title: "From Pitch to Proof: How Football Analytics and Video Timelines Secure International Trials",
    excerpt: "The shift away from static PDF resumes to verified match highlights, competition logs, and biometric consistency in East African football.",
    content: `For decades, African football talent relied exclusively on opportunistic scouts attending regional tournament matches. Today, scouting departments from Europe, North America, and the Middle East demand verifiable data trails.

By documenting season-by-season match appearances, minutes played, goals, and direct links to unedited match footage, young players provide immutable proof of performance that stands up to professional diligence.`,
    readTime: "4 min read",
    publishedAt: "Sep 2026",
    author: {
      name: "Sports Intelligence Desk",
      role: "Scouting & Athletic Verification",
    },
    category: "Sports & Scouting",
    coverGradient: "from-amber-600 to-orange-700",
    views: 980,
  },
  {
    id: "a3",
    title: "Operating a Community Pharmacy: TMDA Verification, Cold Chain Protocols, and Patient Retention",
    excerpt: "Operational blueprints for pharmacists managing clinical consultations, dispensing workflows, and digital health records in urban Tanzania.",
    content: `Running a successful community pharmacy requires harmonizing clinical diligence with commercial viability. Regulatory adherence to TMDA guidelines, cold-chain refrigeration compliance, and transparent product sourcing form the baseline of patient trust.

This article details practical methods for maintaining compliant operating records and showcasing verified clinical certifications to build a defensible neighborhood brand.`,
    readTime: "8 min read",
    publishedAt: "Sep 2026",
    author: {
      name: "Pharmacy Operations Group",
      role: "Clinical Standards & Retail Health",
    },
    category: "Healthcare",
    coverGradient: "from-emerald-600 to-teal-700",
    views: 1150,
  },
];

export default function ArticlesPage() {
  const [user] = useSession();
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  const filtered = ARTICLES.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-8 max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Editorial & Knowledge
              </span>
              <span className="text-xs text-slate">Case Studies & Whitepapers</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 mt-1">
              Articles & Insights
            </h1>
            <p className="text-sm text-slate mt-0.5">
              In-depth technical guides, athletic scouting standards, and multidisciplinary career case studies.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-hairline bg-paper text-xs text-ink-900 focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Featured Article Hero */}
        {filtered.length > 0 && (
          <div
            onClick={() => setSelectedArticle(filtered[0])}
            className="group relative rounded-3xl border border-hairline bg-paper overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer grid grid-cols-1 lg:grid-cols-12"
          >
            <div
              className={`lg:col-span-5 h-48 lg:h-auto bg-gradient-to-br ${filtered[0].coverGradient} p-8 flex flex-col justify-between text-white relative`}
            >
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs w-fit">
                Featured Case Study
              </span>
              <div>
                <span className="text-xs opacity-80">{filtered[0].category}</span>
                <p className="text-sm font-semibold opacity-90 mt-1">{filtered[0].author.name}</p>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {filtered[0].readTime}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {filtered[0].publishedAt}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {filtered[0].views} reads
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-ink-900 group-hover:text-blue-600 transition-colors">
                  {filtered[0].title}
                </h2>

                <p className="text-sm text-slate leading-relaxed">
                  {filtered[0].excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-hairline">
                <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Full Article <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.slice(1).map((article) => (
            <article
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group p-6 rounded-2xl border border-hairline bg-paper hover:border-ink/30 transition-all duration-200 shadow-2xs flex flex-col justify-between cursor-pointer space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate">
                  <span className="px-2.5 py-0.5 rounded-md font-semibold bg-paper-dim text-ink-900">
                    {article.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.readTime}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-ink-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-xs text-slate line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-hairline text-xs">
                <div>
                  <span className="font-semibold text-ink-900 block">{article.author.name}</span>
                  <span className="text-slate text-[11px]">{article.author.role}</span>
                </div>
                <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Read <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Reader Modal (Bottom Sheet on Mobile) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setSelectedArticle(null)} />
          <div className="relative w-full sm:max-w-2xl h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Sheet Grabber */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-hairline p-5 sm:p-6 shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/10 text-blue-600">
                  {selectedArticle.category}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-ink-900 mt-2">
                  {selectedArticle.title}
                </h1>
                <p className="text-xs text-slate mt-1">
                  By {selectedArticle.author.name} · {selectedArticle.publishedAt} · {selectedArticle.readTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 rounded-lg text-slate hover:text-ink-900 hover:bg-paper-dim cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="prose prose-sm dark:prose-invert max-w-none text-ink-900 leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </div>

            <div className="p-4 border-t border-hairline flex flex-col sm:flex-row items-stretch sm:items-center justify-end shrink-0 bg-paper">
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="w-full sm:w-auto h-12 sm:h-10 px-6 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 cursor-pointer flex items-center justify-center shadow-xs"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
