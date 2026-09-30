"""Database setup. SQLite by default; PostgreSQL when DATABASE_URL points at it."""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import BigInteger, DateTime, String, create_engine, func
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.types import JSON

from .config import get_settings


class Base(DeclarativeBase):
    pass


class ProgressSnapshot(Base):
    """One row per learner: the full progress document (lessons, attempts, mistakes, reviews…)."""

    __tablename__ = "progress_snapshots"

    learner_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    client_updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    server_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def init_engine(url: str | None = None) -> Engine:
    """Create the engine and tables. Safe to call repeatedly (tests call it with a temp URL)."""
    global _engine, _SessionLocal
    url = url or get_settings().database_url
    kwargs: dict = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        db_path = url.split("///", 1)[-1]
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _engine = create_engine(url, **kwargs)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(_engine)
    return _engine


def get_session() -> Iterator[Session]:
    if _SessionLocal is None:
        init_engine()
    assert _SessionLocal is not None
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()


def dialect_name() -> str:
    return _engine.dialect.name if _engine is not None else "uninitialized"
