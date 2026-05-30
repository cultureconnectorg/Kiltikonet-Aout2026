// ═══════════════════════════════════════════════════════════════
// ESPACE PRO CC2026 — Sovereign Onyx · Niveau Meta/Revolut/Claude.ai
// MOBILE-FIRST · PREMIUM UX · Fond OLED #0a0a0b · Or Blanc #E8D5A0 · Manrope/Newsreader
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import ProOnboarding from './ProOnboarding';
import CvlBrainFloat from './CvlBrainFloat';
import MobileNavigation from './pro/MobileNavigation';
import LinkedInFeed from './pro/LinkedInFeed';
import ReelsFeed from './pro/ReelsFeed';
import WalletPage from './pro/WalletPage';
import ShopPageEnhanced from './pro/ShopPageEnhanced';
import StudiosSidebar from './pro/StudiosSidebar';
import ImmersiveInbox from './pro/ImmersiveInbox';
import ProfileTriptych from './pro/ProfileTriptych';
import VitrinePage from './pro/VitrinePage';
import TerminalIA from './pro/TerminalIA';
import TradingSettings from './pro/TradingSettings';
import ArchivesCloud from './pro/ArchivesCloud';
import { GovernanceSection, ConsoleSection, SettingsSovereign, MessagesSection } from './pro/SovereignSections';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Design Tokens — Sovereign Onyx ─────────────────────
const C = {
  bg: '#0a0a0b', surface: '#131314', surfaceLow: '#1b1b1c', surfaceHigh: '#2a2a2b',
  card: '#1b1b1c', border: 'transparent', borderSubtle: 'rgba(75,70,59,0.15)',
  text: '#e5e2e3', muted: '#72727a', dim: '#555555', gold: '#E8D5A0',
  goldDim: '#d8c591', goldContainer: '#c8a84b', goldGlow: 'rgba(232,213,160,0.12)',
  accent: '#C4714A', forest: '#4A5D4E', blue: '#5B9BD5', red: '#ffb4ab',
  purple: '#8B5CF6', turquoise: '#2DD4BF', input: '#201f20',
  onPrimary: '#3a2f09', outline: '#979083', outlineVariant: 'rgba(75,70,59,0.15)',
};

const TYPE_COLORS = {
  artist: C.accent, label: C.gold, booking_agency: C.turquoise,
  institution: C.forest, press: C.blue, other: C.purple,
};
const AVATAR_GRADS = {
  artist: `linear-gradient(135deg, #C4714A, #D4A84B)`,
  label: `linear-gradient(135deg, #D4A84B, #E8C547)`,
  booking_agency: `linear-gradient(135deg, #2DD4BF, #5B9BD5)`,
  institution: `linear-gradient(135deg, #4A5D4E, #6B9080)`,
  press: `linear-gradient(135deg, #5B9BD5, #7EC8E3)`,
  other: `linear-gradient(135deg, #8B5CF6, #C4714A)`,
};
const PROFILE_LABELS = {
  artist: 'Artiste', label: 'Label / Producteur', booking_agency: 'Agence Booking',
  institution: 'Institution', press: 'Presse / Média', other: 'Professionnel',
};

// ─── Countdown to CC2026 ───────────────────────────────
const CC2026_DATE = new Date('2026-05-20T09:00:00');
const getDaysUntil = () => Math.max(0, Math.ceil((CC2026_DATE - Date.now()) / 86400000));

// ─── Brain Inline Chat (Full Page) ─────────────────────
const BRAIN_SUGGESTIONS = [
  { label: 'Kiltikonet', icon: 'info', q: "C'est quoi kiltikonet ?" },
  { label: 'Jeton CC', icon: 'toll', q: 'Comment fonctionne le Jeton CC ?' },
  { label: 'CC2026', icon: 'festival', q: 'Parle-moi de Culture Connect 2026' },
  { label: 'Mon Identité', icon: 'fingerprint', q: 'À quoi sert mon identité culturelle ?' },
  { label: 'Espace Pro', icon: 'dashboard', q: "Quelles sont les fonctionnalités de l'Espace Pro ?" },
  { label: 'Culture', icon: 'music_note', q: 'Parle-moi de la culture caribéenne' },
];

const BrainInlineChat = ({ session }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = async (overrideMsg) => {
    const msgToSend = typeof overrideMsg === 'string' ? overrideMsg : null;
    const userMsg = (msgToSend || input).trim();
    if (!userMsg || loading) return;
    if (!msgToSend) setInput('');
    const newMsgs = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const userContext = session ? {
        name: session.name || session.email, email: session.email,
        frek_id: session.frek_id, profile_type: session.type,
      } : null;
      const historyMsgs = newMsgs.filter(m => m.role === 'user' || m.role === 'assistant').slice(-20);
      const res = await axios.post(`${API}/brain/chat-enriched`, {
        message: userMsg, messages: historyMsgs,
        user_name: session?.name || 'un utilisateur', user_context: userContext,
        use_web_search: userMsg.includes('?') || userMsg.toLowerCase().includes('quoi'),
      });
      const reply = res.data.response || "Man pa ka konprann. Éséyé ankò.";
      setMessages([...newMsgs, { role: 'assistant', content: reply, webEnriched: res.data.web_enriched }]);
    } catch {
      setMessages([...newMsgs, { role: 'assistant', content: "Désolé, man ni an ti pwoblèm. Éséyé ankò." }]);
    } finally { setLoading(false); }
  };

  const showSphere = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }} data-testid="brain-inline-chat">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 64 }}>
        <div style={{ width: '60%', height: '40%', background: 'radial-gradient(circle, rgba(232,213,160,0.05) 0%, transparent 60%)', filter: 'blur(80px)' }} />
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ paddingBottom: 8 }}>
        {showSphere ? (
          /* Welcome State — Golden Sphere + Suggestions */
          <div className="flex flex-col items-center justify-center h-full px-6">
            {/* Sphere */}
            <div className="relative flex items-center justify-center mb-8" data-testid="brain-golden-sphere">
              <div className="absolute w-44 h-44 rounded-full animate-pulse" style={{ border: '1px solid rgba(232,213,160,0.06)', animationDuration: '4s' }} />
              <div className="absolute w-56 h-56 rounded-full animate-pulse" style={{ border: '1px solid rgba(232,213,160,0.03)', animationDuration: '5s', animationDelay: '0.5s' }} />
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" style={{
                background: 'radial-gradient(circle at 35% 35%, #F5E6BE 0%, #C8A84B 50%, #745B00 100%)',
                boxShadow: '0 0 50px 8px rgba(232,213,160,0.35), 0 0 100px 25px rgba(200,168,75,0.12), inset 0 -6px 12px rgba(0,0,0,0.3)',
              }}>
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'rgba(58,47,9,0.5)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>psychology</span>
                </div>
              </div>
            </div>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#d8c591' }}>Intelligence Culturelle</span>
            <h1 className="mt-2" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 300, letterSpacing: '-0.03em', color: '#e5e2e3', lineHeight: 1 }}>
              CVL <span style={{ color: '#E8D5A0' }}>BRAIN</span>
            </h1>
            <p className="max-w-sm mx-auto mt-3 text-center" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#72727a', lineHeight: 1.7 }}>
              Posez vos questions. Man la pou ou.
            </p>
            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-lg" data-testid="brain-page-suggestions">
              {BRAIN_SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.q)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-full transition-all hover:scale-[1.03] active:scale-95"
                  data-testid={`brain-page-qa-${i}`}
                  style={{ background: 'rgba(232,213,160,0.06)', color: '#cdc6b7', border: '1px solid rgba(232,213,160,0.1)', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.gold, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2.5 mt-1" style={{ background: 'linear-gradient(135deg, #E8D5A0, #c8a84b)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#3a2f09', fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl`} style={{
                  fontFamily: msg.role === 'assistant' ? "'Newsreader', serif" : "'Manrope', sans-serif",
                  fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? '#201f20' : 'rgba(232,213,160,0.04)',
                  color: msg.role === 'user' ? '#e5e2e3' : '#cdc6b7',
                  border: msg.role === 'assistant' ? '1px solid rgba(232,213,160,0.06)' : 'none',
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: msg.role === 'user' ? 16 : 4,
                }}>
                  {msg.content}
                  {msg.webEnriched && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(91,155,213,0.1)', fontSize: 9, color: '#5B9BD5', verticalAlign: 'middle' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 9 }}>language</span>Web
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8D5A0, #c8a84b)' }}>
                  <span className="material-symbols-outlined animate-pulse" style={{ fontSize: 14, color: '#3a2f09', fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(232,213,160,0.04)', border: '1px solid rgba(232,213,160,0.06)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Command Bar — Bottom */}
      <div className="px-4 pb-4 pt-2 max-w-2xl mx-auto w-full relative z-10">
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(32px)', border: '1px solid rgba(75,70,59,0.1)', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)' }}>
          <div className="relative flex items-center">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Posez votre question..." autoComplete="off"
              className="w-full bg-transparent border-none py-4 pl-5 pr-14 text-sm font-medium"
              data-testid="brain-page-input"
              style={{ color: '#e5e2e3', outline: 'none', fontFamily: "'Manrope', sans-serif" }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="absolute right-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90"
              data-testid="brain-page-send"
              style={{ background: input.trim() ? '#E8D5A0' : 'rgba(232,213,160,0.15)', opacity: loading ? 0.5 : 1 }}>
              <span className="material-symbols-outlined" style={{ color: input.trim() ? '#3a2f09' : '#72727a', fontSize: 20 }}>
                {loading ? 'hourglass_top' : 'arrow_upward'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1 px-3 pb-2">
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>BRAIN v2.4</span>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="ml-auto text-[10px] px-2 py-0.5 rounded hover:bg-white/5 transition-colors" style={{ color: '#555' }}>
                Nouveau chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── Session Hook ──────────────────────────────────────
const useProSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // ❌ NE PAS restaurer la session si on est en plein flow OAuth (session_id dans le hash)
    // Bug critique sinon : on connecte l'ancien user pendant que le callback OAuth s'exécute
    const isOAuthCallback = typeof window !== 'undefined' && (
      window.location.hash?.includes('session_id=') ||
      window.location.hash?.includes('github_auth=success') ||
      window.location.search?.includes('switch_account=1')
    );
    if (isOAuthCallback) {
      sessionStorage.removeItem('cc2026_pro_session');
      setLoading(false);
      return;
    }
    // Check sessionStorage first
    const stored = sessionStorage.getItem('cc2026_pro_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.createdAt && (Date.now() - parsed.createdAt) < 7 * 24 * 60 * 60 * 1000) { setSession(parsed); setLoading(false); return; }
        else sessionStorage.removeItem('cc2026_pro_session');
      } catch { sessionStorage.removeItem('cc2026_pro_session'); }
    }
    // Fallback: verify via httpOnly cookie
    const checkCookie = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.session?.role === 'pro') {
            const proSession = { ...data.session, createdAt: Date.now() };
            sessionStorage.setItem('cc2026_pro_session', JSON.stringify(proSession));
            setSession(proSession);
          }
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    checkCookie();
  }, []);
  const logout = async () => {
    sessionStorage.removeItem('cc2026_pro_session');
    localStorage.removeItem('kk_last_login_email');
    setSession(null);
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { /* silent */ }
  };
  return { session, loading, logout, isAuthenticated: !!session };
};

