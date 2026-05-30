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


# ─── RBAC Doctrine roles whitelist (brief équipe) ──────────────
VALID_ROLES = {"creator", "distributor", "institutional", "professional", "consumer"}

# Mapping interne kiltikonet → vocabulaire RBAC Doctrine
ROLE_MAP = {
    # registrations.profile_type / actor_role
    "creator": "creator",
    "artiste": "creator",
    "artiste_createur": "creator",
    "producteur": "creator",
    "createur": "creator",
    "distributor": "distributor",
    "distributeur": "distributor",
    "diffuseur": "distributor",
    "operateur": "distributor",
    "institutional": "institutional",
    "institutionnel": "institutional",
    "structure": "institutional",
    "structure_culturelle": "institutional",
    "professional": "professional",
    "professionnel": "professional",
    "pro": "professional",
    "consumer": "consumer",
    "public": "consumer",
    "spectateur": "consumer",
    "other": "professional",  # default safe fallback
    "admin": "professional",  # admin = pro pour Laurent.ia
}


def _normalize_role(raw: str) -> str:
    """Normalise un rôle kiltikonet vers le vocabulaire Doctrine."""
    if not raw:
        return "professional"
    key = str(raw).strip().lower()
    return ROLE_MAP.get(key, "professional")


# ─── 7 dimensions culturelles (spec brief équipe) ──────────────
CULTURAL_DIMENSIONS_7D = [
    "musique",
    "arts_visuels",
    "langue_creole",
    "patrimoine",
    "gastronomie",
    "feminite_matriarcat",
    "identite_diasporique",
]


def _shape_cultural_profile(raw: dict) -> dict:
    """Aplatit le profil culturel kiltikonet vers les 7 dimensions du brief.
    Valeurs 0-100. Champs manquants → 0.
    """
    if not raw:
        return {dim: 0 for dim in CULTURAL_DIMENSIONS_7D}
    dims = (raw.get("dimensions") or {}) if isinstance(raw, dict) else {}
    flat = {}
    for dim in CULTURAL_DIMENSIONS_7D:
        v = dims.get(dim, raw.get(dim, 0))
        try:
            v_int = int(v) if v is not None else 0
        except (TypeError, ValueError):
            v_int = 0
        # Clamp 0-100
        flat[dim] = max(0, min(100, v_int))
    return flat


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
# Spec brief équipe :
#   { "valid": bool, "frek_id": str, "role": <RBAC role> }
# ═══════════════════════════════════════════════════════════════
@router.get("/api/users/validate/{frek_id}", dependencies=[Depends(require_inter_service)])
async def validate_frek_id(frek_id: str):
    """Valide qu'un FREK-ID existe et retourne son rôle normalisé RBAC.
    Cascade lookup : registrations → kn_profiles → cc_badges.
    """
    frek_id = (frek_id or "").strip().upper()
    if not frek_id.startswith("FREK-"):
        return {"valid": False, "frek_id": frek_id, "role": "consumer"}

    # 1. registrations (espace pro)
    reg = await _db.registrations.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "profile_type": 1, "actor_role": 1, "status": 1, "is_admin": 1, "suspended": 1},
    )
    if reg:
        if reg.get("suspended") or reg.get("status") not in (None, "approved"):
            return {"valid": False, "frek_id": frek_id, "role": "consumer"}
        # actor_role est plus précis que profile_type pour le RBAC
        raw_role = reg.get("actor_role") or reg.get("profile_type") or "professional"
        return {"valid": True, "frek_id": frek_id, "role": _normalize_role(raw_role)}

    # 2. kn_profiles
    kn = await _db.kn_profiles.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "role": 1, "actor_role": 1, "suspended": 1},
    )
    if kn:
        if kn.get("suspended"):
            return {"valid": False, "frek_id": frek_id, "role": "consumer"}
        raw_role = kn.get("actor_role") or kn.get("role") or "professional"
        return {"valid": True, "frek_id": frek_id, "role": _normalize_role(raw_role)}

    # 3. cc_badges (badge NFC physique seulement → consumer par défaut)
    badge = await _db.cc_badges.find_one({"frek_id": frek_id}, {"_id": 0, "type_badge": 1})
    if badge:
        return {"valid": True, "frek_id": frek_id, "role": "consumer"}

    return {"valid": False, "frek_id": frek_id, "role": "consumer"}


# ═══════════════════════════════════════════════════════════════
# GET /api/users/{frek_id}/profile
# Spec brief équipe :
#   {
#     "cultural_profile": { musique, arts_visuels, langue_creole,
#                          patrimoine, gastronomie, feminite_matriarcat,
#                          identite_diasporique },  // 0-100
#     "badges": [],
#     "wallet": { "jcc_balance": 0 }
#   }
# ═══════════════════════════════════════════════════════════════
@router.get("/api/users/{frek_id}/profile", dependencies=[Depends(require_inter_service)])
async def get_user_profile(frek_id: str):
    """Profil agrégé pour Laurent.ia. Lecture seule. Format strict brief équipe."""
    frek_id = (frek_id or "").strip().upper()
    if not frek_id.startswith("FREK-"):
        raise HTTPException(400, "Format FREK-ID invalide")

    # Identité de base (registrations ou kn_profiles)
    base = await _db.registrations.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "id": 1, "email": 1},
    )
    if not base:
        kn = await _db.kn_profiles.find_one({"frek_id": frek_id}, {"_id": 0, "frek_id": 1, "email": 1})
        if not kn:
            raise HTTPException(404, "FREK-ID introuvable")
        base = {"id": kn.get("frek_id"), "email": kn.get("email", "")}

    user_id = base.get("id") or frek_id

    # Cultural profile 7D (depuis cultural_scores)
    cultural_raw = await _db.cultural_scores.find_one(
        {"user_id": user_id},
        {"_id": 0, "dimensions": 1, "musique": 1, "arts_visuels": 1, "langue_creole": 1,
         "patrimoine": 1, "gastronomie": 1, "feminite_matriarcat": 1, "identite_diasporique": 1},
    )

    # Badges (liste d'IDs uniquement — RGPD safe)
    badges_docs = await _db.cc_badges.find(
        {"frek_id": frek_id, "active": {"$ne": False}},
        {"_id": 0, "badge_id": 1, "type_badge": 1},
    ).to_list(50)
    badges = [b.get("type_badge") or b.get("badge_id") for b in badges_docs if b]

    # JCC balance uniquement (sécurité — pas d'autre montant exposé)
    wallet = await _db.kn_wallets.find_one(
        {"frek_id": frek_id},
        {"_id": 0, "balance_jcc": 1},
    )
    if not wallet:
        wallet = await _db.kn_wallets.find_one(
            {"email": base.get("email", "")},
            {"_id": 0, "balance_jcc": 1},
        )
    jcc_balance = int((wallet or {}).get("balance_jcc", 0) or 0)

    return {
        "cultural_profile": _shape_cultural_profile(cultural_raw),
        "badges": badges,
        "wallet": {"jcc_balance": jcc_balance},
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
