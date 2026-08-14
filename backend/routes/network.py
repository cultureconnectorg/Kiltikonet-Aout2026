"""
KILTIKONET NETWORK — Backend foundations (Phase 1)

Read-only endpoints for the Network layer. Zero fabrication.
All lists are empty until real data is inserted via authenticated workflows.

Design principles:
- No collection existante n'est modifiée.
- Toute réponse porte un `lineage` explicite avec provenance tag.
- Aucun endpoint mutant dans cette phase (pas de POST/PATCH/DELETE).
- RBAC minimal : lecture `/overview` publique agrégée, tout le reste `require_network_read`.

Collections attendues (créées à la demande, jamais préremplies) :
- network_territories, network_operators, network_licenses,
- network_training_records, network_compliance_records, network_audits,
- network_signals, network_opportunities, network_governance_records,
- network_technology_access, network_audit_log
"""
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/network", tags=["network"])

_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", ""))
_db = _client[os.environ.get("DB_NAME", "kiltikonet")]

FOUNDER_EMAILS = [
    e.strip().lower()
    for e in (os.environ.get("FOUNDER_EMAILS", "") or "").split(",")
    if e.strip()
]

# Roles that can read the full Network cross-territory (global scope)
NETWORK_GLOBAL_READ_ROLES = {
    "FOUNDER", "NETWORK_ADMIN", "DG_NETWORK", "STRATEGIC_COMMITTEE",
    "QUALITY_COMMITTEE", "FRANCHISE_MANAGER", "DATA_ANALYST", "AUDITOR",
    "TECH_PLATFORM_ADMIN", "TRAINING_MANAGER", "MARKETING_MANAGER",
    "LEGAL_IP", "COMMUNITY_MANAGER", "DAF",
}


# ═════════════════════════════════════════════════════════
# ACCESS
# ═════════════════════════════════════════════════════════
def _extract_session(request: Request) -> dict | None:
    session = getattr(request.state, "session", None)
    if not session:
        cookie = request.cookies.get("session_cookie") or request.cookies.get("cc_pro_session")
        if cookie:
            try:
                import json as _json
                session = _json.loads(cookie)
            except Exception:
                session = None
    return session


async def require_network_read(request: Request) -> dict:
    """Any authenticated user with a network_role can read Network data.
    Founder + FOUNDER_EMAILS always granted."""
    session = _extract_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="authentication_required")

    email = (session.get("email") or "").lower()
    role = session.get("role") or ""
    net_role = session.get("network_role") or ""

    is_founder = role == "founder" or (email and FOUNDER_EMAILS and email in FOUNDER_EMAILS)
    if is_founder or net_role in NETWORK_GLOBAL_READ_ROLES or net_role.startswith("TERRITORY_"):
        return session

    raise HTTPException(status_code=403, detail="network_role_required")


def _lineage(sources: list[str], provenance: str, confidence: float = 1.0) -> dict:
    return {
        "sources": sources,
        "provenance": provenance,
        "confidence": confidence,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }


async def _collection_exists(name: str) -> bool:
    return name in (await _db.list_collection_names())


