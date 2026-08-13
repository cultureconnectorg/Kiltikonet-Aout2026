# SMART ENGINE — DATA DISCOVERY REPORT
_Audit conservateur — aucune modification de code ni de collection_
_Date : 13 août 2026_

---

## 0. Résumé exécutif

Le **Smart Engine** n'est **PAS** un simple sous-composant de l'admin.
C'est **un ancêtre d'Observatory** : une couche d'observation business-first, centrée sur `cc_badges`, qui expose déjà 8 flux thématiques via `/api/smart-engine/*` et alimente 3 tableaux de bord frontend distincts.

Observatory (ce que nous venons de construire) ≠ Smart Engine :
- **Smart Engine** = observation **BUSINESS** (badges, connexions pro, funnel de conversion, paiements, alertes seuil).
- **Observatory** = observation **STRUCTURELLE** (mémoire, timeline, événements normalisés, source of truth, data lineage).

**Le geste correct n'est PAS une fusion.** C'est une **réconciliation par adapters** : Observatory devient la couche canonique agrégée ; Smart Engine reste la vue business spécialisée. Les collections restent où elles sont.

---

## 1. ARCHITECTURE ACTUELLE DE SMART ENGINE

### 1.1 Fichiers backend concernés

| Fichier | Rôle |
|---|---|
| `/app/backend/routes/smart_engine.py` (612 lignes) | 8 flux + dashboard unifié (`/api/smart-engine/*`) |
| `/app/backend/server.py` L5916→L6035 | `POST /index-contacts`, `GET /profiles`, `DELETE /purge` (indexation contacts) |
| `/app/backend/server.py` L10102→L10460 | `stats`, `alerts/rules` CRUD, `check-alerts`, `insights`, `cron/check` |
| `/app/backend/services/cvl_brain_agents.py` | `brain_smart_engine_analyse` — pont Smart Engine → CVL Brain (Laurent.ia) |
| `/app/backend/routes/brain.py` L64 | `POST /brain/smart-engine-flux` — analyse par l'IA d'un flux |
| `/app/backend/routes/ai_agents.py` L21-38 | Métadonnées agent "smart-engine-cvln" + agent "alerts-engine" |
| `/app/backend/tests/test_smart_engine.py` | Tests existants |

### 1.2 Fichiers frontend

| Fichier | Rôle |
|---|---|
| `SmartEngineDashboard.jsx` | Dashboard principal (via `/api/smart-engine/*`) |
| `admin/SmartEngine3D.jsx` | Vue 3D interactive du système |
| `MgraphView.jsx` | Consomme `/smart-engine/mgraph` (graphe relationnel) |
| `RecommendationsDashboard.jsx` | Consomme `/api/smart-engine/mgraph` |
| `AdminDashboard.jsx` L795 | Onglet Smart Engine intégré |
| `DashboardCC2026.jsx` L688 | Vue Smart Engine dans le dashboard CC2026 |
| Route `/smart-engine` | Page dédiée pleine page |

---

## 2. TABLE PAR SOURCE — les 11 collections lues par Smart Engine

| # | SOURCE (Smart Engine flux) | COLLECTION | Volume preview | Date range | Identifiants | Relation Observatory | Doublon ? | Valeur historique | Statut |
|---|---|---|---:|---|---|---|---|---|---|
| 1 | Predictive (regs), Verified Identity, Mgraph, Conversion (badges) | **`cc_badges`** | À probér en prod | created_at | `badge_id`, `frek_id` | ❌ Observatory NE lit PAS cc_badges | Non | 🟢 **TRÈS ÉLEVÉE** — corpus institutionnel CC2026 | ✅ Active |
| 2 | Predictive (page views), Live Audience, Creation Origin (devices), Cultural Diffusion (referrers/engagement/scroll), Conversion (visitors), Creative Network (activity), Alerts/Stats/Insights | **`analytics_events`** | 2 550 (dont 2 544 legacy) | Avril → août 2026 | `session_id`, `visitor_id`, `event_type` | ✅ Observatory canonical | Oui — usage partagé | Élevée | ✅ Active |
| 3 | Creation Origin (countries/languages/profiles), Creative Network (enrichment) | **`registrations`** | 9 | 2026-04-02 → today | `id`, `email`, `frek_id` | ✅ Observatory `/territories`, `/actors` | Oui — usage partagé | Élevée (schéma métier) | ✅ Active |
| 4 | Creative Network (connections) | **`pro_connections`** | À probér | created_at | `from_profile`, `to_profile` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 5 | Creative Network (messages) | **`pro_messages`** | À probér | created_at | `id` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 6 | Creative Network (opportunities) | **`pro_opportunities`** | 8 | recent | `id` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 7 | Creative Network (events) | **`pro_events`** | 7 | recent | `id` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 8 | Cultural Diffusion (contacts) | **`contact_messages`** | À probér | created_at | `id`, `email` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 9 | Cultural Diffusion (partners) | **`partners`** | À probér | — | `id` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| 10 | Conversion (revenue) | **`stripe_payments`** | 8 (payment_transactions vu) | recent | `id`, `payment_intent_id` | ❌ absent Observatory | Non | Élevée (revenue) | ✅ Active |
| 11 | Alerts (déclenchement) | **`team_notifications`** | 2 | recent | `id`, `type` | ❌ absent Observatory | Non | Moyenne | ✅ Active |
| — | (dérivé) | `smart_profiles` (44) | 44 | — | — | ❌ | Élevée | ✅ |
| — | (dérivé) | `workspace_logs` (16 preview, 445 test) | 16 | — | — | ✅ Observatory `/timeline` | Oui | Élevée | ✅ |
| — | Observatory-only | `scan_events` | 0 preview | — | — | ✅ Observatory `/memory` | Non | Élevée (badges scannés) | ✅ |
| — | Legacy | `site_events` | **2 544** | mai → juillet 2026 | `_id` | ✅ Migrée dans analytics_events (`_pre_refonte=True`) | — | Élevée | 🟡 Archive read-only |

