import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Search, MapPin, Plus, Check, MessageSquare,
  X, Mail, Phone, Globe, Star, Filter, ChevronDown, Shield,
  UserPlus, Building2, Music, Mic2, BookOpen, Briefcase, Zap
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const G = '#E8D5A0';
const C = {
  bg: '#0a0a0b', surface: '#111111', card: '#141414', border: '#1a1a1a',
  text: '#FFFFFF', muted: '#72727a', dim: '#555555',
};

const TYPE_COLORS = {
  artist: '#E8D5A0', label: '#8b5cf6', booking_agency: '#3b82f6',
  institution: '#22c55e', press: '#f59e0b', venue: '#ef4444',
  distributor: '#ec4899', festival: '#06b6d4', association: '#14b8a6',
  other: '#6366f1',
};

const TYPE_LABELS = {
  artist: 'Artiste', label: 'Label', booking_agency: 'Booking',
  institution: 'Institution', press: 'Presse', venue: 'Lieu',
  distributor: 'Distributeur', festival: 'Festival', association: 'Association',
  other: 'Professionnel',
};

const TYPE_ICONS = {
  artist: Music, label: Building2, booking_agency: Briefcase,
  institution: Building2, press: BookOpen, venue: MapPin,
  festival: Star, association: Users,
};

const Avatar = ({ name, src, type, size = 56 }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = TYPE_COLORS[type] || G;
  return src ? (
    <img src={src} alt={name} className="rounded-xl object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}20, ${color}08)`, border: `1px solid ${color}30` }}>
      <span className="font-bold" style={{ color, fontSize: size * 0.35 }}>{initials}</span>
    </div>
  );
};

