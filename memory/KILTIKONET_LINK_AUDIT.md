# KILTIKONET — LINK AUDIT (Scan exhaustif de tous les liens internes)

> **Généré le** : 2026-02 · **Portée** : 169 occurrences de `to=`, `href=`, `navigate()`, `window.location`  
> **Sources scannées** : tous les `.jsx` et `.js` de `/app/frontend/src/`  
> **Statut** : AUDIT ONLY — aucune correction appliquée

---

## 🔴 BROKEN — Destinations inexistantes (5 problèmes distincts, 9 occurrences)

| # | Source | Lien actuel | Destination attendue | Problème | Destination canonique proposée | Action |
|---|--------|-------------|----------------------|----------|-------------------------------|--------|
| L1 | `components/KiltikonetHome.jsx:289` | `to="/reseau"` | Page réseau Kiltikonet Network | **BROKEN** : `/reseau` n'existe pas dans App.js | ⚠️ VALIDATION REQUIRED — 3 options : `/rejoindre` (parcours actuel), `/gouvernance` (network adhésion), ou route dédiée `/network` (interdit par embargo) | ⏸ Attendre décision utilisateur |
| L2 | `components/MobileBottomNav.jsx:146` | `navigate('/espace-pro?section=...')` | Section de l'app Pro | **BROKEN** : `/espace-pro` sans suffixe n'existe pas | `/pro` (Omega Espace Pro) avec `?section=` géré côté ProApp | ⏸ VALIDATION REQUIRED |
| L2b | `components/MobileBottomNav.jsx:175` | `path: '/espace-pro'` | Espace Pro | idem L2 | idem L2 | ⏸ VALIDATION REQUIRED |
| L2c | `components/MobileBottomNav.jsx:177` | `path: '/espace-pro/connexion'` | Login pro | ✅ **VALIDE** (route existe) | — | ✅ KEEP |
| L3 | `components/pro/MessagesPage.jsx:135` | `navigate('/espace-pro')` | App pro | **BROKEN** | `/pro` | ⏸ VALIDATION REQUIRED |
| L4 | `components/pro/NetworkPage.jsx:237` | `navigate('/espace-pro')` | App pro | **BROKEN** | `/pro` | ⏸ VALIDATION REQUIRED |
| L5 | `components/pro/NetworkPage.jsx:429` | `navigate('/espace-pro/messages')` | Messages pro | **BROKEN** | `/admin/core/messages` (admin) OU `/pro?section=messages` | ⏸ VALIDATION REQUIRED |
| L6 | `components/pro/SoutenirSheet.jsx:162` | `href="/espace-pro?section=shop&category=jetons"` | Espace Pro Shop | **BROKEN** | `/pro?section=shop&category=jetons` | ⏸ VALIDATION REQUIRED |
| L7 | `components/MobileBottomNav.jsx:77` | `path: '/admin/participants'` | Liste participants (nav admin mobile) | **BROKEN** : route inexistante | `/admin` ou une section de `/admin/mobile` | ⏸ VALIDATION REQUIRED |
| L8 | `components/MobileBottomNav.jsx:78` | `path: '/admin/settings'` | Config admin mobile | **BROKEN** : route inexistante | `/admin` ou `/admin/mobile` | ⏸ VALIDATION REQUIRED |

---

## 🟠 MISROUTED — Bon nom, mais mène à un mauvais endroit (1 problème critique)

| # | Source | Lien actuel | Résolution actuelle | Résolution attendue | Action |
|---|--------|-------------|---------------------|---------------------|--------|
| M1 | Tous les liens `to="/contact"` (APropos, KiltikonetHome ×2, Rejoindre, InstitutionalFooter) | `to="/contact"` | **`SupportPage`** (à cause de la 2ème déclaration `App.js:423` qui écrase la 1ère) | `ContactKiltikonet` (déclaration `App.js:335`) | 🔴 **CRITIQUE — Résoudre B1** : supprimer la ligne 423 de `App.js` (`<Route path="/contact" element={<SupportPage />} />`) qui écrase la route contact institutionnelle |

---

## 🟡 LEGACY — Anciens chemins qui devraient pointer vers canonique (8 problèmes)