**Note volume** : le count exhaustif en prod n'a pas été fait dans cette phase — le periscope preview (`culture_connect_2026`) est utilisé comme référence. La prod peut contenir beaucoup plus (notamment `cc_badges` qui est probablement peuplé par les 45 inscriptions CC2026 réelles).

---

## 3. MATRICE DE RECONCILIATION

### 3.1 Recouvrement Smart Engine × Observatory

|  | Smart Engine | Observatory | Doublon | Complémentaire | Unique | Contradictoire |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `analytics_events` | ✅ | ✅ | 🟡 usage partagé (agrégats ≠) | | | Non |
| `registrations` | ✅ (creation-origin, network) | ✅ (territories, actors) | 🟡 lectures différentes | ✅ | | Non |
| `workspace_logs` | ❌ | ✅ (timeline) | | ✅ | Observatory | |
| `scan_events` | ❌ | ✅ (memory) | | ✅ | Observatory | |
| `cc_badges` | ✅ (verified-identity, mgraph, conversion) | ❌ | | ✅ | Smart Engine | |
| `pro_connections` / `pro_messages` / `pro_opportunities` / `pro_events` | ✅ (creative-network) | ❌ | | ✅ | Smart Engine | |
| `contact_messages` / `partners` | ✅ (cultural-diffusion) | ❌ | | ✅ | Smart Engine | |
| `stripe_payments` | ✅ (conversion) | ❌ | | ✅ | Smart Engine | |
| `team_notifications` | ✅ (alerts) | ❌ (mais Phase 5) | | ✅ | Smart Engine | |
| `site_events` (legacy) | ❌ | ✅ (via migration) | | | Observatory | |

### 3.2 Contradictions / risques

1. **Comptages « unique visitors » divergents possibles** :
   - Smart Engine `live-audience` compte les `$group: session_id` sur `created_at` (>5 min).
   - Observatory `/sessions` compte les distincts `session_id` ET les distincts `visitor_id` sur `timestamp`.
   - Les DEUX peuvent donner des valeurs différentes selon le champ (`created_at` vs `timestamp`), le fuseau et l'inclusion des events legacy `unknown`.
   - ➜ Recommandation : Observatory définit **le canon** ; Smart Engine devrait consommer la même définition.

2. **Registrations : Smart Engine attend `payment_status`, `language_preference`, `country`, `organization_name`** — champs absents du schéma preview (les 9 docs ont `full_name`, `frek_id`, `profile_type`, `jetons_solde`, etc.). Les endpoints Smart Engine retournent donc des tableaux vides silencieusement.
   - ➜ Recommandation : documenter le schéma canonique de `registrations` (Observatory expose déjà les champs vides comme "not yet configured").

3. **Champ temporel incohérent** :
   - `analytics_events` : `timestamp` (client-provided) ET `created_at` (serveur).
   - Smart Engine utilise `created_at` partout.
   - Observatory utilise `timestamp`.
   - ➜ Recommandation : Observatory standardise sur `created_at` (autorité serveur) pour éviter la manipulation client.

---

