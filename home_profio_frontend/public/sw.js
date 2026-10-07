/* Home Proofolio service worker: Web Push notifications (new messages) when the site is not on screen.
 * Deliberately small: no caching and no fetch handler, so it can never serve a stale page. */

const ICON = "/images/home-profolio-logo.jpeg";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // The site is open and in front of the member: the page shows its own pop-up and plays its own sound
      // (and stays quiet for the chat they're reading). Showing this one too would only double up.
      if (windows.some((w) => w.visibilityState === "visible" && w.focused)) return;
      await self.registration.showNotification(data.title || "Home Proofolio", {
        body: data.body || "",
        icon: ICON,
        tag: data.tag || undefined, // one per chat: a newer message replaces the older notice
        renotify: !!data.tag,
        timestamp: Date.now(),
        data: { url: data.url || "/chat" },
      });
    })()
  );
});

// Tapping a notification opens that conversation: in the tab that's already open if there is one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/chat", self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const mine = windows.find((w) => new URL(w.url).origin === target.origin);
      if (mine) {
        await mine.focus();
        mine.postMessage({ type: "open-url", url: target.pathname + target.search });
      } else {
        await self.clients.openWindow(target.href);
      }
    })()
  );
});

// The browser rotated this device's subscription: register the new one, so messages keep arriving.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const key = (await (await fetch("/api/push/key", { credentials: "include" })).json()).public_key;
        if (!key) return;
        const pad = "=".repeat((4 - (key.length % 4)) % 4);
        const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
        const applicationServerKey = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        const j = sub.toJSON();
        await fetch("/api/me/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }),
        });
      } catch (_) {
        /* the app re-syncs the next time it is opened */
      }
    })()
  );
});
