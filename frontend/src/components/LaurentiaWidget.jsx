import React, { useEffect, useState } from 'react';
import { Sparkles, ExternalLink, Clock, AlertCircle, Zap, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * LaurentiaWidget — bloc compact "Mon IA Laurent.ia" sur la page profil.
 *
 * États gérés :
 *   coming_soon       → annonce élégante "arrive bientôt"
 *   unreachable       → message neutre + retry
 *   not_provisioned   → CTA "Activer mon instance"
 *   active            → compteur tokens + version + lien d'accès
 *
 * Pas de "CVL Brain" ni "FrekCore" dans le rendu — pure marque Laurent.ia.
 */
const LaurentiaWidget = ({ frekId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!frekId) return;
    let mounted = true;
    setLoading(true);
    fetch(`${API}/api/me/laurentia/status?frek_id=${encodeURIComponent(frekId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setData({ state: 'unreachable', message: 'Connexion impossible.' });
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [frekId, retryCount]);

  if (!frekId) return null;
  if (loading) {
    return (
      <div className="border border-paper/10 p-5 flex items-center gap-3" data-testid="laurentia-widget-loading">
        <Loader2 className="w-4 h-4 animate-spin text-paper/40" />
        <span className="text-xs text-paper/40 uppercase tracking-widest">Chargement</span>
      </div>
    );
  }

  const state = data?.state || 'unreachable';

  // ─── COMING SOON ─────────────────────────────────────
  if (state === 'coming_soon') {
    return (
      <div
        className="relative overflow-hidden p-6 border"
        style={{
          background: 'linear-gradient(135deg, rgba(155,58,46,0.04), rgba(45,42,38,0.03))',
          borderColor: 'rgba(155,58,46,0.2)',
        }}
        data-testid="laurentia-widget-coming-soon"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #9B3A2E 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: '#9B3A2E' }} />
            <span className="text-[10px] uppercase tracking-widest font-syne font-bold" style={{ color: '#9B3A2E' }}>Bientôt disponible</span>
          </div>
          <h3 className="font-serif text-xl mb-2 text-charcoal">Laurent.ia</h3>
          <p className="text-sm mb-4 leading-relaxed text-charcoal/60">
            Ton intelligence personnelle souveraine. Une IA qui te connaît, qui apprend ton contexte culturel, et qui répond dans ta langue.
          </p>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-charcoal/40">
            <Clock className="w-3 h-3" />
            <span>Activation prochaine</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── UNREACHABLE ─────────────────────────────────────
  if (state === 'unreachable') {
    return (
      <div className="p-5 border border-charcoal/15 flex items-start gap-3" data-testid="laurentia-widget-unreachable">
        <AlertCircle className="w-4 h-4 mt-0.5 text-charcoal/40 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-serif text-sm text-charcoal mb-1">Laurent.ia</h3>
          <p className="text-xs text-charcoal/50 mb-3">{data.message || 'Service momentanément indisponible.'}</p>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            className="text-[10px] uppercase tracking-widest underline text-charcoal/60 hover:text-charcoal"
            data-testid="laurentia-retry-btn"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ─── NOT PROVISIONED ─────────────────────────────────
  if (state === 'not_provisioned') {
    return (
      <div className="p-6 border" style={{ borderColor: 'rgba(155,58,46,0.3)' }} data-testid="laurentia-widget-not-provisioned">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: '#9B3A2E' }} />
          <span className="text-[10px] uppercase tracking-widest font-syne font-bold" style={{ color: '#9B3A2E' }}>Activation requise</span>
        </div>
        <h3 className="font-serif text-lg mb-2 text-charcoal">Active Laurent.ia</h3>
        <p className="text-sm text-charcoal/60 mb-4">
          Ton intelligence personnelle est prête à être activée. Quelques secondes suffisent.
        </p>
        <a
          href={data.url || 'https://laurentia.cvln.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold"
          style={{ background: '#9B3A2E', color: '#F4F0E8' }}
          data-testid="laurentia-activate-btn"
        >
          Activer maintenant <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // ─── ACTIVE ──────────────────────────────────────────
  const pct = data.tokens_limit_month > 0
    ? Math.min(100, Math.round((data.tokens_used_month / data.tokens_limit_month) * 100))
    : 0;
  const versionLabel = (data.version || 'free').toUpperCase();

  return (
    <div className="p-6 border" style={{ borderColor: 'rgba(155,58,46,0.3)', background: 'rgba(155,58,46,0.03)' }} data-testid="laurentia-widget-active">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: '#9B3A2E' }} />
            <span className="text-[10px] uppercase tracking-widest font-syne font-bold" style={{ color: '#9B3A2E' }}>Active</span>
          </div>
          <h3 className="font-serif text-xl text-charcoal">Laurent.ia</h3>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest px-2 py-1"
          style={{
            background: data.version === 'pro' ? '#9B3A2E' : 'rgba(155,58,46,0.12)',
            color: data.version === 'pro' ? '#F4F0E8' : '#9B3A2E',
            fontWeight: 700,
          }}
          data-testid="laurentia-version-badge"
        >
          {versionLabel}
        </span>
      </div>

      {/* Tokens progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-charcoal/50 mb-2">
          <span>Tokens utilisés ce mois</span>
          <span className="font-mono text-charcoal/70 tabular-nums" data-testid="laurentia-tokens-count">
            {data.tokens_used_month.toLocaleString('fr')} / {data.tokens_limit_month.toLocaleString('fr')}
          </span>
        </div>
        <div className="w-full h-1 bg-charcoal/10 overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct > 80 ? '#9B3A2E' : '#E8D5A0' }}
          />
        </div>
      </div>

      {/* JCC balance */}
      {typeof data.jcc_balance === 'number' && data.jcc_balance > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-charcoal/60">
          <Zap className="w-3 h-3" style={{ color: '#9B3A2E' }} />
          <span>{data.jcc_balance} JCC disponibles</span>
        </div>
      )}

      <a
        href={data.url || 'https://laurentia.cvln.com'}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold opacity-90 hover:opacity-100"
        style={{ color: '#9B3A2E' }}
        data-testid="laurentia-open-btn"
      >
        Ouvrir Laurent.ia <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

export default LaurentiaWidget;
