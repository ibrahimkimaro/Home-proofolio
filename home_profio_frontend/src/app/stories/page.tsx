"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BookMarked,
  Plus,
  Pencil,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  BookOpen,
  History,
  X,
  Feather,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  fetchStories,
  fetchStory,
  createStory,
  updateStory,
  deleteStory,
  generateStoryWithAi,
  addStoryChapter,
  deleteStoryChapter,
  type StoryItem,
  type CreateStoryPayload,
} from "@/lib/api";
import { AppShell, useSession } from "@/components/app/AppShell";

export default function StoriesPage() {
  const [user] = useSession();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [detailedStories, setDetailedStories] = useState<Record<string, StoryItem>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  // Manual create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Story modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Add Chapter modal
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [targetStoryId, setTargetStoryId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [savingChapter, setSavingChapter] = useState(false);

  // AI Story Weaver Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchStories()
      .then((data) => {
        setStories(data);
        setLoading(false);
      })
      .catch(() => {
        setStories([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = async (storyId: string) => {
    if (expandedStoryId === storyId) {
      setExpandedStoryId(null);
      return;
    }
    setExpandedStoryId(storyId);
    if (!detailedStories[storyId]) {
      setLoadingDetail(storyId);
      try {
        const full = await fetchStory(storyId);
        setDetailedStories((prev) => ({ ...prev, [storyId]: full }));
      } catch (err) {
        console.error("Failed to load story details", err);
      } finally {
        setLoadingDetail(null);
      }
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const payload: CreateStoryPayload = {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        visibility: "private",
        status: "draft",
      };
      await createStory(payload);
      setCreateModalOpen(false);
      setFormTitle("");
      setFormDesc("");
      loadData();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to create story");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditStory = (story: StoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStory(story);
    setEditTitle(story.title);
    setEditDesc(story.description || "");
    setEditModalOpen(true);
  };

  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory || !editTitle.trim()) return;
    setSubmitting(true);
    try {
      const updated = await updateStory(editingStory.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
      });
      setStories((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      if (detailedStories[editingStory.id]) {
        setDetailedStories((prev) => ({
          ...prev,
          [editingStory.id]: { ...prev[editingStory.id], ...updated },
        }));
      }
      setEditModalOpen(false);
      setEditingStory(null);
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to update story");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddChapter = (storyId: string) => {
    setTargetStoryId(storyId);
    setChapterTitle("");
    setChapterContent("");
    setChapterModalOpen(true);
  };

  const handleAddChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoryId || !chapterTitle.trim()) return;
    setSavingChapter(true);
    try {
      await addStoryChapter(targetStoryId, {
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
      });
      // reload full story details
      const full = await fetchStory(targetStoryId);
      setDetailedStories((prev) => ({ ...prev, [targetStoryId]: full }));
      setChapterModalOpen(false);
      setChapterTitle("");
      setChapterContent("");
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to add chapter");
    } finally {
      setSavingChapter(false);
    }
  };

  const handleDeleteChapter = async (storyId: string, chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await deleteStoryChapter(storyId, chapterId);
      setDetailedStories((prev) => {
        const cur = prev[storyId];
        if (!cur) return prev;
        return {
          ...prev,
          [storyId]: {
            ...cur,
            chapters: (cur.chapters || []).filter((c) => c.id !== chapterId),
          },
        };
      });
    } catch {
      alert("Failed to delete chapter.");
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      await generateStoryWithAi(aiTopic.trim());
      setAiModalOpen(false);
      setAiTopic("");
      loadData();
    } catch (err: unknown) {
      setAiError((err as { message?: string })?.message || "Could not generate story from memories. Please ensure you have memories saved!");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this story and all its chapters?")) return;
    setDeletingId(id);
    try {
      await deleteStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
      if (expandedStoryId === id) setExpandedStoryId(null);
    } catch {
      alert("Failed to delete story.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-8 max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Narrative Journeys
              </span>
              <span className="text-xs text-slate">Synthesized from Real Memories</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 mt-1 flex items-center gap-2.5">
              <BookMarked className="h-7 w-7 text-amber-500" />
              Stories & Journeys
            </h1>
            <p className="text-sm text-slate mt-0.5">
              Woven narratives of your growth, projects, and personal evolution crafted from your memories.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-hairline bg-paper hover:bg-paper-dim text-sm font-semibold text-ink-800 transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-sky-500" />
              Weave with AI
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Story Draft
            </button>
          </div>
        </div>

        {/* Stories List */}
        {loading ? (
          <div className="py-20 text-center text-slate">Loading your stories…</div>
        ) : stories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-paper/60 p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Feather className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink-900">No stories created yet</h3>
            <p className="text-sm text-slate mt-1 max-w-md mx-auto">
              Stories synthesize multiple memories and milestones into a chapter-by-chapter chronicle. Let AI weave one for you or create a fresh draft.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setAiModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-paper text-sm font-semibold cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-sky-400" />
                Weave Story with AI
              </button>
              <Link
                href="/memories"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-hairline bg-paper text-sm font-semibold text-ink-800 hover:bg-paper-dim"
              >
                <History className="h-4 w-4 text-pink-500" />
                View Memories First
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => {
              const isExpanded = expandedStoryId === story.id;
              const detail = detailedStories[story.id];
              return (
                <div
                  key={story.id}
                  className="rounded-2xl border border-hairline bg-paper p-6 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div
                    onClick={() => toggleExpand(story.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate">
                        <span className="px-2 py-0.5 rounded-md uppercase font-bold tracking-wider text-[10px] bg-paper-dim border border-hairline text-slate">
                          {story.status}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {story.created_at ? new Date(story.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-ink-900 mt-1 flex items-center gap-2">
                        {story.title}
                      </h2>
                      {story.description && (
                        <p className="text-sm text-slate mt-1 leading-relaxed">
                          {story.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => openEditStory(story, e)}
                        className="text-slate hover:text-ink p-2 rounded-lg hover:bg-paper-dim transition-colors cursor-pointer"
                        title="Edit story title & description"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(story.id, e)}
                        disabled={deletingId === story.id}
                        className="text-slate hover:text-rose-600 p-2 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete story"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-paper-dim text-slate hover:text-ink transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded chapters accordion */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-hairline">
                      {loadingDetail === story.id ? (
                        <div className="py-6 text-center text-xs text-slate">Loading chapters…</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              Chapters ({detail?.chapters?.length || 0})
                            </h4>
                            <button
                              onClick={() => openAddChapter(story.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-paper-dim hover:bg-ink hover:text-paper transition-colors cursor-pointer border border-hairline"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Chapter
                            </button>
                          </div>

                          {!detail?.chapters || detail.chapters.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate bg-paper-dim/60 rounded-xl border border-dashed border-hairline">
                              No chapters drafted in this story yet. Click "Add Chapter" above to start writing.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {detail.chapters.map((ch, idx) => (
                                <div
                                  key={ch.id || idx}
                                  className="rounded-xl border border-hairline/80 bg-paper-dim/60 p-4"
                                >
                                  <div className="flex items-center justify-between pb-2 border-b border-hairline/40">
                                    <h5 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                                      <span className="text-xs font-mono text-slate">Ch. {idx + 1}</span>
                                      {ch.title}
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      {ch.ai_generated && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-full">
                                          <Sparkles className="h-3 w-3" />
                                          AI Synthesized
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleDeleteChapter(story.id, ch.id)}
                                        className="text-slate hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                        title="Delete chapter"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-sm text-ink-800/90 whitespace-pre-wrap mt-2.5 leading-relaxed font-serif">
                                    {ch.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                        <Link
                          href="/ai"
                          className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-semibold"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Chat with AI to expand or rewrite chapters
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Edit Story */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl bg-paper p-6 border border-hairline shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Edit Story</h3>
                    <p className="text-xs text-slate">Update title or description</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateStory} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Story Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Description / Premise</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-hairline text-sm font-semibold text-slate hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !editTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Chapter */}
        {chapterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-paper p-6 border border-hairline shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Add Story Chapter</h3>
                    <p className="text-xs text-slate">Write a new chapter narrative</p>
                  </div>
                </div>
                <button
                  onClick={() => setChapterModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddChapterSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Chapter Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 1: The First Breakthrough"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Chapter Content *</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Write the narrative text for this chapter…"
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10 font-serif leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setChapterModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-hairline text-sm font-semibold text-slate hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingChapter || !chapterTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {savingChapter ? "Adding…" : "Add Chapter"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: New Story Manual Draft */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl bg-paper p-6 border border-hairline shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">New Story Draft</h3>
                    <p className="text-xs text-slate">Create an empty story outline</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleManualCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Story Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Transition into Software Engineering"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Description / Premise</label>
                  <textarea
                    rows={3}
                    placeholder="What is this story about? Key themes or takeaways…"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-hairline text-sm font-semibold text-slate hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? "Creating…" : "Create Story"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: AI Story Weaver */}
        {aiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl bg-paper p-6 border border-hairline shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">AI Story Weaver</h3>
                    <p className="text-xs text-slate">Kimmy turns your memories into a story</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAiGenerate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">
                    What topic or journey should Kimmy chronicle? *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. My first year learning to code and building projects"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                  <p className="text-[11px] text-slate mt-1.5">
                    The AI searches your verified memories, extracts milestones, and writes multi-chapter drafts grounded in what you actually experienced.
                  </p>
                </div>

                {aiError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                    {aiError}
                  </div>
                )}

                <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-hairline text-sm font-semibold text-slate hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiGenerating || !aiTopic.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {aiGenerating ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" />
                        Weaving Story…
                      </>
                    ) : (
                      <>
                        <Feather className="h-4 w-4" />
                        Weave Story
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
