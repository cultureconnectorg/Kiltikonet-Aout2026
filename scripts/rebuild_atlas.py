#!/usr/bin/env python3
"""Check the supplied Atlas screen contract against App.js; never decide ownership.

The source index is extracted from the named workbook, without editing it.
Default mode checks the committed report. Use --write to refresh its code evidence.
Only source declarations are checked here; this is not a browser or API test.
"""
import argparse
import json
import re
from pathlib import Path

from rebuild_inventory import ROOT, frontend_routes


def component_files(source):
    files = {}
    for bindings, module in re.findall(r'^import (.+) from ["\']([^"\']+)["\'];', source, re.M):
        if not module.startswith("."):
            continue
        base = ROOT / "frontend/src" / module
        candidates = [base, Path(str(base) + ".js"), Path(str(base) + ".jsx"), base / "index.js", base / "index.jsx"]
        target = next((p for p in candidates if p.is_file()), None)
        if target:
            for binding in re.findall(r"\b[A-Z]\w*\b", bindings):
                files[binding] = target.resolve().relative_to(ROOT).as_posix()
    for binding, module in re.findall(r'const (\w+) = lazy\(\(\) => import\("([^"]+)"\)\)', source):
        base = ROOT / "frontend/src" / module
        target = next((Path(str(base) + ext) for ext in (".js", ".jsx") if Path(str(base) + ext).is_file()), None)
        if target:
            files[binding] = target.resolve().relative_to(ROOT).as_posix()
    for binding in re.findall(r"^const (\w+) = \(", source, re.M):
        files[binding] = "frontend/src/App.js"
    return files


def decision_refs(row):
    # Cross-references to the existing decision map, not new product decisions.
    if row in (8, 9, 10):
        return "D-05"
    if row <= 11:
        return "D-01"
    if row <= 23:
        return "D-02"
    if row <= 32 or row in (76, 77):
        return "D-09 / D-07"
    if row <= 34:
        return "D-10"
    if row <= 41 or row >= 78:
        return "D-11"
    if row <= 46:
        return "D-06"
    if row in (56, 57, 58):
        return "D-08 / D-07"
    return "D-07"


def report():
    index = json.loads((ROOT / "docs/rebuild/ATLAS_SCREEN_INDEX.json").read_text())
    source = (ROOT / "frontend/src/App.js").read_text()
    declarations = frontend_routes(source, include_catch_all=True)
    routes = {r["path"]: r for r in declarations}
    if len(routes) != len(declarations):
        raise ValueError("Duplicate route: Atlas evidence is ambiguous")
    files = component_files(source)
    atlas_paths = set()
    rows = []
    for screen in index["screens"]:
        number = screen["row"]
        expected = screen["component"].split(" (")[0]
        if expected == "ProApp via ProSplashWrapper":
            expected = "ProSplashWrapper"
        matched = []
        for path in screen["paths"]:
            atlas_paths.add(path)
            if path not in routes:
                raise ValueError(f"Atlas row {number}: missing route {path}")
            route = routes[path]
            if route["component"] != expected:
                raise ValueError(f"Atlas row {number}: {path} mounts {route['component']}, expected {expected}; review migration")
            workspace = re.search(r"\(([^)]+)\)$", screen["component"])
            if workspace and f'workspaceId="{workspace[1]}"' not in source.splitlines()[route["line"] - 1]:
                raise ValueError(f"Atlas row {number}: workspace identity changed")
            matched.append(route)
        if expected not in files:
            raise ValueError(f"Atlas row {number}: component source unresolved: {expected}")
        guards = sorted({"ProtectedRoute: " + ", ".join(r["allowedRoles"]) if r["guard"] == "ProtectedRoute" else "Dans le composant : à vérifier" for r in matched})
        paths = " ; ".join(f"`{p}`" for p in screen["paths"])
        component = f"[{expected}](../../{files[expected]})"
        rows.append(f"| {number} | {screen['screen']} | {paths} | {component} | {' ; '.join(guards)} | {decision_refs(number)} |")

    extra = sorted(set(routes) - atlas_paths)
    text = [
        "# Atlas — preuves par écran", "",
        f"Source : `{index['source_file']}`, feuille **{index['sheet']}**, lignes 4–85.",
        f"SHA-256 : `{index['source_sha256']}`.", "",
        f"**{len(rows)} écrans recoupés**, **{len(atlas_paths - {'*'})} chemins nommés conservés**, plus la route 404 `*`. {len(extra)} chemins supplémentaires existent dans App.", "",
        "CURRENT signifie ici : route et composant présents dans le code. La colonne de garde décrit uniquement le montage React. Aucun écran ne reçoit un statut de fonctionnement vérifié par ce contrôle statique.", "",
        "TARGET et DECISION REQUIRED : voir les décisions référencées dans [la carte des capacités](CURRENT_TARGET_DECISIONS_LEGACY.md). Les classifications du classeur restent des indications de source. LEGACY : `/legacy-cc2026` et les surfaces historiques Pro/CC2026 restent présentes ; leur qualification historique n'autorise aucune suppression.", "",
        "Network territorial et Academy ont aussi des fondations backend sans écran Atlas dédié. Leur preuve reste décrite dans la carte, D-03 et D-04. Le réseau social Core ci-dessous ne les remplace pas.", "",
        "| Ligne Atlas | Écran | Routes CURRENT | Source du composant | Garde déclarée dans App | Décision liée |",
        "|---|---|---|---|---|---|", *rows, "",
        "## Routes supplémentaires", "",
        *[f"- `{path}` → `{routes[path]['component']}`" for path in extra], "",
        "## Reproduction et limites", "",
        "`python scripts/rebuild_atlas.py` vérifie les chemins, les composants, les identifiants de workspace explicités dans l'Atlas et la fraîcheur de ce rapport. `python scripts/rebuild_atlas.py --write` le régénère. L'index source n'est pas recalculé depuis le code : il conserve les attentes du classeur fourni.", "",
        "Les noms d'accès du classeur sont conservés dans [l'index source](ATLAS_SCREEN_INDEX.json). Ils ne sont pas transformés en droits serveur. Le montage de ProSplashWrapper est recoupé ; ce contrôle ne prouve pas les sessions Pro ni le fonctionnement de ses sous-vues.", "",
        "Les tests exécutés et leurs limites sont dans [REBUILD_VERIFICATION.md](REBUILD_VERIFICATION.md). Les parcours restant à valider et les liens ambigus sont dans [ATLAS_NEXT_STEPS.md](ATLAS_NEXT_STEPS.md).", "",
    ]
    return "\n".join(text), len(rows), len(atlas_paths - {"*"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    content, screens, paths = report()
    target = ROOT / "docs/rebuild/ATLAS_SCREEN_MATRIX.md"
    if args.write:
        target.write_text(content)
    elif not target.exists() or target.read_text() != content:
        raise ValueError("Atlas report is stale: review changes, then run with --write")
    print(f"PASS: {screens} Atlas screens, {paths} named routes and 404; source evidence only")


if __name__ == "__main__":
    main()
