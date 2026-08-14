"""
Live adapter — Active sessions & current pages (last 5 minutes).
"""
from datetime import datetime, timezone, timedelta
from .base import db, metric_dictionary


async def snapshot() -> dict:
    _db = db()
    now = datetime.now(timezone.utc)
    last_5min = (now - timedelta(minutes=5)).isoformat()
    last_hour = (now - timedelta(hours=1)).isoformat()

    # Active sessions (distinct session_id in last 5 min)
    active_agg = await _db.analytics_events.aggregate([
        {"$match": {"$or": [{"created_at": {"$gte": last_5min}}, {"timestamp": {"$gte": last_5min}}]}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"},
    ]).to_list(1)
    active_now = active_agg[0]["total"] if active_agg else 0

    hour_agg = await _db.analytics_events.aggregate([
        {"$match": {"$or": [{"created_at": {"$gte": last_hour}}, {"timestamp": {"$gte": last_hour}}]}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"},
    ]).to_list(1)
    sessions_last_hour = hour_agg[0]["total"] if hour_agg else 0

    # Current pages
    pages_agg = await _db.analytics_events.aggregate([
        {"$match": {
            "event_type": "page_view",
            "$or": [{"created_at": {"$gte": last_5min}}, {"timestamp": {"$gte": last_5min}}]
        }},
        {"$group": {"_id": "$data.page", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}}, {"$limit": 10},
    ]).to_list(10)

    return {
        "domain": "live",
        "active_now": active_now,
        "sessions_last_hour": sessions_last_hour,
        "current_pages": [{"page": p["_id"] or "/", "viewers": p["n"]} for p in pages_agg],
        "as_of": now.isoformat(),
        "metric_dictionary": metric_dictionary(
            source="analytics_events (Observatory canonical)",
            collection="analytics_events",
            definition="Live audience — distinct session_id observed within the last 5 minutes.",
            transformation="DISTINCT session_id WHERE created_at >= now-5min",
            period="rolling 5min / 1h",
            quality="medium",
            confidence=0.8 if active_now > 0 else 0.5,
            publication_status="founder-only",
        ),
    }
