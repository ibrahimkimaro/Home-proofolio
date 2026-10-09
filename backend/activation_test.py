"""Unactivated accounts: 5 free messages, suspension after the 15-minute clock, support stays open; admin deletes."""
import asyncio, json, secrets, uuid
from datetime import datetime, timedelta, timezone

import requests
import websockets
from sqlalchemy import select, text, delete

from app.api.support import sign_chat_token
from app.core.database import AsyncSessionLocal
from app.core.security import hash_session_token, hash_password
from app.models.otp import OtpLog
from app.models.session import Session
from app.models.user import User

WS = "ws://realtime_chat:4000/socket/websocket"
API = "http://localhost:8000"
R = []
U = uuid.UUID


def check(label, ok, detail=""):
    R.append(ok)
    print(("PASS  " if ok else "FAIL  ") + label + (f"   [{detail}]" if detail else ""))


class Chan:
    def __init__(self, ws, topic):
        self.ws, self.topic, self.ref, self.waiters = ws, topic, 0, {}

    async def _read(self):
        async for raw in self.ws:
            jr, ref, topic, event, payload = json.loads(raw)
            if event == "phx_reply" and ref in self.waiters:
                self.waiters.pop(ref).set_result(payload)

    async def push(self, event, payload):
        self.ref += 1
        r = str(self.ref)
        fut = asyncio.get_event_loop().create_future()
        self.waiters[r] = fut
        await self.ws.send(json.dumps(["1", r, self.topic, event, payload]))
        reply = await asyncio.wait_for(fut, 10)
        return reply["status"], reply["response"]


async def open_chan(token, topic):
    ws = await websockets.connect(f"{WS}?token={token}&vsn=2.0.0")
    ch = Chan(ws, topic)
    asyncio.create_task(ch._read())
    st, resp = await ch.push("phx_join", {})
    return ch, st, resp


def topic_of(a, b):
    return "direct:" + "_".join(sorted([a, b]))


