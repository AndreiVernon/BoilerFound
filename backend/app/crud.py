from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FoundReport, FoundReportStatus, LostReport, ReportStatus


def create_lost_report(
    db: Session, *, owner_id: str, description: str, location: str, image_key: str | None
) -> LostReport:
    report = LostReport(owner_id=owner_id, description=description, location=location, image_key=image_key)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_lost_report(db: Session, report_id: str) -> LostReport | None:
    return db.get(LostReport, report_id)


def list_lost_reports_for_owner(
    db: Session, owner_id: str, status: ReportStatus | None = None
) -> list[LostReport]:
    query = select(LostReport).where(LostReport.owner_id == owner_id)
    if status is not None:
        query = query.where(LostReport.status == status)
    return list(db.scalars(query.order_by(LostReport.created_at.desc())))


def update_lost_report(db: Session, report: LostReport, changes: dict[str, Any]) -> LostReport:
    for field, value in changes.items():
        setattr(report, field, value)
    db.commit()
    db.refresh(report)
    return report


def list_match_eligible_lost_reports(db: Session) -> list[LostReport]:
    """Lost reports the matching worker should consider (FR-102: Closed reports are excluded).

    Nothing calls this yet. It's the entry point for the matching work (FR-109).
    """
    return list(db.scalars(select(LostReport).where(LostReport.status == ReportStatus.OPEN)))


def create_found_report(
    db: Session, *, owner_id: str, location: str, drop_off: str,
    description: str, question: str, image_key: str, answer: str = "",
) -> FoundReport:
    report = FoundReport(
        owner_id=owner_id, location=location, drop_off=drop_off,
        description=description, question=question, answer=answer, image_key=image_key,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_found_report(db: Session, report_id: str) -> FoundReport | None:
    return db.get(FoundReport, report_id)


def claim_found_report(db: Session, lost: LostReport, found: FoundReport) -> LostReport:
    found.status = FoundReportStatus.CLAIMED
    found.claimed_by_id = lost.owner_id
    lost.claimed_found_report_id = found.id
    db.commit()
    db.refresh(lost)
    return lost
