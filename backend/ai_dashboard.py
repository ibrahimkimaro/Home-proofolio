"""Dev-only AI dashboard (no login: always speaks to the creator). Run from backend/: .venv/bin/python ai_dashboard.py"""
import os
import gradio as gr
from sqlalchemy import select

from app.ai.chat import reply
from app.ai.engine import ConnectedEngine
from app.ai.python_tools import CHART_KINDS, extract_pdf_graphs, generate_chart, read_pdf
from app.ai.security_guard import SANDBOX_DIR
from app.ai.work_report import build_work_report
from app.core.database import AsyncSessionLocal
from app.models.user import User

engine = ConnectedEngine()

KIMMY = (
    "You are talking to Kimmy from the HOME PROOFOLIO organization. Kimmy is here to build and help you. "
    "Address them respectfully as Kimmy (e.g. 'Kimmy', 'big bro Kimmy'), and remember they are the developer/creator of this ecosystem. "
    "Your role is to help Kimmy build, test, and refine this project workspace."
)
KIMMY_USERNAME = "therealkimmy"


async def kimmy():
    async with AsyncSessionLocal() as db:
        return await db.scalar(select(User).where(User.username == KIMMY_USERNAME))


async def chat(message, history):
    # history items are {"role", "content"}; the engine and consent check want "User: ..." / "AI: ..." lines
    lines = [f"{'User' if h['role'] == 'user' else 'AI'}: {h['content']}" for h in (history or [])[-6:]]
    user = await kimmy()
    async with AsyncSessionLocal() as db:
        return await reply(engine, db, user.id, KIMMY, message, lines, dev=True)  # dev: sandbox file tools too


def pdf_text(name):
    try:
        return read_pdf(name)
    except Exception as e:
        return f"Error: {e}"


def pdf_graphs(name):
    try:
        return [os.path.join(SANDBOX_DIR, p) for p in extract_pdf_graphs(name)] or None
    except Exception as e:
        raise gr.Error(str(e))


def make_chart(name, title, labels, values, kind, xlabel, ylabel):
    try:
        return os.path.join(SANDBOX_DIR, generate_chart(name or "chart", title, labels, values, kind, xlabel, ylabel))
    except ValueError as e:
        raise gr.Error(str(e))


async def work_report():
    user = await kimmy()
    async with AsyncSessionLocal() as db:
        return os.path.join(SANDBOX_DIR, await build_work_report(db, user))


with gr.Blocks(title="HOME PROOFOLIO AI") as demo:
    gr.Markdown("# 🚀 HOME PROOFOLIO — AI Local Sandbox")

    with gr.Tab("💬 Chat"):
        gr.ChatInterface(fn=chat)

    with gr.Tab("📄 Read PDF"):
        gr.Markdown("Put PDFs in `backend/ai_sandbox/reports/`. Returns text and tables per page.")
        pdf_in = gr.Textbox(label="PDF file name (e.g. invoice.pdf)")
        pdf_out = gr.TextArea(label="Extracted text and tables", interactive=False, lines=18)
        gr.Button("Read PDF").click(pdf_text, pdf_in, pdf_out)

    with gr.Tab("🔍 Extract graphs from PDF"):
        gr.Markdown("Saves embedded images and chart-like pages to `ai_sandbox/charts/`.")
        g_in = gr.Textbox(label="PDF file name (in ai_sandbox/reports/)")
        g_out = gr.Gallery(label="Graphs found")
        gr.Button("Extract graphs").click(pdf_graphs, g_in, g_out)

    with gr.Tab("📊 Make a chart"):
        with gr.Row():
            c_name = gr.Textbox(label="File name", value="chart")
            c_title = gr.Textbox(label="Title")
            c_kind = gr.Dropdown(CHART_KINDS, value="bar", label="Type")
        with gr.Row():
            c_labels = gr.Textbox(label="Labels (comma separated)", placeholder="Jan, Feb, Mar")
            c_values = gr.Textbox(label="Values (comma separated)", placeholder="40, 85, 60")
        with gr.Row():
            c_x = gr.Textbox(label="X axis label")
            c_y = gr.Textbox(label="Y axis label")
        c_out = gr.Image(label="Chart", type="filepath")
        gr.Button("Render chart").click(make_chart, [c_name, c_title, c_labels, c_values, c_kind, c_x, c_y], c_out)

    with gr.Tab("🗂️ My work report (PDF)"):
        gr.Markdown("Builds a PDF with charts and a table from Kimmy's own work items.")
        r_out = gr.File(label="Report")
        gr.Button("Build report").click(work_report, None, r_out)

if __name__ == "__main__":
    demo.queue().launch(theme=gr.themes.Soft())
