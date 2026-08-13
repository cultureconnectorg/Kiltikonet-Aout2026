# DATA RECONCILIATION MATRIX
_Complément condensé du rapport `SMART_ENGINE_DATA_DISCOVERY.md`_

## Matrice unique de vérité — quelle couche possède quoi

Légende : ✅ possède · 🟡 lecture partagée · ❌ ne touche pas

| DONNÉE | Collection | Smart Engine | Observatory | Workspace | CC2026 UI | Legacy | Canonical proposé |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Badges (identités CC2026) | `cc_badges` | ✅ | ❌ | ❌ | ✅ | — | Smart Engine (spécialisé) — adapter vers Observatory |
| Events web | `analytics_events` | 🟡 lit | ✅ **canonical** | 🟡 lit | 🟡 lit | migré depuis site_events | **Observatory** |
| Site events legacy | `site_events` | ❌ | 🟡 archive | ❌ | ❌ | ✅ (2544 docs) | **Read-only archive** |
| Inscriptions | `registrations` | 🟡 | ✅ | ❌ | ✅ | — | **Observatory** (adapter) |
| Scans badges | `scan_events` | ❌ | ✅ | ❌ | ✅ | — | **Observatory** |
| Workspace logs | `workspace_logs` | ❌ | ✅ | ✅ | ❌ | — | **Observatory** |
| Connexions pro | `pro_connections` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine → adapter |
| Messages pro | `pro_messages` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine → adapter |
| Opportunités | `pro_opportunities` | ✅ | ❌ | ❌ | ✅ | — | Smart Engine → adapter |
| Événements pro | `pro_events` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine → adapter |
| Paiements | `stripe_payments` / `payment_transactions` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine → adapter (données sensibles) |
| Contact messages | `contact_messages` / `contacts_alirio` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine → adapter |
| Partenaires | `partners` / `cms_partner_banners` | ✅ | ❌ | ❌ | ✅ | — | Smart Engine → adapter |
| Alertes déclenchées | `team_notifications` | ✅ | ❌ (Phase 5) | ❌ | ❌ | — | Smart Engine → alerts_adapter (Signals Phase 5) |
| Profils enrichis | `smart_profiles` | ✅ | ❌ | ❌ | ❌ | — | Smart Engine (spécialisé) |
| Chat AI | `chat_messages` | ❌ | ❌ | ❌ | ✅ | — | Laurent.ia (indépendant) |
| CMS content | `cms_content`, `cms_media`, `cms_speakers` | ❌ | ❌ | ❌ | ✅ | — | CMS (spécialisé) |
| Users | `users`, `pro_profiles`, `pro_access_logs` | ❌ | ❌ | ❌ | ✅ | — | Auth (indépendant) |

## Verdict par nature de donnée

- **Événements web (analytics_events)** : Observatory est **canonique**. Smart Engine doit consommer via adapter au lieu d'agréger directement.
- **Badges (cc_badges)** : Smart Engine reste **canonique**. Observatory expose via `badges_adapter` sans dupliquer.
- **Réseau pro (connections/messages/opportunities/events)** : Smart Engine reste **canonique**. Observatory expose via `network_adapter`.
- **Business & finance (paiements, alertes, contacts, partenaires)** : Smart Engine reste **canonique**. Observatory expose via adapters spécialisés.
- **Legacy (site_events)** : archive read-only — jamais modifiée.

## Modèle canonique final (résumé une phrase)

> Observatory est la **couche d'observation canonique** ; Smart Engine reste la **surface business spécialisée**. Les collections restent où elles sont. Les adapters read-only sont l'unique interface partagée.
