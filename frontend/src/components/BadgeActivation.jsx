import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Shield, QrCode } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Kiltikonet palette
const C = { bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0', dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C', terra: '#A65D47' };

export default function BadgeActivation() {
  const { qrToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = qrToken || searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [badge, setBadge] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setError('QR token manquant'); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/activer-badge/${token}`);
        const data = await res.json();
        if (res.ok) { setBadge(data); setStatus('success'); }
        else { setError(data.detail || 'Erreur activation'); setStatus('error'); }
      } catch { setError('Erreur de connexion'); setStatus('error'); }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
      <div className="w-full max-w-md" data-testid="badge-activation-page">
        {status === 'loading' && (
          <div className="text-center" data-testid="badge-activation-loading">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: C.terra }} />
            <p style={{ color: C.muted }}>Activation en cours...</p>
          </div>
        )}
        {status === 'success' && badge && (
          <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: C.card, border: `1px solid ${C.warm}` }}>
            <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${C.terra}, ${C.gold})` }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-3 text-white" />
              <h1 className="text-2xl font-bold text-white" data-testid="badge-activation-success">Badge Activé !</h1>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center p-4 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.warm}` }}>
                <p className="text-xs mb-1" style={{ color: C.muted }}>VOTRE BADGE</p>
                <p className="text-2xl font-bold" style={{ color: C.terra }} data-testid="badge-id-display">{badge.badge_id}</p>
                <p className="text-sm mt-1" style={{ color: C.muted }}>{badge.type_badge}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ background: C.bg, border: `1px solid ${C.warm}` }}>
                  <Shield size={18} className="mx-auto mb-1" style={{ color: C.gold }} />
                  <p className="text-xs" style={{ color: C.muted }}>Statut</p>
                  <p className="text-sm font-medium" style={{ color: C.dark }}>{badge.statut}</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: C.bg, border: `1px solid ${C.warm}` }}>
                  <QrCode size={18} className="mx-auto mb-1" style={{ color: C.gold }} />
                  <p className="text-xs" style={{ color: C.muted }}>FREK-ID</p>
                  <p className="text-sm font-medium" style={{ color: C.dark }}>{(badge.frek_id || '').substring(0, 12)}...</p>
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: C.bg }}>
                <p className="text-sm font-medium" style={{ color: C.terra }}>{badge.prenom} {badge.nom}</p>
              </div>
              <p className="text-center text-xs" style={{ color: C.muted }}>Présentez ce badge le 22 Mai 2026 au Grand Carbet du Parc culturel Aimé Césaire</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="text-center p-8 rounded-xl shadow-lg" style={{ background: C.card, border: '1px solid #EF4444' }} data-testid="badge-activation-error">
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: '#EF4444' }}>Erreur</h2>
            <p style={{ color: C.muted }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
