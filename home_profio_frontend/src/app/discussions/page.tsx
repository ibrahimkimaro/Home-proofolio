"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
  MessageCircle,
  Share2,
  Tag,
  Sparkles,
  TrendingUp,
  HelpCircle,
  X,
  Send,
  Globe,
  Lock,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell, useSession } from "@/components/app/AppShell";

interface ReplyItem {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
}

interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  category: "tech" | "design" | "health" | "sports" | "general";
  categoryLabel: string;
  accessType: "open" | "invited";
  invitedUsers?: string[];
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  upvotes: number;
  replies: number;
  tags: string[];
  createdAt: string;
  repliesList: ReplyItem[];
}

const INITIAL_DISCUSSIONS: DiscussionThread[] = [
  {
    id: "d1",
    title: "How do you verify proof of deployment in complex microservices architectures?",
    content: "When deploying Kubernetes clusters and distributed async workers, what artifacts do you attach in your portfolio as concrete proof of work without exposing internal secrets?",
    category: "tech",
    categoryLabel: "Engineering",
    accessType: "open",
    author: {
      name: "Ibrahim kimaro",
      role: "Lead Software Architect",
    },
    upvotes: 42,
    replies: 2,
    tags: ["DevOps", "Microservices", "Proof Verification"],
    createdAt: "2h ago",
    repliesList: [
      {
        id: "r1",
        author: "Tamim hamis",
        role: "Healthcare Systems Lead",
        text: "We scrub sensitive credentials and export sanitized Prometheus latency graphs + redacted Terraform manifests as cryptographic proofs.",
        time: "1h ago",
      },
      {
        id: "r2",
        author: "Admin",
        role: "Platform Administrator",
        text: "Architecture diagrams alongside audit log hashes make the story very compelling to reviewing clients.",
        time: "30m ago",
      },
    ],
  },
  {
    id: "d2",
    title: "Displaying client brand identity assets: vector deliverables vs interactive style guides",
    content: "For graphic designers presenting rebrands, do clients and recruiters prefer seeing the Figma component system or real-world mockups with production proofs?",
    category: "design",
    categoryLabel: "Design",
    accessType: "open",
    author: {
      name: "Ibrahim kimaro",
      role: "Lead Software Architect",
    },
    upvotes: 28,
    replies: 1,
    tags: ["Branding", "UI/UX", "Portfolio Tips"],
    createdAt: "5h ago",
    repliesList: [
      {
        id: "r3",
        author: "Tamim hamis",
        role: "Healthcare Systems Lead",
        text: "Interactive prototypes show real UX reasoning, whereas static vectors only show aesthetics. I always prefer seeing the interactive flow.",
        time: "4h ago",
      },
    ],
  },
  {
    id: "d3",
    title: "TMDA compliance and inventory tracking for community pharmacies",
    content: "Roundtable discussion on showcasing pharmaceutical operations and verified clinical consultations while maintaining patient confidentiality.",
    category: "health",
    categoryLabel: "Health & Pharma",
    accessType: "invited",
    invitedUsers: ["Tamim hamis", "Ibrahim kimaro", "Admin"],
    author: {
      name: "Tamim hamis",
      role: "Supervising Doctor",
    },
    upvotes: 35,
    replies: 1,
    tags: ["Pharmacy", "Compliance", "Healthcare"],
    createdAt: "1d ago",
    repliesList: [
      {
        id: "r4",
        author: "Tamim hamis",
        role: "Supervising Doctor",
        text: "Focusing on batch FIFO audit trails is the most compliant verification method that protects individual patient identities.",
        time: "18h ago",
      },
    ],
  },
  {
    id: "d4",
    title: "Tracking match metrics: goals, assists, and video footage proof for scouting",
    content: "How amateur and professional athletes are structuring season statistics to land international trials and academy placements.",
    category: "sports",
    categoryLabel: "Sports",
    accessType: "open",
    author: {
      name: "Ibrahim kimaro",
      role: "Performance Scout & Athlete",
    },
    upvotes: 19,
    replies: 0,
    tags: ["Football", "Analytics", "Athletic Proof"],
    createdAt: "2d ago",
    repliesList: [],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "tech", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "health", label: "Health & Pharma" },
  { id: "sports", label: "Sports" },
  { id: "general", label: "General" },
];

