# Atlas D-06 — contrat de migration Pro à décider

État lu dans le code du commit `4a928f80c30aa10b3a14d7245701eb429e680828`.
Ce dossier prépare la décision ; aucune migration supplémentaire n'est appliquée.

## CURRENT : deux interfaces et des contrats différents

| Point | Omega `/pro` | Core `/admin/core` |
|---|---|---|
| Montage | `App.js` → `ProSplashWrapper` → `omega/ProApp.jsx` | `ProtectedRoute` (`admin`, `founder`) → `ProSpaceDashboard.jsx` |
| Vue initiale | `currentView = orbital` | `activeSection = feed` |
| Navigation interne | `handleSelect` choisit brain, wallet, shop, feed, inbox, builder, cockpit, agenda, accreditation, profile | Sections feed, brain, reels, profile, vitrine, wallet, shop, settings, archives, governance, console, trading, messages, settings-detail |
| Session d'affichage | Cache `cc2026_pro_session` dans le wrapper ; `useAuth.js` lit ce cache puis prévoit `/api/auth/me` en repli | Garde App vérifiée côté API, puis `useProSession` interne utilise le cache Pro |
| Boutique | `omega/ShopView.jsx` lit `/api/shop/packs` et `/api/shop/products` | `pro/ShopPageEnhanced.jsx` lit `/api/shop/packages` et utilise aussi `DIASPORA_PRODUCTS`, catalogue statique dans le fichier |
| Catégorie initiale | `activeCategory = all` | `category = all` |
| Retour de paiement | Pas de lecture `payment`/`session_id` identifiée dans ShopView | ShopPageEnhanced lit ces paramètres et consulte `/api/shop/checkout/status/:session_id` s'il est monté |
| Paramètres `section=shop&category=jetons` | Pas de lecture identifiée dans ProApp/ShopView | Pas de lecture de ces deux paramètres identifiée dans ProSpaceDashboard/ShopPageEnhanced |

Ces constats sont statiques. Les données marchandes, soldes, fournisseurs et
sessions de production ne sont pas certifiés par cette lecture. La présence de
produits statiques dans Core ne justifie ni leur suppression ni l'affirmation
qu'ils correspondent à des offres effectivement commercialisées.

## Appelants à conserver

- `MobileBottomNav.jsx` et `AccessibilitePage.jsx` utilisent `/espace-pro`.
- `pro/SoutenirSheet.jsx` utilise `/espace-pro?section=shop&category=jetons`.
- `MagicLinkPage.jsx` utilise la redirection fournie par le serveur et un repli
  `/espace-pro`. Le serveur renvoie ce chemin après validation du lien.
- Les retours OAuth et certains retours de rôles du serveur doivent être recoupés
  séparément. Un rôle staff vers `/workspace` ne peut pas être envoyé vers le
  workspace d'une personne choisie par déduction.
- Les liens internes des pages Core Messages/Réseau ont déjà été corrigés vers
  leurs routes Core existantes, sans modification des rôles.

## TARGET proposée, soumise à décision

Une option concrète est de retenir Omega comme destination de l'entrée Pro
générale, tout en conservant les routes et fonctions Core actuelles. Elle exige
plus qu'un alias :

1. Établir la correspondance des appelants avec leurs destinations et leurs droits.
2. Préserver search, hash et state, notamment les retours de connexion et d'achat.
3. Faire consommer explicitement les paramètres de boutique par la destination
   retenue, avec une liste de vues/catégories autorisées et un comportement défini
   pour les paramètres inconnus.
4. Vérifier le retour de paiement côté serveur avant d'afficher une confirmation.
5. Tester les sessions invité/Pro/admin/founder et les données isolées pour chaque
   parcours migré. Ne pas élargir les droits Core par la création d'un alias.

Une autre décision possible consiste à restaurer une entrée Pro Core distincte.
Elle doit alors définir les publics autorisés et conserver Omega. La route
actuelle `/admin/core` n'autorise pas à conclure que tous les utilisateurs Pro
doivent y accéder.

**DECISION REQUIRED : quelle interface reçoit l'entrée Pro générale, et quels
parcours doivent rester dans l'autre interface ?** Les paramètres, responsabilités
et critères de tests ci-dessus constituent le périmètre à valider. Aucune fusion
de wallets, identité ou fonctionnalités n'est incluse implicitement.
