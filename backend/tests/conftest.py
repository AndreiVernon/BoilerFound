import struct
import zlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.config import Settings
from app.main import create_app
from app.models import LostReport

ALICE = {"Authorization": "Bearer dev-token-alice"}
BOB = {"Authorization": "Bearer dev-token-bob"}
CAROL = {"Authorization": "Bearer dev-token-carol"}


def make_png() -> bytes:
    """A real 1x1 PNG."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00\xff\x00\x00")
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def make_jpeg() -> bytes:
    """JPEG SOI + APP0 header and EOI. Enough for the magic-byte check."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 32 + b"\xff\xd9"


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        upload_dir=tmp_path / "uploads",
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:  # context manager runs startup (tables + dev users)
        yield test_client


@pytest.fixture
def db(app, client):
    session = app.state.session_factory()
    yield session
    session.close()


@pytest.fixture
def count_reports(db):
    def _count() -> int:
        db.expire_all()
        return db.scalar(select(func.count()).select_from(LostReport))

    return _count


@pytest.fixture
def uploaded_files(settings):
    def _files() -> list:
        return sorted(settings.upload_dir.iterdir()) if settings.upload_dir.exists() else []

    return _files


@pytest.fixture
def create_report(client):
    def _create(headers=ALICE, description="Blue Hydro Flask water bottle", location="WALC 2nd floor", image=None):
        files = {"image": image} if image is not None else None
        response = client.post(
            "/lost-reports",
            data={"description": description, "location": location},
            files=files,
            headers=headers,
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _create
