// End-to-end check of call signaling (voice/video over WebRTC): auth and privacy, busy/decline/
// cancel/missed/offline, multi-tab, payload validation, TURN credentials, reconnect grace, and a
// load run of 100 users in 50 simultaneous calls with sockets dropping mid-call.
//   node realtime_chat/bench/call_check.mjs
// Env: CHAT_URL (ws://localhost:4000/socket), CHAT_SECRET (= SECRET_KEY), TURN_SECRET (= TURN_SECRET),
//      PHOENIX_PATH (phoenix JS client; defaults to the frontend's node_modules), DB_CONTAINER.
// Media itself is browser to browser and never touches the server, so signaling is what has to hold.
// Creates throwaway users calltest_* in Postgres via `docker exec` and deletes them at the end.
import { createHmac, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Socket } = require(process.env.PHOENIX_PATH || "../../home_profio_frontend/node_modules/phoenix");
const URL = process.env.CHAT_URL || "ws://localhost:4000/socket";
const STATUS_URL = URL.replace(/^ws/, "http").replace(/\/socket$/, "/api/status");
const SECRET = process.env.CHAT_SECRET || "change-me";
const TURN_SECRET = process.env.TURN_SECRET || "dev-turn-secret-change-me";
const PAIRS = 50; // 100 users
const DB_CONTAINER = process.env.DB_CONTAINER || "home-proofolio-db-1";
const PSQL = `docker --context default exec -i ${DB_CONTAINER} psql -q -U ibrahim_kimaro -d home_proofolio_db`;

