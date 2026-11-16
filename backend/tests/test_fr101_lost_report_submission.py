"""FR-101: Lost Item Report Submission.

SDP test method: Submit 10 reports containing valid descriptions and locations and verify that all 10
are stored with unique report IDs. Submit reports with missing required fields and descriptions
exceeding 1,000 characters, and verify that each is rejected without creating a record.
"""

import pytest
from sqlalchemy import select

from app.models import LostReport, ReportStatus
from tests.conftest import ALICE, make_jpeg, make_png

TEN_MB = 10 * 1024 * 1024


def test_ten_valid_reports_are_stored_with_unique_ids(client, db, count_reports):
    ids = []
    for i in range(10):
        response = client.post(
            "/lost-reports",
            data={"description": f"Black umbrella number {i}", "location": f"Lawson B{i:03d}"},
            headers=ALICE,
        )
        assert response.status_code == 201, response.text
        ids.append(response.json()["id"])

    assert len(set(ids)) == 10
    assert count_reports() == 10
    stored = {r.id: r for r in db.scalars(select(LostReport))}
    assert set(stored) == set(ids)
    for i, report_id in enumerate(ids):
        assert stored[report_id].description == f"Black umbrella number {i}"
        assert stored[report_id].location == f"Lawson B{i:03d}"
        assert stored[report_id].status == ReportStatus.OPEN


def test_new_report_is_open_owned_by_submitter_and_has_no_image(client, create_report):
    me = client.get("/me", headers=ALICE).json()
    report = create_report()
    assert report["status"] == "open"
    assert report["owner_id"] == me["id"]
    assert report["image_url"] is None


def test_surrounding_whitespace_is_trimmed(create_report):
    report = create_report(description="   Gray laptop charger  ", location="  ARMS 1010 ")
    assert report["description"] == "Gray laptop charger"
    assert report["location"] == "ARMS 1010"


@pytest.mark.parametrize(
    ("description", "location"),
    [("x" * 5, "L"), ("x" * 1000, "L" * 150)],
    ids=["minimum-lengths", "maximum-lengths"],
)
def test_boundary_lengths_are_accepted(create_report, description, location):
    report = create_report(description=description, location=location)
    assert report["description"] == description
    assert report["location"] == location


@pytest.mark.parametrize(
    ("make_image", "filename", "mime", "suffix"),
    [(make_png, "bottle.png", "image/png", ".png"), (make_jpeg, "bottle.jpg", "image/jpeg", ".jpg")],
    ids=["png", "jpeg"],
)
def test_report_with_image_stores_it_and_serves_it_to_owner(
    client, create_report, uploaded_files, make_image, filename, mime, suffix
):
    image_bytes = make_image()
    report = create_report(image=(filename, image_bytes, mime))

    assert report["image_url"] == f"/lost-reports/{report['id']}/image"
    files = uploaded_files()
    assert len(files) == 1
    assert files[0].suffix == suffix
    assert files[0].read_bytes() == image_bytes
    assert filename not in files[0].name  # server-generated name, not the client's

    response = client.get(report["image_url"], headers=ALICE)
    assert response.status_code == 200
    assert response.headers["content-type"] == mime
    assert response.content == image_bytes


def test_image_exactly_at_size_limit_is_accepted(create_report, uploaded_files):
    png = make_png()
    image = png + b"\x00" * (TEN_MB - len(png))
    create_report(image=("big.png", image, "image/png"))
    assert uploaded_files()[0].stat().st_size == TEN_MB


def test_report_without_image_has_no_image_endpoint(client, create_report):
    report = create_report()
    assert client.get(f"/lost-reports/{report['id']}/image", headers=ALICE).status_code == 404


# --- Rejections: each must leave no database row and no uploaded file behind. ---

VALID = {"description": "Blue Hydro Flask water bottle", "location": "WALC 2nd floor"}


@pytest.mark.parametrize(
    "data",
    [
        {"location": VALID["location"]},
        {"description": VALID["description"]},
        {},
        {**VALID, "description": "x" * 1001},
        {**VALID, "description": "abcd"},
        {**VALID, "description": "     "},
        {**VALID, "description": "  abc  "},
        {**VALID, "location": ""},
        {**VALID, "location": "   "},
        {**VALID, "location": "L" * 151},
    ],
    ids=[
        "missing-description",
        "missing-location",
        "missing-both",
        "description-over-1000",
        "description-under-5",
        "description-only-whitespace",
        "description-under-5-after-trim",
        "location-empty",
        "location-only-whitespace",
        "location-over-150",
    ],
)
def test_invalid_fields_are_rejected_without_creating_a_record(client, count_reports, uploaded_files, data):
    response = client.post(
        "/lost-reports", data=data, files={"image": ("a.png", make_png(), "image/png")}, headers=ALICE
    )
    assert response.status_code == 422
    assert count_reports() == 0
    assert uploaded_files() == []


@pytest.mark.parametrize(
    ("image", "expected_status"),
    [
        (("item.gif", b"GIF89a" + b"\x00" * 64, "image/gif"), 415),
        (("item.png", b"this is not an image at all", "image/png"), 415),
        (("item.jpg", b"%PDF-1.7 pretending to be a jpeg", "image/jpeg"), 415),
        (("item.png", b"", "image/png"), 415),
        (("item.png", make_png() + b"\x00" * (TEN_MB + 1 - len(make_png())), "image/png"), 413),
    ],
    ids=["gif", "text-with-png-extension", "pdf-with-jpeg-extension", "empty-file", "over-10mb"],
)
def test_invalid_images_are_rejected_without_creating_a_record(
    client, count_reports, uploaded_files, image, expected_status
):
    response = client.post("/lost-reports", data=VALID, files={"image": image}, headers=ALICE)
    assert response.status_code == expected_status
    assert count_reports() == 0
    assert uploaded_files() == []


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}], ids=["no-token", "bad-token"])
def test_unauthenticated_submission_is_rejected_without_creating_a_record(
    client, count_reports, uploaded_files, headers
):
    response = client.post(
        "/lost-reports", data=VALID, files={"image": ("a.png", make_png(), "image/png")}, headers=headers
    )
    assert response.status_code == 401
    assert count_reports() == 0
    assert uploaded_files() == []


def test_uploaded_file_is_removed_if_database_write_fails(client, count_reports, uploaded_files, monkeypatch):
    from app import crud

    def failing_create(*args, **kwargs):
        raise RuntimeError("simulated database failure")

    monkeypatch.setattr(crud, "create_lost_report", failing_create)
    with pytest.raises(RuntimeError):
        client.post("/lost-reports", data=VALID, files={"image": ("a.png", make_png(), "image/png")}, headers=ALICE)
    assert count_reports() == 0
    assert uploaded_files() == []