# ═════════════════════════════════════════════════════════
# 1. NETWORK OVERVIEW — public aggregated snapshot, no PII
# ═════════════════════════════════════════════════════════
@router.get("/overview")
async def network_overview():
    """Aggregated Network snapshot. Publicly readable. No individual data."""
    territories_total = 0
    operators_total = 0
    licenses_active = 0
    compliance_available = False
    compliance_avg = None
    signals_open = 0

    if await _collection_exists("network_territories"):
        territories_total = await _db.network_territories.count_documents({})
    if await _collection_exists("network_operators"):
        operators_total = await _db.network_operators.count_documents({})
    if await _collection_exists("network_licenses"):
        licenses_active = await _db.network_licenses.count_documents({"status": "ACTIVE"})
    if await _collection_exists("network_compliance_records"):
        agg = await _db.network_compliance_records.aggregate([
            {"$match": {"score": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$score"}}},
        ]).to_list(1)
        if agg:
            compliance_available = True
            compliance_avg = round(agg[0]["avg"], 1)
    if await _collection_exists("network_signals"):
        signals_open = await _db.network_signals.count_documents({"status": "OPEN"})

    any_data = territories_total > 0 or operators_total > 0
    provenance = "OBSERVED" if any_data else "NOT_CONFIGURED"

    return {
        "data": {
            "territories_total": territories_total,
            "operators_total": operators_total,
            "licenses_active": licenses_active,
            "compliance_avg_score": compliance_avg,
            "compliance_available": compliance_available,
            "signals_open": signals_open,
        },
        "lineage": _lineage(
            sources=[
                "db.network_territories",
                "db.network_operators",
                "db.network_licenses",
                "db.network_compliance_records",
                "db.network_signals",
            ],
            provenance=provenance,
        ),
        "notice": "Aggregated only — no personal data, no operational details.",
    }


# ═════════════════════════════════════════════════════════
# 2. NETWORK ACCESS — for the frontend to know its role
# ═════════════════════════════════════════════════════════
@router.get("/access")
async def network_access(request: Request):
    session = _extract_session(request)
    if not session:
        return {"authenticated": False, "network_role": None, "territory_id": None}
    email = (session.get("email") or "").lower()
    role = session.get("role") or ""
    is_founder = role == "founder" or (email and FOUNDER_EMAILS and email in FOUNDER_EMAILS)
    return {
        "authenticated": True,
        "email_masked": (email.split("@")[0][:3] + "…@" + email.split("@")[1]) if "@" in email else None,
        "network_role": "FOUNDER" if is_founder else (session.get("network_role") or None),
        "territory_id": session.get("territory_id") or None,
        "network_scope": session.get("network_scope") or ("global" if is_founder else None),
    }


# ═════════════════════════════════════════════════════════
# 3-9. Read-only listings — return empty + NOT_CONFIGURED if collection absent
# ═════════════════════════════════════════════════════════
async def _list_collection(name: str, session: dict, limit: int = 100) -> dict:
    if not await _collection_exists(name):
        return {
            "data": [],
            "lineage": _lineage([f"db.{name}"], "NOT_CONFIGURED"),
            "total": 0,
        }
    # Founder/global roles see all; territory-scoped see only theirs
    net_role = session.get("network_role") or ""
    territory_id = session.get("territory_id")
    is_founder = session.get("role") == "founder" or net_role in NETWORK_GLOBAL_READ_ROLES

    query = {}
    if not is_founder and net_role.startswith("TERRITORY_") and territory_id:
        query = {"territory_id": territory_id}

    docs = []
    async for d in _db[name].find(query).limit(limit):
        d["_id"] = str(d["_id"])
        docs.append(d)

    total = await _db[name].count_documents(query)
    return {
        "data": docs,
        "total": total,
        "lineage": _lineage([f"db.{name}"], "OBSERVED" if docs else "NOT_CONFIGURED"),
    }


@router.get("/territories")
async def list_territories(session: dict = Depends(require_network_read)):
    return await _list_collection("network_territories", session)


@router.get("/territories/{territory_id}")
async def get_territory(territory_id: str, session: dict = Depends(require_network_read)):
    net_role = session.get("network_role") or ""
    is_global = session.get("role") == "founder" or net_role in NETWORK_GLOBAL_READ_ROLES
    if not is_global and session.get("territory_id") != territory_id:
        raise HTTPException(status_code=403, detail="territory_scope_denied")

    if not await _collection_exists("network_territories"):
        return {"data": None, "lineage": _lineage(["db.network_territories"], "NOT_CONFIGURED")}

    doc = await _db.network_territories.find_one({"territory_id": territory_id})
    if not doc:
        raise HTTPException(status_code=404, detail="territory_not_found")
    doc["_id"] = str(doc["_id"])
    return {"data": doc, "lineage": _lineage(["db.network_territories"], "OBSERVED")}


@router.get("/operators")
async def list_operators(session: dict = Depends(require_network_read)):
    return await _list_collection("network_operators", session)


@router.get("/licenses")
async def list_licenses(session: dict = Depends(require_network_read)):
    return await _list_collection("network_licenses", session)


@router.get("/compliance")
async def list_compliance(session: dict = Depends(require_network_read)):
    return await _list_collection("network_compliance_records", session)


@router.get("/audits")
async def list_audits(session: dict = Depends(require_network_read)):
    return await _list_collection("network_audits", session)


@router.get("/training")
async def list_training(session: dict = Depends(require_network_read)):
    return await _list_collection("network_training_records", session)


@router.get("/technology")
async def list_technology_access(session: dict = Depends(require_network_read)):
    return await _list_collection("network_technology_access", session)


@router.get("/signals")
async def list_signals(session: dict = Depends(require_network_read)):
    return await _list_collection("network_signals", session)


@router.get("/opportunities")
async def list_opportunities(session: dict = Depends(require_network_read)):
    return await _list_collection("network_opportunities", session)


@router.get("/governance")
async def list_governance(session: dict = Depends(require_network_read)):
    return await _list_collection("network_governance_records", session)


# ═════════════════════════════════════════════════════════
# 10. PROGRAMMES — read-only catalog (nomenclature Kiltikonet)
# ═════════════════════════════════════════════════════════
PROGRAMMES_CATALOG = [
    {"slug": "music_lab", "name": "Music Lab", "order": 1},
    {"slug": "culture_lab", "name": "Culture Lab", "order": 2},
    {"slug": "kids", "name": "Kids", "order": 3},
    {"slug": "festival", "name": "Festival", "order": 4},
    {"slug": "connect", "name": "Connect", "order": 5},
    {"slug": "academy", "name": "Academy", "order": 6},
    {"slug": "stories", "name": "Stories", "order": 7},
    {"slug": "talents", "name": "Talents", "order": 8},
]


@router.get("/programmes")
async def list_programmes():
    """Public catalog · nomenclature Kiltikonet Network (fixed)."""
    return {
        "data": PROGRAMMES_CATALOG,
        "total": len(PROGRAMMES_CATALOG),
        "lineage": _lineage(
            sources=["backend.routes.network.PROGRAMMES_CATALOG"],
            provenance="OBSERVED",
        ),
        "notice": "Nomenclature canonique. Modification hors périmètre technique.",
    }
