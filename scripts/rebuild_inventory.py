#!/usr/bin/env python3
"""Inventory declarations from source; never infer deployment or product ownership.

Run from any directory: python scripts/rebuild_inventory.py
The frontend parser intentionally fails on non-literal/multiline leaf routes so an
unsupported source change cannot silently disappear from the inventory.
Backend decorators are inventoried statically, not advertised as runtime routes.
"""
import ast
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "bb64ce72812f20f6237c02a7ca316fdbbcbb3bf6"
AUDITED_HEAD = "932067029e75eb74b7136002576655237a2ff262"


def frontend_routes(source):
    rows = []
    for line_number, line in enumerate(source.splitlines(), 1):
        if "<Route " not in line:
            continue
        found = re.search(r'<Route path="([^"]+)"', line)
        if not found:
            raise ValueError(f"Unsupported route declaration at line {line_number}")
        path = found[1]
        if path in ("/*", "*"):
            continue
        if not line.rstrip().endswith("} />"):
            raise ValueError(f"Multiline route needs parser review: {path}")
        expression = line.split("element={", 1)[1].rsplit("} />", 1)[0]
        tags = re.findall(r"<([A-Z]\w*)\b", expression)
        role_match = re.search(r"allowedRoles=\{\[([^]]*)\]\}", expression)
        roles = re.findall(r"'([^']+)'", role_match[1]) if role_match else []
        row = {
            "path": path,
            "component": next(t for t in reversed(tags) if t not in ("Suspense", "ProtectedRoute")),
            "guard": "ProtectedRoute" if "ProtectedRoute" in tags else "component-defined",
            "allowedRoles": roles,
            "source": "frontend/src/App.js",
            "line": line_number,
        }
        redirect = re.search(r'<(?:Navigate|CompatibilityRedirect) to="([^"]+)"', expression)
        if redirect:
            row["redirectTo"] = redirect[1]
        rows.append(row)
    return rows


def backend_declarations():
    rows = []
    paths = [ROOT / "backend/server.py", *sorted((ROOT / "backend/routes").glob("*.py"))]
    for path in paths:
        tree = ast.parse(path.read_text())
        prefixes = {"app": ""}
        for node in tree.body:
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
                call = node.value
                if isinstance(call.func, ast.Name) and call.func.id == "APIRouter":
                    prefix = next((k.value.value for k in call.keywords if k.arg == "prefix" and isinstance(k.value, ast.Constant)), "")
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            prefixes[target.id] = prefix
        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                    continue
                method = decorator.func.attr
                if method not in ("get", "post", "put", "patch", "delete", "options", "head", "websocket"):
                    continue
                if not decorator.args or not isinstance(decorator.args[0], ast.Constant):
                    raise ValueError(f"Non-literal endpoint: {path}:{node.lineno}")
                receiver = decorator.func.value
                if not isinstance(receiver, ast.Name):
                    continue
                rows.append({
                    "method": method.upper(),
                    "path": prefixes.get(receiver.id, "<unknown-prefix>") + decorator.args[0].value,
                    "function": node.name,
                    "source": str(path.relative_to(ROOT)),
                    "line": decorator.lineno,
                    "router": receiver.id,
                })
    return rows


def git_source(ref):
    return subprocess.check_output(["git", "show", f"{ref}:frontend/src/App.js"], cwd=ROOT, text=True)


def main():
    current = frontend_routes((ROOT / "frontend/src/App.js").read_text())
    previous = frontend_routes(git_source(AUDITED_HEAD))
    baseline = frontend_routes(git_source(BASE))
    paths = [row["path"] for row in current]
    if len(paths) != len(set(paths)):
        raise ValueError("Duplicate frontend path in current source")
    missing = sorted({row["path"] for row in baseline + previous} - set(paths))
    if missing:
        raise ValueError(f"Existing routes removed without migration: {missing}")

    data = {
        "scope": "Source declarations only. Runtime, access and deployment must be tested separately.",
        "main_sha": BASE,
        "audited_head_sha": AUDITED_HEAD,
        "frontend_main": baseline,
        "frontend_audited_head": previous,
        "frontend_current": current,
        "backend_declarations": backend_declarations(),
    }
    target = ROOT / "docs/rebuild/ROUTE_API_INVENTORY.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    # Runtime metadata: descriptive inventory, never used as an ACL or migration rule.
    route_data = []
    for row in current:
        route_data.append({k: v for k, v in row.items() if k != "line"})
    (ROOT / "frontend/src/config/routeInventory.json").write_text(
        "[\n" + ",\n".join("  " + json.dumps(row, ensure_ascii=False) for row in route_data) + "\n]\n"
    )
    print(f"{len(current)} unique frontend routes; {len(data['backend_declarations'])} backend declarations; no existing frontend route removed")


if __name__ == "__main__":
    main()
