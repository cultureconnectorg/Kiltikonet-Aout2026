# 🛰️ FREKCORE — Souveraineté des Données FREK-ID

> **Prompt à envoyer dans le projet FrekCore (Emergent compte FrekCore / instance dédiée).**
> Kiltikonet est le **point d'entrée** (génération FREK-ID). FrekCore est la **base de données souveraine** où vivent toutes les données. Les autres apps interrogent FrekCore, jamais leur DB locale.

---

## DIRECTIVE CHIRURGICALE

Tu travailles sur **FrekCore** — la couche de souveraineté de l'écosystème CVLN.
Protocole obligatoire :

1. Audite l'existant FrekCore avant toute action — collections, routes, schémas
2. Ne remplace jamais ce qui fonctionne — tu t'y greffes
3. Ne renomme jamais — ni collections, ni routes, ni variables
4. Conflit détecté → tu signales, tu proposes, tu n'agis pas seul
5. **FrekCore est la source de vérité.** Kiltikonet et les autres apps consomment, FrekCore stocke et expose.

---

## CONTEXTE ÉCOSYSTÈME

```
┌─────────────────────┐         POST /api/core/ingest        ┌─────────────────────┐
│   KILTIKONET        │ ─── fire-and-forget Bearer ────────▶ │   FREKCORE (toi)    │
│   (point d'entrée)  │                                       │   (DB souveraine)   │
│                     │                                       │                     │
│ Génère FREK-ID      │                                       │ Stocke              │
│ Scanne billet       │                                       │ Indexe              │
│ Envoie webhook      │ ◀───── GET /api/core/frek/{id} ───── │ Expose API publique │
│                     │ ◀───── GET /api/core/event/CC2026  │                     │
└─────────────────────┘                                       └─────────────────────┘
        │                                                              ▲
        │                                                              │
        ▼                                                              │
   Stocke trace locale                                          Autres apps CVLN
   en frek_registrations                                        interrogent ICI
   (pas source de vérité)                                       (jamais leur DB)
```

**Le flux qui doit fonctionner le jour J CC2026 :**

1. Participant arrive avec un billet (QR code billetterie externe)
2. Staff scanne avec kiltikonet `/scanner-cc2026`
3. Kiltikonet génère `FREK-CC26-XXXXXX`
4. Kiltikonet POST → **FrekCore (toi)** `/api/core/ingest`
5. Toi (FrekCore) tu stockes en DB souveraine
6. Coleen Wallaby et toute autre app interroge : `GET /api/core/frek/{frek_id}` → tu réponds
7. Dashboard temps réel : `GET /api/core/event/CC2026/stats` → tu réponds
8. Pulse écosystème : `GET /api/core/ecosystem/pulse` → tu réponds

---

## OBJECTIF DE CE PROMPT

Implanter dans FrekCore **3 endpoints publics + 1 endpoint d'ingestion sécurisé** pour absorber les FREK-IDs émis par kiltikonet et les exposer en lecture souveraine.

---

## ENDPOINT D'INGESTION (entrant — depuis kiltikonet)

### `POST /api/core/ingest`

**Auth** : header `Authorization: Bearer <FREKCORE_SECRET>`
Cette secret est partagée avec kiltikonet (la même valeur que `FREKCORE_SECRET` côté kiltikonet).

**Payload reçu de kiltikonet** :
```json
{
  "frek_id": "FREK-CC26-A3F7K2",
  "event_id": "CC2026",
  "action": "ACTIVATION",
  "badge_type": "CC26-BNV",
  "timestamp": "2026-05-12T08:00:00+00:00",
  "source": "kiltikonet"
}
```

**Logique** :
1. Vérifier le Bearer token. Si invalide → 401
2. Idempotence : si `frek_id` existe déjà → 200 (silencieux, sans doublon)
3. Stocker en collection `frek_subjects` (voir schéma ci-dessous)
4. Indexer pour requêtes futures
5. Retourner 200 rapidement (kiltikonet est en fire-and-forget)

---

## ENDPOINTS PUBLICS (sortants — consommés par les autres apps)

### `GET /api/core/frek/{frek_id}`
Récupère la fiche d'un FREK-ID.

**Réponse** :
```json
{
  "frek_id": "FREK-CC26-A3F7K2",
  "event_id": "CC2026",
  "badge_type": "CC26-BNV",
  "badge_label": "BÉNÉVOLE",
  "status": "ACTIVE",
  "activated_at": "2026-05-12T08:00:00+00:00",
  "source": "kiltikonet",
  "enrichment": {
    "frek_subject_did": null,
    "nominatif": null,
    "jeton_cc_linked": null,
    "nfc_badge_written": null
  }
}
```

404 si inconnu.

### `GET /api/core/event/{event_id}/stats`
Statistiques temps réel d'un événement.

**Réponse** :
```json
{
  "event_id": "CC2026",
  "total_activations": 423,
  "by_badge_type": {
    "CC26-ART": 18,
    "CC26-BNV": 87,
    "CC26-VIP": 12,
    "CC26-STF": 35,
    "CC26-EXP1": 45,
    ...
  },
  "activations_last_hour": 27,
  "first_activation_at": "2026-05-12T08:00:00+00:00",
  "last_activation_at": "2026-05-12T14:23:12+00:00"
}
```

### `GET /api/core/ecosystem/pulse`
Pouls global de l'écosystème (multi-événements).

