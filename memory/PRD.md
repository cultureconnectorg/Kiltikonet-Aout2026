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

## Bug Fixes Sécurité ✅ (13/07/2026)

### hCaptcha CSP Fix (P0) — badge inscription débloqué
- **Bug** : Le widget hCaptcha ne s'affichait pas / était bloqué sur `/badge-inscription` (BadgeInscription.jsx) et sur le formulaire de contact (LandingPage.jsx)
- **Cause racine** : Le middleware `SecurityHeadersMiddleware` dans `server.py` définissait une CSP qui n'autorisait pas les domaines `hcaptcha.com` / `*.hcaptcha.com` dans `script-src`, `style-src`, `connect-src`, `frame-src`
- **Fix** : Ajout de `https://hcaptcha.com https://*.hcaptcha.com` dans les 4 directives CSP concernées
- **Vérification** : Toutes les requêtes hCaptcha (`api.js`, `hcaptcha.html`, `checksiteconfig`, `hsw.js`, logos) retournent 200 en preview. Backend `POST /api/badges/inscrire` accepte les inscriptions avec ou sans captcha_token.

### robots.txt RGPD (P2) — masquer les URLs personnelles
- Ajouts dans `/app/frontend/public/robots.txt` ET dans `@app.get("/robots.txt")` de `server.py` :
  - `Disallow: /participant/`
  - `Disallow: /mon-espace/`
  - `Disallow: /espace-pro/`
- Objectif : Empêcher l'indexation des profils publics/personnels par les moteurs de recherche

### Cloudflare Workers Checklist (P1) — instructions manuelles
- Doc créée : `/app/memory/CLOUDFLARE_CHECKLIST.md`
- Étapes pour vérifier sur dashboard Cloudflare que les Workers/Transform Rules/WAF ne réécrivent pas les headers CSP/X-Frame-Options/HSTS posés par FastAPI

## Refondation institutionnelle Kiltikonet ✅ (13/08/2026)

Audit externe d'actif numérique consolidé : Kiltikonet.fr était perçu comme la façade de Culture Connect 2026 (événementiel passé). Objectif : réconcilier l'actif numérique avec l'architecture réelle CVLN Group → Kiltikonet → Culture Connect → éditions récurrentes.

### Phase 1 — Corrections techniques (P0/P1)
- `/api/health` réduit à `{"status":"ok"}` — pas de fuite version/env/db
- `/api/admin/health-detailed` créé (admin/founder only, 403 sinon)
- OAuth callback (`ProSpaceDashboard.jsx`) : `history.replaceState` immédiat au retour de Google/GitHub OAuth pour supprimer `session_id`, `code`, `state` de l'URL avant le POST session → pas de rejeu au clic Back
- CORS déjà strict (vérifié) : `allow_origins` depuis env, `RuntimeError` si non set en prod
- `debug-monitor.js` : déjà iframe-only (Emergent Visual Editor uniquement) — pas de fuite en prod

### Phase 2 — SEO / meta tags
- `index.html` refondé : titre, description, OG, canonical, JSON-LD basculés vers Kiltikonet institutionnel
- JSON-LD Organization = Kiltikonet + parentOrganization = CVLN Group + EventSeries = Culture Connect (avec subEvent 2026)
- Sitemap.xml reconstruit sur `kiltikonet.fr` — retrait des URLs `/participant/{UUID}` (RGPD)
- Composant `SEO.jsx` créé (React 19 native metadata, sans `react-helmet-async` qui crashait en React 19) : titre, meta, OG, Twitter, canonical, JSON-LD par page

### Phase 3 — Homepage institutionnelle Kiltikonet
- Nouveau composant `KiltikonetHome.jsx` désormais servi sur `/`
- Sections : Hero (mission + 2 CTA), 4 piliers (Réseau / Infrastructure / Programmes / Marché), Culture Connect comme initiative, Infrastructure culturelle, Territoire, CTA final, Footer institutionnel
- Ancien `LandingPage` (CC2026) conservé accessible via `/legacy-cc2026`
- `Header.jsx` : nouvelle nav Kiltikonet-first (Accueil, Culture Connect, Infrastructure, Gouvernance, Partenaires, Rejoindre, Contact)
- `ROUTE_TITLES` refait — tous titres suffixés par `— Kiltikonet`

