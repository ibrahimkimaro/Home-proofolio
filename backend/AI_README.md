# HOME PROOFOLIO — AI companion

A tool-calling agent built with LangChain and MCP. Lives in `app/ai/`, exposed through `POST /ai/chat` (`app/api/ai.py`).

| Piece | File | What it does |
|---|---|---|
| Model | `app/ai/engine.py` | `Qwen/Qwen3.8-27B` on Hugging Face Inference Providers, through the OpenAI-compatible router (`ChatOpenAI`). `AI_PROVIDER=ollama` switches to the local model. |
| Agent loop | `app/ai/agent.py` | Model asks for tools, we run them, it answers from the results. Max `AI_MAX_TOOL_STEPS` rounds. |
| User-data tools | `app/ai/tools.py` | Profile, work items, memories. The user id comes from the login session, never from the model. Only the tools the user allowed are offered. |
| MCP server | `app/ai/mcp_server.py` | General tools: `search_knowledge`, `current_datetime`, `calculate`, `generate_chart`, `list_sandbox_files`, `read_pdf`. |
| MCP client | `app/ai/mcp_client.py` | Starts the MCP server over stdio and hands its tools to the agent. Falls back to in-process if MCP can't start. |
| Chat turn | `app/ai/chat.py` | Consent, prompt, tool selection, story writing. |

## Where the model is connected

| Connection | Where | Change it by |
|---|---|---|
| Website -> AI | `home_profio_frontend/src/lib/ai.ts` calls `POST /api/ai/chat` (page `src/app/ai/page.tsx`, floating widget `src/components/ai/CompanionChatWidget.tsx`) | editing those files |
| API -> agent | `app/api/ai.py` -> `app/ai/chat.py` -> `app/ai/agent.py` | |
| Landing page support -> AI | `src/components/landing/SupportAiChat.tsx` (inside `SupportAssistant.tsx`) calls `POST /api/ai/support` -> `app/ai/support_agent.py`. Public, no user data, rate limited. "Talk to a person" opens the live chat with the team. | `SUPPORT_PERSONA` and the limits in that file; facts in `public_site.md` |
| Admin panel -> AI dashboards | `src/components/admin/AiSection.tsx` (Admin > AI dashboards) calls `POST /api/ai/admin/dashboard` -> `app/ai/admin_dashboard.py`. Admin only. The model picks charts; every number is read from the database. | adding a chart to `PLATFORM_CHARTS` / `MEMBER_CHARTS` there |
| Agent -> model | `app/ai/engine.py`, token in `backend/.env` | `HUGGINGFACE_MODEL`, `AI_PROVIDER` |
| Model -> what the product is | `app/ai/home_proofolio_ai_knowledge/*.md`, picked per question by `app/ai/knowledge.py` | editing or adding a `.md` file (no restart), or `PUT /ai/knowledge/{name}` as admin |
| Model -> how to behave, the menu, item kinds, its limits | `PERSONA` in `app/ai/engine.py` and `ai_behavior.md` (both sent with every answer) | editing them |
| Model -> the user's own data | `app/ai/tools.py` (database, read-only, only after consent) | adding a tool there |
| Model -> general tools | `app/ai/mcp_server.py` over MCP | adding a function there |

After changing knowledge, run `python tests/test_ai_knowledge.py`: it checks the facts the AI must never get wrong.

## Setup

One command does all of it: asks for the token once, rebuilds the backend, runs the test below.

* Linux / macOS / WSL: `bash scripts/setup-ai.sh`
* Windows: double-click `scripts\setup-ai.bat`

The AI code itself always runs inside the backend's Linux container, so it behaves the same on both. By hand:

1. Put the token in `backend/.env` (not committed):

   ```
   HUGGINGFACE_API_TOKEN=hf_...
   ```

   The token needs the **Make calls to Inference Providers** permission (https://huggingface.co/settings/tokens).

2. Install the packages.

   ```bash
   docker compose build backend && docker compose up -d backend     # Docker
   pip install -r requirements.txt                                   # or a local venv, from backend/
   ```

3. Check everything end to end (no database needed):

   ```bash
   docker compose exec backend python ai_smoke_test.py               # Docker
   python ai_smoke_test.py                                           # local, from backend/
   python ai_smoke_test.py --chat                                    # then chat with the model in the terminal
   ```

   It checks: token and packages, a message out and back, tool calling, the MCP server, the full agent, Kiswahili with history.
   A failed check prints what to fix. Signed-in admins can also open `GET /ai/health`.

4. Dev chat UI: `python ai_dashboard.py` → http://127.0.0.1:7860

## Settings (`app/core/config.py`, set in `backend/.env`)

| Variable | Default | |
|---|---|---|
| `AI_PROVIDER` | `huggingface` | or `ollama` |
| `HUGGINGFACE_API_TOKEN` | | required for `huggingface` |
| `HUGGINGFACE_MODEL` | `Qwen/Qwen3.8-27B` | any chat model on the router; add `:provider` to force one |
| `HUGGINGFACE_CA_FILE` | | root certificate to trust if an antivirus re-signs HTTPS |
| `AI_REASONING_EFFORT` | `low` | `none` is fastest; `medium`/`high` think longer |
| `AI_MAX_TOKENS` | `2048` | per model call, thinking included |
| `AI_TIMEOUT_SECONDS` | `60` | |
| `AI_MAX_TOOL_STEPS` | `5` | |
| `MCP_SERVERS` | `{}` | extra MCP servers for the dev dashboard, JSON |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | | used when `AI_PROVIDER=ollama` |

## Rules the code keeps

* **One system message.** Qwen's chat template rejects a second one (HTTP 400), so `system_prompt()` builds a single message and `single_system()` merges the story prompts.
* **The model never chooses the user.** `user_tools()` binds `db` and `user_id` on the server.
* **Consent first.** Without permission the model gets no data tools, only `request_data_access`, which returns the consent question word for word.
* **Shared files stay with the developer.** `ai_sandbox/` holds every user's reports, so the file tools (`read_pdf`, `list_sandbox_files`, `generate_chart`) are only offered with `dev=True` (the dashboard). Web users get `PUBLIC_TOOLS`.
* **Tool calls run one at a time**, because the user-data tools share one database session.

## Adding a tool

* Needs the user's data → add the function, an argument schema and a `TOOLS` entry in `app/ai/tools.py`.
* Needs no user → add a function with a docstring to `TOOL_FUNCTIONS` in `app/ai/mcp_server.py` (and to `PUBLIC_TOOLS` if every user may call it).

## Using the MCP server from another client

```json
{"mcpServers": {"home-proofolio": {"command": "python", "args": ["-m", "app.ai.mcp_server"], "cwd": "<path>/backend"}}}
```

## Not done yet

* Streaming replies (the router supports `stream: true`; `/ai/chat` returns the whole answer).
* Showing generated charts in the web chat (needs a per-user file endpoint).
* Image generation and text-to-speech.
