import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import { Wallet, Zap, Wrench, Gauge, ShoppingCart, MessageSquare, CalendarDays, TrendingUp, Bell, Activity } from "lucide-react";

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const API = process.env.REACT_APP_BACKEND_URL;

export default function OrbitalMenu({ onSelect, balance, frekId }) {
  const menuItems = [
    { id: "wallet", label: "WALLET", icon: Wallet, pos: "top-0 left-0 translate-x-[40px] translate-y-[40px]" },
    { id: "shop", label: "SHOP", icon: ShoppingCart, pos: "top-0 right-0 -translate-x-[40px] translate-y-[40px]" },
    { id: "feed", label: "FEED", icon: Zap, pos: "top-1/2 left-0 -translate-x-[20px] -translate-y-1/2" },
    { id: "inbox", label: "INBOX", icon: MessageSquare, pos: "top-1/2 right-0 translate-x-[20px] -translate-y-1/2" },
    { id: "build", label: "BUILD", icon: Wrench, pos: "bottom-0 left-0 translate-x-[40px] -translate-y-[40px]" },
    { id: "cockpit", label: "COCKPIT", icon: Gauge, pos: "bottom-0 right-0 -translate-x-[40px] -translate-y-[40px]" },
    { id: "agenda", label: "AGENDA", icon: CalendarDays, pos: "top-0 left-1/2 -translate-x-1/2 -translate-y-[10px]" },
  ];

  // Double-tap detection
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const controls = useAnimation();
  const particleControls = useAnimation();
  const [showParticles, setShowParticles] = useState(false);

  const handleCenterTap = useCallback(() => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (diff < 300 && diff > 0) {
      // Double tap — Intelligence active → Feed
      clearTimeout(tapTimeoutRef.current);
      if (prefersReducedMotion) { onSelect("feed"); return; }
      setShowParticles(true);
      particleControls.start({ opacity: [0, 1, 0], pathLength: [0, 1] }, { duration: 0.6 });
      controls.start({ scale: [1, 0], opacity: [1, 0] }, { duration: 0.2, delay: 0.5 }).then(() => {
        onSelect("feed");
        controls.set({ scale: 1, opacity: 1 });
        setShowParticles(false);
      });
    } else {
      // Single tap — wait to confirm it's not a double tap
      tapTimeoutRef.current = setTimeout(() => {
        if (!prefersReducedMotion) {
          controls.start({ scale: [1.15, 0.95, 1] }, { duration: 0.2 });
        }
        onSelect("brain");
      }, 310);
    }
  }, [onSelect, controls, particleControls]);

  // Init controls on mount
  useEffect(() => {
    controls.set({ scale: 1, opacity: 1 });
  }, [controls]);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleTouchEnd = useCallback((e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 50) return; // too short
    if (absDx > absDy) {
      onSelect(dx > 0 ? "feed" : "inbox"); // left=feed, right=inbox
    } else {
      onSelect(dy > 0 ? "wallet" : "build"); // down=wallet, up=build
    }
  }, [onSelect]);

  // Particle lines from center to each module
  const particleLines = [
    { angle: -135 }, { angle: -45 }, { angle: -180 }, { angle: 0 }, { angle: 135 }, { angle: 45 },
  ];

  // Desktop panel — load frek profile for Cultural Impact Score
  const [profileData, setProfileData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [unreadInbox, setUnreadInbox] = useState(0);

  useEffect(() => {
    if (!frekId) return;
    fetch(`${API}/api/frek/profile/${frekId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfileData(d); })
      .catch(() => {});
    fetch(`${API}/api/pro/feed?page=1&limit=3`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.posts) setRecentActivity(d.posts.slice(0, 3)); })
      .catch(() => {});
  }, [frekId]);

  // Poll unread messages for inbox badge
  useEffect(() => {
    const checkUnread = () => {
      fetch(`${API}/api/messages/conversations`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { conversations: [] })
        .then(d => {
          const total = (d.conversations || []).reduce((acc, c) => acc + (c.unread || 0), 0);
          setUnreadInbox(total);
        })
        .catch(() => {});
    };
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-full flex items-center justify-center z-10 p-4 lg:pr-[280px]" data-testid="orbital-menu"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Header — CC2026, JCC, Profil */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }} data-testid="omega-header">
        {/* Back to site — discreet */}
        <motion.div
          onClick={() => { window.location.href = '/'; }}
          whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.2)" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          data-testid="back-to-site-orbital"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>language</span>
          <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Site</span>
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05, borderColor: "rgba(242, 202, 80, 0.4)" }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect("accreditation")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all"
            style={{ background: 'rgba(242,202,80,0.1)', border: '1px solid rgba(242,202,80,0.2)' }} data-testid="omega-cc2026-badge">
            <span className="font-mono text-[9px] tracking-widest font-bold uppercase" style={{ color: '#f2ca50' }}>CC2026</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, borderColor: "rgba(242, 202, 80, 0.4)" }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect("wallet")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all"
            style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }} data-testid="omega-jcc-badge">
            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#f2ca50', boxShadow: '0 0 8px #f2ca50' }} />
            <span className="font-mono text-[9px] tracking-widest font-bold" style={{ color: 'rgba(242,202,80,0.8)' }}>{balance ?? 0} JCC</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, borderColor: "rgba(242, 202, 80, 0.4)" }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect("frek_id")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all"
            style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }} data-testid="omega-frek-badge">
            <span className="font-mono text-[9px] tracking-widest font-bold uppercase" style={{ color: 'rgba(242,202,80,0.8)' }}>Profil</span>
          </motion.div>
        </div>
      </header>

      {/* Orbital Path Visual */}
      <div className="absolute w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(242,202,80,0.3)' }} data-testid="orbital-ring" />
      <div className="absolute w-[360px] h-[360px] sm:w-[410px] sm:h-[410px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(242,202,80,0.1)' }} data-testid="orbital-ring-outer" />

      {/* Rotating Menu */}
      <div className="absolute w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] omega-animate-orbit flex items-center justify-center">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
              className={`absolute flex flex-col items-center gap-2 group cursor-pointer omega-animate-counter-orbit z-20 ${item.pos}`}
              onClick={() => onSelect(item.id)} data-testid={`orbital-item-${item.id}`}>
              <motion.div whileHover={{ scale: 1.1, borderColor: "rgba(242, 202, 80, 0.6)" }} whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full omega-glass flex items-center justify-center shadow-lg transition-all relative"
                style={{ border: '1px solid rgba(242,202,80,0.2)' }}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#f2ca50' }} />
                {item.id === 'inbox' && unreadInbox > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: '#f2ca50', boxShadow: '0 0 8px rgba(242,202,80,0.6)' }} data-testid="inbox-unread-badge" />
                )}
              </motion.div>
              <span className="text-[7px] sm:text-[8px] tracking-[0.2em] uppercase group-hover:text-[#f2ca50] transition-colors"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'rgb(156,163,175)' }}>{item.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Double-tap particle lines */}
      {showParticles && (
        <svg className="absolute z-40 pointer-events-none" width="400" height="400" viewBox="-200 -200 400 400">
          {particleLines.map((p, i) => {
            const rad = (p.angle * Math.PI) / 180;
            const x2 = Math.cos(rad) * 180;
            const y2 = Math.sin(rad) * 180;
            return (
              <motion.line key={i} x1="0" y1="0" x2={x2} y2={y2}
                stroke="#f2ca50" strokeWidth="1"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={particleControls}
                transition={{ duration: 0.6, delay: i * 0.05 }} />
            );
          })}
        </svg>
      )}

      {/* Central Node — Logo Kiltikonet */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={controls}
        className="relative z-30 cursor-pointer group"
        onClick={handleCenterTap}
        data-testid="orbital-brain-node"
        style={{ willChange: 'transform' }}
      >
        {/* Glow pulse */}
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full -z-10"
          style={{ filter: 'blur(60px)', background: '#f2ca50' }}
        />
        {/* Logo container with breathing + rotation */}
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.03, 1], rotate: [0, 360] }}
          transition={prefersReducedMotion ? {} : {
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
          }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.15, transition: { type: "spring", stiffness: 300, damping: 20 } }}
          className="w-32 h-32 rounded-full flex items-center justify-center omega-glass shadow-2xl overflow-hidden"
          style={{ border: '2px solid rgba(242,202,80,0.3)' }}
        >
          <img src="/logo-kiltikonet.png" alt="Kiltikonet" className="w-24 h-24 object-contain rounded-xl" draggable={false} />
        </motion.div>
        {/* Outer spinning ring */}
        <div className="absolute -inset-2 rounded-full" style={{ border: '1px solid rgba(242,202,80,0.15)', animation: prefersReducedMotion ? 'none' : 'spin 25s linear infinite' }} />
      </motion.div>

      {/* Desktop Context Panel — lg: only */}
      <div className="hidden lg:flex fixed right-0 top-0 bottom-0 w-[280px] flex-col z-40 overflow-y-auto" style={{ background: 'rgba(10,10,11,0.95)', borderLeft: '1px solid rgba(242,202,80,0.08)', scrollbarWidth: 'thin' }} data-testid="orbital-desktop-panel">
        <div className="p-5 pt-24 space-y-5">
          {/* Solde KT + CC */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
            <div className="text-[9px] text-gray-500 tracking-widest uppercase mb-3">Wallet</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">KT</span>
              <span className="text-lg font-bold font-mono" style={{ color: '#f2ca50' }}>{profileData?.balance_kt ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">JCC</span>
              <span className="text-lg font-bold font-mono" style={{ color: '#f2ca50' }}>{balance ?? 0}</span>
            </div>
          </div>

          {/* Cultural Impact Score */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f2ca50' }} />
              <span className="text-[9px] text-gray-500 tracking-widest uppercase">Impact Culturel</span>
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: '#f2ca50' }}>{profileData?.cultural_impact_score ?? profileData?.impact_score ?? 0}</div>
            <div className="w-full h-1 rounded-full mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, profileData?.cultural_impact_score ?? 0)}%`, background: '#f2ca50' }} />
            </div>
          </div>

          {/* Dernière activité */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5" style={{ color: '#f2ca50' }} />
              <span className="text-[9px] text-gray-500 tracking-widest uppercase">Activite recente</span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-[10px] text-gray-600">Aucune activite</p>
            ) : recentActivity.map((a, i) => (
              <div key={i} className="py-2 border-b border-white/5 last:border-0">
                <div className="text-[10px] text-gray-400 line-clamp-2">{a.content?.slice(0, 80) || a.title?.slice(0, 80)}</div>
                <div className="text-[8px] text-gray-600 mt-0.5">{a.author_name || ''}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <button onClick={() => onSelect("wallet")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-gray-400 hover:text-[#f2ca50] transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }} data-testid="panel-wallet-btn">
              <Wallet className="w-4 h-4" /> Mon wallet
            </button>
            <button onClick={() => onSelect("feed")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-gray-400 hover:text-[#f2ca50] transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }} data-testid="panel-feed-btn">
              <Zap className="w-4 h-4" /> Feed
            </button>
            <button onClick={() => onSelect("brain")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-gray-400 hover:text-[#f2ca50] transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }} data-testid="panel-brain-btn">
              <Bell className="w-4 h-4" /> Laurent.ia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
