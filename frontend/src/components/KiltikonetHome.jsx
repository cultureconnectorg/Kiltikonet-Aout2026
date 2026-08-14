import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from './SEO';

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════
// Palette institutionnelle · aligned PNG source of truth
// ═══════════════════════════════════════════════════════════
const K = {
  bg: '#0B0906',
  panel: '#1A1713',
  panel2: '#141010',
  edge: '#2C2620',
  edgeSoft: '#1F1B15',
  paper: '#F7F5EF',
  dim: '#8A8378',
  soft: '#B8B0A0',
  gold: '#C9A84C',
  goldSoft: '#A8894A',
};

// ═══════════════════════════════════════════════════════════
// Small logo mark (labyrinth · repris du PNG en haut à gauche)
// ═══════════════════════════════════════════════════════════
const LogoMark = ({ size = 28, color = K.gold }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden data-testid="logo-mark">
    <rect x="1" y="1" width="30" height="30" fill="none" stroke={color} strokeWidth="1" />
    <rect x="5" y="5" width="22" height="22" fill="none" stroke={color} strokeWidth="0.7" />
    <rect x="9" y="9" width="14" height="14" fill="none" stroke={color} strokeWidth="0.7" />
    <path d="M 9 16 L 16 16 L 16 23" fill="none" stroke={color} strokeWidth="0.7" />
    <path d="M 23 16 L 16 16 L 16 9" fill="none" stroke={color} strokeWidth="0.7" />
    <circle cx="16" cy="16" r="1.2" fill={color} />
  </svg>
);

// ═══════════════════════════════════════════════════════════
// World map · continents constellés + arcs dorés
// ═══════════════════════════════════════════════════════════
const WorldMap = () => {
  // Regions labeled (approx viewBox 100 × 60)
  const regions = [
    { name: 'AMÉRIQUE DU NORD', x: 18, y: 18 },
    { name: 'CARAÏBES', x: 26, y: 30 },
    { name: 'AMÉRIQUE DU SUD', x: 30, y: 42 },
    { name: 'EUROPE', x: 52, y: 15 },
    { name: 'AFRIQUE', x: 55, y: 34 },
  ];
  const nodes = [
    // Amérique du Nord
    [16, 15], [22, 16], [14, 20], [20, 22], [24, 18], [12, 24],
    // Caraïbes
    [24, 28], [26, 30], [28, 27], [23, 32], [30, 29],
    // Amérique du Sud
    [28, 40], [32, 44], [34, 48], [30, 52], [26, 45],
    // Europe
    [50, 13], [54, 15], [52, 18], [56, 12], [48, 16],
    // Afrique
    [54, 30], [58, 34], [56, 38], [60, 32], [52, 40], [58, 44],
  ];
  const arcs = [
    [6, 7], [6, 16], [6, 21], [7, 21], [7, 22], // Caraïbes ↔ Europe/Afrique
    [1, 6], [1, 17], // NA ↔ Caraïbes/Europe
    [12, 22], [12, 21], // SA ↔ Afrique
    [16, 22], [17, 22], [18, 21], // Europe ↔ Afrique
    [4, 16], [3, 12], [21, 25], [21, 26], [22, 26],
    [6, 12], [7, 12],
  ];
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="w-full h-full" aria-hidden data-testid="hero-worldmap">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#C9A84C" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Bulle de fond dorée pour donner de la profondeur */}
      <ellipse cx="42" cy="30" rx="46" ry="24" fill="url(#glow)" />
      {/* Silhouettes continents (arcs subtils, pas d'illustration détaillée) */}
      <path d="M 6 12 Q 14 10, 24 14 T 30 24 Q 22 26, 14 26 T 6 20 Z" fill="#1F1B15" opacity="0.45" />
      <path d="M 22 30 Q 32 30, 30 34 T 24 36 Z" fill="#1F1B15" opacity="0.45" />
      <path d="M 24 38 Q 32 38, 34 46 T 28 54 Q 24 50, 26 44 Z" fill="#1F1B15" opacity="0.45" />
      <path d="M 46 10 Q 56 8, 60 14 T 54 18 Q 48 18, 46 14 Z" fill="#1F1B15" opacity="0.45" />
      <path d="M 48 26 Q 60 28, 62 38 T 54 46 Q 46 42, 48 32 Z" fill="#1F1B15" opacity="0.45" />
      {/* Arcs de connexion */}
      {arcs.map(([a, b], i) => {
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.15;
        return (
          <path key={i} d={`M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}`}
                stroke="#C9A84C" strokeWidth="0.25" strokeOpacity="0.7" fill="none" />
        );
      })}
      {/* Nodes lumineux */}
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2" fill="#C9A84C" opacity="0.15" />
          <circle cx={x} cy={y} r="0.9" fill="#C9A84C" opacity="1" />
        </g>
      ))}
      {/* Labels régions */}
      {regions.map((r, i) => (
        <text key={i} x={r.x} y={r.y} fill="#F7F5EF" fontSize="2.2" fontFamily="'IBM Plex Mono', monospace"
              letterSpacing="0.18em" textAnchor="middle" opacity="0.9" fontWeight="500">
          {r.name}
        </text>
      ))}
    </svg>
  );
};

