"""PDF files the AI makes for people to download.

    text_to_sections("# Title\\nSome text")                      -> sections for generate_pdf_report
    dashboard_pdf(title, summary, widgets)                        -> "reports/admin_20261008_121500.pdf"
    user_pdf(user_id, title, text)                                -> "reports/u<32 hex>_20261008_121500.pdf"

Files live in the AI sandbox (app/ai/security_guard.py). Who may download what is decided by the file name:
members only get names that start with their own id (see the /ai/report/file route), admins only get "admin_" names.
"""
import re
from datetime import datetime

from app.ai.python_tools import generate_chart, generate_pdf_report

ADMIN_FILE = re.compile(r"^admin_\d{8}_\d{6}\.pdf$")
USER_FILE = re.compile(r"^u[0-9a-f]{32}_\d{8}_\d{6}\.pdf$")
MAX_CHART_POINTS = 12


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _plain(text: str) -> str:
    """Markdown emphasis and list markers are not drawn by the PDF writer: drop them."""
    text = re.sub(r"(\*\*|__|`)", "", text)
    return re.sub(r"^\s*[-*]\s+", "• ", text, flags=re.M)


def text_to_sections(text: str) -> list[dict]:
    """Markdown-ish text -> [{"heading", "text"}]: each # heading starts a section."""
    sections: list[dict] = []
    heading, lines = "", []

    def flush():
        body = _plain("\n".join(lines)).strip()
        if heading or body:
            sections.append({"heading": heading, "text": body})

    for line in text.splitlines():
        m = re.match(r"^\s*#{1,4}\s+(.*)$", line)
        if m:
            flush()
            heading, lines = _plain(m.group(1)).strip(), []
        else:
            lines.append(line)
    flush()
    return sections or [{"heading": "", "text": _plain(text).strip()}]


def user_pdf(user_id, title: str, text: str) -> str:
    stem = f"u{user_id.hex}_{_stamp()}"
    return generate_pdf_report(stem, title.strip()[:120] or "Report", text_to_sections(text))


def _csv(items) -> str:
    return ",".join(str(i).replace(",", " ") for i in items)


def _chart(stem: str, title: str, labels: list, values: list, kind: str) -> str | None:
    if not labels or len(labels) != len(values) or not any(values):
        return None
    try:
        return generate_chart(stem, title, _csv(labels), _csv(values), kind)
    except ValueError:
        return None


def _widget_sections(widget: dict, stem: str) -> list[dict]:
    kind, title = widget.get("type"), widget.get("title") or "Chart"
    if kind == "kpis":
        rows = [["Measure", "Value", "Before / note"]]
        for it in widget.get("items", []):
            rows.append([it.get("label", ""), str(it.get("value", "")), str(it.get("prev", it.get("hint", "")) if it.get("prev") is not None else it.get("hint", ""))])
        return [{"heading": title, "table": rows}]
    if kind == "bars":
        bars = widget.get("bars", [])
        shape = {"pie": "pie", "donut": "donut"}.get(widget.get("view"), "barh")
        chart = _chart(stem, title, [b["label"] for b in bars], [b["value"] for b in bars], shape)
        return [{"heading": title, **({"chart": chart} if chart else {"text": widget.get("empty", "No data yet")})}]
    if kind == "columns":
        points = widget.get("points", [])
        step = max(1, -(-len(points) // MAX_CHART_POINTS))  # a long period is summed into at most 12 bars
        groups = [points[i:i + step] for i in range(0, len(points), step)]
        chart = _chart(stem, title, [g[0]["date"][5:] for g in groups], [sum(p["value"] for p in g) for g in groups], "bar")
        return [{"heading": title, "text": f"Total: {widget.get('total', 0)}", **({"chart": chart} if chart else {})}]
    if kind == "funnel":
        steps = widget.get("steps", [])
        chart = _chart(stem, title, [s["step"] for s in steps], [s["value"] for s in steps], "barh")
        return [{"heading": title, **({"chart": chart} if chart else {"text": "No data yet"})}]
    return []


def dashboard_pdf(title: str, summary: str, widgets: list[dict]) -> str:
    """The admin's dashboard as an A4 PDF: the summary, then every chart as a picture or table."""
    stem = f"admin_{_stamp()}"
    sections = text_to_sections(summary) if summary.strip() else []
    for i, widget in enumerate(widgets):
        sections += _widget_sections(widget, f"{stem}_c{i}")
    return generate_pdf_report(stem, title.strip()[:120] or "Admin report", sections or [{"heading": "", "text": "No data."}])
