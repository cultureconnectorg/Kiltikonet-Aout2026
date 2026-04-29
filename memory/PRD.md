# PRD — Kiltikonet CC2026

## GOUVERNANCE KILTI KONET — COMPLET

### Partie 1 — Data Model ✅
- Collection `membre_gouvernance` (21 champs, 7 indexes)
- Endpoints CRUD backend (routes/gouvernance.py)

### Partie 2 — Pages Frontend ✅
- /gouvernance — 2 cartes (Associe 50€ / Actif 150€+30€/an)
- /gouvernance/candidater — 4 étapes (FREK → Profil → Répertoire 3-20 → Documents)
- /gouvernance/confirmation — Référence GOV-XXXXXXXX
- /gouvernance/profil — Profil membre, step tracker, cotisation, projets

### Partie 3 — Admin + Stripe + Répertoire ✅
- /admin/gouvernance — Onglet AdminDashboard (candidatures, filtres, détail, accepter/refuser)
- /gouvernance/paiement/{num} — Stripe PaymentIntent (50€ Associé / 150€ Actif)
- /gouvernance/repertoire/{num} — Déclaration répertoire avec droits

### Routes créées
| Route | Accès |
|-------|-------|
| /gouvernance | Public |
| /gouvernance/candidater | Public |
| /gouvernance/profil | Membre authentifié |
| /gouvernance/paiement/{num} | Membre (statut=accepte) |
| /gouvernance/repertoire/{num} | Membre (cotisation payée) |
| /admin/gouvernance | admin_kiltikonet |

### Existant vérifié intact
- 4 packs CC2026 ✅
- FREK wizard ✅
- Stripe ✅
- Feed ✅
- Programme ✅

## Credentials
- Admin: cultureconnectorg@gmail.com / code 000000
