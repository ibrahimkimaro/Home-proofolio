"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, QrCode, Share2, X } from "lucide-react";

type QRCodeCtor = new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
declare global {
  interface Window {
    QRCode?: QRCodeCtor & { CorrectLevel: Record<"L" | "M" | "Q" | "H", number> };
  }
}

// The card is drawn on a canvas so the preview and the downloaded image are the same picture.
const W = 1080;
const H = 1350;
const C = { paper: "#fbfbfd", ink: "#1d1d1f", slate: "#6e6e73", hairline: "#d2d2d7", brass: "#c9a227", emerald: "#10b981" };

let qrLib: Promise<void> | null = null;
function loadQr(): Promise<void> {
  // Vendored qrcodejs (public/vendor), loaded only when someone opens a share card.
  qrLib ??= new Promise((resolve, reject) => {
    if (window.QRCode) return resolve();
    const s = Object.assign(document.createElement("script"), { src: "/vendor/qrcode.min.js", async: true });
    s.onload = () => resolve();
    s.onerror = () => {
      qrLib = null;
      reject(new Error("QR code library failed to load"));
    };
    document.head.appendChild(s);
  });
  return qrLib;
}

async function qrCanvas(text: string, size: number): Promise<HTMLCanvasElement> {
  await loadQr();
  const box = document.createElement("div");
  new window.QRCode!(box, { text, width: size, height: size, colorDark: C.ink, colorLight: "#ffffff", correctLevel: window.QRCode!.CorrectLevel.M });
  const canvas = box.querySelector("canvas");
  if (!canvas) throw new Error("This browser can't draw the QR code");
  return canvas;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1]).width > maxWidth - 40) lines[maxLines - 1] += "…";
  return lines;
}

export interface ShareCardData {
  name: string;
  username: string;
  headline?: string | null;
  verified: boolean;
  works: number;
  proofs: number;
}

async function drawCard(canvas: HTMLCanvasElement, d: ShareCardData, url: string) {
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.brass;
  ctx.fillRect(0, 0, W, 14);

  // Monogram
  const initials = d.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(150, 190, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.font = `600 54px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, 150, 192);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Verified seal
  if (d.verified) {
    ctx.fillStyle = C.emerald;
    ctx.beginPath();
    ctx.arc(W - 150, 190, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(W - 175, 192);
    ctx.lineTo(W - 156, 211);
    ctx.lineTo(W - 122, 170);
    ctx.stroke();
    ctx.fillStyle = C.slate;
    ctx.font = `600 28px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText("Verified", W - 150, 290);
    ctx.textAlign = "left";
  }

  // Name and handle
  ctx.fillStyle = C.ink;
  ctx.font = `700 92px ${font}`;
  const nameLines = wrap(ctx, d.name, W - 160, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, 80, 400 + i * 104));
  let y = 400 + (nameLines.length - 1) * 104 + 70;
  ctx.fillStyle = C.slate;
  ctx.font = `500 40px ${font}`;
  ctx.fillText(`@${d.username}`, 80, y);

  if (d.headline) {
    y += 90;
    ctx.fillStyle = C.ink;
    ctx.font = `400 46px ${font}`;
    wrap(ctx, d.headline, W - 160, 3).forEach((l, i) => ctx.fillText(l, 80, y + i * 62));
  }

  // Record lines + counts
  ctx.fillStyle = C.hairline;
  ctx.fillRect(80, 860, W - 160, 2);
  ctx.fillStyle = C.ink;
  ctx.font = `700 64px ${font}`;
  ctx.fillText(String(d.works), 80, 960);
  const worksW = ctx.measureText(String(d.works)).width;
  ctx.fillText(String(d.proofs), 420, 960);
  const proofsW = ctx.measureText(String(d.proofs)).width;
  ctx.fillStyle = C.slate;
  ctx.font = `500 36px ${font}`;
  ctx.fillText(d.works === 1 ? "work" : "works", 80 + worksW + 16, 958);
  ctx.fillText(d.proofs === 1 ? "proof" : "proofs", 420 + proofsW + 16, 958);

  // QR to the public profile
  const qr = await qrCanvas(url, 280);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(W - 80 - 300, H - 80 - 300, 300, 300);
  ctx.drawImage(qr, W - 80 - 290, H - 80 - 290, 280, 280);

  ctx.fillStyle = C.ink;
  ctx.font = `700 40px ${font}`;
  ctx.fillText("Home Proofolio", 80, H - 170);
  ctx.fillStyle = C.slate;
  ctx.font = `400 32px ${font}`;
  ctx.fillText("Scan to see my work and proof", 80, H - 118);
}

