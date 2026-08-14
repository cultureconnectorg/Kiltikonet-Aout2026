# KILTIKONET — ROUTE MAP (Audit exhaustif — Lecture seule)

> **Généré le** : 2026-02 · **Source** : `/app/frontend/src/App.js` (460 lignes) + scan de tous les composants  
> **Statut** : AUDIT ONLY — aucune modification de code appliquée  
> **Portée** : 94 routes déclarées + routes référencées mais non déclarées

---

## 🚨 BUGS CRITIQUES DÉTECTÉS (à valider avant toute action)

| # | Bug | Détail | Impact |
|---|-----|--------|--------|
| **B1** | Doublon de définition `/contact` | `App.js:335` déclare `/contact → ContactKiltikonet`. **`App.js:423` redéfinit `/contact → SupportPage`**. React Router prend la 2ème → **ContactKiltikonet est INACCESSIBLE** malgré tous les liens qui y pointent. | 🔴 CRITIQUE — la page ContactKiltikonet.jsx est un fantôme. Toutes les mentions "Contact" mènent en réalité à SupportPage. |
| **B2** | Route `/reseau` référencée mais NON définie | `KiltikonetHome.jsx:289` : `<Link to="/reseau">` dans le menu principal de la homepage → tombe sur `NotFound` (catch-all `*`). | 🔴 CRITIQUE — lien de nav principale de la home cassé. |
| **B3** | Route `/espace-pro` (sans suffixe) référencée mais NON définie | `MobileBottomNav.jsx:146,175`, `pro/MessagesPage.jsx:135`, `pro/NetworkPage.jsx:237`, `pro/SoutenirSheet.jsx:162` → **tous 404**. Seul `/espace-pro/connexion` existe. | 🟠 IMPORTANT — parcours pro cassé sur mobile et actions internes. |
| **B4** | Route `/espace-pro/messages` référencée mais NON définie | `pro/NetworkPage.jsx:429` → 404. | 🟠 IMPORTANT |
| **B5** | Routes `/admin/participants` et `/admin/settings` référencées mais NON définies | `MobileBottomNav.jsx:77,78` (nav admin mobile) → 404. | 🟠 IMPORTANT |
| **B6** | `/register-pro` sans lien entrant | Défini mais orphelin (0 référence). | 🟡 ORPHELIN |
| **B7** | `<a href="/legal/*.html">` sur homepage | `KiltikonetHome.jsx:657-659` utilise les fichiers statiques `/public/legal/*.html` (qui existent) au lieu des routes React `/mentions-legales`, `/confidentialite`, `/cgu`. **Doublon URL SEO**. | 🟡 SEO |

**⚠️ MISSING DESTINATION — VALIDATION REQUIRED** pour B2, B3, B4, B5 :  
Ne PAS créer de pages. Décision à prendre :  
→ soit rediriger vers une route canonique existante,  
→ soit supprimer le lien.

---

## 1. ROUTES DÉFINIES DANS `App.js` (94 routes)

### 1.1 Public — Institutionnel & Vitrine (CANONICAL)

