"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Puzzle,
  BookOpen,
  Award,
  Code2,
  Palette,
  Trophy,
  Pill,
  Sparkles,
  Link2,
  Paperclip,
  Trash2,
  X,
  Plus,
  Loader2,
  Globe,
  Lock,
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
  LucideIcon,
} from "lucide-react";
import {
  createWork,
  updateWork,
  fetchTemplates,
  uploadFile,
  mediaUrl,
  type Work,
  type WorkInput,
  type WorkTemplate,
  type EvidenceLink,
  type Visibility,
  type EvidenceVisibility,
} from "@/lib/api";
import { LIFECYCLES, stateLabel, guessEvidenceType, EVIDENCE_TYPES } from "@/lib/items";

interface TemplatePreset {
  key: string;
  label: string;
  icon: LucideIcon;
  badge: string;
  description: string;
}

const DOMAIN_PRESETS: TemplatePreset[] = [
  {
    key: "developer",
    label: "Developer",
    icon: Code2,
    badge: "Tech & Code",
    description: "Repository, languages, framework, architecture, deployment",
  },
  {
    key: "designer",
    label: "Graphic Designer",
    icon: Palette,
    badge: "Creative & UI",
    description: "Design type, tools, client, format, medium, prototype",
  },
  {
    key: "footballer",
    label: "Footballer",
    icon: Trophy,
    badge: "Sports & Athlete",
    description: "Team, position, competition, season, matches, goals",
  },
  {
    key: "pharmacy",
    label: "Pharmacy Owner",
    icon: Pill,
    badge: "Healthcare & Retail",
    description: "Business type, services, products, location, operating info",
  },
  {
    key: "business",
    label: "Business & Founder",
    icon: Building,
    badge: "Startup & Ops",
    description: "Company name, key results, customer metrics",
  },
  {
    key: "other",
    label: "Custom / General",
    icon: Sparkles,
    badge: "Universal",
    description: "Core fields with custom dynamic attributes",
  },
];

const CATEGORIES = [
  { id: "work", label: "Work & Projects", icon: Briefcase, hint: "Products built, applications shipped, client campaigns" },
  { id: "problem", label: "Problems", icon: Puzzle, hint: "Technical roadblocks, bugs, or business challenges solved" },
  { id: "learning", label: "Ideas & Learnings", icon: BookOpen, hint: "New skills learned, prototypes, research, reflections" },
  { id: "achievement", label: "Achievements", icon: Award, hint: "Awards, certificates, championship milestones" },
];

const VISIBILITY_OPTIONS: { id: Visibility; label: string; desc: string; icon: LucideIcon }[] = [
  { id: "public", label: "Public", desc: "Featured on your portfolio & profile", icon: Globe },
  { id: "unlisted", label: "Link only", desc: "Accessible with direct link", icon: Link2 },
  { id: "private", label: "Private", desc: "Only visible to you", icon: Lock },
];

interface CustomAttrRow {
  label: string;
  value: string;
}

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    badge: string;
    createTitle: string;
    editTitle: string;
    subtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    roleLabel: string;
    rolePlaceholder: string;
    dateLabel: string;
    submitLabel: string;
    icon: LucideIcon;
  }
