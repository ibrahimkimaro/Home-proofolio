"""AI dashboards for the admin panel: POST /ai/admin/dashboard.

The admin asks in plain words ("how did sign-ups go this month?", "show me a dashboard for @amina").
The model answers by calling chart tools. Each call runs a fixed, read-only query, puts a chart on the admin's
screen and tells the model the numbers. The model chooses WHICH charts and writes the summary; it never supplies
a number itself, so a chart can not be invented.

Privacy: counts and public identity (name, username) only. No private content of any member is read:
no item titles, no descriptions, no memories, no messages.
"""
import time
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from sqlalchemy import Date, and_, cast, distinct, func, or_, select, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agent import earlier_turns, history_messages, run_agent
from app.ai.engine import WORKSPACE_NOTE, ConnectedEngine, system_prompt
from app.ai.pdf_export import dashboard_pdf
from app.ai.security_guard import sanitize_user_prompt
from app.models.business import Business, Follow
from app.models.memory import Memory
from app.models.platform import OnboardingAnswer, OnboardingRole
from app.models.profile import Profile, Visibility
from app.models.user import User
from app.models.work import WorkEvent, WorkItem

MAX_WIDGETS = 10
# Platform numbers use the same definitions as Admin > Analytics (app/api/admin_manage.py), so the two never disagree.
PLATFORM_CHARTS = ("kpis", "signups", "active_members", "captures", "shaped", "published", "items_by_kind", "items_by_state",
                   "items_by_visibility", "top_skills", "member_journey", "disciplines", "most_active_members")
MEMBER_CHARTS = ("kpis", "activity", "items_by_kind", "items_by_state", "items_by_visibility", "skills", "proof_by_type")
KIND_LABEL = {"capture": "Not shaped yet", "work": "Work", "learning": "Learning", "achievement": "Achievement", "problem": "Problem"}
VIS_LABEL = {"public": "Public", "unlisted": "Link only", "private": "Only me", "draft": "Draft"}

ADMIN_PERSONA = (
    "You are the analytics assistant inside the HOME PROOFOLIO admin panel. The admin asks in plain words and you "
    "answer by building a dashboard of charts.\n"
    "\n"
    "## How to build\n"
    "- add_platform_chart is for the whole platform, add_member_chart for one member. Each call puts a real chart "
    "on the admin's screen, filled from the database, and tells you its numbers.\n"
    "- A good dashboard has 3 to 7 charts and starts with \"kpis\". Choose only charts that answer the request. "
    "Use the period the admin asks for (7 to 365 days; default 30).\n"
    "- When the admin names a member, call find_member first. One match: use its username. Several matches: "
    "list them, ask which one, and add no charts. No match: say so.\n"
    "\n"
    "## Rules\n"
    "- Every number you write must come from a tool result in this conversation. Never estimate or invent.\n"
    "- Pie and donut charts ARE supported: pass view=\"pie\" or \"donut\" to a ranked chart. PDFs ARE supported: add the "
    "charts, then call export_pdf with a title and a short summary. Never say you cannot make a pie chart or a PDF.\n"
    "- You only read. If asked to change, delete or message something, say this assistant only builds "
    "dashboards and name the admin section that does it (Users, Works & Proofs, Messages, Activation codes, Threats).\n"
    "- You see counts only, never the private content of members.\n"
    "\n"
    "## Your reply\n"
    "After the charts are added, write 2 to 5 short sentences: what stands out, with the key numbers, and one "
    "practical suggestion. Do not list every number or draw tables: the charts show them. Reply in the admin's language."
)

_SHARED_RULES = (
    "## Rules\n"
    "- Every number you write must come from a tool result in this conversation. Never estimate or invent. If you "
    "have no tool result for it, say you don't know or offer to check.\n"
    "- When the admin names a member, call find_member first.\n"
    "- You CAN sketch real interactive Nivo visual charts in ```chart blocks, draw pie/donut/bar/line charts, and make a downloadable PDF (export_pdf, after the charts). For multi-chart dashboards (e.g. 3 or 5 charts), each chart is rendered in its own distinct card div with suggested size ('half' | 'third' | 'full'). Never say you cannot.\n"
    "- You only read. If asked to change, delete or message something, say so and name the admin section "
    "that does it (Users, Works & Proofs, Messages, Activation codes, Threats).\n"
    "- You see counts only, never the private content of members.\n"
    "- Reply in the admin's language (English or Kiswahili)."
)

