"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { Check, Copy, Download, Eraser, Link2Off, X } from "lucide-react";
import { CV_WIDTH_MM } from "@/components/cv/CvDocument";

const MM_TO_PX = 96 / 25.4;

/** Shows the A4 CV scaled down to the available width (it is laid out in millimetres). */
export function ScaledCv({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / (CV_WIDTH_MM * MM_TO_PX));
      setScale(s);
      setHeight(inner.current.offsetHeight * s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full overflow-hidden" style={{ height }}>
      <div ref={inner} className="origin-top-left shadow-2xl" style={{ transform: `scale(${scale})`, width: `${CV_WIDTH_MM}mm` }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Print only the CV (the browser's "Save as PDF" makes the PDF): a hidden iframe gets the page's
 * styles and the CV's markup, so app chrome never ends up on paper and pages break cleanly.
 */
export function printCv(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("\n");
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}
    <style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}.cv-unsigned{display:none}</style>
    </head><body>${el.outerHTML}</body></html>`);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  // Wait for the photo / signature images so they make it onto the PDF.
  const imgs = [...doc.images];
  Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r)))))).then(() => setTimeout(go, 150));
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-hairline bg-paper p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DialogHeader({ title, hint, onClose }: { title: string; hint?: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        {hint && <p className="mt-0.5 text-[12px] text-slate">{hint}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Draw a signature with a finger, pen or mouse. Saved as a trimmed transparent PNG. */
export function SignatureDialog({ open, name, onClose, onSave }: {
  open: boolean;
  name: string;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh, crisp canvas each time the dialog opens (sized for the screen's pixel density).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const c = canvas.current;
      if (!c) return;
      const ratio = window.devicePixelRatio || 1;
      c.width = c.clientWidth * ratio;
      c.height = c.clientHeight * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#111";
      setEmpty(true);
      setError(null);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    setEmpty(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = canvas.current!.getContext("2d")!;
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const save = async () => {
    const png = trimmed(canvas.current!);
    if (!png) return setError("Draw your signature first.");
    setSaving(true);
    setError(null);
    try {
      await onSave(png);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} label="Sign your CV">
      <DialogHeader title="Sign your CV" hint="Your CV becomes valid once you sign it. Draw your signature below." onClose={onClose} />
      <div className="relative rounded-2xl border border-hairline bg-white">
        <canvas
          ref={canvas}
          className="h-44 w-full touch-none cursor-crosshair rounded-2xl"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-t border-dashed border-neutral-300" />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] uppercase tracking-widest text-neutral-400">{name}</p>
      </div>
      {error && <p className="mt-2 text-[12px] font-semibold text-berry">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-hairline px-4 text-sm font-semibold text-ink-700 hover:bg-paper-dim disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" /> Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={empty || saving}
          className="h-11 flex-1 cursor-pointer rounded-xl bg-ink text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save signature"}
        </button>
      </div>
    </Modal>
  );
}

/** The drawing cropped to its strokes (plus a little padding); null when nothing was drawn. */
function trimmed(c: HTMLCanvasElement): string | null {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  const pad = 8;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  const w = Math.min(width, right + pad) - left;
  const h = Math.min(height, bottom + pad) - top;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(c, left, top, w, h, 0, 0, w, h);
  return out.toDataURL("image/png");
}

/** The share link as a QR code (opens with a soft spring), plus copy link / save QR / stop sharing. */
export function ShareQrDialog({ open, url, name, onClose, onStopSharing }: {
  open: boolean;
  url: string | null;
  name: string;
  onClose: () => void;
  onStopSharing: () => Promise<void>;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !url) return;
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: 560, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
      .then((d) => live && setQr(d))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [open, url]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <Modal open={open} onClose={onClose} label="Share your CV">
      <DialogHeader title="Share your CV" hint="Anyone who scans this code or opens the link sees your signed CV." onClose={onClose} />
      <div className="flex justify-center">
        <motion.div
          key={qr ?? "loading"}
          initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.08 }}
          className="rounded-2xl border border-hairline bg-white p-3"
        >
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URL
            <img src={qr} alt="QR code for your CV" className="h-56 w-56" />
          ) : (
            <div className="h-56 w-56 animate-pulse rounded-xl bg-neutral-100" />
          )}
        </motion.div>
      </div>
      {url && <p className="mt-3 break-all text-center text-[11px] text-slate">{url}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-paper hover:opacity-90">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={qr ?? undefined}
          download={`CV-${name.replace(/\s+/g, "-")}-QR.png`}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-hairline text-sm font-semibold text-ink-700 hover:bg-paper-dim ${qr ? "" : "pointer-events-none opacity-40"}`}
        >
          <Download className="h-4 w-4" /> Save QR
        </a>
      </div>
      <button
        type="button"
        onClick={async () => {
          await onStopSharing();
          onClose();
        }}
        className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 text-[12px] font-semibold text-berry hover:underline"
      >
        <Link2Off className="h-3.5 w-3.5" /> Stop sharing (the link and QR code stop working)
      </button>
    </Modal>
  );
}