### Phase 4 — Culture Connect + éditions + pages annexes
- `/culture-connect` (mother page) : `CultureConnect.jsx` — liste des éditions, storytelling continuité
- `/culture-connect/2026` : `CultureConnect2026.jsx` — bilan (métriques placeholder, programme, continuité vers 2027)
- `/culture-connect/2027` : `CultureConnect2027.jsx` — édition à venir, CTA "être informé"
- `/infrastructure` : `Infrastructure.jsx` — 4 capacités (Identité, Données, Connexion, Souveraineté) sans divulgation IP
- `/rejoindre` : `Rejoindre.jsx` — 4 profils d'adhésion
- `/contact` : `ContactKiltikonet.jsx` — email, adresse, Instagram, LinkedIn

### Non-régression (testing agent iteration 92)
- **100% backend + 100% frontend PASS**
- 17 critères validés : nouvelles routes, header nav, `/api/health` minimal, `/api/admin/health-detailed` 403, sitemap kiltikonet.fr sans UUIDs, robots.txt avec 3 Disallow, hCaptcha OK, POST /api/badges/inscrire OK (badge CC26-VIS-PO705 créé), gouvernance stats OK
- Fichier rapport : `/app/test_reports/iteration_92.json`
- Bypass IntroSequence pour tests : `?skip_intro=1` OU `localStorage.setItem('kk_visited','true')`

## Observatory — Phase 0 (Discovery) + P0 Fix ✅ (13/08/2026)

Mission observability layer / Founder Observatory (validation utilisateur : a1 b3 c2 d2 e1 f3 g2 + 10 principes stricts). Site public = fenêtre, Observatory = source d'observation.

### SYSTEM DISCOVERY REPORT
Rapport complet dans `/app/memory/SYSTEM_DISCOVERY_REPORT.md`.
Kiltikonet est déjà en Level 1-2 observability : SmartAnalytics.js + useAnalytics hook globaux, 25 collections MongoDB dont 445 workspace_logs, 45 registrations, 8 scan_events, 2544 events historiques.

### 🔴 P0 — Duplicate `/api/analytics/batch` résolu (perte silencieuse d'events)
- **Cause racine** : la route `POST /api/analytics/batch` était déclarée deux fois — `server.py` (rich schema + notifications + anomaly detection) ET `site_analytics.py` (light schema → `site_events`). L'ordre d'enregistrement FastAPI faisait gagner le light handler ; le rich handler n'avait jamais été appelé en preview.
- **Fix appliqué** :
  1. `routes/site_analytics.py` entièrement réécrit : plus que 2 endpoints lecture-seule (`GET /site-stats`, `GET /health`) lisant dans `analytics_events` canonique
  2. `server.py` — `AnalyticsEvent` modèle Pydantic renforcé (populate_by_name)
  3. Nouveau endpoint tolérant `POST /api/analytics/track` (accepte camelCase ET snake_case aliases) dans server.py, unique source de vérité
  4. Nettoyage du stale duplicate `POST /api/analytics/track` L10472
- **Migration non-destructive** : script one-shot idempotent `/app/backend/migrate_site_events.py` a copié **2544 legacy `site_events` → `analytics_events`** avec tags `_source_legacy="site_events"`, `_pre_refonte=True`, `_legacy_id` (pour idempotence). La collection `site_events` reste **intacte à 2544 docs** comme archive immuable.
- **Validation testing_agent** (`/app/test_reports/bug_verification_93.json`, `iteration_93.json`) : verdict **FIXED**, 100% backend, tous les tests passent (canonical response `{success:true,count:1}`, rich schema écrit dans analytics_events, snake_case et camelCase tous 2 acceptés, health endpoint OK, migration idempotente, site_events préservée, non-régression badges/gouvernance OK).

### État actuel `analytics_events`
- 2544 docs legacy (`_pre_refonte=True`)
- +6 nouveaux docs (tests P0 + verifications)
- Total : ~2550 events canoniques
- Schéma unique : `{id, event_type, session_id, user_id, timestamp, data, ip, user_agent, created_at, [_source_legacy, _pre_refonte, _legacy_id]}`