const uid = (n) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
const user = (n) => ({ sub: uid(n), name: `Caller ${n}`, username: `calltest_${n}`, admin: false });
const mint = (u) => {
  const p = Buffer.from(JSON.stringify({ ...u, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${p}.${createHmac("sha256", SECRET).update(`chat.${p}`).digest("base64url")}`;
};
const sql = (q) => execSync(PSQL, { input: q });
const sqlRows = (q) => execSync(`${PSQL} -At`, { input: q }).toString().trim().split("\n").filter(Boolean);
const seedUsers = () =>
  sql(`INSERT INTO users (id, fullname, username, email, password_hash, is_active, is_admin)
       SELECT ('00000000-0000-4000-9000-' || lpad(n::text, 12, '0'))::uuid, 'Caller ' || n, 'calltest_' || n,
              'calltest_' || n || '@example.invalid', 'x', true, false
       FROM generate_series(1, 130) n ON CONFLICT DO NOTHING;`);
const dropUsers = () => sql(`DELETE FROM users WHERE username LIKE 'calltest\\_%';`); // notifications cascade

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const device = () => randomUUID();
const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = new Socket(URL, { params: { token }, reconnectAfterMs: () => 300, rejoinAfterMs: () => 300, logger: () => {} });
    let settled = false;
    s.onOpen(() => !settled && ((settled = true), resolve(s)));
    s.onError(() => !settled && ((settled = true), s.disconnect(), reject(new Error("connection refused"))));
    s.connect();
  });
const push = (ch, event, payload, timeout = 10000) =>
  new Promise((resolve, reject) =>
    ch.push(event, payload, timeout)
      .receive("ok", resolve)
      .receive("error", (e) => reject(new Error(e?.reason || JSON.stringify(e))))
      .receive("timeout", () => reject(new Error(`${event} timeout`))));
const waitFor = async (cond, ms = 5000) => {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await sleep(10);
  return cond();
};
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => (s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? NaN).toFixed(1);
  return `p50=${q(0.5)}ms p95=${q(0.95)}ms p99=${q(0.99)}ms max=${q(1)}ms`;
};

const CALL_EVENTS = ["signal", "accepted", "ended", "peer_reconnecting", "peer_rejoined", "media"];
const USER_EVENTS = ["incoming_call", "call_handled", "call_ended"];
function boxes(ch, events) {
  const box = Object.fromEntries(events.map((e) => [e, []]));
  for (const e of events) ch.on(e, (m) => box[e].push({ m, at: performance.now() }));
  return box;
}
/** The user's own channel, as every open app tab joins it (this is also what makes them "online"). */
async function inboxOf(socket, u) {
  const ch = socket.channel(`user:${u.sub}`, {});
  const box = boxes(ch, USER_EVENTS);
  await new Promise((res, rej) => ch.join().receive("ok", res).receive("error", rej).receive("timeout", () => rej(new Error("inbox join timeout"))));
  return box;
}
const placed = []; // every call this run dialed, checked at the end
/** Join "call:<id>" like the app does: params re-read on automatic rejoin, so only the first join dials. */
function joinCall(socket, id, first) {
  if (first.to) placed.push({ s: socket, id });
  let joined = false;
  const dev = first.device;
  const ch = socket.channel(`call:${id}`, () => (joined ? { device: dev } : first));
  const box = boxes(ch, CALL_EVENTS);
  box.rejoins = 0;
  box.closed = false;
  ch.onClose(() => (box.closed = true));
  return new Promise((resolve, reject) => {
    ch.join()
      .receive("ok", (reply) => {
        if (joined) return box.rejoins++;
        joined = true;
        resolve({ ch, reply, box });
      })
      .receive("error", (e) => {
        ch.leave();
        reject(new Error(e?.reason || "join failed"));
      })
      .receive("timeout", () => reject(new Error("call join timeout")));
  });
}
const joinError = async (socket, id, params) => {
  try {
    const { ch } = await joinCall(socket, id, params);
    ch.leave();
  } catch (e) {
    return e.message;
  }
  throw new Error("join was accepted");
};
const status = async () => (await fetch(STATUS_URL)).json();

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push(["PASS", name, detail || ""]);
  } catch (e) {
    results.push(["FAIL", name, e.message]);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function main() {
  seedUsers();
  const sockets = [];
  const open = async (u) => {
    const s = await connect(mint(u));
    sockets.push(s);
    return s;
  };
  /** Online user: socket + inbox. */
  const online = async (n) => {
    const u = user(n);
    const s = await open(u);
    return { u, s, inbox: await inboxOf(s, u) };
  };
  /** A rings B, B answers on a fresh device: returns both ends. */
  const callUp = async (A, B, media = "audio") => {
    const id = randomUUID();
    const a = await joinCall(A.s, id, { device: device(), to: B.u.sub, media });
    assert(await waitFor(() => B.inbox.incoming_call.some((x) => x.m.call_id === id)), "callee never rang");
    const b = await joinCall(B.s, id, { device: device() });
    await push(b.ch, "ready", {});
    assert(await waitFor(() => a.box.accepted.length === 1), "caller never got accepted");
    return { id, a, b };
  };

  // Long-running checks start first and are awaited at the end.
  const longChecks = [];

  longChecks.push(
    check("unanswered call times out (45s): no_answer + missed-call notification", async () => {
      const [M, N] = [await online(120), await online(121)];
      const id = randomUUID();
      const a = await joinCall(M.s, id, { device: device(), to: N.u.sub, media: "audio" });
      assert(await waitFor(() => a.box.ended.length === 1, 50_000), "never timed out");
      assert(a.box.ended[0].m.reason === "no_answer", `reason ${a.box.ended[0].m.reason}`);
      assert(await waitFor(() => N.inbox.call_ended.some((x) => x.m.call_id === id && x.m.reason === "no_answer")), "callee kept ringing");
      await sleep(300);
      const [n] = sqlRows(`SELECT count(*) FROM notifications WHERE user_id = '${N.u.sub}' AND kind = 'call';`);
      assert(n === "1", `${n} missed-call notifications`);
      return "rang 45s, both sides told, notification stored";
    })
  );

  longChecks.push(
    check("peer gone for good: call ends after the 30s reconnect grace", async () => {
      const [O, P] = [await online(122), await online(123)];
      const { b } = await callUp(O, P);
      const t0 = performance.now();
      O.s.disconnect(); // tab closed / network gone, no hang-up sent
      assert(await waitFor(() => b.box.peer_reconnecting.length === 1, 3000), "peer never saw reconnecting");
      assert(await waitFor(() => b.box.ended.length === 1, 40_000), "call never ended");
      assert(b.box.ended[0].m.reason === "connection_lost", `reason ${b.box.ended[0].m.reason}`);
      return `ended "connection_lost" after ${((b.box.ended[0].at - t0) / 1000).toFixed(1)}s`;
    })
  );

  const [A, B, C] = [await online(101), await online(102), await online(103)];
  const B2 = { u: B.u, s: await open(B.u) }; // B's second tab
  B2.inbox = await inboxOf(B2.s, B.u);

  let ab;
  await check("call rings every tab of the callee; answering on one stops the others", async () => {
    ab = await callUp(A, B, "video");
    assert(B2.inbox.incoming_call.some((x) => x.m.call_id === ab.id), "second tab didn't ring");
    const ring = B.inbox.incoming_call.find((x) => x.m.call_id === ab.id).m;
    assert(ring.media === "video" && ring.from.id === A.u.sub && ring.from.name === A.u.name, "incoming_call payload wrong");
    assert(await waitFor(() => B2.inbox.call_handled.some((x) => x.m.call_id === ab.id)), "second tab kept ringing");
    return "2 tabs rang, call_handled sent";
  });

  await check("another tab of the callee can't take over the answered call", async () => {
    const reason = await joinError(B2.s, ab.id, { device: device() });
    assert(reason === "answered on another device", reason);
    return reason;
  });

  await check("outsiders can't join or eavesdrop on a call", async () => {
    const reason = await joinError(C.s, ab.id, { device: device() });
    assert(reason === "unauthorized", reason);
    return reason;
  });

  await check("busy: calling someone in a call, or calling while in one", async () => {
    const r1 = await joinError(C.s, randomUUID(), { device: device(), to: B.u.sub, media: "audio" });
    const r2 = await joinError(C.s, randomUUID(), { device: device(), to: A.u.sub, media: "audio" });
    const r3 = await joinError(A.s, randomUUID(), { device: device(), to: C.u.sub, media: "audio" });
    assert(r1 === "busy" && r2 === "busy" && r3 === "you are already in a call", `${r1} / ${r2} / ${r3}`);
    return `${r1}, ${r2}, "${r3}"`;
  });

  await check("TURN credentials: short-lived, per user, HMAC verifiable by coturn", async () => {
    const turn = ab.a.reply.ice_servers.find((s) => s.username);
    assert(turn, `no TURN server in ${JSON.stringify(ab.a.reply.ice_servers)}`);
    const [exp, who] = turn.username.split(":");
    const ttl = Number(exp) - Date.now() / 1000;
    assert(who === A.u.sub && ttl > 3600 && ttl <= 12 * 3600 + 5, `username ${turn.username}`);
    assert(turn.credential === createHmac("sha1", TURN_SECRET).update(turn.username).digest("base64"), "credential doesn't verify");
    assert(turn.urls.some((u) => u.startsWith("turn:localhost:3478")), `urls ${turn.urls}`);
    return `${turn.urls.join(", ")}; expires in ${(ttl / 3600).toFixed(1)}h`;
  });

  await check("signals are validated and rebuilt (nothing else rides along)", async () => {
    const bad1 = await push(ab.a.ch, "signal", { foo: 1 }).then(() => "accepted", (e) => e.message);
    const bad2 = await push(ab.a.ch, "signal", { description: { type: "offer", sdp: "x".repeat(200_000) } }).then(() => "accepted", (e) => e.message);
    const bad3 = await push(ab.a.ch, "signal", { description: { type: "pranswer-evil", sdp: "v=0" } }).then(() => "accepted", (e) => e.message);
    assert([bad1, bad2, bad3].every((r) => r === "invalid signal"), `${bad1} / ${bad2} / ${bad3}`);
    const before = ab.b.box.signal.length;
    await push(ab.a.ch, "signal", { candidate: { candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host", sdpMid: "0", sdpMLineIndex: 0, evil: "<script>" } });
    assert(await waitFor(() => ab.b.box.signal.length === before + 1), "valid candidate not relayed");
    const got = ab.b.box.signal.at(-1).m.candidate;
    assert(!("evil" in got) && got.sdpMid === "0" && got.sdpMLineIndex === 0, JSON.stringify(got));
    assert(ab.a.box.signal.length === 0, "sender got its own signal back");
    return "3 malformed refused, extra fields stripped, no echo";
  });

  await check("mute/camera state reaches the peer", async () => {
    ab.b.ch.push("media", { audio: false, video: true });
    assert(await waitFor(() => ab.a.box.media.length === 1), "not relayed");
    assert(ab.a.box.media[0].m.audio === false && ab.a.box.media[0].m.video === true, JSON.stringify(ab.a.box.media[0].m));
  });

  await check("hang up ends it for both, closes both channels", async () => {
    await push(ab.a.ch, "hangup", {});
    assert(await waitFor(() => ab.a.box.ended.length && ab.b.box.ended.length && ab.a.box.closed && ab.b.box.closed), "not ended/closed");
    assert(ab.b.box.ended[0].m.reason === "ended", ab.b.box.ended[0].m.reason);
    const again = await joinCall(A.s, randomUUID(), { device: device(), to: C.u.sub, media: "audio" }); // A is free again
    await push(again.ch, "hangup", {});
    return "both got ended, A can call again";
  });

  await check("decline", async () => {
    const [D, E] = [await online(104), await online(105)];
    const id = randomUUID();
    const d = await joinCall(D.s, id, { device: device(), to: E.u.sub, media: "video" });
    assert(await waitFor(() => E.inbox.incoming_call.length === 1), "no ring");
    await push(E.s.channels.find((c) => c.topic === `user:${E.u.sub}`), "decline_call", { call_id: id });
    assert(await waitFor(() => d.box.ended.length === 1), "caller not told");
    assert(d.box.ended[0].m.reason === "declined", d.box.ended[0].m.reason);

    // Tried to answer but had no usable microphone (e.g. a phone on plain http): not a rejection.
    const id2 = randomUUID();
    const d2 = await joinCall(D.s, id2, { device: device(), to: E.u.sub, media: "audio" });
    assert(await waitFor(() => E.inbox.incoming_call.length === 2), "no second ring");
    await push(E.s.channels.find((c) => c.topic === `user:${E.u.sub}`), "decline_call", { call_id: id2, reason: "media_error" });
    assert(await waitFor(() => d2.box.ended.length === 1), "caller not told");
    assert(d2.box.ended[0].m.reason === "media_error", d2.box.ended[0].m.reason);
    return "caller got declined / media_error";
  });

  await check("caller cancels while ringing: callee stops ringing + missed-call notification", async () => {
    const [F, G] = [await online(106), await online(107)];
    const id = randomUUID();
    const f = await joinCall(F.s, id, { device: device(), to: G.u.sub, media: "audio" });
    assert(await waitFor(() => G.inbox.incoming_call.length === 1), "no ring");
    await push(f.ch, "hangup", {});
    assert(await waitFor(() => G.inbox.call_ended.some((x) => x.m.reason === "cancelled")), "callee kept ringing");
    await sleep(300);
    const [title] = sqlRows(`SELECT title FROM notifications WHERE user_id = '${G.u.sub}' AND kind = 'call';`);
    assert(title === `Missed voice call from ${F.u.name}`, `notification: ${title}`);
    return `"${title}"`;
  });

  await check("leaving the channel without a hang-up still hangs up (no 30s wait)", async () => {
    const [K, L] = [await online(108), await online(109)];
    const { a, b } = await callUp(K, L);
    a.ch.leave();
    assert(await waitFor(() => b.box.ended.length === 1, 2000), "peer not told within 2s");
    return `peer told: "${b.box.ended[0].m.reason}"`;
  });

  await check("offline / unknown / self: refused before ringing", async () => {
    const H = await online(110);
    const r1 = await joinError(H.s, randomUUID(), { device: device(), to: uid(111), media: "audio" }); // 111 has no tab open
    const r2 = await joinError(H.s, randomUUID(), { device: device(), to: randomUUID(), media: "audio" });
    const r3 = await joinError(H.s, randomUUID(), { device: device(), to: H.u.sub, media: "audio" });
    assert(r1 === "offline" && r2 === "unknown user" && r3 === "you can't call yourself", `${r1} / ${r2} / ${r3}`);
    await sleep(300);
    const [n] = sqlRows(`SELECT count(*) FROM notifications WHERE user_id = '${uid(111)}' AND kind = 'call';`);
    assert(n === "1", `offline user got ${n} missed-call notifications`);
    return `${r1}, ${r2}, ${r3}`;
  });

  await check("ring spam is rate limited (5 calls, then 1 per 10s)", async () => {
    // A fresh identity each run: the server's buckets outlive this script.
    const s = await open({ sub: randomUUID(), name: "Spammer", username: "calltest_spam", admin: false });
    const reasons = [];
    for (let i = 0; i < 6; i++) reasons.push(await joinError(s, randomUUID(), { device: device(), to: uid(113), media: "audio" }));
    assert(reasons.slice(0, 5).every((r) => r === "offline") && reasons[5].startsWith("slow down"), reasons.join(" / "));
    return reasons[5];
  });

  // ------------------------------------------------------------------------------------------ load
  await check(`load: ${PAIRS * 2} users, ${PAIRS} simultaneous video calls, 10 sockets dropped mid-call`, async () => {
    const t0 = performance.now();
    const conns = await Promise.all(range(1, PAIRS * 2).map((n) => online(n)));
    const connectMs = performance.now() - t0;
    const pairs = range(0, PAIRS - 1).map((i) => ({ i, A: conns[2 * i], B: conns[2 * i + 1], id: randomUUID() }));

    // Everyone dials at once; each callee answers the moment it rings.
    await Promise.all(
      pairs.map(async (p) => {
        p.dial = performance.now();
        p.a = await joinCall(p.A.s, p.id, { device: device(), to: p.B.u.sub, media: "video" });
        assert(await waitFor(() => p.B.inbox.incoming_call.some((x) => x.m.call_id === p.id), 10000), `pair ${p.i}: no ring`);
        p.ring = p.B.inbox.incoming_call.find((x) => x.m.call_id === p.id).at;
        p.b = await joinCall(p.B.s, p.id, { device: device() });
        await push(p.b.ch, "ready", {});
        assert(await waitFor(() => p.a.box.accepted.length === 1, 10000), `pair ${p.i}: not accepted`);
        p.accepted = p.a.box.accepted[0].at;
      })
    );
    const active = (await status()).active_calls;
    assert(active >= PAIRS, `server reports ${active} active calls`);

    // 6 negotiation rounds per call (initial + renegotiations / ICE restarts), each side sending an
    // SDP plus 10 candidates. Between rounds 1 and 2, the callers of 10 calls lose their socket
    // (abrupt close, as when Wi-Fi drops) and come back through Phoenix's automatic reconnect.
    const ROUNDS = 6;
    const sentAt = new Map();
    const sdp = "v=0\r\n" + "a=x-pad:".padEnd(5000, "y") + "\r\n";
    const sendRound = async (ch, who, p, r) => {
      const key = (k) => `${p.i}:${who}:${r}:${k}`;
      sentAt.set(key(0), performance.now());
      await push(ch, "signal", { description: { type: who === "a" ? "offer" : "answer", sdp: `${sdp}a=key:${key(0)}\r\n` } }, 30000);
      for (let k = 1; k <= 10; k++) {
        sentAt.set(key(k), performance.now());
        await push(ch, "signal", { candidate: { candidate: `candidate:${key(k)} 1 udp 2122260223 192.168.1.2 5${k} typ host`, sdpMid: "0", sdpMLineIndex: 0 } }, 30000);
      }
    };
    const dropped = pairs.slice(0, 10);
    for (let r = 1; r <= ROUNDS; r++) {
      if (r === 2) {
        // A real drop never completes a close handshake and reaches the client as 1006 (the client
        // then reconnects by itself); Node's WebSocket would report the server's polite 1000 instead.
        dropped.forEach((p) => {
          const conn = p.A.s.conn;
          const onclose = conn.onclose;
          conn.onclose = () => onclose({ code: 1006, reason: "simulated network drop" });
          conn.close(4000, "simulated network drop");
        });
        await sleep(100);
        assert(
          await waitFor(() => dropped.every((p) => p.b.box.peer_rejoined.length === 1 && p.a.box.rejoins === 1 && p.a.ch.state === "joined"), 10000),
          `rejoined: ${dropped.filter((p) => p.b.box.peer_rejoined.length === 1).length}/10`
        );
      }
      await Promise.all(pairs.flatMap((p) => [sendRound(p.a.ch, "a", p, r), sendRound(p.b.ch, "b", p, r)]));
      await sleep(r === 1 ? 0 : 1500); // hold
    }
    const want = ROUNDS * 11;
    assert(await waitFor(() => pairs.every((p) => p.a.box.signal.length >= want && p.b.box.signal.length >= want), 15000), "signals missing");

    // Exactly once, in order, from the right peer; nobody's call ended.
    const lat = [];
    for (const p of pairs) {
      for (const [box, from] of [[p.b.box, "a"], [p.a.box, "b"]]) {
        assert(box.signal.length === want, `pair ${p.i} got ${box.signal.length}/${want} from ${from}`);
        box.signal.forEach(({ m, at }, idx) => {
          const r = Math.floor(idx / 11) + 1;
          const k = idx % 11;
          const key = `${p.i}:${from}:${r}:${k}`;
          const text = k === 0 ? m.description?.sdp : m.candidate?.candidate;
          assert(text?.includes(key), `pair ${p.i}: signal ${idx} out of order or foreign`);
          lat.push(at - sentAt.get(key));
        });
      }
      assert(!p.a.box.ended.length && !p.b.box.ended.length, `pair ${p.i} ended during the call`);
    }
    for (const p of dropped) assert(p.b.box.peer_reconnecting.length === 1, `pair ${p.i}: peer_reconnecting not seen`);

    // Everyone hangs up.
    await Promise.all(pairs.map((p) => push(p.a.ch, "hangup", {})));
    assert(await waitFor(() => pairs.every((p) => p.a.box.ended.length === 1 && p.b.box.ended.length === 1), 10000), "not all ended");

    const ring = pairs.map((p) => p.ring - p.dial);
    const setup = pairs.map((p) => p.accepted - p.dial);
    return [
      `${PAIRS * 2} sockets in ${connectMs.toFixed(0)}ms`,
      `ring ${stats(ring)}`,
      `dial→accepted ${stats(setup)}`,
      `${lat.length} signals (${PAIRS} calls × ${ROUNDS} rounds × 2 sides × 11), 0 lost/dup/out-of-order, relay ${stats(lat)}`,
      `10 dropped sockets rejoined, 0 calls dropped`,
    ].join("\n        ");
  });

  await Promise.all(longChecks);

  // Per call rather than active_calls: real members may be on calls on this server meanwhile.
  await check("no calls left behind on the server", async () => {
    // An outsider gets "unauthorized" from a live call and "call ended" from a gone one.
    const probe = await open({ sub: randomUUID(), name: "Probe", username: "calltest_probe", admin: false });
    const left = [];
    for (const { id } of placed) {
      const r = await joinError(probe, id, { device: device() }).catch(() => "joinable");
      if (r !== "call ended") left.push(`${id}: ${r}`);
    }
    assert(!left.length, `${left.length}/${placed.length} still alive: ${left.slice(0, 3).join("; ")}`);
    return `all ${placed.length} calls placed by this run are gone (server-wide active_calls: ${(await status()).active_calls})`;
  });

  sockets.forEach((s) => s.disconnect());
}

try {
  await main();
} catch (e) {
  results.push(["FAIL", "harness", e.stack]);
} finally {
  try {
    dropUsers();
  } catch {}
  for (const [st, name, detail] of results) console.log(`${st.padEnd(4)}  ${name}${detail ? `  — ${detail}` : ""}`);
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
