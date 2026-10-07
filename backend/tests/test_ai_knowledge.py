"""Run: .venv/bin/python tests/test_ai_knowledge.py  (no DB or model needed)"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app.ai.knowledge import relevant_knowledge
from app.ai.story import _parse

assert "Ibrahim Issa Kimaro" in relevant_knowledge("who built this?")
assert "designer" in relevant_knowledge("do I need GitHub for my design project?").lower()
assert "Daily Memory" in relevant_knowledge("how do I turn memories into a story?")
assert "Never invent" in relevant_knowledge("zzzz qqqq")  # ai_behavior always present
assert "Build. Prove. Connect." in relevant_knowledge("zzzz qqqq")  # fallback = core
assert len(relevant_knowledge("what is home proofolio and who is it for and what features")) < 3500
assert _parse("**TITLE: The Spark**\nI began.", "x") == ("The Spark", "I began.")
assert _parse("TITLE: A\nbody", "x") == ("A", "body")
assert _parse("no title here", "Chapter 3") == ("Chapter 3", "no title here")
print("ok")
