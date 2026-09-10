# Kiltikonet — baseline de reconstruction corrigée

Statut : **REVUE CORRECTIVE — validation d’exécution requise**.

Branche : `rebuild/kiltikonet-institution-2026-09`.
Revue des cinq commits `f1850ee` à `9320670`, comparés à `main` (`bb64ce7`).

Cette révision remplace les consignes architecturales introduites par `699baf9`.
Leur contenu historique reste consultable dans ce commit Git.

## Références opératoires

- [Carte CURRENT / TARGET / DECISION REQUIRED / LEGACY](CURRENT_TARGET_DECISIONS_LEGACY.md) : capacités, preuves, décisions et verdict de chacun des cinq commits.
- [Inventaire des déclarations de routes et API](ROUTE_API_INVENTORY.json) : main, branche avant correction et source après correction. Inventaire statique, pas un résultat de tests.
- [Confrontation à l’atlas fourni](ATLAS_RECONCILIATION.md).
- [Validation exécutée](REBUILD_VERIFICATION.md) : seule source de verdict pour cette phase.

## Règles maintenues

1. Current != Target. Un écran, un endpoint, une intégration et un déploiement sont des preuves différentes.
2. Evidence First. Le code réel prime sur une déduction tirée d’un audit documentaire plus ancien.
3. Human Authority. Toute décision de propriété, fusion, déplacement, suppression ou statut économique/juridique doit être explicite et tracée.
4. CVLN iOS est un référentiel de cohérence, preuves, responsabilités et contradictions. TARGET-ARCHITECTURE ne commande pas automatiquement l’architecture produit.
5. Aucune capacité ou route existante n’est retirée au motif de sa seule ressemblance avec un autre système CVLN.
6. Les incohérences certaines sont corrigées avant de soumettre les choix ambigus.
7. Build, lint, tests et smoke tests doivent être réellement exécutés et leurs limites rapportées avant clôture.

## Corrections de qualification

- **Network** : backend de lecture et catalogue présents. Le déploiement de territoires/franchises et les prochaines phases restent à établir.
- **Academy** : programme et lecture des dossiers de formation présents. Le produit pédagogique et le choix d’un moteur partagé restent à décider.
- **Culture Connect** : pages et opérations présentes. Les anciens chemins restent actifs ; les nouveaux chemins n’imposent pas une migration canonique.
- **Observatory** : fonctions métier et métriques système locales présentes ; aucune fonction déplacée vers META.
- **Espace Pro, Admin et workspaces** : surfaces applicatives actuelles conservées, avec leurs rôles observés.
- **Smart Engine, Brain et agents locaux** : capacités actuelles conservées. Leur éventuelle délégation à des services partagés demande une décision et des contrats.
- **Jetons** : libellé public neutre. Prix, flux et conditions historiques ne sont ni fusionnés avec JCC iOS ni juridiquement qualifiés par ce refactor. D-016 et KC-001/KC-002 restent ouverts.

Le refactor autorisé dans cette phase est limité aux corrections démontrées et à leurs tests. Les décisions D-01 à D-11 de la carte restent ouvertes.