export default function DiscussionsPage() {
  const [user] = useSession();
  const [threads, setThreads] = useState<DiscussionThread[]>(INITIAL_DISCUSSIONS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [accessFilter, setAccessFilter] = useState<"all" | "open" | "invited">("all");
  const [search, setSearch] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<DiscussionThread | null>(null);
  const [replyText, setReplyText] = useState("");

  // New Thread Form State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"tech" | "design" | "health" | "sports" | "general">("tech");
  const [newAccessType, setNewAccessType] = useState<"open" | "invited">("open");
  const [newInvitedUsers, setNewInvitedUsers] = useState("");
  const [newTags, setNewTags] = useState("");
  const [upvotedSet, setUpvotedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleOpen = () => setIsNewModalOpen(true);
    window.addEventListener("open-new-discussion", handleOpen);
    return () => window.removeEventListener("open-new-discussion", handleOpen);
  }, []);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  const toggleUpvote = (id: string) => {
    setUpvotedSet((prev) => {
      const next = new Set(prev);
      const isUpvoted = next.has(id);
      if (isUpvoted) {
        next.delete(id);
        setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes - 1 } : t)));
      } else {
        next.add(id);
        setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t)));
      }
      return next;
    });
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const catLabel =
      CATEGORIES.find((c) => c.id === newCategory)?.label || "General";

    const invitedList =
      newAccessType === "invited" && newInvitedUsers.trim()
        ? newInvitedUsers.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const created: DiscussionThread = {
      id: `d-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      categoryLabel: catLabel,
      accessType: newAccessType,
      invitedUsers: invitedList,
      author: {
        name: user.profile?.display_name || user.username || user.email || "Proofolio Member",
        role: user.profile?.headline || "Proofolio Member",
      },
      upvotes: 1,
      replies: 0,
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: "Just now",
      repliesList: [],
    };

    setThreads([created, ...threads]);
    setIsNewModalOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewTags("");
    setNewAccessType("open");
    setNewInvitedUsers("");
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;

    const newReply: ReplyItem = {
      id: `r-${Date.now()}`,
      author: user.profile?.display_name || user.username || user.email || "Proofolio Member",
      role: user.profile?.headline || "Proofolio Member",
      text: replyText.trim(),
      time: "Just now",
    };

    const updated = {
      ...activeThread,
      replies: activeThread.replies + 1,
      repliesList: [...activeThread.repliesList, newReply],
    };

    setActiveThread(updated);
    setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setReplyText("");
  };

  const filtered = threads.filter((t) => {
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    const matchAccess = accessFilter === "all" || t.accessType === accessFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchCat && matchAccess && matchSearch;
  });

  return (
    <AppShell user={user}>
      <div className="py-6 px-4 sm:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Public RFCs &amp; Topics
              </span>
              <span className="text-xs text-slate font-medium hidden sm:inline">
                Community Knowledge Base
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 mt-1">
              Discussions &amp; Proposals
            </h1>
            <p className="text-xs sm:text-sm text-slate mt-0.5 max-w-2xl">
              Public topic-based forums where members discuss architecture, evaluate RFCs, and debate best practices. Open to everyone or curated with invited contributors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-hairline bg-paper text-slate hover:text-ink-900 hover:bg-paper-dim font-medium text-xs transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Go to Messages (1:1 Chat)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-ink text-paper font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Start Discussion
            </button>
          </div>
        </div>

        {/* Filters and Access Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-ink text-paper shadow-2xs"
                    : "bg-paper text-slate hover:text-ink-900 hover:bg-paper-dim border border-hairline"
                }`}
              >
                {cat.label}
              </button>
            ))}

            <div className="h-4 w-px bg-hairline mx-1" />

            <button
              onClick={() => setAccessFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                accessFilter === "all" ? "bg-paper-dim text-ink-900 border border-ink/20" : "text-slate hover:text-ink-900"
              }`}
            >
              All Access
            </button>
            <button
              onClick={() => setAccessFilter("open")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                accessFilter === "open" ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30" : "text-slate hover:text-ink-900"
              }`}
            >
              <Globe className="w-3 h-3" /> Open
            </button>
            <button
              onClick={() => setAccessFilter("invited")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                accessFilter === "invited" ? "bg-amber-500/10 text-amber-700 border border-amber-500/30" : "text-slate hover:text-ink-900"
              }`}
            >
              <Lock className="w-3 h-3" /> Invited Circles
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              type="text"
              placeholder="Search discussions, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-hairline bg-paper text-xs text-ink-900 focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Discussions List */}
        <div className="space-y-4">
          {filtered.map((thread) => {
            const isUpvoted = upvotedSet.has(thread.id);
            return (
              <article
                key={thread.id}
                className="p-5 sm:p-6 rounded-2xl border border-hairline bg-paper hover:border-ink/30 transition-all duration-200 shadow-2xs space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-paper-dim text-ink-900 uppercase">
                        {thread.categoryLabel}
                      </span>
                      {thread.accessType === "open" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          <Globe className="w-3 h-3" /> Open to Everyone
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          <Lock className="w-3 h-3" /> Invited Circle
                          {thread.invitedUsers?.length ? ` (${thread.invitedUsers.length} members)` : ""}
                        </span>
                      )}
                      <span className="text-xs text-slate">· {thread.createdAt}</span>
                    </div>

                    <h2
                      onClick={() => setActiveThread(thread)}
                      className="text-base sm:text-lg font-bold text-ink-900 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {thread.title}
                    </h2>
                  </div>
                </div>

                <p
                  onClick={() => setActiveThread(thread)}
                  className="text-sm text-slate leading-relaxed cursor-pointer line-clamp-3 sm:line-clamp-none"
                >
                  {thread.content}
                </p>

                {thread.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {thread.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-paper-dim text-slate"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer metadata & buttons */}
                <div className="flex items-center justify-between pt-3.5 border-t border-hairline text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-[10px]">
                      {thread.author.name[0]}
                    </div>
                    <span className="font-semibold text-ink-900">{thread.author.name}</span>
                    <span className="text-slate hidden sm:inline">· {thread.author.role}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleUpvote(thread.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        isUpvoted
                          ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                          : "border-hairline text-slate hover:text-ink-900 hover:bg-paper-dim"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="font-mono">{thread.upvotes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveThread(thread)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-ink-900 bg-paper hover:bg-paper-dim text-xs font-semibold cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{thread.replies} Replies</span>
                      <span className="hidden sm:inline">&rarr; Join</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          THREAD DETAIL & REPLIES: Mobile Bottom Sheet / Modal
          ======================================================== */}
      {activeThread && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setActiveThread(null)}
          />
          <div className="relative w-full sm:max-w-2xl h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-hairline shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-paper-dim text-ink-900 uppercase">
                  {activeThread.categoryLabel}
                </span>
                {activeThread.accessType === "open" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700">
                    <Globe className="w-3 h-3" /> Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700">
                    <Lock className="w-3 h-3" /> Invited Only
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveThread(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate hover:text-ink-900 hover:bg-paper-dim cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink-900 leading-snug">
                  {activeThread.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate mt-2">
                  <span className="font-semibold text-ink-900">{activeThread.author.name}</span>
                  <span>({activeThread.author.role})</span>
                  <span>· {activeThread.createdAt}</span>
                </div>
                <p className="text-sm text-ink-800 leading-relaxed mt-3 whitespace-pre-line bg-paper-dim p-3.5 rounded-xl border border-hairline">
                  {activeThread.content}
                </p>

                {activeThread.accessType === "invited" && activeThread.invitedUsers && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Invited circle:</strong> {activeThread.invitedUsers.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Replies Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate">
                  Responses &amp; Perspectives ({activeThread.repliesList.length})
                </h3>

                {activeThread.repliesList.length === 0 ? (
                  <p className="text-xs text-slate italic py-2">
                    No responses yet. Be the first to share verified observations on this topic.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {activeThread.repliesList.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-xl border border-hairline bg-paper space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink-900">{rep.author}</span>
                          <span className="text-[11px] text-slate">{rep.time}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate leading-relaxed">
                          {rep.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Form for Reply */}
            <form
              onSubmit={handleAddReply}
              className="p-4 border-t border-hairline bg-paper/95 backdrop-blur-md flex flex-col sm:flex-row gap-2.5 shrink-0"
            >
              <input
                type="text"
                required
                placeholder="Write your contribution or perspective..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 h-12 sm:h-11 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
              />
              <button
                type="submit"
                className="w-full sm:w-auto h-12 sm:h-11 px-5 rounded-xl bg-ink text-paper font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                Reply
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          NEW DISCUSSION MODAL: Mobile Bottom Sheet / Modal
          ======================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsNewModalOpen(false)}
          />
          <div className="relative w-full sm:max-w-xl h-[80vh] max-h-[80vh] sm:h-auto sm:max-h-[85vh] bg-paper rounded-t-[32px] sm:rounded-2xl border-t sm:border border-hairline shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Grabber indicator for mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-hairline" />
            </div>

            <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-hairline shrink-0">
              <div>
                <h2 className="text-base font-bold text-ink-900">
                  Start a Topic Discussion
                </h2>
                <p className="text-xs text-slate">
                  Pose an architectural RFC, design question, or public inquiry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate hover:text-ink-900 hover:bg-paper-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate mb-1">
                  Topic / Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best pattern for validating domain attributes in FastAPI?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                  >
                    <option value="tech">Engineering</option>
                    <option value="design">Design</option>
                    <option value="health">Health &amp; Pharma</option>
                    <option value="sports">Sports</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">
                    Participation Access *
                  </label>
                  <select
                    value={newAccessType}
                    onChange={(e) => setNewAccessType(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                  >
                    <option value="open">🌐 Open (Anyone can reply)</option>
                    <option value="invited">👥 Invited Contributors Only</option>
                  </select>
                </div>
              </div>

              {newAccessType === "invited" && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-bold text-amber-900">
                    Invite Specific People to Discuss
                  </label>
                  <p className="text-[11px] text-amber-800">
                    The topic remains public for the community to read, but only invited members can post replies.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter usernames or names separated by commas (e.g. alex-mrema, neema-lyimo)"
                    value={newInvitedUsers}
                    onChange={(e) => setNewInvitedUsers(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-amber-500/30 bg-paper text-xs text-ink-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate mb-1">
                  Details &amp; Context *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Elaborate on the challenge, trade-offs, or questions you want to discuss..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Architecture, Python, Security, Tradeoffs"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                />
              </div>

              {/* Full-width action buttons on mobile, at end of scroll */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-5 border-t border-hairline mt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-full sm:w-auto px-5 h-12 sm:h-10 rounded-xl border border-hairline text-sm font-semibold text-slate hover:bg-paper-dim cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 h-12 sm:h-10 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" /> Post Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
