import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Calendar, Building2, Brain, Loader2, RefreshCw,
  ArrowRight, Star, Zap, Search, ChevronDown, ChevronUp,
  TrendingUp, Target, Sparkles, MapPin, Clock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/recommendations`;

const TYPE_COLORS = {
  ART: '#FFD700', VIP: '#9B59B6', STF: '#3498DB', SPO: '#2ECC71',
  INT: '#FFFFFF', VIS: '#00FFFF', BNV: '#E67E22', EXP: '#FFD700', OFF: '#888',
};
const TYPE_LABELS = {
  ART: 'Artiste', VIP: 'VIP', STF: 'Staff', SPO: 'Sponsor',
  INT: 'Institutionnel', VIS: 'Visiteur', BNV: 'Benevole', EXP: 'Exposant', OFF: 'Officiel',
};

const ScoreBar = ({ score, max = 100, color = '#A65D47' }) => (
  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden flex-1">
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(score / max) * 100}%`, backgroundColor: color }} />
  </div>
);

const BadgeType = ({ type }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${TYPE_COLORS[type] || '#888'}20`, color: TYPE_COLORS[type] || '#888' }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#888' }} />
    {TYPE_LABELS[type] || type}
  </span>
);

const RecommendationsDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [connections, setConnections] = useState(null);
  const [events, setEvents] = useState(null);
  const [partnerships, setPartnerships] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedEvent, setExpandedEvent] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(p => ({ ...p, overview: true }));
    try {
      const { data } = await axios.get(`${API}/admin/overview`);
      setOverview(data);
    } catch { /* silent */ }
    setLoading(p => ({ ...p, overview: false }));
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/smart-engine/mgraph`);
      setBadges(data.nodes || []);
      if (!selectedBadge && data.nodes?.length) setSelectedBadge(data.nodes[0].id);
    } catch { /* silent */ }
  }, [selectedBadge]);

  const fetchAllEvents = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/events`);
      setAllEvents(data.events || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchOverview(); fetchBadges(); fetchAllEvents(); }, [fetchOverview, fetchBadges, fetchAllEvents]);

  const fetchRecos = useCallback(async (badgeId) => {
    if (!badgeId) return;
    setLoading(p => ({ ...p, recos: true }));
    try {
      const [conn, evt, part] = await Promise.all([
        axios.get(`${API}/connections/${badgeId}?limit=8`),
        axios.get(`${API}/events/${badgeId}?limit=6`),
        axios.get(`${API}/partnerships/${badgeId}?limit=5`),
      ]);
      setConnections(conn.data);
      setEvents(evt.data);
      setPartnerships(part.data);
    } catch { /* silent */ }
    setLoading(p => ({ ...p, recos: false }));
  }, []);

  const handleBadgeSelect = (id) => {
    setSelectedBadge(id);
    fetchRecos(id);
  };

  const enrichWithBrain = async () => {
    if (!selectedBadge) return;
    setLoading(p => ({ ...p, brain: true }));
    try {
      const [conn, evt, part] = await Promise.all([
        axios.get(`${API}/connections/${selectedBadge}?limit=8&enrich=true`),
        axios.get(`${API}/events/${selectedBadge}?limit=6&enrich=true`),
        axios.get(`${API}/partnerships/${selectedBadge}?limit=5&enrich=true`),
      ]);
      setConnections(conn.data);
      setEvents(evt.data);
      setPartnerships(part.data);
    } catch { /* silent */ }
    setLoading(p => ({ ...p, brain: false }));
  };

  const tabs = [
    { id: 'overview', label: 'Vue globale', icon: TrendingUp },
    { id: 'profile', label: 'Par profil', icon: Target },
    { id: 'agenda', label: 'Agenda CC2026', icon: Calendar },
  ];

  return (
    <div className="space-y-4" data-testid="recommendations-dashboard">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#222] pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs transition-colors ${activeTab === t.id ? 'bg-[#A65D47]/20 text-[#A65D47] font-bold' : 'text-[#666] hover:text-[#999]'}`}
            data-testid={`reco-tab-${t.id}`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {loading.overview ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-[#A65D47]" /></div>
          ) : overview && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Participants" value={overview.total_badges} icon={Users} color="#9B59B6" />
                <StatCard label="Evenements" value={overview.total_events} icon={Calendar} color="#3498DB" />
                <StatCard label="Connexions potentielles" value={overview.potential_connections} icon={Zap} color="#FFD700" />
                <StatCard label="Organisations" value={overview.top_organisations?.length || 0} icon={Building2} color="#2ECC71" />
              </div>

              {/* Score distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#111] rounded-lg p-4 border border-[#222]">
                  <h4 className="text-xs font-bold text-[#F4F1EA] mb-3 flex items-center gap-1.5"><Star size={12} className="text-[#FFD700]" /> Impact culturel</h4>
                  <div className="space-y-2">
                    {overview.score_distribution && Object.entries(overview.score_distribution).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#888] w-24">{k}</span>
                        <ScoreBar score={v} max={overview.total_badges} color={k.includes('elite') ? '#FFD700' : k.includes('haut') ? '#E67E22' : k.includes('moyen') ? '#3498DB' : '#555'} />
                        <span className="text-[10px] text-[#F4F1EA] w-6 text-right font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111] rounded-lg p-4 border border-[#222]">
                  <h4 className="text-xs font-bold text-[#F4F1EA] mb-3 flex items-center gap-1.5"><Calendar size={12} className="text-[#3498DB]" /> Types d'evenements</h4>
                  <div className="space-y-2">
                    {overview.event_distribution && Object.entries(overview.event_distribution).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#888] w-20 capitalize">{k}</span>
                        <ScoreBar score={v} max={Math.max(...Object.values(overview.event_distribution))} color="#A65D47" />
                        <span className="text-[10px] text-[#F4F1EA] w-6 text-right font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top organisations */}
              <div className="bg-[#111] rounded-lg p-4 border border-[#222]">
                <h4 className="text-xs font-bold text-[#F4F1EA] mb-3 flex items-center gap-1.5"><Building2 size={12} className="text-[#2ECC71]" /> Top organisations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {overview.top_organisations?.map((o, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#0D0D0D] rounded px-3 py-2">
                      <div>
                        <p className="text-[11px] text-[#F4F1EA] font-medium">{o.org}</p>
                        <p className="text-[9px] text-[#666]">{o.members} membres</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: o.avg_score >= 50 ? '#FFD700' : '#888' }}>{o.avg_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* Badge selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
              <select
                value={selectedBadge}
                onChange={e => handleBadgeSelect(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded pl-8 pr-3 py-2 text-xs text-[#F4F1EA] appearance-none"
                data-testid="reco-badge-select"
              >
                <option value="">Selectionner un participant...</option>
                {badges.map(b => (
                  <option key={b.id} value={b.id}>{b.label} ({b.type}) — Score: {b.score}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchRecos(selectedBadge)}
              disabled={!selectedBadge || loading.recos}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#A65D47] text-white rounded text-xs hover:bg-[#8B4E3B] disabled:opacity-40 transition-colors"
              data-testid="reco-generate-btn"
            >
              {loading.recos ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generer
            </button>
            <button
              onClick={enrichWithBrain}
              disabled={!selectedBadge || loading.brain || !connections}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#9B59B6] text-white rounded text-xs hover:bg-[#7D3C98] disabled:opacity-40 transition-colors"
              data-testid="reco-brain-btn"
            >
              {loading.brain ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              LAURENT.IA
            </button>
          </div>

          {/* Profile info */}
          {connections?.profile && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#222] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${TYPE_COLORS[connections.profile.type]}20` }}>
                <Users size={14} style={{ color: TYPE_COLORS[connections.profile.type] }} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F4F1EA]">{connections.profile.name}</p>
                <div className="flex items-center gap-2">
                  <BadgeType type={connections.profile.type} />
                  <span className="text-[9px] text-[#888]">Score: {connections.profile.score}/100</span>
                </div>
              </div>
            </div>
          )}

          {/* 3-column recommendations */}
          {(connections || events || partnerships) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Connections */}
              <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-[#F4F1EA] flex items-center gap-1.5"><Users size={11} className="text-[#9B59B6]" /> CONNEXIONS</h4>
                  <span className="text-[9px] text-[#555]">{connections?.total_candidates || 0} candidats</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {connections?.recommendations?.map((r, i) => (
                    <div key={i} className="px-3 py-2 border-b border-[#111] hover:bg-white/5 transition-colors" data-testid={`reco-connection-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#F4F1EA] font-medium">{r.name}</span>
                        <span className="text-[9px] font-mono text-[#A65D47]">{r.match_score}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <BadgeType type={r.type} />
                        {r.org && <span className="text-[8px] text-[#555] truncate">{r.org}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.reasons?.map((reason, j) => (
                          <span key={j} className="text-[8px] text-[#888] bg-[#1A1A1A] px-1.5 py-0.5 rounded">{reason}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events */}
              <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-[#F4F1EA] flex items-center gap-1.5"><Calendar size={11} className="text-[#3498DB]" /> EVENEMENTS</h4>
                  <span className="text-[9px] text-[#555]">{events?.total_events || 0} total</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {events?.recommendations?.map((r, i) => (
                    <div key={i} className="px-3 py-2 border-b border-[#111] hover:bg-white/5 transition-colors" data-testid={`reco-event-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#F4F1EA] font-medium leading-tight">{r.title}</span>
                        <span className="text-[9px] font-mono text-[#3498DB] flex-shrink-0 ml-2">{r.match_score}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-[#666] mb-1">
                        <span className="flex items-center gap-0.5"><Calendar size={8} /> {r.date}</span>
                        <span className="flex items-center gap-0.5"><Clock size={8} /> {r.start}-{r.end}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.reasons?.map((reason, j) => (
                          <span key={j} className="text-[8px] text-[#888] bg-[#1A1A1A] px-1.5 py-0.5 rounded">{reason}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partnerships */}
              <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-[#F4F1EA] flex items-center gap-1.5"><Building2 size={11} className="text-[#2ECC71]" /> PARTENARIATS</h4>
                  <span className="text-[9px] text-[#555]">{partnerships?.total_orgs || 0} orgs</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {partnerships?.recommendations?.map((r, i) => (
                    <div key={i} className="px-3 py-2 border-b border-[#111] hover:bg-white/5 transition-colors" data-testid={`reco-partnership-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#F4F1EA] font-medium">{r.org_name}</span>
                        <span className="text-[9px] font-mono text-[#2ECC71]">{r.match_score}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] text-[#666]">{r.member_count} membres</span>
                        {r.types?.map(t => <BadgeType key={t} type={t} />)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.reasons?.map((reason, j) => (
                          <span key={j} className="text-[8px] text-[#888] bg-[#1A1A1A] px-1.5 py-0.5 rounded">{reason}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Brain enrichment result */}
          {connections?.enriched && connections?.brain_enrichment && (
            <div className="bg-[#9B59B6]/10 border border-[#9B59B6]/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain size={12} className="text-[#9B59B6]" />
                <span className="text-[10px] font-bold text-[#9B59B6]">Enrichissement Laurent.ia</span>
              </div>
              <p className="text-[10px] text-[#CCC] leading-relaxed">{connections.brain_enrichment.analysis}</p>
            </div>
          )}
        </div>
      )}

      {/* Agenda Tab */}
      {activeTab === 'agenda' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={12} className="text-[#A65D47]" />
            <span className="text-xs text-[#F4F1EA] font-bold">Grand Carbet du Parc culturel Aimé Césaire, Fort-de-France — 20-23 Mai 2026</span>
          </div>
          {['2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23'].map(date => {
            const dayEvents = allEvents.filter(e => e.date === date);
            const dayLabel = { '2026-05-20': 'Mercredi 20 Mai — Ouverture', '2026-05-21': 'Jeudi 21 Mai — Music Business', '2026-05-22': 'Vendredi 22 Mai — Culture & Innovation', '2026-05-23': 'Samedi 23 Mai — Cloture' }[date];
            return (
              <div key={date} className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
                <div className="px-3 py-2 bg-[#A65D47]/10 border-b border-[#222]">
                  <span className="text-[11px] font-bold text-[#A65D47]">{dayLabel}</span>
                </div>
                {dayEvents.map((evt, i) => (
                  <div
                    key={evt.id}
                    className="px-3 py-2 border-b border-[#111] hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setExpandedEvent(expandedEvent === evt.id ? null : evt.id)}
                    data-testid={`agenda-event-${evt.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#A65D47] font-mono w-14">{evt.start}</span>
                        <span className="text-[11px] text-[#F4F1EA] font-medium">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-[#555] capitalize px-1.5 py-0.5 bg-[#1A1A1A] rounded">{evt.type}</span>
                        {expandedEvent === evt.id ? <ChevronUp size={10} className="text-[#555]" /> : <ChevronDown size={10} className="text-[#555]" />}
                      </div>
                    </div>
                    {expandedEvent === evt.id && (
                      <div className="mt-2 pl-16 space-y-1.5">
                        <p className="text-[10px] text-[#888] leading-relaxed">{evt.description}</p>
                        <div className="flex items-center gap-3 text-[9px] text-[#666]">
                          <span className="flex items-center gap-0.5"><MapPin size={8} /> {evt.lieu}</span>
                          <span className="flex items-center gap-0.5"><Clock size={8} /> {evt.start} - {evt.end}</span>
                          <span className="flex items-center gap-0.5"><Users size={8} /> {evt.capacity} places</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {evt.target_badges?.map(t => <BadgeType key={t} type={t} />)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-[#111] rounded-lg p-3 border border-[#222]">
    <div className="flex items-center justify-between mb-1">
      <Icon size={14} style={{ color }} />
      <span className="text-lg font-bold text-[#F4F1EA]">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
    <p className="text-[9px] text-[#666]">{label}</p>
  </div>
);

export default RecommendationsDashboard;
