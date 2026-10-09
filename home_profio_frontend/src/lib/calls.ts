import type { Channel } from "phoenix";
import { getPhoenixSocket, pushInbox, subscribeInbox, type CallInboxEvent } from "@/lib/realtime";

/**
 * 1:1 voice and video calls over WebRTC, signaled through the Phoenix "call:<id>" channel
 * (realtime_chat CallChannel). Media goes browser to browser, encrypted end to end with DTLS-SRTP;
 * if a direct path is impossible it is relayed, still encrypted, by the TURN server whose
 * short-lived credentials arrive in the channel's join reply.
 *
 * Negotiation follows the "perfect negotiation" pattern: either side may (re)negotiate at any time
 * (camera turned on mid-call, ICE restart after a network change) and offer collisions resolve
 * themselves: the caller is impolite (wins), the callee polite (rolls back).
 *
 * Staying connected: the media doesn't depend on the websocket, so a socket drop doesn't drop the
 * call; Phoenix rejoins the channel by itself and the server holds the call for 30s meanwhile. When
 * the media path itself breaks (Wi-Fi to 4G, sleep) the connection is ICE-restarted, and the call
 * only ends if it can't be restored within RECONNECT_GIVE_UP_MS.
 *
 * One call per tab; state lives in this module (useSyncExternalStore via subscribeCall/getCall).
 */

export type CallMedia = "audio" | "video";
export type CallPhase = "incoming" | "outgoing" | "connecting" | "active" | "reconnecting" | "ended";

export interface CallPeer {
  id: string;
  name: string;
  username: string;
}

export interface CallState {
  id: string;
  role: "caller" | "callee";
  media: CallMedia; // what the call was placed as
  peer: CallPeer;
  phase: CallPhase;
  ringing: boolean; // outgoing: the server accepted the call and the peer's app is ringing
  startedAt: number | null; // first time media connected
  micOn: boolean;
  camOn: boolean;
  peerMicOn: boolean;
  peerCamOn: boolean;
  local: MediaStream | null;
  remote: MediaStream | null;
  route: "direct" | "relay" | null; // peer-to-peer, or via the TURN relay
  rtt: number | null; // round trip, ms
  code: string | null; // security code: equal on both sides = no one in the middle
  ended: string | null; // why it ended (human readable)
  notice: string | null; // non-fatal problem, e.g. no camera
  canFlip: boolean; // more than one camera
}

const CONNECT_TIMEOUT_MS = 30_000; // accepted -> media flowing
const DISCONNECT_RESTART_MS = 2_000; // "disconnected" often heals by itself; restart ICE after this
const RECONNECT_GIVE_UP_MS = 30_000;
const ENDED_SHOW_MS = 2_500;

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
// This tab. The server binds each side of a call to one device, so other tabs can't hijack it.
const DEVICE = typeof window === "undefined" ? "server" : newId();

// ------------------------------------------------------------------------------------- store

let state: CallState | null = null;
const subscribers = new Set<() => void>();

export const getCall = () => state;
export function subscribeCall(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
function set(patch: Partial<CallState>) {
  if (!state) return;
  state = { ...state, ...patch };
  subscribers.forEach((cb) => cb());
}
function replace(next: CallState | null) {
  state = next;
  subscribers.forEach((cb) => cb());
}

// ------------------------------------------------------------------------------------- session

interface Session {
  userId: string;
  channel: Channel | null;
  pc: RTCPeerConnection | null;
  iceServers: RTCIceServer[];
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingAnswer: boolean;
  tracksAdded: boolean;
  queue: Promise<void>; // incoming signals, handled one at a time
  timers: Set<ReturnType<typeof setTimeout>>;
  statsTimer: ReturnType<typeof setInterval> | null;
  reconnectSince: number | null;
}

let session: Session | null = null;
let myUserId = "";

function later(fn: () => void, ms: number) {
  const s = session;
  if (!s) return;
  const t = setTimeout(() => {
    s.timers.delete(t);
    if (session === s) fn();
  }, ms);
  s.timers.add(t);
}

function base(fields: Pick<CallState, "id" | "role" | "media" | "peer" | "phase">): CallState {
  return {
    ...fields,
    ringing: false,
    startedAt: null,
    micOn: true,
    camOn: false,
    peerMicOn: true,
    peerCamOn: fields.media === "video",
    local: null,
    remote: null,
    route: null,
    rtt: null,
    code: null,
    ended: null,
    notice: null,
    canFlip: false,
  };
}

const busy = () => !!state && state.phase !== "ended";

/** Browsers only give pages a microphone/camera over https (or on localhost); phones on plain-http LAN can't call. */
export const canUseMedia = () => typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

/** Start listening for incoming calls for this user (idempotent). */
export function initCalls(userId: string): () => void {
  myUserId = userId;
  const onPageHide = () => {
    if (state && session?.channel && state.phase !== "ended" && state.phase !== "incoming") session.channel.push("hangup", {});
  };
  window.addEventListener("pagehide", onPageHide);
  const unsubscribe = subscribeInbox(userId, { onCall });
  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", onPageHide);
  };
}