| # | Source | Lien actuel | Destination réelle (existe) | Destination canonique | Action recommandée |
|---|--------|-------------|-----------------------------|----------------------|-------------------|
| G1 | `components/KiltikonetHome.jsx:657` | `<a href="/legal/mentions-legales.html">` | Fichier statique HTML (existe dans `/public/legal/`) | Route React `/mentions-legales` | Remplacer par `<Link to="/mentions-legales">` |
| G2 | `components/KiltikonetHome.jsx:658` | `<a href="/legal/politique-confidentialite.html">` | Fichier statique HTML | `/confidentialite` | Remplacer par `<Link to="/confidentialite">` |
| G3 | `components/KiltikonetHome.jsx:659` | `<a href="/legal/cgu.html">` | Fichier statique HTML | `/cgu` | Remplacer par `<Link to="/cgu">` |
| G4 | `components/LandingPage.jsx:503` | `href="/faq"` (avec rechargement page) | `/faq` (existe) | idem | Convertir en `<Link to="/faq">` (SPA) |
| G5 | `components/LandingPage.jsx:504` | `href="/support"` (avec rechargement) | `/support` (existe) | idem | Convertir en `<Link to="/support">` |
| G6 | `components/ParticipantProfile.jsx:81,99` | `to="/catalog"` | `CatalogPage` (existe, doublon) | `/catalogue` | Rediriger vers canonique |
| G7 | `components/ConcertPage.jsx:317` | `navigate('/tarifs')` | `PricingPage` (existe, doublon) | `/pricing` | Décider canonique FR ou EN |
| G8 | `components/LandingPage.jsx:733` | `navigate('/partnership')` | `PartnershipPage` (existe, doublon) | `/partenaires` | Rediriger vers canonique |

---

## 🟣 DUPLICATE — Plusieurs URLs affichent le même contenu (11 groupes)

| # | Groupe URL | Composant | Meilleure valeur canonique |
|---|------------|-----------|---------------------------|
| D1 | `/a-propos` ↔ `/about` | `APropos` | **`/a-propos`** (FR primaire) |
| D2 | `/now` ↔ `/maintenant` | `NowPage` | **`/now`** (utilisé dans nav home + footer) |
| D3 | `/partenaires` ↔ `/partnership` | `PartnershipPage` | **`/partenaires`** (FR primaire, header) |
| D4 | `/catalogue` ↔ `/catalog` | `CatalogPage` | **`/catalogue`** (FR primaire, header + mobile nav) |
| D5 | `/pricing` ↔ `/tarifs` ↔ `/register` ↔ `/inscription` (4 URLs !) | `PricingPage` | ⚠️ VALIDATION — proposition : **`/pricing`** (EN cohérent avec `/partnership`) OU **`/tarifs`** (FR cohérent avec `/partenaires`) |
| D6 | `/faq` ↔ `/aide` | `FAQPage` | **`/faq`** (universel) |
| D7 | `/admin/mobile` ↔ `/admin/terrain` | `AdminMobileDashboard` | **`/admin/mobile`** (technique) OU garder `/admin/terrain` (sémantique) |
| D8 | `/badge-scan` ↔ `/badge/:id` | `BadgeScan` | **`/badge/:id`** (URL param) |
| D9 | `/observatory` (utilisé 5× dans footer home comme label différent) | `Observatory` | **`/observatory`** (KEEP mais éviter la répétition dans footer home) |
| D10 | `/culture-connect/2026` vs `/legacy-cc2026` (2 pages CC2026 différentes) | `CultureConnect2026` vs `LandingPage` | **`/culture-connect/2026`** est canonique. `/legacy-cc2026` est kept as reference. |
| D11 | `/contact` (route BUG — 2 fois) | `SupportPage` écrase `ContactKiltikonet` | Voir B1/M1 |

---

## 🔵 ORPHAN — Pages existantes sans accès depuis la navigation (3)