function download(canvas: HTMLCanvasElement, name: string) {
  const a = Object.assign(document.createElement("a"), { href: canvas.toDataURL("image/png"), download: name });
  a.click();
}

/** "Share card" button and dialog: a downloadable proof card with a QR code to the public profile. */
export function ShareCardButton({
  data,
  isPublic = true,
  className,
}: {
  data: ShareCardData;
  /** False when the profile is private: scanning would lead nowhere, so say so. */
  isPublic?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotionConfig();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open || !canvas.current) return;
    const link = `${window.location.origin}/u/${data.username}`;
    let live = true;
    drawCard(canvas.current, data, link)
      .then(() => {
        if (!live) return;
        setUrl(link);
        setReady(true);
        setError(null);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't draw the card"));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      live = false;
      window.removeEventListener("keydown", esc);
    };
  }, [open, data]);

  async function share() {
    if (!canvas.current) return;
    const blob = await new Promise<Blob | null>((r) => canvas.current!.toBlob(r, "image/png"));
    const file = blob ? new File([blob], `${data.username}-proofolio.png`, { type: "image/png" }) : null;
    const text = `See my work and proof on Home Proofolio`;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text, url });
      else if (navigator.share) await navigator.share({ title: data.name, text, url });
      else download(canvas.current, `${data.username}-proofolio.png`);
    } catch {
      // The person closed the share sheet.
    }
  }

  async function downloadQr() {
    const qr = await qrCanvas(url, 1024).catch(() => null);
    if (qr) download(qr, `${data.username}-qr.png`);
  }

  const action = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-paper px-4 text-[14px] font-semibold text-ink-800 transition-colors hover:border-ink/40 disabled:opacity-50";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <QrCode className="h-4 w-4" />
        Share card
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-card-title"
              className="relative w-full max-w-[26rem] rounded-[28px] border border-hairline bg-paper p-5 shadow-2xl sm:p-6"
              initial={{ y: reduce ? 0 : 30, scale: reduce ? 1 : 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: reduce ? 0 : 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="share-card-title" className="text-[18px] font-semibold text-ink">Your share card</h2>
                  <p className="text-[13px] text-slate">Post it, print it or send it. The QR code opens your profile.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate hover:bg-paper-dim">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              {!isPublic && (
                <p role="alert" className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-ink-700">
                  Your profile is private, so people who scan this won&apos;t see it. Make it public in Settings, Privacy.
                </p>
              )}

              <div className="relative overflow-hidden rounded-2xl border border-hairline bg-paper-dim">
                <canvas
                  ref={canvas}
                  role="img"
                  aria-label={`Share card for ${data.name}, @${data.username}${data.verified ? ", verified" : ""}, ${data.works} works, ${data.proofs} proofs, with a QR code to their profile`}
                  className="block h-auto w-full"
                />
                {!ready && !error && <div className="shimmer-skeleton absolute inset-0" />}
              </div>
              {error && <p className="mt-2 text-[13px] text-berry">{error}</p>}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={!ready} onClick={share} className={`${action} col-span-2 !border-ink !bg-ink !text-paper`}>
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button type="button" disabled={!ready} onClick={() => canvas.current && download(canvas.current, `${data.username}-proofolio.png`)} className={action}>
                  <Download className="h-4 w-4" /> Image
                </button>
                <button type="button" disabled={!ready} onClick={downloadQr} className={action}>
                  <QrCode className="h-4 w-4" /> QR only
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`See my work and proof on Home Proofolio: ${url}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={action}
                >
                  WhatsApp
                </a>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className={action}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
