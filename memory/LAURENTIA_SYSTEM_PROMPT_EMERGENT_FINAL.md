# LAURENT.IA — System Prompt Emergent.sh v3.0 Final
# Coller dans le system prompt du projet Emergent Laurent.ia

---

## IDENTITÉ DU PROJET

Tu travailles sur **Laurent.ia** — l'infrastructure d'intelligence souveraine du groupe CVLN.
Ce n'est PAS une app. C'est un système multi-tenant qui déploie automatiquement une instance IA personnelle pour chaque utilisateur inscrit, invisiblement dérivée d'un cerveau central CVLN.

**Nom affiché à l'utilisateur :** Laurent.ia
**Nom technique interne :** CVL Brain (héritage kiltikonet — ne pas renommer dans le code)
**Serveur :** autonome, séparé de kiltikonet.fr
**MongoDB :** instance dédiée laurentia-prod (séparée de kiltikonet)

---

## RÈGLE ABSOLUE — NE JAMAIS VIOLER

```
ADDITIF UNIQUEMENT.
- Ne jamais modifier kiltikonet.fr
- Ne jamais modifier les endpoints /api/brain/* (hérités, fonctionnels)
- Ne jamais modifier les collections MongoDB existantes copiées
- Tout nouveau code = nouveaux fichiers, nouvelles collections préfixées laurentia_
```

---

## CODE DE DÉPART — EXTRAIT DE kiltikonet.fr

Le projet démarre avec ces fichiers copiés depuis kiltikonet.fr CVL Brain :

```
/app/backend/services/
  cvl_brain.py              # Wrapper Claude — méthodes analyze(), chat_enriched()
  cvl_brain_agents.py       # Registre 10 agents — update_status(), log_call()
  cvl_brain_knowledge.py    # Base de connaissances, doctrine COEURVOLAN

/app/backend/routes/
  brain.py                  # 15 endpoints /api/brain/* — NE PAS MODIFIER
  omega.py                  # Chat enrichi + memory + upload + web search
  ai_agents.py              # Admin registry 10 agents
  recommendations.py        # IA matching

/app/frontend/src/
  components/omega/BrainChat.jsx        # Terminal IA principal
  components/AIAgentsDashboard.jsx      # Admin dashboard
  hooks/useBrain.js                     # Hook React → /api/brain/chat-enriched
```

### 3 bugs à corriger EN PREMIER avant tout développement :
1. `cvl_brain.py` : modèle `claude-sonnet-4-20250514` → migrer vers `claude-sonnet-4-5-20250929`
2. `cvl_brain_agents.py` : `agent_logs` collection vide — implémenter `log_write()` (manquant)
3. `omega.py` : réponses bloquantes → implémenter SSE streaming sur `chat-enriched`

---

## VARIABLES D'ENVIRONNEMENT

```env
# IA (même pattern que kiltikonet)
EMERGENT_LLM_KEY=              # universal key Emergent

# MongoDB Atlas — instance dédiée Laurent.ia
MONGODB_URL=                   # connection string laurentia-prod
DB_NAME=laurentia

# Sécurité
LAURENTIA_SECRET_SALT=         # salt pour hashing tenant_id (SHA-256)
LAURENTIA_ENCRYPTION_KEY=      # AES-256 mémoire chiffrée par instance

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=              # price_id Stripe plan Pro €15/mois

# Interconnexions inter-services
KILTIKONET_API_URL=            # URL production kiltikonet.fr
KILTIKONET_API_KEY=            # clé API inter-services
LABELOS_API_URL=               # URL production LabelOS
LABELOS_API_KEY=               # clé API inter-services

# Email
AWS_SES_KEY=                   # transactionnel (hors sandbox)
BREVO_API_KEY=                 # séquences onboarding
BRAVE_API_KEY=                 # web search (même clé que kiltikonet)
```

---

## ARCHITECTURE COMPLÈTE

```
UTILISATEUR (FREK-ID)
    │
    ├──→ kiltikonet.fr (serveur A — INCHANGÉ)
    │       CVL Brain rebranché → LAURENTIA_API_URL
    │       Expose :
    │         GET /api/users/validate/{frek_id}   → { valid, frek_id, role }
    │         GET /api/users/{frek_id}/profile    → { cultural_profile 7D, badges, wallet }
    │
    ├──→ LAURENT.IA (serveur B — ce projet)
    │       POST /api/laurentia/query   ← point d'entrée principal
    │       MongoDB Atlas laurentia-prod
    │       Valide FREK-ID via kiltikonet_bridge
    │       Enrichit via labelos_bridge
    │       Appelle Claude API via EMERGENT_LLM_KEY
    │       Stream SSE → utilisateur
    │
    └──→ LABELOS (serveur C — séparé)
            Expose :
              GET /api/artists/{frek_id}/context → contexte artiste
            Appelle Laurent.ia pour analyses
```

---

## MONGODB — COLLECTIONS COMPLÈTES

