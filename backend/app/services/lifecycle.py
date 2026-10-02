"""Per-kind state lists (PRD Section 7, NFR-05). Each kind is validated against its own list."""

LIFECYCLES: dict[str, list[str]] = {
    "capture": ["captured", "archived"],
    "work": ["idea", "discovery", "planned", "building", "blocked", "testing", "deployed", "completed", "archived"],
    "learning": ["new", "exploring", "learning", "understanding", "testing", "turned_into_project", "archived"],
    "achievement": ["achieved", "archived"],
    "problem": ["open", "discussing", "solving", "solved", "accepted", "closed", "archived"],
}
KINDS = tuple(LIFECYCLES)

# States that mean "still moving" — they surface in Home's Keep going.
IN_PROGRESS = {
    "discovery", "planned", "building", "blocked", "testing",  # work
    "exploring", "learning", "understanding",  # learning
    "discussing", "solving",  # problem
}


def first_state(kind: str) -> str:
    return LIFECYCLES[kind][0]


def check_state(kind: str, status: str) -> None:
    if kind not in LIFECYCLES:
        raise ValueError(f"Unknown type '{kind}'")
    if status not in LIFECYCLES[kind]:
        raise ValueError(f"'{status}' is not a valid state for {kind}. Use one of: {', '.join(LIFECYCLES[kind])}")