| Route | Composant | Statut | Utilisée par (liens entrants) | Action recommandée |
|-------|-----------|--------|-------------------------------|--------------------|
| `/` | `KiltikonetHome` | ✅ **CANONICAL** · PUBLIC | Logo (Header, KiltikonetHome, NotFound, IntroWrapper), redirections omega, CultureConnect2026, CultureConnect2027, Infrastructure, Observatory, ObservatoryFounder, MobileBottomNav, plusieurs `navigate('/')` | ✅ **KEEP** — homepage canonique |
| `/culture-connect` | `CultureConnect` | ✅ **CANONICAL** · PUBLIC | Header, KiltikonetHome, CultureConnect2026, CultureConnect2027, InstitutionalFooter | ✅ KEEP |
| `/culture-connect/2026` | `CultureConnect2026` | ✅ **CANONICAL** · PUBLIC | KiltikonetHome, InstitutionalFooter | ✅ KEEP |
| `/culture-connect/2027` | `CultureConnect2027` | ✅ **CANONICAL** · PUBLIC | KiltikonetHome, CultureConnect2026, InstitutionalFooter | ✅ KEEP |
| `/infrastructure` | `Infrastructure` | ✅ **CANONICAL** · PUBLIC | Header, KiltikonetHome ×2, CultureConnect, InstitutionalFooter | ✅ KEEP |
| `/rejoindre` | `Rejoindre` | ✅ **CANONICAL** · PUBLIC | APropos, ContactKiltikonet, Header, CultureConnect2027, Infrastructure, InstitutionalFooter | ✅ KEEP |
| `/contact` | `SupportPage` (BUG — devrait être `ContactKiltikonet`) | 🔴 **BUG** · PUBLIC | APropos, KiltikonetHome ×2, Rejoindre, InstitutionalFooter, Header | **RÉSOUDRE B1** — supprimer la 2ème déclaration ligne 423 |
| `/a-propos` | `APropos` | ✅ **CANONICAL** · PUBLIC | Header (via footer?), KiltikonetHome, InstitutionalFooter | ✅ KEEP |
| `/about` | `APropos` | 🟡 **DUPLICATE** · PUBLIC | 0 lien entrant interne | ⚠️ REDIRECT 301 → `/a-propos` (garder pour SEO EN) |
| `/now` | `NowPage` | ✅ **CANONICAL** · PUBLIC | KiltikonetHome, InstitutionalFooter | ✅ KEEP |
| `/maintenant` | `NowPage` | 🟡 **DUPLICATE** · PUBLIC | 0 lien entrant | ⚠️ REDIRECT 301 → `/now` (garder alias FR) ou supprimer |
| `/gouvernance` | `GouvernanceStoryPage` | ✅ **CANONICAL** · PUBLIC | Header, APropos, GouvernanceConfirmation, GouvernanceProfil ×2, InstitutionalFooter | ✅ KEEP |
| `/gouvernance/adhesion` | `GouvernancePage` | ✅ CANONICAL · PUBLIC | GouvernanceStoryPage | ✅ KEEP |
| `/gouvernance/candidater` | `GouvernanceCandidater` | ✅ CANONICAL · PUBLIC | (via story) | ✅ KEEP |
| `/gouvernance/confirmation` | `GouvernanceConfirmation` | ✅ CANONICAL · PUBLIC | Post-paiement | ✅ KEEP |
| `/gouvernance/profil` | `GouvernanceProfil` | ✅ CANONICAL · PRIVATE (membre) | GouvernancePaiement ×3, GouvernanceRepertoire ×3 | ✅ KEEP |
| `/gouvernance/paiement/:numMembre` | `GouvernancePaiement` | ✅ CANONICAL · PRIVATE | (via profil) | ✅ KEEP |
| `/gouvernance/repertoire/:numMembre` | `GouvernanceRepertoire` | ✅ CANONICAL · PRIVATE | (via profil) | ✅ KEEP |
| `/partenaires` | `PartnershipPage` | ✅ **CANONICAL** · PUBLIC | Header, InstitutionalFooter, PartnerConfirmation ×2 | ✅ KEEP |
| `/partnership` | `PartnershipPage` | 🟡 **DUPLICATE** · PUBLIC | LandingPage (legacy CC2026) | ⚠️ REDIRECT 301 → `/partenaires` (garder pour SEO EN + legacy) |
| `/partenaire/confirmation` | `PartnerConfirmation` | ✅ CANONICAL · PUBLIC | (post-formulaire) | ✅ KEEP |
| `/appel-2026` | `AppelPage` | 🟢 **CANONICAL** · PUBLIC (contextuel) | 0 lien entrant frontend | 🟡 ORPHAN — utilisé par campagne externe ? Vérifier avant redirection |
| `/accessibilite` | `AccessibilitePage` | ✅ CANONICAL · PUBLIC | InstitutionalFooter, LegalFooter | ✅ KEEP |
| `/faq` | `FAQPage` | ✅ CANONICAL · PUBLIC | LandingPage (`href`), MobileBottomNav | ✅ KEEP |
| `/aide` | `FAQPage` | 🟡 **DUPLICATE** · PUBLIC | 0 lien entrant | ⚠️ REDIRECT 301 → `/faq` |
| `/support` | `SupportPage` | ✅ CANONICAL · PUBLIC | LandingPage, FAQPage | ✅ KEEP (mais voir B1) |
| `/programme` | `ProgramPage` | ✅ CANONICAL · PUBLIC (CC2026) | LandingPage, MobileBottomNav | ✅ KEEP |
| `/concert` | `ConcertPage` | ✅ CANONICAL · PUBLIC (CC2026) | 0 lien entrant frontend | 🟡 ORPHAN — accès direct via QR/campagne ? |

### 1.2 Tarifs & Inscription — Doublons massifs

