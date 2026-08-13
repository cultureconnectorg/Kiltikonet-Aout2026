#!/usr/bin/env python3
"""Focused verification for P0 analytics duplicate route fix.

This script intentionally exercises only the reported backend flow:
POST /api/analytics/batch and /track must write to analytics_events, not site_events.
It also checks read-only aggregation endpoints, migration idempotence, and the named
non-regression endpoints from the review request.
"""
import json
import os
import re
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient


APP_DIR = Path("/app")
BACKEND_DIR = APP_DIR / "backend"
REPORT_PATH = APP_DIR / "test_reports" / "p0_analytics_verification_details.json"
BACKEND_URL = os.environ.get("BACKEND_TEST_URL", "http://127.0.0.1:8001")

load_dotenv(BACKEND_DIR / ".env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False


def add_result(results, name, passed, details=None):
    result = {"name": name, "passed": bool(passed), "details": details or {}}
    results.append(result)
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}: {json.dumps(details or {}, ensure_ascii=False, default=str)}")


def post_json(path, payload, headers=None, timeout=20):
    merged_headers = {
        "Content-Type": "application/json",
        "User-Agent": "P0AnalyticsVerification/1.0",
        "X-Forwarded-For": "203.0.113.10",
    }
    if headers:
        merged_headers.update(headers)
    return requests.post(f"{BACKEND_URL}{path}", json=payload, headers=merged_headers, timeout=timeout)


def get_json(path, timeout=20):
    return requests.get(f"{BACKEND_URL}{path}", timeout=timeout)


