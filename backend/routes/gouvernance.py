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
from motor.motor_asyncio import AsyncIOMotorClient

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
    except Exception:
        pass  # Indexes may already exist
