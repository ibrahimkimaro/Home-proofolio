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
# the app guide and the companion guide: where things are, what the AI may do, which model it is
assert "change your password" in relevant_knowledge("where do I change my password?")
assert "Open, Discussing, Solving" in relevant_knowledge("what are the states of a problem?")
assert "Activate account" in relevant_knowledge("how do I activate my account?")
assert "sign it to make it valid" in relevant_knowledge("how do I share my CV?")
assert "cannot change, publish or delete" in relevant_knowledge("can you delete my project?")
assert "Qwen" in relevant_knowledge("what model are you?")
assert "Ibrahim Issa Kimaro" in relevant_knowledge("who made HOME PROOFOLIO?")
# the public website assistant: price, signing up, reaching a person
assert "free for every member" in relevant_knowledge("how much does it cost?")
assert "free for every member" in relevant_knowledge("is it free?")
assert "/start" in relevant_knowledge("how do I sign up?")
assert "support@homeproofolio.co.tz" in relevant_knowledge("how can I contact you?")
print("ok")