CHAT_PERSONA = (
    "You are the assistant inside the HOME PROOFOLIO admin panel, in plain conversation mode. Talk with the admin "
    "naturally: answer questions, explain how the platform works, think through ideas and decisions with them.\n"
    "- Keep replies short and direct (1 to 6 sentences, a short list only when it helps).\n"
    "- When a question needs real numbers, call the chart tools to read them (each call also shows a chart). Add only "
    "the one or two charts the question needs; do not build a whole dashboard unless asked.\n"
    "\n" + _SHARED_RULES
)

PREPARE_PERSONA = (
    "You are the writing assistant inside the HOME PROOFOLIO admin panel. The admin asks you to prepare a piece of "
    "text: a monthly or weekly report, a growth story, an announcement or newsletter to members, a summary for a "
    "partner or investor, a member spotlight.\n"
    "- First gather the facts you need with the tools (usually \"kpis\" plus the one to three charts the text relies on).\n"
    "- Then write the finished piece in markdown: a title, short sections, warm and professional tone, ready to copy. "
    "Match the length to the request (a post: about 100 words; a report: up to about 400).\n"
    "- If the request is unclear (audience, period, purpose), make a sensible choice and state it in one line at the top.\n"
    "\n" + _SHARED_RULES
)

VIDEO_PERSONA = (
    "You are the video production director and storytelling assistant inside the HOME PROOFOLIO admin panel. "
    "The admin asks you to create engaging video concepts, feature reveal teasers, member showcase storyboards, "
    "or social media video scripts (Reels, TikTok, YouTube Shorts, LinkedIn) based on platform growth.\n"
    "- If relevant, pull real platform facts with add_platform_chart (e.g. signups, top skills, or member journeys).\n"
    "- Structure your output clearly:\n"
    "  1. Concept Title & Target Duration (e.g., 30s Reel, 60s Showcase)\n"
    "  2. Hook (0-3s) with visual action and punchy audio hook\n"
    "  3. Scene-by-Scene Breakdown (Scene | Visual Action & Camera Angles | Voiceover / Sound Effects | On-screen Text)\n"
    "  4. Call-To-Action (CTA) & Caption / Hashtags for publishing\n"
    "- Provide creative, cinematic direction with clear pacing and tone.\n"
    "\n" + _SHARED_RULES
)

IMAGE_PERSONA = (
    "You are the visual creative director and generative image prompt engineer inside the HOME PROOFOLIO admin panel. "
    "The admin asks you for visual assets, social promotional graphics, hero illustration concepts, "
    "or generative AI prompts for platform announcements and branding.\n"
    "- Provide vivid, production-ready AI image prompts (tailored for Midjourney, Imagen, DALL-E 3, or Stable Diffusion).\n"
    "- Structure your output clearly:\n"
    "  1. Creative Concept & Visual Theme\n"
    "  2. Exact Copy-Paste Prompt (including medium, subject, composition, lighting, camera lens, color palette, aspect ratio)\n"
    "  3. Design & Color Palette breakdown (mood hues and palette)\n"
    "  4. Text Overlay / Typography recommendations for social or web banners\n"
    "- Make sure prompts match the modern, sleek aesthetic of HOME PROOFOLIO.\n"
    "\n" + _SHARED_RULES
)

PERSONAS = {
    "build": ADMIN_PERSONA,
    "chat": CHAT_PERSONA + WORKSPACE_NOTE,
    "prepare": PREPARE_PERSONA,
    "video": VIDEO_PERSONA,
    "image": IMAGE_PERSONA,
}



def _label(value) -> str:
    """A grouped value as text: enums by their value, empty as 'none'."""
    value = getattr(value, "value", value)
    return str(value) if value not in (None, "") else "none"


