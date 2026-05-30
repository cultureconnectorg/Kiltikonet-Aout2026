// ═══════════════════════════════════════════════════════════
// STUDIOS SIDEBAR — 4 Studios avec slide animation depuis la gauche
// Design System: Sovereign Onyx · Material Symbols Only
// Studios: Reseau, Feed/Reel, Shop, Preview+Terminal
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';

const G = '#E8D5A0';

const STUDIOS = [
  {
    id: 'reseau',
    icon: 'dynamic_feed',
    label: 'Reseau Studio',
    desc: 'Creez et planifiez vos publications professionnelles',
    color: '#5B9BD5',
    tools: [
      { icon: 'edit_note', label: 'Nouvel article', desc: 'Redigez un post long format' },
      { icon: 'image', label: 'Media enrichi', desc: 'Ajoutez images et carrousels' },
      { icon: 'schedule', label: 'Planifier', desc: 'Programmez vos publications' },
      { icon: 'psychology', label: 'Laurent.ia Assist', desc: 'Generation IA de contenu' },
    ],
  },
  {
    id: 'reel',
    icon: 'play_circle',
    label: 'Feed & Reel Studio',
    desc: 'Montez vos vidéos courtes et capsules culturelles',
    color: '#C4714A',
    tools: [
      { icon: 'movie_creation', label: 'Nouveau Reel', desc: 'Créez une capsule vidéo' },
      { icon: 'auto_fix_high', label: 'Filtres culturels', desc: 'Appliquez un filtre afro-caribéen' },
      { icon: 'music_note', label: 'Piste audio', desc: 'Ajoutez un morceau Gwoka/Zouk' },
      { icon: 'subtitles', label: 'Sous-titres IA', desc: 'Transcription automatique créole' },
    ],
  },
  {
    id: 'shop',
    icon: 'storefront',
    label: 'Shop Studio',
    desc: 'Gérez votre boutique et inventaire Sovereign',
    color: '#2DD4BF',
    tools: [
      { icon: 'add_shopping_cart', label: 'Ajouter un produit', desc: 'Nouveau produit ou service' },
      { icon: 'inventory_2', label: 'Inventaire', desc: 'Gérez les stocks et variantes' },
      { icon: 'local_offer', label: 'Promotions', desc: 'Coupons et offres spéciales' },
      { icon: 'analytics', label: 'Ventes', desc: 'Statistiques et revenus' },
    ],
  },
  {
    id: 'terminal',
    icon: 'terminal',
    label: 'Preview & Terminal',
    desc: 'Testez vos APIs et déployez depuis le terminal',
    color: '#8B5CF6',
    tools: [
      { icon: 'code', label: 'Console IA', desc: 'Exécutez du code en temps réel' },
      { icon: 'api', label: 'API Explorer', desc: 'Testez les endpoints CC2026' },
      { icon: 'deployed_code', label: 'Déployer', desc: 'Lancez un microservice' },
      { icon: 'bug_report', label: 'Debug', desc: 'Diagnostiquez les problèmes' },
    ],
  },
];

