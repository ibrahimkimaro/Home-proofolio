"use client";

import { fetchPushKey, subscribePush, unsubscribePush } from "@/lib/api";

/**
 * Web Push from the browser's side: a service worker (public/sw.js) shows notifications when the site isn't
 * on screen; this file registers it and subscribes this device, keeping the server's copy in step.
 *
 *   unsupported: this browser/connection can't (needs https or localhost; on iPhone, "Add to Home Screen" first)
 *   unavailable: the server has no push keys configured
 *   blocked:     the member said "Block" in the browser; only they can undo it in the browser's site settings
 *   off:         could be turned on        on: this device gets notifications
 */
export type PushState = "unsupported" | "unavailable" | "blocked" | "off" | "on";

const SYNC_KEY = "proofolio-push-synced";
const DAY = 24 * 3600 * 1000;
let serverKey: string | null | undefined;

export const pushSupported = () =>
  typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function publicKey(): Promise<string | null> {
  if (serverKey !== undefined) return serverKey;
  try {
    const r = await fetchPushKey();
    serverKey = r.enabled ? r.public_key : null;
  } catch {
    return null; // a hiccup: ask again next time rather than remember "no"
  }
  return serverKey;
}

async function register() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

function keyBytes(b64: string) {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Make sure this device has a subscription and the server knows it. */
async function subscribe(): Promise<void> {
  const key = await publicKey();
  if (!key) throw new Error("Notifications aren't set up on this server");
  const reg = await register();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error("This browser gave an incomplete subscription");
  await subscribePush({ endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } });
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return (await publicKey()) ? "off" : "unavailable";
  if (!(await publicKey())) return "unavailable";
  const reg = await register();
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

/** Turn notifications on for this device. Must be called from a click: browsers only ask permission then. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!(await publicKey())) return "unavailable";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "off";
  await subscribe();
  return "on";
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await unsubscribePush(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

/** On sign-out: this device stops receiving this member's notifications (the next member to sign in can turn them on). */
export async function forgetThisDevice(): Promise<void> {
  try {
    localStorage.removeItem(SYNC_KEY);
  } catch {}
  await disablePush().catch(() => {});
}

/**
 * Quiet, on app load: registers the service worker and, if the member already allowed notifications, makes sure
 * this device's subscription is on the server. At most once a day per member, so it isn't an API call per page.
 */
export async function syncPush(userId: string): Promise<PushState> {
  const state = await getPushState();
  if (state !== "on") return state;
  try {
    const [who, at] = (localStorage.getItem(SYNC_KEY) ?? "").split("@");
    if (who === userId && Date.now() - Number(at) < DAY) return state;
  } catch {}
  try {
    await subscribe();
    localStorage.setItem(SYNC_KEY, `${userId}@${Date.now()}`);
  } catch {}
  return state;
}