def _bars(rows, labels: dict | None = None) -> list[dict]:
    return [{"label": (labels or {}).get(_label(k), _label(k)), "value": int(v)} for k, v in rows]


async def _daily(db: AsyncSession, col, where, start: date, days: int, count=None) -> list[dict]:
    """One point per day from start, zero-filled."""
    day = cast(func.date_trunc("day", col), Date)
    rows = dict((await db.execute(select(day, count if count is not None else func.count()).where(where, col >= start).group_by(day))).all())
    return [{"date": d.isoformat(), "value": int(rows.get(d, 0))} for d in (start + timedelta(days=i) for i in range(days))]


def _series_note(points: list[dict]) -> str:
    total = sum(p["value"] for p in points)
    peak = max(points, key=lambda p: p["value"]) if points else None
    last7, prev7 = sum(p["value"] for p in points[-7:]), sum(p["value"] for p in points[-14:-7])
    note = f"total {total} over {len(points)} days"
    if peak and peak["value"]:
        note += f", busiest day {peak['date']} ({peak['value']})"
    return note + f", last 7 days {last7} vs {prev7} the 7 days before"


def _bars_note(bars: list[dict]) -> str:
    return ", ".join(f"{b['label']} {b['value']}" for b in bars[:12]) or "no data yet"


