# Atlas — validation automatisée

La suite du dossier demande une exécution Network/Observatory avec MongoDB réel.
Le processus local quitte avec `open: Operation not permitted`. Le workflow
`.github/workflows/atlas-validation.yml` prépare cette validation sur un runner
GitHub Ubuntu 22.04, avec une base temporaire créée et détruite par les tests.

## Portée

| Job | Contrôles | Limites |
|---|---|---|
| `frontend` | Contrat des 82 écrans, conservation des routes, installation depuis le lockfile, lint, tests React, build, shell HTTP et fichiers JS/CSS produits | Les tests utilisent des fixtures API. Le smoke HTTP n'exécute pas le navigateur. Les avertissements de lint existants restent visibles ; les erreurs font échouer le job. |
| `network-observatory` | Lint Python critique, dépendances d'autorisation, routeurs réels, sessions signées et lectures d'une base MongoDB réelle | Le harnais monte les routeurs avec le contrat de session de test. Il ne démarre pas `server.py` et ne certifie aucun déploiement territorial. |

Le workflow est limité à la branche de reconstruction et aux pull requests vers
main touchant son périmètre. Il ne déploie pas l'application. Il utilise des droits
GitHub en lecture et ne référence aucun secret de dépôt. Les identités, territoires
et opérateurs sont des fixtures synthétiques. Aucun paiement n'est réalisé.

Les actions GitHub sont fixées aux SHA de leurs tags officiels consultés lors de
la préparation. MongoDB 7.0.14 est téléchargé depuis `fastdl.mongodb.org` et comparé
au SHA-256 de l'archive utilisée lors du diagnostic local :
`b4cf8caae108785135ecc8b86ad8ed6df5d6efb84b9b95a50ecba2fc246ce084`.
Cette version sert à reproduire le test ; ce document ne la recommande pas comme
version de production.

`backend/requirements-atlas.txt` décrit seulement les dépendances de ce harnais.
Les requirements du backend complet et sa dépendance Emergent restent inchangés.
Les suites d'autorisation et d'intégration sont exécutées dans deux processus
Python distincts pour isoler leurs clients et variables de test.

## Résultats à interpréter

Les rapports JSON/JUnit sont conservés sept jours comme artifacts GitHub associés
au SHA testé. Une exécution réussie de ce workflow ne ferme pas D-01 à D-11 et ne
valide pas les parcours navigateur, le monolithe complet ni les services externes.

À la préparation, aucun run GitHub Actions n'était présent dans le dépôt.
Après publication, le [run 34470721311](https://github.com/cultureconnectorg/Kiltikonet-Aout2026/actions/runs/34470721311)
est terminé avec la conclusion **success** sur
`4a928f80c30aa10b3a14d7245701eb429e680828`. Les deux jobs réussissent :
15 tests frontend, 25 tests d'autorisation et 29 tests avec MongoDB réel.
Le build, le lint et le smoke de 15 routes/2 fichiers d'entrée réussissent.
Les journaux ont été lus et les deux artifacts JSON/JUnit sont présents.
Le détail et les limites sont consignés dans `REBUILD_VERIFICATION.md`.

## Reproduction locale

Après installation des dépendances dédiées et disponibilité d'un binaire mongod :

```sh
python -m pip install -r backend/requirements-atlas.txt
python -m pytest backend/tests/test_rebuild_authorization.py -q
MONGOD_BINARY=/chemin/vers/mongod python -m pytest backend/tests/test_rebuild_network_observatory.py -q
python scripts/rebuild_atlas.py
python scripts/rebuild_http_smoke.py
```

Le smoke exige un build frontend déjà produit. Il ne remplace pas `npm run build`
ni un test du serveur de déploiement. Les étapes frontend complètes sont dans le
workflow et dans le rapport de vérification existant.
