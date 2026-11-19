from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import crud, matching
from app.auth import CurrentUser
from app.config import Settings, get_settings
from app.database import get_db
from app.models import LostReport, ReportStatus, User
from app.schemas import ClaimRequest, Description, Location, LostReportRead, LostReportUpdate, MatchRead
from app.storage import (
    CONTENT_TYPES,
    ImageTooLarge,
    LocalImageStore,
    UnsupportedImageType,
    get_image_store,
    read_and_validate_image,
)

router = APIRouter(prefix="/lost-reports", tags=["lost reports"])

DB = Annotated[Session, Depends(get_db)]
ImageStore = Annotated[LocalImageStore, Depends(get_image_store)]


def _get_owned_report(db: Session, report_id: str, user: User) -> LostReport:
    report = crud.get_lost_report(db, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lost report not found")
    if report.owner_id != user.id:
        # FR-106: ownership failures are rejected with 403.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this report")
    return report


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LostReportRead)
def create_lost_report(
    description: Annotated[Description, Form()],
    location: Annotated[Location, Form()],
    user: CurrentUser,
    db: DB,
    store: ImageStore,
    settings: Annotated[Settings, Depends(get_settings)],
    image: Annotated[UploadFile | None, File(description="Optional JPEG or PNG, max 10 MB")] = None,
):
    """FR-101: submit a lost-item report. Everything is validated before anything is written."""
    validated_image = None
    if image is not None and image.filename:
        try:
            validated_image = read_and_validate_image(image.file, settings.max_image_bytes)
        except ImageTooLarge:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                f"Image exceeds {settings.max_image_bytes // (1024 * 1024)} MB",
            )
        except UnsupportedImageType:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Image must be JPEG or PNG")

    image_key = store.save(validated_image) if validated_image else None
    try:
        return crud.create_lost_report(
            db, owner_id=user.id, description=description, location=location, image_key=image_key
        )
    except Exception:
        if image_key:
            store.delete(image_key)
        raise


@router.get("", response_model=list[LostReportRead])
def list_my_lost_reports(
    user: CurrentUser,
    db: DB,
    status_filter: Annotated[ReportStatus | None, Query(alias="status")] = None,
):
    return crud.list_lost_reports_for_owner(db, user.id, status_filter)


@router.get("/{report_id}", response_model=LostReportRead)
def get_lost_report(report_id: str, user: CurrentUser, db: DB):
    return _get_owned_report(db, report_id, user)


@router.patch("/{report_id}", response_model=LostReportRead)
def update_lost_report(report_id: str, changes: LostReportUpdate, user: CurrentUser, db: DB):
    """FR-102: owner edits description/location, or moves status between open and closed."""
    report = _get_owned_report(db, report_id, user)
    return crud.update_lost_report(db, report, changes.model_dump(exclude_unset=True))


@router.get("/{report_id}/image", response_class=FileResponse)
def get_lost_report_image(report_id: str, user: CurrentUser, db: DB, store: ImageStore):
    report = _get_owned_report(db, report_id, user)
    if report.image_key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This report has no image")
    return _image_response(store, report.image_key)


@router.get("/{report_id}/matches", response_model=list[MatchRead])
def list_matches(report_id: str, user: CurrentUser, db: DB):
    """FR-109 (placeholder scoring): found items that may be this report's lost item."""
    report = _get_owned_report(db, report_id, user)
    if report.status == ReportStatus.CLOSED or report.claimed_found_report_id:
        return []
    return [
        MatchRead(
            id=item.id,
            description=item.description,
            location=item.location,
            question=item.question,
            created_at=item.created_at,
            image_url=f"/lost-reports/{report.id}/matches/{item.id}/image",
        )
        for item in matching.find_matches(db, report)
    ]


@router.get("/{report_id}/matches/{found_report_id}/image", response_class=FileResponse)
def get_match_image(report_id: str, found_report_id: str, user: CurrentUser, db: DB, store: ImageStore):
    report = _get_owned_report(db, report_id, user)
    item = matching.get_match(db, report, found_report_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching item with that id")
    return _image_response(store, item.image_key)


@router.post("/{report_id}/claim", response_model=LostReportRead)
def claim_match(report_id: str, claim: ClaimRequest, user: CurrentUser, db: DB):
    """Claim a matched found item by answering the finder's question. Success reveals the pickup location."""
    report = _get_owned_report(db, report_id, user)
    if report.status == ReportStatus.CLOSED:
        raise HTTPException(status.HTTP_409_CONFLICT, "This report is closed")
    if report.claimed_found_report_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "An item has already been claimed for this report")
    item = matching.get_match(db, report, claim.found_report_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching item with that id")
    if item.answer and _normalize(claim.answer) != _normalize(item.answer):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That answer doesn't match")
    return crud.claim_found_report(db, report, item)


def _normalize(answer: str) -> str:
    return " ".join(answer.split()).casefold()


def _image_response(store: LocalImageStore, image_key: str) -> FileResponse:
    path = store.path_for(image_key)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image file is missing")
    return FileResponse(path, media_type=CONTENT_TYPES[path.suffix])
