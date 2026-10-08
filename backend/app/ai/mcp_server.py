"""HOME PROOFOLIO MCP server: the AI's general-purpose tools, served over the Model Context Protocol (stdio).

    python -m app.ai.mcp_server          (run from backend/)

The chat agent starts this itself (app/ai/mcp_client.py). Any other MCP client can use it too, for example
Claude Desktop / Cursor:  {"command": "python", "args": ["-m", "app.ai.mcp_server"], "cwd": "<path>/backend"}

Only tools that need NO user identity live here. A user's own data (work, memories) is read by the in-process
tools in app/ai/tools.py, which take the user id from the logged-in session and never from the model.
stdout carries the protocol, so nothing in this file may print.
"""
import ast
import math
import operator
import os
from datetime import datetime, timedelta, timezone

from app.ai.knowledge import relevant_knowledge
from app.ai.security_guard import SANDBOX_DIR

SANDBOX_FOLDERS = ("reports", "charts")
# Safe for every signed-in user. The file tools below see the shared ai_sandbox/, so they are dev-dashboard only.
PUBLIC_TOOLS = {"search_knowledge", "current_datetime", "calculate", "sketch_chart"}

_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow,
    ast.USub: operator.neg, ast.UAdd: operator.pos,
}
_FUNCS = {"abs": abs, "round": round, "min": min, "max": max, "sum": lambda *a: sum(a), "sqrt": math.sqrt,
          "floor": math.floor, "ceil": math.ceil}


def _eval(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and (abs(left) > 1e6 or abs(right) > 64):
            raise ValueError("power too large")
        return _OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _FUNCS and not node.keywords:
        return _FUNCS[node.func.id](*[_eval(a) for a in node.args])
    raise ValueError("only numbers, + - * / // % **, brackets and abs/round/min/max/sum/sqrt/floor/ceil are allowed")


# ---- the tools (plain functions: the docstring is what the model reads) ------------------------

def search_knowledge(query: str) -> str:
    """Search HOME PROOFOLIO's official product knowledge: what the platform is, features, roles, privacy,
    memories and stories, the work lifecycle, FAQ. Use it for any question about how the platform works."""
    return relevant_knowledge(query, k=5, max_chars=3000)


def current_datetime(utc_offset_hours: float = 3) -> str:
    """The current date and time. Default is East Africa Time (UTC+3); pass another UTC offset in hours if needed."""
    if not -12 <= utc_offset_hours <= 14:
        return "utc_offset_hours must be between -12 and 14"
    now = datetime.now(timezone(timedelta(hours=utc_offset_hours)))
    return now.strftime("%A %d %B %Y, %H:%M (UTC%z)")


def calculate(expression: str) -> str:
    """Exact arithmetic, for example "18 / 24 * 100" or "round((7 + 5) / 3, 2)". Use it instead of mental maths
    for totals, percentages, averages and differences."""
    try:
        if len(expression) > 300:
            raise ValueError("expression too long")
        value = _eval(ast.parse(expression.strip().replace("^", "**"), mode="eval").body)
    except ZeroDivisionError:
        return "Error: division by zero"
    except (ValueError, SyntaxError, TypeError, OverflowError) as e:
        return f"Error: {e}"
    return str(round(value, 10) if isinstance(value, float) else value)


def generate_chart(name: str, title: str, labels: str, values: str, kind: str = "bar", xlabel: str = "", ylabel: str = "") -> str:
    """Draw a chart image and save it in the sandbox. labels and values are comma separated and must have the
    same length, e.g. labels="Jan, Feb, Mar" values="40, 85, 60". kind: bar | barh | line | pie | donut.
    Returns the saved file path (charts/<name>.png)."""
    from app.ai.python_tools import generate_chart as draw  # heavy import (matplotlib): only when used
    try:
        return draw(name, title, labels, values, kind, xlabel, ylabel)
    except ValueError as e:
        return f"Error: {e}"


def list_sandbox_files(folder: str = "reports") -> str:
    """List the files in an AI sandbox folder: "reports" (PDFs) or "charts" (images)."""
    if folder not in SANDBOX_FOLDERS:
        return f"Error: folder must be one of {', '.join(SANDBOX_FOLDERS)}"
    path = os.path.join(SANDBOX_DIR, folder)
    names = sorted(n for n in os.listdir(path) if not n.startswith(".")) if os.path.isdir(path) else []
    return "\n".join(names[:200]) or "(empty)"


def read_pdf(file_name: str, max_pages: int = 10) -> str:
    """Read a PDF from ai_sandbox/reports/ as markdown text (headings, lists, tables). Give the file name only."""
    from app.ai.python_tools import read_pdf as read  # heavy import (pymupdf): only when used
    try:
        return read(file_name, max_pages=max(1, min(max_pages, 50)))[:20000]
    except Exception as e:
        return f"Error: {e}"


def sketch_chart(title: str, labels: str, values: str, kind: str = "bar", description: str = "") -> str:
    """Sketch an interactive visual chart for chat display. labels and values are comma-separated, e.g. labels='Public Work, Private Work', values='5, 0'. kind: bar | horizontal_bar | line | pie | area."""
    import json
    lbls = [l.strip() for l in labels.split(",") if l.strip()]
    vals = []
    for v in values.split(","):
        try:
            val_clean = v.strip()
            vals.append(float(val_clean) if "." in val_clean else int(val_clean))
        except ValueError:
            vals.append(0)
    data = [{"name": l, "value": v} for l, v in zip(lbls, vals)]
    spec = {
        "type": kind,
        "title": title,
        "description": description,
        "data": data,
        "xKey": "name",
    }
    return f"```chart\n{json.dumps(spec, ensure_ascii=False, indent=2)}\n```"


TOOL_FUNCTIONS = (search_knowledge, current_datetime, calculate, sketch_chart, generate_chart, list_sandbox_files, read_pdf)


def build_server():
    try:
        from mcp.server.mcpserver import MCPServer as Server  # mcp 2.x
    except ImportError:
        from mcp.server.fastmcp import FastMCP as Server  # mcp 1.x
    server = Server("home-proofolio", instructions="General tools for the HOME PROOFOLIO AI companion: product "
                    "knowledge search, date/time, arithmetic, charts and sandboxed PDF reading.")
    for fn in TOOL_FUNCTIONS:
        server.tool()(fn)
    return server


if __name__ == "__main__":
    build_server().run()  # stdio
