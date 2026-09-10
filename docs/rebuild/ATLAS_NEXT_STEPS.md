# Atlas — suite de la reconstruction

Reprise du 10 septembre 2026. Point de départ vérifié sur GitHub :
`2ae7bcc78f0940365fdbde01b871400e8e32cf4f` ; main reste
`bb64ce72812f20f6237c02a7ca316fdbbcbb3bf6`. Le correctif précédent est conservé.

## Dossier de référence

- [Carte CURRENT / TARGET / DECISION REQUIRED / LEGACY](CURRENT_TARGET_DECISIONS_LEGACY.md) : capacités, cinq commits initiaux et décisions D-01 à D-11.
- [Matrice des 82 écrans](ATLAS_SCREEN_MATRIX.md) : chaque ligne du classeur reliée à ses routes et à son composant actuel.
- [Confrontation avec CVLN iOS](ATLAS_RECONCILIATION.md) : contradictions et limites de ce référentiel.
- [Vérifications exécutées](REBUILD_VERIFICATION.md) : tests réels, données simulées explicitement identifiées et blocages.
- [Configuration privée](SECRETS_RECONCILIATION.md) : noms de variables et constat corrigé, sans valeur de clé.

## Lot de reprise : corrections certaines

Les écrans Atlas 45 et 46 sont montés exclusivement sous `/admin/core/messages`
et `/admin/core/reseau`. App monte aussi leur parent `/admin/core`, avec la même
liste de rôles `admin`, `founder` pour les trois routes.

| Action | Avant | Correction | Preuve et limite |
|---|---|---|---|
| Retour depuis Messages Core | `/espace-pro`, absent du routeur | `/admin/core` | `MessagesPage.jsx`, montage dans App ; aucune nouvelle autorisation. |
| Retour depuis Réseau Core | `/espace-pro`, absent du routeur | `/admin/core` | `pro/NetworkPage.jsx`, montage dans App. |
| Ouvrir Messages depuis une fiche du Réseau Core | `/espace-pro/messages`, absent du routeur | `/admin/core/messages` | Écran Messages déjà monté avec les mêmes rôles. Le bouton ouvre la messagerie ; il ne présélectionnait aucun destinataire avant et ne prétend pas le faire après. |

Les trois échecs ont été reproduits par des clics sur les composants React réels,
avec routeur réel et fixtures locales pour les données. La correction ne crée,
ne supprime et ne déplace aucune route. Les API de messagerie restent inchangées.

La documentation des secrets distinguait insuffisamment présence dans Git et
compromission par un tiers. Ce constat est corrigé ; aucune clé fournisseur n'a
été révoquée ou renouvelée par ce travail.

## Choix encore ouverts

Ces liens ont été localisés dans le code. Leurs destinations finales ne peuvent
pas être choisies par simple analogie de nom.

| Décision | Preuve actuelle | Question à trancher | Travail possible avant décision |
|---|---|---|---|
| D-06 — entrée Pro générale | `/espace-pro` reste utilisé dans `MobileBottomNav.jsx`, `AccessibilitePage.jsx`, `pro/SoutenirSheet.jsx` et des retours backend. `/pro` et `/admin/core` existent, avec des interfaces et des accès différents. | Quelle interface et quel contexte doivent recevoir chaque catégorie d'appelant ? | Retracer sessions, paramètres et appelants ; préparer une migration distincte des liens internes Core déjà corrigés. |
| D-06 — achat depuis Pro | `SoutenirSheet.jsx` transmet `section=shop&category=jetons` à `/espace-pro`. | Quel parcours conserve réellement le magasin, la catégorie et le wallet attendus ? | Vérifier le contrat des paramètres dans les deux interfaces avant tout alias. |
| D-07 — navigation mobile Admin | `MobileBottomNav.jsx` vise `/admin/participants` et `/admin/settings`, absents d'App. AdminDashboard possède un onglet `registrations`, mais aucun écran `settings` équivalent n'est établi. | Quels écrans ou onglets doivent recevoir « Inscrits » et « Config » ? | Recouper les fonctions avec les responsables ; ne pas rediriger tous les liens vers l'accueil en masquant la perte du parcours. |
| D-02 — Culture Connect | 8 accès historiques et 4 accès supplémentaires conservés. | Namespace canonique, domaine et coquille éventuels ? | Tests de compatibilité des paramètres et inventaire des liens entrants. |
| D-03 / D-04 — Network / Academy | Catalogue, training et routeurs territoriaux présents ; pas d'écran dédié attesté. | Prochaine capacité opérationnelle, publics et responsables ? | Tester les lectures et périmètres actuels ; aucun LMS ou opérateur réel créé par déduction. |
| D-08 / D-09 / D-10 / D-11 | Moteurs, identité, économie et gouvernance locaux présents ; contradictions consignées dans la carte. | Contrats de responsabilité et éventuelles migrations ? | Conserver les capacités et expliciter leurs contrats avant transfert ou fusion. |

## Conditions de validation à poursuivre

| Parcours | Vérification attendue | Dépendance |
|---|---|---|
| Routes Atlas et 404 | Correspondance code, puis chargement et navigation dans un navigateur | Le contrôle statique est automatisé ; le rendu de chaque écran reste une vérification distincte. |
| Core : Réseau → Messages → retour | Navigation réelle, puis sessions autorisées et données de test | Les fixtures frontend ne valident pas les API ni le double contexte admin/Pro actuel. |
| Network / Observatory | Cookies non signés refusés, lectures scoped, données et provenance cohérentes | MongoDB réel éphémère et session signée. |
| Backend complet | Démarrage de `server.py` et appels aux routeurs montés | Dépendance `emergentintegrations==0.1.0` et configuration privée adaptées à l'environnement de test. |
| Billetterie / jetons | Confirmation vérifiée côté serveur, webhook et idempotence | Mode test fournisseur et base isolée ; un paramètre `ticket=success` seul n'est pas une preuve de paiement. |
| Admin, workspaces, Pro et 3D | Accès permis/refusés et actions métier réellement exécutées | Matrice des droits, comptes de test et navigateur ; aucune session de production utilisée ici. |

Le lot de navigation et de traçabilité peut être livré avec ses preuves propres.
La reconstruction complète reste ouverte tant que les validations d'intégration
et de parcours ne sont pas exécutées avec succès et que les choix nécessaires
n'ont pas été décidés.
