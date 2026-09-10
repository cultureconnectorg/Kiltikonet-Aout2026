# Vérification de la reconstruction

Cette phase n'est pas une validation de production. Les preuves ci-dessous
distinguent compilation, tests unitaires, parcours navigateur et intégration.

**Dernière preuve : validation GitHub du 10 septembre, run 34470721311 réussi.
69 tests passent, dont 29 avec MongoDB réel.** Les blocages locaux décrits plus
bas restent des résultats historiques ; voir la dernière section pour la portée
et les limites actuelles.

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

## Exécutions locales du premier correctif

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

## Reprise Atlas du 10 septembre 2026

Point de départ distant vérifié : `2ae7bcc78f0940365fdbde01b871400e8e32cf4f`.
Main reste `bb64ce72812f20f6237c02a7ca316fdbbcbb3bf6`. Le contenu local a été
resynchronisé avec le commit distant exact, sans changement de fichiers.

Le lot ajoute la matrice des 82 écrans, l'index des attentes du classeur et son
contrôle reproductible. Il répare trois liens internes Core vers leurs routes
déjà montées et corrige l'affirmation documentaire de compromission certaine.
Les fichiers App.js, routeInventory.json et les routeurs backend n'ont pas été
modifiés par ce lot. Le paramètre optionnel du script d'inventaire permet de
contrôler aussi la 404, tout en conservant son décompte habituel sans catch-all.

| Vérification exécutée sur ce lot | Résultat et portée |
|---|---|
| `python scripts/rebuild_inventory.py` | PASS : 97 chemins uniques, 606 déclarations backend ; aucune route historique retirée et inventaires générés inchangés. |
| `python scripts/rebuild_atlas.py --write`, puis `python scripts/rebuild_atlas.py` | PASS : 82 lignes, 91 chemins nommés et la 404 recoupés avec App ; composants et identifiants de workspace explicités dans le classeur conservés. 6 chemins supplémentaires documentés. |
| Tests de clics Core avant réparation | 3 échecs reproduits : les retours et l'accès Messages arrivaient sur la route absente. Aucun échec de chargement de fixture. |
| `CI=true REACT_APP_BACKEND_URL=http://127.0.0.1:8001 npm test -- --watchAll=false --runInBand` | PASS : 15 tests, 2 suites. Les 3 nouveaux tests utilisent les composants Messages/Réseau et le routeur réels, avec données Axios et session d'affichage synthétiques. Ils ne valident pas l'authentification ni l'envoi de messages. |
| `npm run lint -- --format json --output-file <rapport local>` | PASS : 247 fichiers, 0 erreur, 378 avertissements. |
| `REACT_APP_BACKEND_URL=http://127.0.0.1:8001 npm run build` | PASS : code de sortie 0 ; avertissements de lint, source maps et taille du bundle toujours présents. |
| `python -m pytest backend/tests/test_rebuild_authorization.py -q` dans un environnement Python isolé recréé | PASS : 25 tests. Les dépendances d'autorisation réelles sont exécutées, sans base de données. |
| `python -m flake8 scripts/rebuild_inventory.py scripts/rebuild_atlas.py backend/routes/network.py backend/routes/observatory.py --select=E9,F63,F7,F82 --show-source` | PASS : contrôles Python critiques ciblés. Compilation des deux scripts également réussie. |
| Smoke HTTP du build produit | PASS : 15/15 routes servent le shell React et les 2 fichiers d'entrée JS/CSS correspondent exactement aux fichiers construits. Pas de preuve de rendu navigateur ou de fonctionnement API. |
| Sonde MongoDB réel : suite Network/Observatory avec `-k network_catalogue` | BLOQUÉ à nouveau : MongoDB 7.0.14 quitte avec `open: Operation not permitted`. 1 erreur de setup, 28 cas désélectionnés ; aucun résultat métier compté comme exécuté. |

