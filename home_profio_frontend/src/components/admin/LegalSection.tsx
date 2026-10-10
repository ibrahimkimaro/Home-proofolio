"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Save,
  X,
  Shield,
  FileCheck,
} from "lucide-react";
import {
  fetchAdminLegalDocs,
  createAdminLegalDoc,
  updateAdminLegalDoc,
  deleteAdminLegalDoc,
  LegalDocument,
  CreateLegalDocPayload,
} from "@/lib/api";
import { Badge, ConfirmButton, Panel } from "./ui";

const inputClass =
  "w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-[13px] text-ink-800 outline-none focus:border-brass";

export function LegalSection({ onError }: { onError: (m: string) => void }) {
  const [docs, setDocs] = useState<LegalDocument[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LegalDocument | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateLegalDocPayload>({
    slug: "",
    title: "",
    content: "",
    summary: "",
    version: "1.0",
    is_published: true,
  });

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminLegalDocs()
      .then((data) => {
        setDocs(data);
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Failed to load legal documents");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setFormData({
      slug: "",
      title: "",
      content: "",
      summary: "",
      version: "1.0",
      is_published: true,
    });
    setIsCreating(true);
    setEditingDoc(null);
  };

  const startEdit = (doc: LegalDocument) => {
    setFormData({
      slug: doc.slug,
      title: doc.title,
      content: doc.content,
      summary: doc.summary || "",
      version: doc.version,
      is_published: doc.is_published,
    });
    setEditingDoc(doc);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        await updateAdminLegalDoc(editingDoc.id, formData);
      } else {
        await createAdminLegalDoc(formData);
      }
      setEditingDoc(null);
      setIsCreating(false);
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save document");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminLegalDoc(id);
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const togglePublish = async (doc: LegalDocument) => {
    try {
      await updateAdminLegalDoc(doc.id, { is_published: !doc.is_published });
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update document status");
    }
  };

  if (loading && !docs) {
    return <div className="h-64 animate-pulse rounded-2xl bg-paper" />;
  }

  const publishedCount = docs?.filter((d) => d.is_published).length || 0;
  const totalCount = docs?.length || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/10 text-brass">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Total Legal Documents</p>
              <p className="text-xl font-bold text-ink-900">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-paper p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Published & Active</p>
              <p className="text-xl font-bold text-ink-900">{publishedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-paper p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Compliance Status</p>
              <p className="text-xl font-bold text-ink-900">Protected & Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <Panel
        icon={FileText}
        title="Legal & Policies Management"
        subtitle="Manage platform terms of service, privacy policy, and public legal disclosures stored in the database"
        actions={
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-[12px] font-semibold text-paper hover:bg-ink-800 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New Document
          </button>
        }
      >
        <div className="divide-y divide-hairline">
          {docs && docs.length > 0 ? (
            docs.map((doc) => {
              const liveUrl =
                doc.slug === "privacy-policy"
                  ? "/privacy"
                  : doc.slug === "terms-of-service"
                  ? "/terms"
                  : `/legal/${doc.slug}`;

              return (
                <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink-900">{doc.title}</span>
                      <Badge tone={doc.is_published ? "good" : "neutral"}>
                        {doc.is_published ? "Published" : "Draft"}
                      </Badge>
                      <span className="rounded bg-sand/40 px-1.5 py-0.5 text-[11px] font-mono text-slate">
                        v{doc.version}
                      </span>
                      <span className="text-[11px] text-slate font-mono">
                        /{doc.slug}
                      </span>
                    </div>

                    {doc.summary && (
                      <p className="text-[13px] text-slate line-clamp-2 leading-relaxed">
                        {doc.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate">
                      <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                      <span>Length: {doc.content.length} chars</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline px-2.5 text-[12px] font-medium text-slate hover:text-ink-900 hover:border-slate/50 transition-colors"
                      title="View live page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>

                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline px-2.5 text-[12px] font-medium text-slate hover:text-ink-900 hover:border-slate/50 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePublish(doc)}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                        doc.is_published
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                          : "border-hairline text-slate hover:text-ink-900"
                      }`}
                      title={doc.is_published ? "Unpublish document" : "Publish document"}
                    >
                      {doc.is_published ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Publish
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(doc)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline px-2.5 text-[12px] font-semibold text-ink-800 hover:border-brass hover:text-brass transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>

                    <ConfirmButton
                      onConfirm={() => handleDelete(doc.id)}
                      confirmLabel="Delete permanently?"
                      danger
                      className="border-hairline text-slate hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-[13px] text-slate">
              No legal documents found. Click &quot;New Document&quot; above to create one.
            </div>
          )}
        </div>
      </Panel>

      {/* Create / Edit Modal */}
      {(isCreating || editingDoc) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl border border-hairline bg-paper p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brass" />
                <h3 className="text-base font-semibold text-ink-900">
                  {editingDoc ? `Edit: ${editingDoc.title}` : "Create New Legal Document"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setIsCreating(false);
                }}
                className="rounded-lg p-1 text-slate hover:text-ink-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-slate mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Privacy Policy"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
                      })
                    }
                    placeholder="e.g. privacy-policy"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-slate mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.version || "1.0"}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink-900">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded border-hairline text-brass focus:ring-brass h-4 w-4"
                    />
                    Publish live immediately
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate mb-1">
                  Executive Summary (Short overview shown at the top)
                </label>
                <textarea
                  rows={2}
                  value={formData.summary || ""}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Concise highlights of what this legal policy covers..."
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-medium text-slate">
                    Full Content (Markdown supported) *
                  </label>
                  <span className="text-[11px] text-slate font-mono">
                    Use #, ##, ###, and numbered or clean lists
                  </span>
                </div>
                <textarea
                  rows={14}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="# 1. Overview&#10;Write the full legal text here..."
                  className={`${inputClass} font-mono text-[12px] leading-relaxed`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setIsCreating(false);
                  }}
                  className="rounded-lg border border-hairline px-4 py-2 text-[13px] font-medium text-slate hover:text-ink-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brass px-4 py-2 text-[13px] font-semibold text-ink-900 hover:brightness-105 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl border border-hairline bg-paper p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-ink-900">{previewDoc.title}</h3>
                <span className="text-xs text-slate">Version {previewDoc.version} • /{previewDoc.slug}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-slate hover:text-ink-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {previewDoc.summary && (
                <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 text-xs text-amber-900">
                  <span className="font-semibold block mb-0.5">Summary:</span>
                  {previewDoc.summary}
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-xs text-ink-800 leading-relaxed bg-sand/20 p-4 rounded-xl border border-hairline">
                {previewDoc.content}
              </pre>
            </div>

            <div className="pt-4 border-t border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg bg-ink-900 text-paper px-4 py-1.5 text-xs font-medium cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
