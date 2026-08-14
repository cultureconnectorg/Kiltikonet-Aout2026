import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from './SEO';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════
// Design system PNG-aligné · fond sombre institutionnel
// ═══════════════════════════════════════════════════════════
const K = {
  bg: '#0B0906',      // fond principal (noir profond)
  panel: '#1A1713',   // panels
  edge: '#2C2620',    // hairlines
  paper: '#F7F5EF',   // ivory clair
  dim: '#8A8378',     // texte secondaire
  gold: '#C9A84C',    // signal rare
};

// Hero left/right layout · pas de card, pas de gradient marketing
export default function KiltikonetHome() {
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const dateStr = now.toISOString().slice(0, 10);

  const [publicNow, setPublicNow] = useState(null);
  useEffect(() => {
    axios.get(`${API}/api/observatory/public/now`)
      .then(r => setPublicNow(r.data?.digital_memory || null))
      .catch(() => setPublicNow(null));
  }, []);

  const fmt = (v) => (v === null || v === undefined) ? '—' : Number(v).toLocaleString('fr-FR');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kiltikonet',
    url: 'https://kiltikonet.fr',
    description: "Kiltikonet est l'infrastructure vivante de la diplomatie culturelle numérique.",
    parentOrganization: { '@type': 'Organization', name: 'CVLN Holding Ltd' },
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: K.bg, color: K.paper, fontFamily: "'Manrope', sans-serif" }}
      data-testid="kiltikonet-home"
    >
      <SEO
        title="Réseau et infrastructure culturelle afro-caribéenne"
        description="Kiltikonet est l'infrastructure vivante de la diplomatie culturelle numérique. Nous connectons les acteurs, valorisons les initiatives et traçons les liens qui façonnent notre avenir commun."
        path="/"
        jsonLd={jsonLd}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* HERO — split screen : texte à gauche, globe à droite  */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '86vh' }}
        data-testid="hero"
      >
        {/* Bandeau logo + nav simplifiée alignée sur PNG */}
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-8 flex items-center justify-between">
          <div
            data-testid="logo-header"
            style={{ fontFamily: "'Newsreader', serif", fontSize: '1.3rem', letterSpacing: '0.14em', color: K.paper }}
          >
            KILTIKONET
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: K.paper }}>
            <Link to="/a-propos">Mission</Link>
            <Link to="/culture-connect">Connect</Link>
            <Link to="/observatory">Observatory</Link>
            <Link to="/now">Actualités</Link>
            <Link to="/rejoindre">Participer</Link>
            <span style={{ color: K.dim }}>FR ▾</span>
          </nav>
        </div>

        {/* Split content */}
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-12 grid grid-cols-12 gap-8">
          {/* LEFT · déclaration monumentale */}
          <div className="col-span-12 md:col-span-6 lg:col-span-6">
            <h1
              className="mb-10"
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(3.4rem, 8vw, 8rem)',
                lineHeight: 0.94,
                letterSpacing: '-0.02em',
                color: K.paper,
                textTransform: 'uppercase',
              }}
              data-testid="hero-title"
            >
              Tissons <span style={{ fontStyle: 'italic', textTransform: 'none' }}>l'Invisible.</span>
              <br />
              Révélons <span style={{ fontStyle: 'italic', textTransform: 'none' }}>l'Essentiel.</span>
            </h1>
            <p
              className="max-w-lg mb-10"
              style={{ color: '#B8B0A0', lineHeight: 1.7, fontSize: '15px' }}
              data-testid="hero-lead"
            >
              Kiltikonet est l'infrastructure vivante de la diplomatie culturelle
              numérique. Nous connectons les acteurs, valorisons les initiatives et
              traçons les liens qui façonnent notre avenir commun.
            </p>
            <Link
              to="/a-propos"
              className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.22em]"
              style={{ color: K.paper, borderBottom: `1px solid ${K.paper}`, paddingBottom: 4 }}
              data-testid="cta-discover"
            >
              Découvrir Kiltikonet
              <span style={{ fontFamily: 'monospace' }}>→</span>
            </Link>
          </div>

          {/* RIGHT · Globe / carte du monde constellée */}
          <div
            className="col-span-12 md:col-span-6 lg:col-span-6 flex items-center justify-center"
            data-testid="hero-globe"
            style={{ minHeight: '400px' }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                maxWidth: '620px',
                background: `
                  radial-gradient(circle at 30% 40%, rgba(201, 168, 76, 0.06) 0%, transparent 60%),
                  radial-gradient(circle at 70% 60%, rgba(201, 168, 76, 0.04) 0%, transparent 55%)
                `,
                position: 'relative',
              }}
            >
              <NetworkGlobe />
            </div>
          </div>
        </div>

        {/* Bande basse : 4 métriques cadrées, style catalogue */}
        <div
          className="relative z-10 px-6 md:px-12 lg:px-20 mt-8 md:mt-4"
          data-testid="hero-metrics-bar"
        >
          <div
            className="grid grid-cols-2 md:grid-cols-4 py-8 md:py-10"
            style={{ borderTop: `1px solid ${K.edge}`, borderBottom: `1px solid ${K.edge}` }}
          >
            {[
              { value: publicNow ? fmt(publicNow.recorded_events) : '—', label: 'Traces historiques', sub: 'événements enregistrés' },
              { value: publicNow ? fmt(publicNow.registrations) : '—', label: 'Acteurs', sub: 'enregistrés' },
              { value: publicNow ? fmt(publicNow.workspace_activity) : '—', label: 'Activités', sub: 'workspace' },
              { value: 'CC2026', label: 'Culture Connect', sub: 'édition 2026', isSlug: true },
            ].map((m, i) => (
              <div key={i} className="px-2 md:px-6" data-testid={`hero-metric-${i}`}>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: m.isSlug ? 'clamp(1.8rem, 3.2vw, 2.6rem)' : 'clamp(2.2rem, 4vw, 3.4rem)',
                    lineHeight: 1,
                    color: K.paper,
                    fontVariantNumeric: 'tabular-nums',
                    marginBottom: 12,
                  }}
                >
                  {m.value}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.paper }}>
                  {m.label}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color: K.dim }}>
                  {m.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* NOTRE MISSION                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-32"
        style={{ borderBottom: `1px solid ${K.edge}` }}
        data-testid="section-mission"
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] mb-6" style={{ color: K.dim }}>
          Notre Mission
        </div>
        <h2
          className="max-w-4xl mb-6"
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 400,
            fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
            lineHeight: 1.15,
            color: K.paper,
          }}
        >
          Kiltikonet œuvre pour une diplomatie culturelle nouvelle génération.
        </h2>
        <p className="max-w-3xl" style={{ color: '#B8B0A0', lineHeight: 1.7, fontSize: '15px' }}>
          Nous bâtissons les ponts entre les cultures, les territoires et les idées.
        </p>
        <div className="mt-8">
          <Link
            to="/a-propos"
            className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.22em]"
            style={{ color: K.paper, borderBottom: `1px solid ${K.paper}`, paddingBottom: 4 }}
            data-testid="cta-mission"
          >
            En savoir plus
            <span style={{ fontFamily: 'monospace' }}>→</span>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ACTUALITÉS · bandeau simple                           */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-12 md:py-16"
        style={{ borderBottom: `1px solid ${K.edge}` }}
        data-testid="section-actus"
      >
        <div className="grid grid-cols-12 items-center gap-6">
          <div className="col-span-12 md:col-span-2 text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.dim }}>
            Actualités
          </div>
          <div className="col-span-12 md:col-span-8" style={{ color: K.paper, fontFamily: "'Newsreader', serif", fontSize: '1.1rem', lineHeight: 1.4 }}>
            Culture Connect 2026 — Les inscriptions sont ouvertes
          </div>
          <div className="col-span-6 md:col-span-1 text-[10px] font-mono uppercase tracking-widest" style={{ color: K.dim }}>
            {dateStr.slice(0, 4) === String(year) ? '12 août 2026' : dateStr}
          </div>
          <div className="col-span-6 md:col-span-1 text-right">
            <Link to="/culture-connect/2026" style={{ color: K.paper, fontFamily: 'monospace' }} data-testid="link-actus">
              →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer institutionnel unifié */}
      <InstitutionalFooter variant="dark" />
    </div>
  );
}