## 4. ARCHITECTURE CIBLE (proposée, non implémentée)

```
                    SOURCES BRUTES (11 collections + legacy)
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        ▼                           ▼                            ▼
   Smart Engine                Workspace                     CC2026
   (business specialized)     (admin activity)          (badges/registrations)
        │                           │                            │
        └───────────────────────────┼────────────────────────────┘
                                    ▼
                            CANONICAL ADAPTERS
                            (services/observatory_adapters/)
                          - badges_adapter.py
                          - network_adapter.py
                          - conversion_adapter.py
                          - alerts_adapter.py
                                    ▼
                        OBSERVATORY (couche canonique)
                     /api/observatory/* + data lineage
                                    │
                       ┌────────────┴────────────┐
                       ▼                         ▼
                FOUNDER VIEW                PUBLIC WINDOW
                /observatory              kiltikonet.fr /now
                (dense, complet)          (3-4 chiffres agrégés)

  Smart Engine RESTE actif et exposé — mais consomme les mêmes adapters.
  Aucune collection n'est déplacée ni renommée.
```

### 4.1 Principe des adapters

Chaque adapter :
- lit **une** collection (source of truth de son domaine)
- expose une **shape canonique** (dict Python typé) que Observatory ET Smart Engine peuvent consommer
- porte le `data_lineage` explicite (collection source, champs lus, méthode d'agrégation)
- **jamais d'écriture**, **jamais de suppression**

### 4.2 Endpoints Observatory à créer (Phase 2, après validation)

| Endpoint | Adapter | Source(s) | Remplace |
|---|---|---|---|
| `GET /api/observatory/badges` | `badges_adapter` | `cc_badges` | Smart Engine `verified-identity` |
| `GET /api/observatory/conversion` | `conversion_adapter` | `analytics_events` + `cc_badges` + `stripe_payments` | Smart Engine `conversion` |
| `GET /api/observatory/network` | `network_adapter` | `pro_connections`, `pro_messages`, `pro_opportunities`, `pro_events` | Smart Engine `creative-network` |
| `GET /api/observatory/diffusion` | `diffusion_adapter` | `analytics_events` (referrer/scroll), `contact_messages`, `partners` | Smart Engine `cultural-diffusion` |
| `GET /api/observatory/live` | `live_adapter` (SSE) | `analytics_events` (last 5 min) | Smart Engine `live-audience` |
| `GET /api/observatory/mgraph` | `mgraph_adapter` | `cc_badges` (org relationships) | Smart Engine `mgraph` |

### 4.3 Ce qui NE bouge PAS

- Toutes les routes `/api/smart-engine/*` restent **fonctionnelles** (aucun consommateur cassé).
- Les 3 dashboards frontend Smart Engine restent **inchangés**.
- Les collections ne sont **ni renommées ni migrées**.
- Les alerts rules et le cron `/api/smart-engine/cron/check` restent en place.

---

## 5. RECOMMANDATIONS DE FUSION

### 5.1 Recommandation 1 — Créer une couche `services/observatory_adapters/` (P1)
Un module par domaine (badges, network, conversion, diffusion, live, mgraph, alerts).
Chaque adapter expose :
- `async def snapshot(days: int) -> dict` → shape canonique
- `data_lineage: dict` → collections lues, champs, méthode d'agrégation

Observatory ET Smart Engine consomment ces adapters.

### 5.2 Recommandation 2 — Résoudre l'incohérence temporelle (P1)
Ajouter un champ `event_time` dans les adapters, dérivé de `created_at ?? timestamp` — toutes les agrégations utilisent ce champ.

### 5.3 Recommandation 3 — Documenter le schéma canonique de `registrations` (P0 doc-only)
Créer `/app/memory/CANONICAL_SCHEMAS.md` listant les champs canoniques attendus (organization_name, country, language_preference, payment_status). Ne rien migrer — juste documenter.

### 5.4 Recommandation 4 — Bridge Smart Engine → CVL Brain déjà présent (préserver)
`brain_smart_engine_analyse` (`cvl_brain_agents.py`) est déjà un pont Smart Engine → Laurent.ia. Le préserver ; Phase 7 (Natural language layer d'Observatory) pourra s'en inspirer.

### 5.5 Recommandation 5 — Alertes = Signals Observatory Phase 5 (P2)
`DEFAULT_ALERT_RULES` (server.py L10044-L10100) contient déjà 5 règles pertinentes : `traffic_spike`, `low_conversion`, `deadline_approaching`, `registration_batch`, `error_spike`. Phase 5 (Signals) DOIT s'inspirer directement de ces règles, PAS les remplacer.

### 5.6 Recommandation 6 — Observatory public window /now (P1)
Créer `GET /api/observatory/public/now` (aucune auth) qui expose 3-4 chiffres agrégés depuis `observatory/memory` + `badges_adapter.snapshot()` :
- Traces historiques (2 544+)
- Acteurs enregistrés
- Territoires distincts
- Prochaine édition CC

Le site public `kiltikonet.fr /now` consomme ce endpoint.

---

## 6. RISQUES DE MIGRATION (si adapters mal conçus)

| # | Risque | Sévérité | Mitigation |
|---|---|:---:|---|
| 1 | Casser Smart Engine en refactorant `cc_badges` | 🔴 | Adapter READ-ONLY, jamais toucher au schéma |
| 2 | Changement de sémantique "unique visitor" | 🟠 | Nommer explicitement les deux : `unique_session_ids` vs `unique_visitor_ids` |
| 3 | Doubler la charge DB (2 endpoints lisent la même chose) | 🟡 | Cache Redis 30s sur les adapters agrégés |
| 4 | Perdre le contexte des alerts rules déjà configurées | 🟠 | Ne pas déplacer `alert_rules` ; y accéder via `alerts_adapter` |
| 5 | Confusion utilisateur entre `/smart-engine` et `/observatory` | 🟡 | Documentation UX : Smart Engine = ops CC2026, Observatory = institutionnel |
| 6 | Migration involontaire de collections | 🔴 | Interdire tout `insert/update/delete` dans les adapters (assert au démarrage) |

---

## 7. DONNÉES SUPPLÉMENTAIRES QUE OBSERVATORY POURRAIT RÉCUPÉRER

Sans fusionner, Observatory pourrait afficher ces vues (via adapters) dès Phase 2 :

1. **Cultural Impact Score** — champ `cultural_impact_score` déjà dans `cc_badges` (utilisé par mgraph). Observatory pourrait afficher la distribution et un top 10 (opt-in `show_in_catalog`).
2. **NFC enrolment rate** — `cc_badges.nfc_enabled` vs `cc_badges.nfc_uid`. Chiffre institutionnel fort.
3. **Print & handed** — `cc_badges.imprime` et `cc_badges.remis`. Preuve d'exécution physique.
4. **Jetons volume** — `cc_badges.jetons_solde` sommé. Signal économique interne.
5. **Language distribution** — `registrations.language_preference` (fr/en/es). Signal territorial.
6. **Revenue window** — `stripe_payments.amount` sur 30 jours. Signal de traction.
7. **Alerts fired history** — `team_notifications` filtrés par type. Signal opérationnel.
8. **Pro network density** — ratio `pro_connections.accepted / total_registrations`. Signal réseau.
9. **Top opportunities engagement** — `pro_opportunities` avec compteur d'interactions (via `analytics_events.event_type=opportunity_interaction`).
10. **Contact-to-partnership conversion** — `contact_messages` → `partners.created_at` (délai moyen).

**Chacune est UN endpoint adapter** ; aucune migration nécessaire.

---

## 8. LIVRABLES ATTENDUS DE TA VALIDATION AVANT PHASE 2

Merci de valider avant que je passe à l'implémentation :

- **(V1)** OK pour l'approche par **adapters read-only** (aucune fusion de collections) ?
- **(V2)** OK pour que Smart Engine reste **actif et intact**, mais consomme les mêmes adapters à terme (via un patch progressif) ?
- **(V3)** OK pour que Observatory expose **6 nouveaux endpoints** en Phase 2 (badges, conversion, network, diffusion, live, mgraph) — chacun avec data_lineage explicite ?
- **(V4)** OK pour que les 5 règles d'alertes existantes (`DEFAULT_ALERT_RULES`) deviennent le socle de la section 07 Signals d'Observatory (Phase 5) ?
- **(V5)** OK pour ajouter `GET /api/observatory/public/now` (sans auth, chiffres agrégés uniquement) comme premier point d'exposition publique sur `kiltikonet.fr /now` ?
- **(V6)** Priorité entre les 10 données supplémentaires listées (§7) — lesquelles veux-tu en priorité ?

**Rappel** : aucun code n'a été touché. Ce rapport est purement documentaire.

_Livrables associés_ :
- `/app/memory/SMART_ENGINE_DATA_DISCOVERY.md` (ce fichier)
- `/app/memory/SYSTEM_DISCOVERY_REPORT.md` (Phase 0)
- Testing reports : `iteration_93.json`, `iteration_94.json`, `bug_verification_93.json`
