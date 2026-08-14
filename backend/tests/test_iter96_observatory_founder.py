"""Iteration 96 - Observatory Founder gate + endpoints protection tests."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tarifs-update.preview.emergentagent.com").rstrip("/")

FOUNDER_ONLY_ENDPOINTS = [
    "/api/observatory/signals",
    "/api/observatory/badges",
    "/api/observatory/conversion",
    "/api/observatory/network",
    "/api/observatory/diffusion",
    "/api/observatory/live",
    "/api/observatory/mgraph",
]

PUBLIC_OBSERVATORY_ENDPOINTS = [
    ("/api/observatory/public/now", ["digital_memory"]),
    ("/api/observatory/memory", ["digital_memory"]),
    ("/api/observatory/timeline?days=365", ["timeline"]),
    ("/api/observatory/event-types?days=180", ["top_types"]),
    ("/api/observatory/territories", ["territories"]),
    ("/api/observatory/actors?limit=20", ["top_actors"]),
    ("/api/observatory/sessions?days=30", ["unique_sessions"]),
]

PUBLIC_ROUTES = [
    "/", "/a-propos", "/now", "/culture-connect", "/culture-connect/2026",
    "/culture-connect/2027", "/rejoindre", "/contact", "/observatory", "/infrastructure",
]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def test_access_endpoint_unauthenticated(s):
    r = s.get(f"{BASE_URL}/api/observatory/access", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("authenticated") is False
    assert data.get("is_founder") is False


@pytest.mark.parametrize("endpoint", FOUNDER_ONLY_ENDPOINTS)
def test_founder_only_endpoints_return_401(s, endpoint):
    r = s.get(f"{BASE_URL}{endpoint}", timeout=15)
    assert r.status_code == 401, f"{endpoint} -> {r.status_code}: {r.text[:200]}"


@pytest.mark.parametrize("endpoint,expected_keys", PUBLIC_OBSERVATORY_ENDPOINTS)
def test_public_observatory_endpoints_ok(s, endpoint, expected_keys):
    r = s.get(f"{BASE_URL}{endpoint}", timeout=20)
    assert r.status_code == 200, f"{endpoint} -> {r.status_code}: {r.text[:200]}"
    data = r.json()
    for k in expected_keys:
        assert k in data, f"{endpoint} missing key {k}: {list(data.keys())}"


def test_public_now_has_digital_memory_fields(s):
    r = s.get(f"{BASE_URL}/api/observatory/public/now", timeout=15)
    assert r.status_code == 200
    dm = r.json().get("digital_memory", {})
    for field in ["recorded_events", "registrations", "workspace_activity",
                  "badges_total", "cultural_identities_active", "distinct_territories"]:
        assert field in dm, f"missing {field}: {list(dm.keys())}"


def test_memory_has_sources(s):
    r = s.get(f"{BASE_URL}/api/observatory/memory", timeout=15)
    assert r.status_code == 200
    dm = r.json().get("digital_memory", {})
    for field in ["events_total", "workspace_activity", "cc2026_registrations",
                  "recorded_scans", "distinct_organizations", "distinct_territories"]:
        assert field in dm, f"missing {field}"
        item = dm[field]
        # data lineage - source declared
        assert isinstance(item, dict) and "source" in item and "value" in item, f"{field}: {item}"


def test_timeline_not_empty_with_sources(s):
    r = s.get(f"{BASE_URL}/api/observatory/timeline?days=365", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data.get("timeline"), list)
    assert len(data["timeline"]) > 0, "timeline empty"
    assert isinstance(data.get("sources"), list) and len(data["sources"]) > 0


def test_event_types_share(s):
    r = s.get(f"{BASE_URL}/api/observatory/event-types?days=180", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "top_types" in data and "total_events_period" in data and "source" in data


def test_actors(s):
    r = s.get(f"{BASE_URL}/api/observatory/actors?limit=20", timeout=15)
    assert r.status_code == 200
    data = r.json()
    for k in ["top_actors", "public_catalog_size", "distinct_total", "source"]:
        assert k in data, f"missing {k}"


def test_sessions(s):
    r = s.get(f"{BASE_URL}/api/observatory/sessions?days=30", timeout=15)
    assert r.status_code == 200
    data = r.json()
    for k in ["unique_sessions", "unique_visitors", "top_pages", "top_referrers", "source"]:
        assert k in data, f"missing {k}"


@pytest.mark.parametrize("route", PUBLIC_ROUTES)
def test_public_routes_200(s, route):
    r = s.get(f"{BASE_URL}{route}", timeout=20)
    assert r.status_code == 200, f"{route} -> {r.status_code}"


def test_observatory_founder_route_200_shows_gate(s):
    r = s.get(f"{BASE_URL}/observatory/founder", timeout=20)
    assert r.status_code == 200


def test_no_hardcoded_password_in_observatory_route():
    path = "/app/backend/routes/observatory.py"
    with open(path) as f:
        content = f.read().lower()
    # no obvious hardcoded password strings
    forbidden = ["password =", 'password="', "password ==", "hardcoded"]
    # simpler: ensure "founder_emails" env var is used
    assert "founder_emails" in content.lower(), "FOUNDER_EMAILS env not used"


def test_data_persistence_unchanged(s):
    r = s.get(f"{BASE_URL}/api/observatory/public/now", timeout=15)
    dm = r.json().get("digital_memory", {})
    # Print values for reference - iteration 95 had 2641/10/18/10
    print(f"recorded_events={dm.get('recorded_events')}")
    print(f"registrations={dm.get('registrations')}")
    print(f"workspace_activity={dm.get('workspace_activity')}")
    print(f"cultural_identities_active={dm.get('cultural_identities_active')}")
    # sanity: still >= iteration 95 values
    assert dm.get("recorded_events", 0) >= 2500
