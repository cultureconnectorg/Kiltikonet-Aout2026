"""
Gouvernance Kilti Konet — Routes backend
Collection membre_gouvernance — 100% indépendante des collections existantes.
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from services.yousign_service import (
    initiate_full_flow as yousign_initiate_flow,
    get_signature_request as yousign_get_request,
    YousignError,
)

logger = logging.getLogger(__name__)


async def _send_signature_email(to_email: str, member_name: str, num_membre: str, signature_link: str):
    """Send signature invitation email via Resend (best-effort, never blocks)."""
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY")
        sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F0E8;font-family:Georgia,serif;color:#2D2A26;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#FFFFFF;">
  <div style="border-left:3px solid #9B3A2E;padding:0 0 0 16px;margin-bottom:24px;">
    <h1 style="font-size:22px;margin:0 0 8px;color:#2D2A26;">Bienvenue, {member_name}</h1>
    <p style="font-size:13px;color:#5A554E;margin:0;">Numéro de membre : <strong>{num_membre}</strong></p>
  </div>
  <p style="font-size:15px;line-height:22px;">Votre candidature à <strong>Kilti Konet</strong> a été acceptée par le Conseil d'Administration. Avant de finaliser votre adhésion, nous vous invitons à signer électroniquement la <strong>Charte d'Engagement</strong> de l'association.</p>
  <p style="font-size:15px;line-height:22px;">Ce document, signé via <strong>Yousign</strong>, garantit la protection juridique de la communauté et formalise votre engagement aux valeurs de l'association.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{signature_link}" style="display:inline-block;background:#9B3A2E;color:#F4F0E8;padding:14px 32px;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;">Signer la charte</a>
  </div>
  <p style="font-size:12px;color:#5A554E;line-height:18px;">Une fois la charte signée, vous pourrez régler votre cotisation d'entrée dans votre espace membre. Lien valable 30 jours.</p>
  <hr style="border:none;border-top:1px solid #E8E0D0;margin:24px 0;"/>
  <p style="font-size:11px;color:#A09A8E;text-align:center;">Kilti Konet — Association loi 1901<br/>Cet email a été envoyé suite à l'acceptation de votre candidature.</p>
</div></body></html>"""
        await asyncio.to_thread(resend.Emails.send, {
            "from": sender,
            "to": [to_email],
            "subject": f"Votre charte d'engagement Kilti Konet — {num_membre}",
            "html": html,
        })
        logger.info(f"Signature email sent to {to_email}")
    except Exception as e:
        logger.error(f"Signature email failed for {to_email}: {e}")


router = APIRouter()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "culture_connect_2026")
_client = AsyncIOMotorClient(MONGO_URL)
_db = _client[DB_NAME]
_col = _db["membre_gouvernance"]


# ═══════════════════════════════════════
# MODELS
# ═══════════════════════════════════════

PROFIL_TYPES = ["artiste_createur", "producteur_culturel", "organisateur", "structure_culturelle", "operateur_diffusion"]
NIVEAUX = ["associe", "actif"]
STATUTS = ["candidature_soumise", "en_examen", "accepte", "refuse"]


class ProjetCulturel(BaseModel):
    titre: str
    type: str  # phonogramme | vidéo | spectacle | exposition | œuvre littéraire | autre
    annee: int
    territoire: str


class CandidatureCreate(BaseModel):
    frek_id: str
    profil_type: str
    niveau: str = "associe"
    raison_sociale: str
    email: str
    projets_culturels: List[dict] = []
    documents: List[str] = []
    certification_acceptee: bool = False


class AdminAction(BaseModel):
    action: str  # accepter | refuser
    notes_admin: Optional[str] = None


# ═══════════════════════════════════════
# PUBLIC ENDPOINTS
# ═══════════════════════════════════════

