"""FR-102: Lost Report Editing and Closure.

SDP test method: Create 5 lost-item reports, modify their descriptions and locations, and verify the
updates are saved. Close all 5 reports and confirm they are excluded from subsequent matching requests.
Attempt to edit another user's report and verify that access is denied.

Matching isn't built yet, so "excluded from matching" is checked through
crud.list_match_eligible_lost_reports(), the function the matching worker will call.
"""

import pytest

from app import crud
from app.models import ReportStatus
from tests.conftest import ALICE, BOB, CAROL, make_png


def test_owner_edits_to_five_reports_are_saved(client, create_report):
    reports = [create_report(description=f"Original description {i}", location=f"Old spot {i}") for i in range(5)]

    for i, report in enumerate(reports):
        response = client.patch(
            f"/lost-reports/{report['id']}",
            json={"description": f"Updated description {i}", "location": f"New spot {i}"},
            headers=ALICE,
        )
        assert response.status_code == 200, response.text

    for i, report in enumerate(reports):
        saved = client.get(f"/lost-reports/{report['id']}", headers=ALICE).json()
        assert saved["description"] == f"Updated description {i}"
        assert saved["location"] == f"New spot {i}"
        assert saved["status"] == "open"
        assert saved["updated_at"] >= report["updated_at"]


def test_partial_update_leaves_other_fields_alone(client, create_report):
    report = create_report(description="Red North Face backpack", location="Krach Leadership Center")
    response = client.patch(f"/lost-reports/{report['id']}", json={"location": "PMU food court"}, headers=ALICE)
    assert response.status_code == 200
    assert response.json()["description"] == "Red North Face backpack"
    assert response.json()["location"] == "PMU food court"


def test_closed_reports_are_kept_but_excluded_from_matching(client, db, create_report, count_reports):
    reports = [create_report(description=f"Lost item number {i}") for i in range(5)]
    still_open = create_report(headers=BOB, description="Bob's report stays open")

    for report in reports:
        response = client.patch(f"/lost-reports/{report['id']}", json={"status": "closed"}, headers=ALICE)
        assert response.status_code == 200
        assert response.json()["status"] == "closed"

    # Still stored and still readable by the owner.
    assert count_reports() == 6
    for report in reports:
        assert client.get(f"/lost-reports/{report['id']}", headers=ALICE).json()["status"] == "closed"

    db.expire_all()
    eligible_ids = {r.id for r in crud.list_match_eligible_lost_reports(db)}
    assert eligible_ids == {still_open["id"]}


def test_closed_report_can_be_reopened(client, db, create_report):
    report = create_report()
    client.patch(f"/lost-reports/{report['id']}", json={"status": "closed"}, headers=ALICE)

    response = client.patch(f"/lost-reports/{report['id']}", json={"status": "open"}, headers=ALICE)
    assert response.status_code == 200
    assert response.json()["status"] == "open"
    db.expire_all()
    assert report["id"] in {r.id for r in crud.list_match_eligible_lost_reports(db)}


def test_status_filter_on_list(client, create_report):
    open_report = create_report(description="Still missing my keys")
    closed_report = create_report(description="Found my AirPods myself")
    client.patch(f"/lost-reports/{closed_report['id']}", json={"status": "closed"}, headers=ALICE)

    def ids(query: str) -> set[str]:
        return {r["id"] for r in client.get(f"/lost-reports{query}", headers=ALICE).json()}

    assert ids("") == {open_report["id"], closed_report["id"]}
    assert ids("?status=open") == {open_report["id"]}
    assert ids("?status=closed") == {closed_report["id"]}


# --- Access control (FR-102 "access is denied", with FR-106's 403 requirement) ---


def test_editing_another_users_report_is_forbidden(client, create_report):
    report = create_report(headers=ALICE, description="Alice's silver iPhone")

    response = client.patch(
        f"/lost-reports/{report['id']}", json={"description": "Hijacked by Bob"}, headers=BOB
    )
    assert response.status_code == 403
    assert client.get(f"/lost-reports/{report['id']}", headers=ALICE).json() == report


