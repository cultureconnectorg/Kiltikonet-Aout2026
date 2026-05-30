import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check, Star, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const C = {
  bg: '#0F0F0F', surface: '#1B1B1B', card: '#242424', border: '#333333',
  text: '#E8E4DC', muted: '#9A9A9A', dim: '#666666', gold: '#D4A84B',
  accent: '#C4714A', forest: '#4A5D4E',
};

const PRACTICES = [
  'Musique', 'Danse', 'Arts visuels', 'Écriture / Littérature',
  'Cuisine / Gastronomie', 'Audiovisuel / Cinéma', 'Entrepreneuriat culturel',
  'Mode / Design', 'Agriculture / Terroir', 'Théâtre', 'Autre',
];

const GOALS = [
  { id: 'network', label: 'Créer des connexions', desc: 'Rencontrer des professionnels caribéens' },
  { id: 'showcase', label: 'Montrer mon travail', desc: 'Exposer, performer, présenter' },
  { id: 'learn', label: 'Apprendre et me former', desc: 'Ateliers, masterclass, mentorat' },
  { id: 'business', label: 'Développer mon activité', desc: 'Opportunités, financements, partenaires' },
  { id: 'all', label: 'Tout à la fois', desc: 'Je veux vivre CC2026 à fond' },
];

