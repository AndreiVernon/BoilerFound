"""Placeholder bearer-token auth. Covers the parts of FR-105's test method that apply before a real
provider is chosen: valid credentials work, invalid ones and missing ones get an authorization error."""

import pytest
from fastapi.testclient import TestClient

from app.auth import DEV_USERS
from app.main import create_app


def test_health_does_not_require_auth(client):
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize("dev_user", DEV_USERS, ids=lambda u: u.email)
def test_each_dev_user_can_authenticate(client, dev_user):
    response = client.get("/me", headers={"Authorization": f"Bearer {dev_user.token}"})
    assert response.status_code == 200
    assert response.json()["email"] == dev_user.email


def test_dev_users_get_distinct_ids(client):
    ids = {
        client.get("/me", headers={"Authorization": f"Bearer {u.token}"}).json()["id"] for u in DEV_USERS
    }
    assert len(ids) == len(DEV_USERS)


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-real-token"},
        {"Authorization": "Bearer "},
        {"Authorization": "Basic ZGV2LXRva2VuLWFsaWNlOg=="},
        {"Authorization": "dev-token-alice"},
    ],
    ids=["missing", "unknown-token", "empty-token", "wrong-scheme", "no-scheme"],
)
def test_invalid_or_missing_credentials_are_rejected(client, headers):
    response = client.get("/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_dev_auth_can_be_disabled(settings):
    settings.enable_dev_auth = False
    with TestClient(create_app(settings)) as client:
        response = client.get("/me", headers={"Authorization": "Bearer dev-token-alice"})
    assert response.status_code == 401


def test_startup_seeding_is_idempotent(settings):
    # Restarting the app against the same database must not duplicate the dev users.
    for _ in range(2):
        with TestClient(create_app(settings)) as client:
            assert client.get("/me", headers={"Authorization": "Bearer dev-token-bob"}).status_code == 200