@router.post("/api/gouvernance/candidater")
async def soumettre_candidature(body: CandidatureCreate):
    """Soumettre une candidature de membre gouvernance."""
    # Validation
    if body.profil_type not in PROFIL_TYPES:
        raise HTTPException(400, f"profil_type invalide. Valeurs acceptées: {', '.join(PROFIL_TYPES)}")
    if body.niveau not in NIVEAUX:
        raise HTTPException(400, f"niveau invalide. Valeurs acceptées: {', '.join(NIVEAUX)}")
    if not body.frek_id.strip():
        raise HTTPException(400, "frek_id requis")
    if not body.raison_sociale.strip():
        raise HTTPException(400, "raison_sociale requis")
    if not body.email.strip():
        raise HTTPException(400, "email requis")
    if len(body.projets_culturels) < 3:
        raise HTTPException(400, "Au minimum 3 projets culturels sont requis pour candidater.")
    if not body.certification_acceptee:
        raise HTTPException(400, "Vous devez certifier l'exactitude des informations.")

    # Check duplicate
    existing = await _col.find_one({"frek_id": body.frek_id.strip(), "statut": {"$nin": ["refuse"]}}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(409, "Une candidature est déjà en cours pour ce FREK-ID.")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": f"GOV-{str(uuid.uuid4())[:8].upper()}",
        "frek_id": body.frek_id.strip(),
        "profil_type": body.profil_type,
        "niveau": body.niveau,
        "raison_sociale": body.raison_sociale.strip(),
        "email": body.email.strip().lower(),
        "statut": "candidature_soumise",
        "date_candidature": now,
        "date_decision": None,
        "num_membre": None,
        "cotisation_entree_payee": False,
        "cotisation_annuelle_due": None,
        "cotisation_annuelle_payee": False,
        "stripe_payment_intent_id": None,
        "repertoire_declare": False,
        "signature_done": False,
        "signature_request_id": None,
        "signature_link": None,
        "signature_initiated_at": None,
        "signature_completed_at": None,
        "projets_culturels": body.projets_culturels,
        "documents": body.documents,
        "notes_admin": None,
        "date_passage_actif": None,
    }
    await _col.insert_one(doc)
    return {"success": True, "id": doc["id"], "message": "Votre dossier a été reçu. Le Conseil d'Administration examinera votre candidature lors de sa prochaine réunion."}


