"""
Site Analytics — Aggregation endpoints for the Observatory.

Historique :
- Ce module contenait auparavant les endpoints POST /api/analytics/batch et POST /api/analytics/track
  qui écrivaient dans la collection `site_events` avec un schéma allégé.
- Un DUPLICATE conflit avec `server.py:@app.post("/api/analytics/batch")` (schéma riche → analytics_events)
  causait une perte silencieuse d'événements : le light handler gagnait le routing (première déclaration)
  et écrivait dans site_events, tandis que le handler rich (server.py) n'a jamais été atteint.

Fix P0 (13/08/2026) :
- Les endpoints d'ingestion `/batch` et `/track` sont RETIRÉS d'ici (canonique = server.py L9443).
- Ce fichier ne conserve que les endpoints d'AGRÉGATION lecture-seule.
- La collection `site_events` (2525 docs legacy pré-refonte) est CONSERVÉE et migrée dans analytics_events
  avec le tag `_source_legacy = "site_events"`. Elle n'est ni supprimée ni écrasée.
- Les agrégations lisent DÉSORMAIS dans analytics_events (unique source de vérité).
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["site-analytics"])

_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", ""))
_db = _client[os.environ.get("DB_NAME", "kiltikonet")]


@router.get("/site-stats")
async def site_stats():
    """Aggregated site analytics — reads from analytics_events (canonical) with legacy fallback."""
    now = datetime.now(timezone.utc)
    day_ago = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # ── Totals (analytics_events canonical) ──
    total_events = await _db.analytics_events.count_documents({})
    events_24h = await _db.analytics_events.count_documents({"timestamp": {"$gte": day_ago}})
    events_7d = await _db.analytics_events.count_documents({"timestamp": {"$gte": week_ago}})
    events_30d = await _db.analytics_events.count_documents({"timestamp": {"$gte": month_ago}})

    # ── Also count legacy site_events (pre-refonte, immutable archive) ──
    legacy_total = await _db.site_events.count_documents({})

    # ── Page views breakdown (last 30 days, both current + legacy migrated) ──
    page_views = await _db.analytics_events.find(
        {
            "$or": [
                {"event_type": "page_view"},
                {"event_type": "unknown", "data.page": {"$exists": True}},
            ],
            "timestamp": {"$gte": month_ago},
        },
        {"_id": 0, "data": 1},
    ).to_list(10000)

    pages_count = {}
    for pv in page_views:
        p = (pv.get("data") or {}).get("page", "/")
        if isinstance(p, str):
            pages_count[p] = pages_count.get(p, 0) + 1

    top_pages = sorted(pages_count.items(), key=lambda x: x[1], reverse=True)[:10]

    # ── Unique sessions (last 30 days) ──
    unique_sessions = set()
    async for ev in _db.analytics_events.find(
        {"timestamp": {"$gte": month_ago}}, {"_id": 0, "session_id": 1}
    ):
        sid = ev.get("session_id")
        if sid:
            unique_sessions.add(sid)

    # ── Daily timeline (last 7 days) ──
    timeline = {}
    async for ev in _db.analytics_events.find(
        {"timestamp": {"$gte": week_ago}}, {"_id": 0, "timestamp": 1}
    ):
        day = (ev.get("timestamp") or "")[:10]
        if day:
            timeline[day] = timeline.get(day, 0) + 1

    return {
        "overview": {
            "total_events": total_events,
            "events_24h": events_24h,
            "events_7d": events_7d,
            "events_30d": events_30d,
            "unique_sessions_30d": len(unique_sessions),
        },
        "legacy_archive": {
            "site_events_preserved": legacy_total,
            "note": "site_events est une collection archive (données pré-refonte). Non exposée telle quelle.",
        },
        "top_pages": [{"page": p, "views": c} for p, c in top_pages],
        "timeline": [{"date": k, "events": v} for k, v in sorted(timeline.items())],
        "data_lineage": {
            "source": "db.analytics_events",
            "canonical_endpoint": "POST /api/analytics/batch (server.py)",
            "legacy_source_preserved": "db.site_events (pre-refonte, immutable)",
        },
    }


@router.get("/health")
async def analytics_health():
    """Health signal for the analytics ingestion pipeline itself."""
    total = await _db.analytics_events.count_documents({})
    last = await _db.analytics_events.find_one({}, sort=[("timestamp", -1)])
    last_ts = (last or {}).get("timestamp") if last else None

    legacy_total = await _db.site_events.count_documents({})

    # Time since last event (in seconds)
    seconds_since_last = None
    if last_ts:
        try:
            last_dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
            seconds_since_last = int((datetime.now(timezone.utc) - last_dt).total_seconds())
        except Exception:
            pass

    return {
        "status": "ok",
        "total_events": total,
        "last_event_at": last_ts,
        "seconds_since_last_event": seconds_since_last,
        "legacy_archive_size": legacy_total,
        "collections": {
            "current": "analytics_events",
            "legacy_preserved": "site_events (pre-refonte, read-only)",
        },
    }
