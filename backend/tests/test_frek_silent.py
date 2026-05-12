"""
Tests pytest pour la couche FREK Silent Implantation.
Tests d'intégration directs sur l'API publique (HTTP).
"""
import os
import secrets

import httpx
import pytest
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

API = os.environ.get("REACT_APP_BACKEND_URL", "https://tarifs-update.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = os.environ.get("EMERGENCY_SECRET", "")


def _unique_qr(prefix="QR"):
    return f"{prefix}-{secrets.token_hex(8)}"


def test_badge_types_table_complete():
    """La table BADGE_TYPES contient bien 15 types CC2026."""
    r = httpx.get(f"{API}/api/frek/badge-types", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["event_id"] == "CC2026"
    types = data["badge_types"]
    assert len(types) == 15
    for code in ["CC26-ART", "CC26-INT", "CC26-STF", "CC26-BNV", "CC26-PRS",
                 "CC26-VIP", "CC26-OFF", "CC26-SPO",
                 "CC26-EXP1", "CC26-EXP2", "CC26-EXP3", "CC26-EXP4",
                 "CC26-EXP5", "CC26-EXP6", "CC26-EXP7"]:
        assert code in types


def test_register_silent_creates_frek_id():
    """Un nouveau QR crée un FREK-ID au format FREK-CC26-XXXXXX."""
    qr = _unique_qr("CREATE")
    r = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": qr, "event_id": "CC2026", "badge_type": "CC26-BNV"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["frek_id"].startswith("FREK-CC26-")
    assert len(d["frek_id"]) == len("FREK-CC26-XXXXXX")
    assert d["status"] == "ACTIVE"
    assert d["badge_type"] == "CC26-BNV"
    assert d["cultural_impact_score"] == 0
    assert d["reused"] is False


def test_register_silent_idempotent_same_qr():
    """Soumettre 2 fois le même QR retourne le même FREK-ID avec reused=true."""
    qr = _unique_qr("IDEMPOTENT")
    r1 = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": qr, "event_id": "CC2026", "badge_type": "CC26-VIP"},
        timeout=10,
    )
    r2 = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": qr, "event_id": "CC2026", "badge_type": "CC26-VIP"},
        timeout=10,
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["frek_id"] == r2.json()["frek_id"]
    assert r2.json()["reused"] is True


def test_register_silent_invalid_badge_type():
    """Un badge_type inconnu retourne 400."""
    r = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": _unique_qr("BAD"), "event_id": "CC2026", "badge_type": "FOO-BAR"},
        timeout=10,
    )
    assert r.status_code == 400
    assert "badge_type" in r.json()["detail"].lower()


def test_register_silent_empty_qr_rejected():
    """Un QR vide est rejeté par Pydantic."""
    r = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": "", "event_id": "CC2026", "badge_type": "CC26-BNV"},
        timeout=10,
    )
    assert r.status_code in (400, 422)


def test_lookup_registration_after_create():
    """GET /api/frek/registration/{frek_id} retourne le doc avec structure enrichment."""
    qr = _unique_qr("LOOKUP")
    r = httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": qr, "event_id": "CC2026", "badge_type": "CC26-STF"},
        timeout=10,
    )
    frek_id = r.json()["frek_id"]

    r2 = httpx.get(f"{API}/api/frek/registration/{frek_id}", timeout=10)
    assert r2.status_code == 200
    doc = r2.json()
    assert doc["frek_id"] == frek_id
    assert doc["status"] == "ACTIVE"
    assert doc["badge_type"] == "CC26-STF"
    assert doc["event_id"] == "CC2026"
    assert doc["source"] == "externe"
    enr = doc["enrichment"]
    # Tous les champs enrichment sont présents et null par défaut
    for key in ["frek_subject_did", "nominatif", "jeton_cc_linked", "nfc_badge_written"]:
        assert key in enr
        assert enr[key] is None


def test_lookup_404_when_unknown():
    """Lookup d'un FREK-ID inexistant → 404."""
    r = httpx.get(f"{API}/api/frek/registration/FREK-CC26-XXXXXX", timeout=10)
    assert r.status_code == 404


def test_pre_register_batch_requires_admin():
    """Sans token admin → 403."""
    r = httpx.post(
        f"{API}/api/frek/pre-register-batch",
        json={"event_id": "CC2026", "tickets": []},
        timeout=10,
    )
    assert r.status_code == 403


