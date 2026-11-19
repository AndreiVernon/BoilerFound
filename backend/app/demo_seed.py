"""Reset the local database and uploads to the prototype demo state.

Run from backend/ with the server stopped: python -m app.demo_seed

Deletes every report and uploaded image, recreates the tables, and adds one found item (Bob's
umbrella) for the lost-item demo.
"""

import shutil

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import crud
from app.auth import seed_dev_users
from app.config import BACKEND_DIR, Settings
from app.database import Base, make_engine
from app.models import FoundReport, User
from app.storage import LocalImageStore, read_and_validate_image

DEMO_IMAGE = BACKEND_DIR / "demo" / "umbrella.jpg"
FINDER_EMAIL = "bob@example.com"


def reset_demo(settings: Settings) -> FoundReport:
    engine = make_engine(settings.database_url)
    try:
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        shutil.rmtree(settings.upload_dir, ignore_errors=True)
        store = LocalImageStore(settings.upload_dir)
        with Session(engine, expire_on_commit=False) as db:
            seed_dev_users(db)
            finder = db.scalar(select(User).where(User.email == FINDER_EMAIL))
            with DEMO_IMAGE.open("rb") as image:
                image_key = store.save(read_and_validate_image(image, settings.max_image_bytes))
            return crud.create_found_report(
                db,
                owner_id=finder.id,
                location="Next to the WALC printers, WALC",
                drop_off="WALC front desk",
                description="Black folding umbrella with a wooden handle",
                question="What brand is the umbrella?",
                answer="Balios",
                image_key=image_key,
            )
    finally:
        engine.dispose()


if __name__ == "__main__":
    item = reset_demo(Settings())
    print(f"Demo data reset. Found item: {item.description} ({item.id})")
