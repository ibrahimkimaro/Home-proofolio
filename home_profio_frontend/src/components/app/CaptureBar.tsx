"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Link2, ImageIcon, Paperclip, X, Lock, Loader2, ArrowUp } from "lucide-react";
import { createWork, uploadFile, type EvidenceLink, type Work } from "@/lib/api";
import { guessEvidenceType } from "@/lib/items";

export type CaptureHandle = { focus: () => void };

/** One box: type a sentence, attach a link/photo/file, keep it. Private by default. */
export const CaptureBar = forwardRef<CaptureHandle, { onCaptured: (w: Work) => void }>(function CaptureBar(
  { onCaptured },
  ref,
) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<EvidenceLink[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textRef.current?.focus();
      textRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }));

  const canSave = (text.trim() || attachments.length > 0) && !busy;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy("upload");
    try {
      const up = await uploadFile(file);
      setAttachments((a) => [...a, { label: up.name, url: up.url, type: guessEvidenceType(up.url, up.content_type), visibility: "public" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  function addLink() {
    const url = link.trim();
    if (!url) return setLinkOpen(false);
    const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      const host = new URL(full).hostname.replace(/^www\./, "");
      setAttachments((a) => [...a, { label: host, url: full, type: guessEvidenceType(full), visibility: "public" }]);
      setLink("");
      setLinkOpen(false);
    } catch {
      setError("That doesn't look like a link");
    }
  }

  async function save() {
    if (!canSave) return;
    setError(null);
    setBusy("save");
    const body = text.trim();
    const firstLine = body.split("\n")[0];
    const title = (firstLine || attachments[0]?.label || "Untitled").slice(0, 200);
    try {
      const work = await createWork({
        title,
        description: body.length > title.length ? body : null,
        work_type: "capture",
        status: "captured",
        visibility: "private",
        skills: [],
        custom_attributes: {},
        evidence_links: attachments,
      });
      setText("");
      setAttachments([]);
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
      onCaptured(work);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-slate transition-colors hover:bg-paper-dim hover:text-ink-800 disabled:opacity-40 cursor-pointer";

  return (
    <div
      className={`rounded-2xl border bg-paper p-2 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.12)] transition-colors focus-within:border-ink/30 ${
        flash ? "border-ink" : "border-hairline/80"
      }`}
    >
      <label htmlFor="capture" className="sr-only">
        Capture something
      </label>
      <textarea
        id="capture"
        ref={textRef}
        value={text}
        rows={2}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
        placeholder="What did you do, learn or solve today?"
        className="block w-full resize-none bg-transparent px-4 pt-3 text-[17px] leading-relaxed text-ink-800 outline-none placeholder:text-slate/70"
      />

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pt-2">
          {attachments.map((a, i) => (
            <li key={a.url} className="flex max-w-[16rem] items-center gap-1.5 rounded-md bg-paper-dim py-1 pl-3 pr-1 text-[13px]">
              <span className="truncate">{a.label}</span>
              <button
                type="button"
                aria-label={`Remove ${a.label}`}
                onClick={() => setAttachments((all) => all.filter((_, j) => j !== i))}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate hover:bg-hairline cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {linkOpen && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <input
            autoFocus
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="Paste a link"
            className="h-9 flex-1 rounded-lg bg-paper-dim px-4 text-[14px] outline-none"
          />
          <button type="button" onClick={addLink} className="text-[14px] font-semibold cursor-pointer">
            Add
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 px-1 pb-1 pt-2">
        <button type="button" className={iconBtn} onClick={() => setLinkOpen((o) => !o)} aria-label="Attach link" title="Link">
          <Link2 className="h-[18px] w-[18px]" />
        </button>
        <button type="button" className={iconBtn} onClick={() => photoRef.current?.click()} disabled={!!busy} aria-label="Attach photo" title="Photo">
          <ImageIcon className="h-[18px] w-[18px]" />
        </button>
        <button type="button" className={iconBtn} onClick={() => fileRef.current?.click()} disabled={!!busy} aria-label="Attach file" title="File">
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />

        <span className="ml-2 flex items-center gap-1 text-[12px] text-slate">
          {busy === "upload" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading
            </>
          ) : flash ? (
            <span className="text-ink-800">Kept privately</span>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Only you
            </>
          )}
        </span>

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          aria-label="Keep it"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-paper transition-all disabled:bg-hairline disabled:text-slate cursor-pointer"
        >
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {error && <p className="px-4 pb-2 text-[13px] text-berry">{error}</p>}
    </div>
  );
});
