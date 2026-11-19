"""Placeholder matching for FR-109: rank found items by keywords shared with a lost report.

Image-based matching (e.g. CLIP embeddings) is planned to replace the scoring in `find_matches`;
callers only depend on it returning found reports ordered best match first.
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FoundReport, FoundReportStatus, LostReport

_STOPWORDS = {
    "and", "the", "with", "for", "has", "have", "was", "near", "next", "left", "lost", "found",
    "item", "inside", "outside", "floor", "room", "building", "from", "that", "this", "there",
}


def _keywords(*texts: str) -> set[str]:
    words = (word for text in texts for word in re.findall(r"[a-z0-9]+", text.lower()))
    return {word for word in words if len(word) > 2 and word not in _STOPWORDS}


def find_matches(db: Session, lost: LostReport) -> list[FoundReport]:
    """Available found items sharing at least one description keyword, best match first.

    Location keywords only break ties, since many unrelated items are found in the same building.
    """
    description_words = _keywords(lost.description)
    location_words = _keywords(lost.location)
    candidates = db.scalars(
        select(FoundReport).where(
            FoundReport.status == FoundReportStatus.AVAILABLE,
            FoundReport.owner_id != lost.owner_id,
        )
    )
    scored = []
    for item in candidates:
        item_words = _keywords(item.description, item.location)
        description_score = len(description_words & item_words)
        if description_score:
            scored.append((description_score, len(location_words & item_words), item))
    scored.sort(key=lambda entry: (entry[0], entry[1], entry[2].created_at), reverse=True)
    return [item for *_, item in scored]


def get_match(db: Session, lost: LostReport, found_report_id: str) -> FoundReport | None:
    return next((item for item in find_matches(db, lost) if item.id == found_report_id), None)
