# KILTIKONET NETWORK — IMPLEMENTATION PLAN

**Date** : Février 2026 · **Cadre** : 12 phases · **Exécution** : IMPLEMENT → TEST → VERIFY → REPORT → CONTINUE

---

## Phase 0 · Discovery (DONE)

Livrables :
- `/app/memory/KILTIKONET_NETWORK_DISCOVERY.md`
- `/app/memory/KILTIKONET_NETWORK_DATA_MODEL.md`
- `/app/memory/KILTIKONET_NETWORK_IMPLEMENTATION_PLAN.md` (ce document)

**Aucune modification de code.**

---

## Phase 1 · Backend foundations (~1 itération)

**Livrables**
- `/app/backend/models/network/` : Pydantic models (Territory, Operator, License, TrainingRecord, ComplianceRecord, Audit, Signal, Opportunity, GovernanceRecord, TechAccess, AuditLog) + `BaseDocument` avec `to_mongo()`/`from_mongo()`.
- `/app/backend/routes/network.py` : squelette read-only (`GET /api/network/overview`, `/territories`, `/operators`, `/licenses`, `/compliance`, `/audits`, `/training`, `/technology`, `/signals`, `/opportunities`, `/governance`).
- `/app/backend/services/network_rbac.py` : `require_network_scope(role_min, territory_id?)`.
- **Aucune donnée insérée.** Toutes les listes vides retournent `data:[], lineage:{provenance:"NOT_CONFIGURED", sources:["db.network_*"]}`.

**Tests Phase 1**
- Chaque endpoint retourne 200 avec structure attendue.
- Collections vides → réponses vides + tag NOT_CONFIGURED (jamais `[]` sans tag).
- Aucune modification d'`analytics_events`, `cc_badges`, etc.

---

## Phase 2 · RBAC + multi-tenancy (~1 itération)

**Livrables**
- Extension du modèle `users` : champs `network_role`, `territory_id`, `network_scope`, `network_permissions` (défaut `null`).
- Middleware `require_network_role(min_role)` + `require_territory_scope(territory_id)`.
- Endpoint `GET /api/network/access` : retourne pour le user courant `{network_role, territory_id, permissions[], scope}`.
- Audit log automatique sur toute mutation Network.

**Tests Phase 2**
- Utilisateur A (territoire X) → GET /territories/Y → **403**.
- Utilisateur founder → GET /territories/Y → 200 (même vide).
- Absence de champ `network_role` → traité comme `null` (aucun privilège).

---

## Phase 3 · Network core (~1 itération)

**Livrables**
- `GET /api/network/overview` : agrégat global (territories.count, operators.count, licenses.active, compliance.avg_score, signals.open).
- CRUD Territories (POST/PATCH founder+network_admin only, DELETE interdit).
- CRUD Operators (idem).
- Audit log sur chaque mutation.

**Tests Phase 3**
- POST territory sans être founder/network_admin → 403.
- POST territory sans opérateur associé → 400 (règle métier).

---

## Phase 4 · Territories + operators (~2 itérations)

**Livrables**
- `GET /api/network/territories/:id` : vue détaillée avec drill-down (operators, programmes actifs, licenses, compliance record dernier, signals ouverts).
- Frontend `/network/territories` + `/network/territories/:id` : lecture éditoriale institutionnelle.

**Tests Phase 4**
- Territoire inexistant → 404 + lineage explicite.
- Vue territoire par un `TERRITORY_OPERATOR` autre → 403.

---

## Phase 5 · Licensing + Training (~2 itérations)

**Livrables**
- Workflow License : DRAFT → REVIEW → DUE_DILIGENCE → APPROVED → CONTRACT → PAYMENT → TRAINING → CERTIFICATION → ACTIVE.
- Chaque transition = event dans `network_audit_log` avec `reason` obligatoire.
- Aucune automatisation juridique : `POST /licenses/:id/approve` bloque si `approved_by` n'est pas dans `STRATEGIC_COMMITTEE`.
- Training : 8 modules (Music Lab, Culture Lab, Kids, Festival, Connect, Academy, Stories, Talents).

**Tests Phase 5**
- Transition APPROVED sans strategic_committee → 403.
- Renouvellement crée nouveau doc, ne modifie pas l'ancien.

---

## Phase 6 · Compliance + Quality (~2 itérations)

**Livrables**
- Moteur de règles `services/network_compliance/rules.py` avec règles Python auditables.
- Score 0-100 calculé à partir des findings + status auto-mappé (`CONFORME` / `À_SURVEILLER` / `NON_CONFORME` / `CRITIQUE`).
- Violation FREK-ID → `frek_id_violation=true` + signal `LICENSE_REVOCATION_TRIGGER` créé, **jamais** de retrait auto.
- Vue Quality Committee : liste territoires + scores + violations + audits + sanctions historiques.

**Tests Phase 6**
- Score modifié sans passer par le moteur → 403.
- Violation FREK-ID → signal créé + audit_log + statut CRITIQUE forcé.

