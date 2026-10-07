# HOME PROOFOLIO — Secure AI Analytics Engine

A resource-optimized, secure local framework linking LangChain and Qwen 2.5 Coder (via Ollama) to sandboxed file and chart tools. Lives in `app/ai/`, exposed through `POST /ai/chat` and `POST /ai/chart` (`app/api/ai.py`).

## Setup

```bash
cd backend
.venv/bin/pip install -r requirements.txt   # langchain-ollama, pypdf, matplotlib
.venv/bin/pip install gradio                # dev chat UI only
ollama pull qwen2.5-coder:latest
.venv/bin/python ai_dashboard.py            # http://127.0.0.1:7860
```

Settings (`app/core/config.py`, override via env): `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `HUGGINGFACE_API_TOKEN`.

## TODO — Hugging Face API (to be replaced later)

Image generation and text-to-speech are not implemented. When added, set `HUGGINGFACE_API_TOKEN`, save outputs to `ai_sandbox/media/` and pass only file paths around. Run the image and voiceover requests concurrently (`asyncio.gather`).

## Optimization notes

### Memory (RAM / VRAM)
* **Streaming:** stream tokens instead of waiting for the full reply (not implemented yet; the engine currently returns the whole answer).
* **Sliding window:** pass only the last few turns as history so the KV cache stays small.
* **Release big objects:** drop references to large images/text after use (the chart tool already closes its figure).

### Speed
* **Async:** run independent jobs (image + voiceover) concurrently.
* **Pagination:** fetch logs in small indexed batches (e.g. 10), never the whole table.
* **Early termination:** `num_predict=512` caps output so the model can't loop.

### Storage
* **Paths, not binaries:** keep media in `ai_sandbox/` and pass short paths through LangChain.
* **Compress media:** low-bitrate mono AAC audio, H.264 video.
* **Cache purges:** delete temporary tracks once the final merged file is saved.
