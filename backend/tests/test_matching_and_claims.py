"""FR-109 placeholder matching and claiming a matched found item by answering the finder's question."""

import pytest
from fastapi.testclient import TestClient

from app.demo_seed import reset_demo
from app.main import create_app
from tests.conftest import ALICE, BOB, CAROL, make_jpeg, make_png

UMBRELLA = {
    "description": "Black folding umbrella with a wooden handle",
    "location": "Next to the WALC printers, WALC",
    "drop_off": "WALC front desk",
    "question": "What brand is the umbrella?",
    "answer": "Balios",
}


@pytest.fixture
def found_item(client):
    def _create(headers=BOB, **fields):
        response = client.post(
            "/found-reports", headers=headers, data={**UMBRELLA, **fields},
            files={"image": ("umbrella.png", make_png(), "image/png")},
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _create


def matches(client, report, headers=ALICE):
    response = client.get(f"/lost-reports/{report['id']}/matches", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def claim(client, report, item, answer="Balios", headers=ALICE):
    return client.post(
        f"/lost-reports/{report['id']}/claim", headers=headers,
        json={"found_report_id": item["id"], "answer": answer},
    )


def test_match_shows_only_what_an_owner_needs(client, create_report, found_item):
    item = found_item()
    lost = create_report(description="Lost my black umbrella", location="WALC")
    [match] = matches(client, lost)
    assert match["id"] == item["id"]
    assert match["question"] == "What brand is the umbrella?"
    assert set(match) == {"id", "description", "location", "question", "created_at", "image_url"}
    image = client.get(match["image_url"], headers=ALICE)
    assert image.status_code == 200
    assert image.content == make_png()


def test_answer_is_never_returned(client, found_item):
    item = found_item()
    assert "answer" not in item
    assert "answer" not in client.get(f"/found-reports/{item['id']}", headers=BOB).json()


@pytest.mark.parametrize("description,location", [
    ("Blue Hydro Flask water bottle", "WALC printers"),
    ("Red notebook with stickers", "Lawson"),
])
def test_unrelated_items_do_not_match(client, create_report, found_item, description, location):
    found_item()
    assert matches(client, create_report(description=description, location=location)) == []


def test_better_description_overlap_ranks_first(client, create_report, found_item):
    plain = found_item(description="Black umbrella")
    detailed = found_item(description="Black folding umbrella, wooden handle")
    lost = create_report(description="Black folding umbrella with wooden handle", location="WALC")
    assert [match["id"] for match in matches(client, lost)] == [detailed["id"], plain["id"]]


def test_own_found_items_are_not_matches(client, create_report, found_item):
    found_item(headers=ALICE)
    assert matches(client, create_report(description="Black umbrella")) == []


def test_wrong_answer_is_rejected_and_item_stays_available(client, create_report, found_item):
    item = found_item()
    lost = create_report(description="Black umbrella")
    response = claim(client, lost, item, answer="Totes")
    assert response.status_code == 400
    assert matches(client, lost)[0]["id"] == item["id"]


def test_correct_answer_claims_item_and_reveals_pickup(client, create_report, found_item):
    item = found_item()
    lost = create_report(description="Black umbrella")
    response = claim(client, lost, item, answer="  bALIOS ")
    assert response.status_code == 200, response.text
    claimed = response.json()
    assert claimed["claimed_found_report_id"] == item["id"]
    assert claimed["pickup_location"] == "WALC front desk"
    assert claimed["status"] == "open"
    assert client.get(f"/lost-reports/{lost['id']}", headers=ALICE).json() == claimed
    assert client.get(f"/found-reports/{item['id']}", headers=BOB).json()["status"] == "claimed"
    assert matches(client, lost) == []
    assert matches(client, create_report(headers=CAROL, description="Black umbrella"), headers=CAROL) == []
    assert claim(client, lost, item).status_code == 409


def test_pickup_falls_back_to_found_location_and_no_question_needs_no_answer(client, create_report, found_item):
    item = found_item(drop_off="", question="", answer="")
    lost = create_report(description="Black umbrella")
    response = claim(client, lost, item, answer="")
    assert response.status_code == 200, response.text
    assert response.json()["pickup_location"] == "Next to the WALC printers, WALC"


def test_claim_errors(client, create_report, found_item):
    item = found_item()
    unrelated = found_item(description="Silver laptop charger")
    lost = create_report(description="Black umbrella")
    assert claim(client, lost, unrelated).status_code == 404
    assert claim(client, lost, {"id": "missing"}).status_code == 404
    assert claim(client, lost, item, headers=CAROL).status_code == 403
    assert claim(client, lost, item, headers={}).status_code == 401
    client.patch(f"/lost-reports/{lost['id']}", headers=ALICE, json={"status": "closed"})
    assert claim(client, lost, item).status_code == 409
    assert matches(client, lost) == []


def test_match_image_requires_a_match_and_ownership(client, create_report, found_item):
    item = found_item()
    unrelated = found_item(description="Silver laptop charger")
    lost = create_report(description="Black umbrella")
    base = f"/lost-reports/{lost['id']}/matches"
    assert client.get(f"{base}/{unrelated['id']}/image", headers=ALICE).status_code == 404
    assert client.get(f"{base}/{item['id']}/image", headers=CAROL).status_code == 403


def test_demo_seed_supports_the_full_lost_item_flow(settings):
    reset_demo(settings)
    with TestClient(create_app(settings)) as client:
        lost = client.post(
            "/lost-reports", headers=ALICE,
            data={"description": "Black umbrella with a wooden handle", "location": "WALC printers"},
            files={"image": ("umbrella.jpg", make_jpeg(), "image/jpeg")},
        ).json()
        [match] = matches(client, lost)
        assert match["question"] == "What brand is the umbrella?"
        assert client.get(match["image_url"], headers=ALICE).status_code == 200
        assert claim(client, lost, match, answer="balios").json()["pickup_location"] == "WALC front desk"
        closed = client.patch(f"/lost-reports/{lost['id']}", headers=ALICE, json={"status": "closed"})
        assert closed.json()["status"] == "closed"


def test_demo_seed_resets_previous_data(settings):
    first = reset_demo(settings)
    second = reset_demo(settings)
    with TestClient(create_app(settings)) as client:
        assert client.get("/lost-reports", headers=ALICE).json() == []
        assert client.get(f"/found-reports/{first.id}", headers=BOB).status_code == 404
        assert client.get(f"/found-reports/{second.id}", headers=BOB).json()["status"] == "available"
    assert len(list(settings.upload_dir.iterdir())) == 1
