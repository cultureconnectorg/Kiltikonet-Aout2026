# Confrontation de l’atlas fourni au code

Source jointe : `Kiltikonet_atlas_reconstruction_corrige_CVLN_iOS(1).xlsx`.
SHA-256 : `225920c59152196c17f36f223dd3c8c642f4bff61b6230fe314cc27a7c616aad`.
Le classeur est consulté sans modification. Il n’est pas publié intégralement dans le dépôt.

## Couverture

La reprise du 10 septembre ajoute une [matrice écran par écran](ATLAS_SCREEN_MATRIX.md)
et son [index extrait du classeur](ATLAS_SCREEN_INDEX.json). Le contrôle
`python scripts/rebuild_atlas.py` confronte aussi les composants et les identifiants
de workspace explicités dans le classeur au montage actuel. La route 404 `*` est
contrôlée séparément des 91 chemins nommés.

- Feuille **Atlas visuel** : 82 lignes d’écrans, lignes 4 à 85.
- 91 chemins distincts hors catch-all `*` ; **91 présents sur 91** dans le routeur corrigé.
- Six chemins supplémentaires présents dans le code : `/accessibilite`, `/reseau`, `/culture-connect/programme`, `/culture-connect/concert`, `/culture-connect/inscription`, `/culture-connect/catalogue`.
- `main` : 93 déclarations de pages pour 92 chemins uniques, à cause du doublon `/contact`.
- Branche auditée et correction : 97 chemins uniques, sans retrait d’aucun chemin existant. Les conteneurs `/*` et catch-all `*` sont conservés et exclus de ce décompte.
- Les accès indiqués par le classeur sont à tester côté serveur. Une colonne « interne » ne prouve pas une autorisation effective.

## Arbitrages recoupés

| Référence du classeur | Lecture retenue | Preuve actuelle / conséquence |
|---|---|---|
| Règles de reconstruction, lignes 4–9 | Current != Target, Evidence First, Human Authority, compatibilité et tests réels. | Appliqués dans la carte et la validation de cette phase. |
| Vérification CVLN iOS, ligne 6 ; Atlas, lignes 12–23 | Préserver Culture Connect ; décision humaine avant séparation de domaine ou déplacement. | Huit routes historiques rétablies directement ; quatre nouveaux accès conservés. Aucune migration canonique décidée. |
| Vérification CVLN iOS, ligne 7 ; Atlas, ligne 7 | L’audit iOS ne prouve pas un réseau territorial déployé. | Le dépôt contient pourtant déjà `routes/network.py` et son montage. CURRENT = fondations de lecture ; TARGET = phases opérationnelles ultérieures. UNKNOWN de l’audit historique n’efface pas ces fondations. |
| Vérification CVLN iOS, ligne 8 | Le moteur Academy partagé reste potentiel. | Entrée Academy et endpoint training présents dans Network ; LMS et intégration CVLN Academy non vérifiés. Aucune architecture pédagogique imposée. |
| Atlas, lignes 9–10 | Conserver Observatory sans transformation automatique en observabilité CVLN. | Métriques, adaptateurs et surfaces publiques/founder préservés. |
| Atlas, ligne 33 | Conserver les flux jetons ; corriger le mot « monnaie » sans qualification nouvelle. | « Jetons CC », valeur issue de l’API, flux et conditions historiques conservés ; contradiction économique ouverte. |
| Atlas, lignes 42–46 et 56–67 | Conserver Espace Pro, intelligence locale et workspaces ; décision avant déplacement/fusion. | Aucun transfert vers META, Brain, Laurentia ou Agent Factory. |
| Atlas, lignes 47–55 | Nettoyer les défauts certains de sécurité sans supposer un transfert vers META. | Les gardes UI sont vérifiées ; les défauts d’autorisation découverts sont consignés et testés séparément. |

La mention « Univers événementiel à isoler de Kiltikonet.fr » dans **Synthèse** est une intention. Les colonnes de décision détaillées et la demande utilisateur interdisent de l’exécuter comme un ordre automatique de déplacement.

Le classeur est une source de cadrage et de classement. La présence du code est contrôlée dans le dépôt ; son fonctionnement est contrôlé par les exécutions rapportées dans `REBUILD_VERIFICATION.md`.