function onCall(event: "incoming_call" | "call_handled" | "call_ended", p: CallInboxEvent) {
  if (event === "incoming_call" && p.from && p.media) {
    // The server already refuses a second call to someone in a call; this guards this tab's own state.
    if (busy()) return;
    session = null;
    replace(base({ id: p.call_id, role: "callee", media: p.media, peer: p.from, phase: "incoming" }));
    return;
  }
  if (state?.id !== p.call_id) return;
  if (event === "call_handled") {
    if (state.phase === "incoming") replace(null); // answered in another tab
  } else if (state.phase === "incoming" || (state.phase === "connecting" && !session?.channel)) {
    finish(endedText(p.reason || "ended")); // caller gave up while ringing (or during our permission prompt)
  }
}

// ------------------------------------------------------------------------------------- actions

/** Ring `peer`. Asks for the microphone (and camera) first. */
export async function startCall(peer: CallPeer, media: CallMedia) {
  if (busy() || !myUserId) return;
  const id = newId();
  replace(base({ id, role: "caller", media, peer, phase: "outgoing" }));
  session = newSession(myUserId, false);
  const s = session;

  const local = await openMedia(media).catch((e: Error) => (finish(e.message, true), null));
  if (!local || session !== s) return local?.getTracks().forEach((t) => t.stop());
  set({ local, micOn: true, camOn: local.getVideoTracks().length > 0, canFlip: await hasManyCameras() });

  join(s, id, { to: peer.id, media });
}

/** Answer the ringing call in this tab. */
export async function acceptCall() {
  if (!state || state.phase !== "incoming") return;
  const { id, media } = state;
  session = newSession(myUserId, true);
  const s = session;
  set({ phase: "connecting" });

  const local = await openMedia(media).catch((e: Error) => {
    // Not a rejection: the caller is told we couldn't answer, and we keep the reason on screen.
    pushInbox("decline_call", { call_id: id, reason: "media_error" }).catch(() => {});
    finish(e.message, true);
    return null;
  });
  if (!local || session !== s) return local?.getTracks().forEach((t) => t.stop());
  set({ local, micOn: true, camOn: local.getVideoTracks().length > 0, canFlip: await hasManyCameras() });

  join(s, id, {});
}

/** Hang up, cancel the outgoing call, or decline the ringing one. */
export function hangUp() {
  if (!state || state.phase === "ended") return;
  if (state.phase === "incoming") {
    pushInbox("decline_call", { call_id: state.id }).catch(() => {});
    return finish("Declined");
  }
  session?.channel?.push("hangup", {});
  finish(state.phase === "outgoing" ? "Cancelled" : "Call ended");
}

export function toggleMic() {
  const track = state?.local?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  set({ micOn: track.enabled });
  announceMedia();
}

/** Camera on/off. Turning it on in a voice call adds a video track (and renegotiates). */
export async function toggleCamera() {
  if (!state?.local || !session) return;
  const s = session;
  const track = state.local.getVideoTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    set({ camOn: track.enabled });
    return announceMedia();
  }
  try {
    const video = (await navigator.mediaDevices.getUserMedia({ video: VIDEO })).getVideoTracks()[0];
    if (session !== s || !state?.local) return video.stop();
    state.local.addTrack(video);
    if (s.pc && s.tracksAdded) s.pc.addTrack(video, state.local);
    set({ local: new MediaStream(state.local.getTracks()), camOn: true, notice: null, canFlip: await hasManyCameras() });
    announceMedia();
  } catch (e) {
    set({ notice: mediaError(e as Error, "video") });
  }
}

/** Front/back camera on phones. */
export async function flipCamera() {
  const s = session;
  const old = state?.local?.getVideoTracks()[0];
  if (!s || !old || !state?.local) return;
  const facing = old.getSettings().facingMode === "environment" ? "user" : "environment";
  try {
    const next = (await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, facingMode: { exact: facing } } })).getVideoTracks()[0];
    if (session !== s || !state?.local) return next.stop();
    next.enabled = old.enabled;
    await s.pc?.getSenders().find((x) => x.track === old)?.replaceTrack(next);
    state.local.removeTrack(old);
    old.stop();
    state.local.addTrack(next);
    set({ local: new MediaStream(state.local.getTracks()) });
  } catch {
    set({ notice: "Couldn't switch camera" });
  }
}

