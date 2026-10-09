"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Lock, Maximize2, Mic, MicOff, Minimize2, Phone, PhoneOff, SwitchCamera, Video, VideoOff, X } from "lucide-react";
import {
  acceptCall,
  canUseMedia,
  dismissCall,
  flipCamera,
  getCall,
  hangUp,
  initCalls,
  subscribeCall,
  toggleCamera,
  toggleMic,
  type CallState,
} from "@/lib/calls";

/** The current call in this tab (null = none). */
export function useCall() {
  return useSyncExternalStore(subscribeCall, getCall, () => null);
}

/**
 * Voice/video calls anywhere in the app: rings for incoming calls, shows the call full screen or
 * as a small floating window (so the member can keep using the app), and plays the remote audio.
 * Mounted once per signed-in layout, next to ChatNotifier.
 */
export function CallOverlay({ userId }: { userId: string }) {
  useEffect(() => initCalls(userId), [userId]);
  const call = useCall();
  const [minimizedId, setMinimizedId] = useState<string | null>(null);

  useTone(call?.phase === "incoming" ? "ring" : call?.phase === "outgoing" && call.ringing ? "ringback" : null);
  useIncomingNotification(call);

  if (!call) return null;
  const missed = call.phase === "ended" && call.role === "callee" && !call.startedAt;

  return (
    <>
      <RemoteAudio stream={call.remote} />
      {call.phase === "incoming" || missed ? (
        <IncomingCard call={call} />
      ) : minimizedId === call.id ? (
        <MiniCall call={call} onExpand={() => setMinimizedId(null)} />
      ) : (
        <CallScreen call={call} onMinimize={() => setMinimizedId(call.id)} />
      )}
    </>
  );
}

// ------------------------------------------------------------------------------------- views

