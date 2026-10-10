"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Printer, Shield, FileText, CheckCircle2 } from "lucide-react";
import { fetchPublicLegalDoc, LegalDocument } from "@/lib/api";
import { Footer } from "@/components/landing/Footer";

interface LegalDocumentViewerProps {
  slug: string;
  fallbackTitle: string;
}

export function LegalDocumentViewer({ slug, fallbackTitle }: LegalDocumentViewerProps) {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicLegalDoc(slug)
      .then((data) => {
        if (active) {
          setDoc(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || "Failed to load document");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-stone-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors group text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/home-profolio-logo.jpeg"
                alt="Home Proofolio"
                width={28}
                height={28}
                className="rounded-full object-cover"
              />
              <span className="font-semibold text-stone-800 text-sm hidden sm:inline">
                Home Proofolio
              </span>
            </Link>
            <button
              onClick={handlePrint}
              aria-label="Print Document"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-10 sm:px-6 sm:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-800 animate-spin" />
            <p className="text-sm font-medium">Loading policy details...</p>
          </div>
        ) : error && !doc ? (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-8 text-center">
            <h2 className="text-lg font-semibold text-red-800">Unable to load document</h2>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <article className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-12 shadow-xs">
            {/* Document Header */}
            <header className="border-b border-stone-100 pb-8 mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Official Platform Policy
                </span>
                <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-mono text-stone-600">
                  v{doc?.version || "1.0"}
                </span>
                {doc?.updated_at && (
                  <span className="text-xs text-stone-500">
                    Updated: {new Date(doc.updated_at).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 font-display">
                {doc?.title || fallbackTitle}
              </h1>

              {doc?.summary && (
                <div className="mt-6 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Key Summary</p>
                      <p className="mt-1 text-sm leading-relaxed text-stone-700">{doc.summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </header>

            {/* Document Body */}
            <div className="prose prose-stone max-w-none space-y-6 text-stone-700 text-[15px] sm:text-base leading-relaxed">
              {renderFormattedContent(doc?.content || "")}
            </div>

            {/* Document Footer Navigation */}
            <div className="mt-12 pt-8 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
              <p>Questions about these terms? Contact support at support@homeproofolio.com</p>
              <div className="flex items-center gap-4">
                <Link
                  href={slug === "privacy-policy" ? "/terms" : "/privacy"}
                  className="font-medium text-stone-800 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {slug === "privacy-policy" ? "View Terms of Service" : "View Privacy Policy"}
                </Link>
              </div>
            </div>
          </article>
        )}
      </main>

      <Footer variant="light" />
    </div>
  );
}

/**
 * Clean markdown-like renderer specifically formatted for legal documents,
 * converting headings, bold, bullet points and numbered points into elegant typography.
 */
function renderFormattedContent(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const full = paragraphBuffer.join(" ").trim();
      if (full) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-stone-700 leading-relaxed">
            {renderInlineMarkdown(full)}
          </p>
        );
      }
      paragraphBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Heading 1
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      elements.push(
        <h2 key={`h1-${i}`} className="text-2xl font-bold text-stone-900 mt-8 mb-3">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Heading 2
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h3 key={`h2-${i}`} className="text-xl font-bold text-stone-900 mt-6 mb-2.5">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    // Heading 3
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      elements.push(
        <h4 key={`h3-${i}`} className="text-base font-semibold text-stone-900 mt-5 mb-2">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    // Numbered list item like "1. " or "1) "
    const numMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)/);
    if (numMatch) {
      flushParagraph();
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-3 my-2 pl-2">
          <span className="font-semibold text-amber-700 shrink-0 text-sm mt-0.5">{numMatch[1]}</span>
          <div className="text-stone-700 leading-relaxed">{renderInlineMarkdown(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Bullet list item (bullet, dash, asterisk)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      flushParagraph();
      const content = trimmed.replace(/^[-*•]\s+/, "");
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-3 my-2 pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0 mt-2.5" />
          <div className="text-stone-700 leading-relaxed">{renderInlineMarkdown(content)}</div>
        </div>
      );
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  return elements;
}

function renderInlineMarkdown(text: string) {
  // Bold **text** parser
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
