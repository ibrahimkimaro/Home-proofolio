"""Retrieval over app/ai/home_proofolio_ai_knowledge/*.md.

Edit or add a .md file there and the next chat uses it (no restart): chunks are rebuilt when a file's mtime changes.
ponytail: keyword overlap scoring (English), no embeddings. Upgrade to nomic-embed-text vectors if recall gets poor.
"""
import re
from pathlib import Path

DIR = Path(__file__).parent / "home_proofolio_ai_knowledge"
ALWAYS = "ai_behavior.md"  # tiny, applies to every answer
SKIP = {"README.md", ALWAYS}
FALLBACK = "home_proofolio_core.md"  # when nothing matches, give the basics
STOP = set("the and for are you your what who how why can does with this that from have not but about into any all our out".split())

_cache: dict = {"stamp": None, "chunks": []}


def _words(text: str) -> set[str]:
    return {w[:-1] if w.endswith("s") and len(w) > 3 else w for w in re.findall(r"[a-z]{3,}", text.lower()) if w not in STOP}


def _chunks() -> list[tuple[str, str, str, set, set]]:
    files = sorted(DIR.glob("*.md"))
    stamp = tuple((p.name, p.stat().st_mtime_ns) for p in files)
    if stamp != _cache["stamp"]:
        out = []
        for p in files:
            if p.name in SKIP:
                continue
            heading = p.stem.replace("_", " ")
            for block in re.split(r"\n\s*\n", p.read_text(encoding="utf-8")):
                block = block.strip()
                if not block:
                    continue
                if block.startswith("#") and "\n" not in block:
                    heading = block.lstrip("# ").strip()
                    continue
                out.append((p.name, heading, block, _words(heading) | _words(p.stem), _words(block)))  # file, heading, text, heading words, body words
        _cache.update(stamp=stamp, chunks=out)
    return _cache["chunks"]


def relevant_knowledge(query: str, k: int = 4, max_chars: int = 2200) -> str:
    """ai_behavior.md always, plus the k chunks that best match the question."""
    q = _words(query)
    scored = sorted(
        ((len(q & body) + 2 * len(q & head), file, heading, text) for file, heading, text, head, body in _chunks()),
        key=lambda s: -s[0],
    )
    picked = [s for s in scored[:k] if s[0] > 0]
    if not picked:
        picked = [s for s in scored if s[1] == FALLBACK][:3]
    always = (DIR / ALWAYS).read_text(encoding="utf-8") if (DIR / ALWAYS).exists() else ""
    body = "\n\n".join(f"[{heading}]\n{text}" for _, _, heading, text in picked)
    return f"{always}\n\nRelevant product facts (use them, do not contradict them):\n{body}"[: max_chars + len(always)]
