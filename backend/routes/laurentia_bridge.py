"""
Laurent.ia Bridge — Endpoints inter-services pour Laurent.ia (CVL Brain externalisé).

Expose 2 endpoints protégés par X-API-Key:
  GET /api/users/validate/{frek_id}     → { valid, frek_id, role }
  GET /api/users/{frek_id}/profile      → { cultural_profile 7D, badges, wallet }

Protection: header X-API-Key doit matcher LAURENTIA_API_KEY (env var).
Si LAURENTIA_API_KEY est vide → endpoints désactivés (503).
"""
import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ.get("DB_NAME", "culture_connect_2026")]

LAURENTIA_API_KEY = os.environ.get("LAURENTIA_API_KEY", "").strip()


def require_inter_service(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Vérifie le header X-API-Key contre LAURENTIA_API_KEY."""
    if not LAURENTIA_API_KEY:
        raise HTTPException(503, "Bridge Laurent.ia non configuré (LAURENTIA_API_KEY manquant)")
    if not x_api_key or x_api_key != LAURENTIA_API_KEY:
        raise HTTPException(403, "X-API-Key invalide")
    return True


router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# GET /api/users/validate/{frek_id}
# ═══════════════════════════════════════════════════════════════
@router.get("/api/users/validate/{frek_id}", dependencies=[Depends(require_inter_service)])
async def validate_frek_id(frek_id: str):
    """Valide qu'un FREK-ID existe et retourne son rôle.
    Cherche dans registrations, kn_profiles, cc_badges (cascade).
    """
    frek_id = (frek_id or "").strip().upper()
    if not frek_id or not frek_id.startswith("FREK-"):
        return {"valid": False, "frek_id": frek_id, "role": None, "reason": "format_invalid"}

    # 1. registrations (espace pro)
    reg = await _db.registrations.find_one({"frek_id": frek_id}, {"_id": 0, "profile_type": 1, "status": 1, "is_admin": 1})
    if reg:
        if reg.get("status") != "approved":
            return {"valid": False, "frek_id": frek_id, "role": None, "reason": "pending"}
        role = "admin" if reg.get("is_admin") else reg.get("profile_type", "professional")
        return {"valid": True, "frek_id": frek_id, "role": role, "source": "registrations"}

    # 2. kn_profiles (espace pro CC2026)
    kn = await _db.kn_profiles.find_one({"frek_id": frek_id}, {"_id": 0, "role": 1, "suspended": 1})
    if kn:
        if kn.get("suspended"):
            return {"valid": False, "frek_id": frek_id, "role": None, "reason": "suspended"}
        return {"valid": True, "frek_id": frek_id, "role": kn.get("role", "pro"), "source": "kn_profiles"}

    # 3. cc_badges (badge NFC physique uniquement)
    badge = await _db.cc_badges.find_one({"frek_id": frek_id}, {"_id": 0, "type_badge": 1})
    if badge:
        return {"valid": True, "frek_id": frek_id, "role": badge.get("type_badge", "badge").lower(), "source": "cc_badges"}

    return {"valid": False, "frek_id": frek_id, "role": None, "reason": "not_found"}


# ═══════════════════════════════════════════════════════════════
# GET /api/users/{frek_id}/profile
# Agrégat: cultural_profile 7D + badges + wallet
# ═══════════════════════════════════════════════════════════════
@router.get("/api/users/{frek_id}/profile", dependencies=[Depends(require_inter_service)])
async def get_user_profile(frek_id: str):
    """Profil complet pour Laurent.ia bridge.
    Joint registrations + cultural_scores + cc_badges + kn_wallets.
    """
    frek_id = (frek_id or "").strip().upper()
    if not frek_id.startswith("FREK-"):
        raise HTTPException(400, "Format FREK-ID invalide")

    # Identité de base
    base = await _db.registrations.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1, "prenom": 1, "nom": 1,
         "profile_type": 1, "actor_role": 1, "language": 1, "status": 1, "created_at": 1},
    )
    if not base:
        # Fallback sur kn_profiles
        kn = await _db.kn_profiles.find_one({"frek_id": frek_id}, {"_id": 0})
        if not kn:
            raise HTTPException(404, "FREK-ID introuvable")
        base = {
            "id": kn.get("frek_id"),
            "email": kn.get("email", ""),
            "full_name": kn.get("display_name") or kn.get("full_name", ""),
            "profile_type": kn.get("role", "pro"),
            "actor_role": "professional",
            "language": "fr",
            "status": "approved",
            "created_at": kn.get("created_at", ""),
        }

    user_id = base.get("id") or frek_id

    # Cultural profile 7D
    cultural = await _db.cultural_scores.find_one(
        {"user_id": user_id},
        {"_id": 0, "score": 1, "dimensions": 1, "level": 1,
         "reactions_given": 1, "reactions_received": 1, "updated_at": 1},
    )
    if not cultural:
        # Initialiser à 0 (cohérent avec /api/cultural-identity/{user_id})
        cultural = {
            "score": 0,
            "dimensions": {},
            "level": {"name": "Néophyte", "min": 0, "max": 10},
            "reactions_given": 0,
            "reactions_received": 0,
        }

    # Badges
    badges = await _db.cc_badges.find(
        {"frek_id": frek_id},
        {"_id": 0, "badge_id": 1, "type_badge": 1, "date_emission": 1, "active": 1},
    ).to_list(50)

    # Wallet
    wallet = await _db.kn_wallets.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "balance_kt": 1, "balance_jcc": 1, "updated_at": 1},
    )
    if not wallet:
        wallet = await _db.kn_wallets.find_one(
            {"email": base.get("email", "")},
            {"_id": 0, "balance_kt": 1, "balance_jcc": 1, "updated_at": 1},
        ) or {"balance_kt": 0, "balance_jcc": 0}

    return {
        "frek_id": frek_id,
        "identity": base,
        "cultural_profile": cultural,
        "badges": badges,
        "wallet": wallet,
    }


# ═══════════════════════════════════════════════════════════════
# Health check du bridge (sans auth, mais ne révèle rien)
# ═══════════════════════════════════════════════════════════════
@router.get("/api/users/bridge/health")
async def bridge_health():
    """Health check pour Laurent.ia (savoir si le bridge est UP)."""
    return {
        "service": "kiltikonet-bridge",
        "configured": bool(LAURENTIA_API_KEY),
        "status": "ready" if LAURENTIA_API_KEY else "awaiting_config",
    }
