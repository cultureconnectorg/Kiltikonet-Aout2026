// ═══════════════════════════════════════════════════════════
// 3 PROFILS DISTINCTS — Point 12 de l'architecture
// 1. Fiche Personnelle (Profile card)
// 2. Gouvernance Kiltikonet (DAO / Token holder view)
// 3. Espace SaaS Paiement (Subscription / billing)
// Design System: Sovereign Onyx · Material Symbols Only
// ═══════════════════════════════════════════════════════════
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const G = '#E8D5A0';

const PROFILE_TABS = [
  { id: 'fiche', icon: 'person', label: 'Fiche' },
  { id: 'governance', icon: 'gavel', label: 'Gouvernance' },
  { id: 'saas', icon: 'payments', label: 'SaaS' },
];

// ─── FICHE PERSONNELLE ──────────────────────────────────
const FicheProfile = ({ session, doctrine, onDoctrineUpdate }) => {
  const [promoting, setPromoting] = useState(false);
  const stats = [
    { icon: 'visibility', value: '2.4K', label: 'Vues du profil' },
    { icon: 'people', value: '147', label: 'Connexions' },
    { icon: 'bolt', value: '380', label: 'Kilti-Tokens' },
    { icon: 'star', value: '4.8', label: 'Score culturel' },
  ];

  const badges = [
    { icon: 'verified', label: 'Accrédité CC2026', color: G },
    { icon: 'workspace_premium', label: 'Early Adopter', color: '#C4714A' },
    { icon: 'diversity_3', label: 'Networker', color: '#2DD4BF' },
  ];

  const activity = [
    { icon: 'article', text: 'Publication "Gwoka et modernité" — 234 vues', time: '2h' },
    { icon: 'handshake', text: 'Connexion avec Simone Ogundimu', time: '5h' },
    { icon: 'shopping_bag', text: 'Achat Pack KT Diaspora — 150 KT', time: '1j' },
    { icon: 'psychology', text: 'Session Laurent.ia — Analyse de profil', time: '2j' },
  ];

  return (
    <div className="space-y-6" data-testid="fiche-profile">
      {/* Hero */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#131314' }}>
        <div className="h-28 relative" style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.08), rgba(200,168,75,0.04))' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(232,213,160,0.1), transparent 60%)' }} />
        </div>
        <div className="px-6 pb-6 -mt-12 flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C4714A, #D4A84B)', border: '3px solid #131314' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: "'Manrope', sans-serif" }}>
              {(session?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: '#e5e2e3' }}>{session?.name || 'Utilisateur'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>Professionnel culturel</p>
              {doctrine?.label_fr && (
                <span className="px-2 py-0.5 rounded-full" data-testid="profile-doctrine-badge"
                  style={{ background: 'rgba(232,213,160,0.1)', border: '1px solid rgba(232,213,160,0.15)', fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: G }}>
                  {doctrine.label_fr}
                </span>
              )}
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg" style={{ background: 'rgba(232,213,160,0.08)', border: '1px solid rgba(232,213,160,0.15)', color: G, fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }}>
            <span className="material-symbols-outlined mr-1" style={{ fontSize: 14, verticalAlign: 'middle' }}>edit</span>
            Modifier
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: '#131314' }}>
            <span className="material-symbols-outlined" style={{ color: G, fontSize: 20 }}>{s.icon}</span>
            <div className="mt-2">
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: 24, fontWeight: 400, color: '#e5e2e3' }}>{s.value}</span>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#72727a', marginTop: 2 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="rounded-xl p-5" style={{ background: '#131314' }}>
        <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Badges & Certifications</h3>
        <div className="flex flex-wrap gap-3">
          {badges.map(b => (
            <div key={b.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: `${b.color}08`, border: `1px solid ${b.color}15` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: b.color, fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: b.color }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role doctrinal & Actions autorisees */}
      {doctrine?.can && doctrine.can.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: '#131314' }} data-testid="doctrine-permissions-card">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>
              Permissions — {doctrine.label_fr || 'Membre'}
            </h3>
            {doctrine.governance_weight > 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,93,78,0.15)', border: '1px solid rgba(74,93,78,0.2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11, color: '#4A5D4E' }}>how_to_vote</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, color: '#4A5D4E' }}>Poids {doctrine.governance_weight}x</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {doctrine.can.map(action => (
              <div key={action} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(232,213,160,0.04)', border: '1px solid rgba(232,213,160,0.08)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: G, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600, color: '#ccc' }}>
                  {action.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Droits recus (receives[]) */}
      {doctrine?.receives && doctrine.receives.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: '#131314' }} data-testid="doctrine-receives-card">
          <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>
            Avantages — {doctrine.label_fr || 'Membre'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {doctrine.receives.map(item => (
              <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.08)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#4ADE80', fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600, color: '#ccc' }}>
                  {item.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton Devenir Createur — visible uniquement pour consumer */}
      {doctrine?.actor_role === 'consumer' && (
        <button onClick={async () => {
            setPromoting(true);
            try {
              const res = await axios.post(`${API}/doctrine/promote`, { target_role: 'creator' }, { withCredentials: true });
              if (res.data.success) {
                toast.success(`Promotion reussie : ${res.data.label_fr}`);
                if (onDoctrineUpdate) onDoctrineUpdate();
              }
            } catch (err) {
              toast.error(err.response?.data?.detail || 'Erreur de promotion');
            } finally { setPromoting(false); }
          }}
          disabled={promoting}
          className="w-full p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.08), rgba(232,213,160,0.02))', border: '1px solid rgba(232,213,160,0.2)' }}
          data-testid="promote-creator-btn">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.15), rgba(232,213,160,0.05))' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: G, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div className="flex-1 text-left">
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#e5e2e3' }}>
              {promoting ? 'Promotion en cours...' : 'Devenir Createur'}
            </p>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>
              Publiez, monetisez et accedez au Studio complet
            </p>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: G }}>arrow_forward</span>
        </button>
      )}

      {/* Activité récente */}
      <div className="rounded-xl p-5" style={{ background: '#131314' }}>
        <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Activité récente</h3>
        <div className="space-y-3">
          {activity.map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 18, color: G }}>{a.icon}</span>
              <div className="flex-1">
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: '#a0a0a5', lineHeight: 1.5 }}>{a.text}</p>
              </div>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555', flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── GOUVERNANCE KILTIKONET ─────────────────────────────
