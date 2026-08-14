# KILTIKONET — REDIRECT PLAN & FUSION PLAN (Proposition — NON APPLIQUÉE)

> **Statut** : ⚠️ PROPOSITION ONLY — aucune redirection n'a été appliquée au code.  
> **Attente** : validation utilisateur, une entrée à la fois.  
> **Principe** : aucune fusion destructive. Toutes les URLs anciennes gardent leur historique via redirection 301 côté React Router (`<Navigate to="..." replace />`).

---

## 🚦 RÈGLES DE FUSION APPLIQUÉES

1. **Rien n'est supprimé** — les anciennes URLs restent joignables via redirection.
2. **Aucune page nouvelle** n'est créée.
3. **Aucune donnée** de collection MongoDB n'est touchée.
4. **Le SEO historique est préservé** : la redirection 301 transfère l'autorité de la vieille URL vers la canonique.
5. **Une décision, une validation** : chaque entrée du tableau ci-dessous doit être approuvée individuellement.

---

## 1. PLAN DE FUSION — DOUBLONS PURS (11 groupes)

Format : `OLD URL → CANONICAL URL → 301 → raison`

### Groupe D1 · À propos
```
/about  →  /a-propos  →  301  →  Le site est primairement en français.
                                  Le contenu est identique. Alias EN conservé pour SEO.
```
**Perdu si fusion ?** Rien — même composant, même contenu.  
**SEO historique ?** `/a-propos` = FR canonique. `/about` = redirect 301, garde l'autorité pour visiteurs EN.  
**Recommandation** : ✅ FUSIONNER.

### Groupe D2 · Maintenant
```
/maintenant  →  /now  →  301  →  Alias FR historique. Nav home + footer utilisent /now.
```
**Perdu si fusion ?** Rien.  
**Recommandation** : ✅ FUSIONNER.

### Groupe D3 · Partenariat
```
/partnership  →  /partenaires  →  301  →  /partenaires = FR canonique (Header, footer).
                                          /partnership utilisé par LandingPage legacy.
```
**Perdu si fusion ?** Rien — même composant.  
**Recommandation** : ✅ FUSIONNER.

### Groupe D4 · Catalogue
```
/catalog  →  /catalogue  →  301  →  /catalogue = FR canonique (Header, MobileBottomNav).
                                    /catalog utilisé par ParticipantProfile ×2.
```
**Perdu si fusion ?** Rien.  
**Recommandation** : ✅ FUSIONNER. Mettre aussi à jour ParticipantProfile (2 liens).

### Groupe D5 · Tarifs / Inscription (4 URLs → 1) ⚠️ DÉCISION IMPORTANTE
```
/tarifs      →  /pricing  →  301  →  cohérence EN avec /partnership ...
/register    →  /pricing  →  301  →
/inscription →  /pricing  →  301  →
```
**OU**
```
/pricing     →  /tarifs   →  301  →  cohérence FR (site en français primairement)
/register    →  /tarifs   →  301  →
/inscription →  /tarifs   →  301  →
```
**⚠️ VALIDATION UTILISATEUR REQUISE** : Le site est en français, mais `/pricing` est référencé par 3 endroits (`LandingPage` ×3, `RegistrationForm`). `/tarifs` est référencé 1 fois (`ConcertPage`).

**Perdu si fusion ?** Rien — même composant `PricingPage`.  
**Risque campagnes externes ?** Vérifier si `/inscription` est utilisée dans des mailings / QR codes / posters CC2026.

**Recommandation** : ✅ FUSIONNER **après confirmation utilisateur**.

### Groupe D6 · Aide / FAQ
```
/aide  →  /faq  →  301  →  /faq = universel (utilisé par LandingPage + MobileBottomNav).
```
**Recommandation** : ✅ FUSIONNER.

### Groupe D7 · Admin Terrain
```
/admin/terrain  →  /admin/mobile  →  301  →  /admin/mobile est utilisé par MobileBottomNav.
```
**Recommandation** : ✅ FUSIONNER.  
**Alternative** : garder les 2 pour cohérence sémantique ("terrain" = usage humain, "mobile" = technique). ⚠️ VALIDATION.

### Groupe D8 · Badge Scan
```
/badge-scan  →  /badge/:id  →  KEEP les deux (patterns différents, pas un vrai doublon).
```
**Recommandation** : ⏸ NE PAS FUSIONNER. `/badge-scan` est un fallback sans ID. `/badge/:id` est le pattern principal.