const StudiosSidebar = ({ isOpen, onClose, onSelectStudio }) => {
  const [activeStudio, setActiveStudio] = useState(null);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setEntered(true));
    } else {
      setEntered(false);
      const t = setTimeout(() => setActiveStudio(null), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen && !entered) return null;

  const handleStudioClick = (studio) => {
    if (activeStudio === studio.id) {
      setActiveStudio(null);
    } else {
      setActiveStudio(studio.id);
    }
  };

  const handleToolClick = (studio, tool) => {
    onSelectStudio?.(studio.id, tool.label);
    onClose();
  };

  const active = STUDIOS.find(s => s.id === activeStudio);

  return (
    <div className="fixed inset-0 z-[65]" data-testid="studios-sidebar">
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', opacity: entered ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Panel - slides from left */}
      <div
        ref={panelRef}
        className="absolute left-0 top-0 bottom-0 flex transition-transform duration-300"
        style={{
          transform: entered ? 'translateX(0)' : 'translateX(-100%)',
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        {/* Main sidebar - studio list */}
        <div
          className="w-72 sm:w-80 h-full flex flex-col overflow-hidden"
          style={{
            background: '#0e0e0f',
            borderRight: '1px solid rgba(75,70,59,0.15)',
            boxShadow: '10px 0 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>
                Outils de Création
              </span>
              <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 24, fontWeight: 300, color: '#e5e2e3', marginTop: 4 }}>
                Studios
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              data-testid="studios-close-btn"
              aria-label="Fermer les studios"
            >
              <span className="material-symbols-outlined" style={{ color: '#72727a', fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Studios list */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5">
            {STUDIOS.map((studio, idx) => {
              const isActive = activeStudio === studio.id;
              return (
                <React.Fragment key={studio.id}>
                <button
                  onClick={() => handleStudioClick(studio)}
                  className="w-full text-left rounded-xl p-4 transition-all group"
                  style={{
                    background: isActive ? 'rgba(232,213,160,0.06)' : 'transparent',
                    border: isActive ? '1px solid rgba(232,213,160,0.12)' : '1px solid transparent',
                    animationDelay: `${idx * 60}ms`,
                  }}
                  data-testid={`studio-${studio.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        background: `${studio.color}15`,
                        border: `1px solid ${studio.color}25`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 20,
                          color: studio.color,
                          fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300",
                        }}
                      >
                        {studio.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: isActive ? '#e5e2e3' : '#a0a0a5' }}>
                        {studio.label}
                      </p>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a', marginTop: 1 }}>
                        {studio.desc}
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined transition-transform"
                      style={{
                        fontSize: 16,
                        color: isActive ? G : '#555',
                        transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      chevron_right
                    </span>
                  </div>
                </button>
                {isActive && (
                  <div className="mx-4 mb-2 pt-2 space-y-1" style={{ borderTop: '1px solid rgba(75,70,59,0.1)' }}>
                    {studio.tools.map((tool, tIdx) => (
                      <button
                        key={tool.label}
                        onClick={() => handleToolClick(studio, tool)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.03] transition-all"
                        style={{ animation: `fadeSlideIn 0.3s cubic-bezier(0.2,0,0,1) both`, animationDelay: `${tIdx * 50}ms` }}
                        data-testid={`studio-tool-${studio.id}-${tIdx}`}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 18, color: studio.color, opacity: 0.8 }}
                        >
                          {tool.icon}
                        </span>
                        <div>
                          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>{tool.label}</p>
                          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>{tool.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(75,70,59,0.1)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4A5D4E' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>
                Tous les studios disponibles
              </span>
            </div>
          </div>
        </div>

        {/* Extended panel - shows studio details when expanded */}
        {active && (
          <div
            className="w-64 sm:w-72 h-full overflow-y-auto"
            style={{
              background: '#131314',
              borderRight: '1px solid rgba(75,70,59,0.1)',
              animation: 'studioSlideIn 0.25s cubic-bezier(0.25,0.1,0.25,1) both',
            }}
          >
            <div className="p-6 space-y-6">
              {/* Studio header */}
              <div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: `${active.color}12`, border: `1px solid ${active.color}20` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: active.color, fontVariationSettings: "'FILL' 1" }}>{active.icon}</span>
                </div>
                <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 20, color: '#e5e2e3' }}>{active.label}</h3>
                <p className="mt-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#72727a', lineHeight: 1.6 }}>{active.desc}</p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg" style={{ background: '#1c1b1c' }}>
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 20, color: active.color }}>
                    {active.id === 'reseau' ? '12' : active.id === 'reel' ? '8' : active.id === 'shop' ? '24' : '3'}
                  </span>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a', marginTop: 2 }}>
                    {active.id === 'reseau' ? 'Brouillons' : active.id === 'reel' ? 'En montage' : active.id === 'shop' ? 'Produits' : 'APIs actives'}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#1c1b1c' }}>
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 20, color: '#e5e2e3' }}>
                    {active.id === 'reseau' ? '2.4K' : active.id === 'reel' ? '5.1K' : active.id === 'shop' ? '89' : '99.8%'}
                  </span>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a', marginTop: 2 }}>
                    {active.id === 'reseau' ? 'Impressions' : active.id === 'reel' ? 'Vues totales' : active.id === 'shop' ? 'Commandes' : 'Uptime'}
                  </p>
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <h4 className="mb-3" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>
                  Activité récente
                </h4>
                <div className="space-y-2">
                  {[
                    { time: '2h', text: active.id === 'reseau' ? 'Post "Collaboration CC2026" publie' : active.id === 'reel' ? 'Reel "Gwoka moderne" monte' : active.id === 'shop' ? 'Nouveau pack KT ajoute' : 'API /feed deployee' },
                    { time: '5h', text: active.id === 'reseau' ? '3 commentaires recus' : active.id === 'reel' ? '12 likes sur capsule Madras' : active.id === 'shop' ? '5 commandes traitees' : 'Test unitaire valide' },
                    { time: '1j', text: active.id === 'reseau' ? 'Article en brouillon sauve' : active.id === 'reel' ? 'Filtre caribeen applique' : active.id === 'shop' ? 'Promotion -20% creee' : 'Debug endpoint /wallet' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 px-3 rounded-lg" style={{ background: '#1c1b1c' }}>
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, color: active.color, flexShrink: 0, marginTop: 2 }}>{item.time}</span>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#a0a0a5', lineHeight: 1.4 }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes studioSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default StudiosSidebar;
