#!/usr/bin/env python3
"""Focused bug verification for BadgeInscription hCaptcha/CSP flow.

Checks only the reported bug scope:
- CSP allows hCaptcha on backend health response
- badge registration endpoint accepts a valid visitor payload
- robots.txt disallow lines are present on frontend and backend-served robots
"""

import json
import os
import sys
import time
from pathlib import Path

import requests


def load_env(path: str) -> dict:
    values = {}
    for raw in Path(path).read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def directive_contains(csp: str, directive: str, needle: str) -> bool:
    for part in [p.strip() for p in csp.split(";") if p.strip()]:
        tokens = part.split()
        if tokens and tokens[0] == directive:
            return needle in tokens
    return False


def main():
    frontend_env = load_env("/app/frontend/.env")
    backend_url = frontend_env.get("REACT_APP_BACKEND_URL")
    require(backend_url, "REACT_APP_BACKEND_URL missing")
    session = requests.Session()
    results = {"backend_url": backend_url, "checks": []}

    # 1) CSP header on backend health.
    health_url = f"{backend_url}/api/health"
    health = session.get(health_url, timeout=20)
    csp = health.headers.get("content-security-policy") or health.headers.get("Content-Security-Policy", "")
    results["checks"].append({"name": "api_health", "status_code": health.status_code, "csp": csp})
    require(health.status_code == 200, f"GET {health_url} returned {health.status_code}")
    for directive in ["script-src", "style-src", "connect-src", "frame-src"]:
        require(directive_contains(csp, directive, "https://hcaptcha.com"), f"{directive} lacks https://hcaptcha.com")
        require(directive_contains(csp, directive, "https://*.hcaptcha.com"), f"{directive} lacks https://*.hcaptcha.com")

    # 2) Backend registration endpoint with a unique VIS payload and no captcha_token fallback.
    unique = int(time.time() * 1000)
    payload = {
        "prenom": "QA",
        "nom": "HCaptcha",
        "email": f"qa.hcaptcha.{unique}@example.com",
        "type_badge": "VIS",
        "organisation": "Bug verification 91",
    }
    register_url = f"{backend_url}/api/badges/inscrire"
    response = session.post(register_url, json=payload, timeout=30)
    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text[:500]}
    results["checks"].append({"name": "badge_register", "status_code": response.status_code, "request_email": payload["email"], "response": body})
    require(response.status_code == 200, f"POST {register_url} returned {response.status_code}: {body}")
    require(body.get("badge_id"), "registration response missing badge_id")
    require(body.get("frek_id") is not None, "registration response missing frek_id field")
    require(body.get("statut") == "INSCRIT", f"registration statut is {body.get('statut')!r}, expected INSCRIT")

    # 3) robots.txt via frontend preview and direct backend route.
    required_disallows = ["Disallow: /participant/", "Disallow: /mon-espace/", "Disallow: /espace-pro/"]
    robots_targets = {
        "frontend_preview": f"{backend_url}/robots.txt",
        "backend_direct": "http://localhost:8001/robots.txt",
    }
    for name, url in robots_targets.items():
        robots = session.get(url, timeout=20)
        results["checks"].append({"name": f"robots_{name}", "url": url, "status_code": robots.status_code, "body_excerpt": robots.text[:400]})
        require(robots.status_code == 200, f"GET {url} returned {robots.status_code}")
        for line in required_disallows:
            require(line in robots.text, f"{url} missing {line}")

    print(json.dumps({"ok": True, **results}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2, ensure_ascii=False))
        sys.exit(1)