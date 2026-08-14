"""
Badges adapter — Cultural identity from cc_badges (Smart Engine canonical).
Founder-only exposition by default.
"""
from datetime import timedelta, datetime, timezone
from .base import db, metric_dictionary, now_iso


async def snapshot(days: int = 180) -> dict:
    _db = db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    total = await _db.cc_badges.count_documents({})
    nfc_enabled = await _db.cc_badges.count_documents({"nfc_enabled": True})
    nfc_linked = await _db.cc_badges.count_documents({"nfc_uid": {"$ne": "", "$exists": True}})
    frek_verified = await _db.cc_badges.count_documents({"frek_id": {"$ne": "", "$exists": True}})
    printed = await _db.cc_badges.count_documents({"imprime": True})
    handed = await _db.cc_badges.count_documents({"remis": True})

    # Cultural impact score distribution (histogram) — founder-only
    scores = []
    async for b in _db.cc_badges.find({"cultural_impact_score": {"$exists": True}}, {"_id": 0, "cultural_impact_score": 1}):
        s = b.get("cultural_impact_score")
        if isinstance(s, (int, float)):
            scores.append(int(s))
    bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    hist = [0] * (len(bins) - 1)
    for s in scores:
        for i in range(len(bins) - 1):
            if bins[i] <= s < bins[i + 1] or (i == len(bins) - 2 and s >= bins[i + 1]):
                hist[i] += 1
                break

    # Top 10 by score — founder-only (never public)
    top_ten = await _db.cc_badges.find(
        {"cultural_impact_score": {"$gt": 0}},
        {"_id": 0, "badge_id": 1, "prenom": 1, "nom": 1, "type_badge": 1, "cultural_impact_score": 1, "organisation": 1}
    ).sort("cultural_impact_score", -1).limit(10).to_list(10)

    # By type
    by_type = {}
    async for b in _db.cc_badges.find({}, {"_id": 0, "type_badge": 1}):
        t = b.get("type_badge") or "UNK"
        by_type[t] = by_type.get(t, 0) + 1

    # Jetons total
    jetons_total = 0
    async for b in _db.cc_badges.find({}, {"_id": 0, "jetons_solde": 1}):
        v = b.get("jetons_solde")
        if isinstance(v, (int, float)):
            jetons_total += int(v)

    return {
        "domain": "badges",
        "total_badges": total,
        "nfc": {"enabled": nfc_enabled, "linked": nfc_linked},
        "frek_verified": frek_verified,
        "print_handed": {"printed": printed, "handed_out": handed},
        "cultural_impact": {
            "count_with_score": len(scores),
            "average": round(sum(scores) / len(scores), 1) if scores else 0,
            "median": sorted(scores)[len(scores) // 2] if scores else 0,
            "histogram_bins": bins,
            "histogram": hist,
            "top_10_founder_only": top_ten,   # never expose in public endpoint
        },
        "by_type": by_type,
        "jetons_total": jetons_total,
        "metric_dictionary": metric_dictionary(
            source="Smart Engine (verified-identity flux)",
            collection="cc_badges",
            definition="Cultural identity records for Culture Connect 2026 (badges, NFC, FREK-ID, cultural score).",
            transformation="COUNT + GROUP BY type + histogram(cultural_impact_score, bins 0..100) + TOP 10 desc",
            period=f"lifetime · window={days}d",
            quality="high" if total > 0 else "unknown",
            confidence=0.95 if total > 0 else 0.0,
            publication_status="founder-only",
        ),
    }
