"""
Mgraph adapter — cultural relationship graph (org + type + cultural score).
Founder-only (nodes carry identity fragments).
"""
import random
from .base import db, metric_dictionary


async def snapshot(limit: int = 500) -> dict:
    _db = db()
    random.seed(42)

    badges = await _db.cc_badges.find(
        {}, {"_id": 0, "badge_id": 1, "frek_id": 1, "prenom": 1, "nom": 1,
             "type_badge": 1, "organisation": 1, "cultural_impact_score": 1, "statut": 1}
    ).to_list(limit)

    nodes = []
    type_map = {}
    org_map = {}
    for b in badges:
        base_type = (b.get("type_badge") or "UNK").split("-")[0]
        node = {
            "id": b.get("badge_id"),
            "label": f"{b.get('prenom','')} {b.get('nom','')}".strip(),
            "type": base_type,
            "org": b.get("organisation") or None,
            "score": b.get("cultural_impact_score") or 0,
        }
        nodes.append(node)
        type_map.setdefault(base_type, []).append(node["id"])
        if node["org"]:
            org_map.setdefault(node["org"], []).append(node["id"])

    edges = []
    edge_set = set()
    for org, members in org_map.items():
        for i in range(len(members)):
            for j in range(i + 1, min(len(members), i + 5)):
                key = tuple(sorted([members[i], members[j]]))
                if key not in edge_set:
                    edge_set.add(key)
                    edges.append({"source": members[i], "target": members[j], "link": "org", "w": 0.8})

    high_score = [n for n in nodes if n["score"] >= 40]
    for i in range(len(high_score)):
        for j in range(i + 1, min(len(high_score), i + 4)):
            key = tuple(sorted([high_score[i]["id"], high_score[j]["id"]]))
            if key not in edge_set:
                edge_set.add(key)
                edges.append({"source": high_score[i]["id"], "target": high_score[j]["id"], "link": "brain", "w": 0.6})

    return {
        "domain": "mgraph",
        "nodes": nodes,
        "edges": edges,
        "totals": {"nodes": len(nodes), "edges": len(edges)},
        "metric_dictionary": metric_dictionary(
            source="Smart Engine (mgraph flux) — cc_badges relationships",
            collection="cc_badges",
            definition="Cultural relationship graph inferred from shared organizations + cultural impact.",
            transformation="ORG-based edges (strength 0.8) + high-score bridges (strength 0.6)",
            period="lifetime",
            quality="medium",
            confidence=0.6,
            publication_status="founder-only",
        ),
    }
