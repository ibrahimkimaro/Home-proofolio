"use client";

import { useEffect, useRef } from "react";

const WELCOME_AUDIO = "/audios/welcome%20_landing_page.mp3";
const WELCOME_VIDEO = "/audios/welcming_video_landing%20page.mp4";
const TARGET_VOLUME = 0.3;

export function WelcomeMediaExperience() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Check if welcome audio already played in this browser session
    const alreadyPlayed = typeof window !== "undefined" && sessionStorage.getItem("hp_welcome_voice_played");
    if (alreadyPlayed) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = TARGET_VOLUME;
    audio.loop = false; // Play once and then stop

    const markPlayed = () => {
      try {
        sessionStorage.setItem("hp_welcome_voice_played", "true");
      } catch { }
    };

    audio.addEventListener("ended", markPlayed);

    const attemptPlay = () => {
      audio.play().then(markPlayed).catch(() => {
        // Autoplay policy fallback: unlock and play once on first visitor interaction
        const unlock = () => {
          audio.play().then(markPlayed).catch(() => { });
          window.removeEventListener("click", unlock);
          window.removeEventListener("keydown", unlock);
          window.removeEventListener("pointerdown", unlock);
        };
        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("pointerdown", unlock, { once: true });
      });
    };

    const timer = setTimeout(attemptPlay, 350);
    return () => {
      clearTimeout(timer);
      audio.removeEventListener("ended", markPlayed);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src={WELCOME_AUDIO}
      preload="auto"
    />
  );
}