// ─── Avatar — Dégradé radial + anneau or au hover ────
const Avatar = ({ src, name, type, size = 44, className = '', style = {}, ring = false }) => {
  const hasPhoto = src && !src.includes('ui-avatars.com');
  const ringStyle = ring ? { border: '2px solid #E8D5A0', boxShadow: '0 0 0 1px rgba(232,213,160,0.2)' } : {};
  if (hasPhoto) {
    return (
      <div className={`rounded-full flex-shrink-0 kn-avatar-ring ${className}`} style={{ width: size, height: size, ...ringStyle, ...style }}>
        <img src={src} alt={name || ''} className="rounded-full object-cover w-full h-full" style={{ width: size, height: size }} />
      </div>
    );
  }
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const fs = size < 36 ? 10 : size < 48 ? 12 : size < 64 ? 15 : 18;
  return (
    <div className={`rounded-full flex items-center justify-center flex-shrink-0 kn-avatar-ring ${className}`}
      style={{ width: size, height: size, background: 'radial-gradient(circle at 30% 30%, #2a2a2a, #1e1e1e)', ...ringStyle, ...style }} aria-hidden="true">
      <span style={{ fontSize: fs, fontWeight: 700, color: '#888', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>{initials}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
const ProSpaceDashboard = () => {
  const navigate = useNavigate();
  const { session, loading, logout, isAuthenticated } = useProSession();
  const [activeSection, setActiveSection] = useState('feed');
  const [profile, setProfile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [jetonsBalance, setJetonsBalance] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const [culturalIdentity, setCulturalIdentity] = useState(null);
  const [studiosOpen, setStudiosOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [doctrine, setDoctrine] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  // Helper: check if connected user has a doctrine permission
  const hasPerm = (action) => {
    if (!doctrine) return false; // loading — masquer jusqu'à confirmation des droits
    if (doctrine.is_admin) return true;
    return (doctrine.can || []).includes(action);
  };

  const reloadDoctrine = () => {
    axios.get(`${API}/doctrine/my-permissions`, { withCredentials: true })
      .then(r => setDoctrine(r.data))
      .catch(() => {});
  };

  // Stay on /pro — login handled inline below
  useEffect(() => {}, [loading, isAuthenticated]);
  useEffect(() => { if (session?.id) loadAll(); }, [session?.id]);

  useEffect(() => {
    if (session?.id) {
      const done = sessionStorage.getItem(`cc2026_onboarding_${session.id}`);
      if (!done) {
        axios.get(`${API}/pro/profile/${session.id}`).then(r => {
          if (r.data && !r.data.onboarding_completed) setShowOnboarding(true);
        }).catch(() => setShowOnboarding(true));
      }
    }
  }, [session?.id]);

  useEffect(() => {
    if (session?.id) axios.get(`${API}/wallet/${session.id}`).then(r => setJetonsBalance(r.data.balance || 0)).catch(() => {});
  }, [session?.id]);

  useEffect(() => {
    if (session?.id) axios.get(`${API}/cultural-identity/${session.id}`).then(r => setCulturalIdentity(r.data)).catch(() => {});
  }, [session?.id]);

  // Ghost seed disabled in production

  const loadAll = async () => {
    try {
      const [p, co, m, o, e] = await Promise.all([
        axios.get(`${API}/pro/profile/${session.id}`).catch(() => ({ data: null })),
        axios.get(`${API}/pro/connections/${session.id}`).catch(() => ({ data: { connections: [] } })),
        axios.get(`${API}/pro/messages/${session.id}`).catch(() => ({ data: { messages: [] } })),
        axios.get(`${API}/pro/opportunities`).catch(() => ({ data: { opportunities: [] } })),
        axios.get(`${API}/pro/events`).catch(() => ({ data: { events: [] } })),
      ]);
      setProfile(p.data); setConnections(co.data.connections || []); setMessages(m.data.messages || []);
      setOpportunities(o.data.opportunities || []); setEvents(e.data.events || []);
    } catch {}
    // Fetch doctrine permissions (single call, shared across header + profile)
    reloadDoctrine();
  };

  const handleLogout = () => { logout(); toast.success('Déconnexion'); };
  const handleOnboardingComplete = (result) => {
    setShowOnboarding(false);
    if (result) { setJetonsBalance(prev => prev + (result.jetons_awarded || 10)); toast.success(`${result.jetons_awarded || 10} Jetons CC offerts !`); }
    loadAll();
  };

  // Loading state
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.gold }} />
    </div>
  );

  // Not authenticated — show login inline (never navigate away from /pro)
  if (!session) return <ProSpaceLogin onLogin={() => window.location.reload()} />;

  const unreadCount = messages.filter(m => !m.read && m.to === session.id).length;
  const handleNavClick = (id) => {
    setActiveSection(id);
  };

  const navItems = [
    { id: 'feed', label: 'Feed', icon: 'dynamic_feed' },
    { id: 'reels', label: 'Reels', icon: 'play_circle' },
    { id: 'wallet', label: 'Wallet', icon: 'account_balance_wallet' },
    { id: 'shop', label: 'Shop', icon: 'local_mall' },
    { id: 'settings', label: 'Profil', icon: 'person' },
  ];

  const handleMobileNav = (id) => {
    setActiveSection(id);
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen sovereign-depth" style={{ background: C.bg, fontFamily: "'Manrope', sans-serif", color: C.text }} data-testid="pro-space-dashboard">
      {showOnboarding && <ProOnboarding session={session} onComplete={handleOnboardingComplete} />}

      {/* ─── HEADER SOVEREIGN — Stitch "TopAppBar" ─── */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(10,10,11,0.60)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          {/* Menu icon */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }} aria-label="Menu" data-testid="menu-toggle">
            <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 24 }}>menu</span>
          </button>

          {/* Studios button — slide left (only if publish_content) */}
          {hasPerm('publish_content') && (
            <button onClick={() => setStudiosOpen(true)} className="hidden md:flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }} aria-label="Studios" data-testid="studios-toggle">
              <span className="material-symbols-outlined" style={{ color: '#72727a', fontSize: 22 }}>dashboard_customize</span>
            </button>
          )}

          {/* Logo KILTIKONET — Sovereign Serif */}
          <button onClick={() => setActiveSection('feed')} className="flex-shrink-0 flex items-center gap-2" aria-label="Accueil Espace Pro" data-testid="logo-home">
            <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: '#E8D5A0', lineHeight: 1 }}>Kiltikonet</h1>
          </button>

          <div className="flex-1" />

          {/* CVL BRAIN Status — desktop */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(53,52,54,0.5)', border: '1px solid rgba(75,70,59,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E8D5A0' }}></span>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8D5A0' }}>CVL BRAIN ACTIF</span>
          </div>

          {/* Desktop Nav — Sovereign style */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navigation principale">
            {navItems.map(item => (
              <button key={item.id} onClick={() => handleNavClick(item.id)} data-testid={`nav-${item.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{
                  color: activeSection === item.id ? '#E8D5A0' : 'rgba(229,226,227,0.4)',
                  background: activeSection === item.id ? 'rgba(232,213,160,0.08)' : 'transparent',
                  minHeight: 44, fontFamily: "'Manrope', sans-serif",
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: activeSection === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Inbox icon */}
          <button onClick={() => setInboxOpen(true)} className="relative" style={{ minHeight: 44, minWidth: 44 }} data-testid="inbox-btn">
            <span className="material-symbols-outlined" style={{ color: '#72727a', fontSize: 22 }}>inbox</span>
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#ffb4ab', color: '#690005', fontSize: 9, fontWeight: 700 }}>{unreadCount}</span>}
          </button>

          {/* Jetons Badge — Sovereign Gold */}
          <button onClick={() => setActiveSection('wallet')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-[1.02]" data-testid="jetons-badge"
            style={{ background: 'rgba(232,213,160,0.08)', border: '1px solid rgba(232,213,160,0.15)', minHeight: 36 }}>
            <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 16, fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8D5A0' }}>{jetonsBalance}</span>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600, color: '#E8D5A0', opacity: 0.6 }}>KT</span>
          </button>

          {/* Profile Avatar — Gold ring + doctrine badge */}
          <button onClick={() => setActiveSection('profile')} data-testid="nav-profile"
            className="flex items-center gap-2 rounded-full" style={{ minHeight: 44 }} aria-label="Mon profil">
            <Avatar src={session.image} name={session.name} type={session.type} size={36} ring />
            {doctrine?.label_fr && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full" data-testid="navbar-doctrine-badge"
                style={{ background: 'rgba(232,213,160,0.1)', border: '1px solid rgba(232,213,160,0.15)', fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E8D5A0' }}>
                {doctrine.label_fr}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── MOBILE MENU SOVEREIGN ─── */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMobileMenu(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <nav className="absolute left-0 top-0 bottom-0 w-72 py-8 px-6 space-y-1 overflow-y-auto"
            style={{ background: '#131314', boxShadow: '10px 0 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="mb-6" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 22, color: '#E8D5A0' }}>Kiltikonet</h2>
            {[
              { id: 'vitrine', icon: 'home', label: 'Vitrine' },
              { id: 'feed', icon: 'dynamic_feed', label: 'Feed' },
              { id: 'reels', icon: 'play_circle', label: 'Reels / Shorts' },
              { id: 'open-inbox', icon: 'inbox', label: 'Boite de reception' },
              { id: 'brain', icon: 'psychology', label: 'CVL BRAIN' },
              { id: 'wallet', icon: 'account_balance_wallet', label: 'Wallet KT' },
              ...(hasPerm('publish_content') ? [{ id: 'open-studios', icon: 'dashboard_customize', label: 'Studios' }] : []),
              { id: 'shop', icon: 'storefront', label: 'Sovereign Shop' },
              { id: 'archives', icon: 'cloud', label: 'Archives / Cloud' },
              { id: 'profile', icon: 'person', label: 'Mon Profil' },
              { id: 'governance', icon: 'gavel', label: 'Gouvernance' },
              ...(hasPerm('use_terminal_ia') ? [{ id: 'console', icon: 'terminal', label: 'Console / Terminal' }] : []),
              { id: 'trading', icon: 'candlestick_chart', label: 'Trading KT' },
              { id: 'settings', icon: 'settings', label: 'Parametres' },
            ].map(item => (
              <button key={item.id} onClick={() => {
                if (item.id === 'open-inbox') { setInboxOpen(true); setMobileMenu(false); }
                else if (item.id === 'open-studios') { setStudiosOpen(true); setMobileMenu(false); }
                else { setActiveSection(item.id); setMobileMenu(false); }
              }}
                data-testid={`mobile-nav-${item.id}`}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{ background: activeSection === item.id ? 'rgba(232,213,160,0.08)' : 'transparent', color: activeSection === item.id ? '#E8D5A0' : '#72727a' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: activeSection === item.id ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}>{item.icon}</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600 }}>{item.label}</span>
              </button>
            ))}
            <div className="pt-6 space-y-1">
              <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-white/5" style={{ color: '#9ca3af' }} data-testid="back-to-site-btn">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>language</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600 }}>Site public</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" style={{ color: '#ffb4ab' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600 }}>Se déconnecter</span>
              </button>
            </div>
          </nav>
        </div>
      )}
      {activeSection === 'feed' ? (
        <LinkedInFeed session={session} onOpenInbox={() => setInboxOpen(true)} />
      ) : activeSection === 'brain' ? (
        <BrainInlineChat session={session} />
      ) : activeSection === 'reels' ? (
        <ReelsFeed session={session} onOpenInbox={() => setInboxOpen(true)} />
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {activeSection === 'profile' && <ProfileTriptych session={session} doctrine={doctrine} onDoctrineUpdate={reloadDoctrine} />}
          {activeSection === 'vitrine' && <VitrinePage session={session} />}
          {activeSection === 'wallet' && <WalletPage session={session} jetonsBalance={jetonsBalance} doctrine={doctrine} />}
          {activeSection === 'shop' && <ShopPageEnhanced session={session} jetonsBalance={jetonsBalance} />}
          {activeSection === 'settings' && <SettingsSovereign session={session} onLogout={handleLogout} onNavigate={sec => setActiveSection(sec)} />}
          {activeSection === 'archives' && <ArchivesCloud session={session} />}
          {activeSection === 'governance' && <GovernanceSection />}
          {activeSection === 'console' && <TerminalIA session={session} />}
          {activeSection === 'trading' && <TradingSettings session={session} />}
          {activeSection === 'messages' && <MessagesSection session={session} />}
          {activeSection === 'settings-detail' && <SettingsSection session={session} jetonsBalance={jetonsBalance} onLogout={handleLogout} />}
        </div>
      )}

      {/* Studios Sidebar — slides from left */}
      <StudiosSidebar
        isOpen={studiosOpen}
        onClose={() => setStudiosOpen(false)}
        onSelectStudio={(studioId, toolLabel) => {
          toast.success(`Studio: ${toolLabel}`);
          if (studioId === 'linkedin') setActiveSection('feed');
          else if (studioId === 'reel') setActiveSection('reels');
          else if (studioId === 'shop') setActiveSection('shop');
          else if (studioId === 'terminal') setActiveSection('console');
        }}
      />

      {/* Immersive Inbox — fullscreen */}
      <ImmersiveInbox session={session} isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />

      {!inboxOpen && !studiosOpen && showMessages && <MessagesPanel messages={messages} session={session} onUpdate={loadAll} onClose={() => setShowMessages(false)} />}
      {!inboxOpen && activeSection !== 'brain' && <CvlBrainFloat session={session} externalOpen={brainOpen} onExternalClose={() => setBrainOpen(false)} />}

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <MobileNavigation
        activeSection={activeSection}
        onNavigate={handleMobileNav}
        feedBadge={0}
        networkBadge={connections.length > 0 ? 0 : 1}
      />

      {/* ─── AMBIENT GLOW — Stitch Sovereign background ─── */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute" style={{ top: '-10%', right: '-10%', width: '60%', height: '60%', background: 'rgba(232,213,160,0.03)', filter: 'blur(120px)', borderRadius: '50%' }} />
        <div className="absolute" style={{ bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(53,52,54,0.15)', filter: 'blur(100px)', borderRadius: '50%' }} />
      </div>

      {/* ─── GRAIN TEXTURE — Stitch "Sovereign Editorial" ─── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100, opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* ─── Global CSS — Sovereign Onyx Design System ─── */}
      <style>{`
        :root {
          --bg: #0a0a0b;
          --surface: #131314;
          --surface-low: #1c1b1c;
          --surface-container: #201f20;
          --surface-high: #2a2a2b;
          --surface-highest: #353436;
          --gold: #E8D5A0;
          --gold-dim: #d8c591;
          --gold-container: #c8a84b;
          --gold-glow: rgba(232,213,160,0.12);
          --primary-container: #e8d5a0;
          --primary-fixed-dim: #d8c591;
          --text: #e5e2e3;
          --muted: #72727a;
          --outline: #979083;
          --outline-variant: rgba(75,70,59,0.15);
          --on-primary: #3a2f09;
        }

        /* Selection — Sovereign Gold */
        ::selection { background: var(--primary-container); color: var(--on-primary); }

        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-slide-in { animation: fadeSlideIn 0.4s cubic-bezier(0.2,0,0,1) both; }

        @keyframes skeletonShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .kn-skeleton-shimmer {
          background: linear-gradient(90deg, #1c1b1c 0%, rgba(232,213,160,0.06) 50%, #1c1b1c 100%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.8s cubic-bezier(0.4,0,0.2,1) infinite;
        }

        .kn-card {
          animation: knCardIn 0.4s cubic-bezier(0.2,0,0,1) both;
          transition: transform 0.3s cubic-bezier(0.2,0,0,1), box-shadow 0.3s cubic-bezier(0.2,0,0,1), background 0.3s;
          background: #1c1b1c;
          border: none;
          border-radius: 2px;
        }
        .kn-card:hover {
          transform: scale(1.005);
          box-shadow: 0 12px 48px rgba(0,0,0,0.5);
          background: #201f20;
        }
        @keyframes knCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .kn-countdown-pulse { animation: countdownPulse 3s cubic-bezier(0.4,0,0.2,1) infinite; }
        @keyframes countdownPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }

        .kn-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(232,213,160,0.08) 50%, transparent 100%);
          animation: knShimmerMove 3s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes knShimmerMove { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }

        .kn-avatar-ring { transition: box-shadow 0.3s cubic-bezier(0.2,0,0,1); }
        .kn-avatar-ring:hover { box-shadow: 0 0 0 2px rgba(232,213,160,0.3); }

        /* Glass Panel — Stitch Sovereign */
        .glass-panel {
          background: rgba(32,31,32,0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        @media (prefers-reduced-motion: reduce) {
          .kn-card, .kn-countdown-pulse, .kn-shimmer, .kn-skeleton-shimmer, .fade-slide-in {
            animation: none !important;
            transition: none !important;
          }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Material Symbols — Stitch default */
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        }

        /* Ghost Border Fallback — Stitch rule */
        .ghost-border {
          border: 1px solid rgba(75,70,59,0.15);
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// FEED LAYOUT — Immersive TikTok on mobile, 3-column on desktop
// ═══════════════════════════════════════════════════════════
const FeedLayout = ({ session, profile, connections, onRefresh, jetonsBalance, culturalIdentity }) => {
  const [feedMode, setFeedMode] = useState('cultural'); // 'cultural' or 'social'

  return (
    <>
      {/* MOBILE: Full-screen immersive cultural feed */}
      <div className="md:hidden">
        {/* Mode toggle pills */}
        <div className="sticky top-16 z-20 flex gap-2 px-4 py-3" style={{ background: 'rgba(10,10,11,0.90)', backdropFilter: 'blur(16px)' }}>
          <button onClick={() => setFeedMode('cultural')}
            className="px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{ background: feedMode === 'cultural' ? '#E8D5A0' : 'rgba(255,255,255,0.04)', color: feedMode === 'cultural' ? '#0a0a0b' : '#72727a', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em' }}
            data-testid="feed-mode-cultural">Discover</button>
          <button onClick={() => setFeedMode('social')}
            className="px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{ background: feedMode === 'social' ? '#E8D5A0' : 'rgba(255,255,255,0.04)', color: feedMode === 'social' ? '#0a0a0b' : '#72727a', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em' }}
            data-testid="feed-mode-social">Communauté</button>
        </div>

        {feedMode === 'cultural' ? (
          <div className="px-2">
            <CulturalFeed userId={session.id} />
          </div>
        ) : (
          <div className="px-4 py-4">
            <FeedSection session={session} />
          </div>
        )}
      </div>

      {/* DESKTOP: 3-column layout */}
      <div className="hidden md:flex gap-6 max-w-5xl mx-auto px-4 py-6">
        {/* Left sidebar — Identity */}
        <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: '#1b1b1c' }}>
            <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.06), rgba(200,168,75,0.03))' }} />
            <div className="px-4 pb-4 -mt-8 text-center">
              <Avatar src={session.image} name={session.name} type={session.type} size={64} className="mx-auto" ring style={{ border: '3px solid #1b1b1c' }} />
              <h3 className="mt-2" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 400, color: '#e5e2e3' }}>{session.name}</h3>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#72727a', marginTop: 2 }}>{PROFILE_LABELS[session.type] || 'Professionnel'}</p>
              {doctrine?.label_fr && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full" data-testid="sidebar-doctrine-badge"
                  style={{ background: 'rgba(232,213,160,0.08)', border: '1px solid rgba(232,213,160,0.12)', fontFamily: "'Manrope', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8D5A0' }}>
                  {doctrine.label_fr}
                </span>
              )}
            </div>
            <div className="px-4 pb-4">
              <CulturalIdentityBar score={culturalIdentity?.score || 0} levelName={culturalIdentity?.level?.name || ''} />
            </div>
            <div className="px-4 py-3" style={{ background: 'rgba(232,213,160,0.03)' }}>
              <div className="flex justify-around text-center">
                <div>
                  <p style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#E8D5A0' }}>{connections.length}</p>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Connexions</p>
                </div>
                <div>
                  <p style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#E8D5A0' }}>{profile?.views || 0}</p>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Vues</p>
                </div>
                <div>
                  <p style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#E8D5A0' }}>{jetonsBalance || 0}</p>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Jetons</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#1b1b1c' }}>
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a', marginBottom: 12 }}>
              Empreinte culturelle
            </h3>
            <ConstellationRadar dimensions={culturalIdentity?.dimensions || {}} compact={true} />
          </div>
        </aside>

        {/* Center — Feed */}
        <main className="flex-1 min-w-0">
          {/* CC2026 Countdown */}
          <div className="kn-card rounded-xl p-5 relative overflow-hidden mb-4" data-testid="countdown-banner">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(232,213,160,0.04), transparent 60%)' }} />
            <div className="flex items-center justify-between flex-wrap gap-3 relative">
              <div>
                <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: '#e5e2e3', letterSpacing: '-0.01em' }}>Culture Connect 2026</h2>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a', marginTop: 4 }}>20–23 Mai · Grand Carbet du Parc culturel Aimé Césaire · Fort-de-France</p>
              </div>
              <div className="kn-countdown-pulse px-4 py-2 rounded-xl" style={{ background: 'rgba(232,213,160,0.06)' }}>
                <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: '#E8D5A0' }}>J-{getDaysUntil()}</span>
              </div>
            </div>
          </div>

          <FeedSection session={session} />
          <div className="mt-4">
            <CulturalFeed userId={session.id} />
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="hidden xl:block w-72 flex-shrink-0 space-y-4">
          <OnboardingWidget userId={session.id} />
          <CreationNudge userId={session.id} />
          <RecommendationsWidget session={session} />
        </aside>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// FEED SECTION — Countdown + Posts
