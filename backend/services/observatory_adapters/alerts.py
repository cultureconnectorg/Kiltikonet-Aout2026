"""
Alerts adapter — Smart Engine team_notifications as Signal history.
Never fabricate — reads only what already fired.
"""
from datetime import datetime, timezone, timedelta
from .base import db, metric_dictionary


ALERT_TYPES = ("anomaly_detected", "traffic_spike", "low_conversion", "deadline_alert", "deadline_approaching", "registration_batch", "error_spike")


async def snapshot(days: int = 90) -> dict:
    _db = db()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()

    total = await _db.team_notifications.count_documents({})
    recent = await _db.team_notifications.count_documents({"created_at": {"$gte": cutoff}})

    # By type
    by_type = {}
    async for n in _db.team_notifications.find({}, {"_id": 0, "type": 1}):
        t = n.get("type") or "unknown"
        by_type[t] = by_type.get(t, 0) + 1

    # Last 20 signals with mark source=smart_engine
    recent_signals = []
    async for n in _db.team_notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(20):
        recent_signals.append({
            **{k: v for k, v in n.items() if k != "recipients"},
            "_source_layer": "smart_engine",
        })

    return {
        "domain": "signals",
        "total_signals": total,
        "recent_period": recent,
        "by_type": by_type,
        "recent_signals": recent_signals,
        "rule_seeds_from_smart_engine": [
            "traffic_spike",
            "low_conversion",
            "deadline_approaching",
            "registration_batch",
            "error_spike",
        ],
        "metric_dictionary": metric_dictionary(
            source="Smart Engine alerts (team_notifications)",
            collection="team_notifications",
            definition="Historical signals fired by the Smart Engine alert rules — never recreated, only surfaced.",
            transformation="COUNT + GROUP BY type + LAST 20",
            period=f"{days}d",
            quality="high" if total > 0 else "unknown",
            confidence=0.9 if total > 0 else 0.0,
            publication_status="founder-only",
        ),
    }
