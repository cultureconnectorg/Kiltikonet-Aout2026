import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, User, Building2, MapPin, Tag, Clock, 
  Loader2, AlertCircle, QrCode, Search, ChevronRight, Users, ArrowLeft
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const C = {
  charbon: '#1C1A14', terra: '#C4714A', gold: '#D4A84B',
  sage: '#4A5D4E', cream: '#F4F1EA', burgundy: '#8B1A4A',
  teal: '#0B6E7A'
};

const TIER_COLORS = {
  emerging: { bg: C.sage, label: 'Emergent' },
  professional: { bg: C.terra, label: 'Professionnel' },
  institutional: { bg: C.charbon, label: 'Institutionnel' },
  visitor: { bg: '#6B7280', label: 'Visiteur' },
};

const BadgeScan = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // If an ID is in the URL, show validation mode
  // Otherwise, show the staff scanner dashboard
  if (id) return <BadgeValidation badgeId={id} />;
  return <ScannerDashboard />;
};

/* ═══════════ BADGE VALIDATION (when QR is scanned) ═══════════ */
function BadgeValidation({ badgeId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/terrain/validate-badge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badge_id: badgeId, validator_id: 'staff_scan', location: 'entree_principale' })
        });
        const data = await res.json();
        setResult(data);
      } catch (e) {
        setResult({ status: 'error', code: 'NETWORK', message: 'Erreur reseau. Verifiez votre connexion.', color: 'red' });
      }
      setLoading(false);
    };
    validate();
  }, [badgeId]);

  const bgColor = result?.color === 'green' ? C.sage : result?.color === 'orange' ? C.gold : '#CF6060';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.charbon }} data-testid="badge-validation">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" 
              style={{ background: `linear-gradient(135deg, ${C.terra}, ${C.burgundy})`, color: '#fff' }}>CC</div>
            <div className="text-left">
              <div className="font-bold tracking-wider text-sm" style={{ color: C.gold }}>CULTURE CONNECT</div>
              <div className="text-xs" style={{ color: C.terra }}>Verification Accreditation</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#2A2820', border: `1px solid ${C.gold}20` }}>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: C.terra }} />
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Validation en cours...</div>
          </div>
        ) : result ? (
          <div className="rounded-xl overflow-hidden" style={{ background: '#2A2820', border: `1px solid ${C.gold}20` }}>
            {/* Status banner */}
            <div className="p-5 text-center" style={{ background: bgColor }}>
              {result.color === 'green' ? (
                <>
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-white" />
                  <div className="text-white font-bold text-xl">BIENVENUE !</div>
                  <div className="text-white/80 text-sm mt-1">Presence enregistree</div>
                </>
              ) : result.color === 'orange' ? (
                <>
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-white" />
                  <div className="text-white font-bold text-lg">DEJA SCANNE</div>
                  <div className="text-white/80 text-sm mt-1">Scanne a {result.scanned_at ? new Date(result.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 mx-auto mb-2 text-white" />
                  <div className="text-white font-bold text-lg">{result.code === 'NOT_FOUND' ? 'BADGE INVALIDE' : 'NON APPROUVE'}</div>
                  <div className="text-white/80 text-sm mt-1">{result.message}</div>
                </>
              )}
            </div>

            {/* Person info */}
            {result.person && (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ background: TIER_COLORS[result.person.tier]?.bg || C.terra, color: '#fff' }}>
                    {(result.person.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white">{result.person.full_name}</div>
                    {result.person.organization_name && (
                      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{result.person.organization_name}</div>
                    )}
                    <div className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: `${TIER_COLORS[result.person.tier]?.bg || C.terra}30`, color: TIER_COLORS[result.person.tier]?.bg || C.terra }}>
                      {TIER_COLORS[result.person.tier]?.label || result.person.profile_type || 'Participant'}
                    </div>
                  </div>
                </div>

                {result.person.country && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <MapPin className="w-4 h-4" style={{ color: C.terra }} />
                    {result.person.country}
                  </div>
                )}

                {/* Access zones */}
                <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: C.gold }}>Zones d'acces</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Grand Carbet Aimé Césaire', 'Grand Carbet Aimé Césaire', 'Espace Pro'].map(z => (
                      <span key={z} className="px-2 py-1 rounded-full text-xs" style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}30`, color: C.gold }}>{z}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 text-center" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-xs font-bold tracking-wider" style={{ color: C.terra }}>22 MAI 2026 - GRAND CARBET AIMÉ CÉSAIRE - FORT-DE-FRANCE</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>kiltikonet.fr</div>
            </div>
          </div>
        ) : null}

        <div className="text-center mt-4">
          <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>ID: {badgeId}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ SCANNER DASHBOARD (for staff) ═══════════ */
function ScannerDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [affluence, setAffluence] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchAffluence();
    const interval = setInterval(fetchAffluence, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAffluence = async () => {
    try {
      const res = await fetch(`${API}/api/terrain/affluence`);
      const data = await res.json();
      setAffluence(data);
    } catch { /* offline fallback */ }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/terrain/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleManualCheckin = async (regId) => {
    try {
      const res = await fetch(`${API}/api/terrain/manual-checkin/${regId}?validator_id=staff_manual`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success' || data.status === 'already_present') {
        // Refresh search results
        if (searchQuery) handleSearch(searchQuery);
        fetchAffluence();
      }
    } catch { /* */ }
  };

  const pct = affluence?.percentage || 0;

  return (
    <div className="min-h-screen" style={{ background: C.charbon }} data-testid="scanner-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-40 p-4" style={{ background: 'rgba(28,26,20,0.95)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${C.gold}15` }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
            <div>
              <div className="font-bold text-sm" style={{ color: C.gold }}>CC2026 STAFF</div>
              <div className="text-xs" style={{ color: C.terra }}>Scan & Check-in</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" style={{ color: C.gold }} />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Affluence */}
        {affluence && (
          <div className="rounded-xl p-4" style={{ background: '#2A2820', border: `1px solid ${C.gold}15` }} data-testid="affluence-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: C.gold }}>Affluence en temps reel</span>
              <Users className="w-4 h-4" style={{ color: C.gold }} />
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-3xl font-bold text-white">{affluence.present_count}</span>
              <span className="text-sm pb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/ {affluence.total_registered}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 75 ? C.terra : C.sage }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{pct}%</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{affluence.remaining} restant(s)</span>
            </div>
            {affluence.last_scans?.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Derniers scans</div>
                {affluence.last_scans.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-white">{s.person?.full_name || '-'}</span>
                    <span className="text-xs" style={{ color: C.terra }}>{s.timestamp ? new Date(s.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="rounded-xl p-4" style={{ background: '#2A2820', border: `1px solid ${C.gold}15` }}>
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: C.gold }}>Recherche participant</div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Nom, organisation, email..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              data-testid="search-participant-input"
            />
            {searching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: C.terra }} />}
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2" data-testid="search-results">
              {searchResults.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <div className="text-sm font-medium text-white">{r.full_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.organization_name || r.profile_type}</div>
                    <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px]"
                      style={{ background: `${TIER_COLORS[r.tier]?.bg || C.terra}20`, color: TIER_COLORS[r.tier]?.bg || C.terra }}>
                      {TIER_COLORS[r.tier]?.label || r.tier}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.presence_status === 'present' ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ background: `${C.sage}20`, color: C.sage }}>
                        <CheckCircle className="w-3 h-3" /> Present
                      </span>
                    ) : (
                      <button
                        onClick={() => handleManualCheckin(r.id)}
                        className="text-xs px-3 py-1.5 rounded font-medium"
                        style={{ background: C.terra, color: '#fff' }}
                        data-testid={`checkin-${r.id}`}
                      >
                        Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-xl p-4" style={{ background: '#2A2820', border: `1px solid ${C.gold}15` }}>
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: C.gold }}>Comment scanner</div>
          <div className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <p>1. Ouvrez l'appareil photo de votre telephone</p>
            <p>2. Scannez le QR code sur le badge du participant</p>
            <p>3. Le lien s'ouvre automatiquement et valide la presence</p>
            <p className="pt-2" style={{ color: C.terra }}>Ou utilisez la recherche ci-dessus pour un check-in manuel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BadgeScan;