| # | Route | Composant | Diagnostic |
|---|-------|-----------|-----------|
| O1 | `/appel-2026` | `AppelPage` | 0 lien entrant frontend. Vérifier si utilisée par une campagne externe / réseaux sociaux avant toute suppression. **NE PAS SUPPRIMER**, marquer noindex si SEO déprécié. |
| O2 | `/concert` | `ConcertPage` | 0 lien entrant. Probablement page CC2026 accessible via QR ou campagne. **NE PAS SUPPRIMER**. |
| O3 | `/register-pro` | `RegistrationForm` | 0 lien entrant. Ancienne inscription CC2026 pro. Vérifier campagnes avant suppression. |
| O4 | `/legacy-cc2026` | `LandingPage` | 0 lien entrant. **Volontaire** : conservé pour référence historique. |

---

## 🟢 VALID — Liens fonctionnels (~130 occurrences, non détaillées)

Tous les liens `to="/culture-connect*"`, `to="/infrastructure"`, `to="/rejoindre"`, `to="/observatory"`, `to="/gouvernance*"`, `to="/mentions-legales"`, `to="/cgu"`, `to="/confidentialite"`, `to="/cookies"`, `to="/accessibilite"`, `to="/mon-espace"`, `to="/jetons"`, `to="/dashboard-cc2026/*"`, `to="/workspace/*"`, `navigate('/')`, `navigate('/admin/*')`, `navigate('/gouvernance/*')` — tous VALID.

---

## 6. AUDIT DES 3 SYSTÈMES DE NAVIGATION

### 6.1 Header (`components/Header.jsx`)

**Composant public utilisé sur toutes les pages sauf** : `/`, `/smart-engine`, `/admin*`, `/badge*`, `/workspace*`, `/dashboard-cc2026*`, `/espace-pro*`, `/pro*`, `/scanner-cc2026`, `/observatory*`, `/now`, `/maintenant`, `/observatory/founder`.

| Lien menu | Route réelle | Route canonique | Statut | Correction proposée |
|-----------|--------------|-----------------|--------|--------------------|
| Accueil | `/` | `/` | ✅ VALID | — |
| Culture Connect | `/culture-connect` | `/culture-connect` | ✅ VALID | — |
| Infrastructure | `/infrastructure` | `/infrastructure` | ✅ VALID | — |
| Gouvernance | `/gouvernance` | `/gouvernance` | ✅ VALID | — |
| Partenaires | `/partenaires` | `/partenaires` | ✅ VALID | — |
| Rejoindre | `/rejoindre` | `/rejoindre` | ✅ VALID | — |
| Contact | `/contact` | ⚠️ Mène à SupportPage (bug B1) | 🔴 BUG | Résoudre B1 |
| **[Dropdown Account]** | | | | |
| Mon Espace | `/mon-espace` | `/mon-espace` | ✅ VALID | — |
| Espace Pro | `/pro` | `/pro` | ✅ VALID | — |
| Admin | `/admin` | `/admin` | 🟠 EXPOSITION | ⚠️ Envisager de masquer si non-authentifié pour ne pas exposer publiquement |

**⚠️ Manque dans le Header :** Aucun point d'entrée vers Kiltikonet Network (franchisés/opérateurs territoriaux) — plainte utilisateur. À résoudre APRÈS validation de `/reseau`.

### 6.2 Footer

**PROBLÈME MAJEUR : 3 footers différents cohabitent**

