import { Metadata } from "next";
import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";

export const metadata: Metadata = {
  title: "Terms of Service | Home Proofolio",
  description:
    "Review the terms, conditions, and guidelines governing the use of the Home Proofolio platform and services.",
};

export default function TermsPage() {
  return <LegalDocumentViewer slug="terms-of-service" fallbackTitle="Terms of Service" />;
}
