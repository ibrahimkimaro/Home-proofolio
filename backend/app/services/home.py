"""Home action lists (PRD Section 5). Each item lands in at most one list."""
from typing import Literal

from app.services.lifecycle import IN_PROGRESS

Bucket = Literal["keep_going", "needs_proof", "ready"] | None


def bucket_of(work_type: str, status: str, visibility: str, proof_count: int) -> Bucket:
    if status in ("archived", "turned_into_project"):  # done: archived, or it became a work item
        return None
    if work_type == "capture":
        return "keep_going"
    if proof_count == 0:
        return "needs_proof"
    if visibility != "public":
        return "ready"
    if status in IN_PROGRESS:
        return "keep_going"
    return None


if __name__ == "__main__":  # python -m app.services.home
    assert bucket_of("capture", "captured", "private", 0) == "keep_going"
    assert bucket_of("work", "idea", "private", 0) == "needs_proof"
    assert bucket_of("work", "idea", "private", 1) == "ready"
    assert bucket_of("work", "idea", "public", 1) is None
    assert bucket_of("work", "building", "public", 1) == "keep_going"
    assert bucket_of("learning", "exploring", "public", 1) == "keep_going"
    assert bucket_of("achievement", "achieved", "public", 1) is None
    assert bucket_of("capture", "archived", "private", 0) is None
    assert bucket_of("learning", "turned_into_project", "private", 0) is None
    print("home.bucket_of: ok")
