"""Stars, comments, CV requests, visitor messages and the owner's overview, against the live API (run in the backend container)."""
import asyncio, secrets, uuid
from datetime import datetime, timedelta, timezone

import requests
from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password, hash_session_token
from app.models.cv import Cv
from app.models.profile import Profile, Visibility
from app.models.session import Session
from app.models.user import User
from app.models.work import WorkItem

API = "http://localhost:8000"
R = []
U = uuid.UUID


def check(label, ok, detail=""):
    R.append(ok)
    print(("PASS  " if ok else "FAIL  ") + label + (f"   [{detail}]" if detail else ""))


async def main():
    tag = secrets.token_hex(3)
    ids, tok = {}, {}
    async with AsyncSessionLocal() as db:
        async def mk(key, email=None):
            u = User(fullname=f"Eng {key}", username=f"eng-{key}-{tag}", email=email or f"eng-{key}-{tag}@example.invalid", password_hash=hash_password("x" * 12), is_active=True)
            db.add(u)
            await db.flush()
            db.add(Profile(user_id=u.id, username=u.username, display_name=f"Eng {key.title()}", visibility=Visibility.PUBLIC))
            t = secrets.token_urlsafe(32)
            db.add(Session(user_id=u.id, token_hash=hash_session_token(t), expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
            ids[key], tok[key] = u.id, t
            return u

        owner = await mk("owner")
        await mk("fan", email="ibrahimkimaro01+engtest@gmail.com")
        await mk("other")
        pub = WorkItem(user_id=owner.id, title="Public thing", work_type="work", visibility=Visibility.PUBLIC, status="completed")
        priv = WorkItem(user_id=owner.id, title="Private thing", work_type="work", visibility=Visibility.PRIVATE, status="completed")
        db.add_all([pub, priv])
        await db.commit()
        wid, pid = str(pub.id), str(priv.id)
        uname = owner.username
    H = lambda who: {"Cookie": f"session_token={tok[who]}"}
    notes = lambda kind: None

    async def count(sql, **p):
        async with AsyncSessionLocal() as db:
            return (await db.execute(text(sql), p)).scalar()

    try:
        print("\n== stars ==")
        r = requests.get(f"{API}/engage/profile/{uname}")
        check("a visitor can read the status (not signed in)", r.status_code == 200 and r.json()["signed_in"] is False and r.json()["likes"] == 0, r.text[:80])
        r = requests.put(f"{API}/engage/profile/{uname}/like")
        check("starring needs an account", r.status_code == 401, str(r.status_code))
        r = requests.put(f"{API}/engage/profile/{uname}/like", headers=H("fan"))
        check("a member stars the profile", r.status_code == 204, str(r.status_code))
        r = requests.put(f"{API}/engage/profile/{uname}/like", headers=H("fan"))
        check("starring twice is harmless", r.status_code == 204)
        n = await count("SELECT count(*) FROM notifications WHERE user_id = :o AND kind = 'like'", o=ids["owner"])
        check("the owner is notified once", n == 1, str(n))
        r = requests.get(f"{API}/engage/profile/{uname}", headers=H("fan"))
        check("status shows 1 star, liked by me", r.json()["likes"] == 1 and r.json()["liked"] is True)
        r = requests.put(f"{API}/engage/profile/{uname}/like", headers=H("owner"))
        check("you can't star your own profile", r.status_code == 422, str(r.status_code))
        r = requests.delete(f"{API}/engage/profile/{uname}/like", headers=H("fan"))
        check("unstar", r.status_code == 204 and requests.get(f"{API}/engage/profile/{uname}", headers=H("fan")).json()["likes"] == 0)
        r = requests.put(f"{API}/engage/work/{wid}/like", headers=H("fan"))
        check("star a public work", r.status_code == 204)
        r = requests.put(f"{API}/engage/work/{pid}/like", headers=H("fan"))
        check("a private work can't be starred (404)", r.status_code == 404, str(r.status_code))

        print("\n== comments ==")
        r = requests.post(f"{API}/engage/work/{wid}/comments", json={"body": "hi"})
        check("commenting needs an account", r.status_code == 401)
        r = requests.post(f"{API}/engage/work/{wid}/comments", headers=H("fan"), json={"body": "  Great work!  "})
        cid = r.json().get("id")
        check("a member comments (text is trimmed)", r.status_code == 201 and r.json()["body"] == "Great work!" and r.json()["mine"] is True, r.text[:80])
        r = requests.post(f"{API}/engage/work/{wid}/comments", headers=H("fan"), json={"body": "   "})
        check("an empty comment is refused", r.status_code == 422, str(r.status_code))
        n = await count("SELECT count(*) FROM notifications WHERE user_id = :o AND kind = 'comment'", o=ids["owner"])
        check("the owner is notified of the comment", n == 1, str(n))
        r = requests.get(f"{API}/engage/work/{wid}", headers=H("owner"))
        c = r.json()["comments"][0]
        check("the owner sees it and may delete it", c["author"]["name"] == "Eng Fan" and c["can_delete"] is True and r.json()["self"] is True)
        r = requests.get(f"{API}/engage/work/{wid}", headers=H("other"))
        check("a stranger can't delete it", r.json()["comments"][0]["can_delete"] is False)
        r = requests.delete(f"{API}/engage/comments/{cid}", headers=H("other"))
        check("...and the server agrees (403)", r.status_code == 403, str(r.status_code))
        requests.post(f"{API}/engage/profile/{uname}/comments", headers=H("other"), json={"body": "Nice portfolio"})
        r = requests.delete(f"{API}/engage/comments/{cid}", headers=H("owner"))
        check("the owner deletes it", r.status_code == 204)

        print("\n== ask for the CV ==")
        body = {"name": "Recruiter Rita", "email": "rita@example.com", "message": "Hiring a dev"}
        r = requests.post(f"{API}/u/{uname}/cv-request", json={"name": "No Email"})
        check("a guest must give an email", r.status_code == 422, str(r.status_code))
        r = requests.post(f"{API}/u/{uname}/cv-request", json=body)
        check("a guest asks for the CV", r.status_code == 201, str(r.status_code))
        r = requests.post(f"{API}/u/{uname}/cv-request", json=body)
        check("asking twice is a 409", r.status_code == 409, str(r.status_code))
        before = await count("SELECT count(*) FROM cv_requests WHERE owner_id = :o", o=ids["owner"])
        r = requests.post(f"{API}/u/{uname}/cv-request", json={**body, "email": "bot@example.com", "website": "http://spam"})
        after = await count("SELECT count(*) FROM cv_requests WHERE owner_id = :o", o=ids["owner"])
        check("the honeypot looks like success but stores nothing", r.status_code == 201 and before == after)
        r = requests.post(f"{API}/u/{uname}/cv-request", headers=H("fan"), json={"message": "From a member"})
        check("a member asks (name and email come from the account)", r.status_code == 201, r.text[:80])
        r = requests.post(f"{API}/u/{uname}/cv-request", headers=H("owner"), json={})
        check("the owner can't ask themself", r.status_code == 422)
        n = await count("SELECT count(*) FROM notifications WHERE user_id = :o AND kind = 'cv_request'", o=ids["owner"])
        check("the owner is notified of each request", n == 2, str(n))
        r = requests.get(f"{API}/me/cv-requests", headers=H("owner"))
        reqs = r.json()
        check("the owner lists both, as pending", len(reqs) == 2 and all(x["status"] == "pending" for x in reqs))
        guest_req = next(x for x in reqs if x["member_username"] is None)
        member_req = next(x for x in reqs if x["member_username"])
        r = requests.post(f"{API}/me/cv-requests/{member_req['id']}/send", headers=H("owner"))
        check("sending needs a signed CV (409)", r.status_code == 409, r.text[:80])
        async with AsyncSessionLocal() as db:
            db.add(Cv(user_id=ids["owner"], data={}, signature="data:image/png;base64,AAAA", signed_at=datetime.now(timezone.utc)))
            await db.commit()
        r = requests.post(f"{API}/me/cv-requests/{member_req['id']}/send", headers={**H("owner"), "Origin": "https://example.test"})
        j = r.json()
        check("with a signed CV the owner sends it", r.status_code == 200 and j["status"] == "sent" and j["link"].startswith("https://example.test/cv/s/"), r.text[:120])
        n = await count("SELECT count(*) FROM notifications WHERE user_id = :f AND kind = 'cv_sent'", f=ids["fan"])
        check("the member gets the CV in their notifications", n == 1, str(n))
        r = requests.post(f"{API}/me/cv-requests/{guest_req['id']}/decline", headers=H("owner"))
        check("the owner declines the other", r.status_code == 200)
        r = requests.post(f"{API}/me/cv-requests/{guest_req['id']}/decline", headers=H("other"))
        check("someone else can't answer a request (404)", r.status_code == 404)

        print("\n== visitor messages ==")
        r = requests.post(f"{API}/u/{uname}/message", json={"name": "Guest Gus", "email": "gus@example.com", "message": "Can we talk?"})
        check("a guest leaves a message", r.status_code == 201, str(r.status_code))
        r = requests.post(f"{API}/u/{uname}/message", headers=H("fan"), json={"message": "hello there"})
        check("a signed-in visitor is told to chat instead (409)", r.status_code == 409)
        r = requests.get(f"{API}/me/visitor-messages", headers=H("owner"))
        m = r.json()[0]
        check("the owner reads it, unread", m["name"] == "Guest Gus" and m["read"] is False)
        r = requests.post(f"{API}/me/visitor-messages/{m['id']}/read", headers=H("owner"))
        check("mark read", r.status_code == 204 and requests.get(f"{API}/me/visitor-messages", headers=H("owner")).json()[0]["read"] is True)

        print("\n== the owner's overview ==")
        r = requests.get(f"{API}/me/engagement", headers=H("owner"))
        e = r.json()
        t = e["totals"]
        w = next(x for x in e["works"] if x["id"] == wid)
        check("totals add up", t["work_likes"] == 1 and t["profile_comments"] == 1 and t["work_comments"] == 0, str(t))
        check("per work: who starred it", w["like_count"] == 1 and w["likes"][0]["name"] == "Eng Fan")
        check("the private work is listed too (owner only)", any(x["id"] == pid for x in e["works"]))
        check("profile comments name the person", e["profile"]["comments"][0]["name"] == "Eng Other")
        r = requests.get(f"{API}/me/engagement", headers=H("fan"))
        check("another member sees only their own (nothing)", r.json()["totals"]["work_likes"] == 0)
        r = requests.delete(f"{API}/me/visitor-messages/{m['id']}", headers=H("owner"))
        check("the owner deletes the message", r.status_code == 204)
    finally:
        async with AsyncSessionLocal() as db:
            for k, v in ids.items():
                await db.execute(text("DELETE FROM sessions WHERE user_id = :i"), {"i": v})
            await db.execute(text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": list(ids.values())})
            await db.execute(text("DELETE FROM likes WHERE target_id = ANY(:ids)"), {"ids": [ids["owner"]]})
            await db.commit()
    print(f"\n{sum(R)}/{len(R)} checks passed")


asyncio.run(main())
