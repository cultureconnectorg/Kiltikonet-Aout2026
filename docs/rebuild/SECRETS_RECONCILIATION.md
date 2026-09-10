# Réconciliation des secrets Kiltikonet

Ce document ne contient aucune valeur de secret.

## Constat du 10 septembre 2026

- 67 noms de variables d'environnement sont référencés statiquement dans le frontend, le backend et le service Smart Engine.
- `backend/.env` et `frontend/.env` ont été suivis dans le commit historique `7325fa7` du 25 février 2026, puis retirés dans `1cacd5a` le même jour.
- Les variables historiques trouvées sont `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT` et `ENABLE_HEALTH_CHECK`. Le `MONGO_URL` historique pointait vers localhost et n'intégrait pas d'identifiant. L'URL frontend historique était distante ; une URL publique n'est pas à elle seule un secret.
- Aucun fichier `.env` n'est actuellement suivi. La règle `*.env` de `.gitignore` couvre les fichiers locaux envisagés.
- La section `CREDENTIALS` de `KILTIKONET_DOCUMENTATION.md` contenait des valeurs d'accès en clair pour AWS, FREKcore, Baserow et un workspace, ainsi que des fragments Stripe. Elles ont été retirées de la version courante et remplacées par les noms de variables. Elles restent récupérables dans l'historique Git. Un usage par un tiers et la validité actuelle de ces valeurs n'ont pas été établis par cet audit.
- Vérification complémentaire du 10 septembre lors de l'exécution CI : les métadonnées GitHub du dépôt indiquent `visibility: public` (et `private: false` dans les métadonnées du run 34470721311). Cela établit le statut public actuel du dépôt, sans établir sa date de publication ni un usage des clés par un tiers. La visibilité n'a pas été modifiée par ce travail.
- Aucune clé fournisseur n'a été révoquée ou renouvelée par ce nettoyage. Aucune suppression de capacité n'est justifiée par la seule date d'une clé. L'affirmation antérieure de compromission certaine était excessive.

## Traitement de la liste datée du 4 mars

La liste a été mentionnée par l'utilisateur. Son contenu n'est pas une preuve disponible dans ce dossier. Elle doit être comparée par **nom de variable**, sans coller ses valeurs dans une issue, un commit, un rapport, un message ou une sortie de commande.

| Classe | Action |
|---|---|
| Base de données, Stripe, Cloudinary, e-mail, IA, GitHub OAuth, Yousign, AWS, FREK, Laurentia | Identifier le service consommateur et l'environnement, puis vérifier la configuration et la validité. La date de mars ne prouve ni invalidité ni compromission. Préserver les intégrations existantes. |
| `SESSION_SECRET`, `EMERGENCY_SECRET`, clés VAPID privées, tokens staff/admin | Préserver la configuration privée nécessaire. Documenter les dépendances avant tout changement : une rotation peut invalider des sessions ou des accès existants. |
| Variables `REACT_APP_*` | Considérer leur valeur comme publique : React les incorpore au bundle. Ne jamais y placer un secret. `REACT_APP_BASEROW_TOKEN` demande une décision de correction serveur avant utilisation. |
| URL, port, identifiants de table, cloud name, e-mail d'expéditeur | Paramètres potentiellement publics ; vérifier leur exactitude sans les traiter automatiquement comme justificatifs d'accès. |

## Noms observés par domaine

- **Démarrage** : `ENVIRONMENT`, `PORT`, `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `FRONTEND_URL`, `BASE_URL`, `BACKEND_API_URL`, `BACKEND_INTERNAL_URL`, `REACT_APP_BACKEND_URL`.
- **Authentification** : `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMERGENCY_SECRET`, `FOUNDER_EMAILS`, `STAFF_TOKEN_CC2026`, WebAuthn, Google/GitHub OAuth et hCaptcha.
- **Paiements et économie** : clés Stripe, `JETON_VALEUR_EURO`, `JETON_RACHAT_EURO`.
- **Données et médias** : Baserow, Cloudinary, AWS et tables de badges.
- **Messages et signatures** : Resend, Brevo, SES, VAPID et Yousign.
- **IA et services CVLN** : OpenAI, Anthropic, Tavily, Emergent, FREKCORE, FREK Admin et Laurentia.

## Procédure locale sûre

1. Créer `backend/.env` et `frontend/.env` localement ; ils restent ignorés.
2. Mettre seulement des valeurs publiques dans les variables `REACT_APP_*`.
3. Charger les valeurs sensibles côté serveur ou dans le gestionnaire de secrets de l'hébergeur ; ne jamais les transférer dans le frontend.
4. Tester une intégration à la fois et consigner seulement PASS/FAIL, fournisseur, variable et date. Masquer les valeurs dans les logs.
5. Renouveler immédiatement toute valeur confirmée comme publique, puis vérifier l'historique Git et les journaux du fournisseur.

### Vérifications restant à effectuer

Pour AWS, Baserow, FREKcore et le workspace concerné : établir les droits d'accès à l'historique, la validité et la portée des identifiants, puis consulter les journaux disponibles. Pour Stripe, des fragments seuls ne permettent pas de conclure qu'une clé complète était accessible.

Si une divulgation publique ou un usage non autorisé est confirmé, remplacer les valeurs concernées et rétablir les intégrations avec les nouvelles valeurs. Consigner ce qui a été effectivement vérifié et changé. Aucune rotation n'est exécutée par ce document.

La réécriture d'historique est une opération coordonnée : elle modifie les SHA et impose à tous les clones de se resynchroniser. Elle n'est pas effectuée par ce correctif et ne révoque pas les clés auprès des fournisseurs.

La liste du 4 mars est une **source à réconcilier**, pas une preuve que les clés sont valides ou adaptées à la production.