| Route | Composant | Statut | Liens entrants | Action recommandée |
|-------|-----------|--------|----------------|--------------------|
| `/pricing` | `PricingPage` | 🟡 **CANONICAL** · PUBLIC | LandingPage ×3, RegistrationForm | ✅ KEEP (URL primaire EN) |
| `/tarifs` | `PricingPage` | 🟡 **DUPLICATE** · PUBLIC | ConcertPage | ⚠️ REDIRECT 301 → `/pricing` OU garder si SEO FR fort |
| `/register` | `PricingPage` | 🟡 **DUPLICATE** · PUBLIC | 0 lien | ⚠️ REDIRECT 301 → `/pricing` |
| `/inscription` | `PricingPage` | 🟡 **DUPLICATE** · PUBLIC | 0 lien direct | ⚠️ REDIRECT 301 → `/pricing` (⚠️ vérifier campagnes externes) |
| `/catalogue` | `CatalogPage` | ✅ **CANONICAL** · PUBLIC | Header, MobileBottomNav | ✅ KEEP |
| `/catalog` | `CatalogPage` | 🟡 **DUPLICATE** · PUBLIC | ParticipantProfile ×2 | ⚠️ REDIRECT 301 → `/catalogue` |
| `/confirmation` | `ConfirmationScreen` | ✅ CANONICAL · PUBLIC | (post-paiement) | ✅ KEEP |

### 1.3 Badges & Jetons (CC2026)

| Route | Composant | Statut | Liens entrants | Action |
|-------|-----------|--------|----------------|--------|
| `/badge/:id` | `BadgeScan` | ✅ CANONICAL · PUBLIC (QR scan) | Générés par QR codes physiques | ✅ KEEP |
| `/badge-scan` | `BadgeScan` | 🟡 DUPLICATE · PUBLIC | 0 lien | ⚠️ REDIRECT ou keep pour fallback QR |
| `/activer-badge/:qrToken` | `BadgeActivation` | ✅ CANONICAL · PUBLIC | QR badges physiques | ✅ KEEP |
| `/badge-inscription` | `BadgeInscription` | ✅ CANONICAL · PUBLIC | (formulaire badge) | ✅ KEEP |
| `/register-pro` | `RegistrationForm` | 🟡 **ORPHAN** · PUBLIC | 0 lien entrant | ⚠️ Vérifier campagne externe avant décision |
| `/jetons` | `JetonsPage` | ✅ CANONICAL · PUBLIC | UserDashboard | ✅ KEEP |
| `/jetons/confirmation` | `JetonsPage` | 🟡 DUPLICATE · PUBLIC | Post-paiement Stripe? | ✅ KEEP (route de retour Stripe probable) |
| `/mon-espace` | `UserDashboard` | ✅ CANONICAL · PRIVATE | Header, BadgeInscription, ConfirmationScreen | ✅ KEEP |
| `/participant/:participantId` | `ParticipantProfile` | ✅ CANONICAL · PUBLIC (profil public) | (généré) | ✅ KEEP |

### 1.4 Observatory

| Route | Composant | Statut | Liens entrants | Action |
|-------|-----------|--------|----------------|--------|
| `/observatory` | `Observatory` | ✅ **CANONICAL** · PUBLIC | KiltikonetHome ×5, ObservatoryFounder ×2 | ✅ KEEP |
| `/observatory/founder` | `ObservatoryFounder` | ✅ CANONICAL · PRIVATE (founder) | (accès direct) | ✅ KEEP |

**⚠️ Note produit** : L'utilisateur a remis en cause le statut public d'Observatory. Recommandation :  
→ Garder `/observatory` public (dashboard read-only aggregate) — badge visuel "Public read-only" à ajouter.  
→ `/observatory/founder` reste privé (données détaillées).

### 1.5 Admin & Smart Engine

| Route | Composant | Statut | Action |
|-------|-----------|--------|--------|
| `/admin` | `AdminDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/dashboard-3d` | `Dashboard3D` (lazy) | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/cms` | `CMSAdmin` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/cms/visual-editor` | `VisualEditor` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/accreditation` | `AccreditationSystem` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/performance` | `PerformanceDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/finance` | `AdminFinanceDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/mobile` | `AdminMobileDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/terrain` | `AdminMobileDashboard` | 🟡 DUPLICATE · PRIVATE | ⚠️ REDIRECT 301 → `/admin/mobile` (garder alias sémantique) |
| `/admin/analytics/jetons` | `JetonsAnalyticsDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/analytics/site` | `SiteAnalyticsDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/ai-agents` | `AIAgentsDashboard` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/core` | `ProSpaceDashboard` | ✅ CANONICAL · PRIVATE (super-admin) | ✅ KEEP |
| `/admin/core/messages` | `MessagesPage` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/admin/core/reseau` | `NetworkStandalonePage` | ✅ CANONICAL · PRIVATE | ✅ KEEP |
| `/smart-engine` | `SmartEngineDashboard` | ✅ CANONICAL · SYSTEM | ✅ KEEP |
| `/smart-engine-3d` | `SmartEngine3D` (lazy) | ✅ CANONICAL · SYSTEM | ✅ KEEP |