/** Forget an ended call's summary right away. */
export function dismissCall() {
  if (state?.phase === "ended") replace(null);
}

// ------------------------------------------------------------------------------------- signaling

function newSession(userId: string, polite: boolean): Session {
  return {
    userId,
    channel: null,
    pc: null,
    iceServers: [],
    polite,
    makingOffer: false,
    ignoreOffer: false,
    settingAnswer: false,
    tracksAdded: false,
    queue: Promise.resolve(),
    timers: new Set(),
    statsTimer: null,
    reconnectSince: null,
  };
}

interface JoinReply {
  call_id: string;
  role: "caller" | "callee";
  media: CallMedia;
  rejoin: boolean;
  peer: CallPeer | null;
  ice_servers: RTCIceServer[];
}

async function join(s: Session, id: string, first: { to?: string; media?: CallMedia }) {
  const socket = await getPhoenixSocket(s.userId).catch(() => null);
  if (session !== s) return;
  if (!socket) return finish("Not connected, try again");

  let joined = false;
  // Params are re-read on every automatic rejoin: only the first join places the call.
  const channel = socket.channel(`call:${id}`, () => (joined ? { device: DEVICE } : { device: DEVICE, ...first }));
  s.channel = channel;

  channel.on("accepted", () => {
    // Callee is ready: build the connection; adding our tracks fires negotiationneeded -> offer.
    set({ phase: "connecting", ringing: false });
    const pc = ensurePeer(s);
    addLocalTracks(s, pc);
    announceMedia();
    later(() => state?.phase === "connecting" && failed("Couldn't connect the call"), CONNECT_TIMEOUT_MS);
  });
  channel.on("signal", (msg: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit | null }) => {
    s.queue = s.queue.then(() => handleSignal(s, msg)).catch((e) => console.warn("call signal", e));
  });
  channel.on("media", (m: { audio: boolean; video: boolean }) => set({ peerMicOn: m.audio, peerCamOn: m.video }));
  // The peer's signaling socket dropped; their media may well still flow, so only the peer
  // connection's own state drives "Reconnecting…". Once they're back, repair the path if needed.
  channel.on("peer_rejoined", () => restartIfBroken(s));
  channel.on("ended", (p: { reason: string }) => finish(endedText(p.reason)));

  channel
    .join()
    .receive("ok", (reply: JoinReply) => {
      s.iceServers = reply.ice_servers;
      if (joined) return restartIfBroken(s); // back after a socket drop
      joined = true;
      if (reply.role === "caller") {
        set({ ringing: true, peer: reply.peer ?? state!.peer });
      } else {
        ensurePeer(s);
        channel.push("ready", {});
        announceMedia();
        later(() => state?.phase === "connecting" && failed("Couldn't connect the call"), CONNECT_TIMEOUT_MS);
      }
    })
    .receive("error", (e: { reason?: string }) => {
      channel.leave();
      if (session === s) finish(endedText(e?.reason || "failed"));
    });
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun3.l.google.com:19302",
      "stun:stun4.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ],
  },
];

function sanitizeIceServers(servers: RTCIceServer[]): RTCIceServer[] {
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isTunnel =
    currentHost.includes("devtunnels.ms") ||
    currentHost.includes("ngrok") ||
    currentHost.includes("zrok") ||
    currentHost.includes("loca.lt") ||
    currentHost.includes("trycloudflare.com");

  const sanitized: RTCIceServer[] = [];

  for (const s of servers || []) {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    const filteredUrls = urls.filter((url) => {
      if (!url) return false;
      // If we are on an HTTP tunnel, drop TURN URLs pointing to that tunnel because UDP/TCP 3478 is not forwarded
      if (isTunnel && (url.startsWith("turn:") || url.startsWith("turns:"))) {
        if (url.includes(currentHost) || url.includes("localhost") || url.includes("127.0.0.1")) {
          return false;
        }
      }
      return true;
    });

    if (filteredUrls.length > 0) {
      sanitized.push({ ...s, urls: filteredUrls });
    }
  }

  // Ensure high-availability STUN is always present
  const hasStun = sanitized.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => u.startsWith("stun:"));
  });

  if (!hasStun) {
    sanitized.unshift(...DEFAULT_STUN_SERVERS);
  }

  return sanitized;
}

