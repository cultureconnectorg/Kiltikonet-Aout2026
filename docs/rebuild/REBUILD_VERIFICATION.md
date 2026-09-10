# Vérification de la reconstruction

Cette phase n'est pas une validation de production. Les preuves ci-dessous
distinguent compilation, tests unitaires, parcours navigateur et intégration.

## Références

- Base main : `bb64ce72812f20f6237c02a7ca316fdbbcbb3bf6`.
- Tête auditée : `932067029e75eb74b7136002576655237a2ff262`.
- Les cinq commits d'origine sont conservés ; les corrections sont ajoutées.
- Carte préalable : `CURRENT_TARGET_DECISIONS_LEGACY.md`.
- Atlas fourni : `ATLAS_RECONCILIATION.md` ; aucun chemin de cet atlas retiré.
- `ROUTE_API_INVENTORY.json` : 97 chemins frontend uniques, 606 déclarations
  backend statiques. Ce dernier nombre n'est pas un décompte d'API accessibles.

## Défauts reproduits et corrections

| Défaut | Preuve | Correction / limite |
|---|---|---|
| Huit redirections retirent les paramètres de retour | App du commit audité ; `server.py` construit `/tarifs?ticket=success&session_id=...` ; PricingPage lit `ticket`. | Routes directes rétablies. Quatre nouveaux accès conservés, sans canonisation. Le test du bandeau de confirmation ne prouve pas un paiement Stripe. |
| Métadonnées confondant CURRENT, TARGET et accès | Ancien registre incomplet et baseline ; fondations Network présentes sur main. | Inventaire descriptif, résolveur du routeur réel, décisions séparées. |
| Cache navigateur accepté pour autoriser ProtectedRoute | Cache `cc2026_session` vérifié avant l'API dans la version auditée. | Vérification `/api/auth/me` obligatoire ; attente, rôle autorisé, refus et panne réseau testés. Cela ne sécurise pas toutes les API du dépôt. |
| Network et Observatory acceptent un cookie JSON non signé | Tests des dépendances réelles avant correction : **11 échecs, 12 réussites**. | Seul `request.state.session`, fourni par le middleware signé existant, est accepté. Les mêmes tests passent après correction. |
| Rôle territorial sans périmètre ; incohérence founder par email | Trois cas de territoire absent/vide acceptés avant correction ; requête non filtrée dans `_list_collection`. | Périmètre obligatoire, filtre territorial partagé avec le détail, founder par email reconnu conformément à la règle existante. Aucun rôle ajouté. |
| Imports/variables manquants déjà présents sur main | Lint de l'état initial, avec la même configuration que la correction. | Imports de `saveSession`, composants culturels et composants 3D rétablis ; helper catalogue au niveau du module ; état de suppression local au feed ; doctrine passée en prop à son composant ; carnet global relié à `sharedContacts` et aux champs existants ; API de la page historique accessible à son composant partenaire ; imports App regroupés ; `window.confirm` explicite. |
| Dépendances empêchant une compilation neuve | Build initial et worktree original : `three/webgpu` non exporté par Three 0.160.0. Pas de lockfile dans l'état audité. | Alignement de Three/Fiber/Drei avec React 19 ; les composants et le fallback 2D existants sont conservés. Les parcours GPU doivent être validés avec une session autorisée. |
| Outillage de test/lint incompatible | Jest 27 ne résout pas `react-router/dom` ni l'alias `@/` ; conflit de chargement du plugin hooks pendant le build. | Mapping vers le vrai module CommonJS installé et alias source, ESLint 8 compatible CRA, configuration react-app unique. Aucun faux routeur ni désactivation globale du lint. |

## Exécutions locales

Environnement : Node 24.19.0, Python 3.12, environnement Python isolé.
Les requêtes applicatives de validation utilisent uniquement localhost.