### Prochaines phases (validées par user)
1. ✅ P0 event integrity — DONE
2. ✅ Normalisation — DONE (visitor_id client-provided, session_id, UTM/referrer_host parsés, device.type+os, geo via CF-IPCountry, consent_level, ip conditional, ip_hash sha256)
3. ✅ Reconstruction historique — DONE (7 endpoints /api/observatory/* lisant workspace_logs + registrations + scan_events + analytics_events)
4. ✅ Observatory skeleton — DONE (`/observatory`, palette dark documentaire, 8 sections numérotées 01-08, data lineage visible, timeline pré-refonte réelle 2544 events)
5. ⏳ Sessions/funnels/referrer/UTM/signals — À faire (moteur signals + funnels configurables)
6. ⏳ Visualisations documentaires enrichies
7. ⏳ Exposition publique agrégée (fenêtre kiltikonet.fr)

## Observatory — Phase 1 (Normalisation + Skeleton) ✅ (13/08/2026)

Le Founder Observatory est né. Testing agent verdict `iteration_94.json` : **100% frontend + 92% backend** (les 2 issues mineures corrigées : parse_device iOS→macOS fix + info 15 badge types pre-existing).

### Backend nouveau
- `/app/backend/services/analytics_normalize.py` — service de normalisation privacy-first : `parse_device` (UA → type + OS, iOS avant macOS), `parse_referrer` (host only, 'internal' pour kiltikonet/emergent), `parse_utm` (nested dict OR from data.url), `hash_ip` (sha256:16), `normalize_event` (canonical doc avec consent_level + ip conditional).
- `/app/backend/routes/observatory.py` — 7 endpoints publics read-only avec data lineage explicite :
  - `GET /api/observatory/access` — check role founder (public)
  - `GET /api/observatory/memory` — 6 métriques mémoire numérique
  - `GET /api/observatory/timeline?days=` — reconstruction historique daily bins (4 sources)
  - `GET /api/observatory/event-types?days=` — distribution event_type
  - `GET /api/observatory/territories` — countries depuis registrations
  - `GET /api/observatory/actors?limit=` — top organizations (opt-in show_in_catalog)
  - `GET /api/observatory/sessions?days=` — unique sessions/visitors + top pages + top referrers
- `POST /api/analytics/batch` et `/api/analytics/track` branchés sur `normalize_event`
- `FOUNDER_EMAILS` env var configurée (cultureconnectorg@gmail.com, cc@kiltikonet.fr, laurent@kiltikonet.fr) — rôle founder distinct de admin, PAS de mot de passe hardcodé
- Dependency `require_founder` prête pour les endpoints d'écriture futurs

### Frontend nouveau
- `/app/frontend/src/components/Observatory.jsx` — composant skeleton documentaire :
  - Palette dark `#0B0906` (bg), `#EAE4D5` (texte), `#C9A84C` (accent gold), aucune card arrondie, aucun gradient
  - Typo `Newsreader` serif italic pour H1 monumental, `Manrope` sans-serif corps, `monospace` pour labels/data lineage
  - 8 sections numérotées : 01 Digital Memory, 02 Timeline, 03 Event Types, 04 Territories, 05 Sessions, 06 Sources, 07 Signals (Phase 5), 08 System Health
  - Chaque métrique affiche `src · db.xxx` en-dessous (data lineage transparent)
  - Sparkline SVG des 60 derniers jours (données réelles)
  - Route `/observatory` (headerless, titre 'Observatory · Kiltikonet')
  - Message "not yet configured" quand la source manque, JAMAIS de fake data

### Screenshot confirmé
- H1 "Kiltikonet Observatory" (serif italic)
- Metric events: **2 592** (legacy 2544 · new 48)
- Metric workspace: **16**
- Metric registrations: **9**
- Metric scans/orgs/territories: **0** (comportement voulu — les champs n'existent pas dans le schéma preview)
- Bandeau doc "KILTIKONET / OBSERVATORY · OBSERVATION LAYER · FOUNDER · 2026-08-13"
- Aucune ressemblance avec un dashboard SaaS

### Principes respectés
- ✅ Ne rien écraser (site_events 2544 intact, analytics_events préservée)
- ✅ Source of truth visible sur chaque métrique
- ✅ Aucune donnée fabriquée — 0 quand la source est vide
- ✅ Consent-aware (`consent_level` dans normalized event, ip stockée uniquement si 'full')
- ✅ Pas de fingerprint agressif (visitor_id client-provided depuis localStorage)
- ✅ Rôle founder séparé, email-based, sans mot de passe hardcodé

## Credentials
- Admin: cultureconnectorg@gmail.com / code 000000