function ensurePeer(s: Session): RTCPeerConnection {
  if (s.pc) return s.pc;
  const iceServers = sanitizeIceServers(s.iceServers);
  if (process.env.NODE_ENV !== "production") {
    console.info("[WebRTC] Using ICE servers:", iceServers);
  }
  const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
  s.pc = pc;

  pc.onnegotiationneeded = async () => {
    try {
      s.makingOffer = true;
      await pc.setLocalDescription();
      signal(s, { description: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp } });
    } catch (e) {
      console.warn("call negotiation", e);
    } finally {
      s.makingOffer = false;
    }
  };
  pc.onicecandidate = ({ candidate }) => {
    if (process.env.NODE_ENV !== "production" && candidate) {
      console.info("[WebRTC] ICE candidate:", candidate.type, candidate.protocol, candidate.address);
    }
    signal(s, { candidate: candidate ? candidate.toJSON() : null });
  };
  pc.ontrack = ({ track }) => {
    const tracks = (state?.remote?.getTracks() ?? []).filter((t) => t.kind !== track.kind || t.id === track.id);
    if (!tracks.includes(track)) tracks.push(track);
    set({ remote: new MediaStream(tracks) });
  };
  pc.onconnectionstatechange = () => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[WebRTC] connectionState:", pc.connectionState);
    }
    onConnectionState(s, pc);
  };
  pc.oniceconnectionstatechange = () => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[WebRTC] iceConnectionState:", pc.iceConnectionState);
    }
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      if (pc.connectionState !== "connected") {
        onConnectionState(s, pc);
      }
    } else if (pc.iceConnectionState === "failed") {
      onConnectionState(s, pc);
    }
  };
  return pc;
}

function addLocalTracks(s: Session, pc: RTCPeerConnection) {
  if (s.tracksAdded || !state?.local) return;
  s.tracksAdded = true;
  for (const track of state.local.getTracks()) pc.addTrack(track, state.local);
}

async function handleSignal(s: Session, { description, candidate }: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit | null }) {
  if (session !== s) return;
  const pc = ensurePeer(s);
  if (description) {
    const readyForOffer = !s.makingOffer && (pc.signalingState === "stable" || s.settingAnswer);
    const collision = description.type === "offer" && !readyForOffer;
    s.ignoreOffer = !s.polite && collision;
    if (s.ignoreOffer) return;

    s.settingAnswer = description.type === "answer";
    await pc.setRemoteDescription(description); // polite side: rolls back its own offer if needed
    s.settingAnswer = false;
    if (description.type === "offer") {
      // Callee adds its tracks on the first offer, so they ride on the caller's transceivers.
      addLocalTracks(s, pc);
      await pc.setLocalDescription();
      signal(s, { description: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp } });
    }
  } else if (candidate !== undefined) {
    try {
      await pc.addIceCandidate(candidate ?? undefined);
    } catch (e) {
      if (!s.ignoreOffer) console.warn("call candidate", e);
    }
  }
}

function signal(s: Session, payload: object) {
  if (session === s) s.channel?.push("signal", payload, 30_000);
}

function announceMedia() {
  if (!state) return;
  session?.channel?.push("media", { audio: state.micOn, video: state.camOn && !!state.local?.getVideoTracks().length });
}

// ------------------------------------------------------------------------------------- connection health

function onConnectionState(s: Session, pc: RTCPeerConnection) {
  if (session !== s || !state) return;
  switch (pc.connectionState) {
    case "connected":
      s.reconnectSince = null;
      set({ phase: "active", startedAt: state.startedAt ?? Date.now() });
      if (!state.code) securityCode(pc).then((code) => session === s && set({ code }));
      if (!s.statsTimer) {
        readStats(s, pc);
        s.statsTimer = setInterval(() => readStats(s, pc), 2_000);
      }
      break;
    case "disconnected":
      reconnecting(s);
      later(() => restartIfBroken(s), DISCONNECT_RESTART_MS);
      break;
    case "failed":
      reconnecting(s);
      restartIfBroken(s);
      break;
  }
}

function reconnecting(s: Session) {
  if (state?.phase !== "active" && state?.phase !== "reconnecting") return;
  set({ phase: "reconnecting" });
  if (s.reconnectSince) return;
  s.reconnectSince = Date.now();
  later(() => s.reconnectSince && failed("Connection lost"), RECONNECT_GIVE_UP_MS);
}

/** New ICE candidates (new network path) via a fresh offer; perfect negotiation handles the rest. */
function restartIfBroken(s: Session) {
  const st = s.pc?.connectionState;
  if (s.pc && (st === "disconnected" || st === "failed")) s.pc.restartIce();
}

