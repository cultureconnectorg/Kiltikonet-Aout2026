# KILTIKONET — SYSTEM DISCOVERY REPORT
_Phase 0 — Cartographie du système avant instrumentation observability_
_Date : 13 août 2026_

---

## 0. TL;DR

Le socle observability de Kiltikonet **existe déjà partiellement** (Level 1-2 sur les 7 niveaux visés). Il y a :
- ✅ un service client `SmartAnalytics.js` (batch queue, 30s flush) branché globalement via `useAnalytics()` dans `App.js`
- ✅ des endpoints d'ingestion (`POST /api/analytics/batch`, `POST /api/analytics/track`)
- ✅ 2 dashboards partiels (admin `PerformanceDashboard.jsx`, public-ish `SiteAnalyticsDashboard.jsx`)
- ✅ 25 collections MongoDB dont plusieurs riches en historique métier (`workspace_logs=445`, `registrations=45`, `scan_events=8`, etc.)
- ✅ consent management (`CookieBanner.jsx`) et hashage IP côté serveur

Ce qui manque pour atteindre Level 3-7 :
- ❌ pas de collection `sessions` reconstruite (les events sont là mais jamais agrégés en parcours)
- ❌ pas de source intelligence (UTM/referrer parsés mais pas exposés)
- ❌ pas de funnel engine configurable
- ❌ pas de signal/anomaly detection
- ❌ pas de command center unifié
- ❌ **duplication critique** : `/api/analytics/batch` existe dans 2 fichiers → conflit potentiel

---

## 1. ARCHITECTURE ACTUELLE

### Stack
| Couche | Technologie | Statut |
|---|---|---|
| Frontend | React 19 SPA, Craco, TailwindCSS 3 | ✅ |
| Backend | FastAPI (Python), Uvicorn via Supervisor | ✅ |
| DB | MongoDB (Motor async) | ✅ |
| Auth | Emergent Google OAuth + JWT session cookies + WebAuthn | ✅ |
| Emails | Brevo SMTP + AWS SES + Resend | ✅ |
| Files | Cloudinary | ✅ |
| Paiements | Stripe (test key envelope) | ✅ |
| LLM | Emergent Universal Key (Claude Sonnet 4.5, Gemini Nano Banana) | ✅ |
| Signature | Yousign | ✅ |
| Captcha | hCaptcha (fix CSP appliqué) | ✅ |
| CDN/Proxy | Cloudflare | ⚠️ workers à vérifier manuellement |

### Routes backend (`/app/backend/routes/`)
34 routers modulaires, dont ceux liés à l'observability :
- `analytics.py` — dashboard Jetons overview (business analytics)
- `site_analytics.py` — tracking événements web (site_events)
- `cultural_search.py` — expose un `analytics_router` supplémentaire
- `omega.py` — routes espace pro (2600 lignes, à refacto plus tard)
- `admin_cc2026.py`, `gouvernance.py`, `frek_silent.py`, etc.

### Frontend — hooks/services observability
| Fichier | Rôle | Statut |
|---|---|---|
| `services/SmartAnalytics.js` | Classe singleton, queue de 30s, tracks : intro sections, page views, admin actions, scroll depth, page_exit | ✅ actif |
| `hooks/useAnalytics.js` | Wrapper React initialisant SmartAnalytics ; monté dans `App.js` L200 | ✅ actif |
| `lib/smartTracker.js` | 2ᵉ tracker (potentiellement duplicate) | ⚠️ à unifier |
| `components/legal/CookieBanner.jsx` | Consent management RGPD (analytics/marketing) | ✅ actif |
| `components/SiteAnalyticsDashboard.jsx` | Consomme `/api/analytics/site` (route inexistante côté back — retourne `{"detail":"str"}` = 404) | 🔴 cassé |
| `components/admin/PerformanceDashboard.jsx` | Admin dashboard consommant `/api/analytics/dashboard` | ✅ actif |

---

## 2. DONNÉES DÉJÀ COLLECTÉES — INVENTAIRE COMPLET DB

**25 collections trouvées** (MongoDB, DB `test_database` en preview). Extraits triés par volume :

