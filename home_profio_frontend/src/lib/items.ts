import type { Work, WorkInput } from "@/lib/api";

/** What a shaped item really is. "capture" = saved but not shaped yet. */
export type Kind = "capture" | "work" | "learning" | "achievement" | "problem";

export const KINDS: { id: Exclude<Kind, "capture">; label: string; hint: string }[] = [
  { id: "work", label: "Work", hint: "Something you built, made or did" },
  { id: "learning", label: "Learning", hint: "An idea or skill you're working on" },
  { id: "achievement", label: "Achievement", hint: "A result, award or certificate" },
  { id: "problem", label: "Problem", hint: "Something that needs solving" },
];

/** Per-kind state lists — mirrors backend app/services/lifecycle.py (PRD Section 7). */
export const LIFECYCLES: Record<Kind, string[]> = {
  capture: ["captured", "archived"],
  work: ["idea", "discovery", "planned", "building", "blocked", "testing", "deployed", "completed", "archived"],
  learning: ["new", "exploring", "learning", "understanding", "testing", "turned_into_project", "archived"],
  achievement: ["achieved", "archived"],
  problem: ["open", "discussing", "solving", "solved", "accepted", "closed", "archived"],
};

const STATE_LABEL: Record<string, string> = {
  captured: "Captured",
  idea: "Idea",
  discovery: "Discovery",
  planned: "Planned",
  building: "Building",
  blocked: "Blocked",
  testing: "Testing",
  deployed: "Deployed",
  completed: "Completed",
  archived: "Archived",
  new: "New",
  exploring: "Exploring",
  learning: "Learning",
  understanding: "Understanding",
  turned_into_project: "Turned into project",
  achieved: "Achieved",
  open: "Open",
  discussing: "Discussing",
  solving: "Solving",
  solved: "Solved",
  accepted: "Accepted",
  closed: "Closed",
};

export const stateLabel = (s: string) => STATE_LABEL[s] ?? s;

export const EVIDENCE_TYPES: { id: string; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "image", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "document", label: "Document" },
  { id: "certificate", label: "Certificate" },
  { id: "repository", label: "Repository" },
  { id: "deployment", label: "Live site" },
  { id: "test_results", label: "Test results" },
  { id: "diagram", label: "Diagram" },
  { id: "research", label: "Research file" },
  { id: "match_footage", label: "Match footage" },
  { id: "design_file", label: "Design file" },
  { id: "business_document", label: "Business document" },
];

/** Guess a sensible evidence type from a URL or file; the member can change it. */
export function guessEvidenceType(url: string, contentType?: string): string {
  if (contentType?.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "document";
  if (/github\.com|gitlab\.com|bitbucket\.org/i.test(url)) return "repository";
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return "video";
  if (/figma\.com|behance\.net|dribbble\.com/i.test(url)) return "design_file";
  if (/vercel\.app|netlify\.app|herokuapp\.com/i.test(url)) return "deployment";
  return "link";
}

export function kindOf(w: Pick<Work, "work_type">): Kind {
  return (w.work_type in LIFECYCLES ? w.work_type : "work") as Kind;
}

export const kindLabel = (k: Kind) => (k === "capture" ? "Not shaped yet" : KINDS.find((x) => x.id === k)!.label);

export const isPublic = (w: Work) => w.visibility === "public";

export function toInput(w: Work): WorkInput {
  return {
    title: w.title,
    description: w.description,
    context_role: w.context_role,
    occurred_on: w.occurred_on,
    work_type: w.work_type,
    status: w.status,
    template: w.template ?? null,
    visibility: w.visibility,
    skills: w.skills,
    custom_attributes: w.custom_attributes,
    evidence_links: w.evidence_links,
  };
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function formatMonth(iso: string | null) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: "short", year: "numeric" });
}
