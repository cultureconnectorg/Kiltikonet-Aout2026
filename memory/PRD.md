# PRD — Kiltikonet CC2026

## GOUVERNANCE KILTI KONET — COMPLET

### Partie 1 — Data Model ✅
- Collection `membre_gouvernance` (21 champs, 7 indexes)
- Endpoints CRUD backend (routes/gouvernance.py)

### Partie 2 — Pages Frontend ✅
- /gouvernance — 2 cartes (Associe 50€ / Actif 150€+30€/an)
- /gouvernance/candidater — 4 étapes (FREK → Profil → Répertoire 3-20 → Documents)
- /gouvernance/confirmation — Référence GOV-XXXXXXXX
- /gouvernance/profil — Profil membre, step tracker, cotisation, projets

### Partie 3 — Admin + Stripe + Répertoire ✅
- /admin/gouvernance — Onglet AdminDashboard (candidatures, filtres, détail, accepter/refuser)
- /gouvernance/paiement/{num} — Stripe PaymentIntent (50€ Associé / 150€ Actif)
- /gouvernance/repertoire/{num} — Déclaration répertoire avec droits

### Partie 4 — Storytelling + Signature Yousign ✅ (29/04/2026)
- /gouvernance — Page storytelling (vision, piliers, **compteur live temps réel**, structure, processus 4 étapes)
- /gouvernance/adhesion — Cartes de prix (déplacé)
- Intégration Yousign API v3 (sandbox) :
  - `POST /api/gouvernance/signature/initiate/{num_membre}` — crée Signature Request, génère charte PDF, ajoute signer, active + **email Resend automatique au membre**
  - `GET /api/gouvernance/signature/status/{num_membre}` — poll Yousign + DB
  - `POST /api/gouvernance/signature/webhook` — réception événement signed/done (testé : met à jour signature_done, débloque le paiement automatiquement)
  - `GET /api/gouvernance/stats` — compteur public temps réel (membres engagés, actifs, candidatures, répertoires)
- Signature OBLIGATOIRE entre acceptation admin et paiement cotisation
- Step tracker passé à 5 étapes (Candidature → Examen → Signature → Cotisation → Répertoire)
- Champs DB ajoutés : signature_done, signature_request_id, signature_link, signature_initiated_at, signature_completed_at
- PDF Charte d'engagement généré dynamiquement via reportlab (7 articles + zone signature)
- LiveCounter component : refresh 15s, animation ease-out cubic, indicateur "EN DIRECT" pulsant

### Routes créées
| Route | Accès |
|-------|-------|
| /gouvernance | Public |
| /gouvernance/candidater | Public |
| /gouvernance/profil | Membre authentifié |
| /gouvernance/paiement/{num} | Membre (statut=accepte) |
| /gouvernance/repertoire/{num} | Membre (cotisation payée) |
| /admin/gouvernance | admin_kiltikonet |

### Existant vérifié intact
- 4 packs CC2026 ✅
- FREK wizard ✅
- Stripe ✅
- Feed ✅
- Programme ✅

## FREK Silent Implantation — CC2026 Entry Layer ✅ (12/05/2026)

**Invariant** : Le FREK-ID ne naît jamais d'une action utilisateur consciente. Il naît d'un geste culturel réel — la présence physique.

### Collections nouvelles (isolées, zéro impact existant)
- `frek_registrations` : entrée silencieuse avec champ `enrichment` extensible (frek_subject_did, nominatif, jeton_cc_linked, nfc_badge_written)
- `frek_outbound_queue` : queue de reprise webhook FrekCore (PENDING/SENT/FAILED, max 5 retries)
- Indexes : frek_id unique, external_ref unique, event_id, status

### Endpoints
| Route | Accès |
|---|---|
| `POST /api/frek/register-silent` | Public (scanner staff) |
| `GET /api/frek/badge-types` | Public (table 15 types) |
| `GET /api/frek/registration/{frek_id}` | Public (lookup) |
| `POST /api/frek/pre-register-batch` | Admin (X-Admin-Token) |
| `GET /api/frek/queue/stats` | Admin |

### Webhook FrekCore
- Fire-and-forget vers `FREKCORE_WEBHOOK_URL/api/core/ingest` (Authorization Bearer FREKCORE_SECRET)
- Si injoignable → queued dans frek_outbound_queue, retry toutes les 5 min (background task asyncio démarré au startup)
- Variables `.env` : `FREKCORE_WEBHOOK_URL`, `FREKCORE_SECRET` (vides — à remplir)