async def main():
    tag = secrets.token_hex(3)
    async with AsyncSessionLocal() as db:
        admin = await db.scalar(select(User).where(User.is_admin, User.is_active).order_by(User.created_at).limit(1))

        def mk(n, pending):
            return User(fullname=f"Act Test {n}", username=f"acttest-{n}-{tag}", email=f"acttest-{n}-{tag}@example.invalid",
                        password_hash=hash_password("x" * 12), is_active=True, is_admin=False, otp_pending=pending)

        a, b = mk("a", True), mk("b", False)
        db.add_all([a, b])
        await db.flush()
        sess = {}
        for key, u in (("admin", admin), ("a", a)):
            t = secrets.token_urlsafe(32)
            db.add(Session(user_id=u.id, token_hash=hash_session_token(t), expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
            sess[key] = t
        await db.commit()
        ids = {"admin": str(admin.id), "a": str(a.id), "b": str(b.id)}
        names = {"a": (a.fullname, a.username), "b": (b.fullname, b.username)}
    tok_a = sign_chat_token(ids["a"], *names["a"])
    ck = lambda who: {"Cookie": f"session_token={sess[who]}"}
    try:
        print("\n== five free messages to members ==")
        ch, st, _ = await open_chan(tok_a, topic_of(ids["a"], ids["b"]))
        check("unactivated member can join a chat with another member", st == "ok")
        res = []
        last = None
        for i in range(1, 7):
            st, last = await ch.push("new_msg", {"id": f"lim-{i}", "text": f"hello {i}"})
            res.append(st)
        check("messages 1-5 go through", res[:5] == ["ok"] * 5, str(res))
        check("the 6th is refused with a clear reason", res[5] == "error" and "5 free messages" in json.dumps(last), str(last))
        st, r = await ch.push("new_msg", {"id": "lim-1", "text": "hello 1"})
        check("a resend of an already stored message still gets its ack", st == "ok")
        ach, st, _ = await open_chan(tok_a, topic_of(ids["a"], ids["admin"]))
        st, r = await ach.push("new_msg", {"id": "sup-1", "text": "I need help"})
        check("support (an admin) is always open, even past the limit", st == "ok")

        print("\n== the 15-minute clock ==")
        async with AsyncSessionLocal() as db:
            otp = OtpLog(user_id=U(ids["a"]), destination=f"acttest-a-{tag}@example.invalid", channel="email", code="123456",
                         purpose="activation", delivery_status="awaiting_admin", expires_at=datetime.now(timezone.utc) + timedelta(hours=24))
            db.add(otp)
            await db.commit()
            otp_id = str(otp.id)
        r = requests.post(f"{API}/admin/otps/{otp_id}/sent", headers=ck("admin"))
        check("admin marks the code sent", r.status_code == 200, str(r.status_code))
        async with AsyncSessionLocal() as db:
            row = (await db.execute(text("SELECT activation_deadline FROM users WHERE id = :i"), {"i": ids["a"]})).scalar()
            note = (await db.execute(text("SELECT count(*) FROM notifications WHERE user_id = :i AND kind = 'activation'"), {"i": U(ids["a"])})).scalar()
        mins = (row - datetime.now(timezone.utc)).total_seconds() / 60 if row else None
        check("the clock starts: deadline is ~15 minutes away", row is not None and 14 < mins <= 15, f"{mins}")
        check("the member gets an 'activation' notification (bell + sound)", note == 1, str(note))
        r = requests.get(f"{API}/works", headers=ck("a"))
        check("not suspended yet: the app still answers", r.status_code != 403, str(r.status_code))
        async with AsyncSessionLocal() as db:
            await db.execute(text("UPDATE users SET activation_deadline = now() - interval '1 minute' WHERE id = :i"), {"i": U(ids["a"])})
            await db.commit()
        r = requests.get(f"{API}/works", headers=ck("a"))
        check("past the deadline the API is closed (403 account_suspended)", r.status_code == 403 and "account_suspended" in r.text, f"{r.status_code} {r.text[:60]}")
        r = requests.get(f"{API}/support/agent", headers=ck("a"))
        check("support still works", r.status_code == 200, str(r.status_code))
        r = requests.get(f"{API}/auth/verify-account", headers=ck("a"))
        check("the activation endpoint still works", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
        ch2, st, resp = await open_chan(tok_a, topic_of(ids["a"], ids["b"]))
        check("a suspended member can't join a chat with a member", st == "error" and "suspended" in json.dumps(resp), json.dumps(resp)[:80])
        ach2, st, _ = await open_chan(tok_a, topic_of(ids["a"], ids["admin"]))
        st2, _ = await ach2.push("new_msg", {"id": "sup-2", "text": "please send a new code"})
        check("a suspended member can still chat with support", st == "ok" and st2 == "ok")

        print("\n== admin: delete chats and codes ==")
        r = requests.get(f"{API}/admin/support", headers=ck("admin"))
        check("the support list has the thread", any(t["user_id"] == ids["a"] for t in r.json()))
        r = requests.post(f"{API}/chat/clear", headers=ck("admin"), json={"topic": topic_of(ids["a"], ids["admin"])})
        check("admin deletes the chat for themselves", r.status_code == 204, str(r.status_code))
        r = requests.get(f"{API}/admin/support", headers=ck("admin"))
        check("the thread is gone from their list", not any(t["user_id"] == ids["a"] for t in r.json()))
        async with AsyncSessionLocal() as db:
            kept = (await db.execute(text("SELECT count(*) FROM chat_messages WHERE topic = :t"), {"t": topic_of(ids["a"], ids["admin"])})).scalar()
        check("the member's copy is untouched", kept >= 2, str(kept))
        r = requests.delete(f"{API}/admin/otps/{otp_id}", headers=ck("admin"))
        check("admin deletes a code from the list", r.status_code == 204, str(r.status_code))
        r = requests.post(f"{API}/admin/otps/clear?scope=bogus", headers=ck("admin"))
        check("clear rejects an unknown scope", r.status_code == 422, str(r.status_code))
        async with AsyncSessionLocal() as db:
            for n in range(2):
                db.add(OtpLog(user_id=U(ids["b"]), destination="x@example.invalid", channel="email", code="000000", purpose="admin_test",
                              delivery_status="sent", expires_at=datetime.now(timezone.utc) - timedelta(hours=1)))
            live = OtpLog(user_id=U(ids["b"]), destination="live@example.invalid", channel="email", code="111111", purpose="admin_test",
                          delivery_status="sent", expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
            db.add(live)
            await db.commit()
            live_id = live.id
        r = requests.post(f"{API}/admin/otps/clear?scope=finished", headers=ck("admin"))
        async with AsyncSessionLocal() as db:
            still = await db.get(OtpLog, live_id)
        check("'clear finished' removes expired codes and keeps live ones", r.status_code == 200 and r.json()["removed"] >= 2 and still is not None, r.text)
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(text("DELETE FROM chat_messages WHERE author_id IN (:a, :b) OR recipient_id IN (:a, :b)"), {"a": U(ids["a"]), "b": U(ids["b"])})
            await db.execute(text("DELETE FROM chat_clears WHERE topic LIKE :p"), {"p": f"%{ids['a']}%"})
            await db.execute(delete(OtpLog).where(OtpLog.destination.in_(["live@example.invalid", "x@example.invalid"])))
            await db.execute(text("DELETE FROM users WHERE id IN (:a, :b)"), {"a": U(ids["a"]), "b": U(ids["b"])})
            await db.execute(text("DELETE FROM sessions WHERE token_hash = :h"), {"h": hash_session_token(sess["admin"])})
            await db.commit()
    print(f"\n{sum(R)}/{len(R)} checks passed")


asyncio.run(main())
