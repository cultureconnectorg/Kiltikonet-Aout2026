# Kiltikonet — CURRENT / TARGET / DECISION REQUIRED / LEGACY

Établi avant le refactor correctif du 9 septembre 2026 (UTC).

## Références et portée

- Dépôt : `cultureconnectorg/Kiltikonet-Aout2026`.
- Branche auditée : `rebuild/kiltikonet-institution-2026-09`, **932067029e75eb74b7136002576655237a2ff262**.
- `main` et base commune : **bb64ce72812f20f6237c02a7ca316fdbbcbb3bf6**. Cinq commits devant, zéro derrière ; cinq fichiers modifiés, aucun backend modifié.
- Référentiel consulté : `cultureconnectorg/CVLN-ios-v.1`, snapshot Git **b018c8853da4660c0ee4a7878f7245a96898bb63**, documents Kiltikonet v1.1-patch.1. Consultation du contenu commité, pas des modifications locales de cet autre dépôt.
- Le rapport iOS cite une revue historique de `main` (15 août, README et documentation). Il ne remplace pas l'inspection du code actuel.

**CURRENT** décrit du code ou un document effectivement présent ; ce n'est pas une preuve de fonctionnement en production. **TARGET** est une proposition documentée. **DECISION REQUIRED** interdit de transformer cette proposition en décision. **LEGACY** signifie compatibilité ou historique à conserver, jamais autorisation de suppression. L'accès public/interne et la vérification sont des dimensions distinctes.

## Carte des capacités

