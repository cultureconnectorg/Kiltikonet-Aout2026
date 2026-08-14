"""
Kiltikonet Network — Phase 1 regression test
Read-only foundations. No mutations. Preserves Observatory.
Run: pytest /app/backend/tests/test_network_phase1.py -v
"""
import os
import requests

API = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"


def test_overview_public_and_lineage():
    r = requests.get(f"{API}/api/network/overview", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "data" in body
    assert "lineage" in body
    lineage = body["lineage"]
    assert lineage["provenance"] in {"OBSERVED", "NOT_CONFIGURED"}
    assert len(lineage["sources"]) >= 5
    # aucun chiffre fabriqué : si vide, provenance NOT_CONFIGURED
    data = body["data"]
    if data["territories_total"] == 0 and data["operators_total"] == 0:
        assert lineage["provenance"] == "NOT_CONFIGURED"


def test_programmes_catalog():
    r = requests.get(f"{API}/api/network/programmes", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 8
    slugs = {p["slug"] for p in body["data"]}
    assert slugs == {"music_lab", "culture_lab", "kids", "festival",
                     "connect", "academy", "stories", "talents"}


def test_restricted_endpoints_require_auth():
    """10 endpoints require authentication → 401"""
    protected = ["/territories", "/operators", "/licenses", "/compliance",
                 "/audits", "/training", "/technology", "/signals",
                 "/opportunities", "/governance"]
    for path in protected:
        r = requests.get(f"{API}/api/network{path}", timeout=10)
        assert r.status_code == 401, f"{path} should require auth, got {r.status_code}"


def test_access_public_returns_shape():
    r = requests.get(f"{API}/api/network/access", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["authenticated"] is False
    assert body["network_role"] is None
    assert body["territory_id"] is None


def test_observatory_persistence_preserved():
    """Phase 1 must not affect existing collections."""
    r = requests.get(f"{API}/api/observatory/public/now", timeout=10)
    assert r.status_code == 200
    dm = r.json()["digital_memory"]
    # Historical events preserved (2544 legacy + new ones)
    assert dm["recorded_events"] >= 2500
    assert dm["registrations"] >= 10
