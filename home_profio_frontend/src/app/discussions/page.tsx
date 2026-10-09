"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Loader2,
  Trash2,
} from "lucide-react";
import { AppShell, Avatar, useSession } from "@/components/app/AppShell";
import {
  fetchDiscussions,
  fetchDiscussion,
  createDiscussion,
  postDiscussionReply,
  toggleDiscussionVote,
  deleteDiscussion,
  type DiscussionThreadItem,
} from "@/lib/api";

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
  if (!user) return <div className="min-h-screen bg-paper-dim" />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper-dim" />}>
      <DiscussionsContent user={user} />
    </Suspense>
  );
}

function DiscussionsContent({ user }: { user: any }) {
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get("thread");

  const [threads, setThreads] = useState<DiscussionThreadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [accessFilter, setAccessFilter] = useState<"all" | "open" | "invited">("all");
  const [search, setSearch] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<DiscussionThreadItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");

  // New Thread Form State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"tech" | "design" | "health" | "sports" | "general">("tech");
  const [newAccessType, setNewAccessType] = useState<"open" | "invited">("open");
  const [newInvitedUsers, setNewInvitedUsers] = useState("");
  const [newTags, setNewTags] = useState("");

  // Load threads from backend
  const loadThreads = () => {
    setIsLoading(true);
    fetchDiscussions({
      category: selectedCategory,
      access_type: accessFilter,
      search: search.trim() || undefined,
    })
      .then((data) => setThreads(data))
      .catch((err) => console.error("Could not fetch discussions:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadThreads();
  }, [selectedCategory, accessFilter, search]);

  // Load thread detail if param is provided
  useEffect(() => {
    if (threadIdParam) {
      setIsLoadingDetail(true);
      fetchDiscussion(threadIdParam)
        .then((detail) => setActiveThread(detail))
        .catch(() => {})
        .finally(() => setIsLoadingDetail(false));
    }
  }, [threadIdParam]);

  useEffect(() => {
    const handleOpen = () => setIsNewModalOpen(true);
    window.addEventListener("open-new-discussion", handleOpen);
    return () => window.removeEventListener("open-new-discussion", handleOpen);
  }, []);

  const handleOpenThread = (t: DiscussionThreadItem) => {
    setActiveThread(t);
    setIsLoadingDetail(true);
    fetchDiscussion(t.id)
      .then((detail) => setActiveThread(detail))
      .catch(() => {})
      .finally(() => setIsLoadingDetail(false));
  };

  const toggleUpvote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await toggleDiscussionVote(id);
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, upvotes: res.upvotes, hasVoted: res.hasVoted } : t))
      );
      if (activeThread?.id === id) {
        setActiveThread((prev) =>
          prev ? { ...prev, upvotes: res.upvotes, hasVoted: res.hasVoted } : null
        );
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const invitedList =
      newAccessType === "invited" && newInvitedUsers.trim()
        ? newInvitedUsers.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const tagList = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const created = await createDiscussion({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        access_type: newAccessType,
        invited_users: invitedList,
        tags: tagList,
      });

      setThreads([created, ...threads]);
      setIsNewModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      setNewAccessType("open");
      setNewInvitedUsers("");
    } catch (err) {
      console.error("Failed to create discussion:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;

    setIsPostingReply(true);
    try {
      const newReply = await postDiscussionReply(activeThread.id, replyText.trim());
      const updatedReplies = [...(activeThread.repliesList || []), newReply];
      const updated = {
        ...activeThread,
        replies: (activeThread.replies || 0) + 1,
        repliesList: updatedReplies,
      };

      setActiveThread(updated);
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? { ...t, replies: updated.replies } : t)));
      setReplyText("");
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleDeleteThread = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Are you sure you want to delete this discussion?")) return;
    try {
      await deleteDiscussion(id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThread?.id === id) setActiveThread(null);
    } catch (err) {
      console.error("Delete discussion failed:", err);
    }
  };

  const filtered = threads;

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
          {isLoading ? (
            <div className="py-16 text-center text-slate flex flex-col items-center justify-center gap-3 bg-paper rounded-2xl border border-hairline">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              <span className="text-sm">Loading verified discussions...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate bg-paper rounded-2xl border border-hairline p-8 space-y-3">
              <MessageSquare className="w-8 h-8 mx-auto text-slate/50" />
              <p className="text-sm font-medium text-ink">No discussions found matching your filter.</p>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Start a Discussion
              </button>
            </div>
          ) : (
            filtered.map((thread) => {
              const isUpvoted = Boolean(thread.hasVoted);
              const isOwner = user?.username === thread.author.username || user?.is_admin;
              return (
                <article
                  key={thread.id}
                  className="p-5 sm:p-6 rounded-2xl border border-hairline bg-paper hover:border-ink/30 transition-all duration-200 shadow-2xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-paper-dim text-ink-900 uppercase">
                          {thread.categoryLabel || thread.category}
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
                        <span className="text-xs text-slate">· {new Date(thread.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h2
                        onClick={() => handleOpenThread(thread)}
                        className="text-base sm:text-lg font-bold text-ink-900 hover:text-sky-600 transition-colors cursor-pointer"
                      >
                        {thread.title}
                      </h2>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        title="Delete discussion"
                        className="p-1.5 rounded-lg text-slate hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p
                    onClick={() => handleOpenThread(thread)}
                    className="text-sm text-slate leading-relaxed cursor-pointer line-clamp-3 sm:line-clamp-none"
                  >
                    {thread.content}
                  </p>

                  {thread.tags && thread.tags.length > 0 && (
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
                      {thread.author.avatar ? (
                        <Avatar name={thread.author.name} src={thread.author.avatar} className="w-6 h-6 text-[10px]" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-[10px]">
                          {thread.author.name[0]}
                        </div>
                      )}
                      <span className="font-semibold text-ink-900">{thread.author.name}</span>
                      <span className="text-slate hidden sm:inline">· {thread.author.role}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => toggleUpvote(thread.id, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          isUpvoted
                            ? "border-sky-600 bg-sky-50 text-sky-600 dark:bg-sky-950/40"
                            : "border-hairline text-slate hover:text-ink-900 hover:bg-paper-dim"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="font-mono">{thread.upvotes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenThread(thread)}
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
            })
          )}
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
                  Responses &amp; Perspectives ({(activeThread.repliesList || []).length})
                </h3>

                {isLoadingDetail ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span>Loading perspectives...</span>
                  </div>
                ) : (activeThread.repliesList || []).length === 0 ? (
                  <p className="text-xs text-slate italic py-2">
                    No responses yet. Be the first to share verified observations on this topic.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(activeThread.repliesList || []).map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-xl border border-hairline bg-paper space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink-900">{rep.author}</span>
                          <span className="text-[11px] text-slate">{new Date(rep.time).toLocaleDateString()}</span>
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
                disabled={isPostingReply || !replyText.trim()}
                className="w-full sm:w-auto h-12 sm:h-11 px-5 rounded-xl bg-ink text-paper font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isPostingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 h-12 sm:h-10 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSubmitting ? "Publishing..." : "Post Discussion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