| Capacité | CURRENT : preuves dans ce dépôt | TARGET documentée, sans adoption automatique | DECISION REQUIRED | LEGACY à préserver |
|---|---|---|---|---|
| Institution Kiltikonet | `KiltikonetHome`, `APropos`, `Infrastructure`, `Rejoindre`, `ContactKiltikonet`, `Header`, `kilti/InstitutionalFooter`, `styles/tokens.css` ; routes dans `frontend/src/App.js`. Coquille institutionnelle déjà présente sur main. | Cohérence des parcours et des métadonnées. | D-01 : hiérarchie finale, noms, propriété des marques et entité opératrice. | `/about`, `/maintenant` ; pages légales statiques et React existantes. |
| Culture Connect | Pages mère, 2026, 2027, programme, concert, tarifs/inscription, catalogue, appel à projets, partenaires et confirmations. `server.py` : inscriptions, billets, paiements, catalogue, exports. La page 2027 existe ; l'événement 2027 n'est pas ainsi vérifié. | Un namespace `/culture-connect/*` a été proposé et partiellement ajouté. | D-02 : URL canoniques, séparation catalogue communautaire/événement, partenariats institutionnels/sponsors et séparation éventuelle des coquilles. | Toutes les URL d'entrée existantes, notamment `/tarifs` avec paramètres de retour Stripe, `/pricing`, `/register`, `/inscription`, `/programme`, `/concert`, `/catalogue`, `/catalog`, `/legacy-cc2026`. |
| Kiltikonet Network territorial | `backend/routes/network.py`, monté dans `server.py` : overview, access, territories et détail, operators, licenses, compliance, audits, training, technology, signals, opportunities, governance, programmes. Catalogue de huit programmes. `backend/tests/test_network_phase1.py`. Modèles de données **documentés** dans `memory/KILTIKONET_NETWORK_DATA_MODEL.md` ; pas de package Python `models/network` trouvé. Pas de route UI `/network/*` dans App. | Plan en douze phases dans `memory/KILTIKONET_NETWORK_IMPLEMENTATION_PLAN.md` : mutations, workflows, interfaces territoriales, etc. | D-03 : périmètre des prochaines phases, rôles et gouvernance territoriale, création d'opérateurs réels. Aucun déploiement territorial ni contenu de base distante attesté par cette revue. | `/reseau` est un accès vers Rejoindre ; l'annuaire social Pro `/admin/core/reseau` est une autre capacité. |
| Kiltikonet Academy | Entrée `academy` du `PROGRAMMES_CATALOG` dans `network.py`, endpoint `/api/network/programmes`, lecture `/api/network/training` sur `network_training_records`. Modèle et phases de formation documentés. Aucun LMS ou écran Academy identifié dans le code inspecté. | Formation/certification décrites dans le plan Network. | D-04 : produit pédagogique, publics, responsabilités, moteur local/partagé et contrat éventuel avec CVLN Academy. « Powered by CVLN Academy » n'est pas décidé par cette revue. | Références Academy et historique des programmes, sans les supprimer faute d'un LMS. |
| Observatory | `Observatory`, `ObservatoryFounder`, `NowPage`, `routes/observatory.py`, sept adaptateurs dans `services/observatory_adapters/`. Mesures publiques, données détaillées et vues founder. | Intégrations de données et gouvernance proposées dans iOS/Network. | D-05 : exposition publique/détaillée et relation avec l'observabilité d'écosystème. Le mot « culturel » ne retire pas les métriques système déjà présentes. | `site_events` et événements migrés : aucune purge, déplacement ou vérification de volumétrie distante ici. |
| Espace Pro | `/pro` → `ProSplashWrapper` → `omega/ProApp` : Brain, wallet, shop, feed, inbox, builder, cockpit, agenda, accreditation, profile. Connexion, messagerie et réseau autonome ; API pro/social/feed, wallet, fintech, shop et permissions locales. | Organisation des parcours et intégrations éventuelles. | D-06 : destinations des liens `/espace-pro*` non résolus, maintien des deux interfaces Pro, unification éventuelle des wallets. | `/admin/core`, `/admin/core/messages`, `/admin/core/reseau` sont encore montés. Les commentaires « ancien » ne permettent pas de les supprimer. |
| Admin et opérations | AdminDashboard, CMS/éditeur visuel, accréditations, analytics, finance, mobile/terrain, badges/scanners, neuf workspaces nommés et dashboards CC2026. `ProtectedRoute` et contrôles locaux/API à distinguer. | Amélioration de la protection et de la cohérence, sans déplacement fonctionnel. | D-07 : matrice des rôles et liens admin non résolus ; toute extension de droits nécessite une justification explicite. | Routes nominatives, QR badges, scanners, commandes terrain et dashboards CC2026 ; aucun renommage de « Command Center » imposé. |
| Smart Engine et agents locaux | `routes/smart_engine.py`, endpoints supplémentaires dans `server.py`, `routes/ai_agents.py`, `services/cvl_brain*.py`, `SmartEngineDashboard`, `AIAgentsDashboard`, `smart-engine/server.js`. Agrégation, alertes, journalisation, registre et actions locales, avec accès fournisseur dans les services. | CVL BRAIN/Agent Factory partagés figurent dans l'architecture cible iOS. | D-08 : responsabilité locale/partagée, contrats, migration, exploitation. Aucun service existant ne devient une simple console par commentaire. | API et traitements locaux conservés ; processus Node distinct inventorié, déploiement non attesté. |
| Identité et orchestration | Badges, `frek_silent.py`, `frek_client.py`, `cultural_identity.py`, `laurentia_bridge.py`, `laurentia_widget.py`. Code d'adaptation présent ; intégration inter-repos et disponibilité distante non vérifiées. | Contrats d'identité, preuve et orchestration dans iOS. | D-09 : autorité effective des identifiants, réconciliation des identifiants locaux et validation des contrats. | Identifiants/badges/QR existants et routes d'activation ; aucune réémission. |
| Jetons, wallet et achats | `routes/jetons.py` : packs, checkout, wallet, valeur configurable `JETON_VALEUR_EURO` (défaut 1,50). `wallet.py`, `fintech.py`, `shop_payments.py`, `DECISIONS.md` : autres mécanismes et conditions historiques. | Aucune unification économique adoptée ici. | D-10 : qualification des jetons, relation au JCC iOS, report/rachat et divergences entre documents/API. D-016 et KC-001/KC-002 laissent le conflit ouvert. | Flux d'achat, soldes, prix et conditions historiques à tracer ; aucune mutation de données ni nouveau paiement réel dans cette phase. |
| Gouvernance métier, support et contenu | `routes/gouvernance.py`, `routes/doctrine.py`, `support.py`, pages d'adhésion, candidatures, profils, répertoires, signature, FAQ, CMS et `/p/:slug`. Permissions métier locales présentes. | Cohérence des preuves/responsabilités avec iOS. | D-11 : entité juridique, droits de marque, règles d'adhésion et gouvernance inter-systèmes. Une doctrine métier locale n'est pas automatiquement une copie de l'OS. | Documents et parcours existants préservés, aucune nouvelle affirmation juridique. |

## Revue des cinq commits

