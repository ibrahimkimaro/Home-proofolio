"use client";

import { useEffect } from "react";
import { flushOnboarding } from "@/lib/onboarding-pending";

/** Renders nothing: on app load, saves anything a new member chose at sign-up that couldn't be saved at the time. */
export function OnboardingFlush() {
  useEffect(() => {
    flushOnboarding().catch(() => {});
  }, []);
  return null;
}
