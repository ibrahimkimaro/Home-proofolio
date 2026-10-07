import { FieldLanding } from "@/components/landing/FieldLanding";
import { SupportAssistant } from "@/components/landing/SupportAssistant";

// Default scroll-driven landing page
export default function Home() {
  return (
    <>
      <FieldLanding />
      <SupportAssistant />
    </>
  );
}