### 1.6 Workspaces (9 collaborateurs)

Toutes CANONICAL · PRIVATE. Aucune fusion possible (isolation par utilisateur).

| Route | Composant | Rôle protégé |
|-------|-----------|--------------|
| `/workspace/laurent` | `WorkspaceLaurent` | founder |
| `/workspace/twina` | `WorkspaceTwina` | design |
| `/workspace/gwen` | `WorkspaceGwen` | event |
| `/workspace/kaige` | `WorkspaceKaige` | press |
| `/workspace/alirio` | `WorkspaceAlirio` | business |
| `/workspace/wudy` | `WorkspaceWudy` | finance |
| `/workspace/fabrice` | `WorkspaceFabrice` | captions |
| `/workspace/analyst` | `WorkspaceAnalyst` | analyst |
| `/workspace/coleen` | `ColeenWorkspace` | partnerships |

### 1.7 Dashboards CC2026 (Collaboratifs)

Toutes CANONICAL · PRIVATE. Un dashboard par membre + un admin.

| Route | Composant | Workspace ID | Rôle |
|-------|-----------|--------------|------|
| `/dashboard-cc2026` | `DashboardCC2026` | CC2026admin | admin, design |
| `/dashboard-cc2026/laurent` | idem | LC2026 | founder |
| `/dashboard-cc2026/twina` | idem | Twina2026 | design |
| `/dashboard-cc2026/gwen` | idem | Gwen2026 | event |
| `/dashboard-cc2026/fabrice` | idem | Fabrice2026 | captions |
| `/dashboard-cc2026/kaige` | idem | Kaige2026 | press |
| `/dashboard-cc2026/alirio` | idem | Alirio2026 | business |
| `/dashboard-cc2026/wudy` | idem | Wudy2026 | finance |

### 1.8 Espace Pro (Omega + Legacy)

| Route | Composant | Statut | Note |
|-------|-----------|--------|------|
| `/pro` | `ProSplashWrapper` (Omega) | ✅ **CANONICAL** · PUBLIC entry, PRIVATE app | ✅ KEEP — hors AppLayout (fullscreen) |
| `/espace-pro/connexion` | `ProSpaceLogin` | ✅ CANONICAL · PUBLIC | Login pour /pro |
| `/espace-pro` | ❌ **NON DÉFINI** | 🔴 **MISSING** | Référencé 3× (MobileBottomNav, NetworkPage, MessagesPage). **VALIDATION REQUIRED**. |
| `/espace-pro/messages` | ❌ **NON DÉFINI** | 🔴 **MISSING** | Référencé par NetworkPage. Devrait probablement rediriger vers `/pro?section=messages`. **VALIDATION REQUIRED**. |
| `/reseau` | ❌ **NON DÉFINI** | 🔴 **MISSING** | Référencé par la nav principale de KiltikonetHome. **VALIDATION REQUIRED** : créer une route dédiée au Kiltikonet Network ? Ou pointer vers `/rejoindre` (parcours actuel des franchisés) ? |

### 1.9 Scanner & PWA

| Route | Composant | Statut | Note |
|-------|-----------|--------|------|
| `/scan` | `ScanApp` | ✅ CANONICAL · SYSTEM (fullscreen PWA) | ✅ KEEP — hors AppLayout |
| `/scanner-cc2026` | `ScannerCC2026` | ✅ CANONICAL · PRIVATE (staff) | ✅ KEEP |

### 1.10 Auth & Onboarding

| Route | Composant | Statut |
|-------|-----------|--------|
| `/auth/magic/:token` | `MagicLinkPage` | ✅ CANONICAL · SYSTEM |
| `/invite/:token` | `InvitePage` | ✅ CANONICAL · SYSTEM |

### 1.11 Legal & CMS Dynamique

| Route | Composant | Statut |
|-------|-----------|--------|
| `/mentions-legales` | `MentionsLegales` | ✅ CANONICAL · PUBLIC |
| `/confidentialite` | `PolitiqueConfidentialite` | ✅ CANONICAL · PUBLIC |
| `/cgu` | `CGU` | ✅ CANONICAL · PUBLIC |
| `/cookies` | `Cookies` | ✅ CANONICAL · PUBLIC |
| `/p/:slug` | `DynamicPage` | ✅ CANONICAL · PUBLIC (CMS) |

