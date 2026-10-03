import type { Metadata } from "next";
import { FieldLanding } from "@/components/landing/FieldLanding";

// A trial of the scroll-driven landing page. The real landing page (/) is unchanged.
export const metadata: Metadata = {
  title: "Home Proofolio — Build. Prove. Connect.",
  robots: { index: false, follow: false },
};

export default function LandingTest() {
  return <FieldLanding />;
}
