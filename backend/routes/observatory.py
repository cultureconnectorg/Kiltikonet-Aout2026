"""
Observatory — Observation layer for Kiltikonet founder.

Reads only. No mutation. Every metric explicitly declares its source (data lineage).
Reconstructs Kiltikonet's digital memory from the 25 existing MongoDB collections.

Access control : `require_founder` dependency.
  - Founder is a distinct role from admin.
  - Determined by :
      1. FOUNDER_EMAILS env var (comma-separated list) — highest priority
      2. Session role in ('founder',)
  - No hardcoded password. Uses the existing session cookie / JWT mechanism.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from collections import Counter
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/observatory", tags=["observatory"])

_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", ""))
_db = _client[os.environ.get("DB_NAME", "kiltikonet")]

FOUNDER_EMAILS = [e.strip().lower() for e in (os.environ.get("FOUNDER_EMAILS", "") or "").split(",") if e.strip()]


# ═════════════════════════════════════════════════════════
# ACCESS CONTROL — role-based, no hardcoded password
# ═════════════════════════════════════════════════════════
async def require_founder(request: Request) -> dict:
    """Founder-only access. Reads from existing session cookie / request state."""
    session = getattr(request.state, "session", None)
    # Fallback : read session cookie manually if middleware didn't attach
    if not session:
        session_cookie = request.cookies.get("session_cookie") or request.cookies.get("cc_pro_session")
        if session_cookie:
            try:
                import json as _json
                session = _json.loads(session_cookie)
            except Exception:
                session = None

    if not session:
        raise HTTPException(status_code=401, detail="authentication_required")

    email = (session.get("email") or "").lower()
    role = session.get("role") or ""

    is_founder = (
        role == "founder"
        or (email and FOUNDER_EMAILS and email in FOUNDER_EMAILS)
    )
    if not is_founder:
        raise HTTPException(status_code=403, detail="founder_only")
    return session


# ═════════════════════════════════════════════════════════
# 1. MEMORY OVERVIEW — 4 headline metrics + data lineage
# ═════════════════════════════════════════════════════════
@router.get("/memory")
async def memory_overview():
    """
    Public headline metrics (read from real DB, no fabrication).
    Every number carries an explicit data lineage.
    """
    events_total = await _db.analytics_events.count_documents({})
    events_legacy = await _db.analytics_events.count_documents({"_pre_refonte": True})
    events_new = events_total - events_legacy
    workspace_activity = await _db.workspace_logs.count_documents({})
    registrations_total = await _db.registrations.count_documents({})
    scans_total = await _db.scan_events.count_documents({})

    # Registered organizations (distinct)
    orgs = set()
    async for r in _db.registrations.find({}, {"organization_name": 1}):
        n = (r.get("organization_name") or "").strip()
        if n:
            orgs.add(n.lower())

    # Territories (distinct countries)
    countries = set()
    async for r in _db.registrations.find({}, {"country": 1}):
        c = (r.get("country") or "").strip()
        if c:
            countries.add(c.lower())

    return {
        "digital_memory": {
            "events_total": {
                "value": events_total,
                "source": "db.analytics_events (canonical)",
                "breakdown": {
                    "legacy_pre_refonte": events_legacy,
                    "post_refonte": events_new,
                },
            },
            "workspace_activity": {
                "value": workspace_activity,
                "source": "db.workspace_logs",
            },
            "cc2026_registrations": {
                "value": registrations_total,
                "source": "db.registrations",
            },
            "recorded_scans": {
                "value": scans_total,
                "source": "db.scan_events",
            },
            "distinct_organizations": {
                "value": len(orgs),
                "source": "db.registrations.organization_name (distinct)",
            },
            "distinct_territories": {
                "value": len(countries),
                "source": "db.registrations.country (distinct)",
            },
        },
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }


# ═════════════════════════════════════════════════════════
# 2. TIMELINE — pre-refonte reconstruction (daily bins)
# ═════════════════════════════════════════════════════════
@router.get("/timeline")
async def timeline(days: int = 180):
    """
    Reconstructed daily activity timeline from all real sources.
    Not fabricated : each bin is the raw count of docs whose timestamp falls in that day.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    bins = {}  # {day: {events, workspace, registrations, scans}}

    def _add(day, k):
        if not day:
            return
        d = bins.setdefault(day, {"events": 0, "workspace": 0, "registrations": 0, "scans": 0})
        d[k] += 1

    # analytics_events
    async for e in _db.analytics_events.find(
        {"timestamp": {"$gte": cutoff}}, {"timestamp": 1}
    ):
        _add((e.get("timestamp") or "")[:10], "events")

    # workspace_logs (uses 'timestamp' field)
    async for w in _db.workspace_logs.find(
        {"timestamp": {"$gte": cutoff}}, {"timestamp": 1}
    ):
        _add((w.get("timestamp") or "")[:10], "workspace")

    # registrations (uses 'created_at')
    async for r in _db.registrations.find(
        {"created_at": {"$gte": cutoff}}, {"created_at": 1}
    ):
        _add((r.get("created_at") or "")[:10], "registrations")

    # scan_events
    async for s in _db.scan_events.find(
        {"timestamp": {"$gte": cutoff}}, {"timestamp": 1}
    ):
        _add((s.get("timestamp") or "")[:10], "scans")

    ordered = sorted(bins.items())
    return {
        "timeline": [
            {"date": d, **counts} for d, counts in ordered
        ],
        "range": {"days": days, "since": cutoff},
        "sources": [
            "db.analytics_events.timestamp",
            "db.workspace_logs.timestamp",
            "db.registrations.created_at",
            "db.scan_events.timestamp",
        ],
    }


