# KILTIKONET.FR — Documentation Technique Complète
## Culture Connect 2026 (CC2026)
### Document de référence pour intégration inter-services

---

## 1. VUE D'ENSEMBLE

**URL Production** : `https://tarifs-update.preview.emergentagent.com`
**API Base URL** : `https://tarifs-update.preview.emergentagent.com/api`
**Stack** : FastAPI (Python) + React 19 PWA + MongoDB + Stripe + AWS SES
**Organisateur** : Factory Maker Studio (EURL) / CVLN Group
**Événement** : 20-23 Mai 2026, Fort-de-France, Martinique
**Objectif** : 40 000 FREK-IDs culturels

---

## 2. ARCHITECTURE

```
Frontend (React PWA)  ←→  API Gateway (/api prefix)  ←→  FastAPI Backend
                                                            ↓
                                                     MongoDB (primary)
                                                     Baserow (mirror)
                                                     Stripe (paiements)
                                                     AWS SES (emails)
                                                     FREKcore (identités)
```

### Base de données : MongoDB
- **DB Name** : `culture_connect_2026`
- **Collections principales** : `cc_badges`, `cc_scans`, `cc_transactions`, `registrations`, `payment_transactions`, `email_logs`

---

## 3. SYSTÈME DE BADGES (15 types)

### Types de badges
| Code | Nom | NFC | Zones accès |
|------|-----|-----|-------------|
| VIS | Visiteur | Non | ENTREE_GENERALE |
| ART | Artiste | Non | ENTREE_GENERALE, BACKSTAGE |
| INT | Intervenant | Non | ENTREE_GENERALE, SALLE_CONF |
| STF | Staff | Non | ENTREE_GENERALE, BACKSTAGE, REGIE |
| BNV | Bénévole | Non | ENTREE_GENERALE |
| PRS | Presse | Non | ENTREE_GENERALE, SALLE_CONF, BACKSTAGE |
| VIP | VIP | **Oui** | ENTREE_GENERALE, VIP_LOUNGE, BACKSTAGE, SALLE_CONF |
| OFF | Officiel | **Oui** | TOUTES |
| SPO | Sponsor | **Oui** | ENTREE_GENERALE, VIP_LOUNGE, SALLE_CONF |
| EXP-B | Exposant Bronze | Non | ENTREE_GENERALE, MARCHE_CULTUREL |
| EXP-S | Exposant Silver | Non | ENTREE_GENERALE, MARCHE_CULTUREL, SALLE_CONF |
| EXP-G | Exposant Gold | **Oui** | ENTREE_GENERALE, MARCHE_CULTUREL, SALLE_CONF, VIP_LOUNGE |
| EXP-P | Exposant Platinum | **Oui** | TOUTES sauf REGIE |
| EXP-D | Exposant Diamond | **Oui** | TOUTES |
| EXP-VIP | Exposant VIP | **Oui** | TOUTES |

### Cycle de vie du badge (8 étapes)
1. **INSCRIT** → Badge créé via formulaire
2. **FREK_EMIS** → FREK-ID UUID généré via FREKcore
3. **EMAIL_ENVOYE** → Email de confirmation SES
4. **ACTIVE** → Lien d'activation QR cliqué
5. **IMPRIME** → Badge physique imprimé (batch)
6. **REMIS** → Badge scanné à l'entrée J-0
7. **NFC_ACTIF** → Premier tap NFC (badges NFC uniquement)
8. **ARCHIVE** → Post-événement, archivé dans FREK Legacy

### Schema MongoDB `cc_badges`
```json
{
  "badge_id": "CC26-VIS-XXXXX",
  "frek_id": "uuid-from-frekcore",
  "prenom": "Marie",
  "nom": "Dupont",
  "email": "marie@example.com",
  "type_badge": "VIS",
  "statut": "INSCRIT|ACTIVE|REMIS|ARCHIVE",
  "qr_token": "hex-activation-token",
  "nfc_enabled": false,
  "nfc_uid": "",
  "jetons_solde": 0,
  "organisation": "",
  "date_emission": "ISO8601",
  "imprime": false,
  "remis": false,
  "created_at": "ISO8601"
}
```

---

## 4. API ENDPOINTS

### 4.1 Badges (`/api/badges/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/badges/inscrire` | Créer un badge (déclenche FREK emit) |
| GET | `/api/badges/{badge_id}` | Détails d'un badge |
| GET | `/api/badges/types` | Liste des 15 types |
| GET | `/api/badges/list` | Tous les badges |
| GET | `/api/badges/stats` | Statistiques badges |
| GET | `/api/badges/lookup/{badge_id}` | Recherche badge |
| GET | `/api/badges/lifecycle/{badge_id}` | Cycle de vie 8 étapes |
| POST | `/api/badges/scan` | Scanner un badge |
| POST | `/api/badges/print-batch` | Marquer badges comme imprimés |
| POST | `/api/badges/archive-legacy` | Archiver tous les badges remis |
| GET | `/api/badges/frek-status` | Status connexion FREKcore |
| GET | `/api/badges/frek-discovery` | Discovery endpoints FREKcore |
| POST | `/api/badges/frek-reconcile` | Synchroniser avec FREKcore |