### Groupe D9 · Observatory (dans footer inline home)
```
Ne pas fusionner. Consolider les LABELS dans le footer :
au lieu de 5 liens "Traces / Données / Signaux / Rapports / API" → tous vers /observatory,
regrouper en 1 seul lien "Observatory" → /observatory.
```
**Perdu ?** Rien — les 5 labels pointent déjà tous sur la même URL.  
**Recommandation** : ✅ Consolider les labels au niveau du footer (pas de redirection nécessaire).

### Groupe D10 · CC2026 (page mère 2026 vs legacy)
```
/legacy-cc2026  →  KEEP tel quel  →  page volontairement isolée à des fins de référence historique.
```
**Recommandation** : ✅ NE PAS TOUCHER. Zéro lien entrant confirme l'isolation voulue.

### Groupe D11 · Bug /contact
```
Route /contact (App.js:423) → SupportPage  →  À SUPPRIMER
Route /contact (App.js:335) → ContactKiltikonet  →  ✅ CANONIQUE
```
**Perdu si suppression de la 2ème ?** Rien — SupportPage reste accessible via `/support`.  
**Recommandation** : 🔴 CRITIQUE — supprimer la ligne 423. Aucun risque.

---

## 2. PLAN DE FUSION — LEGACY & MISROUTED (8 corrections)

### G1-G3 · Liens `/legal/*.html` (fichiers statiques) → routes React
```
<a href="/legal/mentions-legales.html">         →  <Link to="/mentions-legales">
<a href="/legal/politique-confidentialite.html"> →  <Link to="/confidentialite">
<a href="/legal/cgu.html">                       →  <Link to="/cgu">
```
**Fichier concerné** : `components/KiltikonetHome.jsx:657-659`  
**Perdu ?** Rien (les fichiers .html restent accessibles pour audits externes).  
**Bénéfice** : navigation SPA (sans rechargement) + une seule URL SEO par contenu.  
**Recommandation** : ✅ CORRIGER.

### G4-G5 · `href` → `Link` sur pages LandingPage
```
<a href="/faq">     →  <Link to="/faq">
<a href="/support"> →  <Link to="/support">
```
**Fichier** : `components/LandingPage.jsx:503-504`  
**Recommandation** : ✅ CORRIGER (SPA-friendly, plus rapide, sans rechargement).

### G6 · ParticipantProfile `/catalog` → `/catalogue`
Voir D4.

### G7 · ConcertPage `/tarifs` → canonique
Voir D5.

### G8 · LandingPage `/partnership` → `/partenaires`
Voir D3.

### Bug Missrouted footer inline home
```
"Docs" → /infrastructure   ⚠️ Sémantiquement faux (docs ≠ infrastructure)
"Presse" → /contact        ⚠️ Devrait pointer vers /support ou une future page presse
```
**Recommandation** :
- Retirer "Docs" du footer OU pointer vers une future ancre `#documentation` sur `/infrastructure` (à valider).
- Retirer "Presse" du footer OU pointer vers `/contact?motif=presse` (paramètre géré côté ContactKiltikonet, à valider).

⚠️ **VALIDATION REQUIRED** — ne pas créer de page "presse" pendant l'embargo.

---

## 3. PLAN DE FUSION — MISSING DESTINATIONS (5 routes)

Ces routes sont référencées mais N'EXISTENT PAS. **Aucune redirection possible sans validation.**

