# 📘 Kiltikonet — Rapport Technique pour Développeur (Espace Pro)

> **Pour ton dev** : ce document décrit l'architecture, le stockage des données, les API existantes et les conventions à respecter pour travailler sur l'Espace Pro (Omega). Lis-le **avant** toute modification.

---

## 1. Vue d'ensemble

Kiltikonet est une plateforme full-stack composée de :

| Couche | Stack | Rôle |
|---|---|---|
| **Frontend** | React 19 + Tailwind + Shadcn UI | SPA (3000) — site public, espace Pro Omega |
| **Backend** | FastAPI (Python 3.11) | API REST (8001), préfixe `/api` obligatoire |
| **Base de données** | MongoDB (Motor async) | 78 collections, ~3 000 docs |
| **Stockage fichiers** | Cloudinary + AWS S3 (Object Storage) | Médias, avatars, exports PDF |
| **Reverse proxy** | Kubernetes Ingress (Emergent) | `/api/*` → backend, `/*` → frontend |

URL preview : `https://tarifs-update.preview.emergentagent.com`
URL backend interne : `http://0.0.0.0:8001` (ne **jamais** appeler depuis le frontend, utiliser `process.env.REACT_APP_BACKEND_URL`)

---

## 2. Où sont stockées les données ?

### 2.1 Base MongoDB principale

- **Hôte** : MongoDB hébergé (cluster Emergent), accès via `MONGO_URL` (env)
- **Database** : `culture_connect_2026`
- **Driver** : Motor (async) côté backend
- **Total actuel** : 78 collections

#### Collections critiques (Espace Pro)

