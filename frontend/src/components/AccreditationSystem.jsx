import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Users, Search, RefreshCw, CheckCircle, XCircle, Download, 
  Plus, BarChart3, QrCode, Printer, Eye, Loader2, X, Edit2, Trash2,
  MapPin, Building2, Mail, Phone, Clock, Tag, Filter, Save, FileDown,
  FileText, ArrowLeft, HelpCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { HelpButton } from './UserGuides';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION BASEROW
// ─────────────────────────────────────────────────────────────
// ATTENTION SÉCURITÉ : Ce token ne doit JAMAIS être hardcodé ici.
// Il est lu depuis la variable d'environnement REACT_APP_BASEROW_TOKEN.
// Note : même en variable d'env React, ce token est visible dans le
// bundle JS final. La solution définitive est de proxifier ces appels
// via /api/accreditation/* sur le backend (qui détient le token côté serveur).
// ═══════════════════════════════════════════════════════════════
const BASEROW_TOKEN = process.env.REACT_APP_BASEROW_TOKEN || '';
const BASEROW_TABLE = process.env.REACT_APP_BASEROW_TABLE_ID || '865847';
const BASEROW_API = 'https://api.baserow.io/api';
const BADGE_BASE_URL = (process.env.REACT_APP_BADGE_BASE_URL || 'https://kiltikonet.fr/badge/').replace(/\/$/, '') + '/';

// Design colors from flyer
const COLORS = {
  charbon: '#1C1A14',
  terracotta: '#C4714A',
  gold: '#D4A84B',
  forest: '#4A5D4E',
  cream: '#F4F1EA',
  burgundy: '#8B1A4A',
  teal: '#0B6E7A'
};