// ─── Composant Globe/Réseau SVG minimaliste ───────────────
function NetworkGlobe() {
  // 24 nodes disposés en constellation (déterministes, pas de fabrication de "connexions" réelles)
  const nodes = [
    [50, 50], [30, 35], [70, 30], [25, 55], [75, 55], [45, 25], [55, 75],
    [20, 45], [80, 45], [35, 70], [65, 65], [40, 40], [60, 40], [50, 70],
    [30, 25], [70, 20], [15, 60], [85, 60], [40, 80], [60, 80], [50, 15],
    [25, 75], [75, 75], [50, 60],
  ];
  const edges = [
    [0, 1], [0, 2], [0, 11], [0, 12], [0, 23],
    [1, 4], [1, 5], [1, 7], [1, 14],
    [2, 5], [2, 8], [2, 15], [2, 20],
    [3, 7], [3, 9], [3, 16],
    [4, 8], [4, 10], [4, 17],
    [11, 12], [11, 14], [12, 15],
    [23, 6], [6, 13], [13, 18], [13, 19],
    [9, 21], [10, 22], [5, 20], [20, 15],
  ];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden data-testid="hero-globe-svg">
      {/* Cercle d'orbite discret */}
      <circle cx="50" cy="50" r="42" stroke="#C9A84C" strokeOpacity="0.08" strokeWidth="0.2" fill="none" />
      <circle cx="50" cy="50" r="32" stroke="#C9A84C" strokeOpacity="0.06" strokeWidth="0.2" fill="none" />
      <circle cx="50" cy="50" r="22" stroke="#C9A84C" strokeOpacity="0.04" strokeWidth="0.2" fill="none" />
      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="#C9A84C"
          strokeOpacity="0.28"
          strokeWidth="0.15"
        />
      ))}
      {/* Nodes lumineux */}
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="0.9" fill="#C9A84C" opacity="0.85" />
          <circle cx={x} cy={y} r="2" fill="#C9A84C" opacity="0.08" />
        </g>
      ))}
    </svg>
  );
}