**Exemple d'inscription :**
```bash
curl -X POST https://tarifs-update.preview.emergentagent.com/api/badges/inscrire \
  -H "Content-Type: application/json" \
  -d '{"prenom":"Marie","nom":"Test","email":"marie@test.com","type_badge":"VIS"}'
```
**Réponse :**
```json
{
  "badge_id": "CC26-VIS-XXXXX",
  "frek_id": "baed8540-a81b-4b95-ba8a-72bfd2ea9a89",
  "frek_status": "emitted",
  "qr_token": "hex-token",
  "nfc_enabled": false,
  "statut": "INSCRIT"
}
```

### 4.2 Activation Badge
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/activer-badge/{qr_token}` | Activer un badge via QR |

### 4.3 Scan & Terrain (Mode J-0)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/scan/debit` | Scan entrée + débit jetons |
| POST | `/api/frek/nfc/tap` | Tap NFC (badges NFC) |
| POST | `/api/terrain/manual-checkin/{id}` | Check-in manuel |
| DELETE | `/api/terrain/reset-presence/{id}` | Reset présence |

**Exemple scan :**
```bash
curl -X POST .../api/scan/debit \
  -d '{"badge_id":"CC26-VIS-XXXXX","zone":"ENTREE_GENERALE","montant":0,"agent_id":"staff1"}'
```

### 4.4 Jetons (Monnaie digitale CC)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/jetons/packs` | 4 packs disponibles |
| POST | `/api/jetons/checkout` | Créer session Stripe |
| POST | `/api/jetons/stripe/webhook` | Webhook Stripe |
| GET | `/api/jetons/wallet/{badge_id}` | Solde + transactions |
| POST | `/api/jetons/spend` | Dépenser des jetons |
| GET | `/api/jetons/transactions/{badge_id}` | Historique |
| GET | `/api/jetons/stats` | Stats globales |
| POST | `/api/jetons/remboursement` | Demande remboursement |

**Packs jetons :**
| Pack | Jetons | Prix EUR |
|------|--------|----------|
| Découverte | 10 | 13.50€ |
| Culture | 25 | 30.00€ |
| Diaspora | 50 | 55.00€ |
| VIP | 100 | 100.00€ |

### 4.5 Email (AWS SES)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/email/send` | Envoyer email |
| POST | `/api/email/campaign` | Campagne email |
| GET | `/api/email/stats` | Statistiques |
| GET | `/api/email/templates` | 8 templates HTML |
| POST | `/api/email/qr-generate` | Générer QR badge |

**Templates email :** bienvenue, wallet_recharge, rappel_j30, rappel_j15, rappel_j7, rappel_j1, jour_j, merci_j1

### 4.6 SES Domain (DKIM/SPF/DMARC)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ses/domain/status` | Status domaine kiltikonet.fr |
| POST | `/api/ses/domain/verify` | Initier vérification |
| POST | `/api/ses/domain/enable-dkim` | Activer DKIM |
| POST | `/api/ses/production-request` | Status sandbox/production |

### 4.7 Analytics
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/analytics/jetons/overview` | Dashboard jetons complet |
| GET | `/api/v1/dashboard/cc2026/live` | Dashboard temps réel |
| GET | `/api/stats/live` | Stats live |
| GET | `/api/stats/heatmap` | Heatmap zones |
| GET | `/api/stats/export` | Export CSV badges |
| GET | `/api/stats/export/transactions` | Export transactions |
| GET | `/api/stats/export/scans` | Export scans |

### 4.8 Stripe (Paiements)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/create-checkout-session` | Session paiement (accréditations + partenariats) |
| GET | `/api/checkout/status/{session_id}` | Status paiement |
| POST | `/api/webhook/stripe` | Webhook Stripe |
| GET | `/api/stripe-public-key` | Clé publique Stripe |

### 4.9 Administration
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/pro/login` | Login Espace Pro (bypass: cc@kiltikonet.fr) |
| POST | `/api/workspace/login` | Login workspace |
| POST | `/api/admin/verify` | Vérification admin |
| POST | `/api/admin/batch-email` | Email batch |
| GET | `/api/admin/reconcile` | Réconciliation données |

### 4.10 CMS (Contenu éditorial)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST | `/api/shared/artistes` | Gestion artistes (line-up Concert) |
| GET/POST | `/api/shared/partners` | Gestion partenaires |
| GET/POST | `/api/shared/planning` | Planning événement |
| GET/POST | `/api/shared/tasks` | Tâches partagées |
| GET/POST | `/api/shared/contacts` | Contacts |
| GET/POST | `/api/shared/expenses` | Dépenses |
| GET/POST | `/api/cms/media` | Médias |
| GET/POST | `/api/cms/speakers` | Intervenants |
| GET | `/api/cms/exhibitors` | Exposants |

### 4.11 FREK Integration
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/frek/stats` | Stats FREK |
| GET | `/api/frek/health` | Health check FREKcore |
| POST | `/api/frek/nfc/tap` | NFC tap |

