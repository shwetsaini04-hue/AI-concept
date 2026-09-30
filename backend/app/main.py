"""FastAPI app: health, provider-agnostic LLM calls, progress sync and scikit-learn metrics.

Run:  uvicorn app.main:app --reload --port 8000   (from the backend/ directory)
"""

from __future__ import annotations

import time

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .config import get_settings
from .db import ProgressSnapshot, dialect_name, get_session, init_engine
from .llm import PROVIDER_CLASSES, get_provider

settings = get_settings()
app = FastAPI(title="Transcript AI Lab API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup() -> None:
    init_engine()


# ------------------------------------------------------------------ health
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "database": dialect_name(), "time": time.time()}


# ------------------------------------------------------------------ LLM
class Message(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class GenerateRequest(BaseModel):
    provider: str
    model: str | None = None
    system: str | None = None
    messages: list[Message]
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1)


@app.get("/api/llm/providers")
def providers() -> dict:
    out = []
    for cls in PROVIDER_CLASSES:
        p = cls(settings)
        reason = p.unavailable_reason()
        out.append({"id": p.id, "label": p.label, "available": reason is None, "default_model": p.default_model, "reason": reason})
    return {"providers": out}


@app.post("/api/llm/generate")
def generate(req: GenerateRequest) -> dict:
    try:
        provider = get_provider(req.provider, settings)
    except KeyError:
        raise HTTPException(404, f"Unknown provider '{req.provider}'")
    reason = provider.unavailable_reason()
    if reason:
        raise HTTPException(400, f"Provider '{req.provider}' unavailable: {reason}")
    max_tokens = min(req.max_tokens or settings.max_output_tokens, settings.max_output_tokens)
    try:
        r = provider.generate(req.system, [m.model_dump() for m in req.messages], req.model, req.temperature, max_tokens)
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"{provider.label} returned {e.response.status_code}: {e.response.text[:300]}")
    except httpx.HTTPError as e:
        raise HTTPException(502, f"{provider.label} request failed: {e}")
    return {"text": r.text, "provider": r.provider, "model": r.model, "latency_ms": r.latency_ms, "input_tokens": r.input_tokens, "output_tokens": r.output_tokens}


# ------------------------------------------------------------------ progress
class ProgressIn(BaseModel):
    data: dict
    updated_at: int


@app.get("/api/progress/{learner_id}")
def get_progress(learner_id: str, db: Session = Depends(get_session)) -> dict:
    row = db.get(ProgressSnapshot, learner_id)
    return {"data": row.data if row else None, "updated_at": row.client_updated_at if row else None}


@app.put("/api/progress/{learner_id}")
def put_progress(learner_id: str, body: ProgressIn, db: Session = Depends(get_session)) -> dict:
    if len(learner_id) > 64:
        raise HTTPException(400, "learner_id too long")
    row = db.get(ProgressSnapshot, learner_id)
    if row and row.client_updated_at > body.updated_at:
        return {"ok": False, "reason": "server has newer data"}
    if row:
        row.data, row.client_updated_at = body.data, body.updated_at
    else:
        db.add(ProgressSnapshot(learner_id=learner_id, data=body.data, client_updated_at=body.updated_at))
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ metrics (scikit-learn)
class ClassificationIn(BaseModel):
    labels: list[str]
    gold: list[str]
    pred: list[str]


@app.post("/api/metrics/classification")
def classification(body: ClassificationIn) -> dict:
    from sklearn.metrics import classification_report, confusion_matrix

    if len(body.gold) != len(body.pred) or not body.gold:
        raise HTTPException(400, "gold and pred must be non-empty and equal length")
    report = classification_report(body.gold, body.pred, labels=body.labels, output_dict=True, zero_division=0)
    matrix = confusion_matrix(body.gold, body.pred, labels=body.labels).tolist()
    return {"report": report, "confusion_matrix": matrix}


class AgreementIn(BaseModel):
    a: list[str]
    b: list[str]


@app.post("/api/metrics/cohen-kappa")
def cohen(body: AgreementIn) -> dict:
    from sklearn.metrics import cohen_kappa_score

    if len(body.a) != len(body.b) or not body.a:
        raise HTTPException(400, "a and b must be non-empty and equal length")
    raw = sum(x == y for x, y in zip(body.a, body.b)) / len(body.a)
    return {"kappa": float(cohen_kappa_score(body.a, body.b)), "raw_agreement": raw}


class EmbedIn(BaseModel):
    texts: list[str]
    model: str = "sentence-transformers/all-MiniLM-L6-v2"


@app.post("/api/embeddings")
def embeddings(body: EmbedIn) -> dict:
    try:
        from sentence_transformers import SentenceTransformer  # optional dependency
    except ImportError:
        raise HTTPException(501, "sentence-transformers not installed: pip install -r requirements-ml.txt")
    vectors = SentenceTransformer(body.model).encode(body.texts, normalize_embeddings=True)
    return {"model": body.model, "vectors": vectors.tolist()}
