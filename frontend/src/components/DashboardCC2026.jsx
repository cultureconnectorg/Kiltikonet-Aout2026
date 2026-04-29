import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Circle, AlertTriangle, Clock, ChevronDown, ChevronRight, Calendar, Users, Target, Loader2, Wifi, WifiOff, RefreshCw, CloudOff, BarChart3 } from 'lucide-react';
import SmartEngineDashboard from './SmartEngineDashboard';
import useOfflineSync from '../hooks/useOfflineSync';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// DASHBOARD COLLABORATIF CC2026 / CHIMIN SAVANN
// Culture Connect 2026 - 22 Mai 2026, Fort-de-France
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Design tokens from reference HTML
const COLORS = {
  bg: '#0D0B08',
  card: '#1A1814',
  border: '#2A251F',
  gold: '#C9933A',
  goldLight: '#E8C060',
  text: '#E8E4DC',
  textMuted: '#8A857D',
  urgent: '#E85A4F',
  success: '#4DA860'
};

// Pôles data
const POLES = {
  fondateur:   { label: 'Fondateur', color: '#C9933A', icon: '★' },
  financement: { label: 'Financement', color: '#E8C060', icon: '€' },
  juridique:   { label: 'Juridique / INPI', color: '#5B9BD5', icon: '⚖' },
  gwen:        { label: 'Gwen — Production', color: '#B85FA0', icon: '🎭' },
  fabrice:     { label: 'Fabrice — Régie', color: '#E07A3A', icon: '🔊' },
  comm:        { label: 'Comm & RS', color: '#4DA860', icon: '📣' },
  business:    { label: 'Village Business', color: '#9E8A5A', icon: '🏪' },
  admin:       { label: 'Admin / Légal', color: '#7A9EA0', icon: '📋' },
  digital:     { label: 'Digital / KORA', color: '#8A70D0', icon: '💻' }
};

// Workspace to pole mapping
const WORKSPACE_POLES = {
  'CC2026admin': Object.keys(POLES), // Admin can edit all
  'LC2026': Object.keys(POLES), // Founder can edit all (like admin)
  'Twina2026': ['comm'], // Design → Communication & RS
  'Gwen2026': ['gwen'],
  'Fabrice2026': ['fabrice'],
  'Kaige2026': ['digital'],
  'Alirio2026': ['digital'],
  'Wudy2026': ['comm']
};

// Weeks data
const WEEKS = [
  { id: 's1', dates: '8–15 Mars', label: 'Urgences immédiates', phase: 'metro' },
  { id: 's2', dates: '16–22 Mars', label: 'INPI + CNM deadline', phase: 'metro' },
  { id: 's3', dates: '23–29 Mars', label: 'INPI suite + Sponsors', phase: 'metro' },
  { id: 's4', dates: '30 Mars–5 Avr', label: 'Conventions + SACEM', phase: 'metro' },
  { id: 's5', dates: '6–13 Avr', label: 'Bouclage avant retour', phase: 'metro' },
  { id: 's6', dates: '14–19 Avr', label: 'Retour Martinique', phase: 'mq' },
  { id: 's7', dates: '20–26 Avr', label: 'Tout verrouiller', phase: 'mq' },
  { id: 's8', dates: '27 Avr–3 Mai', label: 'Montage + Comm sprint', phase: 'mq' },
  { id: 's9', dates: '4–10 Mai', label: 'Derniers arbitrages', phase: 'mq' },
  { id: 's10', dates: '11–17 Mai', label: 'Compte à rebours final', phase: 'mq' },
  { id: 's11', dates: '18–21 Mai', label: 'Les 4 jours d\'événement', phase: 'jourj' }
];

// Checkpoints
const CHECKPOINTS = {
  's3': { title: '📌 Checkpoint fin mars', sub: '2 marques INPI déposées · CNM envoyé · Accord CTM en écriture · Kilti Konet déclarée' },
  's5': { title: '📌 Go / No-Go mi-avril', sub: 'Budget sécurisé 40k€ min · Autorisation Mairie signée · SACEM déclarée · Billetterie live' },
  's7': { title: '📌 Checkpoint J–26', sub: 'Budget 60% sécurisé · Tous contrats artistes signés · Prestataires payés' },
  's9': { title: '📌 Checkpoint J–15', sub: 'Aucune décision financière majeure après ce point · Plan B activé si nécessaire' }
};

// Deadlines
const DEADLINES = {
  's1': { date: '⏰ 18 MARS', text: 'Deadline CNM — Commission production/diffusion' },
  's2': { date: '⏰ 18 MARS', text: 'Dernier jour envoi dossier CNM — production/diffusion' },
  's4': { date: '⏰ Avant 22 avril', text: 'SACEM — déclaration concert public obligatoire' },
  's9': { date: '⏰ 10 MAI', text: 'Fermeture accréditations presse' }
};

