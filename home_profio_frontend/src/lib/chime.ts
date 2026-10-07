"use client";

/**
 * Alert settings for this device and the sounds. The sounds are made with the Web Audio API (no sound file to
 * load). Browsers only allow sound after the person has touched the page once, so the audio is unlocked by the
 * first click, tap or key press; until then (or if they turned it off) the play functions quietly do nothing.
 *
 * Settings live in this browser (each device decides for itself): everything on/off, sound, volume, pop-ups in
 * the page, notifications from the browser, whether they show the message text, and "do not disturb" for a while.
 */
const PREFS_KEY = "proofolio-alerts";
const OLD_SOUND_KEY = "proofolio-sound";

export type Volume = "low" | "medium" | "high";
export interface AlertPrefs {
  /** Master switch: off = no sound, pop-ups or browser notifications from this page. */
  on: boolean;
  sound: boolean;
  volume: Volume;
  /** Small pop-ups in the page when something arrives. */
  popups: boolean;
  /** Notifications from the browser while the tab is in the background. */
  desktop: boolean;
  /** Show the sender's text in pop-ups and notifications (off: "New message"). */
  preview: boolean;
  /** Kinds of alerts. Account codes always get through (unless everything is off). */
  messages: boolean;
  activity: boolean;
  /** Do not disturb until this time (ms since epoch), 0 = not set. */
  mutedUntil: number;
}

export const DEFAULT_PREFS: AlertPrefs = {
  on: true,
  sound: true,
  volume: "medium",
  popups: true,
  desktop: true,
  preview: true,
  messages: true,
  activity: true,
  mutedUntil: 0,
};

let cache: AlertPrefs | null = null;
const listeners = new Set<() => void>();

export function alertPrefs(): AlertPrefs {
  if (cache) return cache;
  let p = { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) p = { ...p, ...JSON.parse(raw) };
    else if (localStorage.getItem(OLD_SOUND_KEY) === "off") p.sound = false; // the earlier single switch
  } catch {}
  cache = p;
  return p;
}

export function setAlertPrefs(change: Partial<AlertPrefs>) {
  cache = { ...alertPrefs(), ...change };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((f) => f());
}

/** Subscribe to changes (for useSyncExternalStore-style readers). */
export function onAlertPrefs(f: () => void) {
  listeners.add(f);
  const storage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) {
      cache = null;
      f();
    }
  };
  window.addEventListener("storage", storage);
  return () => {
    listeners.delete(f);
    window.removeEventListener("storage", storage);
  };
}

type Kind = "message" | "activity" | "code";

/** Whether an alert of this kind may interrupt right now (account codes are never silenced by a category). */
export function allowed(kind: Kind = "message") {
  const p = alertPrefs();
  if (!p.on) return false;
  if (kind !== "code" && p.mutedUntil > Date.now()) return false;
  if (kind === "message") return p.messages;
  if (kind === "activity") return p.activity;
  return true;
}
export const popupsAllowed = (kind: Kind = "message") => allowed(kind) && alertPrefs().popups;
export const desktopAllowed = (kind: Kind = "message") => allowed(kind) && alertPrefs().desktop;
export const previewAllowed = () => alertPrefs().preview;

/** Kept for the old callers. */
export const soundEnabled = () => alertPrefs().sound;
export function setSoundEnabled(on: boolean) {
  setAlertPrefs({ sound: on });
}

let ctx: AudioContext | null = null;

/** Call from a user gesture (the notifier does this on the first click, tap or key press). */
export function unlockAudio() {
  try {
    if (typeof AudioContext === "undefined") return;
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

const LEVEL: Record<Volume, number> = { low: 0.07, medium: 0.16, high: 0.34 };

function play(notes: [number, number][], kind: Kind, gainMul = 1) {
  try {
    if (!ctx || ctx.state !== "running" || !alertPrefs().sound || !allowed(kind)) return;
    const level = LEVEL[alertPrefs().volume] * gainMul;
    const t0 = ctx.currentTime;
    notes.forEach(([freq, delay]) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(level, t0 + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.42);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.45);
    });
  } catch {}
}

/** The "new message" sound: a short two-note chime. */
export function playChime(kind: Kind = "message") {
  play(
    [
      [880, 0],
      [1318.5, 0.13],
    ],
    kind
  );
}

/** Something that needs attention (your activation code arrived): three rising notes, a little louder. */
export function playAlert() {
  play(
    [
      [784, 0],
      [988, 0.14],
      [1318.5, 0.28],
    ],
    "code",
    1.25
  );
}
