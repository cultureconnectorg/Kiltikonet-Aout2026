"""
FREK Silent Implantation — CC2026 Entry Layer
Implantation chirurgicale : aucune collection existante n'est touchée.

Le FREK-ID ne naît jamais d'une action utilisateur consciente.
Il naît d'un geste culturel réel — ici la présence physique à l'événement.
"""
import os
import hashlib
import secrets
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Lazy singleton DB handle (évite duplication d'AsyncIOMotorClient)
_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "culture_connect_2026")
_client = AsyncIOMotorClient(_MONGO_URL)
_db = _client[_DB_NAME]
_col_reg = _db["frek_registrations"]
_col_queue = _db["frek_outbound_queue"]

FREKCORE_URL = (os.environ.get("FREKCORE_WEBHOOK_URL") or "").rstrip("/")
FREKCORE_SECRET = os.environ.get("FREKCORE_SECRET", "")
RETRY_MAX_ATTEMPTS = 5
RETRY_BACKOFF_SECONDS = 300  # 5 minutes


# ═══════════════════════════════════════════════════════════════
# BADGE TYPES CC2026 — Source de vérité
# ═══════════════════════════════════════════════════════════════
BADGE_TYPES = {
    "CC26-ART": "ARTISTE EN SCÈNE",
    "CC26-INT": "INTERVENANT",
    "CC26-STF": "STAFF",
    "CC26-BNV": "BÉNÉVOLE",
    "CC26-PRS": "PRESSE",
    "CC26-VIP": "VIP",
    "CC26-OFF": "OFFICIEL",
    "CC26-SPO": "SPONSOR",
    "CC26-EXP1": "EXPOSANT NIVEAU 1",
    "CC26-EXP2": "EXPOSANT NIVEAU 2",
    "CC26-EXP3": "EXPOSANT NIVEAU 3",
    "CC26-EXP4": "EXPOSANT NIVEAU 4",
    "CC26-EXP5": "EXPOSANT NIVEAU 5",
    "CC26-EXP6": "EXPOSANT NIVEAU 6",
    "CC26-EXP7": "EXPOSANT NIVEAU 7",
}


def hash_qr(qr_content: str) -> str:
    """SHA256 deterministe du contenu brut du QR — idempotence."""
    return hashlib.sha256(qr_content.encode("utf-8")).hexdigest()


def generate_frek_id(qr_content: str, event_id: str) -> str:
    """Génère un FREK-ID au format FREK-CC26-XXXXXX (6 hex uppercase)."""
    salt = secrets.token_hex(4)
    raw = f"{qr_content}:{event_id}:{salt}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:6].upper()
    return f"FREK-CC26-{h}"


# ═══════════════════════════════════════════════════════════════
# WEBHOOK FREKCORE — Fire-and-forget
# ═══════════════════════════════════════════════════════════════

async def _enqueue_for_retry(frek_id: str, payload: dict, reason: str = ""):
    """Ajoute le job en queue de reprise."""
    now = datetime.now(timezone.utc).isoformat()
    await _col_queue.insert_one({
        "frek_id": frek_id,
        "payload": payload,
        "status": "PENDING",
        "attempts": 0,
        "last_error": reason or None,
        "next_retry_at": now,
        "created_at": now,
    })


async def dispatch_to_frekcore(frek_id: str, event_id: str, badge_type: str):
    """Envoie l'événement ACTIVATION à FrekCore. Fire-and-forget : ne lève jamais.
    En cas d'échec / config absente → push en frek_outbound_queue pour retry.
    """
    payload = {
        "frek_id": frek_id,
        "event_id": event_id,
        "action": "ACTIVATION",
        "badge_type": badge_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "kiltikonet",
    }
    if not FREKCORE_URL or not FREKCORE_SECRET:
        logger.info(f"FrekCore non configuré → queue pour {frek_id}")
        await _enqueue_for_retry(frek_id, payload, reason="FREKCORE_NOT_CONFIGURED")
        return
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.post(
                f"{FREKCORE_URL}/api/core/ingest",
                json=payload,
                headers={"Authorization": f"Bearer {FREKCORE_SECRET}"},
            )
            if r.status_code >= 400:
                logger.warning(f"FrekCore {r.status_code} pour {frek_id}: {r.text[:200]}")
                await _enqueue_for_retry(frek_id, payload, reason=f"HTTP_{r.status_code}")
            else:
                logger.info(f"FrekCore OK pour {frek_id}")
    except Exception as e:
        logger.warning(f"FrekCore injoignable pour {frek_id}: {e}")
        await _enqueue_for_retry(frek_id, payload, reason=str(e)[:200])


# ═══════════════════════════════════════════════════════════════
# RETRY WORKER (background, démarré dans server.py startup)
# ═══════════════════════════════════════════════════════════════

async def frekcore_retry_worker():
    """Loop infini — rejoue les jobs PENDING toutes les 5 min."""
    logger.info("FrekCore retry worker démarré")
    while True:
        try:
            await asyncio.sleep(RETRY_BACKOFF_SECONDS)
            if not FREKCORE_URL or not FREKCORE_SECRET:
                continue  # rien à faire tant que la config manque
            now = datetime.now(timezone.utc).isoformat()
            cursor = _col_queue.find(
                {"status": "PENDING", "next_retry_at": {"$lte": now}},
                {"_id": 0},
            )
            async for job in cursor:
                frek_id = job["frek_id"]
                attempts = job.get("attempts", 0)
                if attempts >= RETRY_MAX_ATTEMPTS:
                    await _col_queue.update_one(
                        {"frek_id": frek_id, "status": "PENDING"},
                        {"$set": {"status": "FAILED"}},
                    )
                    continue
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        r = await client.post(
                            f"{FREKCORE_URL}/api/core/ingest",
                            json=job["payload"],
                            headers={"Authorization": f"Bearer {FREKCORE_SECRET}"},
                        )
                    if r.status_code < 400:
                        await _col_queue.update_one(
                            {"frek_id": frek_id, "status": "PENDING"},
                            {"$set": {"status": "SENT", "sent_at": datetime.now(timezone.utc).isoformat()}},
                        )
                        logger.info(f"Retry FrekCore réussi pour {frek_id}")
                    else:
                        await _col_queue.update_one(
                            {"frek_id": frek_id, "status": "PENDING"},
                            {"$inc": {"attempts": 1}, "$set": {"last_error": f"HTTP_{r.status_code}"}},
                        )
                except Exception as e:
                    await _col_queue.update_one(
                        {"frek_id": frek_id, "status": "PENDING"},
                        {"$inc": {"attempts": 1}, "$set": {"last_error": str(e)[:200]}},
                    )
        except Exception as e:
            logger.error(f"Retry worker error: {e}")
            await asyncio.sleep(30)  # backoff sur erreur inattendue


# ═══════════════════════════════════════════════════════════════
# INDEXES — appelé au startup
# ═══════════════════════════════════════════════════════════════

async def create_frek_silent_indexes():
    """Indexes idempotents pour frek_registrations + frek_outbound_queue."""
    try:
        await _col_reg.create_index("frek_id", unique=True)
        await _col_reg.create_index("external_ref", unique=True)
        await _col_reg.create_index("event_id")
        await _col_reg.create_index("status")
        await _col_queue.create_index("status")
        await _col_queue.create_index("next_retry_at")
        await _col_queue.create_index("frek_id")
        logger.info("FREK silent indexes créés")
    except Exception as e:
        logger.warning(f"Index creation (peut-être déjà présents) : {e}")
