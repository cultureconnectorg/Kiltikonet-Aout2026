"""
Conversion adapter — Funnel visite → pricing → inscription → paiement.
"""
from datetime import datetime, timezone, timedelta
from .base import db, metric_dictionary


async def snapshot(days: int = 30) -> dict:
    _db = db()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()

    # Visitors : distinct session_id on page_view
    visitors_agg = await _db.analytics_events.aggregate([
        {"$match": {"event_type": "page_view", "$or": [
            {"created_at": {"$gte": cutoff}}, {"timestamp": {"$gte": cutoff}}
        ]}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"},
    ]).to_list(1)
    total_visitors = visitors_agg[0]["total"] if visitors_agg else 0

    # Pricing viewers
    pricing_agg = await _db.analytics_events.aggregate([
        {"$match": {
            "event_type": "page_view",
            "data.page": {"$in": ["/pricing", "/tarifs", "/register-pro", "/badge-inscription", "/inscription"]},
            "$or": [{"created_at": {"$gte": cutoff}}, {"timestamp": {"$gte": cutoff}}]
        }},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"},
    ]).to_list(1)
    pricing_viewers = pricing_agg[0]["total"] if pricing_agg else 0

    # Badges created in period
    total_badges = await _db.cc_badges.count_documents({"created_at": {"$gte": cutoff}})

    # Revenue (Stripe payments)
    stripe_col = "stripe_payments" if "stripe_payments" in await _db.list_collection_names() else "payment_transactions"
    revenue = 0.0
    count_payments = 0
    async for p in _db[stripe_col].find({"created_at": {"$gte": cutoff}}, {"_id": 0, "amount": 1}):
        amt = p.get("amount", 0)
        if isinstance(amt, (int, float)):
            revenue += amt / 100.0
            count_payments += 1

    def _rate(a, b):
        return round((a / b) * 100, 1) if b > 0 else 0.0

    return {
        "domain": "conversion",
        "funnel": {
            "visitors": total_visitors,
            "pricing_viewers": pricing_viewers,
            "inscriptions": total_badges,
        },
        "rates_pct": {
            "visit_to_pricing": _rate(pricing_viewers, total_visitors),
            "pricing_to_inscription": _rate(total_badges, pricing_viewers),
            "overall": _rate(total_badges, total_visitors),
        },
        "revenue": {"total_eur": round(revenue, 2), "count": count_payments, "source_collection": stripe_col},
        "metric_dictionary": metric_dictionary(
            source="analytics_events (Observatory canonical) + cc_badges + stripe_payments (Smart Engine)",
            collection="analytics_events + cc_badges + " + stripe_col,
            definition="Conversion funnel from page_view → pricing pages → badge creation → payment.",
            transformation="DISTINCT session_id per step + revenue SUM(amount/100)",
            period=f"{days}d rolling",
            quality="medium" if total_visitors > 0 else "unknown",
            confidence=0.75 if total_visitors > 10 else 0.4,
            publication_status="founder-only",
        ),
    }