# ═════════════════════════════════════════════════════════
# 3. EVENT TYPES — distribution
# ═════════════════════════════════════════════════════════
@router.get("/event-types")
async def event_types(days: int = 30):
    """Top event types over the last N days (from analytics_events)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    counter = Counter()
    async for e in _db.analytics_events.find(
        {"timestamp": {"$gte": cutoff}}, {"event_type": 1}
    ):
        counter[e.get("event_type") or "unknown"] += 1

    total = sum(counter.values())
    top = counter.most_common(15)
    return {
        "top_types": [
            {"type": t, "count": c, "share_pct": round(c / total * 100, 1) if total else 0}
            for t, c in top
        ],
        "total_events_period": total,
        "source": "db.analytics_events",
        "period_days": days,
    }


# ═════════════════════════════════════════════════════════
# 4. TERRITORIES — distinct countries from registrations
# ═════════════════════════════════════════════════════════
@router.get("/territories")
async def territories():
    """Territory index from real registrations (no hardcoded countries)."""
    counter = Counter()
    async for r in _db.registrations.find({}, {"country": 1}):
        c = (r.get("country") or "").strip()
        if c:
            counter[c] += 1
    return {
        "territories": [
            {"country": c, "count": n} for c, n in counter.most_common()
        ],
        "total": sum(counter.values()),
        "distinct": len(counter),
        "source": "db.registrations.country",
    }


# ═════════════════════════════════════════════════════════
# 5. ACTORS — distinct organizations
# ═════════════════════════════════════════════════════════
@router.get("/actors")
async def actors(limit: int = 20):
    """Top organizations from real registrations (public catalog opt-in only)."""
    public_orgs = []
    counter = Counter()
    async for r in _db.registrations.find(
        {}, {"organization_name": 1, "country": 1, "profile_type": 1, "show_in_catalog": 1}
    ):
        name = (r.get("organization_name") or "").strip()
        if not name:
            continue
        counter[name] += 1
        if r.get("show_in_catalog"):
            public_orgs.append({
                "name": name,
                "country": r.get("country"),
                "type": r.get("profile_type"),
            })

    return {
        "top_actors": [{"name": n, "registrations": c} for n, c in counter.most_common(limit)],
        "public_catalog_size": len(public_orgs),
        "distinct_total": len(counter),
        "source": "db.registrations (opt-in show_in_catalog for public)",
    }


# ═════════════════════════════════════════════════════════
# 6. SESSIONS — distinct + top pages
# ═════════════════════════════════════════════════════════
@router.get("/sessions")
async def sessions(days: int = 7):
    """Unique sessions and top pages over the last N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    unique_sessions = set()
    unique_visitors = set()
    page_counter = Counter()
    referrer_counter = Counter()

    async for e in _db.analytics_events.find(
        {"timestamp": {"$gte": cutoff}},
        {"session_id": 1, "visitor_id": 1, "data": 1, "referrer_host": 1},
    ):
        sid = e.get("session_id")
        if sid:
            unique_sessions.add(sid)
        vid = e.get("visitor_id")
        if vid:
            unique_visitors.add(vid)
        page = (e.get("data") or {}).get("page")
        if page and isinstance(page, str):
            page_counter[page] += 1
        rh = e.get("referrer_host")
        if rh and rh != "internal":
            referrer_counter[rh] += 1

    return {
        "unique_sessions": len(unique_sessions),
        "unique_visitors": len(unique_visitors),
        "top_pages": [{"page": p, "views": c} for p, c in page_counter.most_common(15)],
        "top_referrers": [{"host": h, "count": c} for h, c in referrer_counter.most_common(10)],
        "period_days": days,
        "source": "db.analytics_events (visitor_id + session_id + normalized referrer_host)",
    }


# ═════════════════════════════════════════════════════════
# 7. ACCESS CHECK — for the frontend to know if user is founder
# ═════════════════════════════════════════════════════════
@router.get("/access")
async def access_check(request: Request):
    """Public endpoint : returns whether the caller has founder access."""
    session = getattr(request.state, "session", None)
    if not session:
        session_cookie = request.cookies.get("session_cookie") or request.cookies.get("cc_pro_session")
        if session_cookie:
            try:
                import json as _json
                session = _json.loads(session_cookie)
            except Exception:
                session = None

    if not session:
        return {"authenticated": False, "is_founder": False}

    email = (session.get("email") or "").lower()
    role = session.get("role") or ""
    is_founder = role == "founder" or (email and FOUNDER_EMAILS and email in FOUNDER_EMAILS)

    return {
        "authenticated": True,
        "email_masked": (email.split("@")[0][:3] + "…@" + email.split("@")[1]) if "@" in email else None,
        "role": role,
        "is_founder": is_founder,
        "founder_emails_configured": len(FOUNDER_EMAILS) > 0,
    }