### Collections héritées (copiées de kiltikonet — schéma identique)
```
brain_memory              # { session_id, user_id, title, messages[], tags[], message_count }
brain_training_data       # { id, frek_id, langue, input, output, context_tags, cultural_score }
cvl_brain_agent_status    # { agent_id, connected, last_call, last_detail, total_calls }
cvl_brain_analyses        # { agent, badge_id, input_data, result, timestamp }
agent_overrides           # { agent_id, enabled, updated_at }
agent_logs                # { agent_id, level, message, detail, timestamp } ← À ACTIVER
```

### Nouvelles collections Laurent.ia (préfixe laurentia_)
```json
laurentia_instances: {
  frek_id: string,              // clé primaire — source: kiltikonet
  tenant_path: string,          // ex: /users/sayd
  version: "free|pro|enterprise",
  created_at: DateTime,
  last_active: DateTime,
  tokens_used_month: number,    // reset chaque mois
  tokens_limit_month: number,   // 10000 free, illimité pro
  jcc_balance: number,
  stripe_customer_id: string,
  status: "active|suspended|pending",
  encryption_key_ref: string    // référence externe — JAMAIS la clé
}

laurentia_memory: {
  frek_id: string,
  sessions: array,              // chiffrées AES-256
  long_term: {
    facts: [],
    preferences: {},
    projects: [],
    people: []
  },
  cultural_profile: object,     // 7 dimensions kiltikonet
  updated_at: DateTime
}

laurentia_interactions: {
  tenant_id: string,            // SHA-256(frek_id + SALT) — JAMAIS frek_id en clair
  session_id: string,
  timestamp: DateTime,
  input_text: string,
  input_lang: "fr|cr|en",       // détection auto
  output_text: string,
  agent_used: string,
  context_app: string,
  tokens_input: number,
  tokens_output: number,
  latency_ms: number,
  user_rating: "1|-1|null",
  corpus_eligible: boolean,     // opt-in EXPLICITE uniquement
  anonymized_at: DateTime
}

laurentia_usage: {
  frek_id: string,
  month: string,                // ex: "2026-06"
  tokens_used: number,
  requests_count: number,
  last_request: DateTime
}
```

---

## LES 10 AGENTS (hérités — ne pas modifier)

| ID | Rôle |
|---|---|
| smart-engine-cvln | Alertes intelligentes (scan continu) |
| alert-engine | Notifications alertes critiques |
| badge-generator | Génération badges NFC + PDF |
| analytics-tracker | Tracking visiteurs |
| stripe-webhook | Réception webhooks Stripe |
| email-service | Envoi emails (Brevo + SES) |
| social-feed-engine | Génération feed Pro |
| hcaptcha-guard | Validation captcha |
| cms-sanitizer | Nettoyage HTML anti-XSS |
| batch-processor | Jobs batch (exports, syncs) |

---

## API GATEWAY — CŒUR DU SYSTÈME

```python
# Nouveau fichier : /app/backend/routes/laurentia_gateway.py

POST /api/laurentia/query
payload: {
  frek_id: str,
  input: str,
  context: {
    app: "kiltikonet|labelos|direct|cc2026",
    tenant_id: str,
    session_id: str
  },
  use_web_search: bool = False,
  files: list = []
}

# Séquence interne obligatoire :
1.  validate_frek_id(frek_id)         → kiltikonet_bridge.validate()
2.  load_instance(frek_id)            → laurentia_instances
3.  check_quota(instance)             → si dépassé → degraded_response()
4.  load_memory(frek_id)              → laurentia_memory
5.  get_context(context.app)          → kiltikonet_bridge ou labelos_bridge
6.  inject_knowledge()                → cvl_brain_knowledge.get_context()
7.  call_claude_stream(SSE)           → EMERGENT_LLM_KEY + claude-sonnet-4-5
8.  stream_to_client(SSE)             → tokens en temps réel
9.  log_interaction(anonymized)       → laurentia_interactions
10. update_memory(session)            → laurentia_memory
11. update_usage(tokens)              → laurentia_usage
```

---

## MULTI-TENANT — INSTANCE PAR FREK-ID

```python
# Hook post Magic Link confirmation (ADDITIF sur auth existant)
async def on_user_confirmed(frek_id: str):
    if await db.laurentia_instances.find_one({"frek_id": frek_id}):
        return  # idempotent
    key_ref = await secrets_service.store(frek_id, generate_aes256_key())
    await db.laurentia_instances.insert_one({
        "frek_id": frek_id,
        "version": "free",
        "tokens_limit_month": 10000,
        "tokens_used_month": 0,
        "jcc_balance": 0,
        "status": "active",
        "encryption_key_ref": key_ref,
        "created_at": datetime.utcnow()
    })

# Middleware isolation — TOUTES les routes /api/laurentia/*
async def isolate_tenant(frek_id_jwt: str, tenant_id_req: str):
    if sha256(frek_id_jwt + LAURENTIA_SECRET_SALT) != tenant_id_req:
        await log_security_alert(frek_id_jwt)
        raise HTTPException(403, "Accès refusé")
```

---

## INTERCONNEXIONS INTER-SERVICES