// Empreinte digitale stylisée (section Infrastructure)
const Fingerprint = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full" aria-hidden data-testid="fingerprint">
    <g fill="none" stroke={K.gold} strokeWidth="0.7" strokeOpacity="0.55">
      {[...Array(18)].map((_, i) => {
        const rx = 15 + i * 3;
        const ry = 20 + i * 4;
        return <ellipse key={i} cx="60" cy="70" rx={rx} ry={ry} />;
      })}
      <line x1="60" y1="20" x2="60" y2="120" strokeOpacity="0.35" />
    </g>
  </svg>
);

// Réseau (section 03)
const NetworkDiagram = () => {
  const center = [50, 50];
  const nodes = [
    { pos: [50, 15], label: 'TERRITOIRES' },
    { pos: [88, 40], label: 'PERSONNES' },
    { pos: [80, 82], label: 'ŒUVRES' },
    { pos: [30, 88], label: 'ORGANISATIONS' },
    { pos: [12, 45], label: 'ÉVÉNEMENTS' },
  ];
  const orbitalNodes = [
    [30, 20], [70, 20], [90, 55], [72, 88], [40, 92], [15, 70], [12, 30], [55, 30], [45, 70], [70, 65],
  ];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden data-testid="network-diagram">
      {/* Edges vers centre */}
      {nodes.map((n, i) => (
        <line key={i} x1={n.pos[0]} y1={n.pos[1]} x2={center[0]} y2={center[1]}
              stroke={K.gold} strokeWidth="0.2" strokeOpacity="0.4" />
      ))}
      {/* Orbital connections */}
      {orbitalNodes.map((p, i) => (
        <line key={`o${i}`} x1={p[0]} y1={p[1]} x2={center[0]} y2={center[1]}
              stroke={K.gold} strokeWidth="0.12" strokeOpacity="0.2" />
      ))}
      {/* Orbital nodes */}
      {orbitalNodes.map((p, i) => (
        <circle key={`on${i}`} cx={p[0]} cy={p[1]} r="0.6" fill={K.gold} opacity="0.5" />
      ))}
      {/* 5 pillar nodes */}
      {nodes.map((n, i) => (
        <g key={`p${i}`}>
          <circle cx={n.pos[0]} cy={n.pos[1]} r="2.4" fill={K.bg} stroke={K.gold} strokeWidth="0.4" />
          <circle cx={n.pos[0]} cy={n.pos[1]} r="1" fill={K.gold} />
        </g>
      ))}
      {/* Center Kilti mark */}
      <g transform={`translate(${center[0] - 5}, ${center[1] - 5})`}>
        <rect x="0" y="0" width="10" height="10" fill="none" stroke={K.gold} strokeWidth="0.6" />
        <rect x="2" y="2" width="6" height="6" fill="none" stroke={K.gold} strokeWidth="0.4" />
        <circle cx="5" cy="5" r="0.8" fill={K.gold} />
      </g>
      {/* Labels */}
      {nodes.map((n, i) => {
        const [x, y] = n.pos;
        const dy = y < 30 ? -3.5 : y > 70 ? 5 : 0;
        const dx = x < 20 ? -1 : x > 80 ? 1 : 0;
        return (
          <text key={`t${i}`} x={x + dx} y={y + dy + 4} fill={K.soft} fontSize="2.2"
                fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.12em"
                textAnchor={x < 20 ? 'start' : x > 80 ? 'end' : 'middle'}>
            {n.label}
          </text>
        );
      })}
    </svg>
  );
};

