# KILTIKONET NETWORK — DISCOVERY

**Date** : Février 2026 · **Auteur** : Architecte Senior Principal · **Statut** : Discovery — aucune modification de code

---

## 1. Architecture existante (inventaire réel)

### 1.1 Backend routes (34 modules)

```
/app/backend/routes/
├── analytics.py          ← ingestion canonique
├── site_analytics.py     ← legacy
├── observatory.py        ← 15 endpoints · founder gate
├── admin_cc2026.py       ← admin CC2026
├── smart_engine.py       ← moteur métier historique (INTACT)
├── badges.py             ← FREK-ID / cc_badges
├── brain.py              ← CVLN Brain
├── ai_agents.py          ← Agent Factory
├── laurentia_bridge.py + laurentia_widget.py
├── frek_silent.py        ← FREK-ID (mode silencieux)
├── cultural_identity.py + cultural_search.py
├── doctrine.py           ← doctrine culturelle
├── fintech.py + wallet.py + jetons.py + shop_payments.py
├── gouvernance.py        ← gouvernance existante
├── pro_feed.py + pro_social.py
├── recommendations.py
├── terrain.py            ← opérations terrain
├── omega.py + skeleton_omega.py
├── ghost_engine.py + ghost_profiles.py
├── push_notifications.py + ses.py
├── candidatures.py
├── support.py + shared.py + webauthn.py
```

### 1.2 Observatory adapters read-only (7)

`/app/backend/services/observatory_adapters/` : `alerts.py`, `badges.py`, `conversion.py`, `diffusion.py`, `live.py`, `mgraph.py`, `network.py`.

### 1.3 Collections MongoDB actuellement en usage (identifiées par inspection routes)

```
analytics_events        canonique · 2 641 docs (dont 2 544 legacy)
site_events             archive read-only
workspace_logs          18 docs
registrations           10 docs (CC2026)
scan_events             scans QR
cc_badges               10 badges · FREK-ID
team_notifications      alertes Smart Engine (traffic_spike, low_conversion,
                        deadline_approaching, registration_batch, error_spike)
users                   comptes utilisateurs (à confirmer)
sessions                sessions authentifiées
candidatures            appels à projets CC2026
```

### 1.4 Rôles utilisateurs actuels détectés

- `founder` (require_founder + FOUNDER_EMAILS env)
- `admin` (via ProtectedRoute `allowedRoles`)
- `finance` (dashboard `AdminFinanceDashboard`)
- Rôles Pro (`ProProtectedRoute` avec bypass `cultureconnectorg@gmail.com`)

**PAS de rôle territoire, opérateur, comité qualité, etc. — à créer.**

### 1.5 Frontend routes existantes

Publiques : `/`, `/a-propos`, `/culture-connect`, `/culture-connect/2026`, `/culture-connect/2027`, `/infrastructure`, `/rejoindre`, `/contact`, `/now`, `/partenaires`.

Restreintes : `/observatory`, `/observatory/founder`, `/admin/*`, `/pro`, `/badge/*`, `/workspace`.

---

## 2. Architecture cible (per prompt §04)

```
CVLN HOLDING LTD
├── Governance
└── KILTIKONET NETWORK SAS
      ├── Network Governance    (Summit, Strategic, Quality)
      ├── Network Operations    (Franchise, Licensing, Training, Compliance, Support)
      ├── Technology Platform   (FREK-ID, KORA, LabelOS, FREKCORE, Agent Factory,
      │                          Laurentia, Command Center)
      ├── Brand System          (Brand, Technical, Programme Standards)
      ├── Network Intelligence  (Analytics, Observatory, Signals, KPIs, Opportunities)
      └── TERRITORIAL OPERATORS (dynamiques : Paris, Montréal, Dakar, London,
                                 Miami, Abidjan, Lagos, São Paulo, N+1)
```

---

## 3. Systèmes existants réutilisables

