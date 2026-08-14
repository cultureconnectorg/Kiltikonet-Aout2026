# KILTIKONET NETWORK — DATA MODEL

**Date** : Février 2026 · **Version** : 0.1 (Phase 0 · à valider avant implémentation) · **Scope** : modèles conceptuels des nouvelles collections `network_*`

---

## Règles générales

1. **Aucune collection existante n'est modifiée.** Toute extension se fait par nouvelle collection préfixée `network_`.
2. **Valeurs manquantes = null** (jamais fabriquées). Le frontend affiche `NOT_YET_CONFIGURED`.
3. **Data lineage obligatoire** : chaque doc a `_source` (adapter, saisie humaine, import) + `_provenance` (`OBSERVED` / `RECONSTRUCTED` / `LEGACY` / `LIVE` / `NOT_CONFIGURED`).
4. **Audit trail** : chaque mutation crée un doc `network_audit_log`.
5. **Multi-tenancy** : chaque doc porte `territory_id` ou `scope: "global"`.
6. **Confidence** : les inférences (compliance, opportunités) portent `confidence: 0.0..1.0`.

---

## Collections

### 1. `network_territories`
```yaml
_id: ObjectId
territory_id: str          # slug stable "mq-fort-de-france"
name: str
country: str               # ISO 3166-1 alpha-2
city: str
geographic_zone: str       # "Caraïbe", "Afrique de l'Ouest", ...
timezone: str
status: enum               # DRAFT | ONBOARDING | ACTIVE | PAUSED | SUSPENDED | CLOSED
license_status: enum       # NONE | DRAFT | REVIEW | APPROVED | ACTIVE | EXPIRED | REVOKED
license_start: datetime | null
license_end: datetime | null
responsible_person_id: str | null
contact_email: str | null
created_at: datetime
updated_at: datetime
_source: str               # "human_input" | "cvln_import" | "adapter"
_provenance: enum
```
**Interdictions** : Ne pas insérer de territoire sans opérateur associé. Ne pas préremplir Paris/Montréal/Dakar/…

### 2. `network_operators`
```yaml
_id: ObjectId
operator_id: str
territory_id: str
legal_entity: str          # nom raison sociale
legal_status: str          # SAS / SARL / association / ...
country: str
tax_id: str | null         # SIRET / equivalent
responsible_person_id: str
team_ids: [str]            # user_ids
programmes_active: [str]   # slugs (music_lab, culture_lab, kids, ...)
created_at: datetime
updated_at: datetime
```

### 3. `network_licenses`
```yaml
_id: ObjectId
license_id: str
territory_id: str
operator_id: str
type: enum                 # BRAND | TECH | PROGRAMME
status: enum               # DRAFT | REVIEW | DUE_DILIGENCE | APPROVED | ACTIVE
                           # | EXPIRED | REVOKED | RENEWED
period_start: datetime | null
period_end: datetime | null
entry_fee_paid: bool
royalty_rate: float | null
programmes_included: [str]
approved_by: str | null    # user_id · strategic_committee member
approved_at: datetime | null
document_urls: [str]       # contrats signés (Yousign)
created_at: datetime
updated_at: datetime
```
**Contrat immuable** : après `status=ACTIVE`, seule création d'un `renewal` autorisée.

### 4. `network_training_records`
```yaml
_id: ObjectId
record_id: str
user_id: str
territory_id: str
module: enum               # MUSIC_LAB | CULTURE_LAB | KIDS | FESTIVAL
                           # | CONNECT | ACADEMY | STORIES | TALENTS
level: enum                # ONBOARDING | INTERMEDIATE | ADVANCED | CERTIFIED
status: enum               # ENROLLED | IN_PROGRESS | COMPLETED | EXPIRED
started_at: datetime | null
completed_at: datetime | null
expires_at: datetime | null
certified_by: str | null   # training_manager user_id
proof_url: str | null
```

### 5. `network_compliance_records`
```yaml
_id: ObjectId
record_id: str
territory_id: str
period_start: datetime
period_end: datetime
score: int | null          # 0..100 ou null si non audité
status: enum               # CONFORME (80-100) | À_SURVEILLER (60-79)
                           # | NON_CONFORME (40-59) | CRITIQUE (<40) | NON_AUDITÉ
frek_id_violation: bool    # violation FREK-ID = retrait immédiat
findings: [
  { rule_id: str, severity: enum, evidence: str, source: str }
]
recommended_actions: [str]
deadline: datetime | null
audit_id: str | null       # référence network_audits
issued_by: str             # quality_committee member id · human, jamais auto
issued_at: datetime
```
**Règle FREK-ID** : si `frek_id_violation=true`, `status` forcé à `CRITIQUE` indépendamment du score, et un signal `LICENSE_REVOCATION_TRIGGER` est créé.

### 6. `network_audits`
```yaml
_id: ObjectId
audit_id: str
territory_id: str
type: enum                 # INITIAL | ANNUEL | AD_HOC | POST_INCIDENT
status: enum               # PLANNED | IN_PROGRESS | COMPLETED | CLOSED
auditor_ids: [str]
scope: [str]               # ["brand_standards","technical_standards","programme_standards"]
findings: [str]            # ids network_compliance_records.findings
started_at: datetime
completed_at: datetime | null
compliance_record_id: str | null
```

