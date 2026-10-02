"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * JS animations (motion/react) honour Settings > Appearance > Reduce motion, not only the OS setting.
 * CSS animations are handled in globals.css via [data-motion="reduce"].
 */
export function MotionPrefs({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setReduce(root.dataset.motion === "reduce");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => obs.disconnect();
  }, []);
  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}
