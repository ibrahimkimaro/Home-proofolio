"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw, X, Sparkles } from "lucide-react";

const WELCOME_AUDIO = "/audios/welcome_to_Homeproofolio.mp3";
const TARGET_VOLUME = 0.45;

export function WelcomeMediaExperience() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = TARGET_VOLUME;
    audio.loop = false;

    const onPlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    // Instant autoplay on every refresh with zero delay
    let cleanEvents: (() => void) | null = null;

    const playNow = () => {
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {
          // If browser Autoplay policy requires user activation,
          // unlock and play immediately on the first gesture (pointer, click, scroll, touch)
          const unlock = () => {
            audio.play().catch(() => { });
            if (cleanEvents) cleanEvents();
          };
          cleanEvents = () => {
            window.removeEventListener("pointerdown", unlock, true);
            window.removeEventListener("click", unlock, true);
            window.removeEventListener("keydown", unlock, true);
            window.removeEventListener("scroll", unlock, true);
            window.removeEventListener("mousemove", unlock, true);
            window.removeEventListener("touchstart", unlock, true);
          };
          window.addEventListener("pointerdown", unlock, { capture: true, once: true });
          window.addEventListener("click", unlock, { capture: true, once: true });
          window.addEventListener("keydown", unlock, { capture: true, once: true });
          window.addEventListener("scroll", unlock, { capture: true, once: true });
          window.addEventListener("mousemove", unlock, { capture: true, once: true });
          window.addEventListener("touchstart", unlock, { capture: true, once: true });
        });
      }
    };

    // Play immediately on mount without any delay
    playNow();

    return () => {
      if (cleanEvents) cleanEvents();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => { });
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const replay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => { });
  };

  if (!visible) return <audio ref={audioRef} src={WELCOME_AUDIO} autoPlay preload="auto" />;

  return (
    <>
      <audio ref={audioRef} src={WELCOME_AUDIO} autoPlay preload="auto" />

      {/* Floating Welcome Audio Badge in Bottom-Left */}
      <div className="fixed bottom-5 left-5 z-40 hidden sm:flex items-center gap-2 rounded-2xl border border-hairline/80 bg-paper/90 px-3.5 py-2 shadow-xl backdrop-blur-xl transition hover:border-brass/40">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-2 cursor-pointer text-left"
          title={isPlaying ? "Pause welcome message" : "Play welcome message"}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass-dark">
            {isPlaying ? (
              <span className="flex items-center gap-0.5">
                <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-brass-dark" />
                <span className="h-3.5 w-0.5 animate-pulse delay-75 rounded-full bg-brass-dark" />
                <span className="h-2 w-0.5 animate-pulse delay-150 rounded-full bg-brass-dark" />
              </span>
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-brass-dark" />
            )}
          </span>

          <div className="min-w-0 pr-1">
            <p className="text-[11px] font-bold text-ink-800 leading-tight">
              {isPlaying ? "Welcome Audio" : hasStarted ? "Welcome Replay" : "Listen to Welcome"}
            </p>
            <p className="text-[10px] text-slate leading-tight">
              {isPlaying ? "Playing voice intro…" : "HOME PROOFOLIO"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 border-l border-hairline/70 pl-2">
          {isPlaying ? (
            <button
              type="button"
              onClick={toggleMute}
              className="cursor-pointer rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink-800 transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-500" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={replay}
              className="cursor-pointer rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink-800 transition"
              title="Replay from start"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="cursor-pointer rounded-lg p-1 text-slate/60 hover:bg-paper-dim hover:text-ink-800 transition"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