| Footer | Utilisé par | Contenu | Risque |
|--------|-------------|---------|--------|
| **`InstitutionalFooter.jsx`** | APropos, CultureConnect, CultureConnect2026, CultureConnect2027, Infrastructure, Observatory, NowPage, Rejoindre, ContactKiltikonet, DynamicPage | 5 colonnes : Culture Connect / Institution / Réseau / Légal + Data lineage Observatory | ✅ Le plus stable et institutionnel |
| **`KiltikonetHome.jsx` inline footer** | `/` uniquement | 6 colonnes (dont Observatory ×5 labels différents pointant vers même URL) + liens légaux vers `.html` statiques | 🔴 Redondances internes + doublons SEO |
| **`LegalFooter.jsx`** | LandingPage, ProgramPage, ConcertPage, ProSpaceDashboard, omega/*, ScannerCC2026, CGU/Cookies/MentionsLegales/PolitiqueConfidentialite | Liens légaux uniquement | 🟡 Cohabite avec les autres |

#### Détail Footer institutionnel canonique (`InstitutionalFooter.jsx`)

| Colonne | Lien | Route | Statut |
|---------|------|-------|--------|
| Culture Connect | Page mère | `/culture-connect` | ✅ VALID |
| Culture Connect | Édition 2026 | `/culture-connect/2026` | ✅ VALID |
| Culture Connect | Édition 2027 | `/culture-connect/2027` | ✅ VALID |
| Institution | À propos | `/a-propos` | ✅ VALID |
| Institution | Infrastructure | `/infrastructure` | ✅ VALID |
| Institution | Gouvernance | `/gouvernance` | ✅ VALID |
| Institution | Partenaires | `/partenaires` | ✅ VALID |
| Réseau | Rejoindre | `/rejoindre` | ✅ VALID |
| Réseau | Maintenant | `/now` | ✅ VALID |
| Réseau | Contact | `/contact` | 🔴 BUG B1 (mène à SupportPage) |
| Réseau | contact@kiltikonet.fr | mailto | ✅ VALID |
| Légal | Mentions légales | `/mentions-legales` | ✅ VALID |
| Légal | Confidentialité | `/confidentialite` | ✅ VALID |
| Légal | CGU | `/cgu` | ✅ VALID |
| Légal | Accessibilité | `/accessibilite` | ✅ VALID |

✅ **Recommandation** : `InstitutionalFooter` est le footer canonique. Doit être utilisé partout où le contexte le permet.

**Manque dans InstitutionalFooter** :  
- Colonne "Observatory" (Traces, Données, Signaux, Rapports, API) — actuellement seulement dans KiltikonetHome inline  
- Point d'entrée "Kiltikonet Network / Franchisés" (plainte utilisateur)  
- ⚠️ Ces ajouts ne créent PAS de nouvelles pages, ils réutilisent des routes existantes.

#### Détail Footer inline KiltikonetHome (à consolider)

| Colonne | Lien | Route | Statut | Doublon avec InstitutionalFooter ? |
|---------|------|-------|--------|-----------------------------------|
| Kiltikonet | À propos | `/a-propos` | ✅ VALID | Oui |
| Kiltikonet | **Réseau** | **`/reseau`** | 🔴 **BROKEN** | Non (route absente) |
| Kiltikonet | Culture Connect | `/culture-connect` | ✅ VALID | Oui |
| Kiltikonet | Infrastructure | `/infrastructure` | ✅ VALID | Oui |
| Kiltikonet | Observatory | `/observatory` | ✅ VALID | Non (nouvelle rubrique) |
| Observatory | Traces | `/observatory` | ✅ VALID mais REDONDANT | — |
| Observatory | Données | `/observatory` | ✅ VALID mais REDONDANT | — |
| Observatory | Signaux | `/observatory` | ✅ VALID mais REDONDANT | — |
| Observatory | Rapports | `/observatory` | ✅ VALID mais REDONDANT | — |
| Observatory | API | `/observatory` | ✅ VALID mais REDONDANT | — |
| Ressources | Actualités | `/now` | ✅ VALID | Oui |
| Ressources | Docs | `/infrastructure` | 🟡 MISROUTED (docs ≠ infrastructure) | Recouvrement |
| Ressources | Presse | `/contact` | 🟡 MISROUTED + BUG B1 | — |
| Ressources | Contact | `/contact` | 🔴 BUG B1 | Oui |
| © Kiltikonet | Mentions légales | `/legal/mentions-legales.html` | 🟡 LEGACY (doublon SEO) | — |
| © Kiltikonet | Confidentialité | `/legal/politique-confidentialite.html` | 🟡 LEGACY | — |
| © Kiltikonet | Conditions | `/legal/cgu.html` | 🟡 LEGACY | — |

⚠️ **Recommandation** : consolider ce footer avec `InstitutionalFooter` (une seule source de vérité), en ajoutant les colonnes manquantes (Observatory, Réseau) au composant institutionnel.

### 6.3 MobileBottomNav (`components/MobileBottomNav.jsx`)

Nav mobile fixe en bas, affichée sur mobile uniquement.

#### Nav publique
| Lien | Route | Statut |
|------|-------|--------|
| Accueil | `/` | ✅ VALID |
| Catalogue | `/catalogue` | ✅ VALID |
| Programme | `/programme` | ✅ VALID |
| Espace Pro (non-connecté) | `/espace-pro/connexion` | ✅ VALID |
| Espace Pro (connecté) | `/espace-pro` | 🔴 **BROKEN** (route absente) |

#### Nav admin mobile (quand isInAdminArea + isAdmin)
| Lien | Route | Statut |
|------|-------|--------|
| Accueil | `/admin/mobile` | ✅ VALID |
| Scanner | `/admin/mobile` (action=scan) | ✅ VALID |
| Inscrits | `/admin/participants` | 🔴 **BROKEN** (route absente) |
| Config | `/admin/settings` | 🔴 **BROKEN** (route absente) |

#### Nav pro mobile (quand isInProArea + isPro)
| Lien | Route générée | Statut |
|------|--------------|--------|
| Profil | `/espace-pro?section=profile` | 🔴 **BROKEN** (route racine absente) |
| Réseau | `/espace-pro?section=network` | 🔴 **BROKEN** |
| Offres | `/espace-pro?section=opportunities` | 🔴 **BROKEN** |
| Agenda | `/espace-pro?section=events` | 🔴 **BROKEN** |

⚠️ **VALIDATION REQUIRED** : décider si la nav pro mobile doit désormais pointer vers `/pro?section=...` (Omega) ou si le legacy `/espace-pro` doit être ressuscité comme route alias vers `/pro`.

---

## 7. LIENS VERS ROUTES ADMIN DEPUIS COMPOSANTS PUBLICS

| Source | Cible | Contexte |
|--------|-------|----------|
| `Header.jsx:46` | `/admin` (dropdown Account) | 🟠 Exposition publique de la route admin dans le menu |
| Tous les composants Workspace | `/admin` (bouton retour) | ✅ Contexte privé, OK |
| `PWA install prompt`, `CookieBanner` | Aucun lien admin | ✅ OK |

**Recommandation** : masquer `/admin` du dropdown Header sauf si l'utilisateur est authentifié admin (utiliser `usePermissions`).

---

## 8. STATISTIQUES LINK AUDIT

| Type | Nombre |
|------|--------|
| Liens totaux analysés | 169 |
| 🟢 VALID | ~130 (77%) |
| 🔴 BROKEN | 9 occurrences (6 destinations distinctes) |
| 🟠 MISROUTED | 6 (tous liés à B1 `/contact`) |
| 🟡 LEGACY | 8 |
| 🟣 DUPLICATE (occurrences pointant vers doublons) | ~15 |
| 🔵 ORPHAN (pages sans liens entrants) | 4 |

---

## 9. TOP 5 ACTIONS PRIORITAIRES (à valider une par une)

1. 🔴 **RÉSOUDRE B1** : Supprimer la 2ème déclaration `<Route path="/contact" element={<SupportPage />} />` (App.js:423). Sans cette action, TOUTE la nav vers Contact est cassée. **Aucun risque** (le lien `/support` continuera de fonctionner).
2. 🔴 **STATUER SUR `/reseau`** : Route brisée dans la nav principale de la homepage. Valider une redirection (proposition : `→ /rejoindre`) OU accepter la création d'une route dédiée (levée d'embargo requise).
3. 🔴 **STATUER SUR `/espace-pro` (5 occurrences)** : décider si le legacy `/espace-pro` doit devenir un alias vers `/pro` (Omega) via `<Navigate>`, ou si les composants (`MobileBottomNav`, `pro/*`) doivent être mis à jour pour pointer directement sur `/pro`.
4. 🟠 **Consolider les 3 footers** en un seul `InstitutionalFooter` enrichi (Observatory + colonne Réseau). Retirer les `<a href="/legal/*.html">` de KiltikonetHome (doublon SEO).
5. 🟡 **Redirections 301 pour les doublons** : `/about → /a-propos`, `/maintenant → /now`, `/partnership → /partenaires`, `/catalog → /catalogue`, `/aide → /faq`, etc. Voir `KILTIKONET_REDIRECT_PLAN.md`.