Le smoke HTTP couvre `/`, `/rejoindre`, `/reseau?source=atlas`,
`/tarifs?ticket=success&session_id=atlas-test`, `/pricing`, `/programme`, `/concert`,
`/catalogue`, `/culture-connect/inscription`, `/observatory`, `/pro`,
`/smart-engine`, `/admin/core`, `/admin/core/reseau` et `/admin/core/messages`.
Le serveur de test est un serveur statique local avec fallback SPA, pas le serveur
de déploiement. Les réponses 200 ne prouvent donc pas l'autorisation des écrans.

Le navigateur cloud n'a pas été réessayé dans cette reprise après le refus de
localhost constaté dans le premier lot. Le backend complet n'a pas été réinstallé
ni démarré : l'absence d'`emergentintegrations==0.1.0` dans l'index utilisé reste
une limite documentée du premier lot. Les dépendances de test ciblées ont été
réinstallées ; aucun substitut de ce SDK ni faux MongoDB n'a été introduit.

Le lot de traçabilité et de navigation a ses contrôles ci-dessus. La reconstruction
complète reste ouverte. Les décisions et parcours restants sont détaillés dans
[ATLAS_NEXT_STEPS.md](ATLAS_NEXT_STEPS.md).

## Validation GitHub avec MongoDB réel — 10 septembre 2026

- Commit testé : `4a928f80c30aa10b3a14d7245701eb429e680828`.
- Arbre testé : `0647de55d943e82cda4f172d9a00c6ad6db00474`, identique à l'arbre local publié.
- [Run push 34470721311](https://github.com/cultureconnectorg/Kiltikonet-Aout2026/actions/runs/34470721311) : `completed`, `success`.
- [Job backend 102849734267](https://github.com/cultureconnectorg/Kiltikonet-Aout2026/actions/runs/34470721311/job/102849734267) : réussi, journaux consultés.
- [Job frontend 102849734011](https://github.com/cultureconnectorg/Kiltikonet-Aout2026/actions/runs/34470721311/job/102849734011) : réussi, journaux consultés.

| Contrôle distant | Résultat observé |
|---|---|
| Index Atlas et inventaires | 82 écrans, 91 chemins nommés et 404 recoupés ; inventaires générés inchangés. |
| Installation frontend depuis le lockfile | `npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund` réussit sur le runner neuf. |
| Lint frontend | Étape réussie ; rapport JSON conservé. Les avertissements existants ne sont pas présentés comme corrigés. |
| Tests frontend | **15 passed**, 2 suites, selon le journal. |
| Build frontend | **Compiled with warnings**, étape réussie. |
| Smoke HTTP du build | **15 routes et 2 fichiers d'entrée réussis**, contenu des assets comparé au build. |
| Lint Python ciblé | Étape réussie. |
| Autorisation backend | **25 passed in 0.52s**. |
| MongoDB réel / sessions signées / Network / Observatory | Archive vérifiée par SHA-256 ; **29 passed, 1 warning in 1.26s**. Aucun test d'intégration sauté. |

Les artifacts `atlas-frontend-4a928f80c30aa10b3a14d7245701eb429e680828`
et `atlas-backend-4a928f80c30aa10b3a14d7245701eb429e680828` ont été listés
après exécution, non expirés. Ils contiennent les rapports JSON/JUnit et sont
conservés sept jours. La pull request déjà présente a également déclenché un run ;
les comptes ci-dessus portent sur un seul run et ne doublent pas les tests.

**Le blocage de validation MongoDB est levé pour le harnais sur GitHub.** Les
tests prouvent les refus de cookies non signés, les rôles et périmètres testés,
les lectures des collections synthétiques, le catalogue Academy, la provenance
des lectures et l'absence de mutation sur les routes de lecture testées.
Ils ne prouvent pas le middleware complet de `server.py`, une base de production,
les paiements réels ni le fonctionnement des autres API du dépôt.

Restent non validés : backend complet avec son SDK Emergent, rendu navigateur
et parcours métier complets Admin/Pro/workspaces/3D. D-01 à D-11 restent ouverts.
Le [contrat D-06](ATLAS_PRO_MIGRATION_DECISION.md) précise désormais les différences
de navigation, de boutique et de session avant une migration Pro éventuelle.