### 1.12 Legacy

| Route | Composant | Statut | Action |
|-------|-----------|--------|--------|
| `/legacy-cc2026` | `LandingPage` | 🟢 **LEGACY-KEEP** · PUBLIC | Kept as reference. 0 lien entrant. ✅ KEEP pour historique. |

### 1.13 Catch-all

| Route | Composant |
|-------|-----------|
| `*` | `NotFound` |

---

## 2. ROUTES RÉFÉRENCÉES MAIS NON DÉFINIES (Missing Destinations)

**⚠️ MISSING DESTINATION — VALIDATION REQUIRED**

| Route manquante | Référencée par | Suggestion |
|-----------------|----------------|------------|
| `/reseau` | `KiltikonetHome.jsx:289` (menu nav home) | Point d'entrée public Kiltikonet Network (franchisés / opérateurs territoriaux). **Alternatives à valider :** (a) rediriger vers `/rejoindre` ; (b) rediriger vers `/gouvernance` ; (c) créer une nouvelle route dédiée (interdit par embargo). |
| `/espace-pro` | `MobileBottomNav.jsx:146,175`, `pro/MessagesPage.jsx:135`, `pro/NetworkPage.jsx:237`, `pro/SoutenirSheet.jsx:162` | Redirection vers `/pro` (Omega Espace Pro nouveau) ? |
| `/espace-pro/messages` | `pro/NetworkPage.jsx:429` | Rediriger vers `/pro?section=messages` ou `/admin/core/messages` selon contexte |
| `/admin/participants` | `MobileBottomNav.jsx:77` (nav admin mobile) | Rediriger vers `/admin` ou `/admin/mobile` |
| `/admin/settings` | `MobileBottomNav.jsx:78` (nav admin mobile) | Rediriger vers `/admin` |

---

## 3. STATISTIQUES

| Catégorie | Nombre |
|-----------|--------|
| **Routes définies dans App.js** | 94 |
| **Routes canoniques** | 74 |
| **Doublons** (même composant, URLs multiples) | 11 |
| **Legacy (à conserver)** | 1 |
| **Orphelines** (0 lien entrant frontend) | 3 (`/appel-2026`, `/concert`, `/register-pro`) |
| **Routes privées** (auth requise) | 32 (admin + workspaces + dashboards + gouvernance profil) |
| **Routes publiques** | 60 |
| **Routes système / API** (auth, scan, magic-link) | 4 |
| **BUGS de routing** | 1 (`/contact` écrasé) |
| **Missing destinations** (référencées mais non définies) | 5 |

---

## 4. DÉPENDANCES DONNÉES (Phase 5)

Avant toute suppression, ces routes touchent des systèmes existants — **NE PAS FUSIONNER SANS ANALYSE** :

| Route | Système lié | Collection MongoDB |
|-------|-------------|--------------------|
| `/badge/:id`, `/badge-scan`, `/activer-badge/:qrToken` | Smart Engine, Analytics | `badges`, `activation_events` |
| `/jetons`, `/jetons/confirmation` | Stripe + Backend jetons | `jetons_transactions` |
| `/participant/:id` | Registrations | `registrations` |
| `/observatory`, `/observatory/founder` | Observatory Read-only | `analytics_events`, agrégats |
| `/smart-engine`, `/smart-engine-3d` | Smart Engine core | Multiple |
| `/workspace/*` | Workspaces logs | `workspace_activities` |
| `/dashboard-cc2026/*` | Workspaces CC2026 | idem |
| `/gouvernance/*` | Adhésion membres | `memberships`, Stripe |
| `/admin/core/*` | ProSpace legacy | `pro_users`, `messages` |
| `/auth/magic/:token` | Magic link auth | `magic_tokens` |
| `/invite/:token` | Invitations | `invitations` |
| `/scan`, `/scanner-cc2026` | Scanner PWA | `scan_events` |
| `/p/:slug` | CMS dynamique | `cms_pages` |

**Aucune route ne doit être supprimée sans purge d'analyse des collections associées.**

---

## 5. RECOMMANDATIONS DE FUSION (à valider une par une)

Voir `/app/memory/KILTIKONET_REDIRECT_PLAN.md`.

Aucune fusion destructive proposée. Toutes les fusions passent par redirection 301 côté React Router (`<Navigate to="..." replace />`).
