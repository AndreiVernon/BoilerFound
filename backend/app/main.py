from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker

from app.auth import CurrentUser, seed_dev_users
from app.config import Settings
from app.database import Base, make_engine
from app.routers import lost_reports
from app.schemas import UserRead


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = make_engine(settings.database_url)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # create_all is fine while we're on SQLite; switch to Alembic migrations with the Postgres move.
        Base.metadata.create_all(engine)
        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        if settings.enable_dev_auth:
            with session_factory() as db:
                seed_dev_users(db)
        yield
        engine.dispose()

    app = FastAPI(title="BoilerFound API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.session_factory = session_factory

    @app.get("/health", tags=["meta"])
    def health():
        return {"status": "ok"}

    @app.get("/me", response_model=UserRead, tags=["account"])
    def me(user: CurrentUser):
        return user

    app.include_router(lost_reports.router)
    return app


app = create_app()
