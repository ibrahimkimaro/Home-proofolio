"""PDF reading, graph extraction, chart and PDF-report generation. Everything stays inside ai_sandbox/."""
import os
from datetime import datetime
from xml.sax.saxutils import escape

import pymupdf
import pymupdf4llm
import matplotlib
matplotlib.use("Agg")  # no GUI backend: saves CPU and works headless
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.ai.security_guard import enforce_sandbox_path

PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"]
CHART_KINDS = ("bar", "barh", "line", "pie", "donut")
MIN_GRAPH_PX = 150  # smaller embedded images are icons/logos, not graphs
VECTOR_GRAPH_MIN_PATHS = 40  # a page with this many drawn paths probably holds a vector chart
CHART_STYLE = {
    "font.family": "DejaVu Sans", "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": "#CBD5E1", "axes.labelcolor": "#334155", "axes.titleweight": "bold",
    "axes.titlesize": 13, "axes.titlepad": 14, "xtick.color": "#475569", "ytick.color": "#475569",
    "axes.grid": True, "grid.color": "#E2E8F0", "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.prop_cycle": matplotlib.cycler(color=PALETTE),
}


def _pdf_path(file_name: str) -> str:
    path = enforce_sandbox_path(file_name, "reports")
    if not os.path.exists(path):
        raise FileNotFoundError(f"'{os.path.basename(file_name)}' is not in ai_sandbox/reports/")
    return path


def read_pdf(file_name: str, max_pages: int = 50) -> str:
    """PDF in ai_sandbox/reports/ as markdown (headings, lists, tables), up to max_pages pages."""
    path = _pdf_path(file_name)
    with pymupdf.open(path) as doc:
        total = len(doc)
    md = pymupdf4llm.to_markdown(path, pages=list(range(min(total, max_pages))))
    return md + (f"\n\n(first {max_pages} of {total} pages)" if total > max_pages else "")


def extract_pdf_graphs(file_name: str) -> list[str]:
    """Saves graphs found in a PDF as PNGs in ai_sandbox/charts/: embedded images, and a render
    of any page that is mostly vector drawing. Returns their sandbox-relative paths."""
    stem = os.path.splitext(os.path.basename(file_name))[0]
    found = []
    with pymupdf.open(_pdf_path(file_name)) as doc:
        for page in doc:
            n = page.number + 1
            for i, img in enumerate(page.get_images(full=True)):
                pix = pymupdf.Pixmap(doc, img[0])
                if pix.width < MIN_GRAPH_PX or pix.height < MIN_GRAPH_PX:
                    continue
                if pix.n - pix.alpha >= 4:  # CMYK -> RGB so PNG can store it
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                out = enforce_sandbox_path(f"{stem}_p{n}_img{i + 1}.png", "charts")
                pix.save(out)
                found.append(f"charts/{os.path.basename(out)}")
            if len(page.get_drawings()) >= VECTOR_GRAPH_MIN_PATHS:
                out = enforce_sandbox_path(f"{stem}_p{n}_page.png", "charts")
                page.get_pixmap(dpi=150).save(out)
                found.append(f"charts/{os.path.basename(out)}")
    return found