| Existant | Réutilisation Network | Stratégie |
|---|---|---|
| `observatory.py` (15 endpoints + adapters) | Network Intelligence | **Consommer**, ne pas dupliquer |
| `analytics_events` (canonique) | Traces territoriales | Ajouter champ `territory_id` sur nouveaux events |
| `cc_badges` + FREK-ID | Cultural identities par territoire | Adapter read-only + filter par territoire |
| `team_notifications` | Signals réseau | Adapter read-only + tag territoire |
| `brain.py` + Agent Factory | Technology Platform · accès | Endpoint access matrix |
| `gouvernance.py` existant | Network Governance | Étendre avec Summit / Strategic / Quality |
| `smart_engine.py` | Signals + Compliance rules | Lecture via adapter |
| `laurentia_bridge.py` | Technology Platform · Laurentia | Signaler statut d'accès |
| `frek_silent.py` | FREK-ID · Cultural identities | Adapter read-only |
| `terrain.py` | Territory operations | Base pour opérateurs terrain |
| `require_founder` (observatory.py) | Extension RBAC | Pattern à généraliser |

---

## 4. Données disponibles vs manquantes

### 4.1 DISPONIBLE (utilisable immédiatement)

- 2 641 events canoniques (traces historiques)
- 10 registrations · 10 cultural identities · 18 workspace activities
- Alertes Smart Engine (5 règles actives)
- Adapters observatory (badges, conversion, network, diffusion, live, mgraph, alerts)
- Fonts + design tokens institutionnels

### 4.2 MANQUANT (à modéliser · aucune fabrication)

| Domaine | Statut | Action |
|---|---|---|
| `territories` collection | ABSENT | Créer modèle + collection vide |
| `operators` collection | ABSENT | Créer modèle + collection vide |
| `licenses` collection | ABSENT | Créer modèle + collection vide |
| `compliance_scores` | ABSENT | Créer modèle + moteur de règles |
| `audits` | ABSENT | Créer modèle |
| `training_records` | ABSENT | Créer modèle |
| `network_signals` (agrégation) | ABSENT | Adapter + fenêtre lecture |
| `network_opportunities` | ABSENT | Créer modèle · tag OBSERVED/INFERRED/RECOMMENDED |
| Rôles Network (18) | ABSENT | Extension RBAC |
| Multi-tenancy `territory_id` sur analytics | PARTIELLEMENT (via UTM/params) | Ajouter champ optionnel |

---

## 5. Conflits détectés

1. **Rôle `admin` ≠ `founder`** : bien séparé côté observatory.py mais pas systématique ailleurs. À généraliser.
2. **Absence de champ `territory_id`** sur analytics_events legacy — les 2 544 events pré-refonte ne sont pas rattachables à un territoire. → Solution : marquer `territory_id=null` (`NOT_CONFIGURED`) et ne pas tenter de reconstruction inférée.
3. **`gouvernance.py` existant** peut chevaucher Network Governance. À inspecter avant Phase 3 pour éviter duplication.
4. **`terrain.py`** peut chevaucher Territory operators. À réconcilier.

---

## 6. Risques

- **R1 — Duplication de collections** : créer `network_users` alors qu'il existe déjà `users`. → Mitigation : étendre `users` avec `territory_id` + `network_role`.
- **R2 — Rupture Smart Engine** : Smart Engine reste opérationnel · toute mutation interdite.
- **R3 — Fabrication de territoires** : lister Paris/Montréal/Dakar dans le prompt ne signifie pas qu'ils sont réels. → Territoires créés uniquement quand un opérateur signe.
- **R4 — Multi-tenancy leak** : un opérateur A voit les données de B. → Middleware `require_territory_scope` obligatoire.
- **R5 — Compliance score fabriqué** : afficher un score sans base réelle. → Compliance = null tant qu'aucun audit réel n'a eu lieu.
- **R6 — Décisions juridiques automatisées** : contrats, sanctions. → Toujours human-in-the-loop.

---

## 7. Stratégie d'intégration

```
DISCOVER  ← ce document
   ↓
MAP        ← KILTIKONET_NETWORK_DATA_MODEL.md
   ↓
RECONCILE  ← adapters read-only sur existant
   ↓
ADAPTER    ← services/network_adapters/*
   ↓
IMPLEMENT  ← routes/network.py + models/network/*
   ↓
TEST       ← permissions + tenant isolation + data lineage
```

