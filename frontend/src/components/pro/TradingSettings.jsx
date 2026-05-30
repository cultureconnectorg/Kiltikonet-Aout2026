// ═══════════════════════════════════════════════════════════
// ÉCRAN 14 — PARAMÈTRES TRADING KT
// Configuration du trading, alertes, limites, auto-trading,
// et gestion des risques pour les Kilti-Tokens
// Design System: Sovereign Onyx · Material Symbols Only
// ═══════════════════════════════════════════════════════════
import React, { useState } from 'react';

const G = '#E8D5A0';

const TradingSettings = ({ session }) => {
  // ─── State ─────────────────────────────────────────────
  const [autoTrading, setAutoTrading] = useState(false);
  const [limitOrder, setLimitOrder] = useState(true);
  const [stopLoss, setStopLoss] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [weeklyLimit, setWeeklyLimit] = useState(2000);
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [tradingPair, setTradingPair] = useState('KT/EUR');
  const [riskLevel, setRiskLevel] = useState('moderate');
  const [notifications, setNotifications] = useState({ price: true, volume: true, news: false, whale: true });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const Toggle = ({ value, onChange, testId }) => (
    <button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? 'rgba(232,213,160,0.3)' : '#2a2a2b' }}
      data-testid={testId}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
        style={{
          background: value ? G : '#555',
          transform: value ? 'translateX(26px)' : 'translateX(2px)',
        }}
      />
    </button>
  );

  const PAIRS = [
    { id: 'KT/EUR', label: 'KT / EUR', rate: '0.024', change: '+2.1%', positive: true },
    { id: 'KT/CC', label: 'KT / CC', rate: '1.00', change: '0.0%', positive: true },
    { id: 'KT/USD', label: 'KT / USD', rate: '0.026', change: '+1.8%', positive: true },
    { id: 'CC/EUR', label: 'CC / EUR', rate: '0.024', change: '-0.5%', positive: false },
  ];

  const RISK_LEVELS = [
    { id: 'conservative', label: 'Conservateur', desc: 'Stop-loss strict, positions limitées', color: '#4ADE80' },
    { id: 'moderate', label: 'Modéré', desc: 'Équilibre rendement/risque', color: G },
    { id: 'aggressive', label: 'Agressif', desc: 'Positions larges, tolérance élevée', color: '#ffb4ab' },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-16" data-testid="trading-settings">
      {/* Header */}
      <header className="pt-4 space-y-3 mb-6">
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Configuration</span>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 300, letterSpacing: '-0.02em', color: '#e5e2e3', lineHeight: 1 }}>
          Paramètres <span style={{ color: G }}>Trading</span>
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#72727a', lineHeight: 1.6 }}>
          Configurez votre stratégie de trading et les limites de votre portefeuille KT.
        </p>
      </header>

      <div className="space-y-6">
        {/* ─── PAIRES DE TRADING ─────────────────────────── */}
        <section className="rounded-xl p-5" style={{ background: '#131314' }}>
          <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Paires de Trading</h3>
          <div className="grid grid-cols-2 gap-3">
            {PAIRS.map(pair => (
              <button
                key={pair.id}
                onClick={() => setTradingPair(pair.id)}
                className="p-4 rounded-xl transition-all text-left"
                style={{
                  background: tradingPair === pair.id ? 'rgba(232,213,160,0.06)' : '#1c1b1c',
                  border: tradingPair === pair.id ? `1px solid rgba(232,213,160,0.15)` : '1px solid transparent',
                }}
                data-testid={`pair-${pair.id}`}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: tradingPair === pair.id ? '#e5e2e3' : '#a0a0a5' }}>{pair.label}</span>
                  {tradingPair === pair.id && (
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: G, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 20, color: '#e5e2e3' }}>{pair.rate}</span>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, color: pair.positive ? '#4ADE80' : '#ffb4ab' }}>{pair.change}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─── AUTO-TRADING ──────────────────────────────── */}
        <section className="rounded-xl p-5" style={{ background: '#131314' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Auto-Trading Laurent.ia</h3>
              <p className="mt-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#555' }}>Laisser CVL BRAIN gérer vos positions automatiquement</p>
            </div>
            <Toggle value={autoTrading} onChange={setAutoTrading} testId="toggle-auto-trading" />
          </div>

          {autoTrading && (
            <div className="mt-4 p-4 rounded-xl space-y-4" style={{ background: '#1c1b1c', animation: 'fadeSlideIn 0.3s cubic-bezier(0.2,0,0,1)' }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#5B9BD5' }}>info</span>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#5B9BD5', lineHeight: 1.5 }}>
                  Laurent.ia analysera le marché et exécutera des ordres selon votre profil de risque.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#a0a0a5' }}>Ordres limites</span>
                <Toggle value={limitOrder} onChange={setLimitOrder} testId="toggle-limit-order" />
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#a0a0a5' }}>Stop-Loss automatique</span>
                <Toggle value={stopLoss} onChange={setStopLoss} testId="toggle-stop-loss" />
              </div>
            </div>
          )}
        </section>

        {/* ─── LIMITES ───────────────────────────────────── */}
        <section className="rounded-xl p-5" style={{ background: '#131314' }}>
          <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Limites de Transaction</h3>
          <div className="space-y-5">
            {/* Daily limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Limite journalière</span>
                <span style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: G }}>{dailyLimit} KT</span>
              </div>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={dailyLimit}
                onChange={e => setDailyLimit(Number(e.target.value))}
                className="w-full accent-[#E8D5A0]"
                style={{ height: 4 }}
                data-testid="slider-daily-limit"
              />
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>50 KT</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>5,000 KT</span>
              </div>
            </div>

            {/* Weekly limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Limite hebdomadaire</span>
                <span style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: G }}>{weeklyLimit} KT</span>
              </div>
              <input
                type="range"
                min={100}
                max={20000}
                step={100}
                value={weeklyLimit}
                onChange={e => setWeeklyLimit(Number(e.target.value))}
                className="w-full accent-[#E8D5A0]"
                style={{ height: 4 }}
                data-testid="slider-weekly-limit"
              />
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>100 KT</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>20,000 KT</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROFIL DE RISQUE ──────────────────────────── */}
        <section className="rounded-xl p-5" style={{ background: '#131314' }}>
          <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Profil de Risque</h3>
          <div className="space-y-2">
            {RISK_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setRiskLevel(level.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                style={{
                  background: riskLevel === level.id ? `${level.color}08` : '#1c1b1c',
                  border: riskLevel === level.id ? `1px solid ${level.color}20` : '1px solid transparent',
                }}
                data-testid={`risk-${level.id}`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: riskLevel === level.id ? `${level.color}15` : 'transparent',
                    border: `1px solid ${riskLevel === level.id ? `${level.color}30` : '#2a2a2b'}`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: 20,
                    color: riskLevel === level.id ? level.color : '#555',
                    fontVariationSettings: riskLevel === level.id ? "'FILL' 1" : "'FILL' 0",
                  }}>
                    {level.id === 'conservative' ? 'shield' : level.id === 'moderate' ? 'balance' : 'trending_up'}
                  </span>
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: riskLevel === level.id ? '#e5e2e3' : '#a0a0a5' }}>{level.label}</p>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>{level.desc}</p>
                </div>
                {riskLevel === level.id && (
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: level.color, fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ─── ALERTES ───────────────────────────────────── */}
        <section className="rounded-xl p-5" style={{ background: '#131314' }}>
          <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Alertes & Notifications</h3>
          <div className="space-y-3">
            {[
              { key: 'price', icon: 'show_chart', label: 'Variation de prix', desc: `Alerte si le KT varie de ±${alertThreshold}%` },
              { key: 'volume', icon: 'bar_chart', label: 'Volume anormal', desc: 'Pic de volume détecté sur une paire' },
              { key: 'news', icon: 'newspaper', label: 'Actualités marché', desc: 'News impactant la valeur des tokens' },
              { key: 'whale', icon: 'waves', label: 'Mouvement whale', desc: 'Transaction > 10,000 KT détectée' },
            ].map(alert => (
              <div key={alert.key} className="flex items-center gap-4 py-3 px-4 rounded-xl" style={{ background: '#1c1b1c' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: notifications[alert.key] ? G : '#555' }}>{alert.icon}</span>
                <div className="flex-1">
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>{alert.label}</p>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>{alert.desc}</p>
                </div>
                <Toggle value={notifications[alert.key]} onChange={(v) => setNotifications(prev => ({ ...prev, [alert.key]: v }))} testId={`alert-${alert.key}`} />
              </div>
            ))}
          </div>

          {/* Alert threshold slider */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(75,70,59,0.1)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Seuil d'alerte prix</span>
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: G }}>±{alertThreshold}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={alertThreshold}
              onChange={e => setAlertThreshold(Number(e.target.value))}
              className="w-full accent-[#E8D5A0]"
              style={{ height: 4 }}
              data-testid="slider-alert-threshold"
            />
            <div className="flex justify-between mt-1">
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>±1%</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>±50%</span>
            </div>
          </div>
        </section>

        {/* ─── PARAMÈTRES AVANCÉS ────────────────────────── */}
        <section className="rounded-xl overflow-hidden" style={{ background: '#131314' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-5"
            data-testid="advanced-toggle"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#72727a' }}>tune</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>Paramètres avancés</span>
            </div>
            <span className="material-symbols-outlined transition-transform" style={{ fontSize: 18, color: '#555', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
          </button>

          {showAdvanced && (
            <div className="px-5 pb-5 space-y-4" style={{ animation: 'fadeSlideIn 0.3s cubic-bezier(0.2,0,0,1)', borderTop: '1px solid rgba(75,70,59,0.08)' }}>
              {/* Slippage */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Tolérance de slippage</span>
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 14, color: G }}>0.5%</span>
                </div>
                <div className="flex gap-2">
                  {['0.1%', '0.5%', '1.0%', '2.0%'].map(v => (
                    <button key={v} className="flex-1 py-2 rounded-lg text-center" style={{
                      background: v === '0.5%' ? 'rgba(232,213,160,0.08)' : '#1c1b1c',
                      border: v === '0.5%' ? '1px solid rgba(232,213,160,0.15)' : '1px solid transparent',
                      fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: v === '0.5%' ? G : '#72727a',
                    }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Priorité des frais</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: 'Lent', value: '0.01 KT', icon: 'speed' },
                    { label: 'Normal', value: '0.05 KT', icon: 'speed', selected: true },
                    { label: 'Rapide', value: '0.15 KT', icon: 'bolt' },
                  ].map(g => (
                    <button key={g.label} className="flex-1 p-3 rounded-lg text-center" style={{
                      background: g.selected ? 'rgba(232,213,160,0.06)' : '#1c1b1c',
                      border: g.selected ? '1px solid rgba(232,213,160,0.12)' : '1px solid transparent',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: g.selected ? G : '#555' }}>{g.icon}</span>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: g.selected ? '#e5e2e3' : '#72727a', marginTop: 4 }}>{g.label}</p>
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555', marginTop: 2 }}>{g.value}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeout */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>Timeout de transaction</span>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a', marginTop: 2 }}>Annuler si non exécuté après ce délai</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: '#1c1b1c' }}>
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: '#e5e2e3' }}>30</span>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>min</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── SAVE BUTTON ───────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2">
          <button className="px-6 py-3 rounded-xl transition-all hover:bg-white/5" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#72727a' }}>
            Réinitialiser
          </button>
          <button
            className="px-8 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: G, color: '#3a2f09', fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700 }}
            data-testid="save-trading-settings"
          >
            Sauvegarder les paramètres
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