```python
# /app/backend/services/kiltikonet_bridge.py
async def validate_frek_id(frek_id: str) -> dict:
    r = await httpx.get(
        f"{KILTIKONET_API_URL}/api/users/validate/{frek_id}",
        headers={"X-API-Key": KILTIKONET_API_KEY}
    )
    return r.json()  # { valid: bool, frek_id, role }

async def get_frek_profile(frek_id: str) -> dict:
    r = await httpx.get(
        f"{KILTIKONET_API_URL}/api/users/{frek_id}/profile",
        headers={"X-API-Key": KILTIKONET_API_KEY}
    )
    return r.json()  # { cultural_profile 7D, badges, wallet }

# /app/backend/services/labelos_bridge.py
async def get_artist_context(frek_id: str) -> dict:
    r = await httpx.get(
        f"{LABELOS_API_URL}/api/artists/{frek_id}/context",
        headers={"X-API-Key": LABELOS_API_KEY}
    )
    return r.json()

# Router dans le Gateway :
# context.app == "labelos"     → enrichir avec get_artist_context()
# context.app == "kiltikonet"  → enrichir avec get_frek_profile()
# context.app == "direct"      → laurentia_memory uniquement
# context.app == "cc2026"      → mode offline dégradé CC2026
```

---

## BILLING

```python
# /app/backend/routes/billing.py

POST /api/billing/checkout
  → Stripe Checkout session, plan Pro €15/mois
  → success_url: /laurentia/pro-activated

POST /api/billing/webhook  # Stripe webhook
  → customer.subscription.created  → version="pro"
  → customer.subscription.deleted  → version="free"
  → Vérifier STRIPE_WEBHOOK_SECRET sur chaque event

POST /api/billing/jcc-upgrade
  → vérifier jcc_balance >= 150
  → déduire 150 JCC
  → set version="pro", pro_expires_at = now + 30j

# Dégradation gracieuse (JAMAIS 429 brutal) :
def degraded_response():
    return {
        "response": "Tu approches de ta limite mensuelle. Upgrade Pro pour continuer.",
        "cta": {"label": "Activer Pro", "url": "/laurentia/upgrade"},
        "quota_warning": True
    }
```

---

## FRONTEND — SINGLE PAGE VOICE-FIRST

```
# Nouveau : /app/frontend/src/pages/LaurentIA.jsx

Structure :
  <OrbeLaurentIA />         # état: idle / listening / thinking
  <StateIndicator />        # "Laurent.ia écoute..."
  <ConversationZone />      # historique session, bulles SSE
  <FreKIDBadge />           # prénom uniquement, discret
  <StatusBar />             # solde JCC · version · tokens restants
  <MicButton />             # tap = toggle écoute

Pipeline vocal :
  tap → Web Speech API → transcription live
  → POST /api/laurentia/query
  → SSE stream → affichage tokens
  → Web Speech Synthesis (Phase 1) → TTS

Offline CC2026 :
  Service Worker intercepte /api/laurentia/*
  GPS zone Savane/Parc Floral → mode offline auto
  Sync différée dès retour connexion
```

---

## CE QUI N'APPARAÎT JAMAIS DANS L'UI

- CVLN Group, CVL Brain, infrastructure, agents, endpoints
- Phase 1, Phase 2, roadmap interne
- Détails techniques de l'architecture

**L'utilisateur voit uniquement : Laurent.ia — son intelligence personnelle.**

---

## SÉCURITÉ NON-NÉGOCIABLE

- Chiffrement mémoire : AES-256 at rest, clé par instance, JAMAIS dans MongoDB
- TLS 1.3 sur tous les transits
- Data residency EU uniquement
- tenant_id = SHA-256(frek_id + SALT) dans tous les logs — JAMAIS frek_id en clair
- Delete FREK-ID = cascade delete toutes les collections laurentia_*
- corpus_eligible = False par défaut — opt-in EXPLICITE uniquement

---

## JCC — RÈGLE DE COMMUNICATION

```
JCC Phase 1 = instrument prépayé simple.
JAMAIS de promesse de valorisation ou rendement.
JAMAIS mentionner les phases futures JCC dans l'UI ou les emails.
```

---

## ORDRE D'EXÉCUTION (J1 → J17)

```
J1-J3   Phase 0 : Extraction CVL Brain + MongoDB + vars env + 3 bug fixes
J4      Product : Renommage surface Laurent.ia
J4-J5   Core : API Gateway /api/laurentia/query
J5-J7   Core : Multi-tenant instances
J6-J9   Mono : Billing Stripe + JCC
J7-J8   Core : Bridge kiltikonet
J8-J9   Core : Bridge LabelOS
J9-J10  Core + Mono : Logging dataset + corpus RGPD
J5-J10  Product : Dashboard single page voice-first
J10-J14 Product : Landing page + CC2026 page
J12-J15 Product : Email séquences Brevo
J1      Mono : INPI + CGU + Stripe FMS EURL
```

---

*Laurent.ia · CVLN Group · System Prompt Emergent.sh · v3.0 Final · Mai 2026 · Confidentiel*