function IncomingCard({ call }: { call: CallState }) {
  const ringing = call.phase === "incoming";
  const insecure = ringing && !canUseMedia();
  return (
    <div
      role="alertdialog"
      aria-label={`Incoming call from ${call.peer.name}`}
      className="fixed inset-x-3 top-3 z-[80] mx-auto max-w-sm rounded-3xl bg-neutral-900 p-4 text-white shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-top-2 fade-in duration-200 sm:left-auto sm:right-5 sm:top-5 sm:mx-0 sm:w-96"
    >
      <div className="flex items-center gap-3">
        <Avatar name={call.peer.name} size="sm" pulse={ringing} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{call.peer.name}</p>
          <p className={`text-[12px] text-white/60 ${ringing ? "truncate" : ""}`}>
            {ringing ? `Incoming ${call.media === "video" ? "video" : "voice"} call` : call.ended}
          </p>
        </div>
        {ringing ? (
          <div className="flex shrink-0 items-center gap-2">
            <RoundButton label="Decline" tone="danger" size="sm" onClick={hangUp}>
              <PhoneOff className="h-5 w-5" />
            </RoundButton>
            <RoundButton label="Accept" tone="accept" size="sm" onClick={acceptCall}>
              {call.media === "video" ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </RoundButton>
          </div>
        ) : (
          <button type="button" onClick={dismissCall} aria-label="Dismiss" className="cursor-pointer rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {insecure && (
        <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-[12px] leading-snug text-amber-200">
          This browser only allows the microphone on secure (https) pages, so this device can&apos;t answer. Open Proofolio
          over https, or answer on another device.
        </p>
      )}
    </div>
  );
}

function CallScreen({ call, onMinimize }: { call: CallState; onMinimize: () => void }) {
  const ended = call.phase === "ended";
  const remoteVideo = showsVideo(call.remote, call.peerCamOn);
  const localVideo = showsVideo(call.local, call.camOn);

  return (
    <div role="dialog" aria-label={`Call with ${call.peer.name}`} className="fixed inset-0 z-[80] flex flex-col bg-neutral-950 text-white">
      <div className="relative flex-1 overflow-hidden">
        {remoteVideo && !ended ? (
          <StreamVideo stream={call.remote} className="absolute inset-0 h-full w-full bg-black object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-radial from-neutral-800 to-neutral-950 px-6 text-center">
            <Avatar name={call.peer.name} size="lg" pulse={call.phase === "outgoing" && call.ringing} />
            <div>
              <p className="text-xl font-semibold">{call.peer.name}</p>
              <p className="mt-1 text-sm text-white/60">
                <Status call={call} />
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className={`min-w-0 ${remoteVideo && !ended ? "" : "invisible"}`}>
            <p className="truncate text-[15px] font-semibold">{call.peer.name}</p>
            <p className="text-[12px] text-white/70">
              <Status call={call} />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!ended && <SecurityBadge call={call} />}
            {!ended && (
              <button type="button" onClick={onMinimize} aria-label="Minimize call" title="Minimize" className="cursor-pointer rounded-xl bg-white/10 p-2 hover:bg-white/20">
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {localVideo && !ended && (
          <StreamVideo
            stream={call.local}
            mirror
            className="absolute bottom-4 right-4 aspect-[3/4] w-28 rounded-2xl bg-neutral-800 object-cover shadow-xl ring-1 ring-white/20 sm:aspect-video sm:w-52"
          />
        )}
        {!call.peerMicOn && call.phase === "active" && (
          <span className="absolute left-4 top-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[12px]">
            <MicOff className="h-3.5 w-3.5" /> {call.peer.name.split(" ")[0]} is muted
          </span>
        )}
        {call.notice && !ended && (
          <p className="absolute inset-x-4 bottom-4 mx-auto max-w-md rounded-xl bg-amber-500/95 px-3 py-2 text-center text-[12px] font-medium text-black sm:right-60">
            {call.notice}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {ended ? (
          <RoundButton label="Close" onClick={dismissCall}>
            <X className="h-6 w-6" />
          </RoundButton>
        ) : (
          <>
            <RoundButton label={call.micOn ? "Mute" : "Unmute"} pressed={!call.micOn} onClick={toggleMic}>
              {call.micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </RoundButton>
            <RoundButton label={call.camOn ? "Turn camera off" : "Turn camera on"} pressed={!call.camOn} onClick={toggleCamera}>
              {call.camOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </RoundButton>
            {call.canFlip && call.camOn && (
              <RoundButton label="Switch camera" onClick={flipCamera}>
                <SwitchCamera className="h-6 w-6" />
              </RoundButton>
            )}
            <RoundButton label={call.phase === "outgoing" ? "Cancel call" : "Hang up"} tone="danger" onClick={hangUp}>
              <PhoneOff className="h-6 w-6" />
            </RoundButton>
          </>
        )}
      </div>
    </div>
  );
}

function MiniCall({ call, onExpand }: { call: CallState; onExpand: () => void }) {
  const ended = call.phase === "ended";
  return (
    <div className="fixed bottom-20 right-3 z-[80] w-60 overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl ring-1 ring-white/10 animate-in fade-in duration-200 md:bottom-5 md:right-5">
      <button type="button" onClick={onExpand} aria-label="Expand call" className="group relative block aspect-video w-full cursor-pointer bg-neutral-800">
        {showsVideo(call.remote, call.peerCamOn) && !ended ? (
          <StreamVideo stream={call.remote} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <Avatar name={call.peer.name} size="sm" />
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 opacity-80 group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{call.peer.name}</p>
          <p className="truncate text-[11px] text-white/60">
            <Status call={call} />
          </p>
        </div>
        {!ended && (
          <>
            <RoundButton label={call.micOn ? "Mute" : "Unmute"} pressed={!call.micOn} size="xs" onClick={toggleMic}>
              {call.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </RoundButton>
            <RoundButton label="Hang up" tone="danger" size="xs" onClick={hangUp}>
              <PhoneOff className="h-4 w-4" />
            </RoundButton>
          </>
        )}
      </div>
    </div>
  );
}

/** Encrypted, how the media travels, latency, and the security code to compare out loud. */
function SecurityBadge({ call }: { call: CallState }) {
  const [open, setOpen] = useState(false);
  const quality = call.rtt == null ? "bg-white/40" : call.rtt < 150 ? "bg-emerald-400" : call.rtt < 300 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-[12px] font-medium hover:bg-white/20"
      >
        <Lock className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Encrypted</span>
        {call.phase === "active" && <span className={`h-2 w-2 rounded-full ${quality}`} />}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-72 rounded-2xl bg-neutral-900 p-4 text-[12px] leading-relaxed text-white/80 shadow-2xl ring-1 ring-white/10">
          <p className="font-semibold text-white">End-to-end encrypted</p>
          <p className="mt-1">Audio and video are encrypted between your two devices (DTLS-SRTP). Proofolio&apos;s servers can&apos;t see or hear them.</p>
          {call.code && (
            <>
              <p className="mt-3 font-semibold text-white">Security code</p>
              <p className="mt-1 font-mono text-lg tracking-widest text-white">{call.code}</p>
              <p className="mt-1">If {call.peer.name.split(" ")[0]} sees the same code, nobody is listening in.</p>
            </>
          )}
          {call.route && (
            <p className="mt-3 text-white/60">
              {call.route === "direct" ? "Direct peer-to-peer connection" : "Relayed through Proofolio's TURN server (still encrypted)"}
              {call.rtt != null && ` · ${call.rtt} ms`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------- pieces

function Status({ call }: { call: CallState }) {
  const now = useNow(call.phase === "active" || call.phase === "reconnecting");
  switch (call.phase) {
    case "outgoing":
      return <>{call.ringing ? "Ringing…" : "Calling…"}</>;
    case "connecting":
      return <>Connecting…</>;
    case "reconnecting":
      return <span className="text-amber-300">Reconnecting…</span>;
    case "active":
      return <>{formatDuration(now - (call.startedAt ?? now))}</>;
    case "ended":
      return <>{call.ended}</>;
    default:
      return null;
  }
}

function Avatar({ name, size, pulse }: { name: string; size: "sm" | "lg"; pulse?: boolean }) {
  const dims = size === "lg" ? "h-28 w-28 text-4xl" : "h-12 w-12 text-lg";
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-600 font-bold ${dims}`}>
      {pulse && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />}
      <span className="relative">{(name.trim()[0] || "?").toUpperCase()}</span>
    </span>
  );
}

function RoundButton({
  label,
  onClick,
  children,
  tone = "neutral",
  pressed,
  size = "md",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "accept";
  pressed?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const dims = size === "md" ? "h-14 w-14" : size === "sm" ? "h-11 w-11" : "h-8 w-8";
  const color =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : tone === "accept"
        ? "bg-emerald-600 hover:bg-emerald-500"
        : pressed
          ? "bg-white text-neutral-900 hover:bg-white/90"
          : "bg-white/12 hover:bg-white/20";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${dims} ${color}`}
    >
      {children}
    </button>
  );
}

function StreamVideo({ stream, className, mirror }: { stream: MediaStream | null; className: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  // Muted: the sound plays once, through RemoteAudio, whichever views are on screen.
  return <video ref={ref} autoPlay playsInline muted className={`${className} ${mirror ? "-scale-x-100" : ""}`} />;
}

function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.srcObject === stream) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

const showsVideo = (stream: MediaStream | null, on: boolean) => on && !!stream?.getVideoTracks().some((t) => t.readyState === "live");

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);
  return now;
}

/** Ringtone (incoming) or ringback (outgoing, while the other side rings), synthesized: no audio files. */
function useTone(kind: "ring" | "ringback" | null) {
  useEffect(() => {
    if (!kind) return;
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    ctx.resume().catch(() => {});
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const oscillators = (kind === "ring" ? [784, 988] : [440, 480]).map((f) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    // Bursts are [on, off] seconds into each period.
    const { level, period, bursts } =
      kind === "ring"
        ? { level: 0.07, period: 3, bursts: [[0, 0.4], [0.6, 1]] }
        : { level: 0.05, period: 6, bursts: [[0, 2]] };
    const schedule = () => {
      const t = ctx.currentTime + 0.05;
      for (const [on, off] of bursts) {
        gain.gain.setValueAtTime(level, t + on);
        gain.gain.setValueAtTime(0, t + off);
      }
      if (kind === "ring") navigator.vibrate?.([400, 200, 400]);
    };
    schedule();
    const timer = setInterval(schedule, period * 1000);
    return () => {
      clearInterval(timer);
      oscillators.forEach((o) => o.stop());
      ctx.close().catch(() => {});
      navigator.vibrate?.(0);
    };
  }, [kind]);
}

/** A system notification for an incoming call while Proofolio is in a background tab. */
function useIncomingNotification(call: CallState | null) {
  const ringingId = call?.phase === "incoming" ? call.id : null;
  const title = call ? `Incoming ${call.media === "video" ? "video" : "voice"} call` : "";
  const from = call?.peer.name ?? "";
  useEffect(() => {
    if (!ringingId || document.visibilityState !== "hidden") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const n = new Notification(title, { body: from, tag: ringingId, requireInteraction: true, icon: "/images/home-profolio-logo.jpeg" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return () => n.close();
  }, [ringingId, title, from]);
}