**Réponse** :
```json
{
  "total_frek_ids_alive": 12847,
  "events": {
    "CC2026": { "total": 423, "active": 423 },
    "CC2025": { "total": 1840, "active": 1815 }
  },
  "ingestion_rate_per_minute_24h": 4.3,
  "sources": {
    "kiltikonet": 12200,
    "coleen": 647
  },
  "timestamp": "2026-05-12T14:23:12+00:00"
}
```

---

## COLLECTION MONGODB (FrekCore)

### `frek_subjects`
La table maîtresse souveraine.

```json
{
  "frek_id": "FREK-CC26-A3F7K2",
  "event_id": "CC2026",
  "badge_type": "CC26-BNV",
  "badge_label": "BÉNÉVOLE",
  "status": "ACTIVE",
  "source": "kiltikonet",
  "activated_at": "ISO8601",
  "ingested_at": "ISO8601",
  "enrichment": {
    "frek_subject_did": null,
    "nominatif": null,
    "jeton_cc_linked": null,
    "nfc_badge_written": null
  },
  "raw_payloads": [
    {
      "received_at": "ISO8601",
      "source": "kiltikonet",
      "action": "ACTIVATION",
      "payload": { ... }
    }
  ]
}
```

**Indexes obligatoires** :
```python
await db.frek_subjects.create_index("frek_id", unique=True)
await db.frek_subjects.create_index("event_id")
await db.frek_subjects.create_index("status")
await db.frek_subjects.create_index([("event_id", 1), ("badge_type", 1)])
await db.frek_subjects.create_index([("event_id", 1), ("ingested_at", -1)])
await db.frek_subjects.create_index("source")
```

---

## TABLE BADGE_TYPES (à dupliquer côté FrekCore)

Source de vérité conjointe avec kiltikonet — toute modification doit être synchronisée :

```python
BADGE_TYPES = {
    "CC26-ART": "ARTISTE EN SCÈNE",
    "CC26-INT": "INTERVENANT",
    "CC26-STF": "STAFF",
    "CC26-BNV": "BÉNÉVOLE",
    "CC26-PRS": "PRESSE",
    "CC26-VIP": "VIP",
    "CC26-OFF": "OFFICIEL",
    "CC26-SPO": "SPONSOR",
    "CC26-EXP1": "EXPOSANT NIVEAU 1",
    "CC26-EXP2": "EXPOSANT NIVEAU 2",
    "CC26-EXP3": "EXPOSANT NIVEAU 3",
    "CC26-EXP4": "EXPOSANT NIVEAU 4",
    "CC26-EXP5": "EXPOSANT NIVEAU 5",
    "CC26-EXP6": "EXPOSANT NIVEAU 6",
    "CC26-EXP7": "EXPOSANT NIVEAU 7",
}
```

---

## VARIABLES D'ENVIRONNEMENT (FrekCore .env)

```bash
FREKCORE_INGEST_SECRET=<même valeur que FREKCORE_SECRET côté kiltikonet>
FREKCORE_PUBLIC_API_KEY=<optionnel — si les endpoints publics doivent être protégés>
```

⚠️ Les endpoints publics `/api/core/frek/{id}`, `/api/core/event/{id}/stats`, `/api/core/ecosystem/pulse` peuvent être :
- **Totalement publics** (read-only, données non sensibles)
- **Protégés par API key** via header `X-API-Key` si tu préfères

À toi de choisir selon le niveau de souveraineté voulu.

---

## TESTS ATTENDUS

```python
# test_frekcore_souverain.py
async def test_ingest_creates_subject()
async def test_ingest_idempotent_same_frek_id()
async def test_ingest_rejects_invalid_bearer()
async def test_get_frek_subject_by_id()
async def test_get_event_stats_aggregates_correctly()
async def test_ecosystem_pulse_multi_events()
async def test_raw_payloads_appended_on_multiple_actions()
```

---

## PHASE SUIVANTE (à structurer côté FrekCore, pas à implanter maintenant)

Le champ `enrichment` est extensible. Ces colonnes seront remplies par d'autres apps via des endpoints d'enrichissement :

- `POST /api/core/frek/{id}/enrich/nominatif` (kiltikonet quand le participant complète son profil)
- `POST /api/core/frek/{id}/enrich/nfc-write` (kiltikonet quand un badge NFC est écrit)
- `POST /api/core/frek/{id}/enrich/jeton-link` (kiltikonet/coleen lors du link wallet)
- `POST /api/core/frek/{id}/enrich/did` (FrekCore lui-même quand le DID `did:frek:` est généré)

Pour l'instant, ils restent `null`. La structure absorbe sans migration.

---

## INVARIANT À RESPECTER

**FrekCore est la source de vérité.** Si une autre app stocke une donnée FREK-ID en local, c'est juste une **trace de performance** (pour éviter un round-trip réseau sur chaque scan), mais la vérité absolue vit ICI.

Quand un participant pose une question type « est-ce que mon FREK-ID est valide ? », la réponse vient de FrekCore. Pas de kiltikonet. Pas de Coleen. Pas de Baserow. **De FrekCore.**

---

## CONTACTS

- Kiltikonet (point d'entrée) : déjà câblé sur `FREKCORE_WEBHOOK_URL=https://[ton-url-frekcore]/api/core/ingest`
- Secret partagé : `FREKCORE_SECRET` (déjà configuré côté kiltikonet en prod)
- Si tu changes la valeur du secret côté FrekCore → préviens kiltikonet pour synchroniser

---

**Prêt ? Audit d'abord, implantation ensuite.**
