import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _new_id() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetimes. SQLite drops tzinfo on read, so it's reattached here."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            value = value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class ReportStatus(enum.StrEnum):
    OPEN = "open"
    CLOSED = "closed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    display_name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class LostReport(Base):
    __tablename__ = "lost_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    description: Mapped[str] = mapped_column(String(1000))
    location: Mapped[str] = mapped_column(String(150))
    # Storage key (filename in the uploads folder now, an S3 object key later). Never a user-supplied name.
    image_key: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[ReportStatus] = mapped_column(
        Enum(
            ReportStatus,
            native_enum=False,
            length=16,
            values_callable=lambda e: [member.value for member in e],
        ),
        default=ReportStatus.OPEN,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)


class FoundReport(Base):
    __tablename__ = "found_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    location: Mapped[str] = mapped_column(String(150))
    drop_off: Mapped[str] = mapped_column(String(150), default="")
    description: Mapped[str] = mapped_column(String(1000), default="")
    question: Mapped[str] = mapped_column(String(300), default="")
    image_key: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="available", index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