// All tasks
const TASKS = [
  {id:'s1-f1', week:'s1',pole:'fondateur',  urgent:true,  sent:true,  text:'Relancer CTM — transformer accord verbal en demande écrite', sub:'Appel Mme Monrose + Letchimy · demander montant et calendrier'},
  {id:'s1-f2', week:'s1',pole:'fondateur',  urgent:false, sent:true,  text:'Relancer DAC Martinique si silence', sub:'Mail envoyé · relancer par appel avant vendredi'},
  {id:'s1-f3', week:'s1',pole:'fondateur',  urgent:false, sent:true,  text:'Relancer SkillFor / ISCA'},
  {id:'s1-f4', week:'s1',pole:'fondateur',  urgent:false, sent:true,  text:'Relancer Ambassade du Bénin', sub:'Lettre FR+EN en transit'},
  {id:'s1-ju1',week:'s1',pole:'juridique',  urgent:true,  text:'Créer Association Kilti Konet — Loi 1901', sub:'Rédiger statuts · bureau · déclarer Préfecture'},
  {id:'s1-ju2',week:'s1',pole:'juridique',  urgent:true,  text:'Confirmer titulaires 5 marques INPI (FMS ou Kilti Konet ?)', sub:'Décision stratégique avant tout dépôt'},
  {id:'s1-fi1',week:'s1',pole:'financement',urgent:true,  text:'Finaliser dossier CNM — deadline 18 mars', sub:'Commission production/diffusion · Fabrice Borie / Daniel Winkel'},
  {id:'s1-co1',week:'s1',pole:'comm',       urgent:true,  text:'Publier Reel annonce lundi 9 mars', sub:'#ChiminSavann · IG / FB / TikTok · prompt CreaShort.ai prêt'},
  {id:'s1-co2',week:'s1',pole:'comm',       urgent:false, text:'Ouvrir page KORA CC2026 — objectif 100 inscrits avant fin mars'},
  {id:'s1-g1', week:'s1',pole:'gwen',       urgent:true,  text:'Contacter managers Kassav\' — Maui Entertainment', sub:'Disponibilité 22 mai · conditions · rider technique'},
  {id:'s1-g2', week:'s1',pole:'gwen',       urgent:true,  text:'Contacter manager Kalash — Konvict Muzik'},
  {id:'s1-g3', week:'s1',pole:'gwen',       urgent:false, text:'Relancer Carole Keyanfé — manager Méryl'},
  {id:'s1-g4', week:'s1',pole:'gwen',       urgent:false, text:'Relancer manager Yaniss Odua'},
  {id:'s1-g5', week:'s1',pole:'gwen',       urgent:false, text:'Contacter Kathy-Liana Bravo — cadrer partenariat Labo des Histoires', sub:'Rôle exact 22 mai · convention à préparer'},
  {id:'s1-g6', week:'s1',pole:'gwen',       urgent:false, text:'Lancer appel d\'offres prestataire son/lumière — 3 devis minimum'},
  {id:'s1-g7', week:'s1',pole:'gwen',       urgent:false, text:'Contacter Nuxuno Xän · Doudou Style · 3TTMan — showcase parvis'},
  {id:'s1-ad1',week:'s1',pole:'admin',      urgent:true,  text:'Contacter Mairie Fort-de-France — autorisation Grand Carbet Aimé Césaire', sub:'Délais longs · À LANCER MAINTENANT'},
  {id:'s1-bu1',week:'s1',pole:'business',   urgent:false, text:'Dresser liste 20 exposants cibles Village Business'},
  {id:'s1-di1',week:'s1',pole:'digital',    urgent:false, text:'kiltikonet.fr — vérifier page CC2026 à jour'},
  {id:'s2-ju1',week:'s2',pole:'juridique',  urgent:true,  text:'Créer compte INPI personne morale — depot.inpi.fr'},
  {id:'s2-ju2',week:'s2',pole:'juridique',  urgent:true,  text:'Déposer CULTURE CONNECT — 310 €', sub:'Classes 41 · priorité absolue'},
  {id:'s2-ju3',week:'s2',pole:'juridique',  urgent:true,  text:'Déposer CHIMIN SAVANN — 230 €'},
  {id:'s2-ju4',week:'s2',pole:'juridique',  urgent:false, text:'Vérifier antériorité KORA — base.inpi.fr classe 38'},
  {id:'s2-ju5',week:'s2',pole:'juridique',  urgent:false, text:'Ouvrir compte bancaire Association Kilti Konet'},
  {id:'s2-fi1',week:'s2',pole:'financement',urgent:true,  text:'Envoyer dossier CNM AVANT LE 18 MARS'},
  {id:'s2-fi2',week:'s2',pole:'financement',urgent:false, text:'Rédiger convention partenariat sponsors type', sub:'Bronze 5k€ / Silver 10k€ / Or 20k€'},
  {id:'s2-g1', week:'s2',pole:'gwen',       urgent:false, text:'Contacter CFA Audiovisuel Martinique — convention captation', sub:'JTV Digital · TRACE'},
  {id:'s2-ad1',week:'s2',pole:'admin',      urgent:false, text:'Suivi dossier Mairie — accusé réception + interlocuteur direct'},
  {id:'s2-co1',week:'s2',pole:'comm',       urgent:false, text:'Post hebdomadaire RS — teaser progressif #ChiminSavann'},
  {id:'s2-bu1',week:'s2',pole:'business',   urgent:false, text:'Envoyer 20 propositions Village Business'},
  {id:'s3-ju1',week:'s3',pole:'juridique',  urgent:false, text:'Déposer KILTIKONET — 270 €'},
  {id:'s3-ju2',week:'s3',pole:'juridique',  urgent:false, text:'Déposer KORA — 230 € (si antériorité OK)'},
  {id:'s3-ju3',week:'s3',pole:'juridique',  urgent:false, text:'Déposer CVL BRAIN — 230 €'},
  {id:'s3-fi1',week:'s3',pole:'financement',urgent:false, text:'Démarcher 5 sponsors privés — 1er appel chacun'},
  {id:'s3-fi2',week:'s3',pole:'financement',urgent:false, text:'Relances CTM / DAC / CNM si silence'},
  {id:'s3-fi3',week:'s3',pole:'financement',urgent:false, text:'Déposer dossier Ville de Fort-de-France'},
  {id:'s3-g1', week:'s3',pole:'gwen',       urgent:false, text:'Relances managers : Kassav\' · Kalash · Méryl · Yaniss'},
  {id:'s3-g2', week:'s3',pole:'gwen',       urgent:false, text:'Établir fiche technique scène principale'},
  {id:'s3-g3', week:'s3',pole:'gwen',       urgent:false, text:'Lancer recrutement bénévoles — 20 minimum'},
  {id:'s3-co1',week:'s3',pole:'comm',       urgent:false, text:'Post hebdomadaire RS + stories'},
  {id:'s3-co2',week:'s3',pole:'comm',       urgent:false, text:'Ouvrir accréditations presse — kiltikonet.fr'},
  {id:'s3-bu1',week:'s3',pole:'business',   urgent:false, text:'Relances exposants Village Business — viser 10 confirmés'},
  {id:'s3-di1',week:'s3',pole:'digital',    urgent:false, text:'Lancer billetterie officielle — kiltikonet.fr'},
  {id:'s4-fi1',week:'s4',pole:'financement',urgent:true,  text:'CTM — Signer convention de subvention'},
  {id:'s4-fi2',week:'s4',pole:'financement',urgent:false, text:'Boucler 2 sponsors Bronze — contrats signés + acomptes'},
  {id:'s4-ad1',week:'s4',pole:'admin',      urgent:true,  text:'SACEM — Déclaration concert public avant 22 avril'},
  {id:'s4-ad2',week:'s4',pole:'admin',      urgent:false, text:'GUSO — Déclarations emplois artistiques'},
  {id:'s4-ad3',week:'s4',pole:'admin',      urgent:false, text:'Déclaration Préfecture — rassemblement +5000 personnes'},
  {id:'s4-co1',week:'s4',pole:'comm',       urgent:true,  text:'Commander imprimés Twina — affiches + flyers + banderoles', sub:'Délai 3 semaines · commander AVANT de rentrer'},
  {id:'s4-g1', week:'s4',pole:'gwen',       urgent:true,  text:'Kassav\' — deadline confirmation ou pivot artiste remplaçant'},
  {id:'s4-g2', week:'s4',pole:'gwen',       urgent:false, text:'Signer contrat prestataire son/lumière + acompte 30%'},
  {id:'s4-g3', week:'s4',pole:'gwen',       urgent:false, text:'Signer convention CFA Audiovisuel Martinique'},
  {id:'s4-g4', week:'s4',pole:'gwen',       urgent:false, text:'Confirmer Tambou No Kannal — contrat + rider'},
  {id:'s4-g5', week:'s4',pole:'gwen',       urgent:false, text:'Plan de masse Grand Carbet — scène + parvis + Village Business'},
  {id:'s4-bu1',week:'s4',pole:'business',   urgent:false, text:'Village Business — 15 stands confirmés · contrats signés'},
  {id:'s5-f1', week:'s5',pole:'fondateur',  urgent:true,  text:'GO / NO-GO financier avant départ Martinique', sub:'Budget sécurisé 40k€ minimum'},
  {id:'s5-ad1',week:'s5',pole:'admin',      urgent:true,  text:'Convention Grand Carbet Aimé Césaire SIGNÉE avant départ'},
  {id:'s5-ad2',week:'s5',pole:'admin',      urgent:false, text:'Vérifier couverture assurance événement'},
  {id:'s5-co1',week:'s5',pole:'comm',       urgent:false, text:'Envoyer dossier presse — JTV · TRACE · Fusion B.Black · SNEP'},
  {id:'s5-co2',week:'s5',pole:'comm',       urgent:false, text:'Annonces lineup — 1 artiste confirmé par jour × 5 jours'},
  {id:'s5-g1', week:'s5',pole:'gwen',       urgent:false, text:'Riders techniques collectés pour tous artistes confirmés'},
  {id:'s5-g2', week:'s5',pole:'gwen',       urgent:false, text:'Logistique artistes — hôtels + transfers + catering planifiés'},
  {id:'s5-g3', week:'s5',pole:'gwen',       urgent:false, text:'20 bénévoles recrutés · affectations définies'},
  {id:'s5-ju1',week:'s5',pole:'juridique',  urgent:false, text:'Vérifier statut 5 dépôts INPI — accusés réception'},
  {id:'s5-fi1',week:'s5',pole:'financement',urgent:false, text:'Point trésorerie — tableur flux prévisionnel jusqu\'au 22 mai'},
  {id:'s5-di1',week:'s5',pole:'digital',    urgent:false, text:'kiltikonet.fr — programme + billetterie + accréditations en ligne'},
  {id:'s6-f1', week:'s6',pole:'fondateur',  urgent:false, text:'RDV physique CTM — Mme Monrose — signer convention'},
  {id:'s6-f2', week:'s6',pole:'fondateur',  urgent:false, text:'RDV DAC Martinique — Yomé Toumson'},
  {id:'s6-g1', week:'s6',pole:'gwen',       urgent:true,  text:'Réunion coordination sur place — point complet production'},
  {id:'s6-g2', week:'s6',pole:'gwen',       urgent:false, text:'Visite Grand Carbet Aimé Césaire avec prestataire — repérage terrain'},
  {id:'s6-g3', week:'s6',pole:'gwen',       urgent:false, text:'Réunion Kathy-Liana Bravo — convention signée + set 22 mai défini'},
  {id:'s6-fa1',week:'s6',pole:'fabrice',    urgent:false, text:'Briefing régie complète — son · lumière · vidéo · captation'},
  {id:'s6-co1',week:'s6',pole:'comm',       urgent:false, text:'Réception imprimés Twina — vérification + distribution'},
  {id:'s6-co2',week:'s6',pole:'comm',       urgent:false, text:'Affichage Martinique — zones stratégiques Fort-de-France'},
  {id:'s7-f1', week:'s7',pole:'fondateur',  urgent:false, text:'Valider programme définitif heure par heure avec Gwen'},
  {id:'s7-f2', week:'s7',pole:'fondateur',  urgent:false, text:'Rédiger briefing équipes — fiches de poste J1 à J4'},
  {id:'s7-g1', week:'s7',pole:'gwen',       urgent:false, text:'Tous contrats artistes signés — Kassav\' · Kalash · Méryl · Yaniss · TMT · Paille'},
  {id:'s7-g2', week:'s7',pole:'gwen',       urgent:false, text:'Plan catering + loges artistes finalisé'},
  {id:'s7-g3', week:'s7',pole:'gwen',       urgent:false, text:'Bénévoles briefés — planning présence J1 à J4'},
  {id:'s7-fa1',week:'s7',pole:'fabrice',    urgent:false, text:'Fiche technique scène validée + liste matériel complète'},
  {id:'s7-ad1',week:'s7',pole:'admin',      urgent:false, text:'Plan sécurité déposé Préfecture'},
  {id:'s7-co1',week:'s7',pole:'comm',       urgent:false, text:'Campagne J–30 — stories quotidiennes · interviews artistes'},
  {id:'s7-bu1',week:'s7',pole:'business',   urgent:false, text:'Village Business final — tous stands confirmés · signalétique'},
  {id:'s8-g1', week:'s8',pole:'gwen',       urgent:true,  text:'Début montage scène principale — Grand Carbet', sub:'J–15 recommandé pour grande jauge outdoor'},
  {id:'s8-g2', week:'s8',pole:'gwen',       urgent:false, text:'Installation Village Business — barnums + stands + signalétique'},
  {id:'s8-g3', week:'s8',pole:'gwen',       urgent:false, text:'Confirmations arrivées artistes · hôtels prêts'},
  {id:'s8-fa1',week:'s8',pole:'fabrice',    urgent:false, text:'Installation régie son/lumière scène principale'},
  {id:'s8-fa2',week:'s8',pole:'fabrice',    urgent:false, text:'Installation régie vidéo + captation CFA'},
  {id:'s8-co1',week:'s8',pole:'comm',       urgent:false, text:'Campagne billetterie dernier sprint — objectif 80% jauge'},
  {id:'s8-ad1',week:'s8',pole:'admin',      urgent:false, text:'Badges nominatifs imprimés — QR code kiltikonet.fr/badge/[ID]'},
  {id:'s8-di1',week:'s8',pole:'digital',    urgent:false, text:'Test complet kiltikonet.fr — billetterie · badges · check-in'},
  {id:'s9-f1', week:'s9',pole:'fondateur',  urgent:true,  text:'Fermeture accréditations presse — 10 mai'},
  {id:'s9-g1', week:'s9',pole:'gwen',       urgent:false, text:'Briefing final artistes — horaires précis à chaque manager'},
  {id:'s9-g2', week:'s9',pole:'gwen',       urgent:false, text:'Coordination finale collective Kassav\' — ordre de passage'},
  {id:'s9-fa1',week:'s9',pole:'fabrice',    urgent:false, text:'Tests techniques complets — son + lumière + vidéo'},
  {id:'s9-fa2',week:'s9',pole:'fabrice',    urgent:false, text:'Test live streaming JTV Digital · connexion TRACE'},
  {id:'s9-co1',week:'s9',pole:'comm',       urgent:false, text:'Communiqué de presse final — tous médias partenaires'},
  {id:'s9-ad1',week:'s9',pole:'admin',      urgent:false, text:'Budget final consolidé — point trésorerie'},
  {id:'s10-f1',week:'s10',pole:'fondateur', urgent:false, text:'Plan de contingence — artiste remplaçant si annulation'},
  {id:'s10-co1',week:'s10',pole:'comm',     urgent:false, text:'Posts quotidiens J–10 → J–1 — compte à rebours #ChiminSavann'},
  {id:'s10-g1',week:'s10',pole:'gwen',      urgent:false, text:'Arrivée artistes — accueil aéroport + installation hôtels'},
  {id:'s10-g2',week:'s10',pole:'gwen',      urgent:false, text:'Vérification loges + catering + transfers J1–J4'},
  {id:'s10-fa1',week:'s10',pole:'fabrice',  urgent:false, text:'Régie opérationnelle à 100% · check final matériel'},
  {id:'s11-f1',week:'s11',pole:'fondateur', urgent:false, text:'19 mai 16h — Conférence de presse · discours d\'ouverture'},
  {id:'s11-f2',week:'s11',pole:'fondateur', urgent:false, text:'19 mai 18h — Cocktail institutionnel · accueil CTM · DAC · VIP'},
  {id:'s11-f3',week:'s11',pole:'fondateur', urgent:false, text:'22 mai 11h — Cérémonie commémorative · prise de parole fondateur'},
  {id:'s11-f4',week:'s11',pole:'fondateur', urgent:false, text:'Point Gwen quotidien J1–J4 — décisions de dernière minute'},
  {id:'s11-g1',week:'s11',pole:'gwen',      urgent:false, text:'19 mai — Accueil équipes · accréditations · briefing kick-off 14h'},
  {id:'s11-g2',week:'s11',pole:'gwen',      urgent:false, text:'20–21 mai — Masterclasses · répétitions générales · captation CFA'},
  {id:'s11-g3',week:'s11',pole:'gwen',      urgent:false, text:'22 mai — Ouverture portes 17h · gestion flux 6000 personnes'},
  {id:'s11-fa1',week:'s11',pole:'fabrice',  urgent:false, text:'20 mai 08h — Soundcheck scène principale'},
  {id:'s11-fa2',week:'s11',pole:'fabrice',  urgent:false, text:'21 mai — Répétitions générales avec tous artistes'},
  {id:'s11-fa3',week:'s11',pole:'fabrice',  urgent:false, text:'22 mai 19h — Show live · captation · streaming'},
  {id:'s11-co1',week:'s11',pole:'comm',     urgent:false, text:'Live coverage J1–J4 — stories · photos · vidéos temps réel'},
  {id:'s11-co2',week:'s11',pole:'comm',     urgent:false, text:'22 mai — Live tweet / story durant toute la nuit'}
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Calculate days remaining until May 22, 2026
const getDaysRemaining = () => {
  const eventDate = new Date('2026-05-22T00:00:00');
  const today = new Date();
  const diff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

// Get current week based on today's date
const getCurrentWeek = () => {
  const today = new Date();
  // For demo, return s1 as current
  return 's1';
};

// ═══════════════════════════════════════════════════════════════
// TASK CARD COMPONENT (Mobile-responsive)
// ═══════════════════════════════════════════════════════════════
const TaskCard = ({ task, done, onToggle, canEdit, readOnly }) => {
  const pole = POLES[task.pole];
  
  return (
    <div 
      className={`task-card flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg transition-all ${task.urgent ? 'border-l-4' : ''} ${done ? 'opacity-60' : ''}`}
      style={{ 
        background: task.urgent && !done ? 'rgba(232,90,79,0.08)' : COLORS.card,
        borderColor: task.urgent ? COLORS.urgent : 'transparent'
      }}
      data-testid={`task-${task.id}`}
    >
      {/* Mobile: Top row with checkbox, pole dot, and badges */}
      <div className="flex items-center gap-2 w-full sm:w-auto sm:contents">
        {/* Checkbox */}
        <button 
          onClick={() => !readOnly && canEdit && onToggle(task.id)}
          disabled={readOnly || !canEdit}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${!readOnly && canEdit ? 'cursor-pointer hover:border-current' : 'cursor-default opacity-50'}`}
          style={{ 
            borderColor: done ? COLORS.success : COLORS.textMuted,
            background: done ? COLORS.success : 'transparent'
          }}
        >
          {done && <CheckCircle className="w-3 h-3 text-white" />}
        </button>
        
        {/* Pole indicator */}
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: pole.color }}
        />
        
        {/* Mobile: Badges inline */}
        <div className="flex sm:hidden flex-wrap gap-1 ml-auto">
          {task.urgent && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: COLORS.urgent, color: '#fff' }}>
              Urgent
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${pole.color}20`, color: pole.color }}>
            {pole.icon}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className={`text-xs sm:text-sm ${task.urgent ? 'font-semibold' : ''} ${done ? 'line-through' : ''}`} style={{ color: COLORS.text }}>
          {task.text}
          {task.sent && (
            <span className="ml-2 text-[10px] sm:text-xs italic" style={{ color: COLORS.success }}>
              ✓ envoyé
            </span>
          )}
        </div>
        {task.sub && (
          <div className="text-[10px] sm:text-xs mt-1 line-clamp-2 sm:line-clamp-none" style={{ color: COLORS.textMuted }}>
            {task.sub}
          </div>
        )}
      </div>
      
      {/* Desktop: Badges */}
      <div className="hidden sm:flex flex-wrap gap-1 flex-shrink-0">
        {task.urgent && (
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: COLORS.urgent, color: '#fff' }}>
            Urgent
          </span>
        )}
        <span className="px-2 py-0.5 rounded text-xs" style={{ background: `${pole.color}20`, color: pole.color }}>
          {pole.icon} {pole.label}
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// WEEK SECTION COMPONENT (Mobile-responsive)
// ═══════════════════════════════════════════════════════════════
const WeekSection = ({ week, tasks, taskStatus, onToggle, canEditPoles, readOnly, isCurrentWeek }) => {
  const [isOpen, setIsOpen] = useState(isCurrentWeek);
  
  const weekTasks = tasks.filter(t => t.week === week.id);
  const doneCount = weekTasks.filter(t => taskStatus[t.id]).length;
  const deadline = DEADLINES[week.id];
  const checkpoint = CHECKPOINTS[week.id];
  
  const phaseLabel = week.phase === 'metro' ? '📍 Métro' : week.phase === 'mq' ? '🇲🇶 MQ' : '⭐';
  const phaseLabelFull = week.phase === 'metro' ? '📍 Métropole' : week.phase === 'mq' ? '🇲🇶 Martinique' : '⭐ Événement';
  
  return (
    <div className="mb-3 sm:mb-4">
      {/* Week Header - Mobile optimized */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all ${isCurrentWeek ? 'ring-2' : ''}`}
        style={{ 
          background: COLORS.card,
          ringColor: COLORS.gold
        }}
      >
        {/* Mobile: Compact row */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-base sm:text-lg font-bold" style={{ color: COLORS.gold }}>{week.id.toUpperCase()}</span>
          <span className="text-xs sm:text-sm" style={{ color: COLORS.textMuted }}>{week.dates}</span>
          <span className="sm:hidden text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ background: `${COLORS.gold}20`, color: COLORS.gold }}>
            {phaseLabel}
          </span>
          <span className="text-xs sm:text-sm font-mono" style={{ color: COLORS.textMuted }}>
            {doneCount}/{weekTasks.length}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.textMuted }} /> : <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.textMuted }} />}
        </div>
        
        {/* Desktop: Full label */}
        <span className="hidden sm:block text-sm flex-1 text-left" style={{ color: COLORS.text }}>
          {week.label} — <em style={{ color: COLORS.textMuted }}>{phaseLabelFull}</em>
        </span>
        
        {/* Mobile: Label on second row if current week */}
        {isCurrentWeek && (
          <span className="w-full sm:w-auto mt-1 sm:mt-0 text-xs text-left sm:text-center truncate" style={{ color: COLORS.text }}>
            <span className="sm:hidden">{week.label}</span>
            <span className="hidden sm:inline px-2 py-1 rounded text-xs font-medium" style={{ background: COLORS.gold, color: COLORS.bg }}>
              Semaine en cours
            </span>
          </span>
        )}
        
        {/* Desktop: "Semaine en cours" badge is inside the desktop span above */}
      </button>
      
      {/* Week Tasks */}
      {isOpen && (
        <div className="mt-2 space-y-2">
          {/* Deadline banner - Mobile optimized */}
          {deadline && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg" style={{ background: 'rgba(232,90,79,0.1)', border: `1px solid ${COLORS.urgent}40` }}>
              <span className="px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ background: COLORS.urgent, color: '#fff' }}>
                {deadline.date}
              </span>
              <span className="text-xs sm:text-sm" style={{ color: COLORS.urgent }}>{deadline.text}</span>
            </div>
          )}
          
          {/* Tasks */}
          {weekTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              done={taskStatus[task.id] || false}
              onToggle={onToggle}
              canEdit={canEditPoles.includes(task.pole)}
              readOnly={readOnly}
            />
          ))}
          
          {/* Checkpoint - Mobile optimized */}
          {checkpoint && (
            <div className="p-3 sm:p-4 rounded-lg mt-3 sm:mt-4" style={{ background: `${COLORS.gold}15`, border: `1px solid ${COLORS.gold}40` }}>
              <div className="font-bold text-sm sm:text-base" style={{ color: COLORS.gold }}>{checkpoint.title}</div>
              <div className="text-[11px] sm:text-sm mt-1" style={{ color: COLORS.textMuted }}>{checkpoint.sub}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// POLE STATS CARD (Mobile-responsive)
// ═══════════════════════════════════════════════════════════════
const PoleStatsCard = ({ poleId, tasks, taskStatus }) => {
  const pole = POLES[poleId];
  const poleTasks = tasks.filter(t => t.pole === poleId);
  const doneCount = poleTasks.filter(t => taskStatus[t.id]).length;
  const pct = poleTasks.length > 0 ? Math.round((doneCount / poleTasks.length) * 100) : 0;
  
  return (
    <div className="p-2 sm:p-4 rounded-lg flex flex-col items-center sm:items-start" style={{ background: COLORS.card }}>
      <div className="text-lg sm:text-2xl font-bold" style={{ color: pole.color }}>{pct}%</div>
      <div className="text-[10px] sm:text-sm text-center sm:text-left" style={{ color: COLORS.text }}>
        <span className="sm:hidden">{pole.icon}</span>
        <span className="hidden sm:inline">{pole.icon} {pole.label}</span>
      </div>
      <div className="text-[9px] sm:text-xs" style={{ color: COLORS.textMuted }}>{doneCount}/{poleTasks.length}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════
const DashboardCC2026 = ({ workspaceId = 'CC2026admin' }) => {
  const [taskStatus, setTaskStatus] = useState({});
  const [view, setView] = useState('pole'); // 'pole' or 'global'
  const [loading, setLoading] = useState(true);
  
  // Offline sync hook
  const {
    isOnline,
    pendingCount,
    lastSync,
    syncStatus,
    saveTaskStatus,
    getLocalTaskStatuses,
    updateFromServer,
    syncPendingChanges,
    forceRefresh
  } = useOfflineSync((status) => {
    if (status === 'online') {
      toast.success('Connexion rétablie', { description: 'Synchronisation en cours...' });
    } else {
      toast.warning('Mode hors-ligne', { description: 'Vos modifications seront synchronisées au retour de la connexion' });
    }
  });
  
  // Determine which poles this workspace can edit
  const canEditPoles = useMemo(() => WORKSPACE_POLES[workspaceId] || [], [workspaceId]);
  const isAdmin = workspaceId === 'CC2026admin';
  
  // Calculate stats
  const stats = useMemo(() => {
    const total = TASKS.length;
    const done = Object.values(taskStatus).filter(Boolean).length;
    const urgent = TASKS.filter(t => t.urgent && !taskStatus[t.id]).length;
    const remaining = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, urgent, remaining, pct, days: getDaysRemaining() };
  }, [taskStatus]);
  
  // Filter tasks by workspace poles for "Mon Pôle" view
  const myTasks = useMemo(() => {
    if (isAdmin) return TASKS;
    return TASKS.filter(t => canEditPoles.includes(t.pole));
  }, [canEditPoles, isAdmin]);
  
  // Fetch task status from backend (with offline fallback)
  const fetchStatus = useCallback(async () => {
    try {
      if (isOnline) {
        const res = await fetch(`${API_URL}/api/cc2026/tasks/status`);
        if (res.ok) {
          const data = await res.json();
          const statusMap = {};
          data.statuses?.forEach(s => { statusMap[s.task_id] = s.done; });
          setTaskStatus(statusMap);
          
          // Update local cache
          await updateFromServer(data.statuses || []);
        }
      } else {
        // Load from local cache when offline
        const localStatuses = await getLocalTaskStatuses();
        setTaskStatus(localStatuses);
      }
    } catch (e) {
      console.error('Failed to fetch task status:', e);
      // Fallback to local cache on error
      const localStatuses = await getLocalTaskStatuses();
      if (Object.keys(localStatuses).length > 0) {
        setTaskStatus(localStatuses);
        toast.info('Données locales chargées', { description: 'Utilisation du cache hors-ligne' });
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, updateFromServer, getLocalTaskStatuses]);
  
  // Initial fetch + polling (less frequent when offline)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, isOnline ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [fetchStatus, isOnline]);
  
  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    
    const result = await forceRefresh(fetchStatus);
    if (result) {
      toast.success('Synchronisation terminée');
    }
  }, [forceRefresh, fetchStatus, syncStatus]);
  
  // Toggle task (with offline support)
  const handleToggle = useCallback(async (taskId) => {
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;
    
    // Check permission
    if (!isAdmin && !canEditPoles.includes(task.pole)) {
      return; // No permission
    }
    
    const newDone = !taskStatus[taskId];
    
    // Optimistic update
    setTaskStatus(prev => ({ ...prev, [taskId]: newDone }));
    
    // Save to local cache first (always works)
    await saveTaskStatus(taskId, newDone, workspaceId);
    
    // Send to backend if online
    if (isOnline) {
      try {
        await fetch(`${API_URL}/api/cc2026/tasks/${taskId}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: workspaceId, done: newDone })
        });
      } catch (e) {
        console.error('Failed to toggle task:', e);
        // Data is already saved locally, will sync later
      }
    }
  }, [taskStatus, workspaceId, isAdmin, canEditPoles, isOnline, saveTaskStatus]);
  
  const currentWeek = getCurrentWeek();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: COLORS.gold }} />
          <div style={{ color: COLORS.textMuted }}>Chargement...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen" style={{ background: COLORS.bg, fontFamily: "'Barlow', sans-serif" }}>
      {/* Top Bar - Mobile responsive */}
      <div className="border-b" style={{ borderColor: COLORS.border, background: COLORS.card }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          {/* Mobile: Stacked layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            {/* Title section */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Dashboard Opérationnel — CC2026</div>
              <div className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.text }}>
                Chimin <span style={{ color: COLORS.gold }}>Savann</span>
                <span className="hidden sm:inline"> — 22 Mai 2026</span>
              </div>
            </div>
            
            {/* Stats row - horizontal scroll on mobile */}
            <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="text-center flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }}>{stats.days}</div>
                <div className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: COLORS.textMuted }}>Jours</div>
              </div>
              <div className="w-px h-6 sm:h-8 flex-shrink-0" style={{ background: COLORS.border }} />
              <div className="text-center flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.text }}>{stats.pct}%</div>
                <div className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: COLORS.textMuted }}>Accompli</div>
              </div>
              <div className="w-px h-6 sm:h-8 flex-shrink-0" style={{ background: COLORS.border }} />
              <div className="text-center flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.urgent }}>{stats.urgent}</div>
                <div className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: COLORS.textMuted }}>Urgences</div>
              </div>
              <div className="w-px h-6 sm:h-8 flex-shrink-0" style={{ background: COLORS.border }} />
              <div className="text-center flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.text }}>{stats.remaining}</div>
                <div className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: COLORS.textMuted }}>Restantes</div>
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1" style={{ background: COLORS.border }}>
          <div className="h-full transition-all duration-500" style={{ width: `${stats.pct}%`, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldLight})` }} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* View Toggle - Mobile responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('pole')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all ${view === 'pole' ? 'font-bold' : ''}`}
              style={{ 
                background: view === 'pole' ? COLORS.gold : COLORS.card,
                color: view === 'pole' ? COLORS.bg : COLORS.text
              }}
              data-testid="view-pole"
            >
              Mon Pôle <span className="hidden sm:inline">({myTasks.length} tâches)</span>
            </button>
            <button
              onClick={() => setView('global')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all ${view === 'global' ? 'font-bold' : ''}`}
              style={{ 
                background: view === 'global' ? COLORS.gold : COLORS.card,
                color: view === 'global' ? COLORS.bg : COLORS.text
              }}
              data-testid="view-global"
            >
              Vue Globale
            </button>
            <button
              onClick={() => setView('smart-engine')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all ${view === 'smart-engine' ? 'font-bold' : ''}`}
              style={{
                background: view === 'smart-engine' ? COLORS.gold : COLORS.card,
                color: view === 'smart-engine' ? COLORS.bg : COLORS.text
              }}
              data-testid="view-smart-engine"
            >
              <BarChart3 className="w-3 h-3 inline mr-1" />
              Smart Engine
            </button>
          </div>
          {/* Offline/Online Status & Sync */}
          <div className="flex items-center gap-2 text-[10px] sm:text-xs" style={{ color: COLORS.textMuted }}>
            {/* Pending changes indicator */}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: `${COLORS.urgent}20`, color: COLORS.urgent }}>
                <CloudOff className="w-3 h-3" />
                {pendingCount} en attente
              </span>
            )}
            
            {/* Sync button */}
            <button
              onClick={handleRefresh}
              disabled={syncStatus === 'syncing' || !isOnline}
              className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
              title={isOnline ? 'Synchroniser' : 'Hors ligne'}
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} style={{ color: COLORS.textMuted }} />
            </button>
            
            {/* Last sync time */}
            <span className="hidden sm:inline">
              {lastSync && `Sync: ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            
            {/* Online/Offline indicator */}
            <span className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3" style={{ color: COLORS.success }} />
                  <span className="hidden sm:inline" style={{ color: COLORS.success }}>En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" style={{ color: COLORS.urgent }} />
                  <span style={{ color: COLORS.urgent }}>Hors ligne</span>
                </>
              )}
            </span>
          </div>
        </div>
        
        {/* Smart Engine View */}
        {view === 'smart-engine' && (
          <div className="-mx-3 sm:-mx-4">
            <SmartEngineDashboard />
          </div>
        )}

        {/* Pole Stats - Mobile: 5 columns grid instead of 9 */}
        {view === 'global' && (
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto">
            {Object.keys(POLES).map(poleId => (
              <PoleStatsCard key={poleId} poleId={poleId} tasks={TASKS} taskStatus={taskStatus} />
            ))}
          </div>
        )}
        
        {/* Tasks by Week */}
        {view !== 'smart-engine' && (
        <div>
          {WEEKS.map(week => (
            <WeekSection
              key={week.id}
              week={week}
              tasks={view === 'pole' ? myTasks : TASKS}
              taskStatus={taskStatus}
              onToggle={handleToggle}
              canEditPoles={canEditPoles}
              readOnly={view === 'global' && !isAdmin}
              isCurrentWeek={week.id === currentWeek}
            />
          ))}
        </div>
        )}
        
        {/* Jour J Banner - Mobile responsive */}
        {view !== 'smart-engine' && (
        <div className="mt-6 sm:mt-8 p-4 sm:p-8 rounded-xl text-center" style={{ background: `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.card})`, border: `2px solid ${COLORS.gold}` }}>
          <div className="text-[10px] sm:text-sm uppercase tracking-widest mb-1 sm:mb-2" style={{ color: COLORS.textMuted }}>
            <span className="sm:hidden">22 Mai 2026 — Fort-de-France</span>
            <span className="hidden sm:inline">Vendredi 22 Mai 2026 — Fort-de-France, Martinique</span>
          </div>
          <div className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }}>
            ★ CHIMIN SAVANN ★
          </div>
          <div className="text-[10px] sm:text-sm" style={{ color: COLORS.textMuted }}>
            <span className="sm:hidden">6 000 spectateurs · Grand Carbet</span>
            <span className="hidden sm:inline">6 000 spectateurs · Grand Carbet Aimé Césaire · Commémoration Abolition de l'Esclavage</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCC2026;
