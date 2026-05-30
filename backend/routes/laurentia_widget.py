"""
Widget Laurent.ia côté kiltikonet — appel sortant vers le serveur Laurent.ia.

Endpoint utilisé par le frontend kiltikonet pour afficher l'état de l'instance
Laurent.ia d'un membre, SANS exposer l'architecture (pas de "CVL Brain" ni "FrekCore"
dans la response). Si Laurent.ia n'est pas encore live → retourne un état "coming_soon".

  GET /api/me/laurentia/status?frek_id=FREK-XXX  → { state, version, tokens, ... }

Variables d'environnement requises :
  LAURENTIA_API_URL    URL publique de Laurent.ia (ex: https://laurentia.cvln.com)
  LAURENTIA_API_KEY    Secret partagé (même que pour le bridge entrant)
"""
import os
import logging
import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

LAURENTIA_API_URL = (os.environ.get("LAURENTIA_API_URL") or "").rstrip("/")
LAURENTIA_API_KEY = os.environ.get("LAURENTIA_API_KEY", "").strip()

router = APIRouter()


@router.get("/api/me/laurentia/status")
async def laurentia_widget_status(frek_id: str = Query(..., min_length=3)):
    """État de l'instance Laurent.ia pour un FREK-ID.

    États possibles :
    - coming_soon : Laurent.ia pas encore configuré côté serveur (LAURENTIA_API_URL vide)
    - unreachable : Laurent.ia configuré mais injoignable / timeout
    - not_provisioned : Laurent.ia répond mais pas d'instance pour ce FREK-ID
    - active : instance OK, retourne version, tokens, jcc_balance
    """
    frek_id = (frek_id or "").strip().upper()
    if not frek_id.startswith("FREK-"):
        raise HTTPException(400, "Format FREK-ID invalide")

    if not LAURENTIA_API_URL or not LAURENTIA_API_KEY:
        return {
            "state": "coming_soon",
            "frek_id": frek_id,
            "message": "Ton intelligence personnelle arrive bientôt.",
        }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(
                f"{LAURENTIA_API_URL}/api/laurentia/me",
                params={"frek_id": frek_id},
                headers={"X-API-Key": LAURENTIA_API_KEY},
            )
    except Exception as e:
        logger.warning(f"Laurent.ia widget unreachable for {frek_id}: {e}")
        return {
            "state": "unreachable",
            "frek_id": frek_id,
            "message": "Laurent.ia est momentanément indisponible.",
        }

    if r.status_code == 404:
        return {
            "state": "not_provisioned",
            "frek_id": frek_id,
            "message": "Ton instance Laurent.ia n'a pas encore été activée.",
        }
    if r.status_code >= 400:
        logger.warning(f"Laurent.ia widget {r.status_code} for {frek_id}: {r.text[:200]}")
        return {
            "state": "unreachable",
            "frek_id": frek_id,
            "message": "Laurent.ia est momentanément indisponible.",
        }

    try:
        data = r.json()
    except Exception:
        return {"state": "unreachable", "frek_id": frek_id, "message": "Réponse invalide."}

    # Mapping minimaliste — n'expose JAMAIS de détails techniques internes
    return {
        "state": "active",
        "frek_id": frek_id,
        "version": data.get("version", "free"),
        "tokens_used_month": data.get("tokens_used_month", 0),
        "tokens_limit_month": data.get("tokens_limit_month", 10000),
        "jcc_balance": data.get("jcc_balance", 0),
        "url": f"{LAURENTIA_API_URL}",
    }
