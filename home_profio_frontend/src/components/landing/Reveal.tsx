"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fade + slide-up as the element scrolls into view.
 *
 * The only fallback is feature detection: if IntersectionObserver isn't
 * available the content renders visible immediately. We deliberately do NOT
 * use a timer here — a blanket timer would reveal everything a second after
 * load and destroy the scroll-driven effect.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [noObserver, setNoObserver] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") setNoObserver(true);
  }, []);

  const show = inView || noObserver;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
