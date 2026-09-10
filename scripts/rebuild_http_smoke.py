#!/usr/bin/env python3
"""Serve the built SPA locally and verify its shell and exact entrypoint assets.

This does not run JavaScript, authenticate users or validate application APIs.
No production host or database is contacted.
"""
import argparse
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
PATHS = [
    "/", "/rejoindre", "/reseau?source=atlas",
    "/tarifs?ticket=success&session_id=atlas-test", "/pricing", "/programme",
    "/concert", "/catalogue", "/culture-connect/inscription", "/observatory",
    "/pro", "/smart-engine", "/admin/core", "/admin/core/reseau",
    "/admin/core/messages",
]


class SPAHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if not Path(self.translate_path(self.path)).is_file():
            self.path = "/index.html"
        super().do_GET()


def smoke(build):
    manifest = json.loads((build / "asset-manifest.json").read_text())
    if not manifest.get("entrypoints"):
        raise ValueError("Build manifest has no entrypoints")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SPAHandler, directory=str(build)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    checks = []
    try:
        for path in PATHS:
            with urlopen(origin + path, timeout=10) as response:
                body = response.read()
                if response.status != 200 or b'id="root"' not in body:
                    raise ValueError(f"SPA shell failed: {path}")
                checks.append({"path": path, "status": response.status, "bytes": len(body)})
        for asset in manifest["entrypoints"]:
            file = (build / asset.lstrip("/")).resolve()
            if not file.is_relative_to(build) or not file.is_file():
                raise ValueError(f"Invalid build asset: {asset}")
            with urlopen(origin + "/" + asset.lstrip("/"), timeout=10) as response:
                body = response.read()
                if response.status != 200 or body != file.read_bytes():
                    raise ValueError(f"Asset differs from the build: {asset}")
                checks.append({"asset": asset, "status": response.status, "sha256": hashlib.sha256(body).hexdigest()})
    finally:
        server.shutdown()
        server.server_close()
    return {"scope": "HTTP shell and build assets only; no browser or API validation", "checks": checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", type=Path, default=ROOT / "frontend/build")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = smoke(args.build.resolve())
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"PASS: {len(PATHS)} shell routes, {len(result['checks']) - len(PATHS)} exact build assets")


if __name__ == "__main__":
    main()