// ═══════════════════════════════════════════════════════════════
// CONSTELLATION ANIMATION — Stars converge into FREK-ID
// ═══════════════════════════════════════════════════════════════
const ConstellationReveal = ({ frekId, score, jetons, analysis, onComplete }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('stars'); // stars → converge → reveal
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = 400;
    const H = canvas.height = 400;

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      targetX: W / 2 + (Math.random() - 0.5) * 120,
      targetY: H / 2 + (Math.random() - 0.5) * 40,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.02 + 0.005,
      progress: 0,
      color: Math.random() > 0.5 ? '#D4A84B' : '#C4714A',
    }));

    let animId;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      stars.forEach(star => {
        if (frame > 60) {
          star.progress = Math.min(1, star.progress + star.speed);
          star.x += (star.targetX - star.x) * star.progress * 0.05;
          star.y += (star.targetY - star.y) * star.progress * 0.05;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (1 + Math.sin(frame * 0.05) * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = 0.3 + star.progress * 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw connecting lines between nearby stars
        stars.forEach(other => {
          const dx = star.x - other.x;
          const dy = star.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60 && dist > 0) {
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(212, 168, 75, ${0.1 * (1 - dist / 60)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      if (frame > 150) {
        setPhase('reveal');
        setOpacity(Math.min(1, (frame - 150) / 30));
      }

      if (frame < 250) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="flex flex-col items-center py-4" data-testid="constellation-reveal">
      <div className="relative w-[400px] h-[400px] mx-auto">
        <canvas ref={canvasRef} className="absolute inset-0" style={{ width: 400, height: 400 }} />
        {phase === 'reveal' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity }}>
            <div className="px-6 py-3 rounded-xl mb-3" style={{ background: `${C.gold}20`, border: `2px solid ${C.gold}` }}>
              <p className="text-xs tracking-widest uppercase" style={{ color: C.muted }}>Votre identité culturelle</p>
              <p className="text-3xl font-black tracking-wider mt-1" style={{ color: C.gold, fontFamily: "'Syne', monospace" }}>{frekId}</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: `${C.accent}20` }}>
                <Star size={14} style={{ color: C.accent }} />
                <span className="text-sm font-bold" style={{ color: C.accent }}>Score {score}</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: `${C.gold}20` }}>
                <Zap size={14} style={{ color: C.gold }} />
                <span className="text-sm font-bold" style={{ color: C.gold }}>{jetons} Jetons CC</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {phase === 'reveal' && (
        <div className="w-full max-w-md mt-4 space-y-4 animate-fadeIn">
          {analysis && (
            <div className="p-4 rounded-lg text-sm leading-relaxed" style={{ background: `${C.forest}15`, border: `1px solid ${C.forest}40`, color: C.text }}>
              <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: C.forest }}>
                <Sparkles size={12} /> LAURENT.IA
              </p>
              {analysis}
            </div>
          )}
          <Button onClick={onComplete} className="w-full h-12 rounded-full text-base font-bold" style={{ background: C.gold, color: '#000' }} data-testid="onboarding-complete-btn">
            Entrer dans l'Espace Pro
          </Button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN ONBOARDING MODAL
// ═══════════════════════════════════════════════════════════════
const ProOnboarding = ({ session, onComplete }) => {
  const [step, setStep] = useState(0); // 0=welcome, 1=practice, 2=genre, 3=goal, 4=constellation
  const [practice, setPractice] = useState('');
  const [genre, setGenre] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ghost/onboarding/complete`, {
        user_id: session.id,
        cultural_practice: practice,
        genre_style: genre,
        cc2026_goal: goal,
      });
      if (res.data.success) {
        setResult(res.data);
        setStep(4);
      }
    } catch {
      toast.error('Erreur lors de l\'onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`cc2026_onboarding_${session.id}`, 'true');
    onComplete(result);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Onboarding Espace Pro" data-testid="pro-onboarding-modal">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center animate-pulse" style={{ background: `${C.gold}20`, border: `2px solid ${C.gold}` }}>
              <Sparkles size={32} style={{ color: C.gold }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: C.text, fontFamily: "'Syne', sans-serif" }}>Laurent.ia vous accueille</h2>
            <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: C.muted }}>
              Bienvenue dans l'Espace Pro CC2026. Avant de commencer, Laurent.ia va évaluer votre profil culturel et vous attribuer votre identité FREK unique.
            </p>
            <p className="text-xs" style={{ color: C.dim }}>3 questions. 30 secondes. 10 Jetons CC offerts.</p>
            <Button onClick={() => setStep(1)} className="rounded-full px-8 h-12 text-base" style={{ background: C.gold, color: '#000' }} data-testid="start-onboarding-btn">
              Commencer <ArrowRight size={18} className="ml-2" />
            </Button>
            <button onClick={() => onComplete(null)} className="text-xs mt-2 transition-colors hover:text-white/80" style={{ color: C.dim, fontFamily: "'Manrope', sans-serif" }} data-testid="skip-onboarding-btn">
              Passer pour l'instant
            </button>
          </div>
        )}

        {/* Step 1 — Pratique culturelle */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: C.gold }}>Question 1 / 3</p>
              <h3 className="text-lg font-bold" style={{ color: C.text }}>Quelle est votre pratique culturelle principale ?</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRACTICES.map(p => (
                <button key={p} onClick={() => setPractice(p)} data-testid={`practice-${p.toLowerCase().replace(/[^a-z]/g, '')}`}
                  className="p-3 rounded-lg text-sm text-left transition-all"
                  style={{
                    background: practice === p ? `${C.gold}20` : C.card,
                    border: `1px solid ${practice === p ? C.gold : C.border}`,
                    color: practice === p ? C.gold : C.text,
                  }}>
                  {practice === p && <Check size={14} className="inline mr-1" />}{p}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(2)} disabled={!practice} className="w-full h-11 rounded-full" style={{ background: practice ? C.gold : C.dim, color: '#000' }} data-testid="next-step-2-btn">
              Suivant <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2 — Genre/Style */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: C.gold }}>Question 2 / 3</p>
              <h3 className="text-lg font-bold" style={{ color: C.text }}>Quel genre ou style définit votre art ?</h3>
              <p className="text-xs mt-1" style={{ color: C.muted }}>Ex: bèlè, zouk, gwoka, rap caribéen, peinture abstraite, cuisine fusion...</p>
            </div>
            <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Décrivez votre style..." data-testid="genre-input"
              className="w-full h-12 px-4 rounded-lg text-sm" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }} />
            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="ghost" className="rounded-full px-4" style={{ color: C.muted }}>Retour</Button>
              <Button onClick={() => setStep(3)} disabled={!genre.trim()} className="flex-1 h-11 rounded-full" style={{ background: genre.trim() ? C.gold : C.dim, color: '#000' }} data-testid="next-step-3-btn">
                Suivant <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Objectif CC2026 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: C.gold }}>Question 3 / 3</p>
              <h3 className="text-lg font-bold" style={{ color: C.text }}>Quel est votre objectif pour CC2026 ?</h3>
            </div>
            <div className="space-y-2">
              {GOALS.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)} data-testid={`goal-${g.id}`}
                  className="w-full p-4 rounded-lg text-left transition-all flex items-start gap-3"
                  style={{
                    background: goal === g.id ? `${C.gold}15` : C.card,
                    border: `1px solid ${goal === g.id ? C.gold : C.border}`,
                  }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
                    style={{ borderColor: goal === g.id ? C.gold : C.dim, background: goal === g.id ? C.gold : 'transparent' }}>
                    {goal === g.id && <Check size={12} style={{ color: '#000' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: goal === g.id ? C.gold : C.text }}>{g.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="ghost" className="rounded-full px-4" style={{ color: C.muted }}>Retour</Button>
              <Button onClick={handleSubmit} disabled={!goal || loading} className="flex-1 h-11 rounded-full" style={{ background: goal ? C.gold : C.dim, color: '#000' }} data-testid="submit-onboarding-btn">
                {loading ? 'Laurent.ia analyse...' : 'Accéder à mon espace'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Constellation Reveal */}
        {step === 4 && result && (
          <ConstellationReveal
            frekId={result.frek_id}
            score={result.cultural_impact_score}
            jetons={result.jetons_awarded}
            analysis={result.brain_analysis}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ProOnboarding;
