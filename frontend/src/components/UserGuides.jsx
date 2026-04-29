import React, { useState } from 'react';
import { X, HelpCircle, ChevronRight, ChevronLeft, CheckCircle, Book, Badge, Users, Brain, Settings, Calendar } from 'lucide-react';
import { Button } from './ui/button';

// ═══════════════════════════════════════════════════════════════
// SECTION 5: GUIDES UTILISATEUR - Culture Connect 2026
// 6 guides intégrés accessibles via bouton "?" depuis chaque espace
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  charbon: '#1C1A14',
  terracotta: '#C4714A',
  gold: '#D4A84B',
  forest: '#4A5D4E',
  burgundy: '#8B1A4A',
  teal: '#0B6E7A'
};

// Guide content definitions
const GUIDES = {
  accreditation: {
    title: 'Guide Accréditation',
    icon: Badge,
    color: COLORS.burgundy,
    description: 'Comment ajouter un participant, générer son QR, imprimer son badge, valider sa présence le jour J',
    steps: [
      {
        title: 'Ajouter un participant',
        content: `1. Accédez à l'onglet "Accreditations" dans le menu
2. Cliquez sur "+ Ajouter participant"
3. Remplissez les champs obligatoires : Prénom, Nom, Email
4. Sélectionnez le type de badge approprié
5. Cliquez sur "Enregistrer"

Le participant sera automatiquement ajouté à Baserow et un ID unique lui sera attribué.`
      },
      {
        title: 'Générer un QR Code',
        content: `1. Allez dans l'onglet "Generateur"
2. Remplissez les informations du badge
3. Sélectionnez le type de badge dans le menu déroulant
4. Le QR code se génère automatiquement en temps réel
5. Cliquez sur "Imprimer" pour lancer l'impression

Note: Le QR code contient l'ID unique du participant pour la validation le jour J.`
      },
      {
        title: 'Imprimer un badge',
        content: `Format d'impression: Carte ID standard (85mm × 54mm)

1. Utilisez l'aperçu du badge pour vérifier les informations
2. Cliquez sur "Imprimer le badge"
3. Sélectionnez votre imprimante
4. Assurez-vous que le format papier est correctement configuré

Conseil: Utilisez du papier cartonné 300g pour un résultat professionnel.`
      },
      {
        title: 'Valider la présence (Jour J)',
        content: `Le jour de l'événement:

1. Scannez le QR code du badge avec un smartphone
2. L'URL /badge/:id s'ouvre automatiquement
3. La présence est validée en < 3 secondes
4. L'heure d'arrivée est enregistrée dans Baserow

Alternative manuelle:
- Cherchez le participant par nom dans la liste
- Cliquez sur l'icône "Valider présence"`
      },
      {
        title: 'Filtrer les participants',
        content: `Utilisez les filtres de présence:

• "Tous (n)" - Affiche tous les participants
• "Présents (n)" - Uniquement les personnes arrivées
• "Absents (n)" - Personnes attendues non arrivées

Les compteurs se mettent à jour en temps réel.
Le filtre actif est persistant entre les rechargements.`
      }
    ]
  },
  badges: {
    title: 'Guide Badges',
    icon: Badge,
    color: COLORS.gold,
    description: 'Types de badges, quand utiliser chaque type, différence Public vs Pro, zones d\'accès',
    steps: [
      {
        title: 'Types de badges disponibles',
        content: `BADGES PROFESSIONNELS:
• VIP - Accès illimité, places réservées
• Presse - Zone presse, interviews
• Exposant - Stand, espace pro
• Artiste / Staff Artiste - Backstage, loges
• Institutionnel - Partenaires officiels
• Professionnel - Espace business

BADGES PUBLIC:
• Public - Accès général
• Participant - Acheteurs de billets
• Visiteur - Entrée libre`
      },
      {
        title: 'Quand utiliser chaque type',
        content: `VIP: Invités spéciaux, sponsors majeurs, personnalités
Presse: Journalistes, photographes, médias accrédités
Exposant: Entreprises avec stand sur l'événement
Artiste: Artistes programmés et leur équipe
Institutionnel: Représentants CTM, SACEM, DAC...
Professionnel: Professionnels de l'industrie culturelle
Public: Grand public inscrit sur kiltikonet.fr
Participant: Acheteurs de billets en ligne
Partenaire Or/Silver/Bronze: Selon niveau de sponsoring`
      },
      {
        title: 'Zones d\'accès par type',
        content: `🔓 ACCÈS GÉNÉRAL (tous badges):
- Grand Carbet Aimé Césaire
- Zone publique

🔐 ESPACE PRO (VIP, Pro, Institutionnel, Presse):
- Grand Carbet Aimé Césaire (TOM)
- Salon business

🎭 BACKSTAGE (Artiste, Staff, Régie):
- Loges
- Zone technique

⭐ VIP UNIQUEMENT:
- Carré VIP
- Accès prioritaire`
      },
      {
        title: 'Différence Public vs Pro',
        content: `BADGE PUBLIC:
✗ N'apparaît PAS dans le catalogue
✗ Pas d'accès zone pro
✓ Accès général à l'événement
✓ Reçoit le programme

BADGE PROFESSIONNEL:
✓ Visible dans le catalogue public
✓ Accès espace business
✓ Networking avec autres pros
✓ Opportunités partenariat`
      }
    ]
  },
  contacts: {
    title: 'Guide Contacts (Alirio)',
    icon: Users,
    color: COLORS.terracotta,
    description: 'Comment ajouter un contact, le promouvoir en partenaire, gérer son annuaire',
    steps: [
      {
        title: 'Ajouter un contact',
        content: `1. Allez dans l'onglet "Mes contacts"
2. Cliquez sur "+ Nouveau contact"
3. Remplissez les informations:
   - Prénom, Nom (obligatoires)
   - Email, Téléphone
   - Organisation
   - Type (Partenaire/Presse/Institutionnel/Personnel)
4. Ajoutez des notes si nécessaire
5. Cliquez sur "Ajouter le contact"

Le contact est sauvegardé dans votre annuaire personnel.`
      },
      {
        title: 'Promouvoir en partenaire',
        content: `Pour transformer un contact en partenaire officiel:

1. Trouvez le contact dans votre liste
2. Cliquez sur l'icône Award (Bronze/Silver/Or)
3. Choisissez le niveau de partenariat
4. Le contact passe en statut "Partenaire"
5. Laurent reçoit une notification automatique

Niveaux de partenariat:
🥉 Bronze - Partenaire de base
🥈 Silver - Partenaire premium
🥇 Or - Partenaire majeur`
      },
      {
        title: 'Gérer l\'annuaire',
        content: `FILTRES DISPONIBLES:
• Tous - Afficher tous les contacts
• Partenaire - Contacts promus
• Institutionnel - Organismes publics
• Presse - Journalistes, médias
• Personnel - Contacts privés

RECHERCHE:
Utilisez la barre de recherche pour trouver rapidement un contact par nom ou organisation.

DISTINCTION CONTACT/PARTENAIRE:
Un contact = toute personne dans votre réseau
Un partenaire = accord formel avec niveau Bronze/Silver/Or`
      },
      {
        title: 'Suivre ses tâches',
        content: `L'onglet "Mes tâches" affiche:

📊 PROGRESSION GLOBALE
Barre de progression avec % de tâches terminées

🔴 EN RETARD
Tâches dont la deadline est passée

🟠 À FAIRE
Tâches planifiées à venir

✅ TERMINÉES
Historique des tâches accomplies

Actions rapides: Marquer comme fait, Changer le statut`
      }
    ]
  },
  smartengine: {
    title: 'Guide Smart Engine',
    icon: Brain,
    color: COLORS.teal,
    description: 'Questions types à poser à l\'IA, lire les données en temps réel, générer un rapport',
    steps: [
      {
        title: 'Questions à poser',
        content: `EXEMPLES DE QUESTIONS:

📊 STATISTIQUES:
"Combien de participants présents ?"
"Quel est le taux de présence ?"
"Combien d'artistes sont inscrits ?"

📋 RAPPORTS:
"Génère un rapport CC2026"
"Liste les partenaires Or"
"Qui a modifié quoi aujourd'hui ?"

📁 CATALOGUE:
"Quel est l'état du catalogue ?"
"Combien de profils publics ?"

L'IA a accès à toutes les données du système.`
      },
      {
        title: 'Lire les données en temps réel',
        content: `Le Smart Engine est connecté à:

🔵 BASEROW - Participants CC2026
   Données d'accréditation, présence

🟢 MONGODB - CMS, Partenaires
   Contenu du site, registre partenaires

🟡 LOGS - Actions équipe
   Historique des modifications

🟣 USERS - Workspaces actifs
   Qui est connecté, dernières actions

Les données sont rafraîchies toutes les 30 secondes.`
      },
      {
        title: 'Générer un rapport',
        content: `Pour obtenir un rapport complet:

1. Demandez: "Génère un rapport CC2026"
2. L'IA compile les données de toutes les sources
3. Le rapport inclut:
   - Nombre total d'inscriptions
   - Répartition par type de badge
   - Taux de présence (si Jour J)
   - Liste des partenaires
   - État du budget

4. Vous pouvez demander des exports CSV depuis l'Observatoire`
      },
      {
        title: 'Vue 3D Architecture',
        content: `La vue 3D du Smart Engine montre:

🔮 AU CENTRE: Noyau IA
   L'intelligence artificielle qui traite les requêtes

🔗 NŒUDS CONNECTÉS:
   Chaque source de données est un nœud
   Les lignes montrent les connexions actives

📡 ANIMATIONS:
   Les lignes s'animent quand les données circulent
   Un nœud s'illumine quand il est interrogé

Toggle entre vue 3D et vue Chat selon vos préférences.`
      }
    ]
  },
  workspaces: {
    title: 'Guide Workspaces',
    icon: Settings,
    color: COLORS.forest,
    description: 'Comment chaque membre utilise son workspace, permissions, restrictions',
    steps: [
      {
        title: 'Vue d\'ensemble',
        content: `WORKSPACES DISPONIBLES:

👑 LAURENT (LC2026) - Founder
   Accès complet, validation finale

🎨 TWINA (Twina2026) - Design
   Visuels, CMS, publications

🎭 GWEN (Gwen2026) - Événementiel
   Artistes, programme, logistique

📰 KAIGE (Kaige2026) - Presse
   Communiqués, médias

💼 ALIRIO (Alirio2026) - Business
   Partenaires, contacts, budget

💰 WUDY (Wudy2026) - Finance
   Trésorerie, dépenses

🎬 FABRICE (Fabrice2026) - Régie
   Technique, sous-titrage

📊 DATA (DataCC2026) - Analyste
   Statistiques, rapports`
      },
      {
        title: 'Permissions par rôle',
        content: `CE QUE CHAQUE RÔLE PEUT FAIRE:

LAURENT (admin):
✓ Tout modifier
✓ Valider les changements
✓ Voir tous les logs

TWINA (design):
✓ Modifier visuels CMS
✓ Publier du contenu
✗ Modifier budget

GWEN (event):
✓ Gérer artistes
✓ Modifier programme
✗ Accès finance

ALIRIO (business):
✓ Gérer partenaires
✓ Contacts, tâches
✗ Modifier CMS

WUDY (finance):
✓ Saisir dépenses
✓ Suivi trésorerie
✗ Modifier programme`
      },
      {
        title: 'Notifications interconnectées',
        content: `SYSTÈME DE NOTIFICATIONS:

Chaque action génère une notification pour Laurent.

Exemples:
• Gwen modifie un artiste → Laurent notifié
• Wudy ajoute une dépense → Solde mis à jour
• Alirio promeut un partenaire → Laurent notifié
• Twina publie un visuel → Log créé

Les notifications apparaissent en temps réel dans le panneau "Logs" du dashboard admin.`
      },
      {
        title: 'Session et sécurité',
        content: `SÉCURITÉ DES SESSIONS:

⏱️ EXPIRATION AUTOMATIQUE
   Sessions expirées après 8 heures d'inactivité

🔒 DÉCONNEXION SÉCURISÉE
   Impossible de revenir en arrière après logout

🛡️ ROUTES PROTÉGÉES
   Chaque workspace vérifie le rôle autorisé

🚫 RATE LIMITING
   Protection contre les tentatives multiples

En cas de problème de connexion, attendez 1 minute avant de réessayer.`
      }
    ]
  },
  jourj: {
    title: 'Guide Jour J',
    icon: Calendar,
    color: '#ef4444',
    description: 'Checklist 22 mai : qui fait quoi, scanner les badges, contacts d\'urgence',
    steps: [
      {
        title: 'Checklist ouverture',
        content: `22 MAI 2026 - OUVERTURE 9H00

□ Vérifier connexion internet sur site
□ Tester scanners QR (smartphones chargés)
□ Imprimer liste de secours (PDF participants)
□ Installer signalétique zones d'accès
□ Briefing équipe accueil 8h30
□ Activer mode "Jour J" dans le système
□ Vérifier sono + micros
□ Ouvrir bar/restauration

CONTACT URGENCE TECHNIQUE:
Fabrice: 0696 XX XX XX`
      },
      {
        title: 'Scanner les badges',
        content: `PROCÉDURE DE SCAN:

1. Participant présente son badge (papier ou téléphone)
2. Scanner le QR code avec l'app caméra du téléphone
3. La page de validation s'ouvre automatiquement
4. Vérifier que "BIENVENUE" s'affiche en vert
5. Laisser passer le participant

SI PROBLÈME DE SCAN:
- Vérifier que l'URL commence par kiltikonet.fr/badge/
- Rechercher manuellement par nom
- En dernier recours: vérifier la liste papier de secours`
      },
      {
        title: 'Qui fait quoi',
        content: `RÉPARTITION DES POSTES:

📍 ACCUEIL PRINCIPAL (Grand Carbet Aimé Césaire)
   Équipe: Bénévoles + 1 régisseur
   Rôle: Scan badges, orientation

📍 ESPACE PRO (Grand Carbet Aimé Césaire)
   Équipe: Alirio + 1 assistant
   Rôle: Accueil pros, badges VIP

📍 BACKSTAGE
   Équipe: Gwen + Fabrice
   Rôle: Artistes, technique

📍 COORDINATION GÉNÉRALE
   Laurent: Supervision globale
   Kaige: Presse, médias

📍 LOGISTIQUE
   Wudy: Caisse, fournisseurs`
      },
      {
        title: 'En cas de problème',
        content: `SITUATIONS D'URGENCE:

🔌 COUPURE INTERNET:
→ Utiliser la liste papier de secours
→ Noter manuellement les arrivées
→ Synchroniser après rétablissement

🆘 BADGE NON RECONNU:
→ Vérifier orthographe du nom
→ Appeler le PC coordination
→ Créer badge sur place si nécessaire

⚡ PANNE TECHNIQUE:
→ Contacter Fabrice immédiatement
→ Numéro urgence: 0696 XX XX XX

🏥 URGENCE MÉDICALE:
→ SAMU: 15
→ Pompiers: 18
→ Point médical sur site`
      },
      {
        title: 'Contacts d\'urgence',
        content: `NUMÉROS IMPORTANTS:

👑 Laurent (Coordination): 0696 XX XX XX
🎬 Fabrice (Technique): 0696 XX XX XX
🎭 Gwen (Artistique): 0696 XX XX XX
💼 Alirio (Partenaires): 0696 XX XX XX

🏛️ INSTITUTIONNELS:
CTM: 0596 XX XX XX
Préfecture: 0596 XX XX XX

🚨 URGENCES:
SAMU: 15
Pompiers: 18
Police: 17

📍 ADRESSE ÉVÉNEMENT:
Grand Carbet Aimé Césaire
Fort-de-France, Martinique`
      }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// GUIDE MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════
export const GuideModal = ({ guideId, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const guide = GUIDES[guideId];
  
  if (!isOpen || !guide) return null;
  
  const Icon = guide.icon;
  const step = guide.steps[currentStep];
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div 
        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{ background: '#2A2820', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ background: guide.color }}>
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-white" />
            <div>
              <div className="font-bold text-white">{guide.title}</div>
              <div className="text-xs text-white/70">{guide.description}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Progress */}
        <div className="px-4 py-2 flex gap-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {guide.steps.map((_, i) => (
            <div 
              key={i}
              className="h-1 flex-1 rounded-full transition-all"
              style={{ 
                background: i <= currentStep ? guide.color : 'rgba(255,255,255,0.1)'
              }}
            />
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: guide.color, color: '#fff' }}
            >
              {currentStep + 1}
            </div>
            <h3 className="text-lg font-bold text-white">{step.title}</h3>
          </div>
          <div 
            className="text-sm whitespace-pre-wrap leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            {step.content}
          </div>
        </div>
        
        {/* Navigation */}
        <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {currentStep + 1} / {guide.steps.length}
          </div>
          
          {currentStep < guide.steps.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{ background: guide.color }}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onClose}
              style={{ background: COLORS.forest }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// HELP BUTTON COMPONENT - À placer dans chaque interface
// ═══════════════════════════════════════════════════════════════
export const HelpButton = ({ guideId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const guide = GUIDES[guideId];
  
  if (!guide) return null;
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
        title={`Aide: ${guide.title}`}
        data-testid={`help-${guideId}`}
      >
        <HelpCircle className="w-5 h-5" style={{ color: COLORS.gold }} />
      </button>
      <GuideModal guideId={guideId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// GUIDE LIST PAGE - Pour afficher tous les guides
// ═══════════════════════════════════════════════════════════════
export const GuideListPage = () => {
  const [selectedGuide, setSelectedGuide] = useState(null);
  
  return (
    <div className="min-h-screen p-6" style={{ background: COLORS.charbon }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Book className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.gold }} />
          <h1 className="text-2xl font-bold text-white mb-2">Guides Utilisateur</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            Documentation intégrée pour Culture Connect 2026
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(GUIDES).map(([id, guide]) => {
            const Icon = guide.icon;
            return (
              <button
                key={id}
                onClick={() => setSelectedGuide(id)}
                className="p-6 rounded-xl text-left transition-all hover:scale-105"
                style={{ 
                  background: '#2A2820',
                  border: `1px solid ${guide.color}30`
                }}
                data-testid={`guide-card-${id}`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ background: `${guide.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: guide.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-white">{guide.title}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {guide.steps.length} étapes
                    </div>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {guide.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
      
      <GuideModal 
        guideId={selectedGuide} 
        isOpen={!!selectedGuide} 
        onClose={() => setSelectedGuide(null)} 
      />
    </div>
  );
};

export default GuideModal;
