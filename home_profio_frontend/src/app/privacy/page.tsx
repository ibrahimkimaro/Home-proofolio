import { Metadata } from "next";
import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";

export const metadata: Metadata = {
  title: "Privacy Policy | Home Proofolio",
  description:
    "Learn how Home Proofolio collects, protects, and handles your personal information, credentials, and verification data.",
};

export default function PrivacyPage() {
  return <LegalDocumentViewer slug="privacy-policy" fallbackTitle="Privacy Policy" />;
}