---

## Phase 7 · Command Center UI (~2-3 itérations)

**Livrables Frontend**
- `/network` — landing institutionnelle
- `/network/overview` — vue globale (territoires actifs, onboarding, inactifs, conformité moyenne, activité, signaux)
- `/network/territories` — liste + carte
- `/network/territories/:id` — drill-down
- `/network/operators` — liste
- `/network/programmes` — 8 catalogues
- `/network/compliance` — Quality committee view
- `/network/audits`, `/network/training`, `/network/licenses`
- `/network/technology` — access matrix par territoire × plateforme
- `/network/analytics`, `/network/signals`, `/network/opportunities`
- `/network/governance` — Summit, Strategic, Quality
- `/network/documents` — Brand Standards / Technical Standards

**Design** : réutilise `styles/tokens.css` + `kilti/atoms.jsx` + `InstitutionalFooter`. Fond `#0B0906` pour l'espace Command Center, `#F1EBDD` pour les vues publiques du network.

**Aucune card SaaS.** Aucun composant Framer/Webflow.

---

## Phase 8 · Observatory + Smart Engine adapters (~1 itération)

**Livrables**
- `services/network_adapters/observatory.py` : lecture `/api/observatory/*` avec agrégation par territoire.
- `services/network_adapters/smart_engine.py` : lecture team_notifications avec tag territoire.
- Endpoint `GET /api/network/signals?territory_id=&type=` : fusion Observatory + Smart Engine + Compliance moteur.

**Tests Phase 8**
- Aucune écriture sur Observatory ni Smart Engine.
- Signal Smart Engine `traffic_spike` remonte dans `/api/network/signals` avec source=`SMART_ENGINE` et provenance=`OBSERVED`.

---

## Phase 9 · Network graph + Signals (~2 itérations)

**Livrables**
- Endpoint `GET /api/network/graph` : nodes + edges depuis relations réelles (territoires ↔ opérateurs ↔ programmes ↔ actors ↔ FREK-ID). Aucune connexion fabriquée.
- UI `/network/graph` : représentation vectorielle sobre (SVG), zoom, filtres.
- Anomalies détectées par diff de séries temporelles.

**Tests Phase 9**
- Graph vide → SVG vide + tag `DATA_INSUFFICIENT`.
- Aucun edge sans document réel de relation.

---

## Phase 10 · UX institutionnelle (~2 itérations)

**Livrables**
- Header/nav étendu : Kiltikonet · Culture Connect · Observatory · **Network** · À propos · Contact.
- Cohérence typographique Newsreader/Manrope sur toutes les nouvelles pages.
- Footer institutionnel unifié inchangé.
- Mode print pour dossiers Network (`/network/overview`, `/network/territories/:id`).

---

## Phase 11 · Testing exhaustif (~1 itération)

Voir plan de tests dans `KILTIKONET_NETWORK_DISCOVERY.md §9`. Ajouter :
- Test tenant isolation : opérateur A ne voit jamais opérateur B.
- Test data lineage : chaque endpoint retourne `lineage:{}`.
- Test compliance FREK-ID : violation → signal + audit_log.
- Test workflow license : chaque transition auditée.
- Test performance : `/api/network/overview` < 300ms sous charge modérée.
- Test SEO : `/network` et `/network/overview` avec metadata institutionnelles.
- Test accessibilité : contraste, keyboard navigation sur Command Center.

---

## Phase 12 · Production readiness (~1 itération)

**Livrables**
- Audit sécurité (secrets, secrets rotation, aucun mot de passe hardcodé).
- CORS strict / rate limiting sur endpoints Network mutations.
- SEO : sitemap étendu avec routes `/network/*` publiques uniquement.
- Bundle size analysis.
- Documentation `KILTIKONET_NETWORK_OPERATIONS_MANUAL.md` (playbook).

---

## Décisions escaladées (blocage humain)

Ces éléments ne seront **pas** implémentés sans validation :

1. **Création de territoires réels** — nécessite signature légale opérateur.
2. **Automatisation retrait FREK-ID** — reste manuelle. Le moteur détecte + escalade.
3. **Traitements financiers réels** — royalties, entry fees. Aucune écriture dans systèmes de paiement sans validation finance.
4. **Import Brand Standards Manual / Technical Standards Manual** — attente du document canonique.
5. **Doctrine Kiltikonet Summit** — modèle de vote/décision à valider par gouvernance CVLN.

---

## Résumé stratégique

Cette architecture transforme Kiltikonet en une **infrastructure mondiale d'opérationnalisation culturelle**, avec :

- une source de vérité unique pour chaque donnée,
- des adaptateurs read-only préservant Smart Engine + Observatory,
- une matrice RBAC à 18 rôles,
- un moteur de conformité auditable règle-par-règle,
- un Command Center institutionnel (pas SaaS),
- un graph culturel construit à partir de relations réelles.

Chaque phase délivre une valeur mesurable et testable. Aucune phase ne casse l'existant. Aucune donnée n'est fabriquée.