@router.get("/api/gouvernance/profil/{frek_id}")
async def get_profil_membre(frek_id: str):
    """Récupérer le profil d'un membre par FREK-ID."""
    doc = await _col.find_one({"frek_id": frek_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Aucune candidature trouvée pour ce FREK-ID.")
    return doc


@router.get("/api/gouvernance/verify-frek")
async def verify_frek_stub(id: str):
    """
    STUB — Vérification FREK-ID.
    // STUB - replace with real frequency-auth endpoint
    """
    if not id or not id.strip():
        return {"valid": False, "message": "FREK-ID vide"}
    # Try real lookup in registrations first
    reg = await _db.registrations.find_one({"frek_id": id.strip()}, {"_id": 0, "full_name": 1, "email": 1, "frek_id": 1})
    if reg:
        return {"valid": True, "name": reg.get("full_name", "Membre"), "email": reg.get("email", ""), "frek_id": reg.get("frek_id", id)}
    # Fallback stub for any non-empty input
    return {"valid": True, "name": "Membre", "frek_id": id.strip()}


@router.get("/api/gouvernance/stats")
async def gouvernance_public_stats():
    """Compteur public temps réel de l'engagement à la gouvernance."""
    membres_engages = await _col.count_documents({
        "statut": "accepte",
        "signature_done": True,
    })
    membres_actifs = await _col.count_documents({
        "statut": "accepte",
        "niveau": "actif",
        "signature_done": True,
    })
    candidatures_en_cours = await _col.count_documents({
        "statut": {"$in": ["candidature_soumise", "en_examen"]},
    })
    repertoires_declares = await _col.count_documents({"repertoire_declare": True})

    return {
        "membres_engages": membres_engages,
        "membres_actifs": membres_actifs,
        "candidatures_en_cours": candidatures_en_cours,
        "repertoires_declares": repertoires_declares,
    }


# ═══════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════

@router.get("/api/admin/gouvernance")
async def admin_list_candidatures(statut: Optional[str] = None, niveau: Optional[str] = None, profil_type: Optional[str] = None):
    """Admin — Liste toutes les candidatures."""
    query = {}
    if statut:
        query["statut"] = statut
    if niveau:
        query["niveau"] = niveau
    if profil_type:
        query["profil_type"] = profil_type
    docs = await _col.find(query, {"_id": 0}).sort("date_candidature", -1).to_list(500)
    stats = {
        "total": await _col.count_documents({}),
        "candidature_soumise": await _col.count_documents({"statut": "candidature_soumise"}),
        "en_examen": await _col.count_documents({"statut": "en_examen"}),
        "accepte": await _col.count_documents({"statut": "accepte"}),
        "refuse": await _col.count_documents({"statut": "refuse"}),
    }
    return {"candidatures": docs, "stats": stats}


@router.get("/api/admin/gouvernance/{candidature_id}")
async def admin_get_candidature(candidature_id: str):
    """Admin — Détail d'une candidature."""
    doc = await _col.find_one({"id": candidature_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Candidature introuvable")
    return doc


@router.put("/api/admin/gouvernance/{candidature_id}/notes")
async def admin_update_notes(candidature_id: str, request: Request):
    """Admin — Mettre à jour les notes admin."""
    body = await request.json()
    notes = body.get("notes_admin", "")
    result = await _col.update_one({"id": candidature_id}, {"$set": {"notes_admin": notes}})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidature introuvable")
    return {"success": True}


@router.post("/api/admin/gouvernance/{candidature_id}/decision")
async def admin_decision(candidature_id: str, body: AdminAction):
    """Admin — Accepter ou refuser une candidature."""
    doc = await _col.find_one({"id": candidature_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Candidature introuvable")

    now = datetime.now(timezone.utc).isoformat()

    if body.action == "accepter":
        # Generate num_membre
        year = datetime.now(timezone.utc).strftime("%Y")
        prefix = "KK-ACTIF" if doc["niveau"] == "actif" else "KK-ASSO"
        count = await _col.count_documents({"statut": "accepte", "niveau": doc["niveau"]})
        num_membre = f"{prefix}-{year}-{str(count + 1).zfill(4)}"

        update = {
            "statut": "accepte",
            "date_decision": now,
            "num_membre": num_membre,
        }
        if doc["niveau"] == "actif":
            next_year = int(year) + 1
            update["cotisation_annuelle_due"] = f"{next_year}-01-01"

        if body.notes_admin:
            update["notes_admin"] = body.notes_admin

        await _col.update_one({"id": candidature_id}, {"$set": update})
        return {"success": True, "action": "accepte", "num_membre": num_membre}

    elif body.action == "refuser":
        update = {"statut": "refuse", "date_decision": now}
        if body.notes_admin:
            update["notes_admin"] = body.notes_admin
        await _col.update_one({"id": candidature_id}, {"$set": update})
        return {"success": True, "action": "refuse"}

    else:
        raise HTTPException(400, "Action invalide. Valeurs acceptées: accepter, refuser")


@router.get("/api/admin/gouvernance/membres/actifs")
async def admin_membres_actifs():
    """Admin — Liste des membres acceptés."""
    docs = await _col.find({"statut": "accepte"}, {"_id": 0}).sort("date_decision", -1).to_list(500)
    return {"membres": docs}


# ═══════════════════════════════════════
# PAYMENT
# ═══════════════════════════════════════

@router.post("/api/gouvernance/paiement/{num_membre}")
async def paiement_cotisation(num_membre: str):
    """Créer un paiement Stripe pour la cotisation d'entrée."""
    import stripe
    stripe.api_key = os.environ.get("STRIPE_API_KEY", "")

    doc = await _col.find_one({"num_membre": num_membre, "statut": "accepte"}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Membre introuvable ou candidature non acceptée")
    if doc.get("cotisation_entree_payee"):
        raise HTTPException(400, "Cotisation déjà payée")
    if not doc.get("signature_done"):
        raise HTTPException(403, "La charte d'engagement doit être signée avant le paiement.")

    amount = 15000 if doc["niveau"] == "actif" else 5000  # 150€ or 50€

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="eur",
            description=f"Cotisation d'entrée Kilti Konet — {doc['raison_sociale']} — {num_membre}",
            metadata={
                "num_membre": num_membre,
                "frek_id": doc["frek_id"],
                "niveau": doc["niveau"],
                "profil_type": doc["profil_type"],
                "type": "gouvernance_cotisation"
            }
        )
        await _col.update_one(
            {"num_membre": num_membre},
            {"$set": {"stripe_payment_intent_id": intent.id}}
        )
        return {"client_secret": intent.client_secret, "amount": amount, "num_membre": num_membre}
    except Exception as e:
        raise HTTPException(500, f"Erreur Stripe: {str(e)}")


@router.post("/api/gouvernance/paiement/{num_membre}/confirm")
async def confirm_cotisation(num_membre: str):
    """Confirmer le paiement de la cotisation (appelé après succès Stripe)."""
    doc = await _col.find_one({"num_membre": num_membre}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Membre introuvable")

    await _col.update_one(
        {"num_membre": num_membre},
        {"$set": {"cotisation_entree_payee": True}}
    )
    return {"success": True, "message": f"Bienvenue, membre {num_membre} !"}


# ═══════════════════════════════════════
# REPERTOIRE
# ═══════════════════════════════════════

@router.get("/api/gouvernance/repertoire/{num_membre}")
async def get_repertoire(num_membre: str):
    """Récupérer le répertoire d'un membre."""
    doc = await _col.find_one({"num_membre": num_membre}, {"_id": 0, "projets_culturels": 1, "repertoire_declare": 1, "num_membre": 1, "raison_sociale": 1, "cotisation_entree_payee": 1})
    if not doc:
        raise HTTPException(404, "Membre introuvable")
    if not doc.get("cotisation_entree_payee"):
        raise HTTPException(403, "La cotisation d'entrée doit être payée avant de déclarer le répertoire.")
    return doc


@router.put("/api/gouvernance/repertoire/{num_membre}")
async def update_repertoire(num_membre: str, request: Request):
    """Mettre à jour et valider le répertoire d'un membre."""
    doc = await _col.find_one({"num_membre": num_membre}, {"_id": 0, "cotisation_entree_payee": 1})
    if not doc:
        raise HTTPException(404, "Membre introuvable")
    if not doc.get("cotisation_entree_payee"):
        raise HTTPException(403, "La cotisation d'entrée doit être payée.")

    body = await request.json()
    projets = body.get("projets_culturels", [])

    await _col.update_one(
        {"num_membre": num_membre},
        {"$set": {
            "projets_culturels": projets,
            "repertoire_declare": True,
        }}
    )
    return {"success": True, "message": "Répertoire validé. Votre profil est maintenant pleinement activé."}


# ═══════════════════════════════════════
# SIGNATURE — Yousign integration
# ═══════════════════════════════════════

@router.post("/api/gouvernance/signature/initiate/{num_membre}")
async def initiate_signature(num_membre: str):
    """Démarrer le flux de signature électronique Yousign pour un membre accepté.
    Retourne le lien de signature à présenter au candidat.
    """
    doc = await _col.find_one({"num_membre": num_membre}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Membre introuvable")
    if doc.get("statut") != "accepte":
        raise HTTPException(403, "La candidature doit être acceptée pour signer la charte.")
    if doc.get("signature_done"):
        raise HTTPException(400, "La charte est déjà signée.")

    # If a signature request already exists, return the existing link
    existing_id = doc.get("signature_request_id")
    if existing_id and doc.get("signature_link"):
        return {
            "signature_request_id": existing_id,
            "signature_link": doc["signature_link"],
            "status": "ongoing",
            "reused": True,
        }

    try:
        result = await yousign_initiate_flow(
            member_name=doc.get("raison_sociale", "Membre"),
            email=doc.get("email", ""),
            num_membre=num_membre,
            niveau=doc.get("niveau", "associe"),
            frek_id=doc.get("frek_id", ""),
        )
    except YousignError as e:
        logger.error(f"Yousign initiate failed for {num_membre}: {e.payload}")
        raise HTTPException(e.status if 400 <= e.status < 600 else 500, f"Yousign: {str(e)}")

    now = datetime.now(timezone.utc).isoformat()
    await _col.update_one(
        {"num_membre": num_membre},
        {"$set": {
            "signature_request_id": result["signature_request_id"],
            "signature_link": result["signature_link"],
            "signature_initiated_at": now,
        }},
    )

    # Best-effort email notification (non-blocking)
    if doc.get("email") and result.get("signature_link"):
        asyncio.create_task(_send_signature_email(
            to_email=doc["email"],
            member_name=doc.get("raison_sociale", "Membre"),
            num_membre=num_membre,
            signature_link=result["signature_link"],
        ))

    return result


@router.get("/api/gouvernance/signature/status/{num_membre}")
async def get_signature_status(num_membre: str):
    """Récupérer l'état actuel de la signature (poll Yousign + DB)."""
    doc = await _col.find_one({"num_membre": num_membre}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Membre introuvable")
    sr_id = doc.get("signature_request_id")
    if not sr_id:
        return {"signature_done": False, "status": "not_initiated"}

    if doc.get("signature_done"):
        return {
            "signature_done": True,
            "status": "done",
            "signature_request_id": sr_id,
            "signature_completed_at": doc.get("signature_completed_at"),
        }

    # Poll Yousign for current status
    try:
        sr = await yousign_get_request(sr_id)
    except YousignError as e:
        logger.warning(f"Yousign status poll failed for {num_membre}: {e}")
        return {
            "signature_done": False,
            "status": doc.get("signature_link") and "ongoing" or "unknown",
            "signature_link": doc.get("signature_link"),
        }

    status = sr.get("status", "unknown")
    if status == "done":
        now = datetime.now(timezone.utc).isoformat()
        await _col.update_one(
            {"num_membre": num_membre},
            {"$set": {"signature_done": True, "signature_completed_at": now}},
        )
        return {"signature_done": True, "status": "done", "signature_completed_at": now}

    return {
        "signature_done": False,
        "status": status,
        "signature_link": doc.get("signature_link"),
    }


@router.post("/api/gouvernance/signature/webhook")
async def yousign_webhook(request: Request):
    """Webhook Yousign — met à jour signature_done quand le document est signé."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Payload JSON invalide")

    event_name = payload.get("event_name") or payload.get("event_type") or ""
    data = payload.get("data") or {}
    sr = data.get("signature_request") or data.get("signatureRequest") or {}
    sr_id = sr.get("id") or payload.get("signature_request_id")

    logger.info(f"Yousign webhook reçu: event={event_name} sr_id={sr_id}")

    if not sr_id:
        return {"status": "ignored", "reason": "signature_request_id manquant"}

    # Only act on completion-type events
    if "done" in event_name or "signed" in event_name:
        now = datetime.now(timezone.utc).isoformat()
        result = await _col.update_one(
            {"signature_request_id": sr_id},
            {"$set": {"signature_done": True, "signature_completed_at": now}},
        )
        if result.matched_count == 0:
            logger.warning(f"Webhook: aucun membre lié à signature_request_id={sr_id}")
            return {"status": "no_member"}
        return {"status": "updated"}

    return {"status": "acknowledged", "event": event_name}


# ═══════════════════════════════════════
# INDEXES — called at startup
# ═══════════════════════════════════════

async def create_gouvernance_indexes():
    """Create indexes for membre_gouvernance collection."""
    try:
        await _col.create_index("frek_id")
        await _col.create_index("email")
        await _col.create_index("statut")
        await _col.create_index("niveau")
        await _col.create_index("num_membre", unique=True, sparse=True)
        await _col.create_index([("statut", 1), ("date_candidature", -1)])
        await _col.create_index([("niveau", 1), ("statut", 1)])
        await _col.create_index("signature_request_id", sparse=True)
    except Exception:
        pass  # Indexes may already exist