async function readStats(s: Session, pc: RTCPeerConnection) {
  try {
    const stats = await pc.getStats();
    let pair: RTCIceCandidatePairStats | undefined;
    stats.forEach((r) => {
      if (r.type === "transport" && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId);
    });
    // Firefox has no selectedCandidatePairId.
    if (!pair) {
      stats.forEach((r) => {
        if (r.type === "candidate-pair" && (r.selected || (r.nominated && r.state === "succeeded"))) pair = r;
      });
    }
    if (!pair || session !== s) return;
    const local = stats.get(pair.localCandidateId);
    const remote = stats.get(pair.remoteCandidateId);
    const relay = local?.candidateType === "relay" || remote?.candidateType === "relay";
    set({
      route: relay ? "relay" : "direct",
      rtt: pair.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) : null,
    });
  } catch {
    // stats are cosmetic
  }
}

/**
 * Both browsers derive the same 8 digits from the two DTLS certificate fingerprints that encrypt the
 * media. If the users read out the same code, nobody (not even a compromised signaling server)
 * sits in the middle of the call.
 */
async function securityCode(pc: RTCPeerConnection): Promise<string | null> {
  const fp = (sdp?: string) => sdp?.match(/^a=fingerprint:(.+)$/m)?.[1].trim().toUpperCase();
  const a = fp(pc.localDescription?.sdp);
  const b = fp(pc.remoteDescription?.sdp);
  if (!a || !b || !crypto.subtle) return null;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode([a, b].sort().join("|"))));
  const n = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
  const digits = String(n % 100_000_000).padStart(8, "0");
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

// ------------------------------------------------------------------------------------- media

const VIDEO: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

async function openMedia(media: CallMedia): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Calls need a secure connection: open Proofolio over https (or localhost).");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: media === "video" ? VIDEO : false });
  } catch (e) {
    const err = e as Error;
    // No (usable) camera: still connect the call with audio, and say so.
    if (media === "video" && ["NotFoundError", "NotReadableError", "OverconstrainedError"].includes(err.name)) {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: AUDIO }).catch((e2: Error) => {
        throw new Error(mediaError(e2, "audio"));
      });
      queueMicrotask(() => set({ notice: mediaError(err, "video") + " Joined with audio only." }));
      return audio;
    }
    throw new Error(mediaError(err, media));
  }
}

function mediaError(e: Error, media: CallMedia): string {
  const what = media === "video" ? "camera" : "microphone";
  switch (e.name) {
    case "NotAllowedError":
    case "SecurityError":
      return `Allow ${media === "video" ? "camera and microphone" : "microphone"} access in your browser to call.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `No ${what} found.`;
    case "NotReadableError":
      return `Your ${what} is being used by another app.`;
    default:
      return e.message || `Couldn't start your ${what}.`;
  }
}

async function hasManyCameras() {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput").length > 1;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------------- ending

const ENDED: Record<string, (s: CallState) => string> = {
  cancelled: (s) => (s.role === "callee" ? "Missed call" : "Cancelled"),
  declined: (s) => (s.role === "caller" ? `${s.peer.name} declined` : "Declined"),
  media_error: (s) => `${s.peer.name} tried to answer, but their device couldn't use its microphone.`,
  no_answer: (s) => (s.role === "caller" ? "No answer" : "Missed call"),
  ended: () => "Call ended",
  connection_lost: () => "Connection lost",
  busy: (s) => `${s.peer.name} is on another call`,
  offline: (s) => `${s.peer.name} is offline. They'll see a missed call.`,
  "call ended": () => "Call ended",
};
const endedText = (reason: string) => (state ? (ENDED[reason]?.(state) ?? reason.charAt(0).toUpperCase() + reason.slice(1)) : reason);

function failed(text: string) {
  session?.channel?.push("hangup", {});
  finish(text);
}

/** Release everything and show why the call ended: for a moment, or until dismissed (`sticky`, for errors to act on). */
function finish(text: string, sticky = false) {
  const s = session;
  session = null;
  if (s) {
    s.timers.forEach(clearTimeout);
    if (s.statsTimer) clearInterval(s.statsTimer);
    s.pc?.close();
    s.channel?.leave();
  }
  if (!state) return;
  state.local?.getTracks().forEach((t) => t.stop());
  const id = state.id;
  set({ phase: "ended", ended: text, ringing: false, local: null, remote: null });
  if (!sticky) setTimeout(() => state?.id === id && state.phase === "ended" && replace(null), ENDED_SHOW_MS);
}
