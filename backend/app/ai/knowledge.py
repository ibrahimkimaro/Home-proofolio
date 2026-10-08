"""Retrieval over app/ai/home_proofolio_ai_knowledge/*.md.

Edit or add a .md file there and the next chat uses it (no restart): chunks are rebuilt when a file's mtime changes.
A chunk is one paragraph (text between blank lines). A "## Heading" on a paragraph's first line is that chunk's heading.

ponytail: keyword scoring (English), no embeddings. Upgrade to nomic-embed-text vectors if recall gets poor.
Score of a chunk = its words shared with the question, each weighted by how rare the word is across all chunks
(so "password" counts far more than "work"), doubled for words in the chunk's heading, plus a bonus for shared
two-word phrases ("who built", "group chat"). Words are compared by a short stem: activate = activation, story = stories.
"""
import math
import re
from pathlib import Path

DIR = Path(__file__).parent / "home_proofolio_ai_knowledge"
ALWAYS = "ai_behavior.md"  # tiny, applies to every answer
SKIP = {"README.md", ALWAYS}
FALLBACK = "home_proofolio_core.md"  # when nothing matches, give the basics
STOP = set("the and for are with this that from have has not but into any all our out is it to of in on a an i my me we be as at "
           "by or if so there here was were will would should could been being its also than then them they their "
           "how what who why where when which can does do did you your about am im please want need".split())
PHRASE_BONUS = 3.0
MIN_SCORE = 2.5  # below this a chunk only shares everyday words with the question

_cache: dict = {"stamp": None, "chunks": [], "idf": {}}


def _stem(w: str) -> str:
    """Crude stem: plural and common endings off, then the first five letters."""
    for _ in range(2):  # settings -> setting -> sett
        if w.endswith("ies") and len(w) > 4:
            w = w[:-3] + "y"  # memories -> memory
            continue
        for suffix in ("ation", "ing", "ed", "es", "s"):
            if w.endswith(suffix) and len(w) - len(suffix) >= 3:
                w = w[:-len(suffix)]
                break
    return w[:5]


def _words(text: str) -> set[str]:
    return {_stem(w) for w in re.findall(r"[a-z]{2,}", text.lower()) if w not in STOP}


def _phrases(text: str) -> set[str]:
    """Two-word phrases holding at least one meaningful word: "who built" counts, "is it" does not."""
    tokens = re.findall(r"[a-z]{2,}", text.lower())
    return {f"{_stem(a)} {_stem(b)}" for a, b in zip(tokens, tokens[1:]) if a not in STOP or b not in STOP}


def _chunks() -> list[tuple[str, str, str, set, set, set]]:
    files = sorted(DIR.glob("*.md"))
    stamp = tuple((p.name, p.stat().st_mtime_ns) for p in files)
    if stamp != _cache["stamp"]:
        out = []
        for p in files:
            if p.name in SKIP:
                continue
            title = p.stem.replace("_", " ")
            for block in re.split(r"\n\s*\n", p.read_text(encoding="utf-8")):
                block = block.strip()
                if not block:
                    continue
                first, _, rest = block.partition("\n")
                if first.startswith("#") and not rest:
                    title = first.lstrip("# ").strip()  # a heading on its own names the paragraphs after it
                    continue
                own = first.lstrip("# ").strip() if first.startswith("#") else ""
                # file, heading shown to the model, text, heading words, body words, phrases
                out.append((p.name, title, block, _words(own) or _words(p.stem), _words(block), _phrases(block)))
        count = len(out) or 1
        seen: dict[str, int] = {}
        for *_, head, body, _pairs in out:
            for w in head | body:
                seen[w] = seen.get(w, 0) + 1
        _cache.update(stamp=stamp, chunks=out, idf={w: math.log(1 + count / n) for w, n in seen.items()})
    return _cache["chunks"]


def relevant_knowledge(query: str, k: int = 4, max_chars: int = 2200) -> str:
    """ai_behavior.md always, plus the k chunks that best match the question."""
    chunks = _chunks()
    idf = _cache["idf"]
    q, phrases = _words(query), _phrases(query)

    def score(head: set, body: set, pairs: set) -> float:
        return (sum(idf.get(w, 0) for w in q & body) + sum(idf.get(w, 0) for w in q & head)
                + PHRASE_BONUS * len(phrases & pairs))

    scored = sorted(((score(head, body, pairs), file, heading, text) for file, heading, text, head, body, pairs in chunks),
                    key=lambda s: -s[0])
    picked = [s for s in scored[:k] if s[0] >= MIN_SCORE]
    if not picked:
        picked = [s for s in scored if s[1] == FALLBACK][:3]
    always = (DIR / ALWAYS).read_text(encoding="utf-8") if (DIR / ALWAYS).exists() else ""
    body = "\n\n".join(f"[{heading}]\n{text}" for _, _, heading, text in picked)
    return f"{always}\n\nRelevant product facts (use them, do not contradict them):\n{body}"[: max_chars + len(always)]
