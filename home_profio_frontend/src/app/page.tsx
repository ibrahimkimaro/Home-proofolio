import { FieldLanding } from "@/components/landing/FieldLanding";
import { SupportAssistant } from "@/components/landing/SupportAssistant";
import { WelcomeMediaExperience } from "@/components/landing/WelcomeMediaExperience";

// Default scroll-driven landing page
export default function Home() {
  return (
    <>
      <WelcomeMediaExperience />
      <FieldLanding />
      <SupportAssistant />
    </>
  );
}

