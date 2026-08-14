"""
Phase 2 Observatory tests — read-only adapters, no PII in /public/now,
founder-only guards on 7 endpoints, non-regression on Smart Engine + Phase 1.
"""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"

FORBIDDEN_KEYS = {"top_10", "top10", "nodes", "emails", "names", "top_actors",
                  "top_pages", "top_referrers", "top_types", "name", "email"}


def _has_forbidden(obj, forbidden=FORBIDDEN_KEYS):
    """Recursively check for any forbidden key in JSON."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in forbidden:
                return k
            r = _has_forbidden(v, forbidden)
            if r:
                return r
    elif isinstance(obj, list):
        for it in obj:
            r = _has_forbidden(it, forbidden)
            if r:
                return r
    return None


# ─────────────────────────────────────────────────────────
# 1. /public/now — public + strictly aggregated
# ─────────────────────────────────────────────────────────
class TestPublicNow:
    def test_public_now_returns_200_anonymous(self):
        r = requests.get(f"{API}/observatory/public/now", timeout=15)
        assert r.status_code == 200, r.text

    def test_public_now_structure(self):
        r = requests.get(f"{API}/observatory/public/now", timeout=15)
        data = r.json()
        assert "digital_memory" in data
        assert isinstance(data["digital_memory"], dict)
        expected_keys = {"recorded_events", "registrations", "workspace_activity",
                         "badges_total", "cultural_identities_active", "distinct_territories"}
        assert expected_keys.issubset(set(data["digital_memory"].keys())), \
            f"missing: {expected_keys - set(data['digital_memory'].keys())}"
        for k in expected_keys:
            assert isinstance(data["digital_memory"][k], int), f"{k} must be int"
        assert "Aggregated" in data.get("notice", "")
        assert "Observatory" in data.get("canonical_source", "")
        assert "as_of" in data

    def test_public_now_no_pii(self):
        r = requests.get(f"{API}/observatory/public/now", timeout=15)
        data = r.json()
        found = _has_forbidden(data)
        assert found is None, f"forbidden key '{found}' present in /public/now"
        # No email pattern
        blob = json.dumps(data)
        assert "@" not in blob, "email-like chars in /public/now"


# ─────────────────────────────────────────────────────────
# 2. Founder-only endpoints — 401 without auth
# ─────────────────────────────────────────────────────────
FOUNDER_ENDPOINTS = ["/observatory/badges", "/observatory/conversion",
                    "/observatory/network", "/observatory/diffusion",
                    "/observatory/live", "/observatory/mgraph",
                    "/observatory/signals"]


@pytest.mark.parametrize("path", FOUNDER_ENDPOINTS)
def test_founder_endpoints_require_auth(path):
    r = requests.get(f"{API}{path}", timeout=15)
    # 401 (no session) is expected. 403 (auth but no permission) also acceptable per spec.
    assert r.status_code in (401, 403), f"{path} → {r.status_code}: {r.text[:200]}"
    body = r.json()
    detail = (body.get("detail") or "").lower() if isinstance(body, dict) else ""
    assert "auth" in detail or "founder" in detail or "required" in detail, \
        f"{path} unexpected detail: {body}"


# ─────────────────────────────────────────────────────────
# 3. Smart Engine non-regression — all 200
# ─────────────────────────────────────────────────────────
SMART_ENGINE_ENDPOINTS = ["/smart-engine/dashboard", "/smart-engine/mgraph",
                          "/smart-engine/predictive", "/smart-engine/verified-identity",
                          "/smart-engine/live-audience", "/smart-engine/creation-origin",
                          "/smart-engine/cultural-diffusion", "/smart-engine/conversion",
                          "/smart-engine/creative-network"]


@pytest.mark.parametrize("path", SMART_ENGINE_ENDPOINTS)
def test_smart_engine_endpoints_200(path):
    r = requests.get(f"{API}{path}", timeout=20)
    assert r.status_code == 200, f"{path} → {r.status_code}: {r.text[:300]}"


# ─────────────────────────────────────────────────────────
# 4. Phase 1 Observatory non-regression
# ─────────────────────────────────────────────────────────
PHASE1_ENDPOINTS = ["/observatory/access", "/observatory/memory",
                    "/observatory/timeline", "/observatory/event-types",
                    "/observatory/territories", "/observatory/sessions"]


@pytest.mark.parametrize("path", PHASE1_ENDPOINTS)
def test_phase1_endpoints_200(path):
    r = requests.get(f"{API}{path}", timeout=20)
    assert r.status_code == 200, f"{path} → {r.status_code}: {r.text[:300]}"


# ─────────────────────────────────────────────────────────
# 5. Collection counts unchanged before/after
# ─────────────────────────────────────────────────────────
def test_collections_readonly_not_mutated():
    """Call /public/now and smart-engine/dashboard, verify site_events (or analytics_events)
    counts don't change."""
    # Snapshot via /observatory/memory
    r1 = requests.get(f"{API}/observatory/memory", timeout=15).json()
    b1_events = r1["digital_memory"]["events_total"]["value"]
    b1_ws = r1["digital_memory"]["workspace_activity"]["value"]
    b1_regs = r1["digital_memory"]["cc2026_registrations"]["value"]

    # Trigger adapter reads
    requests.get(f"{API}/observatory/public/now", timeout=15)
    requests.get(f"{API}/smart-engine/dashboard", timeout=20)

    r2 = requests.get(f"{API}/observatory/memory", timeout=15).json()
    assert r2["digital_memory"]["events_total"]["value"] == b1_events
    assert r2["digital_memory"]["workspace_activity"]["value"] == b1_ws
    assert r2["digital_memory"]["cc2026_registrations"]["value"] == b1_regs


# ─────────────────────────────────────────────────────────
# 6. Other non-regression
# ─────────────────────────────────────────────────────────
def test_gouvernance_stats():
    r = requests.get(f"{API}/gouvernance/stats", timeout=15)
    assert r.status_code == 200, r.text[:300]


def test_analytics_health():
    r = requests.get(f"{API}/analytics/health", timeout=15)
    assert r.status_code == 200, r.text[:300]


def test_analytics_site_stats():
    r = requests.get(f"{API}/analytics/site-stats", timeout=15)
    assert r.status_code == 200, r.text[:300]


def test_badges_inscrire_creates_badge():
    import uuid
    payload = {
        "prenom": "TEST",
        "nom": f"Phase2_{uuid.uuid4().hex[:6]}",
        "email": f"test_phase2_{uuid.uuid4().hex[:6]}@example.com",
        "organisation": "TEST_ORG_PHASE2",
        "role": "artist",
        "pays": "France",
    }
    r = requests.post(f"{API}/badges/inscrire", json=payload, timeout=20)
    assert r.status_code in (200, 201), r.text[:300]
    body = r.json()
    # Badge should have an id-like field
    assert any(k in body for k in ("badge_id", "id", "badge", "cc_id", "frek_id")), \
        f"no id-ish field in badge response: {body}"
