"""MCP client side: turns the tools of MCP servers into LangChain tools for the agent (app/ai/agent.py).

The built-in server (app/ai/mcp_server.py) is started over stdio. Each tool call opens its own short session,
so nothing has to be kept alive across requests or reloads. Extra servers come from settings.mcp_servers.
If MCP can't start (package missing, no subprocess support) the built-in tools still work, run in-process.
"""
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from langchain_core.tools import StructuredTool

from app.ai.mcp_server import PUBLIC_TOOLS, TOOL_FUNCTIONS
from app.core.config import settings

log = logging.getLogger("app.ai.mcp")

BACKEND_DIR = Path(__file__).resolve().parents[2]
BUILTIN = "home-proofolio"
TIMEOUT = 45  # seconds for one list or one tool call, process start included
EMPTY_SCHEMA = {"type": "object", "properties": {}}

_definitions: dict[str, list[tuple[str, str, dict]]] = {}  # server -> [(tool name, description, JSON schema)]
_failed: dict[str, str] = {}  # server -> why it could not be used (not retried until restart)


def servers() -> dict[str, dict]:
    builtin = {"command": sys.executable, "args": ["-m", "app.ai.mcp_server"], "cwd": str(BACKEND_DIR)}
    return {BUILTIN: builtin, **{k: v for k, v in settings.mcp_servers.items() if k != BUILTIN}}


@asynccontextmanager
async def session(spec: dict):
    """An initialized MCP session with one server: {"url": ...} = streamable HTTP, {"command": ...} = stdio."""
    from mcp import ClientSession
    if spec.get("url"):
        import mcp.client.streamable_http as http
        transport = (getattr(http, "streamable_http_client", None) or http.streamablehttp_client)(spec["url"])
    else:
        from mcp import StdioServerParameters, stdio_client
        transport = stdio_client(StdioServerParameters(
            command=spec["command"], args=list(spec.get("args", [])), env=spec.get("env"), cwd=spec.get("cwd")))
    async with transport as streams:
        async with ClientSession(streams[0], streams[1]) as s:
            await s.initialize()
            yield s


async def list_tools(spec: dict) -> list[tuple[str, str, dict]]:
    async with session(spec) as s:
        found = (await s.list_tools()).tools
    # mcp 2.x names the field input_schema, mcp 1.x inputSchema
    return [(t.name, t.description or t.name, getattr(t, "input_schema", None) or getattr(t, "inputSchema", None) or EMPTY_SCHEMA)
            for t in found]


async def call_tool(spec: dict, name: str, arguments: dict) -> str:
    async with session(spec) as s:
        result = await s.call_tool(name, arguments)
    text = "\n".join(c.text for c in (getattr(result, "content", None) or []) if getattr(c, "text", None)) or "(no output)"
    failed = getattr(result, "is_error", None) or getattr(result, "isError", False)
    return f"Error: {text}" if failed and not text.startswith("Error") else text


def _as_langchain(spec: dict, name: str, description: str, schema: dict) -> StructuredTool:
    async def run(**arguments) -> str:
        return await asyncio.wait_for(call_tool(spec, name, arguments), TIMEOUT)
    return StructuredTool(name=name, description=description, args_schema=schema, coroutine=run)


def local_tools(names: set[str] | None = None) -> list[StructuredTool]:
    """The built-in tools as plain in-process LangChain tools (no MCP). Same functions, same names."""
    return [StructuredTool.from_function(func=fn) for fn in TOOL_FUNCTIONS if names is None or fn.__name__ in names]


async def general_tools(dev: bool = False) -> list[StructuredTool]:
    """The agent's general tools, loaded through MCP.

    dev=False (every signed-in user): only the built-in server's PUBLIC_TOOLS.
    dev=True (the developer dashboard): every built-in tool plus the extra servers in settings.mcp_servers.
    """
    tools: list[StructuredTool] = []
    for server, spec in servers().items():
        if server != BUILTIN and not dev:
            continue
        if server not in _definitions and server not in _failed:
            try:
                _definitions[server] = await asyncio.wait_for(list_tools(spec), TIMEOUT)
                log.info("MCP server %s ready: %s", server, ", ".join(d[0] for d in _definitions[server]))
            except BaseException as e:  # ImportError, NotImplementedError (no subprocess support), timeouts, exception groups
                if isinstance(e, (KeyboardInterrupt, SystemExit, asyncio.CancelledError)):
                    raise
                _failed[server] = f"{type(e).__name__}: {e}"[:300]
                log.warning("MCP server %s unavailable (%s)%s", server, _failed[server],
                            "; using the in-process tools instead" if server == BUILTIN else "")
        if server in _definitions:
            wanted = [d for d in _definitions[server] if server != BUILTIN or dev or d[0] in PUBLIC_TOOLS]
            tools += [_as_langchain(spec, *d) for d in wanted if d[0] not in {t.name for t in tools}]
        elif server == BUILTIN:
            tools += local_tools(None if dev else PUBLIC_TOOLS)
    return tools


def status() -> dict:
    """How the general tools are being served right now (for the smoke test and admin health)."""
    return {"mcp": sorted(_definitions), "failed": dict(_failed),
            "builtin_transport": "mcp" if BUILTIN in _definitions else ("in-process" if BUILTIN in _failed else "not loaded yet")}
