from __future__ import annotations

from contextlib import asynccontextmanager
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from config import settings
from database import engine, Base
from routers import (
    auth, companies, webhooks, upload,
    posts, handover, memory, deals,
    dashboard, marketplace, search, agent, sendbird, stream_chat, admin, ads,
    stories, follows, projects, notifications, communities,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _validate_runtime_safety()
    _seed_admin()
    yield


def _seed_admin():
    """Create admin user if explicitly enabled by env."""
    if not settings.SEED_ADMIN_ENABLED:
        return
    if not settings.SEED_ADMIN_EMAIL or not settings.SEED_ADMIN_PASSWORD:
        raise RuntimeError(
            "SEED_ADMIN_ENABLED=true requires both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD"
        )
    if len(settings.SEED_ADMIN_PASSWORD) < 12:
        raise RuntimeError("SEED_ADMIN_PASSWORD must be at least 12 characters")

    from auth import get_password_hash
    from models import User

    db = next(database.get_db())
    try:
        existing = db.query(User).filter(User.username == settings.SEED_ADMIN_USERNAME).first()
        if not existing:
            for _ in range(100):
                code = str(random.randint(100000, 999999))
                if not db.query(User).filter(User.i_code == code).first():
                    break
            admin = User(
                email=settings.SEED_ADMIN_EMAIL,
                username=settings.SEED_ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.SEED_ADMIN_PASSWORD),
                name="Admin",
                i_code=code,
            )
            db.add(admin)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def _validate_runtime_safety() -> None:
    env = settings.ENVIRONMENT.lower()
    if env in {"prod", "production"}:
        if settings.SECRET_KEY == "change-me-in-production-use-openssl-rand-hex-32":
            raise RuntimeError("SECRET_KEY must be set in production")
        if "*" in settings.CORS_ORIGINS:
            raise RuntimeError("CORS_ORIGINS cannot include '*' in production")


app = FastAPI(
    title="Alloul One API",
    lifespan=lifespan,
)
allow_all_origins = "*" in settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else [],
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(webhooks.router)
app.include_router(upload.router)
app.include_router(posts.router)
app.include_router(handover.router)
app.include_router(memory.router)
app.include_router(deals.router)
app.include_router(dashboard.router)
app.include_router(marketplace.router)
app.include_router(search.router)
app.include_router(agent.router)
app.include_router(sendbird.router)
app.include_router(stream_chat.router)
app.include_router(admin.router)
app.include_router(ads.router)
app.include_router(stories.router)
app.include_router(follows.router)
app.include_router(projects.router)
app.include_router(notifications.router)
app.include_router(communities.router)


@app.get("/")
def root():
    return {
        "name": "Alloul One API",
        "health": "/health",
        "docs": "/docs",
        "auth": {"login": "POST /auth/login", "register": "POST /auth/register", "me": "GET /auth/me"},
    }


@app.get("/health")
def health():
    return {"status": "ok"}
