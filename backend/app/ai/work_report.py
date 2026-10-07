from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.db_context import recent_work, work_breakdown
from app.ai.python_tools import generate_chart, generate_pdf_report


async def build_work_report(db: AsyncSession, user) -> str:
    """PDF of the user's own work: totals, status and type charts, latest 25 items. Returns its sandbox path."""
    by_status, by_type = await work_breakdown(db, user.id)
    rows = await recent_work(db, user.id, limit=25)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = f"work_{user.username}_{stamp}"
    total = sum(by_status.values())
    sections = [{"heading": "Summary", "text": f"{user.fullname} has {total} work items."}]
    if total:
        sections += [
            {"heading": "By status", "chart": generate_chart(f"{stem}_status", "Work items by status", ",".join(by_status), ",".join(map(str, by_status.values())), "donut")},
            {"heading": "By type", "chart": generate_chart(f"{stem}_type", "Work items by type", ",".join(by_type), ",".join(map(str, by_type.values())), "barh")},
            {"heading": "Latest items", "table": [["Title", "Type", "Status", "Date"]] + [[t, k, s, str(d or "")] for t, k, s, d in rows]},
        ]
    return generate_pdf_report(stem, f"Work report: {user.fullname}", sections)