// ═══════════════════════════════════════════════════════════
const FeedSection = ({ session }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});

  const loadFeed = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/pro/social/feed`, { params: { profile_id: session.id } });
      setPosts(res.data.posts || []);
    } catch {} finally { setLoading(false); }
  }, [session.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const createPost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API}/pro/social/posts`, { author_id: session.id, author_name: session.name, author_image: session.image, author_type: session.type, content: newPost });
      setNewPost(''); toast.success('Publication partagée ! +5 Jetons CC'); loadFeed();
    } catch { toast.error('Erreur lors de la publication'); } finally { setPosting(false); }
  };

  const generateWithBrain = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/v1/llm/chat`, {
        message: `Génère un post professionnel court (3-4 phrases max) pour le réseau CC2026. Le profil est : ${session.name}, ${PROFILE_LABELS[session.type] || 'professionnel culturel'}. Le post doit être authentique, culturellement ancré (Caraïbes/Afrique), et inspirant. Utilise un mélange de français et de créole si pertinent. Ne mets pas de hashtags.`,
        system_prompt: 'Tu es CVL BRAIN. Génère un post professionnel court et authentique pour le réseau culturel CC2026. Maximum 3-4 phrases. Pas de hashtags.',
        provider: 'anthropic', model: 'claude-sonnet-4-5-20250929',
      });
      setNewPost(res.data.response || '');
    } catch { toast.error('CVL BRAIN est momentanément indisponible'); } finally { setGenerating(false); }
  };

  const handleLike = async (postId) => {
    try { await axios.post(`${API}/pro/social/posts/${postId}/like?profile_id=${session.id}`); loadFeed(); } catch {}
  };
  const handleComment = async (postId) => {
    const content = commentInputs[postId]; if (!content?.trim()) return;
    try {
      await axios.post(`${API}/pro/social/posts/${postId}/comment`, { author_id: session.id, author_name: session.name, content });
      setCommentInputs({ ...commentInputs, [postId]: '' }); loadFeed();
    } catch {}
  };
  const deletePost = async (postId) => {
    if (deletingPostId) return;
    setDeletingPostId(postId);
    try { await axios.delete(`${API}/pro/social/posts/${postId}?author_id=${session.id}`); loadFeed(); }
    catch {} finally { setDeletingPostId(null); }
  };

  const timeAgo = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "à l'instant"; if (s < 3600) return `${Math.floor(s / 60)} min`;
    if (s < 86400) return `${Math.floor(s / 3600)} h`; return `${Math.floor(s / 86400)} j`;
  };

  return (
    <div className="space-y-4">
      {/* ─── CREATE POST ─── */}
      <div className="kn-card rounded-xl p-5" data-testid="create-post-box">
        <div className="flex gap-3">
          <Avatar src={session.image} name={session.name} type={session.type} size={44} ring />
          <div className="flex-1">
            <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
              placeholder="Partagez votre actualité culturelle..."
              rows={2} data-testid="new-post-input" aria-label="Nouveau post"
              className="w-full p-3 rounded-xl text-sm resize-none"
              style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none', minHeight: 56, lineHeight: 1.6, fontFamily: "'Manrope', sans-serif", transition: 'background 0.3s' }} />
            <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
              <button onClick={generateWithBrain} disabled={generating} data-testid="generate-brain-btn"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: 'rgba(232,213,160,0.06)', color: '#E8D5A0', minHeight: 36, fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>psychology</span>
                {generating ? 'Génération...' : 'CVL BRAIN'}
              </button>
              <button disabled={!newPost.trim() || posting} onClick={createPost} data-testid="publish-post-btn"
                className="px-6 py-2 rounded-full text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: '#E8D5A0', color: '#0a0a0b', minHeight: 36, fontFamily: "'Manrope', sans-serif", letterSpacing: '0.02em' }}>
                {posting ? '...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SOCIAL POSTS ─── */}
      {loading ? (
        <div className="space-y-3 mt-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-4" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
              <div className="flex gap-3">
                <div className="w-[52px] h-[52px] rounded-full kn-skeleton-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded kn-skeleton-shimmer" />
                  <div className="h-3 w-1/4 rounded kn-skeleton-shimmer" style={{ animationDelay: '0.1s' }} />
                  <div className="h-16 w-full rounded-xl kn-skeleton-shimmer mt-2" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? null : (
        <div className="mt-4 space-y-0">
          {posts.map((post, idx) => {
            const typeColor = TYPE_COLORS[post.author_type] || '#888';
            return (
              <article key={post.id} className="fade-slide-in" data-testid={`post-${post.id}`}
                style={{ animationDelay: `${idx * 60}ms`, borderBottom: '1px solid rgba(75,70,59,0.1)', padding: '20px 0' }}>
                <div className="flex gap-3">
                  <Avatar src={post.author_image} name={post.author_name} type={post.author_type} size={48} ring />
                  <div className="flex-1 min-w-0">
                    {/* Header line */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, fontWeight: 400, color: '#e5e2e3' }}>{post.author_name}</span>
                      <span style={{
                        fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: typeColor, padding: '2px 8px', borderRadius: 20,
                        background: `${typeColor}10`,
                      }}>{PROFILE_LABELS[post.author_type] || ''}</span>
                      <span className="flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#555' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>{timeAgo(post.created_at)}
                      </span>
                      {post.author_id === session.id && (
                        <button
                          onClick={() => deletePost(post.id)}
                          aria-label="Supprimer"
                          disabled={deletingPostId === post.id}
                          className="ml-auto p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ color: '#555', minHeight: 32, minWidth: 32 }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {deletingPostId === post.id ? 'hourglass_empty' : 'close'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="whitespace-pre-wrap mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#e5e2e3', lineHeight: 1.7 }}>{post.content}</p>
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.tags.map(t => <span key={t} style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8D5A0' }}>#{t}</span>)}
                      </div>
                    )}

                    {/* Cultural reactions under post */}
                    <div className="flex items-center gap-3 mt-3">
                      <CulturalReactions cardId={post.id} reactions={{}} userId={session.id} onReact={() => {}} />
                      <button onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
                        style={{ color: '#72727a', minHeight: 36, fontFamily: "'Manrope', sans-serif" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat_bubble</span> {post.comments_count || 0}
                      </button>
                    </div>

                    {/* Comments */}
                    {showComments[post.id] && (
                      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(75,70,59,0.1)' }}>
                        {post.comments?.map(c => (
                          <div key={c.id} className="flex gap-2">
                            <Avatar name={c.author_name} type="other" size={28} />
                            <div className="flex-1 p-2 rounded-xl" style={{ background: '#131314' }}>
                              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: '#e5e2e3' }}>{c.author_name}</span>
                              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, marginTop: 2, color: '#72727a', lineHeight: 1.5 }}>{c.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <Avatar src={session.image} name={session.name} type={session.type} size={28} />
                          <div className="flex-1 flex gap-1.5">
                            <input value={commentInputs[post.id] || ''} onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                              placeholder="Commentaire..." aria-label="Ajouter un commentaire"
                              className="flex-1 px-3 rounded-full text-xs"
                              style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none', minHeight: 32, fontFamily: "'Manrope', sans-serif" }} />
                            <button onClick={() => handleComment(post.id)} aria-label="Envoyer"
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5" style={{ color: '#E8D5A0' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// RECOMMENDATIONS WIDGET
// ═══════════════════════════════════════════════════════════
const RecommendationsWidget = ({ session }) => {
  const [recs, setRecs] = useState([]);
  useEffect(() => {
    axios.get(`${API}/pro/social/recommendations/${session.id}?limit=5`).then(r => setRecs(r.data.recommendations || [])).catch(() => {});
  }, [session.id]);
  const sendConnect = async (id) => {
    try { await axios.post(`${API}/pro/connect`, { from: session.id, to: id }); toast.success('Demande envoyée ! +3 Jetons CC'); setRecs(prev => prev.filter(r => r.id !== id)); } catch {}
  };

  const truncName = (name) => {
    if (!name) return 'Membre CC2026';
    let display = name.replace(/^TEST_/g, '').replace(/_/g, ' ');
    // Remove hex suffixes (e.g. "Manual User a6c67c89")
    display = display.replace(/\s+[a-f0-9]{6,}$/i, '');
    if (!display || display.length < 3 || display === 'Manual User') return 'Membre CC2026';
    if (display.startsWith('CatalogTest')) return 'Membre CC2026';
    if (display.length > 20) return display.slice(0, 18) + '\u2026';
    return display;
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1b1b1c' }}>
      <div className="px-4 py-3">
        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Profils suggérés</h3>
      </div>
      {recs.length === 0 ? (
        <div className="p-5 text-center"><p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#555' }}>Complétez votre profil pour recevoir des suggestions</p></div>
      ) : recs.map(r => (
        <div key={r.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(75,70,59,0.08)' }}>
          <div className="flex items-center gap-3">
            <Avatar name={r.full_name} type={r.profile_type} size={40} />
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 14, color: '#e5e2e3' }}>{truncName(r.full_name)}</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>{PROFILE_LABELS[r.profile_type] || 'Professionnel'}</p>
            </div>
            <button onClick={() => sendConnect(r.id)} data-testid={`connect-${r.id}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: 'transparent', border: '1px solid rgba(232,213,160,0.2)', color: '#E8D5A0', minHeight: 32, fontFamily: "'Manrope', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E8D5A0'; e.currentTarget.style.color = '#0a0a0b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E8D5A0'; }}>
              Rejoindre
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════
const ProfilePage = ({ profile, session, connections, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', website: '', linkedin: '', instagram: '', seeking: '', offering: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setFormData({ bio: profile.bio || '', website: profile.website || '', linkedin: profile.linkedin || '', instagram: profile.instagram || '', seeking: profile.seeking || '', offering: profile.offering || '' });
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try { await axios.put(`${API}/pro/profile/${session.id}`, formData); toast.success('Profil mis à jour ! +15 Jetons CC'); setEditing(false); onUpdate(); }
    catch { toast.error('Erreur de sauvegarde'); } finally { setSaving(false); }
  };

  const tags = profile?.expertise_tags || [];

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-16" data-testid="profile-page">
      {/* ─── COMPACT PROFILE HERO — Stitch 12-col grid ─── */}
      <div className="grid grid-cols-12 gap-3">
        {/* Profile Card (col-8) */}
        <div className="col-span-8 rounded-xl p-4 flex items-center gap-4" style={{ background: '#0e0e0f', border: '1px solid rgba(75,70,59,0.1)' }}>
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '2px solid rgba(232,213,160,0.2)', padding: 2 }}>
              <Avatar src={profile?.image || session.image} name={session.name} type={session.type} size={56} />
            </div>
            <button onClick={() => editing ? handleSave() : setEditing(true)} data-testid="edit-profile-btn"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#E8D5A0', color: '#3a2f09', border: '2px solid #0e0e0f' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 10 }}>{editing ? 'check' : 'edit'}</span>
            </button>
          </div>
          <div className="min-w-0">
            <h1 className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: '#e5e2e3' }}>{session.name}</h1>
            <p className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 500, color: '#72727a', marginBottom: 4 }}>
              {profile?.organization_name || PROFILE_LABELS[session.type]}
            </p>
            <div className="flex gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(232,213,160,0.1)', color: '#E8D5A0', fontSize: 8, fontWeight: 700, border: '1px solid rgba(232,213,160,0.2)' }}>Accrédité</span>
              {profile?.country && <span className="px-1.5 py-0.5 rounded-full" style={{ background: '#2a2a2b', color: '#72727a', fontSize: 8, fontWeight: 700 }}>{profile.country}</span>}
            </div>
          </div>
        </div>

        {/* Metric Card (col-4) — Stitch gold gradient */}
        <div className="col-span-4 rounded-xl p-3 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #e5c363, #c8a84b)' }}>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#3a2f09', opacity: 0.9, fontVariationSettings: "'FILL' 1" }}>insights</span>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 800, color: '#3a2f09', lineHeight: 1 }}>{connections.length}</div>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3a2f09', opacity: 0.8, marginTop: 2 }}>Connexions</p>
          </div>
          <div className="w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, connections.length * 10)}%`, background: 'white' }} />
          </div>
        </div>
      </div>

      {/* ─── CONTACT & SOCIAL — Stitch 2-col grid ─── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#72727a' }}>Contact</h2>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>mail</span>
              <span className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 500, color: '#e5e2e3' }}>{session.email}</span>
            </div>
            {profile?.country && <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>location_on</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 500, color: '#e5e2e3' }}>{profile.country}</span>
            </div>}
          </div>
        </div>
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#72727a' }}>Liens</h2>
          {editing ? (
            <div className="space-y-1">
              <input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })}
                placeholder="Site web" className="w-full px-2 py-1 rounded text-[10px]" style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none' }} />
              <input value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="LinkedIn" className="w-full px-2 py-1 rounded text-[10px]" style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none' }} />
            </div>
          ) : (
            <div className="flex gap-1.5">
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-105 transition-transform" style={{ background: '#2a2a2b' }}>
                  <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>language</span>
                </a>
              )}
              {profile?.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-105 transition-transform" style={{ background: '#2a2a2b' }}>
                  <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>link</span>
                </a>
              )}
              {!profile?.website && !profile?.linkedin && (
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555' }}>Non renseigné</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── ABOUT — Stitch single card ─── */}
      <div className="rounded-xl p-4" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
        <h2 className="mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#72727a' }}>À propos</h2>
        {editing ? (
          <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3}
            placeholder="Décrivez votre parcours..."
            className="w-full p-3 rounded-lg text-sm"
            style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none', lineHeight: 1.6, fontFamily: "'Manrope', sans-serif" }} />
        ) : (
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, lineHeight: 1.6, color: profile?.bio ? '#72727a' : '#555' }}>{profile?.bio || 'Aucune description.'}</p>
        )}
      </div>

      {/* ─── SKILLS — Stitch tags ─── */}
      {tags.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
          <h2 className="mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#72727a' }}>Compétences</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full" style={{ background: 'rgba(232,213,160,0.08)', color: '#E8D5A0', fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700 }}>{tag}</span>)}
          </div>
        </div>
      )}

      {/* ─── NOTIFICATIONS & SECURITY — Stitch 2-col ─── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
        <div className="grid grid-cols-2" style={{ borderBottom: 'none' }}>
          {/* Seeking */}
          <div className="p-3 space-y-1.5" style={{ borderRight: '1px solid rgba(75,70,59,0.1)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>search</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, color: '#e5e2e3' }}>Je recherche</span>
            </div>
            {editing ? (
              <textarea value={formData.seeking} onChange={e => setFormData({ ...formData, seeking: e.target.value })} rows={1}
                placeholder="Ex: Distribution..." className="w-full p-2 rounded text-[10px]"
                style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none' }} />
            ) : (
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: profile?.seeking ? '#72727a' : '#555' }}>{profile?.seeking || 'Non renseigné'}</p>
            )}
          </div>
          {/* Offering */}
          <div className="p-3 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 14 }}>handshake</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, color: '#e5e2e3' }}>Je propose</span>
            </div>
            {editing ? (
              <textarea value={formData.offering} onChange={e => setFormData({ ...formData, offering: e.target.value })} rows={1}
                placeholder="Ex: Conseil..." className="w-full p-2 rounded text-[10px]"
                style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none' }} />
            ) : (
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: profile?.offering ? '#72727a' : '#555' }}>{profile?.offering || 'Non renseigné'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Save / Cancel buttons when editing */}
      {editing && (
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} data-testid="save-profile-btn"
            className="flex-1 py-3 rounded-xl font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: '#E8D5A0', color: '#0a0a0b', fontFamily: "'Manrope', sans-serif", fontSize: 12 }}>
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-4 py-3 rounded-xl transition-all hover:bg-white/5"
            style={{ color: '#72727a', fontFamily: "'Manrope', sans-serif", fontSize: 12, border: '1px solid rgba(75,70,59,0.15)' }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// NETWORK PAGE
// ═══════════════════════════════════════════════════════════
const NetworkPage = ({ connections, session, onConnect }) => {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);

  useEffect(() => {
    axios.get(`${API}/pro/social/directory`).then(r => { setPros(r.data.professionals || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && pros.length === 0) {
      axios.get(`${API}/registrations`).then(r => { setPros(r.data.registrations?.filter(x => x.status === 'approved' && x.id !== session.id) || []); }).catch(() => {});
    }
  }, [loading, pros.length, session.id]);

  const sendConnect = async (proId) => {
    try { await axios.post(`${API}/pro/connect`, { from: session.id, to: proId }); toast.success('Demande envoyée ! +3 Jetons CC'); onConnect(); } catch { toast.error('Erreur'); }
  };

  const filtered = pros.filter(p => {
    const s = search.toLowerCase();
    return (!search || p.full_name?.toLowerCase().includes(s) || p.organization_name?.toLowerCase().includes(s) || p.bio?.toLowerCase().includes(s))
      && (!filterType || p.profile_type === filterType)
      && (!filterCountry || p.country === filterCountry)
      && p.id !== session.id;
  });
  const countries = [...new Set(pros.map(p => p.country).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto space-y-8" data-testid="network-page">
      {/* Editorial Header */}
      <header className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(232,213,160,0.08)', color: '#d8c591', border: '1px solid rgba(232,213,160,0.1)' }}>Réseau Souverain</span>
          <div className="h-px flex-1" style={{ background: 'rgba(75,70,59,0.15)' }} />
        </div>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.03em', color: '#e5e2e3' }}>
          L'Écho du <br /><span style={{ fontStyle: 'italic', color: '#E8D5A0' }}>Réseau</span>
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a', maxWidth: 480, lineHeight: 1.7 }}>
          {filtered.length} professionnel{filtered.length !== 1 ? 's' : ''} dans l'écosystème. Connectez-vous pour développer vos synergies culturelles.
        </p>
      </header>

      {/* Glass Search Panel */}
      <div className="p-6 rounded-xl" style={{ background: 'rgba(32,31,32,0.7)', backdropFilter: 'blur(24px)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#555', fontSize: 20 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, organisation..." aria-label="Rechercher" data-testid="network-search"
              className="w-full pl-11 pr-4 rounded-xl text-sm" style={{ background: '#131314', border: 'none', color: '#e5e2e3', outline: 'none', minHeight: 48, fontFamily: "'Manrope', sans-serif" }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="Filtrer par type"
            className="px-4 rounded-xl text-sm" style={{ background: '#131314', border: 'none', color: '#e5e2e3', minHeight: 48, fontFamily: "'Manrope', sans-serif" }}>
            <option value="">Tous les profils</option>
            <option value="artist">Artistes</option><option value="label">Labels</option>
            <option value="booking_agency">Booking</option><option value="institution">Institutions</option><option value="press">Presse</option>
          </select>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} aria-label="Filtrer par territoire"
            className="px-4 rounded-xl text-sm" style={{ background: '#131314', border: 'none', color: '#e5e2e3', minHeight: 48, fontFamily: "'Manrope', sans-serif" }}>
            <option value="">Tous territoires</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: C.gold }} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main editorial grid */}
          <div className="lg:col-span-8 space-y-0">
            {filtered.map((pro, idx) => {
              const typeColor = TYPE_COLORS[pro.profile_type] || '#72727a';
              const isConnected = connections.some(c => c.id === pro.id);
              return (
                <div key={pro.id} className="fade-slide-in py-6 cursor-pointer group" data-testid={`pro-card-${pro.id}`}
                  style={{ animationDelay: `${idx * 60}ms`, borderBottom: '1px solid rgba(75,70,59,0.1)' }}
                  onClick={() => setSelectedPro(pro)}>
                  <div className="flex gap-4">
                    <Avatar src={pro.image || pro.logo_url} name={pro.full_name} type={pro.profile_type} size={56} ring />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: '#e5e2e3' }}>{pro.full_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: `${typeColor}15`, color: typeColor }}>{PROFILE_LABELS[pro.profile_type] || ''}</span>
                      </div>
                      {pro.organization_name && <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#72727a', marginTop: 2 }}>{pro.organization_name}</p>}
                      {pro.bio && <p className="line-clamp-2 mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#555', lineHeight: 1.6 }}>{pro.bio}</p>}
                      <div className="mt-3 flex items-center gap-3">
                        {isConnected ? (
                          <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(232,213,160,0.08)', color: '#E8D5A0' }}>Connecté</span>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); sendConnect(pro.id); }} data-testid={`connect-btn-${pro.id}`}
                            className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.97]"
                            style={{ background: '#E8D5A0', color: '#0a0a0b' }}>
                            Rejoindre
                          </button>
                        )}
                        {pro.country && <span className="flex items-center gap-1 text-[11px]" style={{ color: '#555' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{pro.country}
                        </span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar — Bento stats */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-xl" style={{ background: '#1c1b1c' }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#72727a', fontFamily: "'Manrope', sans-serif" }}>Votre Réseau</span>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 14, color: '#e5e2e3' }}>Connexions actives</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#E8D5A0', color: '#3a2f09' }}>{connections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 14, color: '#e5e2e3' }}>Résonance Culturelle</span>
                  <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8D5A0' }}>Active</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl flex flex-col justify-between aspect-square" style={{ background: '#2a2a2b' }}>
                <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 24 }}>auto_awesome</span>
                <div>
                  <div style={{ fontFamily: "'Newsreader', serif", fontSize: 24, color: '#e5e2e3' }}>{filtered.length}</div>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Professionnels</div>
                </div>
              </div>
              <div className="p-6 rounded-xl flex flex-col justify-between aspect-square" style={{ background: '#2a2a2b' }}>
                <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 24 }}>share</span>
                <div>
                  <div style={{ fontFamily: "'Newsreader', serif", fontSize: 24, color: '#e5e2e3' }}>{countries.length}</div>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Territoires</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
      {selectedPro && <ProfileModal pro={selectedPro} onClose={() => setSelectedPro(null)} session={session} isConnected={connections.some(c => c.id === selectedPro.id)} onConnect={() => sendConnect(selectedPro.id)} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PROFILE MODAL
// ═══════════════════════════════════════════════════════════
const ProfileModal = ({ pro, onClose, session, isConnected, onConnect }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Profil de ${pro.full_name}`} onClick={onClose}>
    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.1)' }} onClick={e => e.stopPropagation()} data-testid="profile-modal">
      <div className="h-32 relative rounded-t-xl" style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[pro.profile_type] || C.accent}50, ${C.gold}25, ${C.forest}15)` }}>
        <button onClick={onClose} aria-label="Fermer le profil" data-testid="close-profile-modal"
          className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center bg-black/40" style={{ minHeight: 44 }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18 }}>close</span>
        </button>
      </div>
      <div className="px-6 pb-6 -mt-12">
        <Avatar src={pro.logo_url || pro.image} name={pro.full_name} type={pro.profile_type} size={96} style={{ border: '4px solid #131314' }} />
        <div className="flex items-center gap-2 mt-3">
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 500, color: TYPE_COLORS[pro.profile_type] || C.accent }}>{PROFILE_LABELS[pro.profile_type]}</span>
        </div>
        <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 22, color: '#e5e2e3', marginTop: 4 }}>{pro.full_name}</h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a' }}>{pro.organization_name}</p>
        {pro.country && <p className="flex items-center gap-1 mt-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#555' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span> {pro.country}
        </p>}

        <div className="mt-4 p-4 rounded-xl" style={{ background: '#1c1b1c' }}>
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a' }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#E8D5A0' }}>mail</span> {pro.email}</div>
              {pro.phone && <div className="flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a' }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#E8D5A0' }}>phone</span> {pro.phone}</div>}
            </div>
          ) : (
            <div className="text-center py-3" data-testid="contact-locked">
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#555' }}>group</span>
              <p className="mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#555' }}>Connectez-vous pour voir les coordonnées</p>
            </div>
          )}
        </div>

        {pro.bio && <div className="mt-4"><h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#e5e2e3', marginBottom: 8 }}>À propos</h3><p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#72727a' }}>{pro.bio}</p></div>}
        {pro.expertise_tags?.length > 0 && (
          <div className="mt-4"><h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#e5e2e3', marginBottom: 8 }}>Compétences</h3>
            <div className="flex flex-wrap gap-2">{pro.expertise_tags.map(t => <span key={t} className="px-3 py-1 rounded-full" style={{ background: 'rgba(232,213,160,0.08)', color: '#E8D5A0', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }}>{t}</span>)}</div>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          {isConnected ? (
            <button className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'rgba(232,213,160,0.1)', color: '#E8D5A0', fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span> Message
            </button>
          ) : (
            <button onClick={onConnect} className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: '#E8D5A0', color: '#0a0a0b', fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Rejoindre
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// MESSAGES PANEL
// ═══════════════════════════════════════════════════════════
const MessagesPanel = ({ messages, session, onUpdate, onClose }) => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const convos = messages.reduce((acc, msg) => {
    const otherId = msg.from === session.id ? msg.to : msg.from;
    if (!acc[otherId]) acc[otherId] = { id: otherId, name: msg.fromName || msg.toName, messages: [], unread: 0 };
    acc[otherId].messages.push(msg);
    if (!msg.read && msg.to === session.id) acc[otherId].unread++;
    return acc;
  }, {});
  const sendMsg = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    try { await axios.post(`${API}/pro/messages`, { from: session.id, to: selectedConv, content: newMsg }); setNewMsg(''); onUpdate(); } catch { toast.error('Erreur'); }
  };

  return (
    <div className="fixed bottom-0 right-4 z-50 w-80 sm:w-96 shadow-2xl rounded-t-xl" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.1)' }} data-testid="messages-panel">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" style={{ borderBottom: '1px solid rgba(75,70,59,0.1)', minHeight: 48 }} onClick={() => !selectedConv && onClose()}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 18 }}>chat</span>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#e5e2e3' }}>{selectedConv ? (convos[selectedConv]?.name || 'Conversation') : 'Messages'}</span>
        </div>
        <div className="flex gap-1">
          {selectedConv && <button onClick={() => setSelectedConv(null)} className="p-2 rounded-lg hover:bg-white/5" style={{ minHeight: 44 }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#555' }}>expand_more</span></button>}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5" style={{ minHeight: 44 }} aria-label="Fermer les messages"><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#555' }}>close</span></button>
        </div>
      </div>

      {!selectedConv ? (
        <div className="max-h-80 overflow-y-auto">
          {Object.values(convos).length === 0 ? (
            <div className="p-8 text-center"><p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#555' }}>Aucune conversation</p></div>
          ) : Object.values(convos).map(conv => (
            <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.03]" style={{ borderBottom: '1px solid rgba(75,70,59,0.1)', minHeight: 56 }}>
              <Avatar name={conv.name} type="other" size={40} />
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 600, color: '#e5e2e3' }}>{conv.name}</p>
                <p className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#555' }}>{conv.messages[conv.messages.length - 1]?.content}</p>
              </div>
              {conv.unread > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#ffb4ab', color: '#690005', fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700 }}>{conv.unread}</span>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {convos[selectedConv]?.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === session.id ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] px-4 py-3 rounded-xl" style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 13,
                  background: msg.from === session.id ? '#201f20' : '#1c1b1c',
                  color: '#e5e2e3',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(75,70,59,0.1)' }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} aria-label="Écrire un message"
              placeholder="Écrire..." className="flex-1 px-4 rounded-lg" style={{ background: '#201f20', border: 'none', color: '#e5e2e3', outline: 'none', minHeight: 44, fontFamily: "'Manrope', sans-serif", fontSize: 13 }} />
            <button onClick={sendMsg} className="w-10 h-10 rounded-lg flex items-center justify-center active:scale-90 transition-transform" style={{ background: '#E8D5A0', minHeight: 44 }} aria-label="Envoyer">
              <span className="material-symbols-outlined" style={{ color: '#3a2f09', fontSize: 16 }}>send</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOP SECTION — Sovereign Core Shop
// ═══════════════════════════════════════════════════════════
const ShopSection = ({ session, jetonsBalance }) => (
  <div className="max-w-6xl mx-auto space-y-16 pb-16" data-testid="shop-section">
    {/* Hero */}
    <section className="relative py-24 text-center">
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-64 h-64 rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(232,213,160,0.15), transparent 70%)' }} />
      </div>
      <div className="relative space-y-6">
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#d8c591' }}>L'Origine du Protocole</span>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(40px, 8vw, 96px)', letterSpacing: '-0.03em', color: '#e5e2e3', lineHeight: 0.95 }}>
          Sovereign<br /><span style={{ fontStyle: 'normal', color: '#d8c591' }}>Core Shop</span>
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, color: '#72727a', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          Accédez aux artefacts numériques de l'écosystème. Chaque actif est une clé vers votre autonomie.
        </p>
        <div className="pt-4">
          <button className="px-10 py-4 text-xs font-bold uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
            style={{ background: '#E8D5A0', color: '#3a2f09', fontFamily: "'Manrope', sans-serif" }}>
            Entrer dans l'expérience
          </button>
        </div>
      </div>
    </section>

    {/* Editorial Grid */}
    <div className="grid grid-cols-12 gap-6">
      {/* JCC Tokens — Large card */}
      <div className="col-span-12 md:col-span-7 group cursor-pointer">
        <div className="relative h-96 md:h-[500px] overflow-hidden" style={{ background: '#1c1b1c' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: 120, color: 'rgba(232,213,160,0.08)', fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0e0e0f, transparent)' }} />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex justify-between items-end">
              <div>
                <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 32, color: '#e5e2e3' }}>Jetons CC</h3>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#72727a', marginTop: 4 }}>Réserve de Valeur · 1 JCC = 1.50€</p>
              </div>
              <button className="px-6 py-3 text-xs uppercase tracking-widest transition-all hover:scale-105"
                style={{ border: '1px solid rgba(75,70,59,0.3)', color: '#d8c591', fontFamily: "'Manrope', sans-serif" }}>
                Acquérir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Privée — Glass panel */}
      <div className="col-span-12 md:col-span-5 md:mt-16">
        <div className="p-8 md:p-10 h-full flex flex-col justify-center" style={{ background: 'rgba(32,31,32,0.7)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(232,213,160,0.1)' }}>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d8c591' }}>Technologie Curator</span>
          <h3 className="mt-4" style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.1, color: '#e5e2e3' }}>Intelligence<br />Privée Onyx</h3>
          <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a', lineHeight: 1.7 }}>
            Un modèle d'IA localisé, déconnecté des réseaux publics, agissant comme le conservateur unique de votre patrimoine intellectuel.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 22, color: '#d8c591' }}>{jetonsBalance} JCC</span>
            <div className="h-px flex-1" style={{ background: 'rgba(75,70,59,0.2)' }} />
            <span className="material-symbols-outlined cursor-pointer hover:scale-110 transition-transform" style={{ color: '#d8c591' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>

    {/* Quote */}
    <div className="max-w-md ml-auto py-8">
      <span className="material-symbols-outlined mb-4" style={{ color: '#d8c591', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 24, color: '#e5e2e3', lineHeight: 1.4 }}>
        "La rareté n'est pas un manque, c'est une intention. Nous ne créons pas des produits, nous forgeons des héritages."
      </p>
      <div className="mt-6 flex items-center gap-3">
        <div className="w-8 h-px" style={{ background: '#d8c591' }} />
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>The Sovereign Manifesto</span>
      </div>
    </div>

    {/* Stats Bento */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2 p-8" style={{ background: '#1c1b1c', borderLeft: '1px solid rgba(232,213,160,0.1)' }}>
        <div className="flex justify-between items-start mb-8">
          <span className="material-symbols-outlined" style={{ color: '#d8c591' }}>verified_user</span>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Status: Actif</span>
        </div>
        <h4 style={{ fontFamily: "'Newsreader', serif", fontSize: 22, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#e5e2e3' }}>Sécurité Tier-Onyx</h4>
        <p className="mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#72727a', lineHeight: 1.6 }}>Validation multi-couches pour chaque transfert d'artefact.</p>
      </div>
      <div className="p-8 rounded-xl flex flex-col justify-end" style={{ background: '#1c1b1c' }}>
        <span style={{ fontFamily: "'Newsreader', serif", fontSize: 36, color: '#d8c591' }}>12</span>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#72727a' }}>Artefacts</span>
      </div>
      <div className="p-8 rounded-xl flex flex-col justify-end cursor-pointer group overflow-hidden relative" style={{ background: '#E8D5A0' }}>
        <div className="absolute -top-4 -right-4 w-24 h-24 border rounded-full group-hover:scale-150 transition-transform duration-500" style={{ borderColor: 'rgba(58,47,9,0.1)' }} />
        <span style={{ fontFamily: "'Newsreader', serif", fontSize: 28, color: '#3a2f09' }}>Join</span>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a2f09' }}>The Sovereign Circle</span>
      </div>
    </div>

    {/* Ambient glow */}
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
      <div className="absolute" style={{ top: '-10%', right: '-10%', width: '60%', height: '60%', background: 'rgba(232,213,160,0.03)', filter: 'blur(120px)', borderRadius: '50%' }} />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// OPPORTUNITIES & EVENTS
// ═══════════════════════════════════════════════════════════
const OpportunitiesPage = ({ opportunities }) => {
  const typeColors = { Booking: C.accent, Business: C.gold, Subvention: C.forest, Formation: C.blue, Emploi: '#8B1A4A' };
  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="opportunities-page">
      <header className="space-y-3 pt-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(232,213,160,0.08)', color: '#d8c591', border: '1px solid rgba(232,213,160,0.1)' }}>Opportunités</span>
          <div className="h-px flex-1" style={{ background: 'rgba(75,70,59,0.15)' }} />
        </div>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#e5e2e3' }}>
          {opportunities.length} <span style={{ fontStyle: 'italic', color: '#E8D5A0' }}>Offres</span>
        </h1>
      </header>
      {opportunities.length === 0 ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#2a2a2b' }}>work</span>
          <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#555' }}>Aucune opportunité pour le moment</p>
        </div>
      ) : opportunities.map((opp, idx) => (
        <div key={opp.id} className="py-6 fade-slide-in" style={{ animationDelay: `${idx * 60}ms`, borderBottom: '1px solid rgba(75,70,59,0.1)' }}>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: `${typeColors[opp.type] || '#555'}15`, color: typeColors[opp.type] || '#555' }}>{opp.type}</span>
          <h3 className="mt-3" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 20, color: '#e5e2e3' }}>{opp.title}</h3>
          <p className="mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a', lineHeight: 1.7 }}>{opp.description}</p>
        </div>
      ))}
    </div>
  );
};

const EventsPage = ({ events }) => (
  <div className="max-w-3xl mx-auto space-y-8" data-testid="events-page">
    <header className="space-y-3 pt-4">
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(232,213,160,0.08)', color: '#d8c591', border: '1px solid rgba(232,213,160,0.1)' }}>Agenda Souverain</span>
        <div className="h-px flex-1" style={{ background: 'rgba(75,70,59,0.15)' }} />
      </div>
      <h1 style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#e5e2e3' }}>
        Agenda <span style={{ fontStyle: 'italic', color: '#E8D5A0' }}>Culturel</span>
      </h1>
      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a' }}>{events.length} événement{events.length !== 1 ? 's' : ''} programmé{events.length !== 1 ? 's' : ''}</p>
    </header>
    {events.length === 0 ? (
      <div className="py-20 text-center">
        <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#2a2a2b' }}>event</span>
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#555' }}>Aucun événement programmé</p>
      </div>
    ) : events.map((evt, idx) => (
      <div key={evt.id} className="py-6 fade-slide-in" style={{ animationDelay: `${idx * 60}ms`, borderBottom: '1px solid rgba(75,70,59,0.1)' }}>
        <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 20, color: '#e5e2e3' }}>{evt.title}</h3>
        <p className="mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: '#72727a', lineHeight: 1.7 }}>{evt.description}</p>
        {evt.date && <p className="flex items-center gap-2 mt-3" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#555' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
          {new Date(evt.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>}
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════
// PRO SPACE LOGIN — Connexion par code
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// SETTINGS & PROFILE — FREK-ID, Langue, RGPD
// ═══════════════════════════════════════════════════════════
const LANGS = [
  { code: 'fr', label: 'Francais', flag: 'FR' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
  { code: 'pt', label: 'Portugues', flag: 'PT' },
];

const SettingsSection = ({ session, jetonsBalance, onLogout }) => {
  const [language, setLanguage] = useState(session?.language || 'fr');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    try {
      await axios.post(`${API}/pro/update-language`, { user_id: session.id, language: lang });
      const stored = JSON.parse(sessionStorage.getItem('cc2026_pro_session') || '{}');
      stored.language = lang;
      sessionStorage.setItem('cc2026_pro_session', JSON.stringify(stored));
      toast.success('Langue mise a jour');
    } catch { toast.error('Erreur'); }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/pro/export-data/${session.id}`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kiltikonet_data_${session.id}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Donnees exportees');
    } catch { toast.error('Erreur d\'export'); }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axios.post(`${API}/pro/delete-account`, { user_id: session.id, email: session.email });
      sessionStorage.removeItem('cc2026_pro_session');
      try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { /* silent */ }
      toast.success('Compte supprime');
      window.location.href = '/espace-pro/connexion';
    } catch { toast.error('Erreur de suppression'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-3 pb-16" data-testid="settings-section">
      {/* Profile Card — Stitch compact */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0e0e0f', border: '1px solid rgba(75,70,59,0.1)' }}>
        <div className="h-16 relative" style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.08), rgba(232,213,160,0.02))' }} />
        <div className="px-4 pb-4 -mt-8">
          <Avatar name={session?.name} size={56} ring style={{ border: `3px solid #0e0e0f` }} />
          <h2 className="mt-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: '#e5e2e3' }}>
            {session?.name || 'Utilisateur'}
          </h2>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>{session?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(232,213,160,0.08)', border: '1px solid rgba(232,213,160,0.2)' }}>
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 12 }}>bolt</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, color: '#E8D5A0' }}>{jetonsBalance} KT</span>
            </div>
            {session?.frek_id && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }} data-testid="frek-id-display">
                <span className="material-symbols-outlined" style={{ color: '#8b5cf6', fontSize: 12 }}>shield</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, color: '#8b5cf6' }}>ID Certifié</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Language Selector — Stitch compact */}
      <div className="rounded-xl p-4" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }} data-testid="language-selector">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 16 }}>language</span>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e5e2e3' }}>Langue</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => handleLanguageChange(l.code)}
              className="py-2 rounded-lg transition-all active:scale-95"
              style={{
                background: language === l.code ? '#E8D5A0' : '#0e0e0f',
                color: language === l.code ? '#0a0a0b' : '#72727a',
                border: `1px solid ${language === l.code ? '#E8D5A0' : 'rgba(75,70,59,0.15)'}`,
                fontFamily: "'Manrope', sans-serif",
              }}
              data-testid={`lang-${l.code}`}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{l.flag}</span>
              <br />
              <span style={{ fontSize: 9 }}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ecosystem Info */}
      <div className="rounded-xl p-4" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 16 }}>verified_user</span>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e5e2e3' }}>Ecosystème KT</h3>
        </div>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, lineHeight: 1.6, color: '#72727a' }}>
          Vos Kilti-Tokens sont valables pour l'ensemble des événements et services Culture Connect (CC2026, CC2027 et éditions suivantes).
        </p>
      </div>

      {/* RGPD Section — Stitch compact */}
      <div className="rounded-xl p-4" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }} data-testid="rgpd-section">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined" style={{ color: '#4A5D4E', fontSize: 16 }}>security</span>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e5e2e3' }}>Données personnelles</h3>
        </div>
        <div className="space-y-2">
          <button onClick={handleExportData} disabled={exporting}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-white/[0.02]"
            style={{ background: '#0e0e0f', border: '1px solid rgba(75,70,59,0.1)' }}
            data-testid="export-data-btn">
            <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 16 }}>download</span>
            <div className="flex-1">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: '#e5e2e3' }}>Exporter mes données</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#72727a' }}>Format JSON</p>
            </div>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-red-500/5"
            style={{ background: '#0e0e0f', border: '1px solid rgba(75,70,59,0.1)' }}
            data-testid="delete-account-btn">
            <span className="material-symbols-outlined" style={{ color: '#ffb4ab', fontSize: 16 }}>delete</span>
            <div className="flex-1">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: '#ffb4ab' }}>Supprimer mon compte</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#72727a' }}>Irréversible</p>
            </div>
          </button>
        </div>
      </div>

      {/* Logout — Stitch */}
      <button onClick={onLogout}
        className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-[#ffb4ab]/5"
        style={{ border: '1px solid rgba(255,180,171,0.2)', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, color: '#ffb4ab' }}
        data-testid="logout-btn">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
        Se déconnecter
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-xl p-5"
            style={{ background: '#1c1b1c', border: '1px solid rgba(255,180,171,0.2)' }} onClick={e => e.stopPropagation()}
            data-testid="delete-confirm-modal">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(255,180,171,0.1)' }}>
                <span className="material-symbols-outlined" style={{ color: '#ffb4ab', fontSize: 24 }}>warning</span>
              </div>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: '#e5e2e3', marginBottom: 8 }}>Supprimer votre compte ?</h3>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#72727a', marginBottom: 4 }}>
                Cette action est irréversible.
              </p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#ffb4ab', marginBottom: 20 }}>
                Les {jetonsBalance} KT acquis ne seront pas remboursés.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg transition-all active:scale-95"
                  style={{ background: '#0e0e0f', color: '#e5e2e3', border: '1px solid rgba(75,70,59,0.15)', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }}
                  data-testid="cancel-delete-btn">
                  Annuler
                </button>
                <button onClick={handleDeleteAccount} disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg transition-all active:scale-95"
                  style={{ background: '#ffb4ab', color: '#690005', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }}
                  data-testid="confirm-delete-btn">
                  {deleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProSpaceLogin = ({ onLogin } = {}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regPrenom, setRegPrenom] = useState('');
  const [regNom, setRegNom] = useState('');
  const [regEmail, setRegEmail] = useState('');
  // Détection des navigateurs in-app (Instagram, Facebook, Messenger, TikTok)
  // qui cassent fréquemment cookies/auth — on alerte l'utilisateur
  const [isInAppBrowser] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Instagram|FBAN|FBAV|FB_IAB|Messenger|TikTok|Snapchat|Line\//i.test(ua);
  });
  // FREK-ID login state
  const [frekMode, setFrekMode] = useState(false);
  const [frekId, setFrekId] = useState('');
  const [frekStep, setFrekStep] = useState(1); // 1=enter ID, 2=enter OTP
  const [frekHint, setFrekHint] = useState('');
  const [frekName, setFrekName] = useState('');
  const [frekOtp, setFrekOtp] = useState('');
  // WebAuthn modal state
  const [webauthnModal, setWebauthnModal] = useState(false);
  const [webauthnEmail, setWebauthnEmail] = useState('');
  const [webauthnStep, setWebauthnStep] = useState('email'); // email | verify | error
  const [silentBioAttempted, setSilentBioAttempted] = useState(false);

  // Silent biometric auto-trigger — if user has logged in before, try Face ID / Touch ID automatically
  useEffect(() => {
    if (silentBioAttempted) return;
    const savedEmail = localStorage.getItem('kk_last_login_email');
    if (!savedEmail) return;
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) return;
    setSilentBioAttempted(true);
    
    const trySilentBio = async () => {
      try {
        const { startAuthentication } = await import("@simplewebauthn/browser");
        const beginRes = await axios.post(`${API}/auth/webauthn/login/begin`, { email: savedEmail });
        if (!beginRes.data) return;
        const authResp = await startAuthentication({ optionsJSON: beginRes.data });
        const completeRes = await axios.post(`${API}/auth/webauthn/login/complete`, { email: savedEmail, credential: authResp }, { withCredentials: true });
        if (completeRes.data.success) {
          finishLogin(completeRes.data.profile);
        }
      } catch {
        // Silent fail — user will see normal login screen
      }
    };
    trySilentBio();
  }, [silentBioAttempted]);
  const finishLogin = (p) => {
    // Save email for silent biometric on next launch
    localStorage.setItem('kk_last_login_email', p.email);
    sessionStorage.setItem('cc2026_pro_session', JSON.stringify({
      id: p.id, email: p.email, name: p.full_name, image: p.image,
      type: p.profile_type, frek_id: p.frek_id, language: p.language || 'fr',
      verified: true, createdAt: Date.now(),
      first_login: p.first_login || false,
      welcome_kt: p.welcome_kt || 0,
    }));
    toast.success(`Bienvenue ${p.full_name || p.email} !`);
    window.location.hash = '';
    if (onLogin) { onLogin(); } else { navigate('/pro', { replace: true }); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regPrenom.trim() || !regNom.trim() || !regEmail.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        prenom: regPrenom.trim(),
        nom: regNom.trim(),
        email: regEmail.trim(),
      }, { withCredentials: true });
      if (res.data.success) {
        const p = res.data.profile;
        sessionStorage.setItem('cc2026_pro_session', JSON.stringify({
          id: p.id, email: p.email, name: p.full_name,
          type: p.profile_type, frek_id: p.frek_id, language: p.language || 'fr',
          verified: true, createdAt: Date.now(),
          first_login: true,
          welcome_kt: res.data.welcome_kt || 10,
        }));
        sessionStorage.removeItem('kk_splash_done');
        toast.success(`Bienvenue ${p.full_name} !`);
        navigate('/pro', { replace: true });
      }
    } catch (err) {
      const detail = (err.response?.data?.detail || '').toString();
      const status = err.response?.status;
      const lowered = detail.toLowerCase();
      // Compte existant — bascule automatiquement vers la connexion
      if (status === 400 && (lowered.includes('existe') || lowered.includes('already') || lowered.includes('exist'))) {
        toast.error('Ce compte existe déjà', {
          description: 'Bascule vers la connexion — clique "Recevoir mon lien" pour te connecter avec ' + regEmail.trim(),
          duration: 6000,
        });
        setShowRegister(false);
        setEmail(regEmail.trim());
      } else if (!err.response) {
        // Pas de réponse = problème réseau (souvent webview Instagram/FB)
        toast.error('Problème de connexion', {
          description: "Si tu es dans Instagram/Facebook, ouvre ce lien dans Safari ou Chrome (menu '⋯' → 'Ouvrir dans Safari')",
          duration: 8000,
        });
      } else {
        toast.error(detail || 'Erreur lors de l\'inscription', {
          description: status ? `Code ${status} — réessaie ou contacte le support` : undefined,
        });
      }
    } finally { setLoading(false); }
  };

  // Check if returning from Google OAuth or GitHub OAuth
  useEffect(() => {
    const hash = window.location.hash;
    if (hash?.includes('session_id=')) {
      const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
      if (sessionId) {
        setLoading(true);
        axios.post(`${API}/auth/google/session`, { session_id: sessionId }, { withCredentials: true })
          .then(res => {
            if (res.data.success) finishLogin(res.data.profile);
          })
          .catch(() => { toast.error('Erreur de connexion Google'); setLoading(false); });
      }
    }
    // GitHub OAuth callback
    if (hash?.includes('github_auth=success')) {
      const params = new URLSearchParams(hash.substring(1));
      const ghName = decodeURIComponent(params.get('name') || '');
      toast.success(`Bienvenue ${ghName} !`);
      window.location.hash = '';
      // Session cookie already set by backend, just verify via /auth/me
      axios.get(`${API}/auth/me`, { withCredentials: true })
        .then(res => {
          if (res.data.authenticated) {
            const s = res.data.session;
            sessionStorage.setItem('cc2026_pro_session', JSON.stringify({
              id: s.profile_id, email: s.email, name: s.name, type: s.profile_type,
              verified: true, createdAt: Date.now()
            }));
            navigate('/pro', { replace: true });
          }
        })
        .catch(() => {});
    }
  }, [navigate]);

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/pro/request-access`, { email });
      if (res.data.success) {
        if (res.data.bypass) {
          try {
            const verifyRes = await axios.post(`${API}/pro/verify-code`, { email, code: '000000' }, { withCredentials: true });
            if (verifyRes.data.success) { finishLogin(verifyRes.data.profile); return; }
          } catch {}
        }
        setLinkSent(true);
        toast.success('Lien de connexion envoye !', { description: 'Verifiez votre boite mail' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de connexion');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    // Clear any existing session before launching Google flow
    sessionStorage.removeItem('cc2026_pro_session');
    localStorage.removeItem('kk_last_login_email');
    const redirectUrl = window.location.origin + '/espace-pro/connexion';
    // Note : auth.emergentagent.com gère le prompt — on indique notre intent via query
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}&prompt=select_account`;
  };

  const handleGitHubLogin = () => {
    window.location.href = `${API}/auth/github`;
  };

  const handleFrekInitiate = async (e) => {
    e.preventDefault();
    if (!frekId.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/frek`, { frek_id: frekId.trim() });
      if (res.data.success) {
        setFrekHint(res.data.email_hint);
        setFrekName(res.data.name || '');
        if (res.data.bypass) {
          // Admin bypass — auto-verify with 000000
          try {
            const verifyRes = await axios.post(`${API}/auth/frek/verify`, { frek_id: frekId.trim(), code: '000000' }, { withCredentials: true });
            if (verifyRes.data.success) { finishLogin(verifyRes.data.profile); return; }
          } catch {}
        }
        setFrekStep(2);
        toast.success('Code envoye !', { description: `Verifiez ${res.data.email_hint}` });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Identifiant introuvable');
    } finally { setLoading(false); }
  };

  const handleFrekVerify = async (e) => {
    e.preventDefault();
    if (!frekOtp.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/frek/verify`, { frek_id: frekId.trim(), code: frekOtp.trim() }, { withCredentials: true });
      if (res.data.success) finishLogin(res.data.profile);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Code incorrect');
    } finally { setLoading(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><div className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.gold }} /></div>;
  }

  const LEGAL_CONTENT = {
    mentions: {
      title: 'Mentions Legales',
      content: `Editeur : Factory Maker Studio EURL\nSiege social : Martinique / Bruxelles\nRCS : Registre du Commerce et des Societes de Fort-de-France\nDirecteur de publication : Laurent Coeurvolan\n\nHebergement : Services cloud securises conformes RGPD.\n\nContact : contact@kiltikonet.fr\n\nLa plateforme KiltiKonet est operee par Factory Maker Studio EURL en tant que bras operationnel de l'ecosysteme Culture Connect. Toutes les transactions financieres liees aux Kilti-Tokens sont emises et gerees par cette entite.`
    },
    kt: {
      title: 'Conditions du Jeton KT',
      content: `Les Kilti-Tokens (KT) sont des unites de valeur prepayees emises par Factory Maker Studio EURL.\n\n1. Nature juridique : Les KT sont des bons d'achat numeriques a usage unique ou multiple au sein de l'ecosysteme KiltiKonet. Ils ne constituent ni une monnaie electronique au sens de la directive 2009/110/CE, ni un instrument financier.\n\n2. Non-remboursabilite : Les KT acquis ne sont pas remboursables en euros. L'achat est definitif.\n\n3. Validite etendue : Les KT sont utilisables pour l'ensemble des evenements et services de l'ecosysteme Culture Connect (CC2026, CC2027 et editions suivantes). Cette validite etendue est un engagement commercial de Factory Maker Studio EURL.\n\n4. Utilisation : Les KT permettent d'acceder a des contenus, soutenir des artistes, acheter des produits culturels et participer aux evenements de l'ecosysteme.\n\n5. Transferabilite : Les KT peuvent etre transferes entre utilisateurs au sein de la plateforme.\n\n6. Rachat commercant : Les commercants partenaires peuvent echanger les KT recus contre des euros au taux de rachat en vigueur (actuellement 1.35 EUR/KT).`
    },
    frekid: {
      title: 'Politique Identité Culturelle',
      content: `Votre identifiant culturel est un identifiant unique attribue a chaque utilisateur de la plateforme KiltiKonet.\n\n1. Finalite : Il permet l'identification securisee au sein de l'ecosysteme, le suivi du wallet Kilti-Tokens, et l'acces aux evenements CC2026.\n\n2. Donnees collectees : Email, nom, preferences culturelles, historique de transactions KT. Aucune donnee biometrique n'est collectee.\n\n3. Protection : Les donnees sont chiffrees et stockees conformement au RGPD (Reglement UE 2016/679). L'hebergement est realise au sein de l'Espace Economique Europeen.\n\n4. Droits : Conformement au RGPD, vous disposez d'un droit d'acces, de rectification, d'effacement, de portabilite et d'opposition. Exercez vos droits via la section "Parametres > Gerer mes donnees" ou par email a dpo@kiltikonet.fr.\n\n5. Conservation : Les donnees sont conservees pendant la duree d'utilisation du service et 3 ans apres la derniere activite.\n\n6. Sous-traitants : Stripe (paiements), hebergeur cloud (infrastructure). Tous conformes RGPD.`
    }
  };

  return (
    <div className="min-h-screen flex flex-col sovereign-depth" style={{ background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Legal Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setLegalModal(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl p-6"
            style={{ background: C.card, border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}
            data-testid="legal-modal">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ color: C.text }}>{LEGAL_CONTENT[legalModal]?.title}</h2>
              <button onClick={() => setLegalModal(null)} className="p-2 rounded-lg hover:bg-white/5" data-testid="close-legal-modal">
                <span className="material-symbols-outlined" style={{ color: '#72727a', fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: C.muted }}>
              {LEGAL_CONTENT[legalModal]?.content}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl mx-auto mb-5 flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.15), rgba(232,213,160,0.05))', border: `1px solid rgba(232,213,160,0.2)` }}>
              <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 28 }}>group</span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: C.gold }}>
                <span className="material-symbols-outlined" style={{ color: '#0a0a0b', fontSize: 10 }}>bolt</span>
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: C.text }}>
              <span style={{ background: `linear-gradient(135deg, #FFFFFF, ${C.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Espace Pro CC2026
              </span>
            </h1>
            <p className="text-sm mt-2" style={{ color: C.muted }}>
              Votre reseau professionnel culturel afro-caribeen
            </p>
          </div>

          {/* In-app browser warning (Instagram, Facebook, Messenger…) */}
          {isInAppBrowser && (
            <div
              className="mb-5 p-4 rounded-xl border flex items-start gap-3"
              style={{ background: 'rgba(255, 138, 101, 0.08)', borderColor: 'rgba(255, 138, 101, 0.35)' }}
              data-testid="inapp-browser-warning"
            >
              <span className="material-symbols-outlined" style={{ color: '#ff8a65', fontSize: 22, flexShrink: 0 }}>open_in_new</span>
              <div className="flex-1 text-xs leading-relaxed" style={{ color: '#ffd0bd' }}>
                <strong className="block text-sm mb-1">Ouvre dans Safari ou Chrome</strong>
                Le navigateur de cette app ne supporte pas les sessions sécurisées. Tape sur le menu <strong>« ⋯ »</strong> en haut à droite puis <strong>« Ouvrir dans Safari »</strong> (ou Chrome).
              </div>
            </div>
          )}

          {/* Registration Form */}
          {showRegister ? (
            <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="p-6">
                <h2 className="text-lg font-black mb-4 text-center" style={{ color: C.text }}>Creer un compte</h2>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1.5 font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Prenom</label>
                    <input type="text" placeholder="Prenom" value={regPrenom} onChange={e => setRegPrenom(e.target.value)}
                      className="w-full px-4 rounded-xl text-sm transition-all focus:ring-1" autoFocus
                      data-testid="register-prenom"
                      style={{ background: '#0a0a0b', border: `1px solid ${C.border}`, color: C.text, outline: 'none', minHeight: 48 }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Nom</label>
                    <input type="text" placeholder="Nom" value={regNom} onChange={e => setRegNom(e.target.value)}
                      className="w-full px-4 rounded-xl text-sm transition-all focus:ring-1"
                      data-testid="register-nom"
                      style={{ background: '#0a0a0b', border: `1px solid ${C.border}`, color: C.text, outline: 'none', minHeight: 48 }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Email</label>
                    <input type="email" placeholder="votre@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      className="w-full px-4 rounded-xl text-sm transition-all focus:ring-1"
                      data-testid="register-email"
                      style={{ background: '#0a0a0b', border: `1px solid ${C.border}`, color: C.text, outline: 'none', minHeight: 48 }} />
                  </div>
                  <button type="submit" disabled={loading || !regPrenom.trim() || !regNom.trim() || !regEmail.trim()}
                    className="w-full rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    data-testid="register-submit-btn"
                    style={{ background: C.gold, color: '#0a0a0b', minHeight: 48, opacity: loading ? 0.5 : 1 }}>
                    {loading ? 'Creation...' : "Creer mon compte"}
                  </button>
                </form>
                <button onClick={() => setShowRegister(false)} className="w-full text-center text-xs mt-4 underline transition-colors hover:text-white" style={{ color: C.dim }} data-testid="switch-to-login">
                  Deja un compte ? Se connecter
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="p-6">
              {/* Google OAuth Button */}
              <button onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:bg-gray-100 active:scale-[0.97] mb-3"
                data-testid="google-login-btn"
                style={{ background: '#FFFFFF', color: '#1f1f1f', border: '1px solid #dadce0', minHeight: 48 }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z" fill="#EA4335"/></svg>
                Continuer avec Google
              </button>

              {/* GitHub OAuth Button */}
              <button onClick={handleGitHubLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:bg-[#2a2a2b] active:scale-[0.97] mb-3"
                data-testid="github-login-btn"
                style={{ background: '#161b22', color: '#e5e2e3', border: '1px solid rgba(75,70,59,0.2)', minHeight: 48 }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                Continuer avec GitHub
              </button>

              {/* FREK ID Button */}
              <button onClick={() => { setFrekMode(true); setFrekStep(1); setFrekId(''); setFrekOtp(''); }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.97] mb-3"
                data-testid="frekid-login-btn"
                style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.12), rgba(232,213,160,0.04))', color: C.gold, border: `1px solid rgba(232,213,160,0.2)`, minHeight: 48 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.gold, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                Continuer avec mon identifiant
              </button>

              {/* WebAuthn is now silent — no visible button */}

              {/* FREK ID Login Modal */}
              {frekMode && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setFrekMode(false)}>
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                  <div className="relative w-full max-w-sm rounded-xl overflow-hidden"
                    style={{ background: C.card, border: `1px solid rgba(232,213,160,0.15)` }} onClick={e => e.stopPropagation()}
                    data-testid="frek-login-modal">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ color: C.gold, fontSize: 22, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                          <h2 className="text-base font-black" style={{ color: C.text }}>
                            {frekStep === 1 ? 'Connexion par identifiant' : 'Verification'}
                          </h2>
                        </div>
                        <button onClick={() => setFrekMode(false)} className="p-1.5 rounded-lg hover:bg-white/5" data-testid="close-frek-modal">
                          <span className="material-symbols-outlined" style={{ color: '#72727a', fontSize: 18 }}>close</span>
                        </button>
                      </div>

                      {frekStep === 1 ? (
                        <form onSubmit={handleFrekInitiate} className="space-y-4">
                          <div>
                            <label className="block text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                              Votre identifiant
                            </label>
                            <input type="text" placeholder="FREK-XXXX-YYYY" value={frekId} onChange={e => setFrekId(e.target.value.toUpperCase())}
                              className="w-full px-4 rounded-xl text-sm transition-all focus:ring-1"
                              data-testid="frek-id-input" autoFocus autoComplete="off"
                              style={{ background: '#0a0a0b', border: `1px solid rgba(232,213,160,0.15)`, color: C.gold, outline: 'none', minHeight: 48, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }} />
                            <p className="text-[10px] mt-1.5" style={{ color: C.dim }}>
                              Votre identifiant unique figure sur votre badge ou profil.
                            </p>
                          </div>
                          <button type="submit" disabled={loading || !frekId.trim()} className="w-full rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                            style={{ background: C.gold, color: '#0a0a0b', minHeight: 48, opacity: loading || !frekId.trim() ? 0.5 : 1 }} data-testid="frek-submit-btn">
                            {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0a0a0b' }} />Verification...</span> : 'Identifier'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleFrekVerify} className="space-y-4">
                          <div className="text-center py-2">
                            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                              style={{ background: 'rgba(232,213,160,0.1)', border: '1px solid rgba(232,213,160,0.2)' }}>
                              <span className="material-symbols-outlined" style={{ color: C.gold, fontSize: 18 }}>mail</span>
                            </div>
                            {frekName && <p className="text-sm font-bold" style={{ color: C.text }}>{frekName}</p>}
                            <p className="text-xs mt-1" style={{ color: C.muted }}>
                              Code envoye a <strong style={{ color: C.gold }}>{frekHint}</strong>
                            </p>
                          </div>
                          <input type="text" placeholder="000000" value={frekOtp} onChange={e => setFrekOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 rounded-xl text-center text-lg transition-all focus:ring-1"
                            data-testid="frek-otp-input" autoFocus autoComplete="one-time-code" inputMode="numeric"
                            style={{ background: '#0a0a0b', border: `1px solid rgba(232,213,160,0.15)`, color: C.gold, outline: 'none', minHeight: 52, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 8, fontWeight: 900 }} />
                          <button type="submit" disabled={loading || frekOtp.length < 6} className="w-full rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                            style={{ background: C.gold, color: '#0a0a0b', minHeight: 48, opacity: loading || frekOtp.length < 6 ? 0.5 : 1 }} data-testid="frek-verify-btn">
                            {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0a0a0b' }} />Verification...</span> : 'Valider'}
                          </button>
                          <button type="button" onClick={() => { setFrekStep(1); setFrekOtp(''); }} className="w-full text-xs underline transition-colors hover:text-white" style={{ color: C.dim }} data-testid="frek-back-btn">
                            Utiliser un autre identifiant
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: C.border }} />
                <span className="text-xs" style={{ color: C.muted }}>ou</span>
                <div className="flex-1 h-px" style={{ background: C.border }} />
              </div>

              {linkSent ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'rgba(232,213,160,0.1)', border: `1px solid rgba(232,213,160,0.2)` }}>
                    <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 20 }}>mail</span>
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: C.text }}>Verifiez votre boite mail</p>
                  <p className="text-sm" style={{ color: C.muted }}>
                    Un lien de connexion a ete envoye a <strong style={{ color: C.gold }}>{email}</strong>
                  </p>
                  <p className="text-[10px] mt-2" style={{ color: C.dim }}>Le lien expire dans 15 minutes</p>
                  <button type="button" onClick={() => setLinkSent(false)}
                    className="mt-3 text-xs underline transition-colors hover:text-white" style={{ color: C.dim }} data-testid="change-email-btn">
                    Changer d'adresse email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="pro-email" className="block text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Email professionnel
                    </label>
                    <input id="pro-email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 rounded-xl text-sm transition-all focus:ring-1"
                      data-testid="pro-email-input" autoComplete="email"
                      style={{ background: '#0a0a0b', border: `1px solid ${C.border}`, color: C.text, outline: 'none', minHeight: 48, fontFamily: "'DM Sans', sans-serif" }} />
                    <p className="text-[10px] mt-1.5" style={{ color: C.dim }}>
                      Nouveau ? Un compte sera cree automatiquement avec un identifiant unique.
                    </p>
                  </div>
                  <button type="submit" disabled={loading || !email} className="w-full rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: C.gold, color: '#0a0a0b', minHeight: 48, opacity: loading || !email ? 0.5 : 1 }} data-testid="pro-magic-link-btn">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0a0a0b' }} />
                        Envoi...
                      </span>
                    ) : "Recevoir mon lien de connexion"}
                  </button>
                </form>
              )}
            </div>

            {/* Trust Signals */}
            <div className="px-6 pb-5">
              <div className="flex items-center justify-center gap-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: C.gold }}>shield</span>
                  <span className="text-[10px] font-medium" style={{ color: C.dim }}>Chiffre E2E</span>
                </div>
                <div className="w-px h-3" style={{ background: C.border }} />
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: C.gold }}>public</span>
                  <span className="text-[10px] font-medium" style={{ color: C.dim }}>RGPD</span>
                </div>
                <div className="w-px h-3" style={{ background: C.border }} />
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: C.gold }}>bolt</span>
                  <span className="text-[10px] font-medium" style={{ color: C.dim }}>KT Ecosystem</span>
                </div>
              </div>
              <button onClick={() => setShowRegister(true)} className="w-full text-center text-xs mt-3 underline transition-colors hover:text-white" style={{ color: C.dim }} data-testid="switch-to-register">
                Pas de compte ? S'inscrire
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* WebAuthn Modal */}
      {webauthnModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setWebauthnModal(false)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#0e0e0e', border: '1px solid rgba(242,202,80,0.2)', boxShadow: '0 0 80px rgba(242,202,80,0.08)' }} onClick={e => e.stopPropagation()} data-testid="webauthn-modal">
            <div className="p-6 text-center">
              {/* Logo */}
              <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(242,202,80,0.08)', border: '2px solid rgba(242,202,80,0.2)' }}>
                <img src="/logo-kiltikonet.png" alt="Kiltikonet" className="w-14 h-14 object-contain" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              </div>

              {webauthnStep === 'email' && (
                <>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#f2ca50' }}>Confirme ton identite</h2>
                  <p className="text-xs text-gray-500 mb-5">Utilise ton Face ID ou Touch ID</p>
                  {/* Biometric icon animated */}
                  <div className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#22c55e', fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                  </div>
                  <input type="email" placeholder="Ton email" value={webauthnEmail} onChange={e => setWebauthnEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
                    style={{ background: '#0a0a0b', border: '1px solid rgba(242,202,80,0.15)', color: 'white' }}
                    data-testid="webauthn-email-input" autoComplete="email" autoFocus />
                  <button onClick={async () => {
                    if (!webauthnEmail.trim()) return;
                    setWebauthnStep('verify');
                    try {
                      setLoading(true);
                      const { startAuthentication } = await import("@simplewebauthn/browser");
                      const beginRes = await axios.post(`${API}/auth/webauthn/login/begin`, { email: webauthnEmail });
                      const authResp = await startAuthentication({ optionsJSON: beginRes.data });
                      const completeRes = await axios.post(`${API}/auth/webauthn/login/complete`, { email: webauthnEmail, credential: authResp }, { withCredentials: true });
                      if (completeRes.data.success) { setWebauthnModal(false); finishLogin(completeRes.data.profile); }
                    } catch (err) {
                      setWebauthnStep('error');
                      if (err?.response?.status === 404) toast.error('Aucun appareil biometrique enregistre pour cet email');
                      else if (err.name !== 'NotAllowedError') toast.error('Erreur biometrique');
                    } finally { setLoading(false); }
                  }}
                    disabled={!webauthnEmail.trim() || loading}
                    className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase mb-3"
                    style={{ background: loading ? '#333' : '#f2ca50', color: '#0a0a0b', opacity: !webauthnEmail.trim() ? 0.5 : 1 }}
                    data-testid="webauthn-verify-btn">
                    {loading ? 'Verification...' : 'Verifier'}
                  </button>
                </>
              )}

              {webauthnStep === 'verify' && (
                <>
                  <h2 className="text-lg font-bold mb-2" style={{ color: '#f2ca50' }}>Verification en cours</h2>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(242,202,80,0.1)', animation: 'pulse 1s ease-in-out infinite' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f2ca50', fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                  </div>
                  <p className="text-xs text-gray-500">Presente ton visage ou ton doigt...</p>
                </>
              )}

              {webauthnStep === 'error' && (
                <>
                  <h2 className="text-lg font-bold mb-2 text-red-400">Echec de verification</h2>
                  <p className="text-xs text-gray-500 mb-4">Verifie ton email ou reessaie</p>
                  <button onClick={() => setWebauthnStep('email')} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase mb-3"
                    style={{ background: 'rgba(242,202,80,0.1)', color: '#f2ca50', border: '1px solid rgba(242,202,80,0.2)' }}
                    data-testid="webauthn-retry-btn">Reessayer</button>
                </>
              )}

              <button onClick={() => setWebauthnModal(false)} className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                data-testid="webauthn-cancel-btn">Annuler — retour mot de passe</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legal & Confiance */}
      <footer className="py-6 px-4" data-testid="legal-footer">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
            <button onClick={() => setLegalModal('mentions')} className="text-[10px] font-medium transition-colors hover:text-white"
              style={{ color: C.dim }} data-testid="link-mentions-legales">
              Mentions Legales
            </button>
            <span className="text-[10px]" style={{ color: C.border }}>·</span>
            <button onClick={() => setLegalModal('kt')} className="text-[10px] font-medium transition-colors hover:text-white"
              style={{ color: C.dim }} data-testid="link-conditions-kt">
              Conditions KT
            </button>
            <span className="text-[10px]" style={{ color: C.border }}>·</span>
            <button onClick={() => setLegalModal('frekid')} className="text-[10px] font-medium transition-colors hover:text-white"
              style={{ color: C.dim }} data-testid="link-politique-frekid">
              Politique Identité
            </button>
            <span className="text-[10px]" style={{ color: C.border }}>·</span>
            <button onClick={() => navigate('/confidentialite')} className="text-[10px] font-medium transition-colors hover:text-white"
              style={{ color: C.dim }} data-testid="link-confidentialite">
              Confidentialite
            </button>
          </div>
          <div className="text-center">
            <p className="text-[9px]" style={{ color: '#333' }}>
              Factory Maker Studio EURL — Martinique / Bruxelles — kiltikonet.fr
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProSpaceDashboard;
