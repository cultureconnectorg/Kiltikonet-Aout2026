import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bolt, MessageSquare, Share2, MoreVertical, Brain, Wallet, ShieldCheck, Zap, Settings, Gauge, Coins, Flag, Link, X } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContentDisplay({ onBack, onSelectBrainChat, onNavigate, authorFrekId, postId }) {
  const [activeNav, setActiveNav] = useState("brain");
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    if (!postId) { setIsLiked(!isLiked); setLikesCount(prev => isLiked ? prev - 1 : prev + 1); return; }
    setLikeLoading(true);
    try {
      const r = await fetch(`${API}/api/feed/posts/${postId}/eclair`, {
        method: 'POST', credentials: 'include',
      });
      if (r.ok) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      } else {
        const err = await r.json().catch(() => ({}));
        if (err.detail?.includes('insuffisant') || err.detail?.includes('Solde')) {
          alert('Solde KT insuffisant — recharge ton wallet');
        }
      }
    } catch { /* silent */ }
    setLikeLoading(false);
  }, [isLiked, postId, likeLoading]);

  const handleFollow = useCallback(async () => {
    if (followLoading) return;
    const targetFrek = authorFrekId || '';
    if (!targetFrek) return;
    setFollowLoading(true);
    try {
      const r = await fetch(`${API}/api/user/follow`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_frek_id: targetFrek }),
      });
      if (r.ok) {
        const d = await r.json();
        setIsFollowed(d.following);
      }
    } catch { /* silent */ }
    setFollowLoading(false);
  }, [authorFrekId, followLoading]);

  const handleShare = () => {
    const shareData = { title: "Ben ARRIS - Kiltikonet", text: "Check out this content on Kiltikonet!", url: window.location.href };
    if (navigator.share) { navigator.share(shareData).catch(() => {}); }
    else { navigator.clipboard.writeText(window.location.href).catch(() => {}); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setMoreOpen(false);
  };

  const navItems = [
    { id: "brain", label: "LAURENT.IA", icon: Brain },
    { id: "quick_feed", label: "QUICK FEED", icon: Zap },
    { id: "inbox", label: "INBOX", icon: MessageSquare },
    { id: "wallet", label: "WALLET", icon: Wallet },
    { id: "frek-id", label: "Identité", icon: ShieldCheck },
    { id: "cockpit", label: "COCKPIT", icon: Gauge },
    { id: "admin", label: "ADMIN", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden" data-testid="content-display">
      <main className="relative flex-1 h-full overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1920" alt="Ben Arris" className="w-full h-full object-cover grayscale-[0.2] sepia-[0.1] brightness-[0.7]" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent opacity-40" />
        </div>

        <div className="absolute top-6 left-6 right-6 sm:top-10 sm:left-10 sm:right-10 z-20 flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] tracking-[0.4em] text-gray-400 uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Producteur</span>
              <span className="italic text-xl sm:text-2xl leading-tight" style={{ fontFamily: "'Noto Serif', serif", color: '#f2ca50', textShadow: '0 2px 8px rgba(242,202,80,0.3)' }}>Ben ARRIS</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFollow}
              className={`px-4 py-1.5 sm:px-6 sm:py-2 border rounded-full text-[8px] sm:text-[10px] tracking-[0.2em] transition-all ${isFollowed ? "text-black" : "hover:text-black"}`}
              style={isFollowed ? { background: '#f2ca50', borderColor: '#f2ca50', fontFamily: "'Space Grotesk', sans-serif" } : { background: 'rgba(242,202,80,0.1)', borderColor: 'rgba(242,202,80,0.3)', color: '#f2ca50', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {isFollowed ? "FOLLOWING" : "FOLLOW"}
            </motion.button>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onNavigate("wallet")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#f2ca50', boxShadow: '0 0 8px #f2ca50' }} />
              <span className="font-mono text-[9px] tracking-widest font-bold" style={{ color: 'rgba(242,202,80,0.8)' }}>24 JCC</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onNavigate("frek_id")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer transition-all" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
              <span className="font-mono text-[9px] tracking-widest font-bold uppercase" style={{ color: 'rgba(242,202,80,0.8)' }}>ID: 99421</span>
            </motion.div>
          </div>
        </div>

        <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-8 sm:gap-12">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleLike} className="flex flex-col items-center gap-2 cursor-pointer group">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center omega-glass shadow-lg transition-all ${isLiked ? "shadow-[0_0_15px_rgba(242,202,80,0.5)]" : ""}`} style={{ border: isLiked ? '1px solid #f2ca50' : '1px solid rgba(255,255,255,0.1)' }}>
              <Bolt className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${isLiked ? "fill-[#f2ca50]" : ""}`} style={{ color: isLiked ? '#f2ca50' : 'rgba(242,202,80,0.4)' }} />
            </div>
            <span className="text-[9px] sm:text-[10px] tracking-[0.2em] transition-colors" style={{ color: isLiked ? '#f2ca50' : 'rgb(156,163,175)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {(likesCount / 1000).toFixed(1)}K
            </span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onSelectBrainChat} className="flex flex-col items-center gap-2 cursor-pointer group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center"><MessageSquare className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6 group-hover:text-[#f2ca50]" /></div>
            <span className="text-[9px] sm:text-[10px] tracking-[0.2em] text-gray-400 group-hover:text-[#f2ca50] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.2K</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleShare} className="flex flex-col items-center gap-2 cursor-pointer group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center"><Share2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#f2ca50' }} /></div>
            <span className="text-[9px] sm:text-[10px] tracking-[0.2em] text-gray-400 uppercase group-hover:text-[#f2ca50] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SHARE</span>
          </motion.div>
          <div className="relative">
            <motion.div whileHover={{ scale: 1.2, rotate: 90 }} whileTap={{ scale: 0.8 }} onClick={() => setMoreOpen(!moreOpen)} className="mt-6 sm:mt-10 opacity-50 hover:opacity-100 transition-all cursor-pointer" data-testid="content-more-btn">
              <MoreVertical className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </motion.div>
            <AnimatePresence>
              {moreOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute right-0 top-full mt-2 rounded-xl p-2 min-w-[140px] z-50" style={{ background: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => { setMoreOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] text-gray-300 hover:bg-white/5 uppercase tracking-widest" data-testid="content-report-btn"><Flag className="w-3 h-3" />Signaler</button>
                  <button onClick={handleShare} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] text-gray-300 hover:bg-white/5 uppercase tracking-widest" data-testid="content-share-menu"><Share2 className="w-3 h-3" />Partager</button>
                  <button onClick={handleCopyLink} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] text-gray-300 hover:bg-white/5 uppercase tracking-widest" data-testid="content-copy-link"><Link className="w-3 h-3" />Copier lien</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-32 left-6 sm:left-10 z-20 max-w-[240px] sm:max-w-lg">
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <span className="px-2 py-0.5 text-[7px] sm:text-[10px] tracking-widest rounded-sm" style={{ background: 'rgba(242,202,80,0.2)', color: '#f2ca50', border: '1px solid rgba(242,202,80,0.2)', fontFamily: "'Space Grotesk', sans-serif" }}>BRUT</span>
            <span className="text-gray-400 text-[8px] sm:text-[11px] tracking-widest uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>GHANA</span>
          </div>
          <h1 className="italic text-2xl sm:text-5xl text-white leading-tight mb-2 sm:mb-4" style={{ fontFamily: "'Noto Serif', serif", textShadow: '0 2px 10px rgba(242,202,80,0.3)' }}>
            La culture prends un virage
          </h1>
          <p className="text-gray-400 text-[10px] sm:text-sm leading-relaxed max-w-sm opacity-80" style={{ textShadow: '0 1px 5px rgba(242,202,80,0.2)' }}>
            Synchronizing the alchemy of digital gestures with institutional precision.
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onSelectBrainChat} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full omega-glass flex items-center justify-center" style={{ border: '1px solid rgba(242,202,80,0.6)', boxShadow: '0 0 30px rgba(242,202,80,0.2)' }}>
            <div className="flex flex-col items-center">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 mb-1" style={{ color: '#f2ca50', fill: '#f2ca50' }} />
              <span className="font-bold text-[7px] sm:text-[8px] tracking-widest" style={{ color: '#f2ca50', fontFamily: "'Space Grotesk', sans-serif" }}>CVL</span>
            </div>
            <div className="absolute -inset-2 rounded-full animate-pulse" style={{ border: '1px solid rgba(242,202,80,0.2)' }} />
          </motion.button>
        </div>

        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-8 items-center">
          <div className="w-[1px] h-16 relative" style={{ background: 'rgba(242,202,80,0.2)' }}>
            <div className="absolute top-0 left-0 w-full h-6" style={{ background: '#f2ca50' }} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f2ca50', boxShadow: '0 0 8px #f2ca50' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </main>

      <aside className="hidden lg:flex w-80 flex-col h-full z-50" style={{ background: '#0e0e0e', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="p-10 flex flex-col items-center mb-12">
          <div className="w-24 h-24 rounded-xl omega-glass flex items-center justify-center mb-6 overflow-hidden" style={{ border: '1px solid rgba(242,202,80,0.3)' }}>
            <div className="flex flex-col items-center">
              <Coins className="w-8 h-8 mb-1" style={{ color: '#f2ca50', fill: '#f2ca50' }} />
              <span className="italic font-bold text-[8px] tracking-widest text-center uppercase" style={{ color: '#f2ca50', fontFamily: "'Noto Serif', serif" }}>LAURENT.IA</span>
            </div>
          </div>
          <p className="text-[10px] tracking-[0.4em] text-gray-500 uppercase mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>L'Espace Pro</p>
          <div className="mt-6 px-4 py-1.5 rounded-full" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.2)' }}>
            <span className="text-[9px] tracking-[0.2em]" style={{ color: '#f2ca50', fontFamily: "'Space Grotesk', sans-serif" }}>SYSTEM STATUS: OPTIMIZED</span>
          </div>
        </div>

        <nav className="flex flex-col flex-grow">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.id} whileHover={{ x: 5, backgroundColor: "rgba(242, 202, 80, 0.05)" }} whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveNav(item.id); onNavigate(item.id); }}
                className={`flex items-center gap-6 py-5 px-10 transition-all text-left ${activeNav === item.id ? "font-bold" : "text-gray-500 hover:text-[#f2ca50]"}`}
                style={activeNav === item.id ? { color: '#f2ca50', borderLeft: '2px solid #f2ca50', background: 'rgba(242,202,80,0.05)' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-[0.4em] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="mt-auto p-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] tracking-widest text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BUILDER CORE</span>
              <span className="text-[9px] text-gray-500 uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Uptime: 1,242h</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