> = {
  work: {
    label: "Work & Project",
    badge: "Production Work & Deliverable",
    createTitle: "Add Work / Project",
    editTitle: "Edit Work / Project",
    subtitle: "Document production deliverables, technical architecture, and verifiable proof.",
    titleLabel: "Project Title",
    titlePlaceholder: "e.g. Next-Gen Core Cloud Platform, Kariakoo Pharmacy Launch, Mobile Banking Engine",
    descLabel: "Description & System Overview",
    descPlaceholder: "Describe the scope, technical architecture, key challenges, and measurable production impact.",
    roleLabel: "Your Role / Organization",
    rolePlaceholder: "e.g. Lead Architect @ Fintech, Staff Engineer, Solo Creator",
    dateLabel: "Completion / Delivery Date",
    submitLabel: "Create Project",
    icon: Briefcase,
  },
  problem: {
    label: "Problem Solved",
    badge: "Incident RCA & Root Cause Fix",
    createTitle: "Log Problem Solved & RCA",
    editTitle: "Edit Problem Solved",
    subtitle: "Record production incidents, root cause analyses, system outages, and permanent fixes.",
    titleLabel: "Incident / Problem Title",
    titlePlaceholder: "e.g. Memory leak in high-throughput gRPC stream causing OOM container crashes",
    descLabel: "Symptoms, Root Cause & Permanent Fix",
    descPlaceholder: "Detail the symptoms observed, how root cause was isolated, and the permanent architectural fix implemented.",
    roleLabel: "Your Role during Incident",
    rolePlaceholder: "e.g. Incident Commander, Lead Backend Engineer, On-Call Responder",
    dateLabel: "Date Resolved",
    submitLabel: "Save Problem Log",
    icon: Puzzle,
  },
  learning: {
    label: "Ideas & Learning",
    badge: "Research Lab & Technical Study",
    createTitle: "Add Learning Lab & Study Entry",
    editTitle: "Edit Learning Entry",
    subtitle: "Track deep dives into new technologies, architecture prototypes, and research breakthroughs.",
    titleLabel: "Topic / Technology Studied",
    titlePlaceholder: "e.g. Raft Consensus Algorithm Implementation in Rust",
    descLabel: "Research Insights & Key Takeaways",
    descPlaceholder: "Outline your findings, experiments conducted, code benchmarks, and architectural insights.",
    roleLabel: "Context / Track / Institution",
    rolePlaceholder: "e.g. Self-directed Research, Stanford CS244B, Open Source Contributor",
    dateLabel: "Date Logged",
    submitLabel: "Save Learning Lab",
    icon: BookOpen,
  },
  achievement: {
    label: "Achievement",
    badge: "Verified Credential & Honor",
    createTitle: "Log Achievement & Credential",
    editTitle: "Edit Achievement",
    subtitle: "Record professional certifications, prestigious awards, patents, and official verifications.",
    titleLabel: "Achievement / Award Name",
    titlePlaceholder: "e.g. AWS Certified Solutions Architect - Professional",
    descLabel: "Achievement Details & Criteria",
    descPlaceholder: "Describe the rigorous criteria met, exam score, competition ranking, or publication reference.",
    roleLabel: "Issuing Organization / Authority",
    rolePlaceholder: "e.g. Amazon Web Services, Tanzania Pharmacy Council, IEEE, FIFA",
    dateLabel: "Date Issued / Conferred",
    submitLabel: "Record Achievement",
    icon: Award,
  },
};

