"""Placeholder bearer-token auth.

A fixed set of dev users, each with a hardcoded token. This stands in for Firebase/Cognito until the
team picks one. When that happens, replace get_current_user with real token verification; routes only
depend on it returning a User, so nothing else should need to change.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import User


@dataclass(frozen=True)
class DevUser:
    token: str
    email: str
    display_name: str


DEV_USERS = (
    DevUser(token="dev-token-alice", email="alice@example.com", display_name="Alice (dev)"),
    DevUser(token="dev-token-bob", email="bob@example.com", display_name="Bob (dev)"),
    DevUser(token="dev-token-carol", email="carol@example.com", display_name="Carol (dev)"),
)
_DEV_USERS_BY_TOKEN = {user.token: user for user in DEV_USERS}

bearer_scheme = HTTPBearer(auto_error=False)


def seed_dev_users(db: Session) -> None:
    existing = set(db.scalars(select(User.email)))
    for dev_user in DEV_USERS:
        if dev_user.email not in existing:
            db.add(User(email=dev_user.email, display_name=dev_user.display_name))
    db.commit()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or not settings.enable_dev_auth:
        raise unauthorized
    dev_user = _DEV_USERS_BY_TOKEN.get(credentials.credentials)
    if dev_user is None:
        raise unauthorized
    user = db.scalar(select(User).where(User.email == dev_user.email))
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