class Dashboard:
    """The charts of one answer. Tools add to it; the API returns it next to the model's text."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.widgets: list[dict] = []
        self.download: dict | None = None  # the PDF made by export_pdf, if any
        self._seen: set[tuple] = set()

    def _add(self, key: tuple, widget: dict, note: str) -> str:
        if key in self._seen:
            return f"That chart is already on the dashboard. Its numbers: {note}"
        if len(self.widgets) >= MAX_WIDGETS:
            return f"The dashboard is full ({MAX_WIDGETS} charts). Write your summary now."
        self._seen.add(key)
        self.widgets.append(widget)
        return f"Added \"{widget['title']}\". {note}"

    # ---- tools --------------------------------------------------------------------------------

    async def export_pdf(self, title: str, summary: str = "") -> str:
        if not self.widgets and not summary.strip():
            return "There is nothing to put in a PDF yet. Add the charts first, then call export_pdf again."
        try:
            path = dashboard_pdf(title, summary, self.widgets)
        except Exception as e:
            return f"The PDF could not be made ({type(e).__name__}). Tell the admin and offer to try again."
        name = path.rsplit("/", 1)[-1]
        self.download = {"name": name, "label": title.strip() or "Report", "url": f"/ai/admin/report/{name}"}
        return "The PDF is ready and the admin now sees a Download PDF button under your answer. Do not write a link; just tell them it is ready."

    async def find_member(self, query: str) -> str:
        q = query.strip().lstrip("@").lower()
        if len(q) < 2:
            return "Give at least 2 letters of a name, username or email."
        exact = or_(func.lower(User.username) == q, func.lower(User.email) == q)
        rows = (await self.db.execute(
            select(User.username, User.fullname, User.created_at, User.is_active)
            .where(User.is_guest.is_(False), or_(exact, func.lower(User.username).contains(q), func.lower(User.fullname).contains(q)))
            .order_by(exact.desc(), User.created_at.desc()).limit(6)
        )).all()
        if not rows:
            return f"No member matches \"{query}\"."
        return "Matches: " + "; ".join(
            f"@{u} ({name}, joined {created.date().isoformat() if hasattr(created, 'date') else str(created)[:10]}"
            f"{'' if active else ', deactivated'})" for u, name, created, active in rows)

    async def add_platform_chart(self, chart: str, days: int = 30, title: str = "", view: str = "bars") -> str:
        db, days = self.db, max(7, min(int(days), 365))
        today = datetime.now(timezone.utc).date()
        start = today - timedelta(days=days - 1)
        period = f"last {days} days"
        shaped = WorkItem.work_type != "capture"
        public_work = and_(WorkItem.visibility == Visibility.PUBLIC, shaped)

        async def count(model, *where) -> int:
            return await db.scalar(select(func.count()).select_from(model).where(*where)) or 0

        async def active(a: date, b: date) -> int:
            return await db.scalar(select(func.count(distinct(WorkEvent.user_id))).where(WorkEvent.created_at >= a, WorkEvent.created_at < b)) or 0

        async def columns(name: str, col, where, mode: str = "sum", counter=None) -> str:
            points = await _daily(db, col, where, start, days, counter)
            total = sum(p["value"] for p in points) if mode == "sum" else await active(start, today + timedelta(days=1))
            widget = {"type": "columns", "title": title or f"{name}, {period}", "total": total, "points": points, "mode": mode}
            note = _series_note(points)
            if mode == "avg":  # a member active on several days is one member: the daily numbers must not be added up
                peak = max(points, key=lambda p: p["value"])
                note = (f"{total} different members were active in the {period}; on average {sum(p['value'] for p in points) / len(points):.1f} "
                        f"per day; busiest day {peak['date']} ({peak['value']})")
            return self._add(("platform", chart, days), widget, note)

        def bars(name: str, data: list[dict], empty: str = "No data yet") -> str:
            return self._add(("platform", chart), {"type": "bars", "title": title or name, "bars": data, "empty": empty, "view": view}, _bars_note(data))

        if chart == "kpis":
            prev = start - timedelta(days=days)
            members = await count(User)
            new, new_prev = await count(User, User.created_at >= start), await count(User, User.created_at >= prev, User.created_at < start)
            act, act_prev = await active(start, today + timedelta(days=1)), await active(prev, start)
            items, public = await count(WorkItem), await count(WorkItem, public_work)
            proofs = int(await db.scalar(select(func.coalesce(func.sum(func.jsonb_array_length(WorkItem.evidence_links)), 0))) or 0)
            profiles, businesses, follows = await count(Profile, Profile.visibility == Visibility.PUBLIC), await count(Business), await count(Follow)
            cards = [
                {"label": "New members", "value": new, "prev": new_prev},
                {"label": "Active members", "value": act, "prev": act_prev},
                {"label": "Public items", "value": public, "hint": f"{items} items in total"},
                {"label": "Proofs attached", "value": proofs, "hint": f"{profiles} public profiles · {follows} follows"},
            ]
            note = (f"{period}: new members {new} (previous period {new_prev}), active members {act} (previous {act_prev}). "
                    f"All time: {members} members, {items} items, {public} public items, {proofs} proofs, "
                    f"{profiles} public profiles, {businesses} businesses, {follows} follows.")
            return self._add(("platform", chart, days), {"type": "kpis", "title": title or f"Platform, {period}", "items": cards}, note)
        if chart == "signups":
            return await columns("Sign-ups", User.created_at, true())
        if chart == "active_members":
            return await columns("Active members per day", WorkEvent.created_at, true(), "avg", func.count(distinct(WorkEvent.user_id)))
        if chart == "captures":
            return await columns("Captured", WorkEvent.created_at, WorkEvent.field == "created")
        if chart == "shaped":
            return await columns("Captures shaped", WorkEvent.created_at, and_(WorkEvent.field == "work_type", WorkEvent.old_value == "capture"))
        if chart == "published":
            return await columns("Published", WorkEvent.created_at, and_(WorkEvent.field == "visibility", WorkEvent.new_value == "public"))
        if chart in ("items_by_kind", "items_by_state", "items_by_visibility"):
            col, name, labels = {"items_by_kind": (WorkItem.work_type, "Items by type", KIND_LABEL), "items_by_state": (WorkItem.status, "Items by state", None),
                                 "items_by_visibility": (WorkItem.visibility, "Items by visibility", VIS_LABEL)}[chart]
            return bars(name, _bars((await db.execute(select(col, func.count()).group_by(col).order_by(func.count().desc()).limit(14))).all(), labels))
        if chart == "top_skills":
            skill = func.jsonb_array_elements_text(WorkItem.skills).table_valued("value").alias("skill")
            rows = (await db.execute(select(skill.c.value, func.count()).select_from(WorkItem).join(skill, true())
                                     .group_by(skill.c.value).order_by(func.count().desc()).limit(10))).all()
            return bars("Top skills", _bars(rows), "No skills added yet")
        if chart == "disciplines":
            names = dict((await db.execute(select(OnboardingRole.key, OnboardingRole.label))).all())
            picked = OnboardingAnswer.answer["value"].astext
            rows = (await db.execute(select(picked, func.count()).where(OnboardingAnswer.question_key == "discipline")
                                     .group_by(picked).order_by(func.count().desc()).limit(12))).all()
            return bars("Disciplines chosen at sign-up", _bars(rows, names), "No sign-ups through onboarding yet")
        if chart == "most_active_members":
            rows = (await db.execute(select(User.username, func.count()).join(WorkEvent, WorkEvent.user_id == User.id)
                                     .where(WorkEvent.created_at >= start).group_by(User.username).order_by(func.count().desc()).limit(8))).all()
            data = [{"label": f"@{u}", "value": int(n)} for u, n in rows]
            return self._add(("platform", chart, days), {"type": "bars", "title": title or f"Most active members, {period}", "bars": data,
                                                         "empty": "No activity in this period", "view": view}, _bars_note(data) + " (actions on their items)")
        if chart == "member_journey":
            has = lambda *where: select(func.count(distinct(WorkItem.user_id))).where(*where)  # noqa: E731
            steps = [
                {"step": "Signed up", "value": await count(User)},
                {"step": "Captured something", "value": await db.scalar(has(true())) or 0},
                {"step": "Shaped an item", "value": await db.scalar(has(shaped)) or 0},
                {"step": "Added proof", "value": await db.scalar(has(shaped, func.jsonb_array_length(WorkItem.evidence_links) > 0)) or 0},
                {"step": "Published", "value": await db.scalar(has(public_work)) or 0},
            ]
            return self._add(("platform", chart), {"type": "funnel", "title": title or "Member journey", "steps": steps},
                             ", ".join(f"{s['step']} {s['value']}" for s in steps) + " (members, all time)")
        return f"Unknown chart \"{chart}\". Use one of: {', '.join(PLATFORM_CHARTS)}."

    async def add_member_chart(self, username: str, chart: str, days: int = 90, title: str = "", view: str = "bars") -> str:
        db, days = self.db, max(7, min(int(days), 365))
        handle = username.strip().lstrip("@").lower()
        user = await db.scalar(select(User).where(func.lower(User.username) == handle, User.is_guest.is_(False)))
        if user is None:
            return f"No member has the username \"{username}\". Call find_member to look them up."
        mine = WorkItem.user_id == user.id
        today = datetime.now(timezone.utc).date()
        start = today - timedelta(days=days - 1)
        who = f"@{user.username}"

        def bars(name: str, data: list[dict], empty: str = "No data yet") -> str:
            return self._add((who, chart), {"type": "bars", "title": title or f"{name}, {who}", "bars": data, "empty": empty, "view": view}, _bars_note(data))

        if chart == "kpis":
            async def count(*where) -> int:
                return await db.scalar(select(func.count()).select_from(WorkItem).where(mine, *where)) or 0
            items, shaped = await count(), await count(WorkItem.work_type != "capture")
            public = await count(WorkItem.visibility == Visibility.PUBLIC, WorkItem.work_type != "capture")
            done = await count(WorkItem.status.in_(("completed", "deployed", "achieved", "solved", "accepted", "closed")))
            proofs = int(await db.scalar(select(func.coalesce(func.sum(func.jsonb_array_length(WorkItem.evidence_links)), 0)).where(mine)) or 0)
            memories = await db.scalar(select(func.count()).select_from(Memory).where(Memory.user_id == user.id)) or 0
            followers = await db.scalar(select(func.count()).select_from(Follow).where(Follow.user_id == user.id)) or 0
            last = await db.scalar(select(func.max(WorkEvent.created_at)).where(WorkEvent.user_id == user.id))
            joined = user.created_at.date().isoformat() if hasattr(user.created_at, "date") else str(user.created_at)[:10]
            last_day = (last.date().isoformat() if hasattr(last, "date") else str(last)[:10]) if last else "never"
            cards = [
                {"label": "Items", "value": items, "hint": f"{shaped} shaped · {items - shaped} quick captures"},
                {"label": "Public items", "value": public, "hint": f"{done} finished"},
                {"label": "Proofs attached", "value": proofs, "hint": f"{memories} daily memories"},
                {"label": "Followers", "value": followers, "hint": f"Joined {joined}"},
            ]
            note = (f"{user.fullname} ({who}), joined {joined}, account {'active' if user.is_active else 'deactivated'}"
                    f"{', not activated yet' if user.otp_pending else ''}, last activity {last_day}. Items {items} ({shaped} shaped, "
                    f"{items - shaped} quick captures), public {public}, finished {done}, proofs {proofs}, daily memories {memories}, followers {followers}.")
            return self._add((who, chart), {"type": "kpis", "title": title or f"{user.fullname} ({who})", "items": cards}, note)
        if chart == "activity":
            points = await _daily(db, WorkEvent.created_at, WorkEvent.user_id == user.id, start, days)
            widget = {"type": "columns", "title": title or f"Activity of {who}, last {days} days", "total": sum(p["value"] for p in points), "points": points, "mode": "sum"}
            return self._add((who, chart, days), widget, _series_note(points) + " (actions on their items)")
        if chart in ("items_by_kind", "items_by_state", "items_by_visibility"):
            col, name, labels = {"items_by_kind": (WorkItem.work_type, "Items by type", KIND_LABEL), "items_by_state": (WorkItem.status, "Items by state", None),
                                 "items_by_visibility": (WorkItem.visibility, "Items by visibility", VIS_LABEL)}[chart]
            return bars(name, _bars((await db.execute(select(col, func.count()).where(mine).group_by(col).order_by(func.count().desc()).limit(14))).all(), labels))
        if chart == "skills":
            skill = func.jsonb_array_elements_text(WorkItem.skills).table_valued("value").alias("skill")
            rows = (await db.execute(select(skill.c.value, func.count()).select_from(WorkItem).join(skill, true()).where(mine)
                                     .group_by(skill.c.value).order_by(func.count().desc()).limit(10))).all()
            return bars("Skills", _bars(rows), "No skills added yet")
        if chart == "proof_by_type":
            proof = func.jsonb_array_elements(WorkItem.evidence_links).table_valued("value").alias("proof")
            kind = cast(proof.c.value, JSONB)["type"].astext
            rows = (await db.execute(select(kind, func.count()).select_from(WorkItem).join(proof, true()).where(mine)
                                     .group_by(kind).order_by(func.count().desc()).limit(13))).all()
            return bars("Proof by type", _bars(rows), "No proof attached yet")
        return f"Unknown chart \"{chart}\". Use one of: {', '.join(MEMBER_CHARTS)}."


# ---- what the model is told it may pass ------------------------------------------------------------

class FindMemberArgs(BaseModel):
    query: str = Field(description="Part of the member's name, username or email.")


VIEW_HELP = ("How a ranked chart (items_by_*, top_skills, disciplines, most_active_members, skills, proof_by_type) is drawn: "
             "bars, pie or donut. Use pie or donut when the admin asks for a pie chart; ignored for the other charts.")


class PlatformChartArgs(BaseModel):
    chart: Literal[PLATFORM_CHARTS] = Field(description=(  # type: ignore[valid-type]
        "kpis = headline numbers with change vs the previous period. signups, active_members, captures, shaped, published = "
        "one column per day. items_by_kind, items_by_state, items_by_visibility, top_skills, disciplines, most_active_members = "
        "ranked bars. member_journey = funnel from sign-up to publishing."))
    days: int = Field(30, ge=7, le=365, description="Period in days for kpis, the per-day charts and most_active_members.")
    title: str = Field("", max_length=80, description="Optional chart title. Leave empty for the standard one.")
    view: Literal["bars", "pie", "donut"] = Field("bars", description=VIEW_HELP)


class MemberChartArgs(BaseModel):
    username: str = Field(description="The member's exact username, as returned by find_member.")
    chart: Literal[MEMBER_CHARTS] = Field(description=(  # type: ignore[valid-type]
        "kpis = their headline numbers. activity = their actions per day. items_by_kind, items_by_state, "
        "items_by_visibility, skills, proof_by_type = ranked bars."))
    days: int = Field(90, ge=7, le=365, description="Period in days for the activity chart.")
    title: str = Field("", max_length=80, description="Optional chart title. Leave empty for the standard one.")
    view: Literal["bars", "pie", "donut"] = Field("bars", description=VIEW_HELP)


class ExportPdfArgs(BaseModel):
    title: str = Field(max_length=120, description="Title of the PDF, e.g. \"Platform report, last 30 days\".")
    summary: str = Field("", max_length=4000, description="The written part of the report in short markdown (use # headings). Only numbers from tool results.")


def _tools(board: Dashboard) -> list[StructuredTool]:
    return [
        StructuredTool.from_function(coroutine=board.find_member, name="find_member", args_schema=FindMemberArgs,
                                     description="Look up members by name, username or email. Returns usernames. Adds no chart."),
        StructuredTool.from_function(coroutine=board.add_platform_chart, name="add_platform_chart", args_schema=PlatformChartArgs,
                                     description="Add one chart about the whole platform to the admin's dashboard and get its numbers."),
        StructuredTool.from_function(coroutine=board.export_pdf, name="export_pdf", args_schema=ExportPdfArgs,
                                     description="Turn the dashboard (all charts added so far) plus your short written summary into a PDF "
                                                 "the admin can download. Call it LAST, after the charts, when the admin asks for a PDF, a report to download or to export."),
        StructuredTool.from_function(coroutine=board.add_member_chart, name="add_member_chart", args_schema=MemberChartArgs,
                                     description="Add one chart about a single member to the admin's dashboard and get its numbers."),
    ]


async def build_dashboard(engine: ConnectedEngine, db: AsyncSession, admin_name: str, prompt: str, history: list[str],
                          mode: str = "chat", admin_id=None) -> dict:
    """One admin request -> {"reply": the model's text, "widgets": the charts, "seconds": ...}.

    mode: "chat" = plain conversation (default), "build" = dashboard of charts, "prepare" = written piece, "video" = storyboard, "image" = prompt design.
    """
    from app.ai.usage_monitor import record_ai_usage
    from app.ai.engine import load_ai_config_from_db
    await load_ai_config_from_db(db)
    started = time.perf_counter()

    prompt = sanitize_user_prompt(prompt.strip())
    board = Dashboard(db)
    system = system_prompt(persona=PERSONAS.get(mode, CHAT_PERSONA), who=f"The admin {admin_name}.")
    try:
        result = await run_agent(engine.llm, system, history_messages(earlier_turns(history, prompt)), prompt, _tools(board), max_steps=6)
        elapsed_sec = round(time.perf_counter() - started, 2)
        await record_ai_usage(
            db,
            user_id=admin_id,
            feature=f"admin_{mode}",
            endpoint="/ai/admin/dashboard",
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            total_tokens=result.total_tokens,
            latency_ms=int(elapsed_sec * 1000),
            status="success",
        )
        return {"reply": result.text, "widgets": board.widgets, "download": board.download, "tools_used": result.tools_used, "seconds": elapsed_sec}
    except Exception as exc:
        elapsed_sec = round(time.perf_counter() - started, 2)
        status_flag = "rate_limited" if "429" in str(exc) or "quota" in str(exc).lower() else "error"
        await record_ai_usage(
            db,
            user_id=admin_id,
            feature=f"admin_{mode}",
            endpoint="/ai/admin/dashboard",
            latency_ms=int(elapsed_sec * 1000),
            status=status_flag,
            error_message=str(exc)[:400],
        )
        raise

