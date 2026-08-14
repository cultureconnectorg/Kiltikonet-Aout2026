# KILTIKONET — PRD

## Statement (canonique)

Kiltikonet est un **réseau et une infrastructure culturelle** qui connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques. **Portage stratégique : CVLN Group**. **Siège opérationnel : Fort-de-France (Martinique)**.

Kiltikonet **n'est pas un événement**. Culture Connect en est **une expression récurrente** (édition 2026 réalisée, 2027 à venir, 2028 projetée).

## Règles absolues

1. **Aucune donnée inventée.** Chaque chiffre public porte sa source (`src · <collection>` ou `src · observatory/public/now`).
2. **Aucune collection supprimée.** L'historique est immuable (2 544 events legacy conservés dans `_source_legacy`).
3. **Smart Engine intact.** Observatory s'y connecte via adaptateurs read-only uniquement.
4. **Esthétique institutionnelle.** Pas de cards SaaS (`rounded-2xl`, `shadow-lg`), pas de gradients marketing, pas de glassmorphism. Fonds sombres profonds + typographie éditoriale Serif (Newsreader) + or discret comme signal.
5. **Rôle `founder` distinct de `admin`.** Observatory reste route protégée (pas destination publique principale).

## Architecture cible

```
CVLN Group (holding)
   └── Kiltikonet (entité culturelle)
         ├── Culture Connect  (initiative récurrente)
         │     ├── 2026  (archive)
         │     ├── 2027  (à venir)
         │     └── 2028  (projetée)
         ├── Observatory     (mémoire numérique, /observatory)
         ├── FREK-ID         (identifiant culturel, via FREKCORE)
         └── Réseau          (acteurs · structures · institutions · territoires)
```

## Architecture technique

```
/app/
├── backend/
│   ├── routes/
│   │   ├── observatory.py            (API observatoire — 12 endpoints)
│   │   ├── analytics.py              (ingestion unifiée)
│   │   └── site_analytics.py         (legacy nettoyé)
│   ├── services/
│   │   ├── analytics_normalize.py    (RGPD / referrer)
│   │   └── observatory_adapters/     (bridge read-only Smart Engine)
│   │       ├── alerts.py, badges.py, conversion.py,
│   │       ├── diffusion.py, live.py, mgraph.py, network.py
│   └── server.py                     (>10k lignes — à refactoriser)
└── frontend/
    └── src/
        ├── styles/tokens.css                    (design system central)
        ├── components/
        │   ├── kilti/
        │   │   ├── atoms.jsx                    (atomes réutilisables)
        │   │   └── InstitutionalFooter.jsx      (footer unifié)
        │   ├── KiltikonetHome.jsx               (homepage 8 sections)
        │   ├── APropos.jsx                      (NEW — /a-propos)
        │   ├── NowPage.jsx                      (NEW — /now)
        │   ├── CultureConnect.jsx               (page mère refondue)
        │   ├── CultureConnect2026.jsx           (archive refondue)
        │   ├── CultureConnect2027.jsx           (édition à venir refondue)
        │   ├── Rejoindre.jsx                    (4 portes refondues)
        │   ├── ContactKiltikonet.jsx            (canaux refondus)
        │   ├── Infrastructure.jsx               (5 briques + footer)
        │   ├── Observatory.jsx                  (8 sections + footer)
        │   └── SEO.jsx                          (metadata React 19)
        └── App.js                               (routes + tokens.css)
```

## Endpoints publics clés

- `GET /api/observatory/public/now` — Agrégat public sans PII (fenêtre `/now`, homepage Impact, footer)
- `GET /api/observatory/memory` — Mémoire complète
- `GET /api/observatory/timeline?days=180` — Reconstruction temporelle
- `GET /api/observatory/event-types?days=30` — Distribution
- `GET /api/observatory/territories` — Depuis registrations
- `GET /api/observatory/sessions?days=7` — Sessions & referrers
- `GET /api/observatory/access` — Vérification rôle founder
- `POST /api/analytics/batch` — Ingestion canonique