def test_ten_cross_account_modifications_are_rejected_and_data_is_unchanged(client, db, create_report):
    """Follows FR-106's test method: two accounts with 5 reports each, 10 cross-account edit attempts."""
    alice_reports = [create_report(headers=ALICE, description=f"Alice item {i}") for i in range(5)]
    bob_reports = [create_report(headers=BOB, description=f"Bob item {i}") for i in range(5)]

    # Both owners can edit their own reports.
    for owner, report in [(ALICE, alice_reports[0]), (BOB, bob_reports[0])]:
        response = client.patch(f"/lost-reports/{report['id']}", json={"location": "Owner edit"}, headers=owner)
        assert response.status_code == 200
    snapshot = {
        r["id"]: client.get(f"/lost-reports/{r['id']}", headers=owner).json()
        for owner, group in [(ALICE, alice_reports), (BOB, bob_reports)]
        for r in group
    }

    attempts = [
        {"description": "Cross-account description edit"},
        {"location": "Cross-account location edit"},
        {"status": "closed"},
        {"description": "Everything at once", "location": "Somewhere", "status": "closed"},
        {"status": "open"},
    ]
    rejected = 0
    for attacker, victims in [(BOB, alice_reports), (ALICE, bob_reports)]:
        for victim, body in zip(victims, attempts):
            response = client.patch(f"/lost-reports/{victim['id']}", json=body, headers=attacker)
            assert response.status_code == 403
            rejected += 1
    assert rejected == 10

    for owner, group in [(ALICE, alice_reports), (BOB, bob_reports)]:
        for r in group:
            assert client.get(f"/lost-reports/{r['id']}", headers=owner).json() == snapshot[r["id"]]


def test_non_owner_cannot_view_report_or_image(client, create_report):
    report = create_report(image=("a.png", make_png(), "image/png"))
    assert client.get(f"/lost-reports/{report['id']}", headers=CAROL).status_code == 403
    assert client.get(f"/lost-reports/{report['id']}/image", headers=CAROL).status_code == 403


def test_list_only_returns_callers_reports(client, create_report):
    alice_report = create_report(headers=ALICE)
    create_report(headers=BOB)
    assert [r["id"] for r in client.get("/lost-reports", headers=ALICE).json()] == [alice_report["id"]]
    assert client.get("/lost-reports", headers=CAROL).json() == []


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}], ids=["no-token", "bad-token"])
def test_unauthenticated_edit_is_rejected(client, create_report, headers):
    report = create_report()
    response = client.patch(f"/lost-reports/{report['id']}", json={"status": "closed"}, headers=headers)
    assert response.status_code == 401
    assert client.get(f"/lost-reports/{report['id']}", headers=ALICE).json()["status"] == "open"


def test_editing_unknown_report_returns_404(client):
    response = client.patch("/lost-reports/does-not-exist", json={"status": "closed"}, headers=ALICE)
    assert response.status_code == 404


# --- Validation on update ---


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"description": "abcd"},
        {"description": "x" * 1001},
        {"description": "      "},
        {"location": ""},
        {"location": "L" * 151},
        {"status": "lost"},
        {"status": "Closed"},
        {"description": None},
        {"status": None},
        {"image_key": "../../etc/passwd"},
        {"owner_id": "someone-else"},
    ],
    ids=[
        "empty-body",
        "description-under-5",
        "description-over-1000",
        "description-only-whitespace",
        "location-empty",
        "location-over-150",
        "unknown-status",
        "status-wrong-case",
        "null-description",
        "null-status",
        "image-not-editable",
        "owner-not-editable",
    ],
)
def test_invalid_updates_are_rejected_and_report_is_unchanged(client, create_report, body):
    report = create_report()
    response = client.patch(f"/lost-reports/{report['id']}", json=body, headers=ALICE)
    assert response.status_code == 422
    assert client.get(f"/lost-reports/{report['id']}", headers=ALICE).json() == report


def test_status_values_match_sdp():
    assert {s.value for s in ReportStatus} == {"open", "closed"}
