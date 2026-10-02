// End-to-end check of the realtime chat: auth, privacy, delivery (no drops, no dups, order),
// offline catch-up, typing, admin monitoring, and latency.
//   node realtime_chat/bench/chat_check.mjs
// Env: CHAT_URL (ws://localhost:4000/socket), CHAT_SECRET (must match SECRET_KEY of the stack).
// Creates throwaway users chattest_* in Postgres via `docker exec` and deletes them (and their messages) at the end.
import { createHmac, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const { Socket } = createRequire(import.meta.url)("../../home_profio_frontend/node_modules/phoenix");
const URL = process.env.CHAT_URL || "ws://localhost:4000/socket";
const SECRET = process.env.CHAT_SECRET || "change-me";
const ROOM_USERS = 30;
const PSQL = "docker --context default exec -i home_proofolio-db-1 psql -q -U ibrahim_kimaro -d home_proofolio_db";

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const user = (n, admin = false) => ({ sub: uid(n), name: `Test ${n}`, username: `chattest_${n}`, admin });
const mint = (u, secret = SECRET) => {
  const p = Buffer.from(JSON.stringify({ ...u, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${p}.${createHmac("sha256", secret).update(`chat.${p}`).digest("base64url")}`;
};
const sql = (q) => execSync(PSQL, { input: q });
const sqlRows = (q) => execSync(`${PSQL} -At`, { input: q }).toString().trim().split("\n").filter(Boolean);
const seedUsers = () =>
  sql(`INSERT INTO users (id, fullname, username, email, password_hash, is_active, is_admin)
       SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'Test ' || n, 'chattest_' || n,
              'chattest_' || n || '@example.invalid', 'x', true, false
       FROM generate_series(1, 70) n ON CONFLICT DO NOTHING;`);
const dropUsers = () => sql(`DELETE FROM users WHERE username LIKE 'chattest\\_%';`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = new Socket(URL, { params: { token }, reconnectAfterMs: () => 300, logger: () => {} });
    let settled = false;
    s.onOpen(() => !settled && ((settled = true), resolve(s)));
    s.onError(() => !settled && ((settled = true), s.disconnect(), reject(new Error("connection refused"))));
    s.connect();
  });
const join = (socket, topic, params = {}) =>
  new Promise((resolve, reject) => {
    const ch = socket.channel(topic, params);
    ch.join()
      .receive("ok", (reply) => resolve({ ch, reply }))
      .receive("error", (e) => (ch.leave(), reject(new Error(JSON.stringify(e)))))
      .receive("timeout", () => reject(new Error("join timeout")));
  });
const push = (ch, event, payload, timeout = 10000) =>
  new Promise((resolve, reject) =>
    ch.push(event, payload, timeout)
      .receive("ok", resolve)
      .receive("error", (e) => reject(new Error(JSON.stringify(e))))
      .receive("timeout", () => reject(new Error("push timeout"))));
const inbox = (ch, event) => {
  const box = [];
  ch.on(event, (m) => box.push({ m, at: performance.now() }));
  return box;
};
const waitFor = async (cond, ms = 5000) => {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await sleep(10);
  return cond();
};
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => (s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? NaN).toFixed(1);
  return `n=${s.length} p50=${q(0.5)}ms p95=${q(0.95)}ms p99=${q(0.99)}ms max=${q(1)}ms`;
};

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
  const [A, B, C, ADMIN, D, E, R, F, G] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => user(n, n === 4));
  const dmOf = (u, v) => `direct:${[u.sub, v.sub].sort().join("_")}`;
  const dm = dmOf(A, B);
  const stored = new Set(); // server ids of every message acked as stored
  const sockets = [];
  const open = async (u) => {
    const s = await connect(mint(u));
    sockets.push(s);
    return s;
  };
  const send = async (ch, text, id = randomUUID()) => {
    const ack = await push(ch, "new_msg", { id, text });
    stored.add(ack.id);
    return ack;
  };
  const refused = async (fn, what) => {
    try {
      await fn();
    } catch {
      return "denied";
    }
    throw new Error(what);
  };

  await check("rejects forged token", async () => {
    let s;
    try {
      s = await connect(mint(A, "wrong-secret"));
    } catch {
      return "refused";
    }
    s.disconnect();
    throw new Error("socket with forged token was accepted");
  });

  await check("rejects missing token", async () => {
    let s;
    try {
      s = await connect(undefined);
    } catch {
      return "refused";
    }
    s.disconnect();
    throw new Error("socket without token was accepted");
  });

  const [sa, sb, sc, sadm] = [await open(A), await open(B), await open(C), await open(ADMIN)];

  await check("outsider cannot join someone else's DM", () => refused(() => join(sc, dm), "user C joined A<->B DM"));
  await check("non-admin cannot join admin monitor", () => refused(() => join(sa, "admin:monitor"), "non-admin joined"));
  await check("cannot join another user's personal channel", () =>
    refused(() => join(sa, `user:${B.sub}`), "A joined B's user channel"));

  let adm, admMsgs, admTyping;
  await check("admin gets analytics only: numbers, no text/names/chats", async () => {
    let reply;
    ({ ch: adm, reply } = await join(sadm, "admin:monitor"));
    admMsgs = inbox(adm, "msg");
    admTyping = inbox(adm, "typing");
    const s = reply.stats;
    assert(Number.isInteger(s.total) && Array.isArray(s.hourly), JSON.stringify(s).slice(0, 200));
    assert(!/"(text|body|author|topic|name|username)"/.test(JSON.stringify(reply)), "stats leak identities or content");
    return `total ${s.total}, 24h ${s.last_day}`;
  });

  const { ch: ca } = await join(sa, dm);
  const { ch: cb } = await join(sb, dm);
  const bMsgs = inbox(cb, "new_msg");
  const aMsgs = inbox(ca, "new_msg");

  await check("identity comes from token, not client", async () => {
    const id = randomUUID();
    const ack = await push(ca, "new_msg", { id, text: "who am i", author_id: B.sub, author_name: "Mallory" });
    stored.add(ack.id);
    assert(ack.author_id === A.sub && ack.author_name === A.name, `ack author ${ack.author_id}/${ack.author_name}`);
    assert(await waitFor(() => bMsgs.some((x) => x.m.client_id === id)), "B never got it");
    assert(bMsgs.find((x) => x.m.client_id === id).m.author_id === A.sub, "B saw a spoofed author");
    return "author forced to token owner";
  });

  const deliverLat = [];
  await check("25 DMs: all delivered once, in order, exact text", async () => {
    bMsgs.length = 0;
    const sent = [];
    const ackLat = [];
    for (let i = 0; i < 25; i++) {
      const id = randomUUID();
      const text = `seq ${i} ✓ habari 🚀 "quotes" <b>&amp;</b> ${"x".repeat(i)} `;
      const t0 = performance.now();
      sent.push({ id, text, t0 });
      await send(ca, text, id);
      ackLat.push(performance.now() - t0);
    }
    assert(await waitFor(() => bMsgs.length >= 25), `B got ${bMsgs.length}/25`);
    await sleep(200);
    assert(bMsgs.length === 25, `B got ${bMsgs.length} (duplicates?)`);
    bMsgs.forEach((x, i) => {
      assert(x.m.client_id === sent[i].id, `order broken at ${i}`);
      assert(x.m.text === sent[i].text, `text changed at ${i}`);
      deliverLat.push(x.at - sent[i].t0);
    });
    assert(aMsgs.length === 0, `sender got ${aMsgs.length} echoes of own messages`);
    return `ack ${stats(ackLat)}`;
  });
  results.push(["INFO", "DM delivery latency (send -> recipient)", stats(deliverLat)]);

  await check("rate limit: 100 instant messages -> ~30 stored, rest refused, none silently lost", async () => {
    const { ch } = await join(await open(R), "room:chattest-rate");
    const res = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => push(ch, "new_msg", { id: randomUUID(), text: `spam ${i}` })));
    const ok = res.filter((r) => r.status === "fulfilled");
    const slow = res.filter((r) => r.status === "rejected" && /slow down/.test(r.reason.message));
    ok.forEach((r) => stored.add(r.value.id));
    assert(ok.length + slow.length === 100, `${100 - ok.length - slow.length} pushes got no clear answer`);
    assert(ok.length >= 30 && ok.length <= 40, `${ok.length} accepted`);
    return `${ok.length} stored, ${slow.length} refused with "slow down"`;
  });

  const dm2 = dmOf(D, E);
  const [sd, se] = [await open(D), await open(E)];
  const { ch: cd } = await join(sd, dm2);
  let lastFromD = 0;

  await check("offline recipient catches up on rejoin (nothing dropped)", async () => {
    const ids = [];
    for (let i = 0; i < 20; i++) {
      const id = randomUUID();
      ids.push(id);
      lastFromD = (await send(cd, `while offline ${i}`, id)).seq;
    }
    const { ch, reply } = await join(se, dm2);
    ch.leave();
    const got = reply.messages.map((m) => m.client_id);
    assert(ids.every((id) => got.includes(id)) && got.length === 20, `rejoin returned ${got.length}/20`);
    return "20/20 recovered from history";
  });

  await check("unread badge counts from DB + live notice for a closed chat", async () => {
    let { ch: ue, reply } = await join(se, `user:${E.sub}`);
    assert(reply.unread[dm2] === 20, `unread ${JSON.stringify(reply.unread)}`);
    const notices = inbox(ue, "notice");
    lastFromD = (await send(cd, "are you there?")).seq;
    assert(await waitFor(() => notices.some((x) => x.m.topic === dm2 && x.m.text === "are you there?"), 2000), "no notice");
    ue.leave();
    ({ ch: ue, reply } = await join(se, `user:${E.sub}`));
    ue.leave();
    assert(reply.unread[dm2] === 21, `unread after notice ${reply.unread[dm2]}`);
    return "21 unread, notice delivered live";
  });

  await check("typing shows in the other person's chat list when the chat is closed", async () => {
    const { ch: ue } = await join(se, `user:${E.sub}`);
    const typing = inbox(ue, "typing");
    cd.push("typing", { is_typing: true });
    assert(await waitFor(() => typing.some((x) => x.m.topic === dm2 && x.m.author_name === D.name && x.m.is_typing), 2000), "no typing on user channel");
    cd.push("typing", { is_typing: false });
    ue.leave();
    return `"${D.name} typing…" reached E's app`;
  });

  await check("bell notification: one per chat, 'X sent you N messages'", async () => {
    await sleep(300); // written after the ack
    const rows = sqlRows(`SELECT title FROM notifications WHERE user_id = '${E.sub}' AND kind = 'message' AND read_at IS NULL;`);
    assert(rows.length === 1, `${rows.length} unread message notifications`);
    assert(rows[0] === `${D.name} sent you 21 messages`, rows[0]);
    return rows[0];
  });

  await check("read receipt: sender sees it live, ticks + unread saved in DB", async () => {
    const reads = inbox(cd, "messages_read");
    const { ch: ce } = await join(se, dm2);
    ce.push("read_receipt", { up_to: lastFromD });
    assert(await waitFor(() => reads.some((x) => x.m.up_to === lastFromD && x.m.reader_id === E.sub), 2000), "no live receipt");
    ce.leave();
    const { ch, reply: hist } = await join(sd, dm2);
    ch.leave();
    assert(hist.messages.every((m) => m.read_at), "some messages still unread after reload");
    const { ch: ue, reply } = await join(se, `user:${E.sub}`);
    ue.leave();
    assert(!reply.unread[dm2], `unread still ${reply.unread[dm2]}`);
    const left = sqlRows(`SELECT count(*) FROM notifications WHERE user_id = '${E.sub}' AND kind = 'message' AND read_at IS NULL;`);
    assert(left[0] === "0", `${left[0]} bell notifications still unread`);
    return "read_at stored, unread 0, bell notification cleared";
  });

  await check("retrying the same message id does not duplicate", async () => {
    const id = randomUUID();
    const a1 = await send(ca, "retry me", id);
    const a2 = await send(ca, "retry me", id);
    assert(a1.seq && a1.seq === a2.seq, `stored twice (seq ${a1.seq} vs ${a2.seq})`);
    return `same seq ${a1.seq}`;
  });

  await check("typing indicator: recipient sees who, sender gets no echo, admin sees it", async () => {
    const bTyping = inbox(cb, "user_typing");
    const aTyping = inbox(ca, "user_typing");
    admTyping.length = 0;
    ca.push("typing", { is_typing: true });
    assert(await waitFor(() => bTyping.length > 0, 2000), "B never saw typing");
    const t = bTyping[0].m;
    assert(t.user_id === A.sub && t.author_name === A.name && t.is_typing === true, JSON.stringify(t));
    assert(await waitFor(() => admTyping.some((x) => x.m.on === true), 2000), "admin never saw typing");
    assert(admTyping.every((x) => Object.keys(x.m).sort().join() === "on,ref"), "admin typing event leaks identity");
    ca.push("typing", { is_typing: false });
    assert(await waitFor(() => bTyping.some((x) => x.m.is_typing === false), 2000), "stop-typing not delivered");
    assert(aTyping.length === 0, "sender got own typing echo");
    return `"${t.author_name} is typing" delivered`;
  });

  await check("online status is global (not just the open chat)", async () => {
    const { ch: uf } = await join(await open(F), `user:${F.sub}`);
    const online = inbox(uf, "online");
    const sg = await connect(mint(G));
    await join(sg, `user:${G.sub}`);
    assert(await waitFor(() => online.some((x) => x.m.ids.includes(G.sub) && x.m.ids.includes(A.sub)), 3000), "G/A not shown online");
    sg.disconnect();
    assert(await waitFor(() => !online.at(-1).m.ids.includes(G.sub), 3000), "G still online after closing the app");
    return "joins and leaves seen by everyone";
  });

  await check("paging: 250 stored messages fetched page by page, in order, none missing", async () => {
    sql(`INSERT INTO chat_messages (client_id, topic, author_id, author_name, author_username, body)
         SELECT 'seed-' || n, 'room:chattest-page', '${F.sub}', 'Test 8', 'chattest_8', 'page ' || n FROM generate_series(1, 250) n;`);
    const { ch, reply } = await join(sockets.at(-1), "room:chattest-page");
    let all = reply.messages;
    let more = reply.has_more;
    assert(all.length === 100 && more, `first page ${all.length}, has_more ${more}`);
    let pages = 1;
    while (more) {
      const page = await push(ch, "older", { before: all[0].seq });
      all = [...page.messages, ...all];
      more = page.has_more;
      pages++;
    }
    assert(all.length === 250, `got ${all.length}/250`);
    assert(all.every((m, i) => m.text === `page ${i + 1}`), "order or content wrong");
    return `${pages} pages, 250/250`;
  });

  await check("admin counted every stored message live, anonymously", async () => {
    await waitFor(() => admMsgs.length >= stored.size, 5000);
    assert(admMsgs.length >= stored.size, `admin counted ${admMsgs.length}/${stored.size}`);
    assert(admMsgs.every((x) => Object.keys(x.m).sort().join() === "kind,store_us"), "admin msg event leaks content");
    const s = await push(adm, "stats", {});
    assert(s.last_hour >= stored.size, `stats last_hour ${s.last_hour} < ${stored.size}`);
    return `${admMsgs.length} counted, stats last hour ${s.last_hour}`;
  });

  await check(`group room fan-out: ${ROOM_USERS} members x 10 msgs`, async () => {
    const room = `room:chattest-${Date.now()}`;
    const members = await Promise.all(
      Array.from({ length: ROOM_USERS }, async (_, i) => {
        const { ch } = await join(await open(user(10 + i)), room);
        return { ch, box: inbox(ch, "new_msg") };
      }),
    );
    const sent = new Map();
    await Promise.all(
      members.map(async ({ ch }, i) => {
        for (let k = 0; k < 10; k++) {
          const id = randomUUID();
          sent.set(id, performance.now());
          await send(ch, `m${i}.${k}`, id);
        }
      }),
    );
    const expected = (ROOM_USERS - 1) * 10;
    await waitFor(() => members.every((m) => m.box.length >= expected), 10000);
    const lat = [];
    members.forEach(({ box }, i) => {
      assert(new Set(box.map((x) => x.m.id)).size === expected && box.length === expected, `member ${i} got ${box.length}/${expected}`);
      box.forEach((x) => lat.push(x.at - sent.get(x.m.client_id)));
    });
    return `${ROOM_USERS * expected} deliveries, ${stats(lat)}`;
  });

  await check("15 DM pairs talking at once x 25 msgs (aggregate throughput)", async () => {
    const pairs = await Promise.all(
      Array.from({ length: 15 }, async (_, i) => {
        const [u, v] = [user(40 + 2 * i), user(41 + 2 * i)];
        const { ch: from } = await join(await open(u), dmOf(u, v));
        const { ch: to } = await join(await open(v), dmOf(u, v));
        return { from, box: inbox(to, "new_msg") };
      }),
    );
    const sent = new Map();
    const t0 = performance.now();
    await Promise.all(
      pairs.map(async ({ from }) => {
        for (let k = 0; k < 25; k++) {
          const id = randomUUID();
          sent.set(id, performance.now());
          await send(from, `p${k}`, id);
        }
      }),
    );
    await waitFor(() => pairs.every((p) => p.box.length >= 25), 10000);
    const secs = (performance.now() - t0) / 1000;
    pairs.forEach(({ box }, i) => assert(box.length === 25 && box.every((x, k) => x.m.text === `p${k}`), `pair ${i} wrong`));
    const lat = pairs.flatMap(({ box }) => box.map((x) => x.at - sent.get(x.m.client_id)));
    return `${Math.round(375 / secs)} msg/s stored+delivered, ${stats(lat)}`;
  });

  const store = admMsgs.filter((x) => x.m.store_us).map((x) => x.m.store_us / 1000);
  results.push(["INFO", "DB write time per message (fsync before ack)", stats(store)]);

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
  for (const [status, name, detail] of results) console.log(`${status.padEnd(4)}  ${name}${detail ? `  — ${detail}` : ""}`);
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