**Aucune migration destructive.** Aucune collection existante n'est modifiée · seuls des adaptateurs read-only sont créés.

---

## 8. Plan de migration

Aucune migration de données dans les Phases 0-4.

Migrations futures (Phase 5+, sous validation humaine) :
- Rattachement `territory_id` sur nouveaux `analytics_events` (opt-in via UTM `?territory=` )
- Enrichissement `users` avec `network_role` + `territory_id` : script idempotent, valeurs `null` par défaut, jamais destructif.

---

## 9. Plan de tests (matrice à valider en Phase 11)

| Test | Attendu |
|---|---|
| GET /api/network/overview sans auth | 200 + agrégats publics uniquement |
| GET /api/network/territories/{id} par un opérateur de {j} | 403 |
| GET /api/network/territories/{id} par un founder | 200 |
| Compliance score sans audit | Retourne `null` + `NOT_CONFIGURED` |
| Signal fabriqué (aucun signal réel) | Retourne `[]` + `provenance: NONE` |
| Persistance analytics_events | Toujours 2 641+ |
| Smart Engine routes | Inchangées |
| Adapters read-only | Aucune écriture détectée |

---

## 10. Phases d'implémentation (résumé)

| Phase | Livrable | Status |
|---|---|---|
| 0 | Discovery + Data Model + Implementation Plan (docs) | **DONE dans cette itération** |
| 1 | Data model backend + collections vides + models Pydantic | À faire |
| 2 | RBAC 18 rôles + middleware tenant scope | À faire |
| 3 | routes/network.py — overview + territories + operators | À faire |
| 4 | Territories CRUD (founder-only) + Operators CRUD | À faire |
| 5 | Licensing workflow (statuts) + Training records | À faire |
| 6 | Compliance moteur (règles + score + violation FREK-ID = retrait) | À faire |
| 7 | Network Command Center UI + drill-down World→Territory | À faire |
| 8 | Adapters vers Observatory + Smart Engine | À faire |
| 9 | Network Graph + Signals unifiés | À faire |
| 10 | UX institutionnelle (design tokens réutilisés) | À faire |
| 11 | Tests exhaustifs (backend + frontend + permissions + tenant) | À faire |
| 12 | Production readiness (audit sécu, SEO, perf) | À faire |

---

## 11. Décisions d'architecture prises (sans validation humaine requise)

1. `network` = préfixe pour tous les nouveaux modules (`/api/network/*`, `routes/network.py`, `models/network/*`, `services/network_adapters/*`).
2. Territoires stockés dans une nouvelle collection `network_territories` — pas de réutilisation de collection existante.
3. Opérateurs = extension de `users` avec champs `network_role`, `territory_id` (ajoutés progressivement, valeurs par défaut `null`).
4. Multi-tenancy via middleware `require_territory_scope(request, territory_id)` qui vérifie que l'utilisateur a soit `network_role in ['FOUNDER','NETWORK_ADMIN','DG_NETWORK','QUALITY_COMMITTEE','AUDITOR']` (global), soit `territory_id` correspondant.
5. Compliance = collection `network_compliance_records` avec règles Python (moteur `services/network_compliance/rules.py`), pas de moteur externe.
6. Aucun automate juridique : `POST /api/network/licenses` crée uniquement des _drafts_. La validation reste humaine.

---

## 12. Décisions escaladées (humain requis avant exécution)

1. **FOUNDER_EMAILS** actuellement non peuplé en env production — nécessaire pour tester la couche Network en conditions réelles.
2. **Liste des 8 territoires de démonstration** du prompt : à considérer comme cible marketing, PAS comme réalité opérationnelle. → Aucun territoire ne sera pré-créé dans la base.
3. **Doctrine compliance FREK-ID = retrait immédiat** : impact juridique. → Le moteur détecte + escalate au Comité Qualité, mais ne prononce pas la sanction automatiquement.
4. **Kiltikonet Summit / Comité Stratégique / Comité Qualité** : nature juridique à confirmer par la gouvernance CVLN avant modélisation des votes/décisions.
