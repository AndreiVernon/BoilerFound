"""FR-103 submission and FR-106 owner access for the found-report prototype API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import crud
from app.main import create_app
from app.models import FoundReport
from tests.conftest import ALICE, BOB, make_jpeg, make_png


def submit(client, *, headers=ALICE, fields=None, image=None):
    return client.post(
        "/found-reports", headers=headers,
        data={"location": "WALC, second floor", **(fields or {})},
        files={"image": image or ("bottle.png", make_png(), "image/png")},
    )


@pytest.mark.parametrize("image", [
    ("bottle.png", make_png(), "image/png"),
    ("bottle.jpg", make_jpeg(), "image/jpeg"),
])
def test_create_and_retrieve_complete_report(client, image):
    response = submit(client, image=image, fields={
        "location": "  WALC, second floor  ", "drop_off": " WALC front desk ",
        "description": " Blue bottle ", "question": " What sticker is on the bottom? ",
    })
    assert response.status_code == 201
    report = response.json()
    assert report["location"] == "WALC, second floor"
    assert report["drop_off"] == "WALC front desk"
    assert report["description"] == "Blue bottle"
    assert report["question"] == "What sticker is on the bottom?"
    assert report["status"] == "available"
    assert report["id"] and report["owner_id"] and report["created_at"]
    assert "image_key" not in report
    assert client.get(f"/found-reports/{report['id']}", headers=ALICE).json() == report
    photo = client.get(report["image_url"], headers=ALICE)
    assert photo.status_code == 200
    assert photo.content == image[1]


def test_only_photo_and_location_are_required(client):
    response = submit(client)
    assert response.status_code == 201
    assert {field: response.json()[field] for field in ["description", "drop_off", "question"]} == {
        "description": "", "drop_off": "", "question": "",
    }


def test_ten_reports_have_unique_server_ids(client):
    reports = [submit(client).json() for _ in range(10)]
    assert len({report["id"] for report in reports}) == 10


@pytest.mark.parametrize("fields", [
    {"location": ""}, {"location": "   "}, {"location": "x" * 151},
    {"drop_off": "x" * 151}, {"description": "x" * 1001}, {"question": "x" * 301},
])
def test_invalid_fields_create_neither_report_nor_upload(client, db, uploaded_files, fields):
    assert submit(client, fields=fields).status_code == 422
    assert db.scalar(select(func.count()).select_from(FoundReport)) == 0
    assert uploaded_files() == []


@pytest.mark.parametrize("data,files", [
    ({"location": "WALC"}, None),
    ({}, {"image": ("bottle.png", make_png(), "image/png")}),
])
def test_missing_required_fields(client, uploaded_files, data, files):
    assert client.post("/found-reports", headers=ALICE, data=data, files=files).status_code == 422
    assert uploaded_files() == []


@pytest.mark.parametrize("payload", [b"not an image", b""])
def test_invalid_photo(client, uploaded_files, payload):
    assert submit(client, image=("fake.png", payload, "image/png")).status_code == 415
    assert uploaded_files() == []


def test_oversized_image(client, settings, uploaded_files):
    settings.max_image_bytes = 16
    assert submit(client).status_code == 413
    assert uploaded_files() == []


def test_image_type_is_checked_by_content(client):
    response = submit(client, image=("wrong.txt", make_png(), "text/plain"))
    assert response.status_code == 201
    assert client.get(response.json()["image_url"], headers=ALICE).headers["content-type"] == "image/png"


def test_owner_checks_and_missing_reports(client):
    report = submit(client).json()
    for endpoint in [f"/found-reports/{report['id']}", report["image_url"]]:
        assert client.get(endpoint, headers=BOB).status_code == 403
        assert client.get(endpoint).status_code == 401
    assert client.get("/found-reports/missing", headers=ALICE).status_code == 404
    assert client.get("/found-reports/missing/image", headers=ALICE).status_code == 404
    assert submit(client, headers={}).status_code == 401


def test_missing_image_file(client, settings):
    report = submit(client).json()
    next(settings.upload_dir.iterdir()).unlink()
    assert client.get(report["image_url"], headers=ALICE).status_code == 404


def test_database_failure_cleans_up_image(client, uploaded_files, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError("Simulated database failure")
    monkeypatch.setattr(crud, "create_found_report", fail)
    with pytest.raises(RuntimeError, match="Simulated database failure"):
        submit(client)
    assert uploaded_files() == []


def test_report_and_image_persist_after_server_restart(settings):
    with TestClient(create_app(settings)) as first:
        report = submit(first).json()
    with TestClient(create_app(settings)) as restarted:
        assert restarted.get(f"/found-reports/{report['id']}", headers=ALICE).json() == report
        assert restarted.get(report["image_url"], headers=ALICE).content == make_png()


def test_cors_preflight_allows_only_configured_origins(client):
    headers = {"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization"}
    response = client.options("/found-reports", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
    headers["Origin"] = "https://unrelated.example"
    rejected = client.options("/found-reports", headers=headers)
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers
