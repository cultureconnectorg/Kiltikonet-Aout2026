# Atlas — preuves par écran

Source : `Kiltikonet_atlas_reconstruction_corrige_CVLN_iOS(1).xlsx`, feuille **Atlas visuel**, lignes 4–85.
SHA-256 : `225920c59152196c17f36f223dd3c8c642f4bff61b6230fe314cc27a7c616aad`.

**82 écrans recoupés**, **91 chemins nommés conservés**, plus la route 404 `*`. 6 chemins supplémentaires existent dans App.

CURRENT signifie ici : route et composant présents dans le code. La colonne de garde décrit uniquement le montage React. Aucun écran ne reçoit un statut de fonctionnement vérifié par ce contrôle statique.

TARGET et DECISION REQUIRED : voir les décisions référencées dans [la carte des capacités](CURRENT_TARGET_DECISIONS_LEGACY.md). Les classifications du classeur restent des indications de source. LEGACY : `/legacy-cc2026` et les surfaces historiques Pro/CC2026 restent présentes ; leur qualification historique n'autorise aucune suppression.

Network territorial et Academy ont aussi des fondations backend sans écran Atlas dédié. Leur preuve reste décrite dans la carte, D-03 et D-04. Le réseau social Core ci-dessous ne les remplace pas.

| Ligne Atlas | Écran | Routes CURRENT | Source du composant | Garde déclarée dans App | Décision liée |
|---|---|---|---|---|---|
| 4 | Page d’accueil | `/` | [KiltikonetHome](../../frontend/src/components/KiltikonetHome.jsx) | Dans le composant : à vérifier | D-01 |
| 5 | Infrastructure | `/infrastructure` | [Infrastructure](../../frontend/src/components/Infrastructure.jsx) | Dans le composant : à vérifier | D-01 |
| 6 | À propos | `/a-propos` ; `/about` | [APropos](../../frontend/src/components/APropos.jsx) | Dans le composant : à vérifier | D-01 |
| 7 | Rejoindre | `/rejoindre` | [Rejoindre](../../frontend/src/components/Rejoindre.jsx) | Dans le composant : à vérifier | D-01 |
| 8 | Maintenant | `/now` ; `/maintenant` | [NowPage](../../frontend/src/components/NowPage.jsx) | Dans le composant : à vérifier | D-05 |
| 9 | Observatory | `/observatory` | [Observatory](../../frontend/src/components/Observatory.jsx) | Dans le composant : à vérifier | D-05 |
| 10 | Founder Observatory | `/observatory/founder` | [ObservatoryFounder](../../frontend/src/components/ObservatoryFounder.jsx) | Dans le composant : à vérifier | D-05 |
| 11 | Contact institutionnel | `/contact` | [ContactKiltikonet](../../frontend/src/components/ContactKiltikonet.jsx) | Dans le composant : à vérifier | D-01 |
| 12 | Culture Connect — page mère | `/culture-connect` | [CultureConnect](../../frontend/src/components/CultureConnect.jsx) | Dans le composant : à vérifier | D-02 |
| 13 | Culture Connect 2026 | `/culture-connect/2026` | [CultureConnect2026](../../frontend/src/components/CultureConnect2026.jsx) | Dans le composant : à vérifier | D-02 |
| 14 | Culture Connect 2027 | `/culture-connect/2027` | [CultureConnect2027](../../frontend/src/components/CultureConnect2027.jsx) | Dans le composant : à vérifier | D-02 |
| 15 | Ancienne landing CC2026 | `/legacy-cc2026` | [LandingPage](../../frontend/src/components/LandingPage.jsx) | Dans le composant : à vérifier | D-02 |
| 16 | Programme | `/programme` | [ProgramPage](../../frontend/src/components/ProgramPage.jsx) | Dans le composant : à vérifier | D-02 |
| 17 | Concert | `/concert` | [ConcertPage](../../frontend/src/components/ConcertPage.jsx) | Dans le composant : à vérifier | D-02 |
| 18 | Appel 2026 | `/appel-2026` | [AppelPage](../../frontend/src/components/AppelPage.jsx) | Dans le composant : à vérifier | D-02 |
| 19 | Tarifs / inscription | `/pricing` ; `/tarifs` ; `/register` ; `/inscription` | [PricingPage](../../frontend/src/components/PricingPage.jsx) | Dans le composant : à vérifier | D-02 |
| 20 | Catalogue | `/catalogue` ; `/catalog` | [CatalogPage](../../frontend/src/components/CatalogPage.jsx) | Dans le composant : à vérifier | D-02 |
| 21 | Partenariats | `/partnership` ; `/partenaires` | [PartnershipPage](../../frontend/src/components/PartnershipPage.jsx) | Dans le composant : à vérifier | D-02 |
| 22 | Confirmation partenaire | `/partenaire/confirmation` | [PartnerConfirmation](../../frontend/src/components/PartnerConfirmation.jsx) | Dans le composant : à vérifier | D-02 |
| 23 | Confirmation inscription | `/confirmation` | [ConfirmationScreen](../../frontend/src/components/ConfirmationScreen.jsx) | Dans le composant : à vérifier | D-02 |
| 24 | Badge scan dynamique | `/badge/:id` | [BadgeScan](../../frontend/src/components/BadgeScan.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 25 | Badge scan générique | `/badge-scan` | [BadgeScan](../../frontend/src/components/BadgeScan.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 26 | Activation badge | `/activer-badge/:qrToken` | [BadgeActivation](../../frontend/src/components/BadgeActivation.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 27 | Inscription badge | `/badge-inscription` | [BadgeInscription](../../frontend/src/components/BadgeInscription.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 28 | Inscription pro | `/register-pro` | [RegistrationForm](../../frontend/src/components/RegistrationForm.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 29 | Scanner CC2026 | `/scanner-cc2026` | [ScannerCC2026](../../frontend/src/components/omega/ScannerCC2026.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 30 | Scan PWA terrain | `/scan` | [ScanApp](../../frontend/src/components/omega/ScanApp.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 31 | Profil participant | `/participant/:participantId` | [ParticipantProfile](../../frontend/src/components/ParticipantProfile.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 32 | Accréditation admin | `/admin/accreditation` | [AccreditationSystem](../../frontend/src/components/AccreditationSystem.jsx) | ProtectedRoute: admin | D-09 / D-07 |
| 33 | Jetons | `/jetons` ; `/jetons/confirmation` | [JetonsPage](../../frontend/src/components/JetonsPage.jsx) | Dans le composant : à vérifier | D-10 |
| 34 | Mon espace | `/mon-espace` | [UserDashboard](../../frontend/src/components/UserDashboard.jsx) | Dans le composant : à vérifier | D-10 |
| 35 | Gouvernance — histoire | `/gouvernance` | [GouvernanceStoryPage](../../frontend/src/components/GouvernanceStoryPage.jsx) | Dans le composant : à vérifier | D-11 |
| 36 | Adhésion gouvernance | `/gouvernance/adhesion` | [GouvernancePage](../../frontend/src/components/GouvernancePage.jsx) | Dans le composant : à vérifier | D-11 |
| 37 | Candidature gouvernance | `/gouvernance/candidater` | [GouvernanceCandidater](../../frontend/src/components/GouvernanceCandidater.jsx) | Dans le composant : à vérifier | D-11 |
| 38 | Confirmation gouvernance | `/gouvernance/confirmation` | [GouvernanceConfirmation](../../frontend/src/components/GouvernanceConfirmation.jsx) | Dans le composant : à vérifier | D-11 |
| 39 | Profil gouvernance | `/gouvernance/profil` | [GouvernanceProfil](../../frontend/src/components/GouvernanceProfil.jsx) | Dans le composant : à vérifier | D-11 |
| 40 | Paiement gouvernance | `/gouvernance/paiement/:numMembre` | [GouvernancePaiement](../../frontend/src/components/GouvernancePaiement.jsx) | Dans le composant : à vérifier | D-11 |
| 41 | Répertoire membre | `/gouvernance/repertoire/:numMembre` | [GouvernanceRepertoire](../../frontend/src/components/GouvernanceRepertoire.jsx) | Dans le composant : à vérifier | D-11 |
| 42 | Omega Pro | `/pro` | [ProSplashWrapper](../../frontend/src/App.js) | Dans le composant : à vérifier | D-06 |
| 43 | Connexion Pro | `/espace-pro/connexion` | [ProSpaceLogin](../../frontend/src/components/ProSpaceDashboard.jsx) | Dans le composant : à vérifier | D-06 |
| 44 | Ancien Pro Core | `/admin/core` | [ProSpaceDashboard](../../frontend/src/components/ProSpaceDashboard.jsx) | ProtectedRoute: admin, founder | D-06 |
| 45 | Messages Core | `/admin/core/messages` | [MessagesPage](../../frontend/src/components/pro/MessagesPage.jsx) | ProtectedRoute: admin, founder | D-06 |
| 46 | Réseau Core | `/admin/core/reseau` | [NetworkStandalonePage](../../frontend/src/components/pro/NetworkPage.jsx) | ProtectedRoute: admin, founder | D-06 |
| 47 | Admin principal | `/admin` | [AdminDashboard](../../frontend/src/components/AdminDashboard.jsx) | Dans le composant : à vérifier | D-07 |
| 48 | Dashboard 3D | `/admin/dashboard-3d` | [Dashboard3D](../../frontend/src/components/admin/Dashboard3D.jsx) | ProtectedRoute: admin | D-07 |
| 49 | CMS | `/admin/cms` | [CMSAdmin](../../frontend/src/components/CMSAdmin.jsx) | ProtectedRoute: admin | D-07 |
| 50 | Éditeur visuel CMS | `/admin/cms/visual-editor` | [VisualEditor](../../frontend/src/components/VisualEditor.jsx) | ProtectedRoute: admin | D-07 |
| 51 | Performance | `/admin/performance` | [PerformanceDashboard](../../frontend/src/components/admin/PerformanceDashboard.jsx) | ProtectedRoute: admin, founder | D-07 |
| 52 | Finance | `/admin/finance` | [AdminFinanceDashboard](../../frontend/src/components/admin/AdminFinanceDashboard.jsx) | ProtectedRoute: admin, founder, finance | D-07 |
| 53 | Mobile / terrain | `/admin/mobile` ; `/admin/terrain` | [AdminMobileDashboard](../../frontend/src/components/AdminMobileDashboard.jsx) | ProtectedRoute: admin, founder | D-07 |
| 54 | Analytics jetons | `/admin/analytics/jetons` | [JetonsAnalyticsDashboard](../../frontend/src/components/JetonsAnalyticsDashboard.jsx) | ProtectedRoute: admin, founder | D-07 |
| 55 | Analytics site | `/admin/analytics/site` | [SiteAnalyticsDashboard](../../frontend/src/components/SiteAnalyticsDashboard.jsx) | ProtectedRoute: admin, founder | D-07 |
| 56 | Smart Engine | `/smart-engine` | [SmartEngineDashboard](../../frontend/src/pages/Admin/SmartEngineDashboard.jsx) | ProtectedRoute: admin, founder | D-08 / D-07 |
| 57 | Smart Engine 3D | `/smart-engine-3d` | [SmartEngine3D](../../frontend/src/components/admin/SmartEngine3D.jsx) | ProtectedRoute: admin, founder | D-08 / D-07 |
| 58 | Agents IA | `/admin/ai-agents` | [AIAgentsDashboard](../../frontend/src/components/AIAgentsDashboard.jsx) | ProtectedRoute: admin, founder | D-08 / D-07 |
| 59 | Workspace Laurent | `/workspace/laurent` | [WorkspaceLaurent](../../frontend/src/components/workspaces/WorkspaceLaurent.jsx) | ProtectedRoute: founder | D-07 |
| 60 | Workspace Twina | `/workspace/twina` | [WorkspaceTwina](../../frontend/src/components/workspaces/WorkspaceTwina.jsx) | ProtectedRoute: design | D-07 |
| 61 | Workspace Gwen | `/workspace/gwen` | [WorkspaceGwen](../../frontend/src/components/workspaces/WorkspaceGwen.jsx) | ProtectedRoute: event | D-07 |
| 62 | Workspace Kaige | `/workspace/kaige` | [WorkspaceKaige](../../frontend/src/components/workspaces/WorkspaceKaige.jsx) | ProtectedRoute: press | D-07 |
| 63 | Workspace Alirio | `/workspace/alirio` | [WorkspaceAlirio](../../frontend/src/components/workspaces/WorkspaceAlirio.jsx) | ProtectedRoute: business | D-07 |
| 64 | Workspace Wudy | `/workspace/wudy` | [WorkspaceWudy](../../frontend/src/components/workspaces/WorkspaceWudy.jsx) | ProtectedRoute: finance | D-07 |
| 65 | Workspace Fabrice | `/workspace/fabrice` | [WorkspaceFabrice](../../frontend/src/components/workspaces/WorkspaceFabrice.jsx) | ProtectedRoute: captions | D-07 |
| 66 | Workspace Analyst | `/workspace/analyst` | [WorkspaceAnalyst](../../frontend/src/components/workspaces/WorkspaceAnalyst.jsx) | ProtectedRoute: analyst | D-07 |
| 67 | Workspace Coleen | `/workspace/coleen` | [ColeenWorkspace](../../frontend/src/components/workspaces/ColeenWorkspace.jsx) | ProtectedRoute: partnerships | D-07 |
| 68 | Dashboard équipe général | `/dashboard-cc2026` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: admin, design | D-07 |
| 69 | Dashboard Laurent | `/dashboard-cc2026/laurent` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: founder | D-07 |
| 70 | Dashboard Twina | `/dashboard-cc2026/twina` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: design | D-07 |
| 71 | Dashboard Gwen | `/dashboard-cc2026/gwen` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: event | D-07 |
| 72 | Dashboard Fabrice | `/dashboard-cc2026/fabrice` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: captions | D-07 |
| 73 | Dashboard Kaige | `/dashboard-cc2026/kaige` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: press | D-07 |
| 74 | Dashboard Alirio | `/dashboard-cc2026/alirio` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: business | D-07 |
| 75 | Dashboard Wudy | `/dashboard-cc2026/wudy` | [DashboardCC2026](../../frontend/src/components/DashboardCC2026.jsx) | ProtectedRoute: finance | D-07 |
| 76 | Magic link | `/auth/magic/:token` | [MagicLinkPage](../../frontend/src/components/MagicLinkPage.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 77 | Invitation | `/invite/:token` | [InvitePage](../../frontend/src/components/InvitePage.jsx) | Dans le composant : à vérifier | D-09 / D-07 |
| 78 | Mentions légales | `/mentions-legales` | [MentionsLegales](../../frontend/src/components/legal/index.js) | Dans le composant : à vérifier | D-11 |
| 79 | Confidentialité | `/confidentialite` | [PolitiqueConfidentialite](../../frontend/src/components/legal/index.js) | Dans le composant : à vérifier | D-11 |
| 80 | CGU | `/cgu` | [CGU](../../frontend/src/components/legal/index.js) | Dans le composant : à vérifier | D-11 |
| 81 | Cookies | `/cookies` | [Cookies](../../frontend/src/components/legal/index.js) | Dans le composant : à vérifier | D-11 |
| 82 | FAQ | `/faq` ; `/aide` | [FAQPage](../../frontend/src/components/FAQPage.jsx) | Dans le composant : à vérifier | D-11 |
| 83 | Support | `/support` | [SupportPage](../../frontend/src/components/SupportPage.jsx) | Dans le composant : à vérifier | D-11 |
| 84 | Page CMS dynamique | `/p/:slug` | [DynamicPage](../../frontend/src/components/DynamicPage.jsx) | Dans le composant : à vérifier | D-11 |
| 85 | 404 | `*` | [NotFound](../../frontend/src/components/NotFound.jsx) | Dans le composant : à vérifier | D-11 |

## Routes supplémentaires

- `/accessibilite` → `AccessibilitePage`
- `/culture-connect/catalogue` → `CatalogPage`
- `/culture-connect/concert` → `ConcertPage`
- `/culture-connect/inscription` → `PricingPage`
- `/culture-connect/programme` → `ProgramPage`
- `/reseau` → `CompatibilityRedirect`

## Reproduction et limites

`python scripts/rebuild_atlas.py` vérifie les chemins, les composants, les identifiants de workspace explicités dans l'Atlas et la fraîcheur de ce rapport. `python scripts/rebuild_atlas.py --write` le régénère. L'index source n'est pas recalculé depuis le code : il conserve les attentes du classeur fourni.

Les noms d'accès du classeur sont conservés dans [l'index source](ATLAS_SCREEN_INDEX.json). Ils ne sont pas transformés en droits serveur. Le montage de ProSplashWrapper est recoupé ; ce contrôle ne prouve pas les sessions Pro ni le fonctionnement de ses sous-vues.

Les tests exécutés et leurs limites sont dans [REBUILD_VERIFICATION.md](REBUILD_VERIFICATION.md). Les parcours restant à valider et les liens ambigus sont dans [ATLAS_NEXT_STEPS.md](ATLAS_NEXT_STEPS.md).