### Missing 1 · `/reseau` (référencé par KiltikonetHome nav)
**3 options, validation requise :**
- **Option A** (recommandée pendant embargo) : rediriger `to="/reseau"` → `to="/rejoindre"` (parcours actuel des futurs partenaires/franchisés).
- **Option B** : rediriger vers `/gouvernance` (network d'adhésion).
- **Option C** (levée d'embargo) : créer une route `/network` ou `/reseau` dédiée au Kiltikonet Network (organigramme, territoires, opérateurs).

⚠️ **Pour l'instant, action = mettre à jour KiltikonetHome.jsx:289 pour pointer vers une route existante.**

### Missing 2-4 · `/espace-pro`, `/espace-pro/messages` (référencés par MobileBottomNav, pro/*)
**Option unique recommandée** :
```
Références actuelles → mise à jour du code :
navigate('/espace-pro')          →  navigate('/pro')
navigate('/espace-pro/messages') →  navigate('/pro?section=messages')
href="/espace-pro?section=..."   →  href="/pro?section=..."
```
**Aucune redirection Router requise** : mise à jour directe des `navigate()` dans les composants concernés.  
**Alternative Router** : ajouter `<Route path="/espace-pro/*" element={<Navigate to="/pro" replace />} />` pour couvrir les liens externes / bookmarks.

### Missing 5 · `/admin/participants`, `/admin/settings` (référencés par MobileBottomNav admin)
**Recommandation** :
- Soit corriger les 2 boutons de nav admin mobile pour pointer vers `/admin` (dashboard existant).
- Soit accepter que ces boutons deviennent inertes (`disabled`) en attendant que ces sections existent (interdit par embargo tant que la page n'existe pas).

⚠️ **VALIDATION REQUIRED** : correction du code de `MobileBottomNav.jsx` à valider.

---

## 4. MATRICE FINALE À VALIDER (Format tableau consolidé)

| # | OLD URL | → | CANONICAL URL | Type | Raison | Validation |
|---|---------|---|---------------|------|--------|------------|
| R1 | `/about` | → | `/a-propos` | 301 | Alias EN | ⏸ |
| R2 | `/maintenant` | → | `/now` | 301 | Alias FR | ⏸ |
| R3 | `/partnership` | → | `/partenaires` | 301 | FR canonique | ⏸ |
| R4 | `/catalog` | → | `/catalogue` | 301 | FR canonique | ⏸ |
| R5 | `/tarifs` | → | `/pricing` OU inverse | 301 | Décision FR/EN | ⏸⚠️ |
| R6 | `/register` | → | canonique tarifs | 301 | Doublon | ⏸ |
| R7 | `/inscription` | → | canonique tarifs | 301 | Doublon (⚠️ campagnes externes) | ⏸⚠️ |
| R8 | `/aide` | → | `/faq` | 301 | Doublon | ⏸ |
| R9 | `/admin/terrain` | → | `/admin/mobile` | 301 | Doublon technique | ⏸ |
| R10 | `/badge-scan` | → | KEEP | — | Pas un vrai doublon | ✅ |
| R11 | `/contact` (ligne 423 App.js) | → | Supprimer la 2ème route | code fix | Bug B1 | ⏸ 🔴 |
| R12 | `/legal/mentions-legales.html` | → | `/mentions-legales` | href→Link | SPA + SEO | ⏸ |
| R13 | `/legal/politique-confidentialite.html` | → | `/confidentialite` | href→Link | SPA + SEO | ⏸ |
| R14 | `/legal/cgu.html` | → | `/cgu` | href→Link | SPA + SEO | ⏸ |
| R15 | LandingPage `href="/faq"` | → | `<Link to="/faq">` | href→Link | SPA | ⏸ |
| R16 | LandingPage `href="/support"` | → | `<Link to="/support">` | href→Link | SPA | ⏸ |
| R17 | ParticipantProfile `to="/catalog"` | → | `to="/catalogue"` | code fix | Doublon | ⏸ |
| R18 | ConcertPage `navigate('/tarifs')` | → | canonique tarifs | code fix | Doublon | ⏸ |
| R19 | LandingPage `navigate('/partnership')` | → | `navigate('/partenaires')` | code fix | Doublon | ⏸ |
| R20 | KiltikonetHome `to="/reseau"` | → | ⚠️ VALIDATION | code fix | Missing dest | ⏸ 🔴 |
| R21 | `/espace-pro` (5 refs) | → | `/pro` | Navigate route + code fix | Missing dest | ⏸ 🔴 |
| R22 | `/admin/participants`, `/admin/settings` (MobileBottomNav) | → | `/admin` | code fix | Missing dest | ⏸ 🔴 |
| R23 | Footer inline home "Docs → /infrastructure" | → | Retirer OU ancre | code fix | Misrouted sémantique | ⏸ |
| R24 | Footer inline home "Presse → /contact" | → | Retirer | code fix | Misrouted | ⏸ |
| R25 | Footer inline home 5× "Observatory" | → | 1 seul lien Observatory | code fix | Redondance UX | ⏸ |
| R26 | Header dropdown "Admin" exposé | → | Masquer si non-admin | code fix | Sécurité UI | ⏸ |
| R27 | `/appel-2026` | → | KEEP mais noindex ? | SEO | Orphelin | ⏸⚠️ |
| R28 | `/concert` | → | KEEP | — | Contexte QR CC2026 | ✅ |
| R29 | `/register-pro` | → | KEEP ou décision | SEO | Orphelin | ⏸⚠️ |
| R30 | Consolider 3 footers en 1 (InstitutionalFooter enrichi) | → | Utiliser IF partout | refactor | Cohérence | ⏸ |

---

## 5. SEO — AUDIT COMPLÉMENTAIRE (Phase 7)

### Canonical
- ⚠️ Aucune balise `<link rel="canonical">` détectée dans les composants (à vérifier au niveau HTML/index.html).
- Après application des redirections 301, définir canonique par contenu :
  - Homepage : `<link rel="canonical" href="https://kiltikonet.fr/" />`
  - Culture Connect : `/culture-connect` (canonique) — les alias 2026/2027 ont leur propre canonique.
  - À propos : `/a-propos` (FR primaire).

### Sitemap
- ⚠️ Sitemap.xml à générer post-consolidation. Ne doit contenir que les routes CANONICAL PUBLIC.
- Exclure : `*/admin/*`, `/workspace/*`, `/dashboard-cc2026/*`, `/auth/*`, `/invite/*`, `/badge/:id`, `/activer-badge/*`, `/observatory/founder`.
- Inclure : `/`, `/culture-connect`, `/culture-connect/2026`, `/culture-connect/2027`, `/infrastructure`, `/rejoindre`, `/a-propos`, `/now`, `/observatory`, `/gouvernance`, `/gouvernance/adhesion`, `/partenaires`, `/pricing` (ou `/tarifs`), `/catalogue`, `/programme`, `/faq`, `/support`, `/contact`, `/accessibilite`, `/mentions-legales`, `/confidentialite`, `/cgu`, `/cookies`, `/appel-2026` (si pertinent).

### robots.txt
- ⚠️ À auditer : `/public/robots.txt` doit exclure `/admin/*`, `/workspace/*`, `/dashboard-cc2026/*`, `/observatory/founder`.

### Meta title / description
- Le composant `DocumentTitle` (App.js:242) gère bien les `<title>` par route via `ROUTE_TITLES`. ✅
- Mais : 22 routes définies dans ROUTE_TITLES vs 94 routes réelles → 72 routes sans title dédié (fallback générique).
- ⚠️ Enrichir `ROUTE_TITLES` pour couvrir aussi `/observatory`, `/a-propos`, `/now`, `/rejoindre`, `/culture-connect/*`, `/gouvernance/*`, etc. → Cette action ne crée aucune page.

### JSON-LD / Open Graph
- ⚠️ À auditer dans `/public/index.html` — non scanné dans cet audit initial. Recommandation : audit dédié en Phase 7.

---

## 6. ARCHITECTURE RECOMMANDÉE (Phase 3 — Cartographie cible)

Après application des fusions ci-dessus, l'architecture publique se stabilise ainsi (aucune page nouvelle) :

```
KILTIKONET (site public)
│
├── / (Homepage KiltikonetHome — canonique)
│
├── INSTITUTION
│   ├── /a-propos             (À propos — canon. FR ; /about = 301)
│   ├── /gouvernance          (Story + Adhésion sous /gouvernance/adhesion)
│   ├── /partenaires          (canon. FR ; /partnership = 301)
│   ├── /rejoindre            (Devenir opérateur territorial / Franchisé)
│   ├── /contact              (⚠️ après fix B1 : ContactKiltikonet)
│   └── /support              (SupportPage — différent de contact)
│
├── CULTURE CONNECT
│   ├── /culture-connect      (Page mère)
│   ├── /culture-connect/2026 (Bilan édition)
│   ├── /culture-connect/2027 (Annonce édition)
│   ├── /programme            (Programme CC2026 en cours)
│   └── /concert              (QR / campagne CC2026)
│
├── INFRASTRUCTURE
│   └── /infrastructure       (FREK-ID, KORA, LabelOS, Agent Factory, Laurentia)
│
├── RÉSEAU (⚠️ dépend décision R20 sur /reseau)
│   ├── /rejoindre            (Formulaire opérateur)
│   ├── /partenaires          (Partenaires stratégiques)
│   └── /reseau (?)           (⏸ VALIDATION REQUIRED — actuellement broken)
│
├── OBSERVATORY
│   ├── /observatory          (Public read-only dashboard)
│   ├── /observatory/founder  (Privé)
│   └── /now                  (État actuel — canon. ; /maintenant = 301)
│
├── ADHÉSION / COMMERCE
│   ├── /pricing OU /tarifs   (⏸ VALIDATION D5)
│   ├── /catalogue            (canon. FR ; /catalog = 301)
│   ├── /jetons               (Jetons CC2026)
│   ├── /badge-inscription    (Formulaire badge)
│   ├── /activer-badge/:qr    (QR physique)
│   ├── /badge/:id            (Scan badge)
│   ├── /mon-espace           (Profil user)
│   └── /participant/:id      (Profil public participant)
│
├── AUTH & ONBOARDING
│   ├── /auth/magic/:token
│   ├── /invite/:token
│   ├── /confirmation
│   └── /partenaire/confirmation
│
├── RESSOURCES
│   ├── /faq                  (canon. ; /aide = 301)
│   ├── /support              (Support ≠ Contact)
│   ├── /appel-2026           (Campagne, orphelin voulu)
│   └── /accessibilite
│
├── LÉGAL
│   ├── /mentions-legales
│   ├── /confidentialite
│   ├── /cgu
│   └── /cookies
│
├── CMS DYNAMIQUE
│   └── /p/:slug              (Pages créées par CMS Admin)
│
├── LEGACY (isolé volontairement)
│   └── /legacy-cc2026
│
└── ESPACE PRO
    ├── /pro                  (Omega — nouvelle app immersive)
    └── /espace-pro/connexion (Login pro)

────────────────────────────────────────────
ROUTES PRIVÉES (non indexées, gated)
────────────────────────────────────────────

/admin, /admin/cms, /admin/cms/visual-editor, /admin/accreditation,
/admin/performance, /admin/finance, /admin/mobile, /admin/analytics/*,
/admin/ai-agents, /admin/core, /admin/core/messages, /admin/core/reseau,
/smart-engine, /smart-engine-3d, /admin/dashboard-3d

/workspace/{laurent,twina,gwen,kaige,alirio,wudy,fabrice,analyst,coleen}
/dashboard-cc2026(/{laurent,twina,gwen,fabrice,kaige,alirio,wudy})

/gouvernance/profil, /gouvernance/paiement/:numMembre,
/gouvernance/repertoire/:numMembre

/observatory/founder
/scanner-cc2026
/scan  (PWA fullscreen)
```

---

## 7. RAPPORT FINAL (Phase 10)

### Routes
- **94** routes totales déclarées dans App.js
- **74** canoniques
- **1** legacy volontairement conservée (`/legacy-cc2026`)
- **11** doublons (fusion proposée via 301)
- **4** orphelines (0 lien entrant frontend — vérifier campagnes externes)
- **32** privées
- **60** publiques
- **5** routes à rediriger via `<Navigate>` (R21 + R22 : `/espace-pro*`, `/admin/participants`, `/admin/settings`)
- **1** bug de routing (B1 : `/contact` redéfini)

### Liens
- **169** liens internes analysés
- **~130** valides (~77%)
- **9** cassés (5 destinations distinctes manquantes)
- **6** mal routés (tous liés au bug B1)
- **8** legacy à moderniser (href→Link, .html→routes)
- **11** doublons SEO à corriger via 301

### Données
- **13 systèmes** identifiés dont dépendent des routes existantes (Smart Engine, Observatory, Stripe, Analytics, CMS, Registrations, Badges, Jetons, Auth, Workspaces, Adhésion, ProSpace, Scanner).
- **Aucune route ne peut être supprimée sans purge d'analyse** de sa collection MongoDB associée.
- **Risque de fusion** : nul si on utilise `<Navigate>` (les URLs anciennes restent joignables, aucune donnée n'est purgée).

### Architecture
- **Actuelle** : 94 routes avec ~15 doublons SEO, 5 destinations manquantes, 3 footers concurrents, 1 bug critique de routing.
- **Recommandée** : 94 routes conservées + `<Navigate>` pour redirections + 1 seul footer canonique + `/contact` réparé + `/reseau` statué.
- **Fusions proposées** : 30 actions (R1-R30) — toutes non destructives, toutes réversibles.

---

## 8. VALIDATION REQUISE

⛔ **Aucune de ces actions ne sera exécutée avant validation utilisateur, une par une.**

Merci d'indiquer, pour chaque ligne R1-R30 :
- ✅ APPROVED
- ❌ REJECTED
- 🔄 MODIFIED (avec précision)

Ou globalement :
- « Applique R1-R19 (fusions safes) », puis on discute R20-R30 (décisions produit).

---

**Fin du plan.**