| Vérification | Commande | Résultat |
|---|---|---|
| Inventaire et conservation des routes | `python scripts/rebuild_inventory.py` | PASS : 97 chemins uniques, aucun chemin de main ou de la tête auditée retiré. |
| Tests frontend | `CI=true REACT_APP_BACKEND_URL=http://127.0.0.1:8001 npm test -- --watchAll=false --runInBand` dans frontend | PASS : 12 tests. Les appels auth/packs et animations sont des fixtures unitaires explicitement identifiées. React, ReactDOM et le routeur sont réels. |
| Lint frontend | `npm run lint` dans frontend | PASS avec avertissements : 246 fichiers, 0 erreur, 378 avertissements. Aucune prétention de dette de lint résorbée. |
| Autorisation backend | `python -m pytest backend/tests/test_rebuild_authorization.py -q` | PASS : 25 tests, sur les fonctions réelles sans lecture de base. Ne valide pas le middleware complet du monolithe. |
| Lint Python ciblé | `python -m flake8 backend/routes/network.py backend/routes/observatory.py backend/tests/test_rebuild_authorization.py backend/tests/test_rebuild_network_observatory.py --select=E9,F63,F7,F82 --show-source` | PASS : contrôle des erreurs de syntaxe et références critiques, pas audit stylistique global. |
| Compilation Python ciblée | `python -m compileall -q backend/routes/network.py backend/routes/observatory.py scripts/rebuild_inventory.py` | PASS ; aucune preuve d'exécution du serveur. |
| Build frontend | `REACT_APP_BACKEND_URL=http://127.0.0.1:8001 npm run build` | PASS avec avertissements : bundle produit ; avertissements de source maps `html5-qrcode`, dette de lint et taille du bundle. |
| MongoDB réel et routeurs Network/Observatory | `MONGOD_BINARY=/chemin/vers/mongod python -m pytest backend/tests/test_rebuild_network_observatory.py -q` | BLOQUÉ : MongoDB 7.0.14 quitte au démarrage avec `open: Operation not permitted` ; 29 erreurs de setup, aucun cas applicatif exécuté. Aucun mock MongoDB substitué. |
| Installation backend complète | `python -m pip install -r backend/requirements.txt` | BLOQUÉ : `emergentintegrations==0.1.0` introuvable dans l'index disponible. Même contrainte dans `requirements_github.txt`. Monolithe non démarré. |
| Smoke tests HTTP du build | Build servi localement ; 13 GET sur `/`, routes historiques Culture Connect, namespace ajouté, Observatory, Pro et Smart Engine | PASS : 13/13 HTTP 200 et shell React. Le navigateur cloud a refusé localhost (`ERR_BLOCKED_BY_CLIENT`) ; rendu visuel non validé dans cet environnement. |

La suite d'intégration ajoutée monte les routeurs réels et un contrat de session
signée dans un serveur de test. Elle utilise une base MongoDB éphémère et des
données synthétiques déclarées. Même lorsqu'elle pourra s'exécuter, elle ne
remplacera pas un démarrage/test de `server.py` et des services externes.

Les tests historiques du dépôt ciblent pour beaucoup un déploiement distant,
parfois avec mutations et attentes sur ses données. Ils ne sont pas exécutés
contre ce déploiement et leurs anciens rapports ne sont pas réutilisés comme
résultats de cette phase.

## Dépendances et limites de livraison

L'installation npm locale a nécessité `--legacy-peer-deps` et une réparation du
hoisting AJV (`ajv@8`, installation locale sans remplacement d'un service).
Un `package-lock.json` npm v1 fixe les 1 477 dépendances résolues ; le dépôt
n'avait auparavant aucun lockfile exploitable. Les versions alignées sont React et
ReactDOM 19.2.8, Fiber 9.7.0, Drei 10.7.8 et Three 0.186.0. Les contraintes de
Fiber 9.7.0, consultées dans son manifeste npm, excluent React 19.3 ; React est
donc fixé à une version compatible au lieu de laisser `^19.0.0` la sélectionner.
La chaîne globe installée exige `three/webgpu` et Three >= 0.179.

Les décisions D-01 à D-11 restent ouvertes. En particulier, aucune migration de
routes canoniques, création de LMS, fusion de wallets, qualification juridique
des jetons ou externalisation des moteurs locaux n'est décidée.

Restent à vérifier : intégration backend complète et base réelle, sessions
autorisées et parcours métier Admin/Pro/workspaces/3D, paiement/confirmation
serveur, ainsi que la matrice d'autorisation de toutes les API. Plusieurs
endpoints Smart Engine et contrôles Pro locaux demandent une revue spécifique ;
une garde React ne constitue pas une protection serveur.

**La phase ne peut pas être déclarée entièrement terminée tant que ces gates
d'intégration et les smoke tests nécessaires ne sont pas validés réellement.**
