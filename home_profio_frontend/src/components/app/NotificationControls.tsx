"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { sendTestPush } from "@/lib/api";
import { DEFAULT_PREFS, alertPrefs, onAlertPrefs, playAlert, playChime, setAlertPrefs, unlockAudio, type AlertPrefs, type Volume } from "@/lib/chime";

const SWITCH =
  "relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30";

const STATE_TEXT: Record<PushState, string> = {
  on: "On for this device. You'll get a notification for new messages even when the site is closed.",
  off: "Off. Turn it on to get a notification for new messages even when the site is closed.",
  blocked: "Blocked in your browser. Allow notifications for this site in the browser's site settings, then come back.",
  unsupported: "This browser can't show notifications here. On an iPhone, add Home Proofolio to your Home Screen first.",
  unavailable: "Notifications aren't set up on this server yet.",
};

function usePrefs(): AlertPrefs {
  // The stored object is replaced on every change, so its identity is a stable snapshot.
  return useSyncExternalStore(onAlertPrefs, alertPrefs, () => DEFAULT_PREFS);
}

function Row({
  title,
  hint,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="block text-[12px] text-slate">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={SWITCH} />
    </label>
  );
}

const MUTES: { label: string; ms: number }[] = [
  { label: "1 hour", ms: 3600_000 },
  { label: "8 hours", ms: 8 * 3600_000 },
  { label: "24 hours", ms: 24 * 3600_000 },
];

/** Alerts on this device: everything on/off, sound and volume, pop-ups, browser notifications, previews, do not disturb. */
export function NotificationControls() {
  const prefs = usePrefs();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let live = true;
    getPushState()
      .then((s) => live && setState(s))
      .catch(() => live && setState("unsupported"));
    const tick = () => live && setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  async function toggle(on: boolean) {
    setBusy(true);
    setNote(null);
    try {
      if (on) setState(await enablePush());
      else {
        await disablePush();
        setState("off");
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    try {
      const r = await sendTestPush();
      setNote(r.sent ? "Sent. It should appear in a moment (switch to another tab to see it)." : "Nothing was sent: no device is subscribed.");
    } catch {
      setNote("Couldn't send the test.");
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";
  const muted = now > 0 && prefs.mutedUntil > now;
  const off = !prefs.on;
  const mutedText = muted
    ? `Do not disturb until ${new Date(prefs.mutedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
    : "Silence sound and pop-ups for a while. Activation codes still come through.";

  return (
    <div className="space-y-5">
      <Row
        title="Alerts on this device"
        hint="The master switch. Off: no sound, pop-ups or browser notifications from the site (the bell still lists everything)."
        checked={prefs.on}
        onChange={(on) => setAlertPrefs({ on })}
      />

      <Row
        title="Sound"
        hint="A short chime when something arrives. Your browser must allow sound for this site (touch the page once after opening it)."
        checked={prefs.sound}
        disabled={off}
        onChange={(sound) => {
          setAlertPrefs({ sound });
          if (sound) {
            unlockAudio();
            setTimeout(() => playChime(), 50);
          }
        }}
      />

      <div className={`flex flex-wrap items-center justify-between gap-3 ${off || !prefs.sound ? "opacity-50" : ""}`}>
        <span>
          <span className="block text-[14px] font-medium">Volume</span>
          <span className="block text-[12px] text-slate">Tap to hear it.</span>
        </span>
        <div className="flex gap-1.5" role="group" aria-label="Volume">
          {(["low", "medium", "high"] as Volume[]).map((v) => (
            <button
              key={v}
              type="button"
              disabled={off || !prefs.sound}
              onClick={() => {
                setAlertPrefs({ volume: v });
                unlockAudio();
                setTimeout(() => playAlert(), 50);
              }}
              aria-pressed={prefs.volume === v}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                prefs.volume === v ? "border-ink bg-ink text-paper" : "border-hairline text-ink-700 hover:bg-paper-dim"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <Row
        title="Pop-ups in the page"
        hint="A small card in the corner when a message or invitation arrives and you're on another page."
        checked={prefs.popups}
        disabled={off}
        onChange={(popups) => setAlertPrefs({ popups })}
      />

      <Row
        title="Browser notifications"
        hint="A notification from your browser while this tab is in the background. Your browser asks permission the first time."
        checked={prefs.desktop}
        disabled={off}
        onChange={async (desktop) => {
          setAlertPrefs({ desktop });
          if (desktop && typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission().catch(() => {});
        }}
      />

      <Row
        title="Show message text"
        hint="Off: pop-ups and browser notifications only say that you have a new message."
        checked={prefs.preview}
        disabled={off}
        onChange={(preview) => setAlertPrefs({ preview })}
      />

      <Row
        title="Messages"
        hint="Alerts for new chat messages."
        checked={prefs.messages}
        disabled={off}
        onChange={(messages) => setAlertPrefs({ messages })}
      />
      <Row
        title="Activity and updates"
        hint="Alerts for follows, group invitations, business decisions and messages from the team."
        checked={prefs.activity}
        disabled={off}
        onChange={(activity) => setAlertPrefs({ activity })}
      />

      <div className={`flex flex-wrap items-center justify-between gap-3 ${off ? "opacity-50" : ""}`}>
        <span>
          <span className="block text-[14px] font-medium">Do not disturb</span>
          <span className="block text-[12px] text-slate">{mutedText}</span>
        </span>
        <div className="flex gap-1.5">
          {muted ? (
            <button
              type="button"
              onClick={() => setAlertPrefs({ mutedUntil: 0 })}
              className="cursor-pointer rounded-full border border-hairline px-3.5 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-paper-dim"
            >
              Turn off
            </button>
          ) : (
            MUTES.map((m) => (
              <button
                key={m.label}
                type="button"
                disabled={off}
                onClick={() => setAlertPrefs({ mutedUntil: Date.now() + m.ms })}
                className="cursor-pointer rounded-full border border-hairline px-3.5 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-paper-dim"
              >
                {m.label}
              </button>
            ))
          )}
        </div>
      </div>

      <label className={`flex items-center justify-between gap-4 ${canToggle ? "cursor-pointer" : "opacity-70"}`}>
        <span>
          <span className="block text-[14px] font-medium">Notifications when the site is closed</span>
          <span className="block text-[12px] text-slate">{state ? STATE_TEXT[state] : "Checking…"}</span>
        </span>
        <input type="checkbox" checked={state === "on"} disabled={!canToggle || busy} onChange={(e) => toggle(e.target.checked)} className="peer sr-only" />
        <span className={SWITCH} />
      </label>

      {state === "on" && (
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="cursor-pointer rounded-xl border border-hairline px-4 py-2 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-paper-dim disabled:opacity-50"
        >
          Send me a test notification
        </button>
      )}
      {note && <p className="text-[13px] text-slate">{note}</p>}
    </div>
  );
}