| Commit | Constat vérifiable | Verdict et correction autorisée |
|---|---|---|
| `f1850ee` — Rejoindre | Quatre profils et leurs destinations conservés. Le texte qualifie tout Network de futur, affirme plusieurs parcours opérationnels et une frontière d'identité non testée. | **PARTIELLEMENT JUSTIFIÉ**. Garder les parcours et le nettoyage d'import. Employer une description de participation sans nier les fondations Network ni annoncer une intégration vérifiée. |
| `699baf9` — baseline iOS | Transforme un audit documentaire historique en règles produit ; impose un moteur Academy partagé ; Network intégralement TARGET ; Smart Engine réduit à console ; JCC réconcilié implicitement. | **À CORRIGER**. Remplacer la baseline opératoire par les preuves de cette carte et les décisions ouvertes. L'ancien contenu demeure accessible dans Git. |
| `f9fabd5` — routeOwnership | Fichier non consommé par App ; inventaire incomplet, cibles de migration imposées, statuts d'accès mélangés aux statuts de preuve, paramètres de routes non reconnus par le résolveur. | **À CORRIGER**. Inventaire descriptif exhaustif des routes montées, statut CURRENT séparé de l'accès, pas d'autorité d'architecture. Network/Academy décrits avec leurs artefacts actuels. |
| `56dcb22` — Jetons | Remplace une qualification litigieuse par une autre, efface une valeur présente dans l'API et retire des conditions commerciales sans décision. Checkout toujours présent. | **À CORRIGER**. Libellé neutre « Jetons CC ». Valeur affichée depuis l'API, pas de réconciliation avec JCC ni décision sur l'ouverture commerciale. Rétablir les conditions affichées antérieurement et consigner leur contradiction comme D-10, sans les certifier. |
| `9320670` — App | Doublon `/contact` retiré, `/support` préservé, lien `/reseau` réparé ; gardes ajoutées aux trois consoles d'administration. Huit routes déplacées par Navigate sans conservation de search/hash/state, alors que `server.py` renvoie `/tarifs?ticket=success&session_id=...` et PricingPage lit `ticket`. Titres des anciennes routes retirés. | **MIXTE**. Garder la déduplication, la compatibilité `/reseau` et les gardes UI justifiées par les usages admin. Rétablir les huit routes directes et leurs paramètres ; conserver les quatre nouveaux chemins comme accès supplémentaires. Corriger les titres et retirer les commentaires d'autorité non décidée. |

## Décisions et contradictions de référence

- iOS **D-017** : l'absence de preuve d'intégration est UNKNOWN, jamais la preuve d'une absence.
- iOS **D-016** : jeton Kiltikonet et JCC ne sont pas fusionnés ; qualification laissée au fondateur et au conseil.
- iOS **D-018 / KC-005** : la gouvernance OS de Kiltikonet reste à décider ; la présence dans l'écosystème ne suffit pas.
- Les documents `memory/*` contiennent propositions, rapports historiques et revendications de réussite. Ils sont des sources à recouper, pas des résultats de tests de cette phase.
- La route map historique affirme que le deuxième `/contact` gagne. La suppression du doublon se justifie par l'ambiguïté et la présence de `/support` ; le comportement de résolution doit être testé avec la version réellement installée.

## Périmètre du refactor suivant cette carte

1. Corriger les interprétations et régressions des cinq commits, conserver les capacités et toutes les routes déjà montées.
2. Séparer les métadonnées de routes de la politique produit ; préserver les liens et paramètres de retour.
3. Vérifier les gardes et les parcours affectés ; traiter les défauts certains qui invalident ces vérifications sans inventer de nouveaux rôles.
4. Exécuter installation/build/lint/tests/smoke. Reporter les échecs et les dépendances manquantes ; ne pas transformer des tests simulés ou historiques en validation de production.
5. Ne pas engager le namespace canonique, la refonte des coquilles, un LMS ou le transfert de Smart Engine sans décision D-01…D-11 appropriée.

Résultats d'exécution à consigner dans `REBUILD_VERIFICATION.md`. Cette carte seule ne clôture aucune phase.

Mise à jour des preuves, 10 septembre : [la validation GitHub](REBUILD_VERIFICATION.md)
réussit avec 29 tests Network/Observatory sur une base MongoDB réelle temporaire,
25 tests d'autorisation et 15 tests frontend. Ce résultat complète CURRENT pour
les scénarios testés, sans attester de déploiement territorial ou de LMS.
Les choix D-01 à D-11 restent ouverts ; [D-06 est détaillé](ATLAS_PRO_MIGRATION_DECISION.md).