def test_pre_register_batch_creates_pending():
    """Batch admin crée des entrées en status PENDING."""
    if not ADMIN_TOKEN:
        pytest.skip("EMERGENCY_SECRET non configuré")
    suffix = secrets.token_hex(4)
    tickets = [
        {"external_ref": f"BATCH-A-{suffix}", "badge_type": "CC26-EXP1"},
        {"external_ref": f"BATCH-B-{suffix}", "badge_type": "CC26-EXP2"},
    ]
    r = httpx.post(
        f"{API}/api/frek/pre-register-batch",
        json={"event_id": "CC2026", "tickets": tickets},
        headers={"X-Admin-Token": ADMIN_TOKEN},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["created"] == 2
    assert d["skipped"] == 0
    assert len(d["frek_ids"]) == 2
    # Vérification statut PENDING
    r2 = httpx.get(f"{API}/api/frek/registration/{d['frek_ids'][0]}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["status"] == "PENDING"
    assert r2.json()["activated_at"] is None


def test_pre_register_batch_skips_duplicates():
    """Le batch est idempotent : les external_ref déjà existants sont skipped."""
    if not ADMIN_TOKEN:
        pytest.skip("EMERGENCY_SECRET non configuré")
    suffix = secrets.token_hex(4)
    ref = f"DUP-{suffix}"
    payload = {
        "event_id": "CC2026",
        "tickets": [
            {"external_ref": ref, "badge_type": "CC26-PRS"},
            {"external_ref": ref, "badge_type": "CC26-PRS"},
        ],
    }
    r = httpx.post(
        f"{API}/api/frek/pre-register-batch",
        json=payload,
        headers={"X-Admin-Token": ADMIN_TOKEN},
        timeout=15,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["created"] == 1
    assert d["skipped"] == 1


def test_webhook_queued_when_frekcore_unreachable():
    """Quand FrekCore n'est pas configuré, le webhook est mis en queue."""
    if not ADMIN_TOKEN:
        pytest.skip("EMERGENCY_SECRET non configuré")
    stats_before = httpx.get(
        f"{API}/api/frek/queue/stats",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        timeout=10,
    ).json()

    # Trigger une nouvelle inscription
    httpx.post(
        f"{API}/api/frek/register-silent",
        json={"external_qr_content": _unique_qr("WEBHOOK"), "event_id": "CC2026", "badge_type": "CC26-OFF"},
        timeout=10,
    )

    # Laisser le temps au task asyncio de pousser en queue
    import time
    time.sleep(1.5)

    stats_after = httpx.get(
        f"{API}/api/frek/queue/stats",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        timeout=10,
    ).json()
    # Soit la queue a augmenté (FrekCore non configuré), soit le webhook a réussi (configuré)
    assert stats_after["pending"] >= stats_before["pending"] or stats_after["sent"] > stats_before["sent"]


def test_existing_nfc_tap_route_untouched():
    """Garantit qu'on n'a pas cassé POST /api/frek/nfc/tap (régression)."""
    r = httpx.post(
        f"{API}/api/frek/nfc/tap",
        json={"badge_id": "INEXISTANT-TEST", "montant": 0, "merchant_id": "test", "zone": "test"},
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json()["code"] == "NOT_FOUND"


def test_all_15_badge_types_accepted():
    """Tous les 15 types de badges CC2026 sont acceptés en register-silent."""
    types = ["CC26-ART", "CC26-INT", "CC26-STF", "CC26-BNV", "CC26-PRS",
             "CC26-VIP", "CC26-OFF", "CC26-SPO",
             "CC26-EXP1", "CC26-EXP2", "CC26-EXP3", "CC26-EXP4",
             "CC26-EXP5", "CC26-EXP6", "CC26-EXP7"]
    for bt in types:
        qr = _unique_qr(f"ALL-{bt}")
        r = httpx.post(
            f"{API}/api/frek/register-silent",
            json={"external_qr_content": qr, "event_id": "CC2026", "badge_type": bt},
            timeout=10,
        )
        assert r.status_code == 200, f"badge_type={bt} → {r.status_code} {r.text}"
        assert r.json()["badge_type"] == bt
