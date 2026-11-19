from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import crud
from app.auth import CurrentUser
from app.config import Settings, get_settings
from app.database import get_db
from app.models import FoundReport, User
from app.schemas import DropOff, FoundDescription, FoundReportRead, Location, OwnerAnswer, OwnerQuestion
from app.storage import (
    CONTENT_TYPES, ImageTooLarge, LocalImageStore, UnsupportedImageType,
    get_image_store, read_and_validate_image,
)

router = APIRouter(prefix="/found-reports", tags=["found reports"])
DB = Annotated[Session, Depends(get_db)]
ImageStore = Annotated[LocalImageStore, Depends(get_image_store)]


def _get_owned_report(db: Session, report_id: str, user: User) -> FoundReport:
    report = crud.get_found_report(db, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Found report not found")
    if report.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this report")
    return report


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FoundReportRead)
def create_found_report(
    location: Annotated[Location, Form()],
    image: Annotated[UploadFile, File(description="Required JPEG or PNG, max 10 MB")],
    user: CurrentUser,
    db: DB,
    store: ImageStore,
    settings: Annotated[Settings, Depends(get_settings)],
    drop_off: Annotated[DropOff, Form()] = "",
    description: Annotated[FoundDescription, Form()] = "",
    question: Annotated[OwnerQuestion, Form()] = "",
    answer: Annotated[OwnerAnswer, Form(description="Expected answer to `question`; never returned")] = "",
):
    """FR-103: validate the required image and location before storing a found report."""
    try:
        validated = read_and_validate_image(image.file, settings.max_image_bytes)
    except ImageTooLarge:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Image exceeds 10 MB")
    except UnsupportedImageType:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Image must be JPEG or PNG")

    image_key = store.save(validated)
    try:
        return crud.create_found_report(
            db, owner_id=user.id, location=location, drop_off=drop_off,
            description=description, question=question, answer=answer, image_key=image_key,
        )
    except Exception:
        db.rollback()
        store.delete(image_key)
        raise


@router.get("/{report_id}", response_model=FoundReportRead)
def get_found_report(report_id: str, user: CurrentUser, db: DB):
    """Read a report for confirmation; verification questions remain owner-only."""
    return _get_owned_report(db, report_id, user)


@router.get("/{report_id}/image", response_class=FileResponse)
def get_found_report_image(report_id: str, user: CurrentUser, db: DB, store: ImageStore):
    report = _get_owned_report(db, report_id, user)
    path = store.path_for(report.image_key)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image file is missing")
    return FileResponse(path, media_type=CONTENT_TYPES[path.suffix])