const STATUS_OPTIONS: Record<string, { id: string; label: string }[]> = {
  work: [
    { id: "completed", label: "Completed" },
    { id: "in_progress", label: "In Progress" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Draft" },
  ],
  problem: [
    { id: "resolved", label: "Resolved" },
    { id: "mitigated", label: "Mitigated" },
    { id: "investigating", label: "Investigating" },
    { id: "identified", label: "Identified" },
  ],
  learning: [
    { id: "completed", label: "Completed" },
    { id: "in_progress", label: "In Progress" },
    { id: "started", label: "Started" },
  ],
  achievement: [
    { id: "verified", label: "Verified" },
    { id: "received", label: "Received" },
  ],
};

const defaultStatusForCategory = (cat: string) => {
  if (cat === "problem") return "resolved";
  if (cat === "learning") return "completed";
  if (cat === "achievement") return "verified";
  return "completed";
};

interface UniversalWorkFormProps {
  initialWork?: Work | null;
  defaultCategory?: string;
  onSuccess?: (work: Work) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function UniversalWorkForm({ initialWork, defaultCategory, onSuccess, onCancel, isModal = false }: UniversalWorkFormProps) {
  const router = useRouter();
  const isCategoryLocked = Boolean(defaultCategory || initialWork);
  const [category, setCategory] = useState<string>(initialWork?.work_type || defaultCategory || "work");
  const [status, setStatus] = useState<string>(
    initialWork?.status || defaultStatusForCategory(category)
  );
  const [domainTemplate, setDomainTemplate] = useState<string>(initialWork?.template || "developer");
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);

  // Universal Core Fields
  const [title, setTitle] = useState(initialWork?.title || "");
  const [description, setDescription] = useState(initialWork?.description || "");
  const [occurredOn, setOccurredOn] = useState(initialWork?.occurred_on || "");
  const [contextRole, setContextRole] = useState(initialWork?.context_role || "");
  const [visibility, setVisibility] = useState<Visibility>(initialWork?.visibility || "public");
  const [skills, setSkills] = useState<string[]>(initialWork?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState<EvidenceLink[]>(initialWork?.evidence_links || []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  // Dynamic Attributes map
  const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, unknown>>(() => {
    if (initialWork?.custom_attributes) {
      const copy = { ...initialWork.custom_attributes };
      delete copy.custom;
      return copy;
    }
    return {};
  });

  // Custom User-Defined Attributes [{label, value}]
  const [customAttrs, setCustomAttrs] = useState<CustomAttrRow[]>(() => {
    if (initialWork?.custom_attributes?.custom && Array.isArray(initialWork.custom_attributes.custom)) {
      return (initialWork.custom_attributes.custom as CustomAttrRow[]).map((r) => ({
        label: String(r.label || ""),
        value: String(r.value || ""),
      }));
    }
    return [];
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  // Determine active template definition from backend or fallback to matched preset
  const activeTemplateDef = templates.find((t) => t.key === domainTemplate && t.kind === category) ||
    templates.find((t) => t.key === domainTemplate) ||
    (category !== "work" ? templates.find((t) => t.key === category) : null);

  const activeFields = activeTemplateDef?.fields || [];

  // Update dynamic attribute helper
  const setAttr = (key: string, val: unknown) => {
    setDynamicAttrs((prev) => ({ ...prev, [key]: val }));
  };

  // Add skill tag
  const handleAddSkill = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = Array.from(new Set([...skills, ...parts]));
    setSkills(updated);
    setSkillInput("");
  };

  // Remove skill tag
  const handleRemoveSkill = (tag: string) => {
    setSkills(skills.filter((s) => s !== tag));
  };

  // Add evidence link
  const handleAddEvidenceLink = () => {
    const rawUrl = newLinkUrl.trim();
    if (!rawUrl) return;
    const formatted = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const label = newLinkLabel.trim() || new URL(formatted).hostname.replace(/^www\./, "");
    setEvidenceLinks([
      ...evidenceLinks,
      {
        url: formatted,
        label,
        type: guessEvidenceType(formatted),
        visibility: "public",
      },
    ]);
    setNewLinkUrl("");
    setNewLinkLabel("");
  };

  // File upload evidence
  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadFile(file);
      setEvidenceLinks([
        ...evidenceLinks,
        {
          url: res.url,
          label: res.name,
          type: guessEvidenceType(res.url, res.content_type),
          visibility: "public",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Custom attributes handlers
  const handleAddCustomAttr = () => {
    if (customAttrs.length >= 20) return;
    setCustomAttrs([...customAttrs, { label: "", value: "" }]);
  };

  const handleUpdateCustomAttr = (index: number, field: "label" | "value", val: string) => {
    setCustomAttrs((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const handleRemoveCustomAttr = (index: number) => {
    setCustomAttrs((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form directly to Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for this item.");
      return;
    }

    setBusy(true);
    setError(null);

    // Filter valid custom details
    const cleanCustom = customAttrs
      .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
      .filter((r) => r.label && r.value);

    const payloadAttrs: Record<string, unknown> = {
      ...dynamicAttrs,
    };
    if (cleanCustom.length > 0) {
      payloadAttrs.custom = cleanCustom;
    }

    const payload: WorkInput = {
      title: title.trim(),
      description: description.trim() || null,
      context_role: contextRole.trim() || null,
      occurred_on: occurredOn || null,
      work_type: category,
      status: status || defaultStatusForCategory(category),
      template: category === "work" ? domainTemplate : null,
      visibility,
      skills,
      custom_attributes: payloadAttrs,
      evidence_links: evidenceLinks,
    };

    try {
      let savedWork: Work;
      if (initialWork?.id) {
        savedWork = await updateWork(initialWork.id, payload);
      } else {
        savedWork = await createWork(payload);
      }

      setSuccessMsg("Successfully saved to database!");
      if (onSuccess) {
        onSuccess(savedWork);
      } else {
        setTimeout(() => {
          router.push("/work");
        }, 600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save work item to database.");
    } finally {
      setBusy(false);
    }
  };

  const containerClasses = isModal
    ? "p-4 sm:p-6 w-full"
    : "max-w-4xl mx-auto p-4 sm:p-8 bg-paper rounded-2xl border border-hairline shadow-sm";

  const meta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.work;
  const CategoryIcon = meta.icon;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-start justify-between pb-5 mb-6 border-b border-hairline">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-ink text-paper shadow-sm">
            <CategoryIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-paper-dim border border-hairline text-slate">
                {meta.badge}
              </span>
              {isCategoryLocked && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Independent Form
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 mt-1">
              {initialWork ? `${meta.editTitle}: ${initialWork.title}` : meta.createTitle}
            </h1>
            <p className="text-[13px] text-slate mt-0.5">
              {meta.subtitle}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-slate hover:text-ink-900 hover:bg-paper-dim transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Category Picker (ONLY shown when NOT locked by page context) */}
        {!isCategoryLocked && (
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-3">
              1. Select Category (Choose Target Section)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      setStatus(defaultStatusForCategory(cat.id));
                    }}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-ink bg-ink text-paper shadow-sm"
                        : "border-hairline bg-paper hover:border-ink/40 text-ink-800"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-paper" : "text-slate"}`} />
                    <span className="text-[14px] font-semibold">{cat.label}</span>
                    <span className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? "text-paper/80" : "text-slate"}`}>
                      {cat.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Domain Template Selection (Dynamic Templates for Work) */}
        {category === "work" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[13px] font-semibold text-slate">
                Domain Template (Loads specific dynamic attributes)
              </label>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Irrelevant fields will be hidden
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DOMAIN_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = domainTemplate === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setDomainTemplate(preset.key);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-ink-900 ring-2 ring-blue-500/20"
                        : "border-hairline bg-paper hover:border-hairline/80 text-ink-800"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-paper-dim text-slate"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold truncate">{preset.label}</span>
                      </div>
                      <span className="text-[11px] text-slate block truncate mt-0.5">
                        {preset.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Core Fields */}
        <div className="p-5 rounded-2xl border border-hairline bg-paper-dim/40 space-y-5">
          <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">
              {meta.label} Core Details
            </h3>
            <span className="text-xs text-slate">Universal across all professionals</span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-1.5">
              {meta.titleLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={meta.titlePlaceholder}
              className="w-full h-11 px-4 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-1.5">
              {meta.descLabel}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={meta.descPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors resize-none"
            />
          </div>

          {/* Context Role, Date & Lifecycle Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate mb-1.5">
                {meta.roleLabel}
              </label>
              <input
                type="text"
                value={contextRole}
                onChange={(e) => setContextRole(e.target.value)}
                placeholder={meta.rolePlaceholder}
                className="w-full h-11 px-4 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate mb-1.5">
                {meta.dateLabel}
              </label>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors cursor-pointer capitalize"
              >
                {(STATUS_OPTIONS[category] || STATUS_OPTIONS.work).map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-ink bg-ink text-paper"
                        : "border-hairline bg-paper hover:border-ink/30 text-ink-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-[13px] font-semibold block">{opt.label}</span>
                      <span className={`text-[11px] block ${isSelected ? "text-paper/80" : "text-slate"}`}>
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skills (Multi-Value Tags) */}
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-1.5">
              Skills (Multiple values supported)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {skills.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-paper text-ink-900 border border-hairline shadow-2xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(tag)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill and press Enter or comma (e.g. Next.js, Figma, Patient Counseling)"
                className="flex-1 h-10 px-3.5 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink transition-colors"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 h-10 rounded-xl bg-paper-dim hover:bg-hairline text-ink-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Add Skill
              </button>
            </div>
          </div>

          {/* Evidence & Proof Section */}
          <div>
            <label className="block text-[13px] font-semibold text-slate mb-1.5">
              Evidence & Proof Attachments
            </label>
            {evidenceLinks.length > 0 && (
              <ul className="space-y-2 mb-3">
                {evidenceLinks.map((ev, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-paper border border-hairline text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-ink-900 block truncate">{ev.label}</span>
                        <a
                          href={mediaUrl(ev.url) || ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate block"
                        >
                          {ev.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-paper-dim text-slate capitalize">
                        {ev.type || "link"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}
                        className="p-1 rounded text-slate hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Proof Title (e.g. GitHub Repo, Certificate PDF, TMDA License)"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="sm:col-span-4 h-10 px-3 rounded-xl border border-hairline bg-paper text-xs"
              />
              <input
                type="url"
                placeholder="Link URL (e.g. https://github.com/...)"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="sm:col-span-5 h-10 px-3 rounded-xl border border-hairline bg-paper text-xs"
              />
              <button
                type="button"
                onClick={handleAddEvidenceLink}
                className="sm:col-span-3 h-10 px-3 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-hairline bg-paper text-xs font-semibold text-ink-800 hover:bg-paper-dim cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Paperclip className="w-4 h-4 text-slate" />
                )}
                Upload File Evidence (PDF, Image, Docs)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        {/* Step 4: Dynamic Attributes (ONLY shown for relevant template) */}
        {activeFields.length > 0 && (
          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {activeTemplateDef?.label || "Domain"} Dynamic Attributes
              </h3>
              <span className="text-xs text-slate">Tailored to this specific domain</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeFields.map((f) => {
                const val = dynamicAttrs[f.key];
                const inputId = `dyn-${f.key}`;

                if (f.type === "textarea") {
                  return (
                    <div key={f.key} className="sm:col-span-2">
                      <label htmlFor={inputId} className="block text-xs font-semibold text-slate mb-1">
                        {f.label}
                      </label>
                      <textarea
                        id={inputId}
                        rows={2}
                        value={(val as string) || ""}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                        placeholder={f.placeholder || ""}
                        className="w-full px-3 py-2 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink resize-none"
                      />
                    </div>
                  );
                }

                if (f.type === "number") {
                  return (
                    <div key={f.key}>
                      <label htmlFor={inputId} className="block text-xs font-semibold text-slate mb-1">
                        {f.label}
                      </label>
                      <input
                        id={inputId}
                        type="number"
                        min={0}
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) => setAttr(f.key, e.target.value === "" ? null : Number(e.target.value))}
                        placeholder={f.placeholder || "0"}
                        className="w-full h-10 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                      />
                    </div>
                  );
                }

                if (f.type === "list") {
                  const listVal = Array.isArray(val) ? val.join(", ") : (val as string) || "";
                  return (
                    <div key={f.key}>
                      <label htmlFor={inputId} className="block text-xs font-semibold text-slate mb-1">
                        {f.label} <span className="text-[11px] text-slate/70">(comma-separated)</span>
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        value={listVal}
                        onChange={(e) => {
                          const parts = e.target.value.split(",").map((s) => s.trimStart());
                          setAttr(f.key, parts);
                        }}
                        onBlur={(e) => {
                          const clean = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setAttr(f.key, clean);
                        }}
                        placeholder={f.placeholder || "Item 1, Item 2, Item 3"}
                        className="w-full h-10 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                      />
                    </div>
                  );
                }

                return (
                  <div key={f.key}>
                    <label htmlFor={inputId} className="block text-xs font-semibold text-slate mb-1">
                      {f.label}
                    </label>
                    <input
                      id={inputId}
                      type={f.type === "url" ? "url" : "text"}
                      value={(val as string) || ""}
                      onChange={(e) => setAttr(f.key, e.target.value)}
                      placeholder={f.placeholder || ""}
                      className="w-full h-10 px-3 rounded-xl border border-hairline bg-paper text-sm text-ink-900 focus:outline-none focus:border-ink"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Custom Attributes (Users can add what isn't in template) */}
        <div className="p-5 rounded-2xl border border-hairline bg-paper space-y-4">
          <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">
                Custom Attributes
              </h3>
              <p className="text-xs text-slate mt-0.5">
                Add any extra details, metrics, or custom metadata
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCustomAttr}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper-dim hover:bg-hairline text-ink-900 font-semibold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Attribute
            </button>
          </div>

          {customAttrs.length === 0 ? (
            <p className="text-xs text-slate italic py-1">
              No custom attributes yet. Click &quot;Add Attribute&quot; to add your own fields.
            </p>
          ) : (
            <div className="space-y-2.5">
              {customAttrs.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Field Name (e.g. License #, Team Lead, Client Rating)"
                    value={attr.label}
                    onChange={(e) => handleUpdateCustomAttr(idx, "label", e.target.value)}
                    className="w-1/3 h-10 px-3 rounded-xl border border-hairline bg-paper text-xs text-ink-900"
                  />
                  <input
                    type="text"
                    placeholder="Value (can be comma-separated for multiple values)"
                    value={attr.value}
                    onChange={(e) => handleUpdateCustomAttr(idx, "value", e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-hairline bg-paper text-xs text-ink-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomAttr(idx)}
                    className="p-2 text-slate hover:text-red-500 cursor-pointer"
                    aria-label="Remove attribute"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions (Natural flow at the end of the form, preventing buttons from floating over files/fields) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-hairline mt-6 pb-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 h-12 sm:h-11 rounded-xl border border-hairline bg-paper hover:bg-paper-dim text-sm font-semibold text-ink-800 transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full sm:w-auto px-8 h-12 sm:h-11 rounded-xl bg-ink text-paper font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialWork ? "Save Changes" : meta.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
