"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  Plus,
  Pencil,
  Search,
  Sparkles,
  Calendar,
  Smile,
  Users,
  MapPin,
  Tag,
  Trash2,
  BookMarked,
  MessageSquare,
  X,
  Heart,
  Flame,
  Award,
  Filter,
} from "lucide-react";
import {
  fetchMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  type MemoryItem,
  type CreateMemoryPayload,
} from "@/lib/api";
import { AppShell, useSession } from "@/components/app/AppShell";

const MOODS = [
  { label: "Joyful", emoji: "😊", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { label: "Proud", emoji: "🏆", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { label: "Grateful", emoji: "🙏", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { label: "Reflective", emoji: "🤔", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  { label: "Energized", emoji: "⚡", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { label: "Peaceful", emoji: "🌿", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { label: "Tired", emoji: "🥱", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  { label: "Stressed", emoji: "🌪️", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
];

export default function MemoriesPage() {
  const [user] = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formMood, setFormMood] = useState("joyful");
  const [formCategory, setFormCategory] = useState("daily");
  const [formPeople, setFormPeople] = useState("Just me");
  const [formLocation, setFormLocation] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadData = () => {
    setLoading(true);
    fetchMemories({ limit: 100 })
      .then((data) => {
        setMemories(data);
        setLoading(false);
      })
      .catch(() => {
        setMemories([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;
    setSubmitting(true);
    try {
      const payload: CreateMemoryPayload = {
        title: formTitle.trim() || null,
        content: formContent.trim(),
        mood: formMood,
        category: formCategory,
        people: formPeople.split(",").map((p) => p.trim()).filter(Boolean),
        location: formLocation.trim() || null,
        tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
        occurred_on: formDate || null,
        visibility: "private",
      };
      await createMemory(payload);
      setCreateModalOpen(false);
      setFormTitle("");
      setFormContent("");
      setFormMood("joyful");
      setFormLocation("");
      setFormTags("");
      loadData();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to save memory");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: MemoryItem) => {
    setEditingMemory(item);
    setFormTitle(item.title || "");
    setFormContent(item.content);
    setFormMood(item.mood || "joyful");
    setFormCategory(item.category || "daily");
    setFormPeople(item.people && item.people.length > 0 ? item.people.join(", ") : "Just me");
    setFormLocation(item.location || "");
    setFormTags(item.tags && item.tags.length > 0 ? item.tags.join(", ") : "");
    setFormDate(item.occurred_on || new Date().toISOString().slice(0, 10));
    setEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !formContent.trim()) return;
    setSubmitting(true);
    try {
      const payload: Partial<CreateMemoryPayload> = {
        title: formTitle.trim() || null,
        content: formContent.trim(),
        mood: formMood,
        category: formCategory,
        people: formPeople.split(",").map((p) => p.trim()).filter(Boolean),
        location: formLocation.trim() || null,
        tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
        occurred_on: formDate || null,
      };
      const updated = await updateMemory(editingMemory.id, payload);
      setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditModalOpen(false);
      setEditingMemory(null);
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to update memory");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    setDeletingId(id);
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Failed to delete memory.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        m.content.toLowerCase().includes(q) ||
        m.mood.toLowerCase().includes(q) ||
        (m.location && m.location.toLowerCase().includes(q)) ||
        (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)));

      const matchMood = selectedMood === "all" || m.mood.toLowerCase() === selectedMood.toLowerCase();
      return matchSearch && matchMood;
    });
  }, [memories, searchQuery, selectedMood]);

  if (!user) return <div className="min-h-screen bg-paper-dim" />;

  return (
    <AppShell user={user}>
      <div className="py-8 px-4 sm:px-8 max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                Personal Timeline
              </span>
              <span className="text-xs text-slate">Life Moments & Reflections</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 mt-1 flex items-center gap-2.5">
              <History className="h-7 w-7 text-pink-600 dark:text-pink-400" />
              Memories & Mood
            </h1>
            <p className="text-sm text-slate mt-0.5">
              Your private daily journal, emotional states, and milestones. You and your AI companion can save and reflect on them together.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-hairline bg-paper hover:bg-paper-dim text-sm font-semibold text-ink-800 transition-colors shadow-xs"
            >
              <BookMarked className="h-4 w-4 text-amber-500" />
              View Stories
            </Link>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Memory
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-ink-900">{memories.length}</div>
              <div className="text-xs font-medium text-slate">Memories Saved</div>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Smile className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-ink-900 capitalize">
                {memories[0]?.mood || "Reflective"}
              </div>
              <div className="text-xs font-medium text-slate">Recent Mood</div>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-900">AI Companion Ready</div>
              <div className="text-xs font-medium text-slate">Weave memories into stories</div>
            </div>
          </div>
        </div>

        {/* Search & Mood Filter Chips */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <input
              type="text"
              placeholder="Search memories, places, thoughts, tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl bg-paper border border-hairline pl-10 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMood("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedMood === "all"
                  ? "bg-ink text-paper"
                  : "bg-paper border border-hairline text-slate hover:text-ink-800"
              }`}
            >
              All Moods
            </button>
            {MOODS.map((m) => (
              <button
                key={m.label}
                onClick={() => setSelectedMood(m.label.toLowerCase())}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedMood === m.label.toLowerCase()
                    ? "bg-ink text-paper"
                    : "bg-paper border border-hairline text-ink-800 hover:bg-paper-dim"
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Memories Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate">Loading your timeline…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-paper/60 p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink-900">No memories found</h3>
            <p className="text-sm text-slate mt-1 max-w-md mx-auto">
              {searchQuery || selectedMood !== "all"
                ? "Try clearing your filters or search term to see other entries."
                : "You haven't recorded any memories yet. Add your first memory or talk with your AI companion to log how your day went!"}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-paper text-sm font-semibold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add First Memory
              </button>
              <Link
                href="/ai"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-hairline bg-paper text-sm font-semibold text-ink-800 hover:bg-paper-dim"
              >
                <Sparkles className="h-4 w-4 text-sky-500" />
                Talk with AI Companion
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const moodInfo = MOODS.find((m) => m.label.toLowerCase() === item.mood.toLowerCase()) || {
                label: item.mood,
                emoji: "✨",
                color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
              };
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-hairline bg-paper p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow group relative"
                >
                  <div>
                    {/* Card Top: Date & Mood */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-hairline/60">
                      <div className="flex items-center gap-1.5 text-xs text-slate">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{item.occurred_on}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${moodInfo.color}`}
                      >
                        <span>{moodInfo.emoji}</span>
                        <span className="capitalize">{item.mood}</span>
                      </span>
                    </div>

                    {/* Title & Content */}
                    <div className="mt-3">
                      {item.title && (
                        <h3 className="text-base font-bold text-ink-900 group-hover:text-pink-600 transition-colors">
                          {item.title}
                        </h3>
                      )}
                      <p className="text-sm text-ink-800/90 whitespace-pre-wrap mt-1.5 line-clamp-6 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Location & People */}
                    {(item.location || (item.people && item.people.length > 0)) && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate">
                        {item.location && (
                          <span className="inline-flex items-center gap-1 bg-paper-dim px-2 py-0.5 rounded-md">
                            <MapPin className="h-3 w-3 text-slate" />
                            {item.location}
                          </span>
                        )}
                        {item.people && item.people.length > 0 && item.people[0] !== "Just me" && (
                          <span className="inline-flex items-center gap-1 bg-paper-dim px-2 py-0.5 rounded-md">
                            <Users className="h-3 w-3 text-slate" />
                            {item.people.join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium text-slate bg-paper-dim px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-hairline/60 flex items-center justify-between">
                    <Link
                      href={`/ai`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Reflect with AI
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-slate hover:text-ink p-1.5 rounded-lg hover:bg-paper-dim transition-colors cursor-pointer"
                        title="Edit memory"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-slate hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete memory"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Memory */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-paper p-6 border border-hairline shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Record a Memory</h3>
                    <p className="text-xs text-slate">Save your thoughts, feelings, or daily highlights</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Title (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Completed First Full-Stack Feature"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">
                    What happened? How are you feeling? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your reflection, thoughts, or what you experienced today…"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1.5">Mood / Tone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map((m) => (
                      <button
                        type="button"
                        key={m.label}
                        onClick={() => setFormMood(m.label.toLowerCase())}
                        className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          formMood === m.label.toLowerCase()
                            ? "border-pink-500 bg-pink-500/10 text-pink-700 font-bold shadow-xs scale-102"
                            : "border-hairline bg-paper-dim text-slate hover:bg-paper"
                        }`}
                      >
                        <span className="text-base">{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    >
                      <option value="daily">Daily</option>
                      <option value="milestone">Milestone</option>
                      <option value="work">Work & Project</option>
                      <option value="learning">Learning</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Location (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Home office, Dar es Salaam"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">People</label>
                    <input
                      type="text"
                      placeholder="e.g. Just me, Team"
                      value={formPeople}
                      onChange={(e) => setFormPeople(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. coding, nextjs, breakthrough"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
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
                    disabled={submitting || !formContent.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? "Saving…" : "Save Memory"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Memory */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-paper p-6 border border-hairline shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Edit Memory</h3>
                    <p className="text-xs text-slate">Update your reflection and details</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-paper-dim text-slate hover:text-ink flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Title (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Completed First Full-Stack Feature"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">
                    What happened? How are you feeling? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-xl bg-paper-dim border border-hairline p-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1.5">Mood / Tone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map((m) => (
                      <button
                        type="button"
                        key={m.label}
                        onClick={() => setFormMood(m.label.toLowerCase())}
                        className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          formMood === m.label.toLowerCase()
                            ? "border-pink-500 bg-pink-500/10 text-pink-700 font-bold shadow-xs scale-102"
                            : "border-hairline bg-paper-dim text-slate hover:bg-paper"
                        }`}
                      >
                        <span className="text-base">{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    >
                      <option value="daily">Daily</option>
                      <option value="milestone">Milestone</option>
                      <option value="work">Work & Project</option>
                      <option value="learning">Learning</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Location (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Home office, Dar es Salaam"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">People</label>
                    <input
                      type="text"
                      placeholder="e.g. Just me, Team"
                      value={formPeople}
                      onChange={(e) => setFormPeople(e.target.value)}
                      className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. coding, nextjs, breakthrough"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="h-10 w-full rounded-xl bg-paper-dim border border-hairline px-3 text-sm outline-none focus:ring-2 focus:ring-ink/10"
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
                    disabled={submitting || !formContent.trim()}
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? "Updating…" : "Update Memory"}
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