const ProfileModal = ({ pro, onClose, isConnected, onConnect, onMessage }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
    <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
      onClick={e => e.stopPropagation()} data-testid="profile-modal">
      {/* Banner */}
      <div className="h-28 relative rounded-t-2xl"
        style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[pro.profile_type] || G}30, ${G}15, transparent)` }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60"
          data-testid="close-profile-modal">
          <X size={16} style={{ color: '#fff' }} />
        </button>
      </div>

      <div className="px-5 pb-5 -mt-10">
        <Avatar src={pro.logo_url || pro.image} name={pro.full_name} type={pro.profile_type} size={80} />
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${TYPE_COLORS[pro.profile_type] || G}15`, color: TYPE_COLORS[pro.profile_type] || G }}>
              {TYPE_LABELS[pro.profile_type] || 'Pro'}
            </span>
            {pro.frek_id && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
                {pro.frek_id}
              </span>
            )}
          </div>
          <h2 className="text-lg font-black mt-2" style={{ color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
            {pro.full_name}
          </h2>
          {pro.organization_name && <p className="text-sm" style={{ color: C.muted }}>{pro.organization_name}</p>}
          {pro.country && (
            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: C.dim }}>
              <MapPin size={12} /> {pro.country}
            </p>
          )}
        </div>

        {/* Contact Info (only if connected) */}
        <div className="mt-4 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                <Mail size={14} style={{ color: G }} /> {pro.email}
              </div>
              {pro.phone && (
                <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                  <Phone size={14} style={{ color: G }} /> {pro.phone}
                </div>
              )}
              {pro.website && (
                <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                  <Globe size={14} style={{ color: G }} /> {pro.website}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3">
              <Shield size={20} className="mx-auto mb-2" style={{ color: C.dim }} />
              <p className="text-xs" style={{ color: C.dim }}>Connectez-vous pour voir les coordonnees</p>
            </div>
          )}
        </div>

        {pro.bio && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>A propos</h3>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{pro.bio}</p>
          </div>
        )}

        {pro.expertise_tags?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Competences</h3>
            <div className="flex flex-wrap gap-1.5">
              {pro.expertise_tags.map(t => (
                <span key={t} className="px-2.5 py-1 text-[11px] rounded-full font-medium"
                  style={{ background: `${G}12`, color: G }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          {isConnected ? (
            <button onClick={onMessage}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
              style={{ background: `${G}15`, color: G, border: `1px solid ${G}30` }}
              data-testid="profile-message-btn">
              <MessageSquare size={16} /> Message
            </button>
          ) : (
            <button onClick={onConnect}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
              style={{ background: G, color: '#0a0a0b' }}
              data-testid="profile-connect-btn">
              <UserPlus size={16} /> Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const NetworkPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [pros, setPros] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    const stored = sessionStorage.getItem('cc2026_pro_session');
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      navigate('/espace-pro/connexion');
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      const [dirRes, connRes] = await Promise.all([
        axios.get(`${API}/pro/social/directory`).catch(() => ({ data: { professionals: [] } })),
        axios.get(`${API}/pro/connections/${session.id}`).catch(() => ({ data: { connections: [] } })),
      ]);
      let allPros = dirRes.data.professionals || [];
      if (allPros.length === 0) {
        const regRes = await axios.get(`${API}/registrations`).catch(() => ({ data: { registrations: [] } }));
        allPros = (regRes.data.registrations || []).filter(x => x.status === 'approved' && x.id !== session.id);
      }
      setPros(allPros);
      setConnections(connRes.data.connections || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [session?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const sendConnect = async (proId) => {
    try {
      await axios.post(`${API}/pro/connect`, { from: session.id, to: proId });
      toast.success('Connexion etablie !');
      loadData();
    } catch { toast.error('Erreur de connexion'); }
  };

  const connectedIds = new Set(connections.map(c => c.id));
  const filtered = pros.filter(p => {
    const s = search.toLowerCase();
    return (!search || p.full_name?.toLowerCase().includes(s) || p.organization_name?.toLowerCase().includes(s) || p.bio?.toLowerCase().includes(s))
      && (!filterType || p.profile_type === filterType)
      && (!filterCountry || p.country === filterCountry)
      && p.id !== session?.id;
  });

  const displayList = activeTab === 'connections' ? connections : filtered;
  const countries = [...new Set(pros.map(p => p.country).filter(Boolean))].sort();
  const profileTypes = [...new Set(pros.map(p => p.profile_type).filter(Boolean))];
  const stats = {
    total: pros.length || '--',
    connected: connections.length || '--',
    countries: countries.length || '--',
  };

  if (!session) return null;

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'DM Sans', sans-serif" }} data-testid="network-page">
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(10,10,11,0.97)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/core')} className="p-2 rounded-lg hover:bg-white/5"
              data-testid="network-back-btn">
              <ArrowLeft size={18} style={{ color: C.muted }} />
            </button>
            <div className="flex items-center gap-2">
              <Users size={18} style={{ color: G }} />
              <h1 className="text-base font-black" style={{ color: C.text }}>Reseau</h1>
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-white/5" data-testid="toggle-filters-btn">
            <Filter size={16} style={{ color: showFilters ? G : C.muted }} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Stats Bar */}
        <div className="flex items-center gap-3" data-testid="network-stats">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Users size={13} style={{ color: G }} />
            <span className="text-xs font-bold" style={{ color: C.text }}>{stats.total}</span>
            <span className="text-[10px]" style={{ color: C.dim }}>pros</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Check size={13} style={{ color: '#22c55e' }} />
            <span className="text-xs font-bold" style={{ color: C.text }}>{stats.connected}</span>
            <span className="text-[10px]" style={{ color: C.dim }}>connectes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Globe size={13} style={{ color: '#3b82f6' }} />
            <span className="text-xs font-bold" style={{ color: C.text }}>{stats.countries}</span>
            <span className="text-[10px]" style={{ color: C.dim }}>pays</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}
          data-testid="network-tabs">
          {[
            { id: 'discover', label: 'Decouvrir', count: filtered.length },
            { id: 'connections', label: 'Mes connexions', count: connections.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? G : 'transparent',
                color: activeTab === tab.id ? '#0a0a0b' : C.muted,
              }}
              data-testid={`tab-${tab.id}`}>
              {tab.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.id ? 'rgba(0,0,0,0.15)' : `${C.border}`,
                  color: activeTab === tab.id ? '#0a0a0b' : C.dim,
                }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: C.dim }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, organisation, competence..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
              data-testid="network-search" />
          </div>

          {showFilters && (
            <div className="flex gap-2 flex-wrap" data-testid="network-filters">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
                <option value="">Tous les profils</option>
                {profileTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
                <option value="">Tous les pays</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(filterType || filterCountry) && (
                <button onClick={() => { setFilterType(''); setFilterCountry(''); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: '#ef444420', color: '#ef4444' }}>
                  Effacer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl h-48 animate-pulse" style={{ background: C.card }} />
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Users size={40} className="mx-auto mb-3" style={{ color: '#222' }} />
            <p className="text-sm font-medium" style={{ color: C.muted }}>
              {activeTab === 'connections' ? 'Aucune connexion' : 'Aucun professionnel trouve'}
            </p>
            <p className="text-xs mt-1" style={{ color: C.dim }}>
              {activeTab === 'connections' ? 'Decouvrez des professionnels et connectez-vous' : 'Essayez un autre filtre'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="network-grid">
            {displayList.map(pro => {
              const isConnected = connectedIds.has(pro.id);
              const typeColor = TYPE_COLORS[pro.profile_type] || G;
              const TypeIcon = TYPE_ICONS[pro.profile_type] || Users;
              return (
                <div key={pro.id}
                  className="rounded-xl overflow-hidden transition-all hover:scale-[1.01] cursor-pointer group"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                  onClick={() => setSelectedPro(pro)}
                  data-testid={`pro-card-${pro.id}`}>
                  {/* Type stripe */}
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${typeColor}, transparent)` }} />
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar src={pro.image || pro.logo_url} name={pro.full_name} type={pro.profile_type} size={52} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate" style={{ color: C.text }}>{pro.full_name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <TypeIcon size={11} style={{ color: typeColor }} />
                          <span className="text-[11px] truncate" style={{ color: typeColor }}>
                            {pro.organization_name || TYPE_LABELS[pro.profile_type] || 'Pro'}
                          </span>
                        </div>
                        {pro.country && (
                          <p className="text-[10px] flex items-center gap-1 mt-1" style={{ color: C.dim }}>
                            <MapPin size={10} /> {pro.country}
                          </p>
                        )}
                      </div>
                    </div>

                    {pro.bio && (
                      <p className="text-[11px] mt-3 line-clamp-2 leading-relaxed" style={{ color: C.dim }}>{pro.bio}</p>
                    )}

                    {pro.expertise_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {pro.expertise_tags.slice(0, 3).map(t => (
                          <span key={t} className="px-2 py-0.5 text-[9px] rounded-full font-medium"
                            style={{ background: `${G}10`, color: G }}>{t}</span>
                        ))}
                        {pro.expertise_tags.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5" style={{ color: C.dim }}>
                            +{pro.expertise_tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action */}
                    <div className="mt-3">
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#22c55e' }}>
                          <Check size={13} /> Connecte
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); sendConnect(pro.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                          style={{ background: `${G}12`, color: G, border: `1px solid ${G}25` }}
                          data-testid={`connect-btn-${pro.id}`}>
                          <UserPlus size={12} /> Se connecter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedPro && (
        <ProfileModal pro={selectedPro} onClose={() => setSelectedPro(null)}
          isConnected={connectedIds.has(selectedPro.id)}
          onConnect={() => { sendConnect(selectedPro.id); setSelectedPro(null); }}
          onMessage={() => { navigate('/admin/core/messages'); }} />
      )}
    </div>
  );
};

export default NetworkPage;
