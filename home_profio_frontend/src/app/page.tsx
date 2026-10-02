import { CTASection } from "@/components/landing/CTASection";
import { DeskToProofShowcase } from "@/components/landing/DeskToProofShowcase";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { JourneyShowcase } from "@/components/landing/JourneyShowcase";
import { ProofSection } from "@/components/landing/ProofSection";
import { WhoItsFor } from "@/components/landing/WhoItsFor";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <JourneyShowcase />
        <DeskToProofShowcase />
        <WhoItsFor />
        <ProofSection />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
