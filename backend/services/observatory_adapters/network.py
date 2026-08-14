"""
Network adapter — Professional connections graph density.
"""
from datetime import datetime, timezone, timedelta
from .base import db, metric_dictionary


async def snapshot(days: int = 30) -> dict:
    _db = db()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()

    cols = await _db.list_collection_names()

    def _has(name): return name in cols

    total_conn = await _db.pro_connections.count_documents({}) if _has("pro_connections") else 0
    accepted = await _db.pro_connections.count_documents({"status": "accepted"}) if _has("pro_connections") else 0
    pending = await _db.pro_connections.count_documents({"status": "pending"}) if _has("pro_connections") else 0

    total_msg = await _db.pro_messages.count_documents({}) if _has("pro_messages") else 0
    recent_msg = await _db.pro_messages.count_documents({"created_at": {"$gte": cutoff}}) if _has("pro_messages") else 0

    total_opps = await _db.pro_opportunities.count_documents({}) if _has("pro_opportunities") else 0
    active_opps = await _db.pro_opportunities.count_documents({"status": "open"}) if _has("pro_opportunities") else 0

    total_events = await _db.pro_events.count_documents({}) if _has("pro_events") else 0
    total_registrations = await _db.registrations.count_documents({})

    # Density = accepted connections / registrations (approximation)
    density = round(accepted / total_registrations, 3) if total_registrations > 0 else 0.0

    return {
        "domain": "network",
        "connections": {"total": total_conn, "accepted": accepted, "pending": pending},
        "messages": {"total": total_msg, "recent": recent_msg},
        "opportunities": {"total": total_opps, "active": active_opps},
        "events": {"total": total_events},
        "density": {
            "value": density,
            "formula": "accepted_connections / total_registrations",
            "sample_size": total_registrations,
        },
        "metric_dictionary": metric_dictionary(
            source="Smart Engine (creative-network flux)",
            collection="pro_connections + pro_messages + pro_opportunities + pro_events + registrations",
            definition="Professional network density and activity across the pro layer.",
            transformation="COUNT + density=accepted/registrations",
            period=f"total (activity window {days}d)",
            quality="medium" if total_conn > 0 else "low",
            confidence=0.7 if total_conn > 0 else 0.2,
            publication_status="founder-only",
        ),
    }
