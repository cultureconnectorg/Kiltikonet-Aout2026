# Cloudflare Workers / WAF — Checklist Sécurité kiltikonet.fr

**Objectif** : S'assurer que Cloudflare ne réécrit pas les headers de sécurité (CSP, X-Frame-Options, HSTS, CORP, Referrer-Policy) posés par le backend FastAPI.

## 1. Vérifier les Cloudflare Workers actifs

1. Se connecter à **https://dash.cloudflare.com**
2. Sélectionner la zone **kiltikonet.fr**
3. Aller dans **Workers Routes** (menu latéral gauche → *Workers & Pages* → *Routes*)
4. Lister tous les workers actifs sur `kiltikonet.fr/*` ou sous-chemins

**Attendu** : Aucun Worker qui manipule les headers de réponse, sauf si vraiment nécessaire.

**Si un Worker est présent** : Ouvrir son code et chercher toute manipulation de :
- `response.headers.set(...)` / `response.headers.delete(...)`
- `Content-Security-Policy`
- `X-Frame-Options`
- `Cross-Origin-Resource-Policy`
- `Strict-Transport-Security`

Si le Worker écrase l'un de ces headers → soit le supprimer, soit ajouter une exception pour préserver les valeurs backend.

## 2. Vérifier Cloudflare Transform Rules (Response Header Transform)

1. Dashboard Cloudflare → **Rules** → **Transform Rules** → onglet **Modify Response Header**
2. Passer en revue chaque règle active

**Règles à supprimer si présentes** :
- Toute règle qui écrase `Content-Security-Policy` (perturbe hCaptcha, Stripe, PostHog…)
- Toute règle qui remet `X-Frame-Options: DENY` (nous voulons `SAMEORIGIN`)
- Toute règle qui touche `Access-Control-Allow-Origin` (le backend gère CORS strict)

## 3. Vérifier Cloudflare Managed Rules (WAF)

1. Dashboard → **Security** → **WAF** → **Managed rules**
2. Vérifier que la règle **"Cloudflare Managed Ruleset"** n'a pas activé un mode "Add security headers" qui écraserait les nôtres
3. Dans **Custom Rules**, chercher toute règle qui bloque `/api/*` sur des motifs trop larges

## 4. Vérifier "Security Level" et "Bot Fight Mode"

- **Security Level** : idéalement `Medium`. `High` peut challenge hCaptcha lui-même.
- **Bot Fight Mode** : Désactiver sur les routes `/api/badges/inscrire`, `/api/contact` (sinon Cloudflare peut bloquer les submissions légitimes précédées d'un challenge JS incompatible avec hCaptcha).
- **Managed Challenge sur /api** : à désactiver — nous avons déjà hCaptcha + rate limit backend.

## 5. Test de vérification

Après ces vérifications, exécuter dans un terminal :

```bash
curl -sI https://kiltikonet.fr/api/health | grep -iE "content-security-policy|x-frame|hsts|cross-origin"
```

Comparer avec la sortie de la preview :

```bash
curl -sI https://tarifs-update.preview.emergentagent.com/api/health | grep -iE "content-security-policy|x-frame|hsts|cross-origin"
```

Les headers doivent être **identiques** (à l'exception éventuelle de HSTS que Cloudflare peut renforcer, ce qui est OK).

Si l'un des headers manque ou est modifié en prod → un Worker ou Transform Rule est en cause.

## 6. En cas de doute

Créer un **Page Rule** ou **Configuration Rule** temporaire :

- URL match : `kiltikonet.fr/*`
- Setting : **Disable Security** (temporaire, 5 min)
- Re-tester → si les headers reviennent correctement, cela confirme qu'une règle Cloudflare est le coupable

**Ne pas laisser Disable Security actif**, restaurer ensuite.

---

**Note** : Cette vérification doit être faite **manuellement** sur ton dashboard Cloudflare — l'agent n'y a pas accès.
