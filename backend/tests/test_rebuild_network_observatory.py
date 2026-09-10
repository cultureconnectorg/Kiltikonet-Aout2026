"""Real MongoDB integration tests for the Network/Observatory route modules.

This harness mounts the actual routers. It supplies the same verified-session
request-state contract as server.py, but does not claim to boot the full monolith.
MONGOD_BINARY must point to a locally installed mongod; no production DB is used.
"""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
import jwt
from pymongo import MongoClient
import pytest


@pytest.fixture(scope="module")
def harness():
    binary = os.environ.get("MONGOD_BINARY")
    if not binary or not Path(binary).is_file():
        pytest.skip("MONGOD_BINARY required: these tests use real MongoDB")
    with tempfile.TemporaryDirectory(prefix="kiltikonet-rebuild-mongo-") as directory:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        log = Path(directory) / "mongod.log"
        proc = subprocess.Popen([
            binary, "--dbpath", directory, "--bind_ip", "127.0.0.1",
            "--port", str(port), "--logpath", str(log), "--quiet",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        uri = f"mongodb://127.0.0.1:{port}/?serverSelectionTimeoutMS=300"
        mongo = MongoClient(uri)
        try:
            for _ in range(100):
                try:
                    mongo.admin.command("ping")
                    break
                except Exception:
                    if proc.poll() is not None:
                        errors = [line for line in log.read_text().splitlines() if '"s":"E"' in line or '"s":"F"' in line] if log.exists() else []
                        pytest.fail("\n".join(errors) or "mongod failed; inspect its startup log")
                    time.sleep(0.1)
            else:
                pytest.fail("MongoDB did not become ready")
            old_env = {key: os.environ.get(key) for key in ("MONGO_URL", "DB_NAME", "FOUNDER_EMAILS")}
            os.environ.update(MONGO_URL=uri, DB_NAME="kiltikonet_rebuild_test", FOUNDER_EMAILS="founder@example.invalid")
            sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
            from routes import network, observatory

            app = FastAPI()
            secret = secrets.token_hex(32)

            @app.middleware("http")
            async def verified_session_contract(request: Request, call_next):
                token = request.cookies.get("kk_session")
                try:
                    request.state.session = jwt.decode(token, secret, algorithms=["HS256"]) if token else None
                except jwt.InvalidTokenError:
                    request.state.session = None
                return await call_next(request)

            app.include_router(network.router)
            app.include_router(observatory.router)
            database = mongo["kiltikonet_rebuild_test"]
            database.network_territories.insert_many([
                {"territory_id": "test-X", "name": "Test X"},
                {"territory_id": "test-Y", "name": "Test Y"},
            ])
            database.network_operators.insert_many([
                {"territory_id": "test-X", "operator_id": "test-operator-X"},
                {"territory_id": "test-Y", "operator_id": "test-operator-Y"},
            ])
            with TestClient(app, raise_server_exceptions=False) as client:
                yield client, database, secret
            network._client.close()
            observatory._client.close()
            from services.observatory_adapters import base
            base._client.close()
            for key, value in old_env.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
        finally:
            mongo.close()
            proc.terminate()
            proc.wait(timeout=15)


@pytest.fixture
def client(harness):
    api, _, _ = harness
    api.cookies.clear()
    return api


def sign_in(client, harness, **claims):
    token = jwt.encode({**claims, "exp": int(time.time()) + 60}, harness[2], algorithm="HS256")
    client.cookies.set("kk_session", token)


@pytest.mark.parametrize("path", [
    "/territories", "/territories/test-X", "/operators", "/licenses",
    "/compliance", "/audits", "/training", "/technology", "/signals",
    "/opportunities", "/governance",
])
def test_network_restricted_routes_deny_anonymous(client, path):
    assert client.get("/api/network" + path).status_code == 401


@pytest.mark.parametrize("cookie_name", ["session_cookie", "cc_pro_session"])
@pytest.mark.parametrize("path", ["/api/network/operators", "/api/observatory/badges"])
def test_unsigned_cookie_cannot_impersonate_founder(client, cookie_name, path):
    client.cookies.set(cookie_name, json.dumps({"role": "founder", "email": "founder@example.invalid"}))
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ["/api/network/access", "/api/observatory/access"])
def test_access_endpoints_do_not_trust_unsigned_cookie(client, path):
    client.cookies.set("session_cookie", json.dumps({"role": "founder"}))
    assert client.get(path).json()["authenticated"] is False


def test_invalid_signed_cookie_cannot_fall_back_to_unsigned(client):
    client.cookies.set("kk_session", "invalid.signature.token")
    client.cookies.set("cc_pro_session", json.dumps({"network_role": "FOUNDER"}))
    assert client.get("/api/network/operators").status_code == 401


def test_signed_founder_reads_network_and_observatory(client, harness):
    sign_in(client, harness, role="founder", email="test@example.invalid")
    assert client.get("/api/network/operators").json()["total"] == 2
    assert client.get("/api/observatory/badges").status_code == 200


def test_signed_admin_does_not_gain_founder_or_network_role(client, harness):
    sign_in(client, harness, role="admin", email="test@example.invalid")
    assert client.get("/api/network/operators").status_code == 403
    assert client.get("/api/observatory/badges").status_code == 403


def test_founder_email_has_consistent_global_scope(client, harness):
    sign_in(client, harness, role="member", email="founder@example.invalid", network_role="TERRITORY_OPERATOR", territory_id="test-X")
    assert client.get("/api/network/access").json()["network_role"] == "FOUNDER"
    assert client.get("/api/network/operators").json()["total"] == 2
    assert client.get("/api/network/territories/test-Y").status_code == 200


def test_territory_operator_is_limited_to_own_territory(client, harness):
    sign_in(client, harness, role="member", network_role="TERRITORY_OPERATOR", territory_id="test-X")
    body = client.get("/api/network/operators").json()
    assert body["total"] == 1
    assert {row["territory_id"] for row in body["data"]} == {"test-X"}
    assert client.get("/api/network/territories/test-Y").status_code == 403


@pytest.mark.parametrize("territory", [None, "", " "])
def test_missing_territory_never_grants_global_read(client, harness, territory):
    sign_in(client, harness, role="member", network_role="TERRITORY_OPERATOR", territory_id=territory)
    assert client.get("/api/network/operators").status_code == 403


def test_network_catalogue_includes_academy_and_eight_programmes(client):
    response = client.get("/api/network/programmes")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 8
    assert {item["slug"] for item in body["data"]} == {
        "music_lab", "culture_lab", "kids", "festival", "connect", "academy", "stories", "talents",
    }


def test_network_overview_uses_actual_database_counts(client, harness):
    body = client.get("/api/network/overview").json()
    assert body["data"]["territories_total"] == harness[1].network_territories.count_documents({}) == 2
    assert body["data"]["operators_total"] == 2
    assert body["lineage"]["provenance"] == "OBSERVED"


def test_unconfigured_training_stays_empty_with_lineage(client, harness):
    sign_in(client, harness, role="founder")
    response = client.get("/api/network/training")
    assert response.status_code == 200
    assert response.json()["data"] == []
    assert response.json()["lineage"]["provenance"] == "NOT_CONFIGURED"
    assert "network_training_records" not in harness[1].list_collection_names()


def test_read_routes_preserve_collections(client, harness):
    database = harness[1]
    before = {name: list(database[name].find({})) for name in database.list_collection_names()}
    sign_in(client, harness, role="founder")
    for path in ["/api/network/operators", "/api/network/training", "/api/network/programmes", "/api/observatory/public/now", "/api/observatory/badges"]:
        assert client.get(path).status_code == 200
    after = {name: list(database[name].find({})) for name in database.list_collection_names()}
    assert after == before
