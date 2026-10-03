"use client";

import { useEffect, useState } from "react";
import {
  AtSign,
  CalendarDays,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  Phone,
  Presentation,
  X,
} from "lucide-react";
import { chatAttachmentUrl, fetchContactInfo, mediaUrl, type ChatAttachment, type ContactInfo, type SharedFile } from "@/lib/api";

const isImage = (type: string) => type.startsWith("image/");

export function formatBytes(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** A member's real profile picture, falling back to their initial when there is none (or it fails to load). */
export function UserAvatar({
  name,
  src,
  className = "w-10 h-10 rounded-2xl text-sm",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const url = mediaUrl(src ?? null);
  const [failed, setFailed] = useState<string | null>(null);
  if (url && failed !== url) {
    // eslint-disable-next-line @next/next/no-img-element -- signed, private, per-user URLs: not for the image optimizer
    return <img src={url} alt="" onError={() => setFailed(url)} className={`${className} shrink-0 object-cover bg-paper-dim`} />;
  }
  return (
    <span
      aria-hidden
      className={`${className} shrink-0 flex items-center justify-center font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20`}
    >
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  );
}

function DocIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  if (isImage(type)) return <ImageIcon className={className} />;
  if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv") return <FileSpreadsheet className={className} />;
  if (type.includes("presentation") || type.includes("powerpoint")) return <Presentation className={className} />;
  if (type.includes("zip")) return <FileArchive className={className} />;
  if (type === "application/pdf" || type.includes("word") || type === "text/plain") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

const extOf = (filename: string) => (filename.includes(".") ? filename.split(".").pop()!.toUpperCase() : "FILE");

/** A file inside a message bubble: an image preview, or a document card that downloads it. */
export function AttachmentView({ att, mine }: { att: ChatAttachment; mine: boolean }) {
  if (isImage(att.content_type)) {
    return (
      <a href={chatAttachmentUrl(att.name)} target="_blank" rel="noreferrer" className="block -mx-1.5 -mt-1.5 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- private file behind the session cookie */}
        <img
          src={chatAttachmentUrl(att.name)}
          alt={att.filename}
          loading="lazy"
          className="max-h-72 w-full min-w-40 rounded-xl object-cover bg-black/5"
        />
      </a>
    );
  }
  return (
    <a
      href={chatAttachmentUrl(att.name, true)}
      className={`flex items-center gap-3 rounded-xl p-2.5 mb-1 w-60 max-w-full transition-colors ${
        mine ? "bg-white/15 hover:bg-white/25" : "bg-paper-dim hover:bg-hairline/60"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mine ? "bg-white/20" : "bg-paper text-emerald-600"}`}>
        <DocIcon type={att.content_type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{att.filename}</span>
        <span className={`block text-[11px] ${mine ? "text-emerald-100" : "text-slate"}`}>
          {extOf(att.filename)}
          {att.size != null && ` · ${formatBytes(att.size)}`}
        </span>
      </span>
      <Download className="w-4 h-4 shrink-0 opacity-80" />
    </a>
  );
}

/**
 * The 3-dot menu's "Contact info" in a 1:1 chat (like WhatsApp): picture, name, @username,
 * headline and bio, phone (only when they share it), member since, and every file you two exchanged.
 */
export function ContactInfoPanel({ userId, fallbackName, onClose, onOpenProfile, onJumpTo }: {
  userId: string;
  fallbackName: string;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onJumpTo: (messageId: string) => void;
}) {
  const [info, setInfo] = useState<ContactInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"media" | "docs">("media");

  useEffect(() => {
    let live = true;
    fetchContactInfo(userId)
      .then((i) => live && setInfo(i))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load details"));
    return () => {
      live = false;
    };
  }, [userId]);

  const media = info?.files.filter((f) => isImage(f.content_type)) ?? [];
  const docs = info?.files.filter((f) => !isImage(f.content_type)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <aside
        aria-label="Contact info"
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-paper shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 text-slate hover:bg-paper-dim hover:text-ink">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-sm font-bold text-ink-900">Contact info</h3>
        </div>

        {!info ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-slate">
            {error ?? <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center gap-2 border-b border-hairline px-6 py-6 text-center">
              <UserAvatar name={info.name || fallbackName} src={info.avatar} className="h-28 w-28 rounded-full text-4xl" />
              <h4 className="mt-2 text-lg font-bold text-ink-900">{info.name}</h4>
              {info.headline && <p className="text-xs text-slate">{info.headline}</p>}
              <button
                type="button"
                onClick={() => onOpenProfile(info.username)}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-paper-dim"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View full profile
              </button>
            </div>

            <dl className="space-y-3 border-b border-hairline px-5 py-4 text-[13px]">
              {info.bio && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate">About</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-ink-800">{info.bio}</dd>
                </div>
              )}
              <Detail icon={AtSign} label="Username" value={`@${info.username}`} />
              {info.phone && <Detail icon={Phone} label="Phone" value={info.phone} href={`tel:${info.phone}`} />}
              {info.joined_at && (
                <Detail
                  icon={CalendarDays}
                  label="Member since"
                  value={new Date(info.joined_at).toLocaleDateString([], { month: "long", year: "numeric" })}
                />
              )}
            </dl>

            <section className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-[11px] font-bold uppercase tracking-wide text-slate">Shared files · {info.files.length}</h5>
                <div className="flex rounded-lg bg-paper-dim p-0.5 text-[11px] font-semibold">
                  {(["media", "docs"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`cursor-pointer rounded-md px-2.5 py-1 ${tab === t ? "bg-paper text-ink shadow-2xs" : "text-slate"}`}
                    >
                      {t === "media" ? `Photos ${media.length}` : `Documents ${docs.length}`}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "media" ? (
                media.length ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {media.map((f) => (
                      <a key={f.message_id} href={chatAttachmentUrl(f.name)} target="_blank" rel="noreferrer" title={`${f.filename} · ${who(f)}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- private file behind the session cookie */}
                        <img src={chatAttachmentUrl(f.name)} alt={f.filename} loading="lazy" className="aspect-square w-full rounded-lg object-cover bg-paper-dim" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <Empty text="No photos shared yet." />
                )
              ) : docs.length ? (
                <ul className="space-y-1.5">
                  {docs.map((f) => (
                    <li key={f.message_id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-paper-dim">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <DocIcon type={f.content_type} className="h-4 w-4" />
                      </span>
                      <button type="button" onClick={() => onJumpTo(f.message_id)} className="min-w-0 flex-1 cursor-pointer text-left" title="Show in chat">
                        <span className="block truncate text-[13px] font-semibold text-ink-900">{f.filename}</span>
                        <span className="block text-[11px] text-slate">
                          {who(f)} · {new Date(f.sent_at).toLocaleDateString([], { day: "numeric", month: "short" })}
                          {f.size != null && ` · ${formatBytes(f.size)}`}
                        </span>
                      </button>
                      <a href={chatAttachmentUrl(f.name, true)} aria-label={`Download ${f.filename}`} className="rounded-lg p-1.5 text-slate hover:bg-paper hover:text-ink">
                        <Download className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="No documents shared yet." />
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

const who = (f: SharedFile) => (f.mine ? "Sent by you" : `From ${f.author_name}`);

function Detail({ icon: Icon, label, value, href }: { icon: typeof Phone; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate" />
      <div className="min-w-0">
        <dt className="text-[11px] text-slate">{label}</dt>
        <dd className="truncate font-medium text-ink-900">{href ? <a href={href} className="hover:underline">{value}</a> : value}</dd>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-paper-dim py-6 text-center text-[12px] text-slate">{text}</p>;
}
