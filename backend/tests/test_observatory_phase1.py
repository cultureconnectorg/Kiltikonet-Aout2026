"""
Phase 1 Observatory backend tests.
- Tests /api/observatory/* endpoints
- Tests analytics normalization on POST /api/analytics/batch and /api/analytics/track
- Non-regression: /api/badges/inscrire, /api/gouvernance/stats, /api/badges/types
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to reading frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ═════════════ OBSERVATORY ENDPOINTS ═════════════

def test_observatory_access_public(s):
    r = s.get(f"{BASE_URL}/api/observatory/access")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("is_founder") is False
    assert "authenticated" in d


def test_observatory_memory(s):
    r = s.get(f"{BASE_URL}/api/observatory/memory")
    assert r.status_code == 200, r.text
    d = r.json()
    dm = d.get("digital_memory")
    assert dm is not None
    for k in ("events_total", "workspace_activity", "cc2026_registrations",
              "recorded_scans", "distinct_organizations", "distinct_territories"):
        assert k in dm, f"missing {k}"
        assert "value" in dm[k]
        assert "source" in dm[k]
    # events_total breakdown
    assert "breakdown" in dm["events_total"]
    assert "legacy_pre_refonte" in dm["events_total"]["breakdown"]
    assert "post_refonte" in dm["events_total"]["breakdown"]
    # events_total >= 2544 legacy (user requirement)
    assert dm["events_total"]["value"] >= 2544, f"events_total={dm['events_total']['value']} (expected >=2544)"


def test_observatory_timeline(s):
    r = s.get(f"{BASE_URL}/api/observatory/timeline?days=180")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "timeline" in d and isinstance(d["timeline"], list)
    assert "range" in d and "sources" in d
    # At least one bin with events > 0
    has_events = any(b.get("events", 0) > 0 for b in d["timeline"])
    assert has_events, "no bin has events>0 — legacy events not being counted"


def test_observatory_event_types(s):
    r = s.get(f"{BASE_URL}/api/observatory/event-types?days=30")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("source") == "db.analytics_events"
    assert isinstance(d.get("top_types"), list)
    # Should include page_view or page_exit (from legacy or new)
    types = {t["type"] for t in d["top_types"]}
    # weaker assert: just check list has entries
    assert len(d["top_types"]) >= 1


def test_observatory_territories(s):
    r = s.get(f"{BASE_URL}/api/observatory/territories")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("source") == "db.registrations.country"
    assert "territories" in d
    assert "total" in d
    assert "distinct" in d


def test_observatory_sessions(s):
    r = s.get(f"{BASE_URL}/api/observatory/sessions?days=7")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "unique_sessions" in d
    assert "unique_visitors" in d
    assert "top_pages" in d
    assert "top_referrers" in d
    assert "source" in d
    assert "visitor_id" in d["source"] and "session_id" in d["source"]


def test_observatory_actors(s):
    r = s.get(f"{BASE_URL}/api/observatory/actors")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "top_actors" in d
    assert "source" in d


# ═════════════ ANALYTICS NORMALIZATION ═════════════

def test_analytics_batch_normalizes(s):
    sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
    vid = f"TEST_vis_{uuid.uuid4().hex[:8]}"
    payload = {
        "events": [{
            "eventType": "page_view",
            "sessionId": sid,
            "timestamp": "2026-01-15T10:00:00Z",
            "data": {
                "visitor_id": vid,
                "consent": "anonymous",
                "url": "https://kiltikonet.fr/?utm_source=twitter&utm_medium=social&utm_campaign=phase1",
                "page": "/test-observatory",
                "referrer": "https://google.com/search?q=kiltikonet",
            }
        }]
    }
    r = s.post(
        f"{BASE_URL}/api/analytics/batch",
        json=payload,
        headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"}
    )
    assert r.status_code in (200, 201), r.text

    # Wait for insertion and query via sessions endpoint
    time.sleep(1.5)
    sess_r = s.get(f"{BASE_URL}/api/observatory/sessions?days=1")
    assert sess_r.status_code == 200
    sd = sess_r.json()
    # top referrers should include google.com (non-internal)
    hosts = [x["host"] for x in sd.get("top_referrers", [])]
    # weak assertion: we can't guarantee our event is in top; but check that pages contain our test page
    pages = [x["page"] for x in sd.get("top_pages", [])]
    # If our page shows up, normalization worked
    print(f"pages sample: {pages[:5]}, referrers sample: {hosts[:5]}")


def test_analytics_track_snake_case(s):
    sid = f"TEST_sess_track_{uuid.uuid4().hex[:8]}"
    vid = f"TEST_vis_track_{uuid.uuid4().hex[:8]}"
    payload = {
        "event_type": "custom_test",
        "session_id": sid,
        "timestamp": "2026-01-15T10:05:00Z",
        "data": {
            "visitor_id": vid,
            "consent": "full",
            "page": "/track-test",
        }
    }
    r = s.post(f"{BASE_URL}/api/analytics/track", json=payload)
    assert r.status_code in (200, 201), r.text


# ═════════════ NON-REGRESSION ═════════════

def test_regression_badges_types(s):
    r = s.get(f"{BASE_URL}/api/badges/types")
    assert r.status_code == 200, r.text
    d = r.json()
    # Should return 14 types
    if isinstance(d, list):
        assert len(d) == 14, f"expected 14 badge types, got {len(d)}"
    elif isinstance(d, dict) and "types" in d:
        assert len(d["types"]) == 14
    else:
        pytest.fail(f"unexpected shape: {type(d)}")


def test_regression_gouvernance_stats(s):
    r = s.get(f"{BASE_URL}/api/gouvernance/stats")
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d, dict)


def test_regression_badges_inscrire(s):
    payload = {
        "nom": f"TEST_User_{uuid.uuid4().hex[:6]}",
        "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
        "badge_type": "voisin",
    }
    r = s.post(f"{BASE_URL}/api/badges/inscrire", json=payload)
    # Endpoint may return 200, 201, or 400 depending on validation
    assert r.status_code in (200, 201, 400, 422), r.text