### 7. `network_signals`
```yaml
_id: ObjectId
signal_id: str
source: enum               # OBSERVATORY | SMART_ENGINE | COMPLIANCE | OPS | TECH
type: enum                 # TRAFFIC | CONVERSION | COMPLIANCE | LICENSE
                           # | REVENUE | TECH | TRAINING | FREK_ID | OPPORTUNITY
                           # | DEADLINE
territory_id: str | null   # null = global
severity: enum             # INFO | LOW | MEDIUM | HIGH | CRITICAL
title: str
explanation: str
evidence: [{key: str, value: any, source: str}]
status: enum               # OPEN | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | DISMISSED
responsible: str | null    # user_id
recommended_action: str | null
created_at: datetime
resolved_at: datetime | null
_provenance: enum          # OBSERVED (mesuré) | INFERRED (calculé)
                           # | RECOMMENDED (heuristique)
```

### 8. `network_opportunities`
```yaml
_id: ObjectId
opportunity_id: str
type: enum                 # UNDER_EXPLOITED_TERRITORY | HIGH_PERFORMING_PROGRAMME
                           # | ABNORMAL_GROWTH | POTENTIAL_PARTNER | GEO_EXPANSION
                           # | TRAINING_NEED | LICENSE_RENEWAL | COMMERCIAL
territory_id: str | null
scope: str                 # "global" | "territory"
title: str
explanation: str
evidence: [{key: str, value: any, source: str}]
_provenance: enum          # OBSERVED | INFERRED | RECOMMENDED (never truth)
confidence: float          # 0.0 .. 1.0
recommended_next_step: str | null
status: enum               # NEW | REVIEWED | ACTED_ON | DISMISSED
created_at: datetime
```

### 9. `network_governance_records`
```yaml
_id: ObjectId
record_id: str
body: enum                 # SUMMIT | STRATEGIC_COMMITTEE | QUALITY_COMMITTEE
edition: str               # ex "2026"
agenda: [str]
participants: [user_id]
decisions: [
  { subject: str, decision: str, votes_for: int, votes_against: int,
    votes_abstain: int, minutes_url: str | null }
]
document_urls: [str]
occurred_at: datetime
```

### 10. `network_technology_access`
```yaml
_id: ObjectId
access_id: str
territory_id: str
operator_id: str
platform: enum             # FREK_ID | KORA | LABEL_OS | AGENT_FACTORY
                           # | FREKCORE | LAURENTIA | COMMAND_CENTER
version: str | null
status: enum               # NONE | REQUESTED | GRANTED | SUSPENDED | REVOKED
last_activity_at: datetime | null
permissions: [str]
usage_metrics: {           # rempli par adapter · never fabricated
  events_last_30d: int | null,
  active_users: int | null
}
incidents: [{id: str, at: datetime, severity: enum}]
```

### 11. `network_audit_log` (append-only)
```yaml
_id: ObjectId
log_id: str
actor_user_id: str
action: str                # "territory.created", "license.approved", ...
target_collection: str
target_id: str
before: dict | null
after: dict | null
reason: str | null         # obligatoire pour compliance/license/sanctions
occurred_at: datetime
ip_masked: str | null
```

### 12. Extensions `users` (existant · **non destructif**)

Champs ajoutés (valeurs par défaut `null`) :
```yaml
network_role: enum | null  # (18 rôles ci-dessous)
territory_id: str | null
network_permissions: [str]
network_scope: enum        # "global" | "region" | "country" | "territory"
```

---

## Matrice RBAC (18 rôles)

| Rôle | Scope | Read Network Global | Write Network Global | Read Own Territory | Sanctions |
|---|---|---|---|---|---|
| FOUNDER | global | ✅ | limité (delegate) | ✅ | non |
| NETWORK_ADMIN | global | ✅ | ✅ | ✅ | non |
| DG_NETWORK | global | ✅ | ✅ | ✅ | proposer |
| DAF | global | financier only | financier only | ✅ | non |
| STRATEGIC_COMMITTEE | global | ✅ | validation programmes/licenses | ✅ | non |
| QUALITY_COMMITTEE | global | ✅ | compliance/audits/sanctions | ✅ | ✅ |
| FRANCHISE_MANAGER | global | ✅ | licenses (draft) | ✅ | non |
| TECH_PLATFORM_ADMIN | global | tech only | tech access | tech only | non |
| MARKETING_MANAGER | global | brand only | brand assets | brand only | non |
| TRAINING_MANAGER | global | training only | training records | training only | non |
| LEGAL_IP | global | legal only | contracts (draft) | legal only | non |
| DATA_ANALYST | global | read-only | non | read-only | non |
| COMMUNITY_MANAGER | global | community only | non | community only | non |
| TERRITORY_ADMIN | territory | non | non | ✅ | non |
| TERRITORY_OPERATOR | territory | non | non | ✅ own ops | non |
| TERRITORY_STAFF | territory | non | non | limited | non |
| AUDITOR | global | ✅ read-only | non | ✅ read-only | non |
| ADMIN | global (legacy) | non | non | non | non |

**Règle absolue** : `ADMIN` (rôle legacy) n'a **pas** de privilège Network par défaut. Séparation stricte des attributions.

---

## Data lineage systématique

Chaque endpoint `/api/network/*` retourne :
```json
{
  "data": {...},
  "lineage": {
    "sources": ["db.network_territories", "db.analytics_events"],
    "provenance": "OBSERVED",
    "confidence": 1.0,
    "as_of": "2026-02-14T15:00:00Z"
  }
}
```

Provenance tags rendus par le frontend :
- **OBSERVED** — mesuré directement dans une collection
- **RECONSTRUCTED** — dérivé par agrégation de collections existantes
- **LEGACY** — importé d'un système antérieur (`_source_legacy=true`)
- **LIVE** — mesuré à l'instant
- **INFERRED** — heuristique (opportunité, score suggéré)
- **RECOMMENDED** — action suggérée (jamais présentée comme vérité)
- **NOT_CONFIGURED** — donnée absente