### Frontend
- `/scanner-cc2026` → `components/omega/ScannerCC2026.jsx`
- Offline-first : localStorage queue `cc2026_scanner_queue_v1`, sync auto au retour réseau
- QR scanning natif `BarcodeDetector` API + fallback saisie manuelle
- Theme : fond #0a0a0b / or #E8D5A0 / DM Sans

### Tests
- `tests/test_frek_silent.py` : 13 tests passent (création, idempotence, badge types, batch, admin auth, webhook queue, **non-régression `/api/frek/nfc/tap`**)

### Phase suivante (champs enrichment prêts, structure absorbera sans migration)
- Phase 2 : nominatif + écriture badge NFC
- Phase 3 : lien Jeton CC
- Phase 5 : DID `did:frek:FREK-CC26-XXXXXX`

### Protection scanner (12/05/2026)
- Variable `STAFF_TOKEN_CC2026` (vide en preview = mode ouvert, set en prod = scanner protégé)
- Endpoint `POST /api/frek/staff/verify` pour validation au login scanner
- `POST /api/frek/register-silent` protégé par `X-Staff-Token` (dependency)
- Frontend `ScannerCC2026.jsx` : composant `StaffGate` au boot, token stocké en localStorage, bouton logout dans le header, gestion 403 → reconnexion
- Révocation : changer la valeur de `STAFF_TOKEN_CC2026` → tous les tokens existants invalidés instantanément
- Tests pytest : 14/14 (dont test du flag protection)

### FrekCore Souveraineté (prompt à envoyer)
- `/app/memory/PROMPT_FREKCORE_SOUVERAINETE.md` créé
- Architecture : kiltikonet = point d'entrée, FrekCore = base souveraine
- Endpoints à implémenter côté FrekCore : `POST /api/core/ingest`, `GET /api/core/frek/{id}`, `GET /api/core/event/{id}/stats`, `GET /api/core/ecosystem/pulse`

## Laurent.ia Bridge + Rebranding UI ✅ (30/05/2026)

Documents :
- `/app/memory/LAURENTIA_SYSTEM_PROMPT_EMERGENT_FINAL.md` — system prompt complet pour le projet Emergent Laurent.ia
- Pattern : code = `cvl_brain` (intact), UI = "Laurent.ia"

### Lot 1 : Bridge inter-services (`routes/laurentia_bridge.py`)
- `GET /api/users/validate/{frek_id}` — protected X-API-Key, cascade lookup (registrations → kn_profiles → cc_badges)
- `GET /api/users/{frek_id}/profile` — agrégat (identity + cultural_profile 7D + badges + wallet)
- `GET /api/users/bridge/health` — public (révèle juste si configuré ou non)
- Var env : `LAURENTIA_API_KEY` (vide = bridge désactivé 503, set = protégé 403/200)
- Testé : 503 si non configuré, 403 sans/avec mauvais token, 200 avec bon token

### Lot 2 : 3 bug fixes CVL Brain
- `services/cvl_brain.py` : modèle `claude-sonnet-4-20250514` → `claude-sonnet-4-5-20250929`
- `services/cvl_brain_agents.py` : nouvelle fonction `log_write()` + appel auto dans `_log_agent_call()` → collection `agent_logs` enfin alimentée
- `routes/omega.py` : nouvel endpoint additif `POST /api/brain/chat-stream` (SSE streaming) à côté de `/api/brain/chat-enriched` (intact)

### Lot 3 : Rebranding UI (CVL BRAIN → Laurent.ia)
- 13 fichiers modifiés : ProSpaceDashboard, ProOnboarding, BrainChat, CockpitView, ContentDisplay, OrbitalMenu, ProTutorial, CvlBrainFloat, AIAgentsDashboard, RecommendationsDashboard, MgraphView, TradingSettings, ProfileTriptych, StudiosSidebar, ArchivesCloud, SovereignProfileView, AccessibilitePage
- Code Python = INTACT (cvl_brain.py, /api/brain/*, collections cvl_brain_*)
- Seuls les labels visibles à l'utilisateur changent

## Credentials
- Admin: cultureconnectorg@gmail.com / code 000000