| Collection | Docs | Nature | Publiable ? | PII ? |
|---|--:|---|---|---|
| `workspace_logs` | **445** | Actions admin/pro (login, création, modif) — schéma `{action, user, role, details, session_start, timestamp}` | Agrégé oui, brut non | ⚠️ user IDs |
| `registrations` | 45 | **Inscriptions CC2026** — schéma `{full_name, email, organization_name, country, profile_type, tier, expertise_tags, show_in_catalog, ...}` | Agrégé oui (# / pays / tier) ; individuel oui si `show_in_catalog=true` | ⚠️ email, phone |
| `smart_profiles` | 44 | Profils enrichis Espace Pro | Agrégé oui | ⚠️ |
| `chat_messages` | 23 | Chat AI (CVL Brain / Laurent.ia) | Non | ⚠️ contenu |
| `analytics_events` | 15 | Events client (schéma `{id, event_type, session_id, user_id, data, timestamp}`) — **CIBLE PRINCIPALE** | Agrégé oui | ✅ pseudonymisé |
| `users` | 11 | Comptes Espace Pro | Non | ⚠️ email |
| `cms_partner_banners` | 10 | Bannières partenaires CMS | Oui | ✅ |
| `pro_access_logs` | 10 | Logs accès pro `{email, profile_id, action, timestamp}` | Agrégé oui | ⚠️ email |
| `cms_content` | 8 | Contenu éditorial CMS | Oui | ✅ |
| `payment_transactions` | 8 | Transactions Stripe | Non individuel ; agrégé oui | ⚠️ |
| `pro_opportunities` | 8 | Opportunités espace pro | Oui | ✅ |
| `scan_events` | 8 | **Scans de badges CC2026** — schéma `{registration_id, validator_id, type, location, timestamp}` | Agrégé oui (# scans, top lieux) | ⚠️ registration_id |
| `email_logs` | 7 | Logs envois emails | Agrégé oui | ⚠️ dest |
| `pro_events` | 7 | Événements espace pro | Oui | ✅ |
| `contacts_alirio` | 4 | Contacts formulaire | Non | ⚠️ email |
| `notifications` | 4 | Notifs internes | Non | ⚠️ |
| `pro_profiles` | 2 | Profils pro | Agrégé oui | ⚠️ |
| `team_notifications` | 2 | Notifs équipe | Non | ⚠️ |
| `cc2026_tasks_status` | 1 | État tâches | Interne | ✅ |
| `cms_media`, `cms_speakers`, `tickets` | 1 chacun | CMS | Oui | ✅ |

**Total volumétrique observability actuel : très faible (15 events)** — la préview a été fraîchement instrumentée. La prod a probablement plus. À confirmer via déploiement + monitoring.

### Collections MANQUANTES (à créer pour Level 3+)
- `sessions` — sessions reconstruites (visitor_id, start, end, page_count, events_count, referrer_src)
- `visitors` — visiteurs pseudonymisés (device fingerprint hash + première/dernière visite)
- `funnels` — définitions de funnels configurables par le fondateur
- `signals` — anomalies détectées (traffic spike, error spike, conversion drop)
- `content_metrics` — score agrégé par contenu (article/page)
- `audit_runs`, `audit_findings` — historique des audits automatiques
- `campaigns` — attribution UTM/campagne
- `system_health_snapshots` — métriques système horodatées

---

## 3. TRACKING EXISTANT — DÉTAIL

### Ce qui est tracké côté client (`SmartAnalytics.js`)
- `page_view` (path, title, referrer, deviceInfo)
- `page_exit` (page, timeSpent, scrollDepth)
- `intro_section_click`, `intro_complete`
- `admin_action`, `workspace_activity`
- Scroll depth (`initScrollTracking`)
- Batch flush toutes les 30s → `POST /api/analytics/batch`
- Flush final via `beforeunload`

### Ce qui N'est PAS tracké
- ❌ session_start / session_end explicite
- ❌ UTM parameters
- ❌ Referrer parsé (uniquement stocké brut)
- ❌ external_link_click
- ❌ form_start / form_submit / form_error
- ❌ search / filter_used
- ❌ video/audio events
- ❌ frontend_error (JS runtime errors)
- ❌ backend_error (5xx captures)
- ❌ api_error (fetch failed)
- ❌ conversions explicites (signup, contact, registration, ticket_click)

### 🔴 Conflit de route à résoudre AVANT toute nouvelle instrumentation
**2 endpoints `POST /api/analytics/batch` déclarés** :
1. `server.py:9443` → écrit dans `analytics_events` (schéma riche)
2. `site_analytics.py:51` → écrit dans `site_events` (schéma léger `{event, page, ip_hash, device}`)

FastAPI garde la dernière déclarée. Actuellement `site_analytics.py` est inclus **après** dans `server.py` (L4218), donc la version site_events écrase la version analytics_events → **une partie des events est probablement perdue** (ceux avec `event_type`, `data.deviceInfo`, etc. sont normalisés en schéma allégé).

À corriger dès Phase 1.

---

## 4. PROBLÈMES DE SÉCURITÉ / PRIVACY / TECHNIQUES DÉJÀ CONNUS

| Point | Statut préview | Statut prod (audit externe 13/08) | Action requise |
|---|---|---|---|
| CORS wildcard | ✅ strict via env `CORS_ORIGINS` | ❌ `*` en prod | Redéployer preview |
| `/api/health` minimal | ✅ `{"status":"ok"}` | ⚠️ | Redéployer |
| `robots.txt` bavard | ✅ nettoyé | ❌ | Redéployer |
| OAuth cleanup URL | ✅ `history.replaceState` posé | ❌ | Redéployer |
| `debug-monitor.js` prod | ✅ iframe-only | ❌ chargé partout | Contacter support Emergent |
| CSP hCaptcha | ✅ | ⚠️ dépend du redéploiement | Redéployer |
| Consent RGPD | ✅ CookieBanner | ✅ | OK |
| Hashage IP | ✅ ip_hash | ✅ | OK |
| PII dans events | ⚠️ `data` dict libre — risque | ⚠️ | Whitelist stricte |
| SSR / prerender | ❌ SPA pure | ❌ | Roadmap ultérieure |

---

## 5. HISTORIQUE MÉTIER PRÉSENT DANS LA DB

Ces données existent déjà et alimenteront des vues observability crédibles **sans avoir à re-tracker** :

- **45 inscriptions Culture Connect 2026** — schéma clair (nom, orga, pays, tier, tags d'expertise). Permet immédiatement :
  - carte territoriale (par pays)
  - répartition tiers (bronze/silver/gold)
  - top expertise tags
  - taux `show_in_catalog=true`
- **8 scans de badges** — schéma `{registration_id, validator_id, type, location, timestamp}` — permet :
  - timeline des scans
  - top lieux
  - # scans / participant unique
- **445 workspace_logs** — actions internes datées :
  - timeline d'activité admin/pro (semaine, jour)
  - top actions
- **10 pro_access_logs** — connexions Espace Pro
- **8 payment_transactions** — historique Stripe
- **44 smart_profiles** — profils enrichis

**Aucune donnée à re-collecter** pour construire des visualisations de la "vie du réseau". Le matériel est là.

---

## 6. TAXONOMIE D'ÉVÉNEMENTS PROPOSÉE (Phase 1)

Version normalisée à imposer, remplaçant les 2 schémas actuels :

```json
{
  "event_id": "uuid",
  "event_type": "page_view|content_view|button_click|form_submit|conversion|frontend_error|...",
  "timestamp": "2026-08-13T14:32:08.123Z",
  "session_id": "sess_...",
  "visitor_id": "vis_...",           // pseudonymisé, hash device+ua+ip
  "user_id": "usr_..."|null,
  "page": "/culture-connect/2026",
  "referrer_host": "instagram.com"|null,
  "utm": { "source": "ig", "campaign": "cc2026-relance" }|null,
  "device": { "type": "mobile", "os": "iOS", "screen": "390x844" },
  "geo": { "country_iso": "FR" }|null,
  "metadata": { ... }                  // whitelist stricte selon event_type
}
```

Collection cible : `analytics_events` (existante, richer schema conservé).
Collection déprécier : `site_events` (créée par le duplicate, redirigée vers `analytics_events`).

---

## 7. PLAN D'IMPLÉMENTATION PROPOSÉ (à valider avant toute écriture)

### PHASE 1 — Fondation event architecture (2-3 heures dev)
1. **Résoudre le conflit** `POST /api/analytics/batch` (un seul endpoint canonique dans `site_analytics.py` réécrit pour utiliser `analytics_events`).
2. **Ajouter `visitor_id`** (device fingerprint hash) côté client.
3. **Ajouter `session_start` / `session_end`** explicites (heartbeat 30s + timeout 30min).
4. **Parser UTM + referrer_host** côté serveur.
5. **Whitelist stricte du `metadata`** par `event_type` (validation Pydantic).
6. **Endpoint `GET /api/analytics/health`** exposant le taux d'ingestion, erreurs, dernière event.
7. Tests unitaires (pytest) + smoke test end-to-end.

### PHASE 2 — Session reconstruction (2 heures)
1. Collection `sessions` remplie par job périodique (`db.command('aggregate')` toutes les 5 min).
2. Endpoint `GET /api/analytics/sessions?days=7&limit=100` (agrégat pseudonymisé).
3. Endpoint `GET /api/analytics/sessions/{session_id}` (détail parcours anonyme).

### PHASE 3 — Content & source intelligence (3 heures)
1. `content_metrics` : agrégation par page (views, uniq visitors, avg time, scroll median).
2. `GET /api/analytics/content` — top contenus.
3. `GET /api/analytics/sources` — attribution UTM + referrer.
4. Content Signal Score (formule pondérée simple, marqué "expérimental").

### PHASE 4 — Command Center (4-5 heures)
1. Nouvelle route `/command` (composant `CommandCenter.jsx`) — protégée admin/founder.
2. 8 sections : NOW, PEOPLE, CONTENT, SOURCES, JOURNEYS, CONVERSIONS, SIGNALS, HISTORY, SYSTEM HEALTH.
3. Design "observatoire numérique contemporain" (typographie éditoriale, densité informationnelle, pas de gradient).
4. Consommation des endpoints de Phase 1-3.

### PHASE 5 — Timeline + signals (3 heures)
1. Collection `signals` + moteur détection statistique simple (z-score sur volume horaire).
2. Timeline unifiée (publications, événements, pics, incidents).
3. Endpoint `GET /api/analytics/signals`, `GET /api/analytics/timeline`.

### PHASE 6 — Automated audit (3 heures)
1. Bouton `RUN SYSTEM AUDIT` dans Command Center.
2. Batteries : SEO, performance, sécurité, tracking coverage, contenu, conversion.
3. Rapport stocké dans `audit_runs` / `audit_findings`.
4. Chaque finding a : preuve, impact, recommandation, priorité.

### PHASE 7 — Natural language layer (4-6 heures)
1. Endpoint `POST /api/analytics/ask` → prompt Claude Sonnet 4.5 (Emergent LLM Key) avec les métriques comme contexte.
2. Réponses estampillées **FACT / CORRELATION / HYPOTHESIS / UNKNOWN** avec confidence score.
3. Chaque réponse doit citer la période, l'endpoint et la collection source (data lineage).

### PHASE 8 — Security & System Health (2 heures)
1. `/command/security` — audit endpoints exposés, dernières erreurs 5xx, rate-limit hits, tentatives auth anormales.
2. `system_health_snapshots` collecté toutes les 5 min (background task).

---

## 8. RISQUES / POINTS À CLARIFIER AVANT PHASE 1

1. **`test_database` vs prod DB** — le compte docs est celui de la preview. La prod (`kiltikonet.fr` → `cinematic-globe.emergent.host`) a une DB séparée que je ne vois pas d'ici. La logique construite doit fonctionner indifféremment ; volumes réels prod inconnus.
2. **`site_events` vs `analytics_events`** — si de la production a écrit dans les 2 collections, il faut décider d'un merge OU d'accepter une perte.
3. **Retention policy** — pas de TTL sur les collections events. À définir (ex : 24 mois brut / agrégats permanents).
4. **Consent** — `CookieBanner` gère bien opt-in/out mais on doit vérifier que le tracker respecte la décision (audit à faire en Phase 1).
5. **Command Center — accès** — restreint à `role in ('admin','founder')` ? Ajout d'un rôle `founder` distinct ?
6. **Live view coût** — polling toutes les 3-5s vs. WebSocket vs. SSE. Recommandation : SSE (déjà utilisé pour Laurent.ia stream).
7. **Historique legacy** — les 15 events actuels sont-ils tous exploitables (schéma consistent) ? Faut-il un script de normalisation ?

---

## 9. LIVRABLE ATTENDU DE TON CÔTÉ AVANT PHASE 1

Merci de valider (ou d'ajuster) :

- (a) **Périmètre Phase 1** — commencer par la fondation event architecture + résolution du duplicate route, OU aller plus vite vers Command Center ?
- (b) **Nom du dashboard** — `/command`, `/command-center`, `/pulse`, `/observatory` ?
- (c) **Rôle d'accès** — restreint à `admin`, ou nouveau rôle `founder` distinct ?
- (d) **Retention** — 12 / 24 / 36 mois pour les events bruts ?
- (e) **Live view** — SSE (recommandé) ou polling ?
- (f) **Historique** — normaliser les 15 events legacy ou repartir propre ?
- (g) **Ordre des phases** — l'ordre proposé (1→8) te convient ou tu veux prioriser certaines ?

Une fois validé, je démarre uniquement la Phase 1 (rien avant, rien de plus).
