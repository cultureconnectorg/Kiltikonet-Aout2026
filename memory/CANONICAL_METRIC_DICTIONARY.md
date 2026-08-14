# CANONICAL METRIC DICTIONARY
_Observatory adapters — définitions faisant foi_
_Date : 13 août 2026_

Chaque métrique exposée par Observatory porte un bloc `metric_dictionary` inline dans sa réponse JSON. Ce document consolide les définitions pour référence humaine.

## Format commun (rappel)

```json
{
  "source": "Layer d'origine (Smart Engine, Observatory canonical, ...)",
  "collection": "Collection(s) MongoDB lue(s)",
  "definition": "Ce que la métrique mesure en une phrase claire",
  "transformation": "Comment la donnée est agrégée (COUNT, DISTINCT, GROUP BY, ...)",
  "period": "Fenêtre temporelle appliquée",
  "quality": "high | medium | low | unknown",
  "confidence": 0.0–1.0,
  "last_updated": "ISO-8601 UTC",
  "publication_status": "founder-only | admin | public"
}
```

## Verdict par domaine

### `badges` — Cultural identity (founder-only)
- **Source** : Smart Engine (verified-identity flux) · **Collection** : `cc_badges`
- **Définition** : dossiers d'identité culturelle CC2026 (badges, NFC, FREK-ID, cultural score)
- **Transformation** : COUNT + GROUP BY type + histogram(cultural_impact_score, bins 0..100) + TOP 10 desc
- **Publication** : founder-only (top 10 nominatif jamais public)
- **Confidence** : 0.95 si total > 0
- **Éthique** : le classement individuel du score d'impact culturel N'est PAS publié sur le site public

### `conversion` — Funnel visite → paiement (founder-only)
- **Source** : `analytics_events` (Observatory) + `cc_badges` + `stripe_payments` (Smart Engine)
- **Définition** : entonnoir visitors → pricing viewers → inscriptions → paiement
- **Transformation** : DISTINCT session_id par étape + SUM(amount/100) pour le revenue
- **Confidence** : 0.75 si > 10 visitors, 0.4 sinon

### `network` — Réseau pro (founder-only)
- **Source** : Smart Engine (creative-network flux) · **Collections** : `pro_connections`, `pro_messages`, `pro_opportunities`, `pro_events`, `registrations`
- **Définition** : densité et activité du réseau professionnel
- **Transformation** : COUNT + density = accepted_connections / total_registrations
- **Confidence** : 0.7 si connexions > 0, 0.2 sinon

### `diffusion` — Rayonnement (founder-only)
- **Source** : `analytics_events` + `contact_messages` + `partners` (Smart Engine cultural-diffusion)
- **Définition** : referrers, scroll depth, conversion contact→partnership
- **Transformation** : GROUP BY referrer_host + intersection d'emails contact/partner + AVG(scroll depth)
- **Confidence** : 0.65

### `live` — Audience temps réel (founder-only)
- **Source** : Observatory canonical · **Collection** : `analytics_events`
- **Définition** : sessions distinctes observées dans les 5 dernières minutes
- **Transformation** : DISTINCT session_id WHERE created_at >= now-5min
- **Confidence** : 0.8 si active_now > 0, 0.5 sinon
- **Note** : évolution vers SSE prévue Phase 5

### `mgraph` — Graphe relationnel (founder-only)
- **Source** : Smart Engine (mgraph flux) · **Collection** : `cc_badges`
- **Définition** : graphe des relations culturelles inféré depuis organisations partagées + score d'impact
- **Transformation** : ORG-based edges (poids 0.8) + high-score bridges (poids 0.6)
- **Confidence** : 0.6
- **Éthique** : contient des fragments d'identité (prénom, nom, org) → jamais public

### `signals` — Alerts historique (founder-only)
- **Source** : Smart Engine alerts · **Collection** : `team_notifications`
- **Définition** : signaux historiques déclenchés par les règles Smart Engine — surface UNIQUEMENT ce qui a été déclaré, jamais recréé
- **Transformation** : COUNT + GROUP BY type + LAST 20
- **Rule seeds réutilisées** : `traffic_spike`, `low_conversion`, `deadline_approaching`, `registration_batch`, `error_spike`
- **Chaque signal est tagué `_source_layer: "smart_engine"`**
- **Confidence** : 0.9 si total > 0

### `public/now` — Fenêtre publique agrégée (public)
- **Source** : Observatory canonical · **Collections** : `analytics_events` + `registrations` + `workspace_logs` + `cc_badges`
- **Définition** : snapshot strictement agrégé — comptes + distincts + moyennes uniquement
- **Contenu autorisé** : nombres totaux, comptes distincts (territoires, identités actives)
- **Contenu INTERDIT** : noms, emails, top rankings, données admin, données opérationnelles
- **Confidence** : 0.95 (calcul déterministe)
- **Publication** : public (unique endpoint public d'Observatory)

## Principes garantis par le code

1. **Read-only** : aucun adapter n'a d'`insert/update/delete`.
2. **Data lineage** : chaque réponse porte son `metric_dictionary`.
3. **Séparation founder/public** : le décorateur `Depends(require_founder)` garde les 7 endpoints sensibles ; seul `/public/now` est ouvert.
4. **Historique préservé** : `alerts_adapter` ne CRÉE jamais de signal ; il surface ceux qui existent avec `_source_layer: "smart_engine"`.
5. **Smart Engine intact** : `/api/smart-engine/*` continue de fonctionner (routes originales inchangées).
6. **Ne rien fabriquer** : quand la source retourne 0/vide, l'adapter retourne 0/vide (jamais d'estimation).

## Table de responsabilité

| Métrique | Founder | Admin | Public | Source layer |
|---|:---:|:---:|:---:|---|
| Badges histogram | ✅ | ✅ | ❌ | Smart Engine |
| Cultural impact top 10 | ✅ | ❌ | ❌ | Smart Engine |
| Conversion funnel | ✅ | ✅ | ❌ | Observatory + Smart Engine |
| Network density | ✅ | ✅ | ❌ | Smart Engine |
| Referrers top | ✅ | ✅ | ❌ | Observatory |
| Contact→partnership | ✅ | ✅ | ❌ | Smart Engine |
| Live audience | ✅ | ✅ | ❌ | Observatory |
| Mgraph nodes | ✅ | ❌ | ❌ | Smart Engine |
| Signals history | ✅ | ✅ | ❌ | Smart Engine |
| Public counts | ✅ | ✅ | ✅ | Observatory |