const GovernanceProfile = ({ session }) => {
  const votes = [
    { title: 'Extension du fonds de réserve artistique', status: 'En cours', votes: 72, target: 80, deadline: '3j' },
    { title: 'Nouvelle taxe culturelle 1.5%', status: 'En cours', votes: 45, target: 60, deadline: '12h' },
    { title: 'Ouverture du Vault diasporique', status: 'Approuvé', votes: 92, target: 80, deadline: '' },
  ];

  const delegations = [
    { name: 'Simone Ogundimu', power: '2,400 KT', type: 'Délégataire' },
    { name: 'Mateo Diop', power: '1,800 KT', type: 'Délégué' },
  ];

  return (
    <div className="space-y-6" data-testid="governance-profile">
      {/* Association Kiltikonet — Membership */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: '#131314', border: '1px solid rgba(74,93,78,0.2)' }}>
        <div className="absolute top-0 right-0 w-40 h-40" style={{ background: 'radial-gradient(circle, rgba(74,93,78,0.1), transparent)', filter: 'blur(40px)' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4A5D4E, #2d3a30)', boxShadow: '0 4px 16px rgba(74,93,78,0.2)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#4ADE80', fontVariationSettings: "'FILL' 1" }}>eco</span>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 18, color: '#e5e2e3' }}>Association Kiltikonet</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Adherant
              </span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>Membre depuis Jan 2026</span>
            </div>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#4ADE80' }}>verified</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(74,93,78,0.15)' }}>
          {[
            { label: 'Hierarchie', value: 'Adherant', icon: 'account_tree' },
            { label: 'Droits de vote', value: 'Actif', icon: 'how_to_vote' },
            { label: 'Cotisation', value: 'A jour', icon: 'check_circle' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4A5D4E' }}>{item.icon}</span>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700, color: '#e5e2e3', marginTop: 4 }}>{item.value}</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#72727a', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pouvoir de vote */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: '#131314' }}>
        <div className="absolute top-0 right-0 w-32 h-32" style={{ background: 'radial-gradient(circle, rgba(232,213,160,0.06), transparent)', filter: 'blur(40px)' }} />
        <div className="relative">
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Pouvoir de Vote</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 48, fontWeight: 400, fontStyle: 'italic', color: '#e5e2e3' }}>4,200</span>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 600, color: G }}>KT</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#4ADE80' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>Direct : 2,400 KT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#5B9BD5' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>Délégué : 1,800 KT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Propositions actives */}
      <div>
        <h3 className="mb-4" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 18, color: '#e5e2e3' }}>Propositions actives</h3>
        <div className="space-y-3">
          {votes.map((v, i) => (
            <div key={i} className="p-5 rounded-xl" style={{ background: '#131314', borderLeft: v.status === 'Approuvé' ? '3px solid #4ADE80' : `3px solid ${G}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {v.deadline && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,213,160,0.08)', color: G, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {v.status} · {v.deadline}
                  </span>}
                  {!v.deadline && <span className="flex items-center gap-1" style={{ color: '#4ADE80', fontSize: 10 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>Approuvé</span>}
                  <h4 className="mt-2" style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: '#e5e2e3' }}>{v.title}</h4>
                </div>
                {v.status !== 'Approuvé' && (
                  <button className="px-4 py-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(232,213,160,0.08)', color: G, fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, border: '1px solid rgba(232,213,160,0.15)' }}>
                    Voter
                  </button>
                )}
              </div>
              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, color: '#72727a' }}>Quorum {v.votes}%</span>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, color: G }}>Objectif {v.target}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a2b' }}>
                  <div className="h-full rounded-full" style={{ width: `${v.votes}%`, background: v.status === 'Approuvé' ? '#4ADE80' : `linear-gradient(90deg, #c8a84b, ${G})` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Délégations */}
      <div className="rounded-xl p-5" style={{ background: '#131314' }}>
        <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Délégations</h3>
        <div className="space-y-3">
          {delegations.map((d, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(232,213,160,0.08)' }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700, color: G }}>{d.name.split(' ').map(w => w[0]).join('')}</span>
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>{d.name}</p>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>{d.type}</p>
              </div>
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: 14, color: G }}>{d.power}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── ESPACE SAAS PAIEMENT ───────────────────────────────
const SaasProfile = ({ session }) => {
  const plan = { name: 'Pro Souverain', price: '29', period: 'mois', features: ['Feed illimité', 'Laurent.ia complet', '5 Studios actifs', 'Wallet & Trading', 'Support prioritaire'] };

  const invoices = [
    { id: 'INV-2026-004', date: 'Avr 2026', amount: '29,00', status: 'Payé' },
    { id: 'INV-2026-003', date: 'Mar 2026', amount: '29,00', status: 'Payé' },
    { id: 'INV-2026-002', date: 'Fév 2026', amount: '29,00', status: 'Payé' },
    { id: 'INV-2026-001', date: 'Jan 2026', amount: '0,00', status: 'Essai gratuit' },
  ];

  const usage = [
    { icon: 'psychology', label: 'LAURENT.IA', used: 847, total: 1000, unit: 'requêtes' },
    { icon: 'cloud_upload', label: 'Stockage', used: 2.4, total: 10, unit: 'GB' },
    { icon: 'api', label: 'API Calls', used: 12400, total: 50000, unit: 'appels' },
  ];

  return (
    <div className="space-y-6" data-testid="saas-profile">
      {/* Plan actuel */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(232,213,160,0.08), rgba(200,168,75,0.03))', border: '1px solid rgba(232,213,160,0.12)' }}>
        <div className="flex items-start justify-between">
          <div>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Plan actuel</span>
            <h2 className="mt-2" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: '#e5e2e3' }}>{plan.name}</h2>
            <div className="flex items-baseline gap-1 mt-2">
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: 36, fontWeight: 400, color: G }}>{plan.price}</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#72727a' }}>€/{plan.period}</span>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg" style={{ background: G, color: '#3a2f09', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }}>
            Gérer l'abonnement
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {plan.features.map(f => (
            <span key={f} className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'rgba(232,213,160,0.06)', fontSize: 10, color: '#a0a0a5', fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#4ADE80' }}>check</span>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Utilisation */}
      <div className="rounded-xl p-5" style={{ background: '#131314' }}>
        <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Utilisation ce mois</h3>
        <div className="space-y-4">
          {usage.map(u => {
            const pct = Math.round((u.used / u.total) * 100);
            return (
              <div key={u.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: G }}>{u.icon}</span>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>{u.label}</span>
                  </div>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: '#72727a' }}>
                    {typeof u.used === 'number' && u.used > 999 ? `${(u.used / 1000).toFixed(1)}K` : u.used} / {typeof u.total === 'number' && u.total > 999 ? `${(u.total / 1000).toFixed(0)}K` : u.total} {u.unit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#2a2a2b' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? '#ffb4ab' : `linear-gradient(90deg, #c8a84b, ${G})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Factures */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#131314' }}>
        <div className="px-5 py-4">
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Historique de facturation</h3>
        </div>
        {invoices.map((inv, i) => (
          <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors" style={{ borderTop: '1px solid rgba(75,70,59,0.08)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#72727a' }}>receipt</span>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>{inv.id}</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>{inv.date}</p>
            </div>
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 14, color: '#e5e2e3' }}>{inv.amount} €</span>
            <span className="px-2 py-0.5 rounded-full" style={{
              background: inv.status === 'Payé' ? 'rgba(74,222,128,0.1)' : 'rgba(232,213,160,0.08)',
              color: inv.status === 'Payé' ? '#4ADE80' : G,
              fontSize: 9, fontWeight: 700, fontFamily: "'Manrope', sans-serif",
            }}>
              {inv.status}
            </span>
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="rounded-xl p-5" style={{ background: '#131314' }}>
        <h3 className="mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Moyen de paiement</h3>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#1c1b1c', border: '1px solid rgba(75,70,59,0.1)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#5B9BD5' }}>credit_card</span>
          <div className="flex-1">
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>Visa •••• 4242</p>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>Expire 12/2028</p>
          </div>
          <button style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, color: G }}>Modifier</button>
        </div>
      </div>
    </div>
  );
};

// ─── COMPOSANT PRINCIPAL — 3 PROFILS ────────────────────
const ProfileTriptych = ({ session, doctrine, onDoctrineUpdate }) => {
  const [activeTab, setActiveTab] = useState('fiche');

  return (
    <div className="max-w-3xl mx-auto pb-16" data-testid="profile-triptych">
      {/* Header */}
      <header className="pt-4 space-y-4 mb-6">
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Espace Personnel</span>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 300, letterSpacing: '-0.02em', color: '#e5e2e3', lineHeight: 1 }}>
          Mon <span style={{ color: G }}>Profil</span>
        </h1>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#131314' }}>
          {PROFILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(232,213,160,0.08)' : 'transparent',
                color: activeTab === tab.id ? G : '#72727a',
              }}
              data-testid={`profile-tab-${tab.id}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      {activeTab === 'fiche' && <FicheProfile session={session} doctrine={doctrine} onDoctrineUpdate={onDoctrineUpdate} />}
      {activeTab === 'governance' && <GovernanceProfile session={session} />}
      {activeTab === 'saas' && <SaasProfile session={session} />}
    </div>
  );
};

export default ProfileTriptych;
