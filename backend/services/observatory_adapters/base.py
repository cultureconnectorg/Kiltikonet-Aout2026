"""
Adapter base — helpers and read-only guard.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", ""))
_db = _client[os.environ.get("DB_NAME", "kiltikonet")]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def metric_dictionary(
    *,
    source: str,
    collection: str,
    definition: str,
    transformation: str,
    period: str,
    quality: str,
    confidence: float,
    publication_status: str = "founder-only",
) -> dict:
    """Canonical metric metadata block."""
    return {
        "source": source,
        "collection": collection,
        "definition": definition,
        "transformation": transformation,
        "period": period,
        "quality": quality,       # 'high' | 'medium' | 'low' | 'unknown'
        "confidence": confidence, # 0.0 → 1.0
        "last_updated": now_iso(),
        "publication_status": publication_status,  # 'founder-only' | 'public' | 'admin'
    }


def db():
    return _db
