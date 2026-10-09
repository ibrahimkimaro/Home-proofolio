"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, PenLine, QrCode, Share2 } from "lucide-react";
import { AppShell, useSession } from "@/components/app/AppShell";
import { CvDocument, CvMobile, composeCv } from "@/components/cv/CvDocument";
import { CvEditor } from "@/components/cv/CvEditor";
import { ScaledCv, ShareQrDialog, SignatureDialog, printCv } from "@/components/cv/CvTools";
import { fetchMyCv, removeCvSignature, saveMyCv, shareMyCv, signMyCv, stopSharingCv, type Cv, type CvData } from "@/lib/api";

const SAVE_AFTER_MS = 900;
const PRINT_ID = "cv-document";

/**
 * Side menu > Curriculum Vitae. The CV fills itself from the profile, roles and work (re-read
 * whenever the page comes back into view), the member edits or adds the rest, and signs it.
 * Download (print / Save as PDF), share and the QR code all need a signed CV.
 */
export default function CvPage() {
  const [user] = useSession();
  const [cv, setCv] = useState<Cv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [view, setView] = useState<"preview" | "edit">("preview");
  const [signing, setSigning] = useState<null | "download" | "share" | "qr" | "sign">(null);
  const [qrOpen, setQrOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<CvData | null>(null);

  const load = useCallback(() => {
    if (pending.current) return; // don't overwrite unsaved edits
    fetchMyCv()
      .then(setCv)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your CV"));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, load]);

  const edit = (data: CvData) => {
    setCv((c) => (c ? { ...c, data } : c));
    pending.current = data;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSave = pending.current;
      if (!toSave) return;
      try {
        await saveMyCv(toSave);
        if (pending.current === toSave) pending.current = null;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, SAVE_AFTER_MS);
  };

  const view_ = useMemo(() => (cv ? composeCv(cv) : null), [cv]);
  const shareUrl = cv?.share_token && typeof window !== "undefined" ? `${window.location.origin}/cv/s/${cv.share_token}` : null;

  // Download / share / QR need a valid (signed) CV: ask for the signature first, then carry on.
  const need = (action: "download" | "share" | "qr") => {
    if (!cv?.signature) return setSigning(action);
    run(action);
  };
  const run = async (action: "download" | "share" | "qr" | "sign", current = cv) => {
    if (!current) return;
    if (action === "download") return printCv(PRINT_ID, `CV - ${composeCv(current).name}`);
    if (action === "sign") return;
    let token = current.share_token;
    if (!token) {
      token = (await shareMyCv()).share_token;
      setCv((c) => (c ? { ...c, share_token: token } : c));
    }
    const url = `${window.location.origin}/cv/s/${token}`;
    if (action === "share" && navigator.share) {
      navigator.share({ title: `CV - ${composeCv(current).name}`, url }).catch(() => { });
    } else {
      setQrOpen(true);
    }
  };

  const saveSignature = async (dataUrl: string) => {
    const { signed_at } = await signMyCv(dataUrl);
    const next = cv ? { ...cv, signature: dataUrl, signed_at } : cv;
    setCv(next);
    const after = signing;
    setSigning(null);
    if (after && after !== "sign") setTimeout(() => run(after, next), 300);
  };

  if (!user) return null;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Curriculum Vitae</h1>
            <p className="text-[13px] text-slate">
              Built from your profile, roles and work, and updated as they change.{" "}
              {cv && (cv.signature ? "Signed and valid." : "Sign it to make it valid.")}
              {saveState === "saving" && " Saving…"}
              {saveState === "error" && <span className="text-berry"> Not saved, check your connection.</span>}
            </p>
          </div>
          {cv && (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Action onClick={() => setSigning("sign")} icon={PenLine} label={cv.signature ? "Re-sign" : "Sign CV"} primary={!cv.signature} />
              <Action onClick={() => need("download")} icon={Download} label="Download PDF" primary={!!cv.signature} />
              <Action onClick={() => need("share")} icon={Share2} label="Share" />
              <Action onClick={() => need("qr")} icon={QrCode} label="QR code" />
            </div>
          )}
        </div>

        {error && <p className="rounded-xl border border-berry/30 bg-berry/10 px-3 py-2 text-sm text-berry">{error}</p>}

        {cv && view_ && (
          <>
            <div className="mb-3 grid grid-cols-2 rounded-xl bg-paper-dim p-1 text-[13px] font-semibold lg:hidden">
              {(["preview", "edit"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={`cursor-pointer rounded-lg py-2 ${view === v ? "bg-paper text-ink shadow-2xs" : "text-slate"}`}>
                  {v === "preview" ? "Preview" : "Edit"}
                </button>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <div className={`${view === "edit" ? "" : "hidden"} lg:block`}>
                <CvEditor cv={cv} onChange={edit} />
                {cv.signature && (
                  <button
                    type="button"
                    onClick={async () => {
                      await removeCvSignature();
                      setCv((c) => (c ? { ...c, signature: null, signed_at: null, share_token: null } : c));
                    }}
                    className="mt-3 cursor-pointer text-[12px] font-semibold text-slate hover:text-berry hover:underline"
                  >
                    Remove my signature (also stops sharing)
                  </button>
                )}
              </div>
              <div className={`${view === "preview" ? "" : "hidden"} lg:block`}>
                {/* Phones: the CV reflowed for the screen. The A4 page below stays in the DOM (hidden) for Download PDF. */}
                <div className="sm:hidden">
                  <CvMobile cv={view_} />
                </div>
                <div className="hidden sm:block lg:sticky lg:top-20">
                  <ScaledCv>
                    <CvDocument cv={view_} id={PRINT_ID} />
                  </ScaledCv>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <SignatureDialog
        open={signing !== null}
        name={view_?.name ?? ""}
        onClose={() => setSigning(null)}
        onSave={saveSignature}
      />
      <ShareQrDialog
        open={qrOpen}
        url={shareUrl}
        name={view_?.name ?? "CV"}
        onClose={() => setQrOpen(false)}
        onStopSharing={async () => {
          await stopSharingCv();
          setCv((c) => (c ? { ...c, share_token: null } : c));
        }}
      />
    </AppShell>
  );
}

function Action({ onClick, icon: Icon, label, primary }: { onClick: () => void; icon: typeof Download; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-opacity ${primary ? "bg-ink text-paper hover:opacity-90" : "border border-hairline text-ink-800 hover:bg-paper-dim"
        }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
