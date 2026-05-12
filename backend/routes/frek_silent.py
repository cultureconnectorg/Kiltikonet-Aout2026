"""
FREK Silent Implantation — Routes
- POST /api/frek/register-silent
- POST /api/frek/pre-register-batch (admin)
- GET  /api/frek/registration/{frek_id} (lookup utilitaire)
- GET  /api/frek/badge-types (table publique)
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from services.frek_silent_service import (
    BADGE_TYPES,
    _col_reg,
    _col_queue,
    dispatch_to_frekcore,
    generate_frek_id,
    hash_qr,
)

# Admin auth — reproduit le motif léger déjà utilisé ailleurs dans la codebase
import os
_ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()
_ADMIN_KEY = os.environ.get("EMERGENCY_SECRET", "")
_STAFF_TOKEN = os.environ.get("STAFF_TOKEN_CC2026", "").strip()


def require_admin(x_admin_token: Optional[str] = Header(None)):
    """Vérification admin minimale via header X-Admin-Token = EMERGENCY_SECRET.
    Compatible avec les autres endpoints admin de la codebase.
    """
    if not _ADMIN_KEY:
        raise HTTPException(503, "Admin auth non configurée (EMERGENCY_SECRET manquant)")
    if not x_admin_token or x_admin_token != _ADMIN_KEY:
        raise HTTPException(403, "Accès admin requis")
    return True


def require_staff(x_staff_token: Optional[str] = Header(None)):
    """Vérification staff CC2026 via header X-Staff-Token.
    - Si STAFF_TOKEN_CC2026 est vide → mode dev ouvert (preview)
    - Si STAFF_TOKEN_CC2026 est set → vérifie strictement
    Révocation : changer la valeur en .env + redéployer = invalide instantanément tous les tokens.
    """
    if not _STAFF_TOKEN:
        # Mode dev / preview : pas de protection si non configuré
        return True
    if not x_staff_token or x_staff_token != _STAFF_TOKEN:
        raise HTTPException(403, "Token staff CC2026 invalide ou manquant")
    return True


router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class FrekSilentRegisterRequest(BaseModel):
    external_qr_content: str = Field(..., min_length=1)
    event_id: str = Field(..., min_length=1)
    badge_type: str = Field(..., min_length=1)


class FrekSilentRegisterResponse(BaseModel):
    frek_id: str
    status: str
    badge_type: str
    cultural_impact_score: int
    reused: bool = False


class TicketBatchItem(BaseModel):
    external_ref: str = Field(..., min_length=1)
    badge_type: str = Field(..., min_length=1)


class TicketBatch(BaseModel):
    tickets: List[TicketBatchItem]
    event_id: str = Field(..., min_length=1)


class BatchResponse(BaseModel):
    created: int
    skipped: int
    frek_ids: List[str]


# ═══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/api/frek/badge-types")
async def get_badge_types():
    """Retourne la table des types de badges CC2026 (public)."""
    return {"badge_types": BADGE_TYPES, "event_id": "CC2026"}


@router.post("/api/frek/staff/verify", dependencies=[Depends(require_staff)])
async def verify_staff_token():
    """Vérifie qu'un X-Staff-Token est valide. Utilisé par le scanner au login.
    - 200 + {ok: true} si token valide (ou si STAFF_TOKEN_CC2026 vide = mode preview)
    - 403 sinon
    """
    return {"ok": True, "protected": bool(_STAFF_TOKEN)}


@router.post("/api/frek/register-silent", response_model=FrekSilentRegisterResponse, dependencies=[Depends(require_staff)])
async def register_silent(body: FrekSilentRegisterRequest):
    """Enregistrement silencieux d'un FREK-ID depuis un QR code externe.
    Idempotent : si le même QR a déjà été enregistré, retourne le FREK-ID existant.
    """
    if body.badge_type not in BADGE_TYPES:
        raise HTTPException(400, f"badge_type inconnu. Valeurs: {', '.join(BADGE_TYPES.keys())}")

    external_ref = hash_qr(body.external_qr_content.strip())

    # Idempotence
    existing = await _col_reg.find_one({"external_ref": external_ref}, {"_id": 0})
    if existing:
        return FrekSilentRegisterResponse(
            frek_id=existing["frek_id"],
            status=existing.get("status", "ACTIVE"),
            badge_type=existing.get("badge_type", body.badge_type),
            cultural_impact_score=existing.get("cultural_impact_score", 0),
            reused=True,
        )

    # Création
    frek_id = generate_frek_id(body.external_qr_content, body.event_id)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "frek_id": frek_id,
        "external_ref": external_ref,
        "source": "externe",
        "event_id": body.event_id,
        "badge_type": body.badge_type,
        "status": "ACTIVE",
        "cultural_impact_score": 0,
        "created_at": now,
        "activated_at": now,
        "enrichment": {
            "frek_subject_did": None,
            "nominatif": None,
            "jeton_cc_linked": None,
            "nfc_badge_written": None,
        },
    }
    try:
        await _col_reg.insert_one(dict(doc))
    except Exception as e:
        # Course possible sur l'index unique — re-lookup
        existing = await _col_reg.find_one({"external_ref": external_ref}, {"_id": 0})
        if existing:
            return FrekSilentRegisterResponse(
                frek_id=existing["frek_id"],
                status=existing.get("status", "ACTIVE"),
                badge_type=existing.get("badge_type", body.badge_type),
                cultural_impact_score=existing.get("cultural_impact_score", 0),
                reused=True,
            )
        raise HTTPException(500, f"Insertion impossible: {e}")

    # Fire-and-forget vers FrekCore
    asyncio.create_task(dispatch_to_frekcore(frek_id, body.event_id, body.badge_type))

    return FrekSilentRegisterResponse(
        frek_id=frek_id,
        status="ACTIVE",
        badge_type=body.badge_type,
        cultural_impact_score=0,
        reused=False,
    )


@router.get("/api/frek/registration/{frek_id}")
async def get_registration(frek_id: str):
    """Lookup d'un enregistrement silencieux par FREK-ID (utilitaire scanner)."""
    doc = await _col_reg.find_one({"frek_id": frek_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "FREK-ID introuvable")
    return doc


# ═══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/api/frek/pre-register-batch", response_model=BatchResponse, dependencies=[Depends(require_admin)])
async def pre_register_batch(body: TicketBatch):
    """Pré-enregistrement en masse depuis une billetterie externe.
    Crée des FREK-IDs en status PENDING. Idempotent.
    """
    created = 0
    skipped = 0
    frek_ids: List[str] = []
    now = datetime.now(timezone.utc).isoformat()

    for ticket in body.tickets:
        if ticket.badge_type not in BADGE_TYPES:
            skipped += 1
            continue

        # external_ref attendu déjà hashé OU brut → on normalise
        external_ref = ticket.external_ref.strip()
        if len(external_ref) != 64:  # pas un sha256 hex
            external_ref = hash_qr(external_ref)

        existing = await _col_reg.find_one({"external_ref": external_ref}, {"_id": 0, "frek_id": 1})
        if existing:
            skipped += 1
            frek_ids.append(existing["frek_id"])
            continue

        frek_id = generate_frek_id(external_ref, body.event_id)
        doc = {
            "frek_id": frek_id,
            "external_ref": external_ref,
            "source": "externe",
            "event_id": body.event_id,
            "badge_type": ticket.badge_type,
            "status": "PENDING",
            "cultural_impact_score": 0,
            "created_at": now,
            "activated_at": None,
            "enrichment": {
                "frek_subject_did": None,
                "nominatif": None,
                "jeton_cc_linked": None,
                "nfc_badge_written": None,
            },
        }
        try:
            await _col_reg.insert_one(dict(doc))
            created += 1
            frek_ids.append(frek_id)
        except Exception:
            skipped += 1

    return BatchResponse(created=created, skipped=skipped, frek_ids=frek_ids)


@router.get("/api/frek/queue/stats", dependencies=[Depends(require_admin)])
async def queue_stats():
    """Statistiques de la queue de reprise webhook (admin)."""
    return {
        "pending": await _col_queue.count_documents({"status": "PENDING"}),
        "sent": await _col_queue.count_documents({"status": "SENT"}),
        "failed": await _col_queue.count_documents({"status": "FAILED"}),
        "total_registrations": await _col_reg.count_documents({}),
        "active": await _col_reg.count_documents({"status": "ACTIVE"}),
        "pending_activations": await _col_reg.count_documents({"status": "PENDING"}),
    }