def generate_chart(output_name: str, title: str, labels_csv: str, values_csv: str,
                   kind: str = "bar", xlabel: str = "", ylabel: str = "") -> str:
    """Professional PNG chart (200 dpi, clean style, value labels). Raises ValueError on bad input."""
    if kind not in CHART_KINDS:
        raise ValueError(f"kind must be one of {CHART_KINDS}")
    labels = [x.strip() for x in labels_csv.split(",") if x.strip()]
    try:
        values = [float(x) for x in values_csv.split(",") if x.strip()]
    except ValueError:
        raise ValueError("values must be numbers separated by commas")
    if not labels or len(labels) != len(values):
        raise ValueError("labels and values must be non-empty and the same count")

    name = output_name if output_name.lower().endswith(".png") else output_name + ".png"
    out = enforce_sandbox_path(name, "charts")
    fmt = lambda v: f"{v:,.0f}" if v == int(v) else f"{v:,.2f}"
    with plt.rc_context(CHART_STYLE):
        fig, ax = plt.subplots(figsize=(8, 4.8))
        try:
            if kind in ("pie", "donut"):
                ax.grid(False)
                ax.pie(values, labels=labels, colors=PALETTE, startangle=90, counterclock=False,
                       autopct=lambda p: f"{p:.0f}%" if p >= 4 else "",
                       wedgeprops={"width": 0.45 if kind == "donut" else 1, "edgecolor": "white", "linewidth": 2},
                       textprops={"fontsize": 10})
                ax.set_aspect("equal")
            elif kind == "line":
                ax.plot(labels, values, color=PALETTE[0], linewidth=2.5, marker="o", markersize=6)
                ax.fill_between(labels, values, alpha=0.08, color=PALETTE[0])
                for x, v in zip(labels, values):
                    ax.annotate(fmt(v), (x, v), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=9)
            elif kind == "barh":
                bars = ax.barh(labels, values, color=PALETTE[0], height=0.6)
                ax.bar_label(bars, labels=[fmt(v) for v in values], padding=4, fontsize=9)
                ax.invert_yaxis()
                ax.grid(axis="y", visible=False)
            else:
                bars = ax.bar(labels, values, color=PALETTE[0], width=0.6)
                ax.bar_label(bars, labels=[fmt(v) for v in values], padding=3, fontsize=9)
                ax.grid(axis="x", visible=False)
                if max(len(x) for x in labels) > 8 or len(labels) > 6:
                    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
            ax.set_title(title)
            if kind not in ("pie", "donut"):
                ax.set_xlabel(xlabel)
                ax.set_ylabel(ylabel)
            fig.tight_layout()
            fig.savefig(out, dpi=200, facecolor="white")
        finally:
            plt.close(fig)  # always release the figure, even when drawing failed
    return f"charts/{os.path.basename(out)}"


def generate_pdf_report(output_name: str, title: str, sections: list[dict]) -> str:
    """A4 PDF with title, then sections of {"heading", "text", "chart" (sandbox path), "table" (rows, first = header)}."""
    name = output_name if output_name.lower().endswith(".pdf") else output_name + ".pdf"
    out = enforce_sandbox_path(name, "reports")
    base = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=base["Title"], fontSize=22, textColor=colors.HexColor("#0F172A"), spaceAfter=4)
    sub = ParagraphStyle("sub", parent=base["Normal"], textColor=colors.HexColor("#64748B"), spaceAfter=18)
    h2 = ParagraphStyle("h2", parent=base["Heading2"], keepWithNext=1, textColor=colors.HexColor("#2563EB"), spaceBefore=14, spaceAfter=6)
    body = ParagraphStyle("body", parent=base["BodyText"], leading=15, textColor=colors.HexColor("#1E293B"))
    cell = ParagraphStyle("cell", parent=body, fontSize=9, leading=11)
    width = A4[0] - 4 * cm

    story = [Paragraph(escape(title), h1), Paragraph(datetime.now().strftime("Generated %d %b %Y, %H:%M"), sub)]
    for sec in sections:
        if sec.get("heading"):
            story.append(Paragraph(escape(sec["heading"]), h2))
        if sec.get("text"):
            story.append(Paragraph(escape(sec["text"]).replace("\n", "<br/>"), body))
        if sec.get("chart"):
            path = enforce_sandbox_path(os.path.basename(sec["chart"]), "charts")
            w, h = ImageReader(path).getSize()
            story += [Spacer(1, 8), Image(path, width=min(width, 14 * cm), height=min(width, 14 * cm) * h / w)]
        if sec.get("table"):
            rows = [[Paragraph(escape(str(c)), cell) for c in r] for r in sec["table"]]
            t = Table(rows, repeatRows=1, colWidths=[width / len(rows[0])] * len(rows[0]))
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0E7FF")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(t)  # no spacer: keeps the heading attached to the table

    def footer(canvas, doc):
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#94A3B8"))
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"HOME PROOFOLIO · page {doc.page}")

    SimpleDocTemplate(out, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm,
                      bottomMargin=2 * cm, title=title, author="HOME PROOFOLIO").build(
        story, onFirstPage=footer, onLaterPages=footer)
    return f"reports/{os.path.basename(out)}"