## What's been implemented (2026-02)

### Session Refondation Institutionnelle (cette session)
- ✅ Design system centralisé (`tokens.css` + `atoms.jsx`)
- ✅ Footer institutionnel unifié avec data lineage live
- ✅ Refonte des 5 composants encore en style SaaS (CultureConnect, CultureConnect2026, CultureConnect2027, Rejoindre, ContactKiltikonet)
- ✅ Création `/a-propos` (5 sections : Mission, Positionnement, Gouvernance, Écosystème CVLN, Contact)
- ✅ Création `/now` (fenêtre publique sombre avec 4 métriques réelles)
- ✅ Ajout du footer institutionnel sur KiltikonetHome, Observatory, Infrastructure
- ✅ Routes `/a-propos`, `/about`, `/now`, `/maintenant` ajoutées
- ✅ Testing agent v3 : **100 %** succès frontend + backend, aucun bug critique

### Sessions précédentes
- ✅ Fix hCaptcha CSP + OAuth cleanup + robots.txt sans /participant/ + sitemap sans UUID
- ✅ Migration sécurisée de 2 544 events legacy vers `analytics_events` (immuables)
- ✅ Création Observatory : 12 endpoints, 6 adaptateurs read-only vers Smart Engine
- ✅ Homepage `/` connectée à `/api/observatory/public/now`
- ✅ Documentation : SYSTEM_DISCOVERY_REPORT, SMART_ENGINE_DATA_DISCOVERY, DATA_RECONCILIATION_MATRIX, CANONICAL_METRIC_DICTIONARY, REFONDATION_ROADMAP

## Roadmap / Backlog

### P1 — Prochaines valeurs métier
- Espace `/observatory/founder` avec timeline historique enrichie et signaux
- Interface founder distincte (accès protégé par rôle)
- Enrichissement `distinct_territories` (peupler `db.registrations.country`)

### P2 — Refactor & qualité
- Refactoring `server.py` (>10 000 lignes) en modules `routes/`, `models/`, `services/`
- Corriger bug préexistant `JetonsAnalyticsDashboard.jsx` (Webpack warnings zxing/mediapipe)
- Audit RGAA formel de la page `/accessibilite`
- Nettoyer console noise Three.js "multiple instances" (Splash)

### P3 — Nice-to-have
- Harmoniser le Header/CookieBanner (encore quelques `rounded-2xl` transverses, spec autorise)
- Rich metadata pour partenaires (permanents vs CC2026)
- Print stylesheets dédiés par page institutionnelle (dossiers presse)

## Testing state

- Dernier rapport : `/app/test_reports/iteration_95.json`
- Backend : 100 %
- Frontend : 100 %
- `retest_needed`: false

## Environment / Credentials

- Password `/admin` : `CC2026admin`
- Bypass Pro : `cultureconnectorg@gmail.com` / `000000`
- Backend URL : via `REACT_APP_BACKEND_URL`
- MongoDB : `MONGO_URL` + `DB_NAME` inchangés

## Third-party integrations

- Stripe (paiements) — clé user
- Yousign (signature) — clé user
- Anthropic Claude Sonnet 4.5 — Emergent LLM Key
- Brevo / AWS SES (emails) — clé user
- hCaptcha — clé user

## Design canonique

- Palette : `--kk-paper #F1EBDD` / `--kk-ink #0F0C09` / `--kk-ash #1F1B15` / `--kk-gold #C9A84C` / `--kk-rust #A65D47`
- Typographie : Newsreader (titres monumentaux serif) + Manrope (interface sans-serif) + IBM Plex Mono (data)
- Rythme : `--kk-space-section` clamp(4rem, 8vw, 10rem)
- Data lineage systématique : `src · <collection>` sous chaque chiffre public
