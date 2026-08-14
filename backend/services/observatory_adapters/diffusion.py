"""
Diffusion adapter — Referrers, scroll, contact→partnership conversion.
"""
from datetime import datetime, timezone, timedelta
from .base import db, metric_dictionary


async def snapshot(days: int = 30) -> dict:
    _db = db()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()
    cols = await _db.list_collection_names()

    # Referrers (from normalized referrer_host or fallback data.referrer)
    referrer_counter = {}
    async for e in _db.analytics_events.find(
        {"$or": [{"created_at": {"$gte": cutoff}}, {"timestamp": {"$gte": cutoff}}]},
        {"_id": 0, "referrer_host": 1, "data.referrer": 1, "data": 1},
    ):
        rh = e.get("referrer_host")
        if not rh:
            rh = (e.get("data") or {}).get("referrer") or None
        if rh and rh != "internal":
            referrer_counter[rh] = referrer_counter.get(rh, 0) + 1
    top_referrers = sorted(referrer_counter.items(), key=lambda x: -x[1])[:15]

    # Contacts and partners
    contact_col = "contact_messages" if "contact_messages" in cols else ("contacts_alirio" if "contacts_alirio" in cols else None)
    total_contacts = await _db[contact_col].count_documents({"created_at": {"$gte": cutoff}}) if contact_col else 0
    all_contacts = await _db[contact_col].count_documents({}) if contact_col else 0

    partner_col = "partners" if "partners" in cols else ("cms_partner_banners" if "cms_partner_banners" in cols else None)
    total_partners = await _db[partner_col].count_documents({}) if partner_col else 0

    # Contact → partnership conversion (very approximate — same email in both)
    contact_to_partnership = None
    if contact_col and partner_col and all_contacts > 0:
        converted = 0
        try:
            emails = set()
            async for c in _db[contact_col].find({}, {"_id": 0, "email": 1}):
                em = (c.get("email") or "").lower()
                if em:
                    emails.add(em)
            async for p in _db[partner_col].find({}, {"_id": 0, "email": 1, "contact_email": 1}):
                em = (p.get("email") or p.get("contact_email") or "").lower()
                if em and em in emails:
                    converted += 1
            contact_to_partnership = {
                "value_pct": round((converted / all_contacts) * 100, 1) if all_contacts > 0 else 0,
                "converted_count": converted,
                "contact_pool": all_contacts,
            }
        except Exception:
            contact_to_partnership = None

    # Scroll depth avg
    scroll_agg = await _db.analytics_events.aggregate([
        {"$match": {"event_type": "scroll_depth", "$or": [{"created_at": {"$gte": cutoff}}, {"timestamp": {"$gte": cutoff}}]}},
        {"$group": {"_id": "$data.page", "avg_depth": {"$avg": "$data.depth"}, "n": {"$sum": 1}}},
        {"$sort": {"n": -1}}, {"$limit": 10},
    ]).to_list(10)

    return {
        "domain": "diffusion",
        "top_referrers": [{"host": h, "count": c} for h, c in top_referrers],
        "contacts_period": total_contacts,
        "contacts_total": all_contacts,
        "partners_total": total_partners,
        "contact_to_partnership": contact_to_partnership,
        "scroll_depth": [{"page": s["_id"], "avg_depth": round(s.get("avg_depth") or 0, 1), "samples": s["n"]} for s in scroll_agg],
        "metric_dictionary": metric_dictionary(
            source="analytics_events + contact_messages + partners (Smart Engine cultural-diffusion)",
            collection=f"analytics_events + {contact_col} + {partner_col}",
            definition="Cultural diffusion signals : referrers, scroll depth, contact→partnership conversion.",
            transformation="GROUP BY referrer_host + email intersection + AVG(scroll depth)",
            period=f"{days}d rolling",
            quality="medium" if len(top_referrers) > 0 else "low",
            confidence=0.65,
            publication_status="founder-only",
        ),
    }