| Collection | Docs | Rôle |
|---|---|---|
| `pro_profiles` | 6 | Profils Pro (badge, niveau d'adhésion, paramètres) |
| `pro_posts` | 33 | Posts Feed Pro (Instagram/Reels) |
| `pro_connections` | 16 | Réseau de connexions (followers/abonnements pro) |
| `pro_messages` | 0 | Messagerie privée Pro (DM) |
| `pro_opportunities` | 0 | Opportunités / annonces / appels à projets |
| `pro_access_logs` | 392 | Logs d'accès Pro (auth, scans NFC) |
| `cultural_cards` | 18 | Cartes culturelles (œuvres déclarées) |
| `cultural_identities` (legacy) | — | Identités culturelles archivées |
| `builder_projects` | 21 | Projets du Builder (sites/landings créés par les pros) |
| `wallet` (`kn_wallets`) | 12 | Portefeuilles JCC/jetons internes |
| `kn_checkout_sessions` | 14 | Sessions Stripe en cours |
| `payment_transactions` | 40 | Transactions terminées |
| `accreditations_cc2026` | 2 | Accréditations événementielles |
| `cc_badges` | 6 | Badges physiques NFC liés au compte |
| `frek_certifications` | 1 | Certifications FREK-ID |
| `terminal_deploys` | 5 | Historique des déploiements Terminal IA |
| `brain_memory` / `brain_training_data` | 12 | Sessions et data Terminal IA |
| `membre_gouvernance` | 2 | Gouvernance (candidatures, signatures Yousign) |

#### Collections publiques (consommées par l'Espace Pro)

| Collection | Docs | Rôle |
|---|---|---|
| `cc_events` / `cultural_events` | 19 | Événements de l'agenda |
| `feed_posts` | 0 | Feed grand public |
| `shop_products` | 19 | Boutique (Stripe Connect) |
| `support_tickets` / `faqs` | 7 | Support client |
| `analytics_events` / `site_events` / `site_visits` | 1 770+ | Tracking (smartTracker.js) |
| `notifications` / `team_notifications` | 1 | Notifications in-app |

#### Indexes
Les indexes sont créés au démarrage du backend (`server.py` → fonctions `create_*_indexes`). Ne **jamais** modifier les indexes en runtime — les ajouter dans la fonction d'init de la route concernée.

### 2.2 Stockage de fichiers

#### Cloudinary (images, vidéos)
- **Variables env** : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Utilisé pour** : avatars Pro, photos de posts, médias Builder, flyers événements
- **Wrapper** : `services/object_storage.py` (centralisé, ne pas dupliquer)
- **Convention** : tous les uploads passent par `/api/upload/*` côté backend, jamais en direct depuis le frontend

#### AWS S3 / Object Storage (PDFs, exports, archives)
- **Variables env** : `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Utilisé pour** : exports PDF (badges, charte), archives utilisateurs (`uploaded_files`)
- **Buckets** : voir `services/object_storage.py` (1 bucket par environnement)

### 2.3 Sessions et secrets

- **Sessions HTTP** : JWT signés avec `SESSION_SECRET` (env), stockés en cookie httpOnly
- **Sessions Pro** : `sessionStorage.cc2026_pro_session` côté navigateur (front) — contient `frek_id`, `name`, `level`
- **WebAuthn / Touch-ID** : `webauthn_credentials` (MongoDB) — clés publiques FIDO2
- **Magic links** : `magic_links` (MongoDB) — TTL 15 min

### 2.4 Services externes (où vont les données)

| Service | Usage | Données stockées |
|---|---|---|
| **Stripe** | Paiements (cartes, Stripe Connect) | Transactions, customers, payment intents |
| **Yousign** (sandbox) | Signature électronique chartes | PDFs signés, audit trail |
| **Resend** | Emails transactionnels | Logs envois (28 derniers jours) |
| **Brevo SMTP** | Emails marketing/notifications massives | Listes contacts |
| **AWS SES** | Emails fallback (production-request) | Logs SES |
| **Baserow** | Tableurs/CRM côté admin | `BASEROW_TOKEN`, `BASEROW_URL` |
| **hCaptcha** | Anti-bot formulaires publics | — |
| **Cloudinary** | Médias | Voir 2.2 |
| **Anthropic Claude** | Terminal IA, BrainChat | Pas de stockage — appels via `EMERGENT_LLM_KEY` |
| **FREK API** | Vérification d'identifiants culturels | Externes — voir `services/frek_client.py` |
| **VAPID Push** | Notifications push web | `push_subscriptions` |

> ⚠️ **RGPD** : si ton dev modifie quoi que ce soit qui touche aux données personnelles, vérifier que la suppression cascade bien dans toutes les collections (voir `routes/omega.py` → `DELETE /api/user/account`).

---

## 3. Architecture Espace Pro (Omega)

### 3.1 Frontend

#### Entrées
- `/pro` → `ProSplashWrapper` → splash vidéo → check auth → `ProApp`
- `/espace-pro/connexion` → `ProSpaceLogin` (login FREK-ID + password ou Touch-ID)

#### Composants principaux
```
/app/frontend/src/components/
├── omega/                          # Espace Pro principal
│   ├── ProApp.jsx                  # Container principal + OrbitalMenu
│   ├── OrbitalMenu.jsx             # Menu radial (logo central + 8 vues)
│   ├── SplashScreen.jsx            # Splash vidéo
│   ├── ProTutorial.jsx             # Onboarding première connexion
│   ├── CockpitView.jsx             # Dashboard
│   ├── FeedView.jsx                # Feed Reels/posts
│   ├── AgendaView.jsx              # Agenda événements
│   ├── ShopView.jsx                # Boutique
│   ├── WalletView.jsx              # Portefeuille JCC/jetons
│   ├── InboxView.jsx               # Messages
│   ├── BuilderView.jsx             # Builder de sites/landings
│   ├── BrainChat.jsx               # Terminal IA (Claude Sonnet 4.5)
│   ├── ScanApp.jsx                 # Scan NFC badges
│   ├── AccreditationView.jsx       # Demande accréditation
│   ├── SovereignProfileView.jsx    # Profil membre / triptyque
│   └── AdminHealthPanel.jsx        # Health (admin)
│
├── pro/                            # Composants Pro réutilisables
│   ├── CulturalFeed.jsx            # Feed culturel
│   ├── ReelsFeed.jsx               # Reels (vidéos verticales)
│   ├── LinkedInFeed.jsx            # Feed LinkedIn-style
│   ├── MessagesPage.jsx            # DM
│   ├── NetworkPage.jsx             # Réseau / connexions
│   ├── ShopPage.jsx                # Boutique standalone
│   ├── WalletPage.jsx              # Wallet standalone
│   ├── VitrinePage.jsx             # Vitrine publique d'un pro
│   ├── ProfileTriptych.jsx         # Triptyque profil (3 cartes)
│   ├── ConstellationRadar.jsx      # Visualisation réseau
│   ├── CulturalCards.jsx           # Cartes culturelles
│   ├── CreateCulturalCard.jsx      # Création carte
│   ├── ImmersiveInbox.jsx          # Inbox immersive
│   ├── ArchivesCloud.jsx           # Archives utilisateur (RGPD)
│   ├── TradingSettings.jsx         # Paramètres trading jetons
│   ├── GrowthWidgets.jsx           # KPI growth
│   ├── SoutenirSheet.jsx           # Sheet "soutenir"
│   ├── StudiosSidebar.jsx          # Sidebar studios
│   ├── SovereignSections.jsx       # Sections du profil souverain
│   ├── CulturalIdentityBar.jsx     # Barre d'identité culturelle
│   ├── CulturalReactions.jsx       # Réactions sur posts
│   ├── TerminalIA.jsx              # Terminal IA (variante)
│   └── MobileNavigation.jsx        # Nav mobile bottom
```

#### Convention de routage
Toutes les routes Pro passent par `<ProProtectedRoute>` qui :
1. Vérifie `sessionStorage.cc2026_pro_session`
2. Sinon → affiche `<ProSpaceLogin />` inline (pas de redirect)

### 3.2 Backend Espace Pro

#### Routes principales
```
/app/backend/routes/
├── omega.py                # Le gros fichier Pro (~2400 lignes) — feed, messages, planning, gouvernance proposals, accréditations, wallet, builder, frek
├── pro_feed.py             # Feed Pro spécifique
├── pro_social.py           # Recommandations sociales
├── ghost_profiles.py       # Profils ghost (anciens pros pré-migration)
├── ghost_engine.py         # Moteur de matching ghost
├── jetons.py               # Jetons / monnaie interne
├── wallet.py               # Wallet API
├── badges.py               # Badges physiques NFC
├── candidatures.py         # Candidatures CC2026
├── doctrine.py             # Permissions / RBAC ("doctrine")
├── analytics.py            # KPIs et reporting
├── site_analytics.py       # Tracking visiteurs (smartTracker)
├── support.py              # FAQ + tickets
├── push_notifications.py   # VAPID push
├── webauthn.py             # FIDO2 / Touch-ID
├── recommendations.py      # Algorithme recommandations
├── ai_agents.py            # Agents IA Claude
├── brain.py                # Terminal IA
├── smart_engine.py         # Moteur d'alertes intelligentes
├── shop_payments.py        # Stripe Connect boutique
├── fintech.py              # Routes shop dépréciées (à migrer)
├── ses.py                  # AWS SES (production-request)
├── cultural_identity.py    # Identités culturelles
├── cultural_search.py      # Recherche / analytics culturels
├── terrain.py              # Gestion terrain événementiel
├── gouvernance.py          # Module Gouvernance (candidatures + Yousign)
├── admin_cc2026.py         # Routes admin
├── shared.py               # Endpoints partagés (FAQs, contact)
└── skeleton_omega.py       # Squelette routes Omega legacy
```

#### Endpoints Pro les plus utilisés (extrait)
```
POST  /api/auth/pro-login                      # Login FREK-ID
POST  /api/auth/webauthn/register              # Touch-ID enrol
GET   /api/feed/posts                          # Feed Pro
POST  /api/feed/posts                          # Créer post
POST  /api/feed/posts/:id/eclair                # Like ("éclair")
POST  /api/feed/posts/:id/commentaire           # Commentaire
GET   /api/messages/conversations              # DM list
POST  /api/messages/send                       # Envoyer DM
GET   /api/builder/projects                    # Projets Builder
POST  /api/builder/projects                    # Créer projet
PUT   /api/builder/projects/:id                 # Mettre à jour
POST  /api/builder/publish                     # Publier projet
GET   /api/builder/analytics                   # Stats Builder
GET   /api/adhesion/levels                     # Niveaux adhésion
POST  /api/adhesion/subscribe                  # Souscrire (Stripe)
POST  /api/jetons/remboursement                # Demander rembourst
POST  /api/wallet/transfer                     # Transfert JCC
POST  /api/wallet/swap                         # Swap jetons↔€
GET   /api/planning/cc2026                     # Planning événements
GET   /api/badges/lifecycle/:badge_id          # État badge NFC
POST  /api/frek/nfc/tap                        # Tap NFC
POST  /api/accreditation/apply                 # Demande accréditation
POST  /api/accreditation/pay/:id               # Stripe accréditation
POST  /api/terminal/deploy                     # Déploiement Terminal IA
POST  /api/brain/chat-enriched                 # Chat IA (Claude Sonnet 4.5)
POST  /api/brain/web-search                    # Recherche web via IA
GET   /api/brain/memory/history                # Historique sessions IA
GET   /api/user/settings                       # Préférences user
PUT   /api/user/settings                       # Maj préférences
DELETE /api/user/account                       # Suppression RGPD
```

#### RBAC (Doctrine)
- Module `routes/doctrine.py` — gère 5 rôles : `creator`, `distributor`, `institutional`, `professional`, `consumer`
- Decorator : `dependencies=[Depends(require_permission("publish_content"))]`
- Permissions stockées en cache mémoire au démarrage (`doctrine_permissions` collection)
- **Modifier les permissions** : éditer `doctrine_permissions` directement en DB ou via les endpoints admin

---

## 4. Conventions à respecter (CRITIQUE pour le dev)

### 4.1 Backend

```python
# ✅ TOUJOURS préfixer les routes avec /api
@router.get("/api/pro/something")
async def something(): ...

# ✅ TOUJOURS exclure _id des projections MongoDB
doc = await _col.find_one({"id": id}, {"_id": 0})

# ✅ TOUJOURS utiliser datetime.now(timezone.utc) — JAMAIS datetime.utcnow()
from datetime import datetime, timezone
now = datetime.now(timezone.utc).isoformat()

# ✅ Pydantic models pour les bodies
class PostCreate(BaseModel):
    title: str
    content: str

# ✅ Récupérer env via os.environ.get sans fallback en prod
mongo_url = os.environ.get("MONGO_URL")  # fail fast si manquant

# ❌ NE JAMAIS écrire un document MongoDB et le réutiliser dans la response
# (Mongo ajoute _id qui n'est pas JSON-serializable)
doc = {...}
await _col.insert_one(doc)
return doc  # ❌ doc contient maintenant _id

# ✅ FAIRE plutôt :
clean_doc = {...}
await _col.insert_one(dict(clean_doc))  # copie défensive
return clean_doc
```

### 4.2 Frontend

```jsx
// ✅ TOUJOURS utiliser process.env.REACT_APP_BACKEND_URL
const API = process.env.REACT_APP_BACKEND_URL;
fetch(`${API}/api/pro/posts`)

// ❌ NE JAMAIS appeler localhost:8001 ou /api directement
fetch('/api/pro/posts')         // ❌
fetch('http://localhost:8001/...') // ❌

// ✅ TOUJOURS ajouter data-testid sur tous éléments interactifs
<Button data-testid="pro-feed-create-post-btn">

// ✅ Composants Shadcn UI depuis ../components/ui/[name]
import { Button } from '../components/ui/button';

// ✅ Toasts via sonner
import { toast } from 'sonner';
toast.success("Posté !");
```

### 4.3 Variables d'environnement (à NE PAS modifier sans accord)

| Var | Usage |
|---|---|
| `MONGO_URL` | Connection Mongo (PROTÉGÉE) |
| `DB_NAME` | Nom DB (PROTÉGÉE) |
| `REACT_APP_BACKEND_URL` | URL preview backend (PROTÉGÉE) |
| `STRIPE_API_KEY` | Stripe secret (test) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature |
| `EMERGENT_LLM_KEY` | Clé universelle LLM (Claude/GPT/Gemini) |
| `YOUSIGN_API_KEY` + `YOUSIGN_BASE_URL` | Yousign sandbox |

> ⚠️ **NE JAMAIS commit** un `.env` avec valeurs réelles. Les fichiers `.env.example` doivent rester sans valeurs secrètes.

### 4.4 Hot reload + Supervisor

Le backend et le frontend ont du hot reload activé. **Ne pas redémarrer manuellement** sauf après :
- Modif `.env` → `sudo supervisorctl restart backend`
- Install dépendance Python → idem
- Install dépendance JS → `sudo supervisorctl restart frontend`

Logs à surveiller :
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

### 4.5 Tests

- **Backend rapide** : `curl` avec `REACT_APP_BACKEND_URL` (jamais localhost)
- **Frontend rapide** : screenshot tool (Playwright)
- **E2E** : utiliser le testing agent (`testing_agent_v3_fork`)
- Avant tout merge : lint Python (`ruff`) + lint JS (`eslint`)

### 4.6 Comptes de test

Stockés dans `/app/memory/test_credentials.md`. Compte admin :
- Email : `cultureconnectorg@gmail.com`
- Password : voir env (`ADMIN_PASSWORD`)
- FREK-ID admin : `FREK-ADM-0001`

---

## 5. Roadmap suggérée — Espace Pro

### P1 (à faire en priorité)
- [ ] **Refactor `omega.py`** : splitter le fichier (2400 lignes) en modules : `omega_feed.py`, `omega_messages.py`, `omega_builder.py`, `omega_accreditation.py`. Garder l'import principal dans `server.py`.
- [ ] **Migrer `routes/fintech.py` → `routes/shop_payments.py`** : routes shop dupliquées (FX deprecated)
- [ ] **Tests pytest** : créer `/app/backend/tests/test_pro_*.py` avec fixtures (Mongo isolé, JWT mock)
- [ ] **Documentation OpenAPI** : activer Swagger sur `/docs` en dev (déjà en place via FastAPI mais à enrichir avec les `description=` et `tags=`)

### P2
- [ ] **State management Pro** : envisager Zustand ou Context API global pour partager session, badge, jetons (actuellement passé en props)
- [ ] **Cache** : ajouter Redis pour `feed/posts`, `planning/cc2026`, `gouvernance/stats` (très consultés, peu mutés)
- [ ] **Webhook signatures Yousign** : ajouter vérification HMAC `X-Yousign-Signature-256` (voir `services/yousign_service.py`)
- [ ] **Search** : indexer `pro_posts` + `cultural_cards` dans un moteur full-text (MongoDB Atlas Search ou Meilisearch)

### P3 (Nice to have)
- [ ] Migrer le state Pro dans une PWA offline-first
- [ ] Internationaliser l'Espace Pro (i18n existe déjà : FR/EN/ES/PT/KW dans `i18n.js`)

---

## 6. Points d'attention spécifiques

### 6.1 Performances connues
- `omega.py` est massif (2400 lignes) → import lent au démarrage. À refactorer.
- Le feed Pro fait des `find()` sans pagination cursor — limit 100 docs. À paginer si la base grandit.
- Les images Cloudinary ne sont **pas** servies via CDN custom — utiliser les URLs `cloudinary.com` directement (déjà CDN-backed).

### 6.2 Gotchas Mongo
- ObjectId BSON n'est **pas** JSON-serializable → toujours `{"_id": 0}` dans les projections
- `find_one_and_update(upsert=True)` retourne le doc avec `_id` — exclure
- `datetime.utcnow()` est **deprecated Python 3.12** → utiliser `datetime.now(timezone.utc)`

### 6.3 Sécurité
- Jamais de `eval()` ou `exec()` dans le code
- Validation hCaptcha sur les formulaires publics (`/api/registration/create`, `/api/contact`)
- Rate limiter via `slowapi` configuré sur `/api/auth/*`
- Bcrypt pour les passwords (jamais MD5/SHA1)
- WebAuthn pour Touch-ID (FIDO2 standard)

### 6.4 Déploiement
- **Preview** : auto-deploy sur push (`tarifs-update.preview.emergentagent.com`)
- **Production** : déclenchement manuel via la plateforme Emergent
- **Domaine custom** : `kiltikonet.fr` → DNS pointé sur Emergent (issue actuelle "Deployment not found" — souci infra côté plateforme)

---

## 7. Ressources / Liens utiles pour le dev

| Quoi | Où |
|---|---|
| PRD complet | `/app/memory/PRD.md` |
| Documentation Kiltikonet | `/app/memory/KILTIKONET_DOCUMENTATION.md` |
| Changelog | `/app/memory/CHANGELOG.md` |
| Roadmap | `/app/memory/ROADMAP.md` |
| Design guidelines | `/app/design_guidelines.md` (s'il existe) |
| Test credentials | `/app/memory/test_credentials.md` |
| Tests reports | `/app/test_reports/iteration_*.json` |
| Yousign integration | `/app/backend/services/yousign_service.py` |
| Object storage | `/app/backend/services/object_storage.py` |
| Routes Pro principales | `/app/backend/routes/omega.py` |
| Frontend Pro principal | `/app/frontend/src/components/omega/ProApp.jsx` |

---

## 8. Workflow Git recommandé pour ton dev

1. **Brancher** sur `main` :
   ```bash
   git checkout -b feat/pro-<feature-name>
   ```
2. **Petits commits atomiques** : un par feature/fix
3. **Tester localement** : `curl` + screenshot avant push
4. **Lint** : `ruff check /app/backend/` + `eslint /app/frontend/src/`
5. **PR avec checklist** : (1) Tests passent ✅ (2) Lint OK ✅ (3) Pas de `.env` modifié ✅ (4) Pas de `_id` dans les responses ✅
6. **Push GitHub** : utiliser le bouton "Save to Github" dans Emergent (pas de `git push` manuel)

---

## 9. Contacts & Support

- **Plateforme** : support Emergent via le chat principal (pas par email)
- **Stripe** : dashboard Stripe pour les paiements
- **Yousign** : dashboard Yousign sandbox pour configurer le webhook
- **Cloudinary** : dashboard Cloudinary pour les médias

---

**Bonne dev ! 🚀**
*Document généré le 29/04/2026 — version 1.0*