---

## 5. CONNEXION FREKCORE

**FREKcore URL** : `https://tarifs-update.preview.emergentagent.com/api`
**Auth** : JWT via `POST /v1/auth/token`
```json
{
  "client_id": "kiltikonet-cc2026",
  "client_secret": "pczBP49crCXSSSwSOShsXClzs9srhKe5S-xnraMPn-k"
}
```

**Endpoint de création badge sur FREKcore** : `POST /badges/create`
```json
{
  "prenom": "Marie",
  "nom": "Test",
  "email": "marie@test.com",
  "type_badge": "BNV",
  "organisation": "CC2026"
}
```

**Mapping types Kiltikonet → FREKcore** : VIS (kiltikonet) → BNV (FREKcore)
Tous les autres types (ART, INT, VIP, etc.) sont identiques.

**Status connexion actuel** : CONNECTÉ — Vrais UUID FREK-IDs générés

---

## 6. PAGES FRONTEND (PUBLIC)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Accueil | Landing page CC2026 |
| `/programme` | Programme | 4 jours (20-23 Mai 2026) |
| `/concert` | Concert | Line-up artistes (CMS dynamique) |
| `/pricing` ou `/tarifs` | Tarifs | 4 cartes : Visiteur 0€, Émergent 50€, Pro 150€, Institu 300€ |
| `/partnership` | Partenariat | Bronze 2500€, Silver 5000€, Gold 10000€ |
| `/jetons` | Jetons | 4 packs, porte-monnaie, achat Stripe |
| `/mon-espace` | Mon Espace | Dashboard utilisateur (badge + jetons + historique) |
| `/badge-inscription` | Inscription Badge | Formulaire FREK (tous types) |
| `/catalogue` | Catalogue | Catalogue participants |
| `/activer-badge/{token}` | Activation | Page activation badge |

### Pages internes (Admin)
| Route | Page |
|-------|------|
| `/admin` | Dashboard Admin (login workspace) |
| `/admin/analytics/jetons` | Analytics Jetons (Recharts) |
| `/admin/terrain` | Mode Terrain J-0 (scan QR + offline) |
| `/espace-pro/connexion` | Espace Pro (bypass: cc@kiltikonet.fr) |
| `/dashboard-cc2026` | Dashboard CC2026 live |

---

## 7. STATISTIQUES ACTUELLES (Live)

- **48 badges** créés (VIP: 17, BNV: 12, VIS: 7, ART: 6, OFF: 2, EXP-VIP: 2, SPO: 1, EXP-G: 1)
- **12 badges actifs**, 30 inscrits
- **0 jetons** en circulation (pas encore d'achats)
- **20 scans** enregistrés
- **FREK-IDs** : Mix LOCAL-xxx (anciens) + UUID (nouveaux via FREKcore)

---

## 8. CONFIGURATION DES ACCÈS

Aucune valeur d’accès ne doit être stockée dans cette documentation ou dans Git.
Des valeurs d'accès figuraient dans cette documentation et restent dans l'historique
Git. Leur validité et un éventuel accès par un tiers n'ont pas été établis.
Le nettoyage documentaire n'a révoqué aucune clé ni désactivé aucun service.

| Service | Variables / configuration attendues |
|---------|--------------------------------------|
| Administration | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMERGENCY_SECRET` |
| FREKcore | `FREK_CLIENT_ID`, `FREK_CLIENT_SECRET`, `FREKCORE_SECRET`, `FREK_API_URL` |
| AWS SES | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL` |
| Baserow | `BASEROW_URL`, `BASEROW_TOKEN`, `BASEROW_TABLE_ID` — côté serveur uniquement |
| Stripe | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLIC_KEY` |
| Sessions | `SESSION_SECRET` |

Procédure et constat : `docs/rebuild/SECRETS_RECONCILIATION.md`.

---

## 9. PALETTE DE COULEURS

| Nom | Hex | Usage |
|-----|-----|-------|
| Terracotta | #A65D47 | Boutons principaux, accents |
| Gold | #C9A84C | Jetons, highlights |
| Dark | #1A1510 | Textes, headers sombres |
| Cream/Paper | #F4F0E8 | Fond de page |
| Warm | #E8E0D0 | Bordures, fonds secondaires |
| Sage | #4A5D4E | Success, confirmations |
| Muted | #6B6560 | Textes secondaires |

---

## 10. MODE OFFLINE (PWA)

Le Mode Terrain supporte le fonctionnement hors-ligne :
- **Service Worker** avec cache statique + dynamique
- **IndexedDB** pour la file d'attente des scans
- **Sync différée** automatique au retour du réseau
- **Background Sync** via `cc2026-scan-sync`

Les scans effectués hors-ligne sont stockés localement et synchronisés automatiquement.

---

*Document généré le 13 Mars 2026 — Kiltikonet.fr / Culture Connect 2026*
