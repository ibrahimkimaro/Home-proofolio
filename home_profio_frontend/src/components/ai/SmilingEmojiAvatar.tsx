"use client";

import { motion } from "motion/react";

export type EmojiMood = "smiling" | "listening" | "thinking" | "celebrating";

export function SmilingEmojiAvatar({
  mood = "smiling",
  size = "md",
}: {
  mood?: EmojiMood;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "w-8 h-8 text-lg",
    md: "w-11 h-11 text-2xl",
    lg: "w-16 h-16 text-4xl",
  };

  const getEmoji = () => {
    switch (mood) {
      case "listening":
        return "😌";
      case "thinking":
        return "🤔";
      case "celebrating":
        return "✨";
      case "smiling":
      default:
        return "😊";
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer ambient pulsing glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/30 via-sky-400/30 to-purple-400/30 blur-md pointer-events-none`}
      />

      {/* Smiling Avatar Body */}
      <motion.div
        initial={{ scale: 0.8, rotate: -5 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.12, rotate: 5 }}
        className={`relative flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-b from-amber-200/20 via-sky-500/10 to-indigo-500/20 shadow-lg backdrop-blur-md select-none ${sizeMap[size]}`}
      >
        <motion.span
          animate={
            mood === "smiling"
              ? {
                  y: [0, -2, 0],
                  scale: [1, 1.05, 1],
                }
              : mood === "listening"
              ? {
                  rotate: [-3, 3, -3],
                }
              : {
                  scale: [1, 1.08, 1],
                }
          }
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="filter drop-shadow-sm"
        >
          {getEmoji()}
        </motion.span>

        {/* Happy Sparkle Badge on top right */}
        {mood === "smiling" && (
          <motion.span
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 1, 0.8],
            }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-amber-950 font-bold shadow-xs"
          >
            ✦
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
