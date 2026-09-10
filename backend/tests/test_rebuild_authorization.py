"""Execute the actual authorization dependencies without reading any database.

These tests exercise trusted request state versus unsigned cookies. They do not
validate server.py's JWT middleware or claim MongoDB integration coverage.
"""
import asyncio
import importlib.util
import json
from pathlib import Path
import sys

from fastapi import HTTPException
import pytest
from starlette.requests import Request


@pytest.fixture(scope="module")
def routers():
    backend = Path(__file__).resolve().parents[1]
    with pytest.MonkeyPatch.context() as patch:
        patch.syspath_prepend(str(backend))
        patch.setenv("MONGO_URL", "mongodb://127.0.0.1:1/?connect=false&serverSelectionTimeoutMS=100")
        patch.setenv("DB_NAME", "rebuild_authorization_no_database")
        patch.setenv("FOUNDER_EMAILS", "founder@example.invalid")
        modules = {}
        for name in ("network", "observatory"):
            spec = importlib.util.spec_from_file_location(
                f"rebuild_authorization_{name}", backend / "routes" / f"{name}.py"
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            modules[name] = module
        yield modules
        for module in modules.values():
            module._client.close()
        base = sys.modules.get("services.observatory_adapters.base")
        if base:
            base._client.close()


def request(session=None, cookie=None):
    headers = [(b"cookie", cookie.encode())] if cookie else []
    req = Request({"type": "http", "headers": headers})
    req.state.session = session
    return req


@pytest.mark.parametrize("name,dependency", [
    ("network", "require_network_read"), ("observatory", "require_founder"),
])
@pytest.mark.parametrize("cookie_name", [None, "session_cookie", "cc_pro_session"])
def test_unsigned_cookie_cannot_grant_access(routers, name, dependency, cookie_name):
    cookie = f'{cookie_name}={json.dumps({"role": "founder"})}' if cookie_name else None
    with pytest.raises(HTTPException) as error:
        asyncio.run(getattr(routers[name], dependency)(request(cookie=cookie)))
    assert error.value.status_code == 401


@pytest.mark.parametrize("name,endpoint", [
    ("network", "network_access"), ("observatory", "access_check"),
])
@pytest.mark.parametrize("cookie_name", ["session_cookie", "cc_pro_session"])
def test_access_endpoint_does_not_trust_unsigned_cookie(routers, name, endpoint, cookie_name):
    cookie = f'{cookie_name}={json.dumps({"role": "founder"})}'
    result = asyncio.run(getattr(routers[name], endpoint)(request(cookie=cookie)))
    assert result["authenticated"] is False


@pytest.mark.parametrize("session", [
    {"role": "founder"}, {"role": "pro", "email": "FOUNDER@example.invalid"},
])
@pytest.mark.parametrize("name,dependency", [
    ("network", "require_network_read"), ("observatory", "require_founder"),
])
def test_verified_founder_authorization_is_preserved(routers, session, name, dependency):
    result = asyncio.run(getattr(routers[name], dependency)(request(session=session)))
    assert result is session


def test_verified_admin_does_not_implicitly_become_founder(routers):
    with pytest.raises(HTTPException) as error:
        asyncio.run(routers["observatory"].require_founder(request(session={"role": "admin"})))
    assert error.value.status_code == 403


@pytest.mark.parametrize("territory_id", [None, "", " "])
def test_territorial_role_requires_its_scope(routers, territory_id):
    session = {"network_role": "TERRITORY_OPERATOR", "territory_id": territory_id}
    with pytest.raises(HTTPException) as error:
        asyncio.run(routers["network"].require_network_read(request(session=session)))
    assert error.value.status_code == 403
    assert error.value.detail == "territory_scope_required"


def test_valid_territorial_scope_remains_authorized(routers):
    session = {"network_role": "TERRITORY_OPERATOR", "territory_id": "test-X"}
    assert asyncio.run(routers["network"].require_network_read(request(session=session))) is session


def test_territory_filter_is_applied_and_foreign_detail_is_denied_before_database_read(routers):
    session = {"network_role": "TERRITORY_OPERATOR", "territory_id": "test-X"}
    assert routers["network"]._scope_query(session) == {"territory_id": "test-X"}
    with pytest.raises(HTTPException) as error:
        asyncio.run(routers["network"].get_territory("test-Y", session))
    assert error.value.status_code == 403


def test_founder_email_has_the_same_global_scope_as_founder_role(routers):
    assert routers["network"]._scope_query({"email": "FOUNDER@example.invalid"}) == {}
    assert routers["network"]._scope_query({"role": "founder"}) == {}


@pytest.mark.parametrize("role", ["NETWORK_ADMIN", "TRAINING_MANAGER", "AUDITOR"])
def test_existing_global_network_roles_remain_authorized(routers, role):
    session = {"network_role": role}
    assert asyncio.run(routers["network"].require_network_read(request(session=session))) is session


def test_existing_eight_programmes_are_preserved(routers):
    assert {item["slug"] for item in routers["network"].PROGRAMMES_CATALOG} == {
        "music_lab", "culture_lab", "kids", "festival", "connect", "academy", "stories", "talents",
    }
