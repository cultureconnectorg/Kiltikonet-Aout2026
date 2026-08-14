import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { K } from './atoms';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Footer institutionnel unifié.
 * Un seul composant pour toutes les pages publiques Kiltikonet.
 * Affiche discrètement 2 métriques Observatory (data lineage visible).
 * Variantes : "dark" (par défaut) | "print" (mode dossier).
 */
export default function InstitutionalFooter({ variant = 'dark' }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    axios
      .get(`${API}/api/observatory/public/now`)
      .then((r) => setNow(r.data?.digital_memory || null))
      .catch(() => setNow(null));
  }, []);

  const fmt = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('fr-FR'));
  const year = new Date().getFullYear();
  const dark = variant === 'dark';

  const bg = dark ? K.ink : 'transparent';
  const textDim = dark ? '#8A8378' : K.dust;
  const textStrong = dark ? K.paper : K.ink;

  return (
    <footer
      className="px-6 md:px-12 lg:px-20 py-16 md:py-24"
      style={{
        background: bg,
        color: textDim,
        borderTop: `1px solid ${dark ? 'var(--kk-rule-dark)' : 'var(--kk-rule-light)'}`,
      }}
      data-testid="institutional-footer"
    >
      {/* Rythme éditorial : titre + colonnes */}
      <div className="grid md:grid-cols-12 gap-8 mb-12 md:mb-16">
        <div className="md:col-span-4">
          <div
            className="mb-3"
            style={{
              color: textStrong,
              fontFamily: K.serif,
              fontSize: '1.75rem',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            Kiltikonet.
          </div>
          <div className="text-xs font-mono uppercase tracking-widest">
            Initiative CVLN Group · {year}
          </div>
          <div className="text-xs font-mono uppercase tracking-widest mt-1">
            Fort-de-France · MQ
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest" style={{ color: textStrong }}>
            Culture Connect
          </div>
          <ul className="space-y-1 text-sm" style={{ fontFamily: K.sans }}>
            <li><Link to="/culture-connect">Page mère</Link></li>
            <li><Link to="/culture-connect/2026">Édition 2026</Link></li>
            <li><Link to="/culture-connect/2027">Édition 2027</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest" style={{ color: textStrong }}>
            Institution
          </div>
          <ul className="space-y-1 text-sm" style={{ fontFamily: K.sans }}>
            <li><Link to="/a-propos">À propos</Link></li>
            <li><Link to="/infrastructure">Infrastructure</Link></li>
            <li><Link to="/gouvernance">Gouvernance</Link></li>
            <li><Link to="/partenaires">Partenaires</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest" style={{ color: textStrong }}>
            Réseau
          </div>
          <ul className="space-y-1 text-sm" style={{ fontFamily: K.sans }}>
            <li><Link to="/rejoindre">Rejoindre</Link></li>
            <li><Link to="/now">Maintenant</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><a href="mailto:contact@kiltikonet.fr">contact@kiltikonet.fr</a></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest" style={{ color: textStrong }}>
            Légal
          </div>
          <ul className="space-y-1 text-sm" style={{ fontFamily: K.sans }}>
            <li><Link to="/mentions-legales">Mentions légales</Link></li>
            <li><Link to="/confidentialite">Confidentialité</Link></li>
            <li><Link to="/cgu">CGU</Link></li>
            <li><Link to="/accessibilite">Accessibilité</Link></li>
          </ul>
        </div>
      </div>

      {/* Bandeau data lineage sobre — deux métriques honnêtes */}
      <div
        className="pt-8 mt-8 grid md:grid-cols-12 gap-6"
        style={{ borderTop: `1px solid ${dark ? 'var(--kk-rule-dark)' : 'var(--kk-rule-light)'}` }}
        data-testid="footer-lineage"
      >
        <div className="md:col-span-3">
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1">Traces</div>
          <div
            style={{
              fontFamily: K.serif,
              fontSize: '1.75rem',
              color: textStrong,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {now ? fmt(now.recorded_events) : '—'}
          </div>
          <div className="text-[10px] font-mono lowercase tracking-wider mt-1" style={{ opacity: 0.6 }}>
            src · observatory/public/now
          </div>
        </div>
        <div className="md:col-span-3">
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1">Identités actives</div>
          <div
            style={{
              fontFamily: K.serif,
              fontSize: '1.75rem',
              color: textStrong,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {now ? fmt(now.cultural_identities_active) : '—'}
          </div>
          <div className="text-[10px] font-mono lowercase tracking-wider mt-1" style={{ opacity: 0.6 }}>
            src · observatory/public/now
          </div>
        </div>
        <div className="md:col-span-6 md:text-right text-[10px] font-mono uppercase tracking-widest self-end">
          <div>N° 001 · {new Date().toISOString().slice(0, 10)}</div>
          <div style={{ opacity: 0.6 }}>14.6161°N · 61.0588°W · Fort-de-France</div>
        </div>
      </div>
    </footer>
  );
}