// ═══════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════
const baserowGet = async (endpoint) => {
  const res = await fetch(`${BASEROW_API}${endpoint}`, {
    headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

const baserowPatch = async (endpoint, data) => {
  const res = await fetch(`${BASEROW_API}${endpoint}`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

const baserowPost = async (endpoint, data) => {
  const res = await fetch(`${BASEROW_API}${endpoint}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

const baserowDelete = async (endpoint) => {
  const res = await fetch(`${BASEROW_API}${endpoint}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return true;
};

// ═══════════════════════════════════════════════════════════════
// BADGE TYPES & COLORS
// ═══════════════════════════════════════════════════════════════
const BADGE_TYPES = [
  'VIP', 'Presse', 'Exposant', 'Artiste', 'Staff Artiste', 'Benevole', 
  'Institutionnel', 'Emergent', 'Professionnel', 'Public', 'Staff', 
  'Regie technique', 'Visiteur', 'Participant',
  'Partenaire Or', 'Partenaire Silver', 'Partenaire Bronze'
];
const TERRITORIES = ['Martinique', 'Guadeloupe', 'Guyane', 'Haiti', 'France hexagonale', 'Afrique', 'Autre'];
const SECTORS = ['Musique', 'Arts visuels', 'Audiovisuel', 'Danse', 'Numerique', 'Education', 'Institutionnel', 'Autre'];

// Helper function to extract value from Baserow Single Select fields
// Baserow returns {id, value, color} for Single Select, but sometimes just a string
const getFieldValue = (field) => {
  if (field === null || field === undefined) return '';
  if (typeof field === 'object' && field.value !== undefined) return field.value;
  return String(field);
};

const BADGE_COLORS = {
  'VIP': { bg: COLORS.burgundy, text: '#fff', accent: COLORS.gold },
  'Presse': { bg: COLORS.teal, text: '#fff', accent: COLORS.cream },
  'Exposant': { bg: COLORS.gold, text: COLORS.charbon, accent: COLORS.terracotta },
  'Artiste': { bg: COLORS.terracotta, text: '#fff', accent: COLORS.gold },
  'Staff Artiste': { bg: COLORS.terracotta, text: '#fff', accent: COLORS.gold },
  'Benevole': { bg: COLORS.forest, text: '#fff', accent: COLORS.gold },
  'Institutionnel': { bg: '#5B9BD5', text: '#fff', accent: COLORS.cream },
  'Staff': { bg: COLORS.charbon, text: COLORS.gold, accent: COLORS.terracotta },
  'Regie technique': { bg: '#333', text: COLORS.gold, accent: COLORS.terracotta },
  'Emergent': { bg: '#6B46C1', text: '#fff', accent: COLORS.gold },
  'Professionnel': { bg: '#2D5A7B', text: '#fff', accent: COLORS.gold },
  'Public': { bg: '#6B7280', text: '#fff', accent: COLORS.cream },
  'Visiteur': { bg: '#9CA3AF', text: COLORS.charbon, accent: COLORS.cream },
  'Participant': { bg: '#4B5563', text: '#fff', accent: COLORS.cream },
  'Partenaire Or': { bg: COLORS.gold, text: COLORS.charbon, accent: COLORS.burgundy },
  'Partenaire Silver': { bg: '#C0C0C0', text: COLORS.charbon, accent: COLORS.teal },
  'Partenaire Bronze': { bg: '#CD7F32', text: '#fff', accent: COLORS.charbon }
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export const AccreditationSystem = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accreditations');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBadge, setFilterBadge] = useState('all');
  // Initialize presence filter from localStorage for persistence
  const [filterPresence, setFilterPresence] = useState(() => {
    return localStorage.getItem('cc2026_filter_presence') || 'all';
  });
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  
  // Badge generator state
  const [badgeProfile, setBadgeProfile] = useState('Artiste');
  const [badgeData, setBadgeData] = useState({
    name: '', org: '', extra: '', note: '', access: 'full'
  });
  const [generatedCount, setGeneratedCount] = useState(0);
  const badgeRef = useRef(null);
  
  // ─────────────────────────────────────────────
  // Load all participants from Baserow
  // ─────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      let all = [], page = 1, hasMore = true;
      while (hasMore) {
        const data = await baserowGet(`/database/rows/table/${BASEROW_TABLE}/?user_field_names=true&page=${page}&size=100`);
        all = [...all, ...data.results];
        hasMore = !!data.next;
        page++;
      }
      setParticipants(all);
      setConnected(true);
      toast.success(`${all.length} participants charges`);
    } catch (error) {
      setConnected(false);
      toast.error('Erreur de connexion Baserow');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─────────────────────────────────────────────
  // Statistics (real-time) - using normalized field values
  // ─────────────────────────────────────────────
  const stats = {
    total: participants.length,
    present: participants.filter(p => getFieldValue(p['Statut presence']) === 'Present').length,
    absent: participants.filter(p => getFieldValue(p['Statut presence']) !== 'Present').length,
    rate: participants.length ? Math.round((participants.filter(p => getFieldValue(p['Statut presence']) === 'Present').length / participants.length) * 100) : 0,
    byType: participants.reduce((acc, p) => {
      const type = getFieldValue(p['Type de badge']) || 'Autre';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
    byTerritory: participants.reduce((acc, p) => {
      const terr = getFieldValue(p["Territoire d'origine"]) || 'Non renseigne';
      acc[terr] = (acc[terr] || 0) + 1;
      return acc;
    }, {}),
    bySector: participants.reduce((acc, p) => {
      const sector = getFieldValue(p["Secteur d'activite"]) || 'Non renseigne';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {})
  };

  // ─────────────────────────────────────────────
  // Filter participants - with normalized values
  // ─────────────────────────────────────────────
  const filteredParticipants = participants.filter(p => {
    const searchMatch = searchQuery === '' || 
      `${p.Prenom || ''} ${p.Nom || ''} ${p.Organisation || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const badgeMatch = filterBadge === '' || filterBadge === 'all' || getFieldValue(p['Type de badge']) === filterBadge;
    const presenceMatch = filterPresence === '' || filterPresence === 'all' ||
      (filterPresence === 'present' ? getFieldValue(p['Statut presence']) === 'Present' : getFieldValue(p['Statut presence']) !== 'Present');
    return searchMatch && badgeMatch && presenceMatch;
  });

  // ─────────────────────────────────────────────
  // Validate presence
  // ─────────────────────────────────────────────
  const validatePresence = async (participant) => {
    const heure = new Date().toTimeString().slice(0, 5);
    try {
      await baserowPatch(`/database/rows/table/${BASEROW_TABLE}/${participant.id}/?user_field_names=true`, {
        'Statut presence': 'Present',
        "Heure d'arrivee": heure
      });
      
      setParticipants(prev => prev.map(p => 
        p.id === participant.id 
          ? { ...p, 'Statut presence': 'Present', "Heure d'arrivee": heure }
          : p
      ));
      
      if (selectedParticipant?.id === participant.id) {
        setSelectedParticipant({ ...participant, 'Statut presence': 'Present', "Heure d'arrivee": heure });
      }
      
      toast.success(`${participant.Prenom} ${participant.Nom} - ${heure}`);
    } catch (error) {
      toast.error('Erreur de validation');
      console.error(error);
    }
  };

  // ─────────────────────────────────────────────
  // Delete participant
  // ─────────────────────────────────────────────
  const deleteParticipant = async (participant) => {
    if (!window.confirm(`Supprimer ${participant.Prenom} ${participant.Nom} ?`)) return;
    
    try {
      await baserowDelete(`/database/rows/table/${BASEROW_TABLE}/${participant.id}/`);
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
      if (selectedParticipant?.id === participant.id) setSelectedParticipant(null);
      toast.success('Participant supprime');
    } catch (error) {
      toast.error('Erreur de suppression');
      console.error(error);
    }
  };

  // ─────────────────────────────────────────────
  // Update participant
  // ─────────────────────────────────────────────
  const updateParticipant = async (data) => {
    try {
      const updated = await baserowPatch(`/database/rows/table/${BASEROW_TABLE}/${data.id}/?user_field_names=true`, data);
      setParticipants(prev => prev.map(p => p.id === data.id ? { ...p, ...updated } : p));
      setEditingParticipant(null);
      toast.success('Participant mis a jour');
    } catch (error) {
      toast.error('Erreur de mise a jour');
      console.error(error);
    }
  };

  // ─────────────────────────────────────────────
  // Add new participant (saves to Baserow)
  // ─────────────────────────────────────────────
  const [newParticipant, setNewParticipant] = useState({
    Prenom: '', Nom: '', Organisation: '', Email: '', Telephone: '',
    'Type de badge': 'Artiste', "Territoire d'origine": 'Martinique',
    "Secteur d'activite": 'Musique', 'Zones acces': ''
  });

  const addParticipant = async () => {
    if (!newParticipant.Prenom || !newParticipant.Nom) {
      toast.error('Prenom et Nom requis');
      return;
    }
    
    try {
      const data = {
        ...newParticipant,
        'Statut presence': 'Absent',
        'kiltikonet inscrit': 'Non',
        'Consentement RGPD': 'Oui'
      };
      
      const created = await baserowPost(`/database/rows/table/${BASEROW_TABLE}/?user_field_names=true`, data);
      setParticipants(prev => [...prev, created]);
      setShowAddForm(false);
      setNewParticipant({
        Prenom: '', Nom: '', Organisation: '', Email: '', Telephone: '',
        'Type de badge': 'Artiste', "Territoire d'origine": 'Martinique',
        "Secteur d'activite": 'Musique', 'Zones acces': ''
      });
      toast.success(`${data.Prenom} ${data.Nom} ajoute a Baserow`);
      return created;
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
      console.error(error);
      return null;
    }
  };

  // ─────────────────────────────────────────────
  // Export CSV
  // ─────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID', 'Prenom', 'Nom', 'Organisation', 'Email', 'Telephone', 'Type Badge', 'Territoire', 'Secteur', 'Statut', 'Heure Arrivee'];
    const rows = participants.map(p => [
      p.id, p.Prenom, p.Nom, p.Organisation, p.Email, p.Telephone,
      p['Type de badge'], p["Territoire d'origine"], p["Secteur d'activite"],
      p['Statut presence'], p["Heure d'arrivee"]
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cc2026_accreditations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Liste exportee en CSV');
  };

  // ─────────────────────────────────────────────
  // Load participant to badge generator
  // ─────────────────────────────────────────────
  const loadToBadge = (participant) => {
    setBadgeData({
      name: `${participant.Prenom || ''} ${participant.Nom || ''}`.trim(),
      org: participant.Organisation || '',
      extra: participant['Zones acces'] || '',
      note: '',
      access: 'full',
      participantId: participant.id
    });
    setBadgeProfile(participant['Type de badge'] || 'Artiste');
    setActiveTab('badges');
    toast.success(`Badge: ${participant.Prenom} ${participant.Nom}`);
  };

  // ─────────────────────────────────────────────
  // Tab content renderers
  // ─────────────────────────────────────────────
  const tabs = [
    { id: 'accreditations', label: 'Accreditations', icon: Users },
    { id: 'badges', label: 'Generateur', icon: Tag },
    { id: 'qrcodes', label: 'QR Codes', icon: QrCode },
    { id: 'stats', label: 'Observatoire', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.charbon, color: 'rgba(255,255,255,0.85)', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#2A2820', borderBottom: `1px solid ${COLORS.gold}30` }} className="p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin')}
              className="text-white/60 hover:text-white"
              data-testid="back-to-admin-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" 
                style={{ background: `linear-gradient(135deg, ${COLORS.terracotta}, ${COLORS.burgundy})`, color: '#fff' }}>
                CC
              </div>
              <div>
                <div className="font-bold text-sm tracking-wider" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>CULTURE CONNECT</div>
                <div className="text-xs" style={{ color: COLORS.terracotta }}>Systeme Accreditation</div>
              </div>
            </div>
            {/* Help Button */}
            <HelpButton guideId="accreditation" />
          </div>
          <div className="flex items-center gap-4">
            {/* Help Button Badges */}
            <HelpButton guideId="badges" />
            {/* Stats mini */}
            <div className="hidden md:flex items-center gap-3 text-xs font-mono">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{stats.total} inscrits</span>
              <span style={{ color: '#4DBF8A' }}>{stats.present} presents</span>
              <span style={{ color: COLORS.gold }}>{stats.rate}%</span>
            </div>
            <div className={`flex items-center gap-2 text-xs font-mono ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'BASEROW' : 'OFFLINE'}
            </div>
            <Button onClick={loadAll} disabled={loading} size="sm" style={{ background: COLORS.terracotta }} className="hover:opacity-90" data-testid="refresh-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button onClick={exportCSV} size="sm" variant="outline" style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }} data-testid="export-csv-btn">
              <FileDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#2A2820', borderBottom: `1px solid ${COLORS.gold}30` }}>
        <div className="max-w-7xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all"
              style={{
                color: activeTab === tab.id ? COLORS.gold : 'rgba(255,255,255,0.3)',
                borderColor: activeTab === tab.id ? COLORS.gold : 'transparent',
                fontFamily: "'Syne', sans-serif"
              }}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'accreditations' && (
          <AccreditationsTab 
            participants={filteredParticipants}
            stats={stats}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterBadge={filterBadge}
            setFilterBadge={setFilterBadge}
            filterPresence={filterPresence}
            setFilterPresence={setFilterPresence}
            selectedParticipant={selectedParticipant}
            setSelectedParticipant={setSelectedParticipant}
            validatePresence={validatePresence}
            loadToBadge={loadToBadge}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            newParticipant={newParticipant}
            setNewParticipant={setNewParticipant}
            addParticipant={addParticipant}
            deleteParticipant={deleteParticipant}
            editingParticipant={editingParticipant}
            setEditingParticipant={setEditingParticipant}
            updateParticipant={updateParticipant}
          />
        )}
        
        {activeTab === 'badges' && (
          <BadgeGeneratorTab 
            badgeProfile={badgeProfile}
            setBadgeProfile={setBadgeProfile}
            badgeData={badgeData}
            setBadgeData={setBadgeData}
            generatedCount={generatedCount}
            setGeneratedCount={setGeneratedCount}
            participants={participants}
            loadToBadge={loadToBadge}
            badgeRef={badgeRef}
            addParticipant={addParticipant}
            newParticipant={newParticipant}
            setNewParticipant={setNewParticipant}
            setParticipants={setParticipants}
          />
        )}
        
        {activeTab === 'qrcodes' && (
          <QRCodesTab participants={participants} />
        )}
        
        {activeTab === 'stats' && (
          <StatisticsTab participants={participants} stats={stats} />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 1: ACCREDITATIONS
// ═══════════════════════════════════════════════════════════════
const AccreditationsTab = ({
  participants, stats, searchQuery, setSearchQuery,
  filterBadge, setFilterBadge, filterPresence, setFilterPresence,
  selectedParticipant, setSelectedParticipant, validatePresence,
  loadToBadge, showAddForm, setShowAddForm, newParticipant, 
  setNewParticipant, addParticipant, deleteParticipant,
  editingParticipant, setEditingParticipant, updateParticipant
}) => {
  const getInitials = (p) => ((p.Prenom || '?')[0] + (p.Nom || '?')[0]).toUpperCase();

  return (
    <div className="flex gap-6">
      {/* Main list */}
      <div className="flex-1">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: '#fff' },
            { label: 'Presents', value: stats.present, color: '#4DBF8A' },
            { label: 'Absents', value: stats.absent, color: 'rgba(255,255,255,0.3)' },
            { label: 'Taux', value: `${stats.rate}%`, color: COLORS.gold }
          ].map(stat => (
            <div key={stat.label} className="rounded-lg p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.gold}20` }}>
              <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Cormorant Garamond', serif" }}>{stat.value}</div>
              <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Syne', sans-serif" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Presence filter buttons with counters */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: 'Tous', count: stats.total, color: 'rgba(255,255,255,0.7)' },
            { value: 'present', label: 'Présents', count: stats.present, color: '#4DBF8A' },
            { value: 'absent', label: 'Absents', count: stats.absent, color: 'rgba(255,255,255,0.3)' }
          ].map(btn => (
            <button
              key={btn.value}
              onClick={() => {
                setFilterPresence(btn.value);
                localStorage.setItem('cc2026_filter_presence', btn.value);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterPresence === btn.value 
                  ? 'ring-2 ring-offset-2 ring-offset-[#1E1E35]' 
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ 
                background: filterPresence === btn.value ? `${btn.color}20` : 'rgba(255,255,255,0.05)',
                color: btn.color,
                borderColor: btn.color,
                border: `1px solid ${filterPresence === btn.value ? btn.color : 'rgba(255,255,255,0.1)'}`,
                ringColor: btn.color
              }}
              data-testid={`filter-presence-${btn.value}`}
            >
              {btn.label} <span className="ml-1 font-bold">({btn.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Badge Filter */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher un participant"
              className="pl-10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              data-testid="search-input"
            />
          </div>
          <Select value={filterBadge} onValueChange={setFilterBadge}>
            <SelectTrigger className="w-44 select-dark" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="filter-badge">
              <SelectValue placeholder="Type de badge" />
            </SelectTrigger>
            <SelectContent className="select-content-dark" style={{ background: '#1E1E35', border: '1px solid rgba(255,255,255,0.1)' }}>
              <SelectItem value="all" className="text-white">Tous les badges</SelectItem>
              {BADGE_TYPES.map(type => (
                <SelectItem key={type} value={type} className="text-white">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddForm(true)} style={{ background: COLORS.burgundy }} className="hover:opacity-90" data-testid="add-participant-btn">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Participants table */}
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.gold}20` }}>
          <table className="w-full" data-testid="participants-table">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th className="text-left p-3 text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Syne', sans-serif" }}>Participant</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Syne', sans-serif" }}>Badge</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Syne', sans-serif" }}>Presence</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Syne', sans-serif" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => {
                const badgeType = getFieldValue(p['Type de badge']);
                const presenceStatus = getFieldValue(p['Statut presence']);
                const isPresent = presenceStatus === 'Present';
                const colors = BADGE_COLORS[badgeType] || BADGE_COLORS['Artiste'];
                
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => setSelectedParticipant(p)}
                    className="cursor-pointer transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    data-testid={`participant-row-${p.id}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: colors.bg, color: colors.text }}>
                          {getInitials(p)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{p.Prenom} {p.Nom}</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.Organisation || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: `${colors.bg}30`, color: colors.bg === COLORS.gold ? COLORS.charbon : colors.text, border: `1px solid ${colors.bg}` }}>
                        {badgeType || '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-400' : 'bg-white/20'}`} />
                        <span className="text-xs">{isPresent ? `${p["Heure d'arrivee"] || ''}` : 'Absent'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); validatePresence(p); }}
                          disabled={isPresent}
                          style={{ background: isPresent ? 'rgba(77,191,138,0.2)' : COLORS.terracotta, color: isPresent ? '#4DBF8A' : '#fff' }}
                          data-testid={`validate-btn-${p.id}`}
                        >
                          {isPresent ? <CheckCircle className="w-4 h-4" /> : 'Valider'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); loadToBadge(p); }}
                          style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }}
                          data-testid={`badge-btn-${p.id}`}
                        >
                          Badge
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setEditingParticipant(p); }}
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                          data-testid={`edit-btn-${p.id}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); deleteParticipant(p); }}
                          style={{ color: 'rgba(207,96,96,0.7)' }}
                          data-testid={`delete-btn-${p.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {participants.length === 0 && (
            <div className="p-12 text-center text-sm font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>
              AUCUN RESULTAT
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 shrink-0 space-y-4">
        {/* Selected participant panel */}
        {selectedParticipant && (
          <ParticipantCard 
            participant={selectedParticipant}
            onClose={() => setSelectedParticipant(null)}
            onValidate={validatePresence}
            onLoadBadge={loadToBadge}
          />
        )}
        
        {/* Add form modal */}
        {showAddForm && (
          <AddParticipantModal
            newParticipant={newParticipant}
            setNewParticipant={setNewParticipant}
            onAdd={addParticipant}
            onClose={() => setShowAddForm(false)}
          />
        )}
        
        {/* Edit modal */}
        {editingParticipant && (
          <EditParticipantModal
            participant={editingParticipant}
            onUpdate={updateParticipant}
            onClose={() => setEditingParticipant(null)}
          />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PARTICIPANT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
const ParticipantCard = ({ participant, onClose, onValidate, onLoadBadge }) => {
  const isPresent = participant['Statut presence'] === 'Present';
  const colors = BADGE_COLORS[participant['Type de badge']] || BADGE_COLORS['Artiste'];
  
  return (
    <div className="rounded-lg p-5" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest font-bold" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>Fiche participant</span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }} className="hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: colors.bg, color: colors.text }}>
          {((participant.Prenom || '?')[0] + (participant.Nom || '?')[0]).toUpperCase()}
        </div>
        <div>
          <div className="font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{participant.Prenom} {participant.Nom}</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{participant.Organisation || '-'}</div>
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <Tag className="w-4 h-4" style={{ color: COLORS.terracotta }} />
          <span>{participant['Type de badge'] || '-'}</span>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <Mail className="w-4 h-4" style={{ color: COLORS.terracotta }} />
          <span>{participant.Email || '-'}</span>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <MapPin className="w-4 h-4" style={{ color: COLORS.terracotta }} />
          <span>{participant["Territoire d'origine"] || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-400' : 'bg-white/20'}`} />
          <span>{isPresent ? `Present - ${participant["Heure d'arrivee"] || ''}` : 'Absent'}</span>
        </div>
      </div>
      
      {!isPresent && (
        <Button onClick={() => onValidate(participant)} className="w-full mt-4" style={{ background: COLORS.terracotta }}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Valider presence
        </Button>
      )}
      
      <Button onClick={() => onLoadBadge(participant)} variant="outline" className="w-full mt-2" style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }}>
        Generer badge
      </Button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ADD PARTICIPANT MODAL
// ═══════════════════════════════════════════════════════════════
const AddParticipantModal = ({ newParticipant, setNewParticipant, onAdd, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Ajouter un participant">
    <div className="rounded-lg p-6 w-full max-w-md" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-bold" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>Ajouter participant</span>
        <button onClick={onClose} aria-label="Fermer" style={{ color: 'rgba(255,255,255,0.3)' }}><X className="w-5 h-5" /></button>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input value={newParticipant.Prenom} onChange={(e) => setNewParticipant(p => ({ ...p, Prenom: e.target.value }))} placeholder="Prenom *" aria-label="Prénom" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-prenom" />
          <Input value={newParticipant.Nom} onChange={(e) => setNewParticipant(p => ({ ...p, Nom: e.target.value }))} placeholder="Nom *" aria-label="Nom" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-nom" />
        </div>
        <Input value={newParticipant.Organisation} onChange={(e) => setNewParticipant(p => ({ ...p, Organisation: e.target.value }))} placeholder="Organisation" aria-label="Organisation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-org" />
        <Input value={newParticipant.Email} onChange={(e) => setNewParticipant(p => ({ ...p, Email: e.target.value }))} placeholder="Email" aria-label="Email" type="email" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-email" />
        <Input value={newParticipant.Telephone} onChange={(e) => setNewParticipant(p => ({ ...p, Telephone: e.target.value }))} placeholder="Telephone" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-phone" />
        <Select value={newParticipant['Type de badge']} onValueChange={(v) => setNewParticipant(p => ({ ...p, 'Type de badge': v }))}>
          <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-badge-type"><SelectValue /></SelectTrigger>
          <SelectContent style={{ background: '#2A2820', border: '1px solid rgba(255,255,255,0.1)' }}>
            {BADGE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={newParticipant["Territoire d'origine"]} onValueChange={(v) => setNewParticipant(p => ({ ...p, "Territoire d'origine": v }))}>
          <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-territory"><SelectValue /></SelectTrigger>
          <SelectContent style={{ background: '#2A2820', border: '1px solid rgba(255,255,255,0.1)' }}>
            {TERRITORIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={newParticipant["Secteur d'activite"]} onValueChange={(v) => setNewParticipant(p => ({ ...p, "Secteur d'activite": v }))}>
          <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="add-sector"><SelectValue /></SelectTrigger>
          <SelectContent style={{ background: '#2A2820', border: '1px solid rgba(255,255,255,0.1)' }}>
            {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-3 mt-6">
        <Button onClick={onClose} variant="outline" className="flex-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Annuler</Button>
        <Button onClick={onAdd} className="flex-1" style={{ background: COLORS.burgundy }} data-testid="confirm-add-btn">Ajouter</Button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// EDIT PARTICIPANT MODAL
// ═══════════════════════════════════════════════════════════════
const EditParticipantModal = ({ participant, onUpdate, onClose }) => {
  const [data, setData] = useState({ ...participant });
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Modifier un participant">
      <div className="rounded-lg p-6 w-full max-w-md" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>Modifier participant</span>
          <button onClick={onClose} aria-label="Fermer" style={{ color: 'rgba(255,255,255,0.3)' }}><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input value={data.Prenom || ''} onChange={(e) => setData(d => ({ ...d, Prenom: e.target.value }))} placeholder="Prenom" aria-label="Prénom" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-prenom" />
            <Input value={data.Nom || ''} onChange={(e) => setData(d => ({ ...d, Nom: e.target.value }))} placeholder="Nom" aria-label="Nom" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-nom" />
          </div>
          <Input value={data.Organisation || ''} onChange={(e) => setData(d => ({ ...d, Organisation: e.target.value }))} placeholder="Organisation" aria-label="Organisation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-org" />
          <Input value={data.Email || ''} onChange={(e) => setData(d => ({ ...d, Email: e.target.value }))} placeholder="Email" aria-label="Email" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-email" />
          <Select value={data['Type de badge'] || 'Artiste'} onValueChange={(v) => setData(d => ({ ...d, 'Type de badge': v }))}>
            <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-badge-type"><SelectValue /></SelectTrigger>
            <SelectContent style={{ background: '#2A2820', border: '1px solid rgba(255,255,255,0.1)' }}>
              {BADGE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={data["Territoire d'origine"] || 'Martinique'} onValueChange={(v) => setData(d => ({ ...d, "Territoire d'origine": v }))}>
            <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="edit-territory"><SelectValue /></SelectTrigger>
            <SelectContent style={{ background: '#2A2820', border: '1px solid rgba(255,255,255,0.1)' }}>
              {TERRITORIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Annuler</Button>
          <Button onClick={() => onUpdate(data)} className="flex-1" style={{ background: COLORS.terracotta }} data-testid="confirm-edit-btn">Enregistrer</Button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 2: BADGE GENERATOR - PROFESSIONAL DESIGN
// ═══════════════════════════════════════════════════════════════
const BadgeGeneratorTab = ({
  badgeProfile, setBadgeProfile,
  badgeData, setBadgeData, generatedCount, setGeneratedCount,
  participants, loadToBadge, badgeRef, addParticipant,
  newParticipant, setNewParticipant, setParticipants
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [currentQRUrl, setCurrentQRUrl] = useState('');
  const [searchPicker, setSearchPicker] = useState('');
  const [isManual, setIsManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateQR = useCallback(async () => {
    const uid = badgeData.participantId || Date.now().toString(36).toUpperCase();
    const url = `${BADGE_BASE_URL}${uid}`;
    setCurrentQRUrl(url);
    
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 120,
        margin: 0,
        color: { dark: COLORS.charbon, light: '#ffffff' }
      });
      setQrDataUrl(qr);
      setGeneratedCount(c => c + 1);
    } catch (err) {
      console.error('QR error:', err);
    }
  }, [badgeData.participantId, setGeneratedCount]);

  useEffect(() => {
    generateQR();
  }, [badgeData, badgeProfile, generateQR]);

  // Save manual participant to Baserow and generate badge
  const saveAndGenerate = async () => {
    if (!badgeData.name) {
      toast.error('Nom requis');
      return;
    }
    
    setSaving(true);
    const names = badgeData.name.split(' ');
    const prenom = names[0] || '';
    const nom = names.slice(1).join(' ') || '';
    
    try {
      const participantData = {
        Prenom: prenom,
        Nom: nom,
        Organisation: badgeData.org,
        Email: '',
        Telephone: '',
        'Type de badge': badgeProfile,
        "Territoire d'origine": 'Martinique',
        "Secteur d'activite": 'Autre',
        'Zones acces': badgeData.extra,
        'Statut presence': 'Absent',
        'kiltikonet inscrit': 'Non',
        'Consentement RGPD': 'Oui'
      };
      
      const created = await baserowPost(`/database/rows/table/${BASEROW_TABLE}/?user_field_names=true`, participantData);
      
      if (created) {
        setBadgeData(d => ({ ...d, participantId: created.id }));
        setParticipants(prev => [...prev, created]);
        toast.success('Participant ajoute a Baserow + Badge genere');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Export badge as PDF (print format)
  const exportBadgePDF = () => {
    const printWindow = window.open('', '_blank');
    const badgeHtml = badgeRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Badge CC2026 - ${badgeData.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
        <style>
          /* Format carte ID standard: 85mm × 54mm */
          @page { 
            size: 85mm 54mm; 
            margin: 0; 
          }
          @media print {
            html, body { 
              margin: 0; 
              padding: 0;
              width: 85mm;
              height: 54mm;
            }
            .badge-container { 
              page-break-after: always;
              box-shadow: none !important;
            }
            .print-btn { display: none !important; }
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { 
            margin: 0; 
            padding: 20px;
            display: flex; 
            flex-direction: column;
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            background: #f0f0f0;
            font-family: 'Syne', sans-serif;
          }
          .badge-container { 
            width: 85mm;
            height: 54mm;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          .print-info {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .print-btn {
            margin-top: 20px;
            padding: 12px 24px;
            background: ${COLORS.terracotta};
            color: white;
            border: none;
            cursor: pointer;
            font-family: 'Syne', sans-serif;
            font-weight: bold;
            border-radius: 4px;
          }
          .print-btn:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="badge-container badge-print-zone">${badgeHtml}</div>
        <div class="print-info">Format carte ID: 85mm × 54mm</div>
        <button class="print-btn no-print" onclick="window.print()">IMPRIMER / PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredPicker = participants.filter(p => 
    searchPicker === '' || `${p.Prenom} ${p.Nom}`.toLowerCase().includes(searchPicker.toLowerCase())
  ).slice(0, 8);

  const colors = BADGE_COLORS[badgeProfile] || BADGE_COLORS['Artiste'];

  return (
    <div className="flex gap-6">
      {/* Controls sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Source toggle */}
        <div className="rounded-lg p-4" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => setIsManual(false)}
              className="flex-1 py-2 rounded text-xs font-bold"
              style={{ background: !isManual ? COLORS.terracotta : 'rgba(255,255,255,0.05)', color: !isManual ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: "'Syne', sans-serif" }}
              data-testid="source-baserow"
            >
              Baserow
            </button>
            <button 
              onClick={() => setIsManual(true)}
              className="flex-1 py-2 rounded text-xs font-bold"
              style={{ background: isManual ? COLORS.terracotta : 'rgba(255,255,255,0.05)', color: isManual ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: "'Syne', sans-serif" }}
              data-testid="source-manual"
            >
              Manuel
            </button>
          </div>
          
          {!isManual ? (
            <>
              <Input value={searchPicker} onChange={(e) => setSearchPicker(e.target.value)} placeholder="Rechercher participant..." aria-label="Rechercher un participant" className="mb-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="search-picker" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredPicker.map(p => (
                  <button key={p.id} onClick={() => loadToBadge(p)} className="w-full text-left p-2 rounded hover:bg-white/5 flex items-center gap-2" data-testid={`picker-${p.id}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: (BADGE_COLORS[p['Type de badge']] || BADGE_COLORS['Artiste']).bg, color: (BADGE_COLORS[p['Type de badge']] || BADGE_COLORS['Artiste']).text }}>
                      {((p.Prenom || '?')[0] + (p.Nom || '?')[0]).toUpperCase()}
                    </div>
                    <div className="text-sm truncate">{p.Prenom} {p.Nom}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Input value={badgeData.name} onChange={(e) => setBadgeData(d => ({ ...d, name: e.target.value }))} placeholder="Nom complet *" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="manual-name" />
              <Input value={badgeData.org} onChange={(e) => setBadgeData(d => ({ ...d, org: e.target.value }))} placeholder="Organisation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="manual-org" />
              <Input value={badgeData.extra} onChange={(e) => setBadgeData(d => ({ ...d, extra: e.target.value }))} placeholder="Zones d'acces" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="manual-extra" />
            </div>
          )}
        </div>

        {/* Profile selection */}
        <div className="rounded-lg p-4" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>Type de badge</div>
          <div className="grid grid-cols-2 gap-2">
            {BADGE_TYPES.map(type => {
              const typeColors = BADGE_COLORS[type];
              return (
                <button
                  key={type}
                  onClick={() => setBadgeProfile(type)}
                  className="p-2 rounded border text-xs font-bold transition-all"
                  style={{
                    background: badgeProfile === type ? `${typeColors.bg}30` : 'rgba(255,255,255,0.05)',
                    borderColor: badgeProfile === type ? typeColors.bg : 'rgba(255,255,255,0.1)',
                    color: badgeProfile === type ? typeColors.bg : 'rgba(255,255,255,0.4)',
                    fontFamily: "'Syne', sans-serif"
                  }}
                  data-testid={`badge-type-${type}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {isManual && (
          <Button onClick={saveAndGenerate} disabled={saving} className="w-full" style={{ background: COLORS.burgundy }} data-testid="save-generate-btn">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Sauver + Generer QR
          </Button>
        )}
        <Button onClick={exportBadgePDF} className="w-full" style={{ background: COLORS.gold, color: COLORS.charbon }} data-testid="export-pdf-btn">
          <FileText className="w-4 h-4 mr-2" />
          Exporter Badge PDF
        </Button>
        <Button onClick={() => window.print()} variant="outline" className="w-full" style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      </div>

      {/* Badge preview - PROFESSIONAL DESIGN */}
      <div className="flex-1 flex flex-col items-center">
        <div className="text-xs font-mono mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {generatedCount} badges generes - QR: {currentQRUrl.split('/').pop()}
        </div>

        <div 
          ref={badgeRef}
          className="w-[320px] rounded-xl overflow-hidden shadow-2xl"
          style={{ 
            background: COLORS.forest,
            fontFamily: "'Syne', sans-serif"
          }}
          data-testid="badge-preview"
        >
          {/* Header with logo */}
          <div className="relative px-5 py-4" style={{ background: '#8B6F5A' }}>
            {/* Tribal pattern corners */}
            <div className="absolute top-0 left-0 w-16 h-16 opacity-20" style={{ 
              background: `linear-gradient(135deg, ${COLORS.forest} 50%, transparent 50%)`
            }} />
            <div className="absolute top-0 right-0 flex items-center justify-center px-3 py-1">
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', letterSpacing: '3px' }}>CC2026</span>
            </div>
            
            <div className="text-center relative z-10">
              <div className="font-bold tracking-widest text-xs text-white" style={{ fontFamily: "'Syne', sans-serif" }}>KILTIKONET.FR</div>
              <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>@CULTURECONNECTORG</div>
            </div>
          </div>

          {/* Main content area */}
          <div className="relative py-6 px-5" style={{ background: `linear-gradient(180deg, #8B6F5A 0%, ${COLORS.forest} 100%)` }}>
            {/* Mosaic pattern hint */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '20px 20px'
            }} />
            
            {/* Badge type banner */}
            <div className="rounded-lg px-4 py-2 mb-4 inline-block" style={{ background: colors.bg }}>
              <div className="font-bold text-xs tracking-widest" style={{ color: colors.text, fontFamily: "'Syne', sans-serif" }}>{badgeProfile.toUpperCase()}</div>
            </div>
            
            {/* Name */}
            <div className="font-bold text-2xl text-white mb-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)', fontFamily: "'Cormorant Garamond', serif" }}>
              {badgeData.name || '[NOM]'}
            </div>
            
            {/* Organization */}
            {badgeData.org && (
              <div className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Syne', sans-serif" }}>
                {badgeData.org}
              </div>
            )}
            
            {/* Access zones */}
            {badgeData.extra && (
              <div className="rounded px-3 py-2 mb-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="text-xs" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>ACCES: {badgeData.extra}</div>
              </div>
            )}
          </div>

          {/* Event info */}
          <div className="px-5 py-4 text-center" style={{ background: COLORS.forest }}>
            <div className="font-bold text-sm tracking-wider text-white mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              1ER MARCHE PROFESSIONNEL
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Syne', sans-serif" }}>
              DES INDUSTRIES CULTURELLES AFRO-DESCENDANTES
            </div>
            <div className="mt-3 text-xs font-bold" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>
              22 MAI 2026 - GRAND CARBET AIMÉ CÉSAIRE - FORT-DE-FRANCE
            </div>
          </div>

          {/* Footer with QR */}
          <div className="px-5 py-4 flex items-end justify-between" style={{ background: '#3A4A3E' }}>
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Syne', sans-serif" }}>avec le soutien de</div>
              <div className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                CTM - SACEM - ISCA - SKILLFOR
              </div>
            </div>
            <div className="text-center">
              {qrDataUrl && (
                <div className="p-2 rounded" style={{ background: '#fff' }}>
                  <img src={qrDataUrl} alt="QR" className="w-16 h-16" />
                </div>
              )}
              <div className="text-[8px] font-bold mt-1" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>SCAN</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 3: QR CODES
// ═══════════════════════════════════════════════════════════════
const QRCodesTab = ({ participants }) => {
  const [qrCodes, setQrCodes] = useState([]);
  const [singleId, setSingleId] = useState('');
  const [singleQR, setSingleQR] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateSingleQR = async () => {
    if (!singleId) return;
    const url = `${BADGE_BASE_URL}${singleId}`;
    const qr = await QRCode.toDataURL(url, { width: 200, color: { dark: COLORS.burgundy } });
    setSingleQR({ url, qr });
  };

  const generateAllQR = async () => {
    if (!participants.length) { toast.error('Aucun participant'); return; }
    setGenerating(true);
    const codes = [];
    for (const p of participants) {
      const url = `${BADGE_BASE_URL}${p.id}`;
      const qr = await QRCode.toDataURL(url, { width: 120, color: { dark: COLORS.burgundy } });
      codes.push({ ...p, qrUrl: url, qrImage: qr });
    }
    setQrCodes(codes);
    setGenerating(false);
    toast.success(`${codes.length} QR generes`);
  };

  const printAll = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body{margin:0;padding:20px;font-family:'Syne',sans-serif;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;}
        .card{text-align:center;padding:10px;border:1px solid #ddd;border-radius:8px;page-break-inside:avoid;}
        .card img{width:80px;height:80px;}
        .card .name{font-weight:bold;font-size:11px;margin-top:6px;}
        .card .id{font-size:9px;color:#666;}
      </style></head><body>
      <div class="grid">${qrCodes.map(p => `
        <div class="card">
          <img src="${p.qrImage}" alt="QR code badge ${p.Prenom} ${p.Nom}"/>
          <div class="name">${p.Prenom} ${p.Nom}</div>
          <div class="id">${p['Type de badge']} - ID ${p.id}</div>
        </div>`).join('')}
      </div></body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>QR Individuel</div>
        <div className="flex gap-3">
          <Input value={singleId} onChange={(e) => setSingleId(e.target.value)} placeholder="ID Baserow" className="flex-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} data-testid="single-qr-input" />
          <Button onClick={generateSingleQR} style={{ background: COLORS.terracotta }} data-testid="generate-single-qr">Generer</Button>
        </div>
        {singleQR && (
          <div className="mt-4 flex items-center gap-4 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <img src={singleQR.qr} alt="QR" className="w-32 h-32" />
            <div className="text-sm font-mono break-all" style={{ color: COLORS.gold }}>{singleQR.url}</div>
          </div>
        )}
      </div>

      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>Generation en masse</div>
          <div className="flex gap-2">
            <Button onClick={generateAllQR} disabled={generating} style={{ background: COLORS.gold, color: COLORS.charbon }} data-testid="generate-all-qr">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
              Generer tous ({participants.length})
            </Button>
            {qrCodes.length > 0 && (
              <Button onClick={printAll} variant="outline" style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }} data-testid="print-all-qr">
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            )}
          </div>
        </div>

        {qrCodes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {qrCodes.map(p => (
              <div key={p.id} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <img src={p.qrImage} alt={`QR ${p.id}`} className="w-20 h-20 mx-auto" />
                <div className="mt-2 text-sm font-semibold truncate">{p.Prenom} {p.Nom}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p['Type de badge']}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Cliquez "Generer tous" pour creer les QR codes
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 4: STATISTICS (OBSERVATOIRE) - LIVE DATA FROM BASEROW
// ═══════════════════════════════════════════════════════════════
const StatisticsTab = ({ participants, stats }) => {
  const [liveParticipants, setLiveParticipants] = useState(participants);
  const [liveStats, setLiveStats] = useState(stats);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isPolling, setIsPolling] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [countdown, setCountdown] = useState(30);

  // Calculate live stats from participants
  const calculateStats = useCallback((data) => {
    return {
      total: data.length,
      present: data.filter(p => getFieldValue(p['Statut presence']) === 'Present').length,
      absent: data.filter(p => getFieldValue(p['Statut presence']) !== 'Present').length,
      rate: data.length ? Math.round((data.filter(p => getFieldValue(p['Statut presence']) === 'Present').length / data.length) * 100) : 0,
      byType: data.reduce((acc, p) => {
        const type = getFieldValue(p['Type de badge']) || 'Autre';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      byTerritory: data.reduce((acc, p) => {
        const terr = getFieldValue(p["Territoire d'origine"]) || 'Non renseigne';
        acc[terr] = (acc[terr] || 0) + 1;
        return acc;
      }, {}),
      bySector: data.reduce((acc, p) => {
        const sector = getFieldValue(p["Secteur d'activite"]) || 'Non renseigne';
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {}),
      // New: Track registrations over time for trend chart
      registrationsByDate: data.reduce((acc, p) => {
        // Try to extract date from ID or use today
        const dateKey = new Date().toISOString().slice(0, 10);
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
      }, {})
    };
  }, []);

  // Fetch live data from Baserow
  const fetchLiveData = useCallback(async () => {
    try {
      let all = [], page = 1, hasMore = true;
      while (hasMore) {
        const res = await fetch(`${BASEROW_API}/database/rows/table/${BASEROW_TABLE}/?user_field_names=true&page=${page}&size=100`, {
          headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
        });
        if (!res.ok) throw new Error('Baserow error');
        const data = await res.json();
        all = [...all, ...data.results];
        hasMore = !!data.next;
        page++;
      }
      setLiveParticipants(all);
      setLiveStats(calculateStats(all));
      setLastUpdate(new Date());
      setCountdown(refreshInterval);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [calculateStats, refreshInterval]);

  // Polling effect - refresh every N seconds
  useEffect(() => {
    if (!isPolling) return;
    
    const intervalId = setInterval(() => {
      fetchLiveData();
    }, refreshInterval * 1000);

    // Countdown timer
    const countdownId = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : refreshInterval));
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(countdownId);
    };
  }, [isPolling, refreshInterval, fetchLiveData]);

  // Initial sync with parent
  useEffect(() => {
    setLiveParticipants(participants);
    setLiveStats(stats);
  }, [participants, stats]);

  // Export CSV from Observatoire
  const exportObservatoireCSV = () => {
    const headers = ['ID', 'Prenom', 'Nom', 'Organisation', 'Email', 'Telephone', 'Type Badge', 'Territoire', 'Secteur', 'Statut', 'Heure Arrivee'];
    const rows = liveParticipants.map(p => [
      p.id, p.Prenom, p.Nom, p.Organisation, p.Email, p.Telephone,
      getFieldValue(p['Type de badge']), getFieldValue(p["Territoire d'origine"]), 
      getFieldValue(p["Secteur d'activite"]), getFieldValue(p['Statut presence']), p["Heure d'arrivee"]
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cc2026_observatoire_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Export Observatoire termine');
  };

  // Memoized sorted data - MUST be called before any early returns (React hooks rules)
  const sortedByType = useMemo(() => Object.entries(liveStats.byType || {}).sort((a, b) => b[1] - a[1]), [liveStats.byType]);
  const sortedByTerritory = useMemo(() => Object.entries(liveStats.byTerritory || {}).sort((a, b) => b[1] - a[1]), [liveStats.byTerritory]);
  const sortedBySector = useMemo(() => Object.entries(liveStats.bySector || {}).sort((a, b) => b[1] - a[1]), [liveStats.bySector]);

  // StatBar component for rendering stat bars
  const StatBar = ({ label, value, total, color = COLORS.terracotta }) => (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm truncate" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Syne', sans-serif" }}>{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full transition-all rounded-full" style={{ width: `${Math.round((value / total) * 100)}%`, background: color }} />
      </div>
      <span className="w-12 text-right text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{value}</span>
      <span className="w-12 text-right text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{Math.round((value / total) * 100)}%</span>
    </div>
  );

  if (!liveParticipants.length) {
    return (
      <div className="text-center py-12 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
        CHARGEZ LES DONNEES BASEROW
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>Observatoire CC2026</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.gold, fontFamily: "'Cormorant Garamond', serif" }}>Tableau de Bord en Temps Réel</div>
        </div>
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: isPolling ? 'rgba(77,191,138,0.15)' : 'rgba(255,255,255,0.05)' }}>
            <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-mono" style={{ color: isPolling ? '#4DBF8A' : 'rgba(255,255,255,0.4)' }}>
              {isPolling ? `LIVE (${countdown}s)` : 'PAUSED'}
            </span>
          </div>
          {/* Toggle polling */}
          <Button 
            size="sm" 
            onClick={() => setIsPolling(!isPolling)}
            style={{ background: isPolling ? 'rgba(255,255,255,0.1)' : COLORS.terracotta }}
            data-testid="toggle-polling"
          >
            {isPolling ? 'Pause' : 'Reprendre'}
          </Button>
          {/* Manual refresh */}
          <Button 
            size="sm" 
            onClick={fetchLiveData}
            style={{ background: COLORS.terracotta }}
            data-testid="manual-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {/* Export */}
          <Button 
            size="sm" 
            onClick={exportObservatoireCSV}
            variant="outline"
            style={{ borderColor: `${COLORS.gold}50`, color: COLORS.gold }}
            data-testid="export-observatoire"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Last update info */}
      <div className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')} • Rafraîchissement: {refreshInterval}s
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: liveStats.total, color: '#fff' },
          { label: 'Présents', value: liveStats.present, color: '#4DBF8A' },
          { label: 'Absents', value: liveStats.absent, color: 'rgba(255,255,255,0.3)' },
          { label: 'Taux', value: `${liveStats.rate}%`, color: COLORS.gold }
        ].map(kpi => (
          <div key={kpi.label} className="rounded-lg p-6 text-center relative overflow-hidden" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
            <div className="text-3xl font-bold" style={{ color: kpi.color, fontFamily: "'Cormorant Garamond', serif" }}>{kpi.value}</div>
            <div className="text-xs uppercase tracking-wider mt-2" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Syne', sans-serif" }}>{kpi.label}</div>
            {isPolling && <div className="absolute bottom-0 left-0 h-1 bg-green-400 animate-pulse" style={{ width: '100%', opacity: 0.3 }} />}
          </div>
        ))}
      </div>

      {/* Présents / Absents Live Counter */}
      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#4DBF8A', fontFamily: "'Syne', sans-serif" }}>
          Compteur Présence Live
        </div>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: '#4DBF8A' }}>Présents</span>
              <span className="text-2xl font-bold" style={{ color: '#4DBF8A', fontFamily: "'Cormorant Garamond', serif" }}>{liveStats.present}</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div 
                className="h-full transition-all duration-500 rounded-full" 
                style={{ width: `${liveStats.rate}%`, background: '#4DBF8A' }} 
              />
            </div>
          </div>
          <div className="text-4xl font-bold" style={{ color: COLORS.gold, fontFamily: "'Cormorant Garamond', serif" }}>
            {liveStats.rate}%
          </div>
        </div>
      </div>

      {/* By Type */}
      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.terracotta, fontFamily: "'Syne', sans-serif" }}>
          Répartition par type de badge
        </div>
        <div className="space-y-3">
          {sortedByType.map(([type, count]) => (
            <StatBar key={type} label={type} value={count} total={liveStats.total} color={(BADGE_COLORS[type] || BADGE_COLORS['Artiste']).bg} />
          ))}
        </div>
      </div>

      {/* By Territory */}
      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.gold, fontFamily: "'Syne', sans-serif" }}>
          Territoires représentés
        </div>
        <div className="space-y-3">
          {sortedByTerritory.map(([terr, count]) => (
            <StatBar key={terr} label={terr} value={count} total={liveStats.total} color={COLORS.gold} />
          ))}
        </div>
      </div>

      {/* By Sector */}
      <div className="rounded-lg p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.teal, fontFamily: "'Syne', sans-serif" }}>
          Secteurs d'activité
        </div>
        <div className="space-y-3">
          {sortedBySector.map(([sector, count]) => (
            <StatBar key={sector} label={sector} value={count} total={liveStats.total} color={COLORS.teal} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccreditationSystem;
