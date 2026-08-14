# KILTIKONET — INSTITUTIONAL REFONDATION ROADMAP
_Basé sur le brief architecte produit senior du 13/08/2026_

## Contexte
4 images de référence fournies : palette `#0B0906 / #1A1713 / #2C2620 / #B08A45 / #F7F5EF`, typographie Newsreader + Manrope, globe/network animé en hero, footer institutionnel modulable, Observatory avec sidebar 00→08.

## État actuel (préservé, à conserver)
- ✅ Backend Observatory Phase 1 + Phase 2 opérationnel (14 endpoints + adapters read-only)
- ✅ `/api/observatory/public/now` agrégé sans PII (déjà branché sur homepage §07 IMPACT)
- ✅ Smart Engine intact (9 flux + dashboard)
- ✅ 2544 events legacy préservés, migration idempotente
- ✅ CANONICAL_METRIC_DICTIONARY.md, SMART_ENGINE_DATA_DISCOVERY, DATA_RECONCILIATION_MATRIX
- ✅ Homepage KiltikonetHome (8 sections 01-08 déjà en place, doit être renforcée visuellement)
- ✅ Observatory /observatory (skeleton documentaire, doit passer palette #0B0906)
- ✅ CultureConnect + CC2026 + CC2027 (contenu à densifier)

## Ce qui reste à faire — phasé pour sessions à venir

### PHASE B — Design system (1 session, prochaine)
1. Créer `/app/frontend/src/styles/design-tokens.css` avec les 5 couleurs canoniques
2. Google Fonts `Newsreader` (400/500) + `Manrope` (400/500/600) chargés dans index.html
3. Composants atomes réutilisables : `<Rule/>`, `<Label/>`, `<Metric/>`, `<Source/>`, `<Index/>`, `<HeroFrame/>`
4. Documentation `/app/memory/DESIGN_SYSTEM.md`

### PHASE C — Homepage monumentale (1 session)
1. Hero : composition immersive avec fond de globe/network (image de réf n°1)
   - Recommandation : image WebP statique + overlay dégradé subtil, PAS de Three.js (perf)
   - H1 "Tissons l'invisible. / Révélons l'essentiel." (Newsreader italic)
2. Section Mission (image de réf : arches classiques + colonnade)
3. Réseau + carte du monde discrète (image ref n°2 : world map dotted)
4. CTA sobres, no gradients

### PHASE D — Culture Connect (1 session)
1. `/culture-connect` : page mère avec Louvre-style hero (image ref)
2. `/culture-connect/2026` : bilan avec 6 thématiques (Patrimoine, Économie, Territoires, Technologies, Impact — images matching)
3. `/culture-connect/2027` : "à venir"

### PHASE E — Observatory refonte visuelle (1 session)
1. Passer Observatory sur palette #0B0906 (déjà proche)
2. Sidebar navigation 00→08 (comme image ref n°1)
3. Section "Mode Fondateur" avec l'accès founder détaillé
4. Timeline SVG avec vraies données Observatory /timeline

### PHASE F — Pages secondaires (1 session)
1. `/a-propos` — page institutionnelle
2. `/partenaires` refonte (split permanents vs édition)
3. `/rejoindre` refonte (3 portes : Acteur / Organisation / Partenaire)
4. `/now` public consommant /api/observatory/public/now

### PHASE G — Footer modulable (1 session)
6 variants de footer (image ref n°3) : Principal / Minimal / Institutionnel / Observatory / Événement / Inspiration

### PHASE H — SEO + Performance + Tests (1 session)
- Metadata par route via SEO.jsx
- Lazy loading images
- Testing agent full regression

## Ce qui a été fait ce round
- ✅ Homepage §07 IMPACT branchée sur `/api/observatory/public/now` (4 métriques réelles au lieu de "—")
- ✅ Roadmap saved `/app/memory/REFONDATION_ROADMAP.md`

## Décisions à valider avant Phase B
- Q1 — Fonts : Newsreader (Google Fonts) + Manrope OK ? Ou tu préfères une variable font locale ?
- Q2 — Le globe/network hero : image statique WebP OK, ou tu veux un vrai canvas WebGL animé (impact perf) ?
- Q3 — L'or `#B08A45` : uniquement signal (hovers, chiffres clés) ou aussi accents plus fréquents ?
- Q4 — Ordre d'attaque : B→C→E (impact visuel homepage + observatory d'abord) OU B→C→D (homepage + culture connect complet) ?
- Q5 — Priorité PDF/print : as-tu besoin d'un mode print pour les pages institutionnelles (rapport à imprimer) ?
