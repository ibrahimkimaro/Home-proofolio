# HOME PROOFOLIO AI Knowledge Base

Stable product knowledge for the HOME PROOFOLIO AI companion.

## Documents
- `home_proofolio_core.md` — identity, audience and core concepts
- `features.md` — platform features
- `user_roles.md` — adaptive experience
- `privacy_and_permissions.md` — privacy and AI access
- `ai_behavior.md` — companion behavior
- `work_and_project_lifecycle.md` — project maturity
- `memory_and_story.md` — Daily Memory and stories
- `faq.md` — common questions
- `examples.md` — behavior examples
- `app_guide.md` — where things are in the app and how to do common tasks
- `ai_companion_guide.md` — what the AI companion can and cannot do, permissions and settings
- `public_site.md` — signing up, price, contact and what visitors can do (used by the website's support assistant)

## Retrieval rule
Do not inject every document into every prompt. Retrieve only relevant knowledge for the user's request.

## Source-of-truth rule
Personal information comes from authorized application data. Product facts come from this knowledge base. Current information that changes over time should come from appropriate current-data tools.

## Updating this knowledge
- Edit or add any `.md` file here. The next chat uses it; no restart needed (files are re-read when they change).
- Keep one topic per file, short `##` headings, and one idea per paragraph: the AI retrieves paragraph-sized chunks by keyword match.
- `ai_behavior.md` is sent with every answer, so keep it short. `README.md` is never sent to the AI.
- Admins can also update it over the API: `GET /ai/knowledge` and `PUT /ai/knowledge/{name}` with `{"text": "..."}`.
- Run `.venv/bin/python tests/test_ai_knowledge.py` after changing facts the AI must never get wrong (for example who built it).
