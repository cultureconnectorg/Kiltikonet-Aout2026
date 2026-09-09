import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, CreditCard, Wallet, ArrowRight, Shield, Loader2, Zap, Gift, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useIntersectionObserver, useCountdown, Reveal, AnimatedNumber } from '../hooks/useAnimations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PackCard = ({ pack, index, onBuy, loading, walletReady }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);
  const isVip = pack.id === 'vip';
  const isDiaspora = pack.id === 'diaspora';
  const isHighlight = isVip || isDiaspora;

  return (
    <div
      ref={ref}
      className="relative rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        background: '#FFFFFF',
        border: `2px solid ${isHovered ? (isVip ? '#C9A84C' : '#A65D47') : (isVip ? '#C9A84C40' : 'rgba(26,21,16,0.1)')}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? (isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)')
          : 'translateY(40px) scale(0.95)',
        transition: `opacity 0.6s ease-out ${index * 0.12}s, transform 0.6s ease-out ${index * 0.12}s, border-color 0.3s, box-shadow 0.3s`,
        boxShadow: isHovered ? '0 20px 40px rgba(26,21,16,0.12)' : '0 2px 8px rgba(26,21,16,0.04)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`pack-${pack.id}`}
    >
      {isVip && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C9A84C, #E8D48B, #C9A84C)' }} />
      )}

      {isVip && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#C9A84C' }}>
          <Star className="w-3 h-3" /> BEST VALUE
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300"
            style={{
              background: isHighlight ? '#C9A84C15' : '#A65D4715',
              transform: isHovered ? 'rotate(-8deg) scale(1.1)' : 'rotate(0)',
            }}
          >
            {isVip ? <Zap className="w-4 h-4" style={{ color: '#C9A84C' }} /> :
             isDiaspora ? <Gift className="w-4 h-4" style={{ color: '#C9A84C' }} /> :
             <Ticket className="w-4 h-4" style={{ color: '#A65D47' }} />}
          </div>
          <p className="text-sm font-semibold" style={{ color: isHighlight ? '#C9A84C' : '#A65D47' }}>
            Pack {pack.name}
          </p>
        </div>

        <div className="mb-1">
          <span className="text-4xl font-bold" style={{ color: '#1A1510' }}>{pack.jetons}</span>
          <span className="text-lg font-medium ml-1" style={{ color: '#6B6560' }}>Jetons</span>
        </div>

        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-xl font-bold" style={{ color: isHighlight ? '#C9A84C' : '#A65D47' }}>
            {pack.price_eur}&euro;
          </span>
          <span className="text-sm line-through" style={{ color: '#6B6560' }}>
            {pack.value_eur}&euro;
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#A65D4712', color: '#A65D47' }}
          >
            -{pack.savings_pct}%
          </span>
        </div>

        <button
          onClick={() => onBuy(pack.id)}
          disabled={!!loading}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 text-white group"
          style={{
            background: isHighlight
              ? 'linear-gradient(135deg, #C9A84C, #B8973B)'
              : 'linear-gradient(135deg, #A65D47, #8B4D3B)',
            opacity: loading === pack.id ? 0.7 : 1,
          }}
          data-testid={`buy-pack-${pack.id}`}
        >
          {loading === pack.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              Acheter
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function JetonsPage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badgeId, setBadgeId] = useState('');
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [heroVisible, setHeroVisible] = useState(false);

  const countdown = useCountdown('2026-05-20T00:00:00');

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    fetch(`${API_URL}/api/jetons/packs`).then(r => r.json()).then(d => { setPacks(d.packs || []); setLoading(false); }).catch(() => setLoading(false));
    return () => clearTimeout(timer);
  }, []);

  const lookupWallet = async () => {
    if (!badgeId.trim()) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jetons/wallet/${badgeId.trim()}`);
      if (res.ok) setWallet(await res.json());
      else { setWallet(null); toast.error('Badge non trouvé'); }
    } catch { toast.error('Erreur connexion'); }
    setWalletLoading(false);
  };

  const buyPack = async (packId) => {
    if (!wallet?.badge_id) {
      toast.error("Entrez votre Badge ID d'abord pour acheter");
      return;
    }
    setCheckoutLoading(packId);
    try {
      const res = await fetch(`${API_URL}/api/jetons/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_id: wallet.badge_id, pack: packId, origin_url: window.location.origin }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error('Erreur: ' + (data.detail || 'checkout failed'));
    } catch { toast.error('Erreur de connexion'); }
    setCheckoutLoading('');
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20" style={{ background: '#F4F0E8' }} data-testid="jetons-page">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24" style={{ background: '#1A1510' }}>
        {/* Background glow */}
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 50%, #A65D4740 0%, transparent 50%), radial-gradient(circle at 70% 50%, #C9A84C30 0%, transparent 50%)' }} />

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(201,168,76,0.15)',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            <Ticket className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <span className="text-sm font-medium" style={{ color: '#C9A84C' }}>
              Unité interne CC2026
            </span>
          </div>

          <h1
            className="font-serif text-4xl sm:text-5xl lg:text-6xl mb-4"
            style={{
              color: '#F4F0E8',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-30px)',
              transition: 'opacity 0.6s ease-out 0.15s, transform 0.6s ease-out 0.15s',
            }}
          >
            Jetons CC
          </h1>

          <p
            className="text-lg max-w-xl mx-auto mb-2"
            style={{
              color: 'rgba(244,240,232,0.7)',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s',
            }}
          >
            Jetons internes Culture Connect 2026
          </p>

          <p
            className="text-sm mb-8"
            style={{
              color: 'rgba(244,240,232,0.4)',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-out 0.45s',
            }}
          >
            Unité d'usage interne. La qualification juridique et économique reste distincte de l'affichage applicatif.
          </p>

          {/* Countdown mini */}
          <div
            className="inline-flex items-center gap-4 px-5 py-3 rounded-xl"
            style={{
              background: 'rgba(244,240,232,0.05)',
              border: '1px solid rgba(244,240,232,0.1)',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: 'opacity 0.6s ease-out 0.55s, transform 0.6s ease-out 0.55s',
            }}
          >
            {[
              { val: countdown.days, label: 'J' },
              { val: countdown.hours, label: 'H' },
              { val: countdown.minutes, label: 'M' },
            ].map((t, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-bold" style={{ color: '#C9A84C' }}>
                  {String(t.val).padStart(2, '0')}
                </div>
                <div className="text-xs" style={{ color: 'rgba(244,240,232,0.4)' }}>{t.label}</div>
              </div>
            ))}
            <span className="text-xs" style={{ color: 'rgba(244,240,232,0.5)' }}>avant CC2026</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Wallet Lookup */}
        <Reveal direction="up" delay={0.1}>
          <div
            className="p-6 sm:p-8 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,21,16,0.08)', boxShadow: '0 4px 20px rgba(26,21,16,0.04)' }}
          >
            <h2 className="text-xl font-serif mb-4 flex items-center gap-3" style={{ color: '#1A1510' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#C9A84C15' }}>
                <Wallet size={20} style={{ color: '#C9A84C' }} />
              </div>
              Mon solde de jetons
            </h2>
            <div className="flex gap-3">
              <input
                data-testid="badge-id-input"
                type="text"
                placeholder="Entrez votre Badge ID (ex: CC26-VIP-XXXXX)"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupWallet()}
                className="flex-1 px-4 py-3 rounded-xl text-sm transition-all duration-300 focus:outline-none"
                style={{ background: '#F4F0E8', border: '1.5px solid rgba(26,21,16,0.1)', color: '#1A1510' }}
              />
              <button
                data-testid="lookup-wallet-btn"
                onClick={lookupWallet}
                disabled={walletLoading}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:opacity-90"
                style={{ background: '#A65D47' }}
              >
                {walletLoading ? <Loader2 size={16} className="animate-spin" /> : 'Voir'}
              </button>
            </div>
            {wallet && (
              <div
                className="mt-5 p-6 rounded-xl text-center"
                style={{ background: 'linear-gradient(135deg, #1A1510, #2A2520)', animation: 'fadeSlideUp 0.5s ease-out' }}
                data-testid="wallet-display"
              >
                <p className="text-xs mb-2" style={{ color: 'rgba(244,240,232,0.5)' }}>{wallet.prenom} {wallet.nom}</p>
                <p className="text-5xl font-bold mb-1" style={{ color: '#C9A84C' }}>{wallet.jetons_solde}</p>
                <p className="text-sm" style={{ color: 'rgba(244,240,232,0.6)' }}>Jetons CC ({wallet.valeur_eur}&euro;)</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Packs */}
        <div>
          <Reveal direction="left" delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: '#A65D47' }} />
              <h2 className="font-serif text-2xl" style={{ color: '#1A1510' }}>
                Packs Disponibles
              </h2>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(166,93,71,0.1)', color: '#A65D47' }}>
                {packs.length}
              </span>
            </div>
          </Reveal>

          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#A65D47' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {packs.map((pack, i) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  index={i}
                  onBuy={buyPack}
                  loading={checkoutLoading}
                  walletReady={!!wallet}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <Reveal direction="up" delay={0.1}>
          <div
            className="p-6 rounded-2xl flex items-start gap-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,21,16,0.08)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#C9A84C15' }}>
              <Shield size={18} style={{ color: '#C9A84C' }} />
            </div>
            <div className="space-y-1.5 text-sm" style={{ color: '#6B6560' }}>
              <p><strong style={{ color: '#1A1510' }}>Paiement sécurisé par Stripe</strong></p>
              <p>Les Jetons CC sont présentés ici comme une unité interne d'usage, pas comme une monnaie.</p>
              <p>Les conditions de conversion, de report entre éditions et de rachat marchand doivent être confirmées avant toute nouvelle ouverture commerciale.</p>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}