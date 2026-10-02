"""lifecycles templates uploads

Revision ID: 73998942f1fa
Revises: 899185625237
Create Date: 2026-09-30 13:14:37.306481

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '73998942f1fa'
down_revision: Union[str, None] = '899185625237'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


T, TA = "text", "textarea"

# Seed data only: after this, templates live in the database and are edited there.
TEMPLATES = [
    ("developer", "work", "Developer", "Software, apps, systems", 10, [
        {"key": "repository_url", "label": "Repository", "type": "url", "placeholder": "https://github.com/..."},
        {"key": "live_url", "label": "Live link", "type": "url", "placeholder": "https://..."},
        {"key": "technologies", "label": "Technologies", "type": "list", "placeholder": "Python, React"},
    ]),
    ("designer", "work", "Designer", "Brand, UI, product, visual work", 20, [
        {"key": "design_category", "label": "Category", "type": T, "placeholder": "Brand identity, UI design"},
        {"key": "tools", "label": "Tools", "type": "list", "placeholder": "Figma, Illustrator"},
        {"key": "prototype_url", "label": "Prototype or file", "type": "url"},
    ]),
    ("sports", "work", "Sports", "Matches, seasons, training", 30, [
        {"key": "sport", "label": "Sport", "type": T, "placeholder": "Football"},
        {"key": "team", "label": "Team", "type": T},
        {"key": "position", "label": "Position", "type": T, "placeholder": "Midfielder"},
        {"key": "season", "label": "Season", "type": T, "placeholder": "2025/26"},
        {"key": "matches", "label": "Matches", "type": "number"},
        {"key": "goals", "label": "Goals", "type": "number"},
        {"key": "assists", "label": "Assists", "type": "number"},
        {"key": "footage_url", "label": "Match footage", "type": "url"},
    ]),
    ("young_learner", "work", "Young learner", "School projects and things you made", 40, [
        {"key": "school", "label": "School", "type": T},
        {"key": "subject", "label": "Subject", "type": T},
        {"key": "grade", "label": "Class or grade", "type": T},
        {"key": "helped_by", "label": "Teacher or mentor", "type": T},
    ]),
    ("business", "work", "Business", "Operations, sales, customers, growth", 50, [
        {"key": "business_name", "label": "Business", "type": T},
        {"key": "key_result", "label": "Key result", "type": T, "placeholder": "Served 120 customers a week"},
        {"key": "customers", "label": "Customers reached", "type": "number"},
    ]),
    ("research", "work", "Research", "Studies, experiments, data", 60, [
        {"key": "question", "label": "Research question", "type": TA},
        {"key": "method", "label": "Method", "type": T},
        {"key": "publication_url", "label": "Publication", "type": "url"},
        {"key": "dataset_url", "label": "Dataset", "type": "url"},
    ]),
    ("other", "work", "Other", "Anything else", 90, []),
    # FR-LRN-01/02: ideas and learning share one lifecycle and one field set.
    ("learning", "learning", "Learning", "Ideas and things you are learning", 0, [
        {"key": "source", "label": "Where it came from", "type": T, "placeholder": "A book, a class, a conversation"},
        {"key": "goal", "label": "Goal", "type": TA},
        {"key": "questions", "label": "Open questions", "type": TA},
        {"key": "understanding", "label": "What I understand now", "type": TA},
        {"key": "resources", "label": "Resources", "type": "list"},
        {"key": "practice", "label": "Practice", "type": TA},
        {"key": "blockers", "label": "Blockers", "type": TA},
        {"key": "reflection", "label": "Reflection", "type": TA},
        {"key": "next_action", "label": "Next practical step", "type": T},
    ]),
    ("achievement", "achievement", "Achievement", "Awards, results, certificates", 0, [
        {"key": "awarded_by", "label": "Awarded by", "type": T},
        {"key": "level", "label": "Level", "type": T, "placeholder": "School, regional, national"},
    ]),
    ("problem", "problem", "Problem", "Something that needs solving", 0, [
        {"key": "who_is_affected", "label": "Who is affected", "type": TA},
        {"key": "impact", "label": "Why it matters", "type": TA},
        {"key": "tried", "label": "What has been tried", "type": TA},
    ]),
]

# Onboarding used disciplines as the type. They are Work with a context now.
LEGACY_CONTEXT = {"developer": "developer", "designer": "designer", "athlete": "sports", "learner": "young_learner",
                  "business": "business", "research": "research", "general": "other"}


def upgrade() -> None:
    op.create_table(
        "work_templates",
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
        sa.Column("fields", JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("sort", sa.Integer(), server_default="0", nullable=False),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(op.f("ix_work_templates_kind"), "work_templates", ["kind"], unique=False)
    op.create_table(
        "uploads",
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("name"),
    )
    op.create_index(op.f("ix_uploads_owner_id"), "uploads", ["owner_id"], unique=False)
    op.add_column("work_items", sa.Column("template", sa.String(length=50), nullable=True))
    op.add_column("work_items", sa.Column("source_id", sa.UUID(), nullable=True))
    op.create_foreign_key("fk_work_items_source_id", "work_items", "work_items", ["source_id"], ["id"], ondelete="SET NULL")

    # status: one enum shared by every type -> per-kind state lists validated in the app.
    op.execute("ALTER TABLE work_items ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE work_items ALTER COLUMN status TYPE varchar(30) USING status::text")
    op.execute("ALTER TABLE work_items ALTER COLUMN status SET DEFAULT 'captured'")
    op.execute("DROP TYPE work_status")

    conn = op.get_bind()
    for old, ctx in LEGACY_CONTEXT.items():
        conn.execute(sa.text("UPDATE work_items SET work_type = 'work', template = :ctx WHERE work_type = :old"),
                     {"ctx": ctx, "old": old})
    op.execute("UPDATE work_items SET work_type = 'work' WHERE work_type NOT IN ('capture','work','learning','achievement','problem')")
    op.execute("UPDATE work_items SET status = 'captured' WHERE work_type = 'capture' AND status <> 'archived'")
    op.execute("UPDATE work_items SET status = 'achieved' WHERE work_type = 'achievement' AND status <> 'archived'")
    op.execute("UPDATE work_items SET status = 'open' WHERE work_type = 'problem' AND status <> 'archived'")
    op.execute(
        "UPDATE work_items SET status = CASE status "
        "WHEN 'idea' THEN 'new' WHEN 'discovery' THEN 'exploring' WHEN 'planned' THEN 'exploring' "
        "WHEN 'building' THEN 'learning' WHEN 'blocked' THEN 'learning' WHEN 'testing' THEN 'testing' "
        "WHEN 'deployed' THEN 'understanding' WHEN 'completed' THEN 'understanding' ELSE status END "
        "WHERE work_type = 'learning'"
    )

    templates = sa.table("work_templates", sa.column("key"), sa.column("kind"), sa.column("label"),
                         sa.column("description"), sa.column("sort"), sa.column("fields", JSONB))
    op.bulk_insert(templates, [
        {"key": k, "kind": kind, "label": label, "description": d, "sort": sort, "fields": fields}
        for k, kind, label, d, sort, fields in TEMPLATES
    ])

    # Existing files: record owners and rewrite links to the checked /files/ route.
    op.execute(
        "INSERT INTO uploads (name, owner_id, content_type, is_public) "
        "SELECT substring(avatar_url from '([0-9a-f]{32}\\.[a-z]+)$'), user_id, 'image/*', true "
        "FROM profiles WHERE avatar_url ~ 'uploads/[0-9a-f]{32}\\.[a-z]+$' ON CONFLICT DO NOTHING"
    )
    op.execute(
        "UPDATE profiles SET avatar_url = '/files/' || substring(avatar_url from '([0-9a-f]{32}\\.[a-z]+)$') "
        "WHERE avatar_url ~ 'uploads/[0-9a-f]{32}\\.[a-z]+$'"
    )
    op.execute(
        "INSERT INTO uploads (name, owner_id, content_type, is_public) "
        "SELECT DISTINCT substring(e->>'url' from '([0-9a-f]{32}\\.[a-z]+)$'), w.user_id, 'application/octet-stream', false "
        "FROM work_items w, jsonb_array_elements(w.evidence_links) e "
        "WHERE e->>'url' ~ 'uploads/[0-9a-f]{32}\\.[a-z]+$' ON CONFLICT DO NOTHING"
    )
    op.execute(
        "UPDATE work_items w SET evidence_links = ("
        "  SELECT jsonb_agg(CASE WHEN e->>'url' ~ 'uploads/[0-9a-f]{32}\\.[a-z]+$' "
        "    THEN jsonb_set(e, '{url}', to_jsonb('/files/' || substring(e->>'url' from '([0-9a-f]{32}\\.[a-z]+)$'))) "
        "    ELSE e END) FROM jsonb_array_elements(w.evidence_links) e) "
        "WHERE jsonb_array_length(w.evidence_links) > 0"
    )


def downgrade() -> None:
    op.execute("CREATE TYPE work_status AS ENUM ('idea','discovery','planned','building','blocked','testing','deployed','completed','archived')")
    op.execute("ALTER TABLE work_items ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "UPDATE work_items SET status = 'idea' WHERE status NOT IN "
        "('idea','discovery','planned','building','blocked','testing','deployed','completed','archived')"
    )
    op.execute("ALTER TABLE work_items ALTER COLUMN status TYPE work_status USING status::work_status")
    op.execute("ALTER TABLE work_items ALTER COLUMN status SET DEFAULT 'idea'")
    op.drop_constraint("fk_work_items_source_id", "work_items", type_="foreignkey")
    op.drop_column("work_items", "source_id")
    op.drop_column("work_items", "template")
    op.drop_index(op.f("ix_uploads_owner_id"), table_name="uploads")
    op.drop_table("uploads")
    op.drop_index(op.f("ix_work_templates_kind"), table_name="work_templates")
    op.drop_table("work_templates")