def main():
    run_id = uuid.uuid4().hex[:12]
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    results = []
    created_badge_email = f"qa-p0-{run_id}@example.invalid"

    # Baseline counts.
    site_before = db.site_events.count_documents({})
    analytics_before = db.analytics_events.count_documents({})
    legacy_before = db.analytics_events.count_documents({"_source_legacy": "site_events"})
    legacy_tagged_before = db.analytics_events.count_documents({
        "_source_legacy": "site_events",
        "_pre_refonte": True,
        "_legacy_id": {"$exists": True, "$ne": ""},
    })

    add_result(results, "baseline DB counts captured", True, {
        "db": DB_NAME,
        "site_events": site_before,
        "analytics_events": analytics_before,
        "analytics_legacy": legacy_before,
        "analytics_legacy_tagged": legacy_tagged_before,
    })

    add_result(results, "site_events archive has expected 2544 docs", site_before == 2544, {
        "actual": site_before,
        "expected": 2544,
    })
    add_result(results, "analytics_events contains expected 2544 migrated legacy docs", legacy_before == 2544 and legacy_tagged_before == 2544, {
        "legacy_count": legacy_before,
        "fully_tagged_count": legacy_tagged_before,
        "expected": 2544,
    })

    # 1) Batch canonical route should return {success, count}, insert rich schema, and not touch site_events.
    batch_event_type = f"qa_p0_batch_{run_id}"
    batch_session = f"sess-batch-{run_id}"
    batch_payload = {
        "events": [{
            "eventType": batch_event_type,
            "sessionId": batch_session,
            "userId": f"user-{run_id}",
            "timestamp": iso_now(),
            "data": {"probe": "batch", "run_id": run_id, "page": "/qa-p0-batch"},
        }]
    }
    batch_resp = post_json("/api/analytics/batch", batch_payload)
    try:
        batch_body = batch_resp.json()
    except Exception:
        batch_body = {"raw": batch_resp.text[:500]}
    add_result(results, "POST /api/analytics/batch response is canonical success/count, not legacy ok/count", batch_resp.status_code == 200 and batch_body.get("success") is True and batch_body.get("count") == 1 and "ok" not in batch_body, {
        "status_code": batch_resp.status_code,
        "body": batch_body,
    })
    time.sleep(0.3)
    batch_doc = db.analytics_events.find_one({"event_type": batch_event_type}, {"_id": 0})
    batch_site_docs = list(db.site_events.find({
        "$or": [
            {"event": batch_event_type},
            {"event_type": batch_event_type},
            {"session_id": batch_session},
        ]
    }, {"_id": 0}).limit(5))
    required_rich_fields = ["id", "event_type", "session_id", "user_id", "timestamp", "data", "ip", "user_agent", "created_at"]
    rich_schema_ok = bool(batch_doc) and all(field in batch_doc for field in required_rich_fields) and is_uuid(batch_doc.get("id"))
    add_result(results, "batch event persisted in analytics_events with rich schema", rich_schema_ok, {
        "found": bool(batch_doc),
        "missing_fields": [] if not batch_doc else [f for f in required_rich_fields if f not in batch_doc],
        "doc_sample": batch_doc,
    })
    add_result(results, "batch event did not write into site_events", len(batch_site_docs) == 0, {
        "matching_site_events": batch_site_docs,
    })

    # 1b) Rich handler proof: anomaly event should create a team notification.
    anomaly_event_type = "anomaly"
    anomaly_marker = f"qa_p0_anomaly_{run_id}"
    anomaly_payload = {
        "events": [{
            "eventType": anomaly_event_type,
            "sessionId": f"sess-anomaly-{run_id}",
            "userId": f"user-{run_id}",
            "timestamp": iso_now(),
            "data": {"type": anomaly_marker, "details": "P0 rich handler verification", "severity": "high"},
        }]
    }
    notif_before = db.team_notifications.count_documents({"data.type": anomaly_marker})
    anomaly_resp = post_json("/api/analytics/batch", anomaly_payload)
    try:
        anomaly_body = anomaly_resp.json()
    except Exception:
        anomaly_body = {"raw": anomaly_resp.text[:500]}
    time.sleep(0.5)
    anomaly_doc = db.analytics_events.find_one({"event_type": "anomaly", "data.type": anomaly_marker}, {"_id": 0})
    notification_doc = db.team_notifications.find_one({"data.type": anomaly_marker}, {"_id": 0})
    add_result(results, "batch request reached rich handler anomaly notification path", anomaly_resp.status_code == 200 and anomaly_body.get("success") is True and bool(anomaly_doc) and bool(notification_doc) and db.team_notifications.count_documents({"data.type": anomaly_marker}) == notif_before + 1, {
        "status_code": anomaly_resp.status_code,
        "body": anomaly_body,
        "anomaly_doc_found": bool(anomaly_doc),
        "notification_found": bool(notification_doc),
        "notification_sample": notification_doc,
    })

    # 2) Track snake_case tolerant endpoint.
    snake_event_type = f"qa_p0_track_snake_{run_id}"
    snake_payload = {
        "event_type": snake_event_type,
        "session_id": f"sess-snake-{run_id}",
        "user_id": f"user-snake-{run_id}",
        "timestamp": iso_now(),
        "data": {"probe": "track_snake", "run_id": run_id},
    }
    snake_resp = post_json("/api/analytics/track", snake_payload)
    try:
        snake_body = snake_resp.json()
    except Exception:
        snake_body = {"raw": snake_resp.text[:500]}
    snake_doc = None
    if snake_body.get("event_id"):
        time.sleep(0.2)
        snake_doc = db.analytics_events.find_one({"id": snake_body.get("event_id")}, {"_id": 0})
    add_result(results, "POST /api/analytics/track accepts snake_case and returns success/event_id", snake_resp.status_code == 200 and snake_body.get("success") is True and is_uuid(snake_body.get("event_id")) and snake_doc and snake_doc.get("event_type") == snake_event_type, {
        "status_code": snake_resp.status_code,
        "body": snake_body,
        "doc_sample": snake_doc,
    })

    # 3) Track camelCase tolerant endpoint.
    camel_event_type = f"qa_p0_track_camel_{run_id}"
    camel_payload = {
        "eventType": camel_event_type,
        "sessionId": f"sess-camel-{run_id}",
        "userId": f"user-camel-{run_id}",
        "timestamp": iso_now(),
        "data": {"probe": "track_camel", "run_id": run_id},
    }
    camel_resp = post_json("/api/analytics/track", camel_payload)
    try:
        camel_body = camel_resp.json()
    except Exception:
        camel_body = {"raw": camel_resp.text[:500]}
    camel_doc = None
    if camel_body.get("event_id"):
        time.sleep(0.2)
        camel_doc = db.analytics_events.find_one({"id": camel_body.get("event_id")}, {"_id": 0})
    camel_site_docs = list(db.site_events.find({
        "$or": [
            {"event": camel_event_type},
            {"event_type": camel_event_type},
            {"session_id": f"sess-camel-{run_id}"},
        ]
    }, {"_id": 0}).limit(5))
    add_result(results, "POST /api/analytics/track accepts camelCase and writes analytics_events only", camel_resp.status_code == 200 and camel_body.get("success") is True and is_uuid(camel_body.get("event_id")) and camel_doc and camel_doc.get("event_type") == camel_event_type and not camel_site_docs, {
        "status_code": camel_resp.status_code,
        "body": camel_body,
        "doc_sample": camel_doc,
        "matching_site_events": camel_site_docs,
    })

    # 4) Aggregation endpoints read canonical source and expose lineage/legacy archive.
    health_resp = get_json("/api/analytics/health")
    try:
        health_body = health_resp.json()
    except Exception:
        health_body = {"raw": health_resp.text[:500]}
    add_result(results, "GET /api/analytics/health reports canonical analytics status", health_resp.status_code == 200 and health_body.get("status") == "ok" and isinstance(health_body.get("total_events"), int) and health_body.get("legacy_archive_size") == 2544 and health_body.get("collections", {}).get("current") == "analytics_events", {
        "status_code": health_resp.status_code,
        "body": health_body,
    })

    site_stats_resp = get_json("/api/analytics/site-stats")
    try:
        site_stats_body = site_stats_resp.json()
    except Exception:
        site_stats_body = {"raw": site_stats_resp.text[:500]}
    overview = site_stats_body.get("overview", {}) if isinstance(site_stats_body, dict) else {}
    lineage = site_stats_body.get("data_lineage", {}) if isinstance(site_stats_body, dict) else {}
    legacy_archive = site_stats_body.get("legacy_archive", {}) if isinstance(site_stats_body, dict) else {}
    expected_overview_keys = {"total_events", "events_24h", "events_7d", "events_30d", "unique_sessions_30d"}
    site_stats_ok = (
        site_stats_resp.status_code == 200
        and expected_overview_keys.issubset(overview.keys())
        and legacy_archive.get("site_events_preserved") == 2544
        and lineage.get("source") == "db.analytics_events"
        and "site_events" in str(lineage.get("legacy_source_preserved", ""))
    )
    add_result(results, "GET /api/analytics/site-stats reads canonical source and exposes lineage", site_stats_ok, {
        "status_code": site_stats_resp.status_code,
        "body": site_stats_body,
    })

    # 5) Archive still immutable after ingestion.
    site_after_ingestion = db.site_events.count_documents({})
    add_result(results, "site_events count unchanged after new ingestion", site_after_ingestion == site_before, {
        "before": site_before,
        "after": site_after_ingestion,
    })

    # 6) Migration idempotence.
    analytics_before_migration = db.analytics_events.count_documents({})
    legacy_before_migration = db.analytics_events.count_documents({"_source_legacy": "site_events"})
    migration = subprocess.run(
        ["python", str(BACKEND_DIR / "migrate_site_events.py")],
        cwd=str(BACKEND_DIR),
        text=True,
        capture_output=True,
        timeout=120,
    )
    analytics_after_migration = db.analytics_events.count_documents({})
    legacy_after_migration = db.analytics_events.count_documents({"_source_legacy": "site_events"})
    add_result(results, "migrate_site_events.py is idempotent and creates no duplicates", migration.returncode == 0 and analytics_after_migration == analytics_before_migration and legacy_after_migration == legacy_before_migration, {
        "returncode": migration.returncode,
        "stdout_tail": migration.stdout[-1200:],
        "stderr_tail": migration.stderr[-1200:],
        "analytics_before": analytics_before_migration,
        "analytics_after": analytics_after_migration,
        "legacy_before": legacy_before_migration,
        "legacy_after": legacy_after_migration,
    })

    # 7) Non-regression endpoints named in the review request.
    badges_types_resp = get_json("/api/badges/types")
    try:
        badges_types_body = badges_types_resp.json()
    except Exception:
        badges_types_body = {"raw": badges_types_resp.text[:500]}
    add_result(results, "GET /api/badges/types still works", badges_types_resp.status_code == 200 and isinstance(badges_types_body.get("types"), dict) and len(badges_types_body.get("types", {})) >= 1, {
        "status_code": badges_types_resp.status_code,
        "keys": list(badges_types_body.keys()) if isinstance(badges_types_body, dict) else [],
    })

    gouvernance_resp = get_json("/api/gouvernance/stats")
    try:
        gouvernance_body = gouvernance_resp.json()
    except Exception:
        gouvernance_body = {"raw": gouvernance_resp.text[:500]}
    add_result(results, "GET /api/gouvernance/stats still works", gouvernance_resp.status_code == 200 and {"membres_engages", "membres_actifs", "candidatures_en_cours", "repertoires_declares"}.issubset(gouvernance_body.keys()), {
        "status_code": gouvernance_resp.status_code,
        "body": gouvernance_body,
    })

    badge_payload = {
        "prenom": "QA",
        "nom": f"P0 {run_id}",
        "email": created_badge_email,
        "type_badge": "VIS",
        "organisation": "Verification P0",
    }
    badge_resp = post_json("/api/badges/inscrire", badge_payload, timeout=45)
    try:
        badge_body = badge_resp.json()
    except Exception:
        badge_body = {"raw": badge_resp.text[:500]}
    badge_ok = badge_resp.status_code == 200 and re.match(r"^CC26-VIS-[A-Z0-9]{5}$", str(badge_body.get("badge_id", ""))) is not None and badge_body.get("statut") == "INSCRIT"
    add_result(results, "POST /api/badges/inscrire still works", badge_ok, {
        "status_code": badge_resp.status_code,
        "body": badge_body,
    })

    # Clean up only the non-analytics non-observability seed created by this non-regression test.
    if badge_body.get("badge_id"):
        db.cc_badges.delete_one({"badge_id": badge_body.get("badge_id"), "email": created_badge_email})

    final_counts = {
        "site_events": db.site_events.count_documents({}),
        "analytics_events": db.analytics_events.count_documents({}),
        "analytics_legacy": db.analytics_events.count_documents({"_source_legacy": "site_events"}),
        "test_analytics_events": db.analytics_events.count_documents({"data.run_id": run_id}),
        "test_notifications": db.team_notifications.count_documents({"data.type": anomaly_marker}),
    }

    report = {
        "run_id": run_id,
        "backend_url": BACKEND_URL,
        "db_name": DB_NAME,
        "results": results,
        "passed": all(r["passed"] for r in results),
        "final_counts": final_counts,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    print(f"Wrote detailed report: {REPORT_PATH}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())