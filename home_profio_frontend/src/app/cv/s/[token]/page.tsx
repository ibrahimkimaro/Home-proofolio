"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { CvDocument, CvMobile, composeCv, type CvView } from "@/components/cv/CvDocument";
import { ScaledCv, printCv } from "@/components/cv/CvTools";
import { fetchSharedCv } from "@/lib/api";

/** A shared, signed CV (the link / QR code from the owner's CV page). Read-only; no sign-in needed. */
export default function SharedCvPage() {
  const { token } = useParams<{ token: string }>();
  const [cv, setCv] = useState<CvView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedCv(token)
      .then((c) => setCv(composeCv(c)))
      .catch(() => setError("This CV link is not valid. It may have been withdrawn by its owner."));
  }, [token]);

  return (
    <div className="min-h-dvh bg-paper-dim px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-[210mm]">
        {error && <p className="rounded-2xl border border-hairline bg-paper p-6 text-center text-sm text-slate">{error}</p>}
        {cv && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-slate">
                Curriculum vitae of <span className="font-semibold text-ink-900">{cv.name}</span>
                {cv.signedAt && `, signed ${new Date(cv.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
              </p>
              <button
                type="button"
                onClick={() => printCv("cv-shared", `CV - ${cv.name}`)}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-ink px-4 text-[13px] font-semibold text-paper hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
            <div className="sm:hidden">
              <CvMobile cv={cv} />
            </div>
            <div className="hidden sm:block">
              <ScaledCv>
                <CvDocument cv={cv} id="cv-shared" />
              </ScaledCv>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