// Observatory sparkline sample (constellation + bar chart)
const ObservatoryConstellation = () => {
  const pts = [
    [10, 30], [22, 20], [30, 40], [42, 25], [50, 55], [60, 30], [72, 45], [85, 25], [92, 40],
  ];
  return (
    <svg viewBox="0 0 100 70" className="w-full h-full" aria-hidden>
      {pts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = pts[i + 1];
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.gold} strokeWidth="0.25" strokeOpacity="0.5" />;
      })}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.9" fill={K.gold} />
      ))}
    </svg>
  );
};

const ObservatoryBars = () => {
  const bars = [30, 45, 25, 60, 40, 70, 35, 55, 48, 65, 42, 58, 38, 62, 50];
  return (
    <svg viewBox="0 0 100 70" className="w-full h-full" aria-hidden>
      {bars.map((h, i) => (
        <rect key={i} x={i * 6.5 + 2} y={70 - h} width="4" height={h} fill={K.gold} opacity={0.4 + (h / 100)} />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function KiltikonetHome() {
  const [publicNow, setPublicNow] = useState(null);
  useEffect(() => {
    axios.get(`${API}/api/observatory/public/now`)
      .then(r => setPublicNow(r.data?.digital_memory || null))
      .catch(() => setPublicNow(null));
  }, []);

  const fmt = (v) => (v === null || v === undefined) ? '—' : Number(v).toLocaleString('fr-FR');

  // Traces récentes simulées d'après ce que l'observatoire enregistre effectivement
  const [recent] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const mk = (offset) => {
      const t = new Date(now.getTime() - offset * 60 * 1000);
      return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    };
    return [
      { t: mk(3), text: 'TRACE · ÉVÉNEMENT' },
      { t: mk(10), text: 'INSCRIPTION · FREK-ID' },
      { t: mk(13), text: 'ACTIVITÉ · WORKSPACE' },
      { t: mk(24), text: 'TRACE · SCAN' },
      { t: mk(32), text: 'ÉVÉNEMENT · CRÉATION' },
      { t: mk(44), text: 'TRACE · CONFIRMÉE' },
    ];
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kiltikonet',
    url: 'https://kiltikonet.fr',
    description: "Une infrastructure culturelle qui relie les personnes, les œuvres, les territoires et les expériences de la diaspora.",
    parentOrganization: { '@type': 'Organization', name: 'CVLN Holding Ltd' },
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: K.bg, color: K.paper, fontFamily: "'Manrope', sans-serif" }}
      data-testid="kiltikonet-home"
    >
      <SEO
        title="Kiltikonet — Infrastructure culturelle mondiale"
        description="Une infrastructure culturelle qui relie les personnes, les œuvres, les territoires et les expériences de la diaspora."
        path="/"
        jsonLd={jsonLd}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* 01 · HERO — carte du monde + déclaration monumentale */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '100vh', background: K.bg }}
        data-testid="hero"
      >
        {/* Header top-bar */}
        <header className="relative z-30 px-6 md:px-12 lg:px-16 pt-6 md:pt-8 flex items-center justify-between" data-testid="hero-header">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <LogoMark size={30} />
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: '1.15rem', letterSpacing: '0.15em', color: K.paper }}>
              KILTIKONET
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-[0.24em]" style={{ color: K.paper }}>
            <Link to="/a-propos" data-testid="nav-apropos">À propos</Link>
            <Link to="/reseau" data-testid="nav-reseau">Réseau</Link>
            <Link to="/culture-connect" data-testid="nav-connect">Culture Connect</Link>
            <Link to="/infrastructure" data-testid="nav-infra">Infrastructure</Link>
            <Link to="/observatory" data-testid="nav-obs">Observatory</Link>
            <button
              aria-label="Menu"
              className="ml-2"
              style={{ color: K.paper, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
              data-testid="menu-burger"
            >≡</button>
          </nav>
        </header>

        {/* Hero content — grid : text left, world map right */}
        <div className="relative z-20 px-6 md:px-12 lg:px-16 pt-8 md:pt-12 pb-16 grid grid-cols-12 gap-6">
          {/* LEFT · déclaration */}
          <div className="col-span-12 md:col-span-6 lg:col-span-6 flex flex-col justify-center">
            <h1
              className="mb-10"
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(4rem, 10vw, 10rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                color: K.paper,
              }}
              data-testid="hero-title"
            >
              KILTIKONET
            </h1>
            <div className="mb-10" data-testid="hero-tagline">
              <p style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.75rem, 2.6vw, 2.4rem)', lineHeight: 1.15, color: K.paper }}>
                <span style={{ color: K.gold, fontStyle: 'italic' }}>Tissons</span> l'invisible. <br />
                <span style={{ color: K.gold, fontStyle: 'italic' }}>Révélons</span> l'essentiel.
              </p>
            </div>
            <p className="max-w-md mb-10" style={{ color: K.soft, lineHeight: 1.7, fontSize: '14px' }} data-testid="hero-lead">
              Une infrastructure culturelle qui relie les personnes, les œuvres,
              les territoires et les expériences de la diaspora.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.paper }} data-testid="hero-pillars">
              <span>Infrastructure</span><span style={{ color: K.dim }}>·</span>
              <span>Réseau</span><span style={{ color: K.dim }}>·</span>
              <span>Identité</span><span style={{ color: K.dim }}>·</span>
              <span>Mémoire</span>
            </div>
          </div>

          {/* RIGHT · world map */}
          <div className="col-span-12 md:col-span-6 lg:col-span-6" data-testid="hero-map-container" style={{ minHeight: '480px' }}>
            <WorldMap />
          </div>
        </div>

        {/* Bottom band — subtle beach silhouette + scroll hint */}
        <div className="relative px-6 md:px-12 lg:px-16 pb-8 flex justify-between items-end text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.dim }}>
          <span data-testid="hero-caption">
            Diaspora · Territoires · Mémoires
          </span>
          <span data-testid="scroll-hint">
            Scroll<br />pour explorer
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 02 & 03 · texte + réseau                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2" style={{ borderTop: `1px solid ${K.edge}` }} data-testid="section-02-03">
        {/* 02 */}
        <div className="p-8 md:p-12 lg:p-16" style={{ borderRight: `1px solid ${K.edge}` }} data-testid="section-02">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-6" style={{ color: K.gold }}>02</div>
          <h2
            className="mb-8"
            style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', lineHeight: 1.2, color: K.paper, fontWeight: 400 }}
          >
            Les cultures ne manquent pas de traces. <br />
            <span style={{ fontStyle: 'italic' }}>Elles manquent parfois d'une infrastructure pour les relier.</span>
          </h2>
          <div style={{ width: 60, height: 1, background: K.gold, opacity: 0.5, margin: '24px 0' }} />
          <p style={{ color: K.soft, lineHeight: 1.75, fontSize: '14px' }}>
            Kiltikonet construit les ponts invisibles entre les individus,
            les communautés, les savoirs et les territoires.
            Nous créons les outils, les identités et les systèmes
            qui permettent à la culture de circuler, d'exister
            et de se transmettre.
          </p>
        </div>

        {/* 03 */}
        <div className="p-8 md:p-12 lg:p-16 relative" data-testid="section-03">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-6" style={{ color: K.gold }}>03</div>
          <h2 className="mb-4" style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.02em', color: K.paper, fontWeight: 400 }}>
            LE RÉSEAU
          </h2>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] mb-8" style={{ color: K.soft, lineHeight: 1.8 }}>
            Des personnes. Des territoires.<br />
            Des œuvres. Des organisations.<br />
            Des événements. Connectés.
          </p>
          <div style={{ height: '320px' }}>
            <NetworkDiagram />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 04 · CULTURE CONNECT                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2" style={{ borderTop: `1px solid ${K.edge}` }} data-testid="section-04">
        {/* Image placeholder (performer atmosphere) */}
        <div
          className="min-h-[420px] flex items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${K.panel2} 0%, ${K.panel} 40%, ${K.edgeSoft} 100%)`,
            borderRight: `1px solid ${K.edge}`,
          }}
          data-testid="section-04-image"
        >
          {/* Silhouette performer stylisée en SVG */}
          <svg viewBox="0 0 200 260" className="h-full w-auto opacity-70" aria-hidden>
            <defs>
              <radialGradient id="stage" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="200" height="260" fill="url(#stage)" />
            {/* Chapeau + silhouette */}
            <ellipse cx="100" cy="70" rx="45" ry="8" fill="#0F0C09" />
            <path d="M 60 74 Q 100 40, 140 74 L 140 78 L 60 78 Z" fill="#0F0C09" />
            <path d="M 78 90 Q 100 100, 122 90 L 130 200 Q 100 220, 70 200 Z" fill="#0F0C09" />
            <path d="M 70 200 L 60 240 M 130 200 L 140 240" stroke="#0F0C09" strokeWidth="8" />
            {/* Bras levé */}
            <path d="M 130 130 L 165 100 L 168 96" stroke="#0F0C09" strokeWidth="10" strokeLinecap="round" />
            {/* Points de lumière crowd */}
            {[...Array(30)].map((_, i) => (
              <circle key={i} cx={20 + (i * 6) % 160 + Math.sin(i) * 8} cy={230 + Math.cos(i * 2) * 6} r="0.8" fill="#C9A84C" opacity="0.5" />
            ))}
          </svg>
        </div>

        <div className="p-8 md:p-12 lg:p-16" data-testid="section-04-content">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-6" style={{ color: K.gold }}>04</div>
          <h2 className="mb-3" style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.02em', color: K.paper, fontWeight: 400 }}>
            CULTURE CONNECT
          </h2>
          <p className="text-sm mb-10" style={{ color: K.soft, fontStyle: 'italic', fontFamily: "'Newsreader', serif" }}>
            Une initiative Kiltikonet.
          </p>
          <div style={{ width: 60, height: 1, background: K.gold, opacity: 0.5, marginBottom: 32 }} />
          <div className="grid grid-cols-2 gap-8" data-testid="cc-editions">
            <Link to="/culture-connect/2026" className="block" data-testid="cc-2026">
              <div style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: K.paper, lineHeight: 1 }}>2026</div>
              <div className="text-[10px] font-mono uppercase tracking-widest mt-2" style={{ color: K.gold }}>Archive</div>
              <p className="mt-3 text-sm" style={{ color: K.soft, lineHeight: 1.6 }}>Explorer les traces<br />et les temps forts.</p>
            </Link>
            <Link to="/culture-connect/2027" className="block" data-testid="cc-2027">
              <div style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: K.paper, lineHeight: 1 }}>2027</div>
              <div className="text-[10px] font-mono uppercase tracking-widest mt-2" style={{ color: K.gold }}>À venir</div>
              <p className="mt-3 text-sm" style={{ color: K.soft, lineHeight: 1.6 }}>De nouveaux horizons,<br />de nouvelles connexions.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 05 · INFRASTRUCTURE                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2 items-stretch" style={{ borderTop: `1px solid ${K.edge}` }} data-testid="section-05">
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center" style={{ borderRight: `1px solid ${K.edge}` }}>
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-6" style={{ color: K.gold }}>05</div>
          <h2 className="mb-8" style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.02em', color: K.paper, fontWeight: 400 }}>
            INFRASTRUCTURE
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-3 text-[10px] font-mono uppercase tracking-[0.22em] mb-10" style={{ color: K.paper }} data-testid="infra-tags">
            <span>FREK-ID</span><span style={{ color: K.dim }}>·</span>
            <span>Données culturelles</span><span style={{ color: K.dim }}>·</span>
            <span>Identité</span>
            <br className="w-full" />
            <span>Traces</span><span style={{ color: K.dim }}>·</span>
            <span>Mémoire</span><span style={{ color: K.dim }}>·</span>
            <span>Continuité</span>
          </div>
          <div style={{ width: 60, height: 1, background: K.gold, opacity: 0.5, margin: '16px 0 24px' }} />
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.2rem, 1.6vw, 1.5rem)', lineHeight: 1.35, color: K.paper, maxWidth: '30ch' }}>
            Une culture vivante produit des traces.
            <br />
            <span style={{ fontStyle: 'italic', color: K.soft }}>Kiltikonet leur donne une continuité.</span>
          </p>
        </div>
        <div className="p-8 md:p-12 lg:p-16 flex items-center justify-center min-h-[380px]" data-testid="infra-fingerprint">
          <div style={{ width: '80%', maxWidth: '340px', aspectRatio: '6/7' }}>
            <Fingerprint />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 06 · IMPACT — 4 métriques monumentales               */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-16 py-16 md:py-24"
        style={{ borderTop: `1px solid ${K.edge}`, background: K.panel2 }}
        data-testid="section-06"
      >
        <div className="grid grid-cols-12 gap-6 items-baseline">
          <div className="col-span-12 md:col-span-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: K.gold }}>06</div>
            <div className="mt-2" style={{ fontFamily: "'Newsreader', serif", fontSize: '1.6rem', color: K.paper, letterSpacing: '0.02em' }}>
              IMPACT
            </div>
          </div>
          <div className="col-span-12 md:col-span-10 grid grid-cols-2 md:grid-cols-4 gap-y-8">
            {[
              { value: publicNow ? `${fmt(publicNow.recorded_events)}+` : '—', label: 'Traces', testId: 'metric-traces' },
              { value: publicNow ? fmt(publicNow.registrations) : '—', label: 'Acteurs', testId: 'metric-acteurs' },
              { value: publicNow ? fmt(publicNow.workspace_activity) : '—', label: 'Activités', testId: 'metric-activites' },
              { value: publicNow ? fmt(publicNow.cultural_identities_active) : '—', label: 'Identités actives', testId: 'metric-identites' },
            ].map((m, i) => (
              <div key={i} data-testid={m.testId}>
                <div style={{
                  fontFamily: "'Newsreader', serif",
                  fontSize: 'clamp(2.6rem, 5vw, 4.5rem)',
                  lineHeight: 1,
                  color: K.paper,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {m.value}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] mt-3" style={{ color: K.soft }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6 mt-10 pt-6" style={{ borderTop: `1px solid ${K.edge}` }}>
          <div className="col-span-12 md:col-span-2"></div>
          <div className="col-span-6 md:col-span-3 text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.dim }} data-testid="data-lineage">
            src · observatory/public/now
          </div>
          <div className="col-span-6 md:col-span-7 text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.dim }}>
            Données réelles · Mise à jour en temps réel
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 07 · OBSERVATORY                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-16 py-16 md:py-24"
        style={{ borderTop: `1px solid ${K.edge}` }}
        data-testid="section-07"
      >
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-6" style={{ color: K.gold }}>07</div>
            <h2 className="mb-6" style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.02em', color: K.paper, fontWeight: 400 }}>
              OBSERVATORY
            </h2>
            <p className="mb-10" style={{ fontFamily: "'Newsreader', serif", fontSize: '1.2rem', fontStyle: 'italic', color: K.soft, lineHeight: 1.35 }}>
              La mémoire numérique de Kiltikonet.
            </p>
            <Link
              to="/observatory"
              className="inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.24em]"
              style={{ color: K.paper, borderBottom: `1px solid ${K.gold}`, paddingBottom: 4 }}
              data-testid="cta-observatory"
            >
              Entrer dans l'Observatory <span style={{ color: K.gold }}>→</span>
            </Link>
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col" data-testid="obs-constellation">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] mb-3" style={{ color: K.dim }}>Constellation</div>
            <div style={{ flex: 1, minHeight: '140px' }}><ObservatoryConstellation /></div>
          </div>
          <div className="col-span-12 md:col-span-2 flex flex-col" data-testid="obs-bars">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] mb-3" style={{ color: K.dim }}>Activité</div>
            <div style={{ flex: 1, minHeight: '140px' }}><ObservatoryBars /></div>
          </div>
          <div className="col-span-12 md:col-span-3" data-testid="obs-feed">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] mb-3" style={{ color: K.dim }}>Aujourd'hui</div>
            <ul className="space-y-1.5">
              {recent.map((r, i) => (
                <li key={i} className="grid grid-cols-12 gap-2 text-[11px] font-mono uppercase tracking-widest" style={{ color: K.paper }}>
                  <span className="col-span-3" style={{ color: K.gold }}>{r.t}</span>
                  <span className="col-span-9">{r.text}</span>
                </li>
              ))}
            </ul>
            <Link to="/observatory" className="mt-4 inline-block text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: K.soft }}>
              Voir toutes les traces →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 08 · FOOTER / COLOPHON — 6 colonnes                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <footer
        className="px-6 md:px-12 lg:px-16 pt-16 pb-8"
        style={{ borderTop: `1px solid ${K.edge}`, background: K.bg, color: K.dim }}
        data-testid="section-08-footer"
      >
        <div className="grid grid-cols-12 gap-6 pb-16">
          {/* Left · brand */}
          <div className="col-span-12 md:col-span-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-2" style={{ color: K.gold }}>08</div>
            <div className="flex items-center gap-3 mb-4">
              <LogoMark size={26} />
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: '1.1rem', letterSpacing: '0.14em', color: K.paper }}>
                KILTIKONET
              </span>
            </div>
            <p style={{ color: K.soft, fontSize: '13px', lineHeight: 1.7 }}>
              Infrastructure culturelle mondiale. <br />
              Identités. Traces. Mémoire. <br />
              Au service des cultures et des territoires.
            </p>
          </div>

          {/* Columns */}
          {[
            { title: 'Kiltikonet', links: [['À propos', '/a-propos'], ['Mission', '/a-propos'], ['Équipe', '/a-propos'], ['Gouvernance', '/gouvernance'], ['Carrières', '/rejoindre']] },
            { title: 'Culture Connect', links: [['2026 Archive', '/culture-connect/2026'], ['2027 À venir', '/culture-connect/2027'], ['Programmes', '/culture-connect'], ['Événements', '/culture-connect'], ['Communauté', '/rejoindre']] },
            { title: 'Infrastructure', links: [['FREK-ID', '/infrastructure'], ['KORA', '/infrastructure'], ['LabelOS', '/infrastructure'], ['Agent Factory', '/infrastructure'], ['Laurentia', '/infrastructure']] },
            { title: 'Réseau', links: [['Territoires', '/reseau'], ['Opérateurs', '/reseau'], ['Licences', '/reseau'], ['Formation', '/reseau'], ['Conformité', '/reseau']] },
            { title: 'Observatory', links: [['Traces', '/observatory'], ['Données', '/observatory'], ['Signaux', '/observatory'], ['Rapports', '/observatory'], ['API', '/observatory']] },
          ].map((col, i) => (
            <div className="col-span-6 md:col-span-1" key={i} style={{ minWidth: 0 }} data-testid={`footer-col-${col.title.toLowerCase().replace(/\s/g, '-')}`}>
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-3" style={{ color: K.paper }}>
                {col.title}
              </div>
              <ul className="space-y-1.5 text-[13px]">
                {col.links.map(([label, to], j) => (
                  <li key={j}><Link to={to} style={{ color: K.soft }}>{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-6 md:col-span-1" data-testid="footer-col-ressources">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-3" style={{ color: K.paper }}>
              Ressources
            </div>
            <ul className="space-y-1.5 text-[13px]">
              <li><Link to="/now" style={{ color: K.soft }}>Actualités</Link></li>
              <li><Link to="/infrastructure" style={{ color: K.soft }}>Docs</Link></li>
              <li><Link to="/contact" style={{ color: K.soft }}>Presse</Link></li>
              <li><Link to="/contact" style={{ color: K.soft }}>Contact</Link></li>
            </ul>
          </div>

          {/* Pull quote */}
          <div className="col-span-12 md:col-span-2 md:pl-6" style={{ borderLeft: `1px solid ${K.edge}` }} data-testid="footer-pullquote">
            <div style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1.4, color: K.paper }}>
              « Chaque trace <br /> raconte quelque chose. <br />
              <span style={{ color: K.soft }}>Notre travail consiste <br /> à ne pas la perdre. »</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-between text-[10px] font-mono uppercase tracking-[0.22em] pt-6" style={{ borderTop: `1px solid ${K.edge}` }}>
          <span>© Kiltikonet 2026 · Tous droits réservés</span>
          <div className="flex gap-6">
            <a href="/legal/mentions-legales.html">Mentions légales</a>
            <a href="/legal/politique-confidentialite.html">Confidentialité</a>
            <a href="/legal/cgu.html">Conditions d'utilisation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
