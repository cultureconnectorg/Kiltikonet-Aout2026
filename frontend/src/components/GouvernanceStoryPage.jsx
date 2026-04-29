import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Users, Globe, Scale, BookOpen, Vote, Activity } from 'lucide-react';
import { Reveal } from '../hooks/useAnimations';

const API = process.env.REACT_APP_BACKEND_URL;

// Animated counter that smoothly transitions to a target value
const AnimatedNumber = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const delta = value - start;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(start + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span>{display}</span>;
};

const LiveCounter = () => {
  const [stats, setStats] = useState(null);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/gouvernance/stats`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (!mounted) return;
        setStats((prev) => {
          if (prev && prev.membres_engages !== d.membres_engages) {
            setPulsing(true);
            setTimeout(() => mounted && setPulsing(false), 1200);
          }
          return d;
        });
      } catch {}
    };
    load();
    const id = setInterval(load, 15000); // refresh every 15s
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!stats) return null;

  return (
    <section className="py-16 sm:py-20 bg-charcoal" data-testid="live-counter">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sage/15 border border-sage/30">
            <span className={`w-2 h-2 rounded-full bg-sage ${pulsing ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="text-[11px] uppercase tracking-widest font-syne text-sage">En direct</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-paper mt-4">L'écosystème en mouvement</h2>
          <p className="text-sm text-paper/40 mt-2">Mis à jour en temps réel</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Membres engagés', value: stats.membres_engages, icon: Shield, color: 'text-terracotta' },
            { label: 'Membres actifs', value: stats.membres_actifs, icon: Vote, color: 'text-amber-400' },
            { label: 'Candidatures en cours', value: stats.candidatures_en_cours, icon: Activity, color: 'text-sage' },
            { label: 'Répertoires déclarés', value: stats.repertoires_declares, icon: BookOpen, color: 'text-paper/70' },
          ].map((s, i) => (
            <div key={i} className="border border-paper/10 p-5 text-center bg-paper/[0.03]">
              <s.icon className={`w-5 h-5 mx-auto mb-3 ${s.color}`} />
              <div className="font-mono text-3xl sm:text-4xl font-bold text-paper tabular-nums">
                <AnimatedNumber value={s.value} />
              </div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-paper/40 mt-2 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const GouvernanceStoryPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-story">
      {/* Hero */}
      <section className="relative py-24 sm:py-32 overflow-hidden" style={{ background: '#1a1510' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30Z\' fill=\'none\' stroke=\'%23C9A84C\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <Shield className="w-4 h-4" style={{ color: '#C9A84C' }} />
              <span className="text-xs uppercase tracking-widest font-syne" style={{ color: '#C9A84C' }}>Association Loi 1901</span>
            </div>
          </Reveal>
          <Reveal>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl mb-6" style={{ color: '#F4F0E8' }}>
              Gouvernance de l'écosystème culturel caribéen
            </h1>
          </Reveal>
          <Reveal>
            <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(244,240,232,0.6)' }}>
              Kilti Konet n'est pas une plateforme comme les autres. C'est une association dont les membres décident collectivement de l'avenir des industries culturelles afro-descendantes.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <div className="border-l-2 border-terracotta pl-6 mb-16">
              <h2 className="font-serif text-2xl sm:text-3xl text-charcoal mb-4">Notre vision</h2>
              <p className="text-charcoal/60 leading-relaxed">
                Les industries culturelles caribéennes et afro-descendantes manquent d'une structure collective pour défendre leurs droits, mutualiser leurs moyens et peser dans les négociations avec les acteurs institutionnels et privés.
              </p>
              <p className="text-charcoal/60 leading-relaxed mt-4">
                Kilti Konet répond à ce besoin. En tant qu'association loi 1901, elle offre un cadre juridique, démocratique et transparent à tous les professionnels de la culture qui souhaitent participer à la construction d'un écosystème souverain.
              </p>
            </div>
          </Reveal>

          {/* Pillars */}
          <div className="grid sm:grid-cols-3 gap-8 mb-20">
            {[
              { icon: Globe, title: 'Souveraineté', desc: 'Un écosystème culturel indépendant, pensé par et pour les professionnels caribéens et afro-descendants.' },
              { icon: Scale, title: 'Équité', desc: 'Chaque membre dispose d\'une voix. Les décisions sont prises en Assemblée Générale, selon le principe démocratique.' },
              { icon: Users, title: 'Solidarité', desc: 'La force du collectif au service de chaque créateur. Mutualisation des ressources, partage des savoirs.' },
            ].map((pillar, i) => (
              <Reveal key={i}>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-lightborder">
                    <pillar.icon className="w-5 h-5 text-terracotta" />
                  </div>
                  <h3 className="font-serif text-lg text-charcoal mb-2">{pillar.title}</h3>
                  <p className="text-sm text-charcoal/50 leading-relaxed">{pillar.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Live Counter */}
      <LiveCounter />

      {/* Structure */}
      <section className="py-20 bg-cream border-y border-lightborder">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl text-charcoal mb-10 text-center">Fonctionnement de l'association</h2>
          </Reveal>

          <div className="space-y-8">
            <Reveal>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-charcoal text-paper text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="font-serif text-lg text-charcoal mb-1">Le Conseil d'Administration</h3>
                  <p className="text-sm text-charcoal/60 leading-relaxed">
                    Organe exécutif élu par l'Assemblée Générale. Il examine les candidatures, valide les adhésions et veille au respect des statuts. Seuls les Membres Actifs peuvent y siéger.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-charcoal text-paper text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="font-serif text-lg text-charcoal mb-1">L'Assemblée Générale</h3>
                  <p className="text-sm text-charcoal/60 leading-relaxed">
                    Réunit tous les membres une fois par an. Chaque membre — Associé ou Actif — dispose d'une voix. Elle vote les orientations stratégiques, le budget et le renouvellement du CA.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-charcoal text-paper text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="font-serif text-lg text-charcoal mb-1">Le Répertoire Culturel</h3>
                  <p className="text-sm text-charcoal/60 leading-relaxed">
                    Chaque membre déclare ses œuvres et projets. Ce répertoire constitue le patrimoine collectif de l'association et sert de base à la protection des droits culturels.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-charcoal text-paper text-sm font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="font-serif text-lg text-charcoal mb-1">La Loi COEURVOLAN</h3>
                  <p className="text-sm text-charcoal/60 leading-relaxed">
                    Cadre éthique et juridique propre à l'association. Elle garantit la protection des créateurs, le respect de la diversité culturelle et la transparence de la gouvernance.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl text-charcoal mb-4 text-center">Processus d'adhésion</h2>
            <p className="text-sm text-charcoal/50 text-center mb-12 max-w-lg mx-auto">
              L'adhésion n'est pas automatique. Chaque candidature est examinée par le Conseil d'Administration.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { step: '01', title: 'Candidature', desc: 'Soumettez votre dossier avec votre répertoire culturel (3 projets minimum).' },
              { step: '02', title: 'Examen CA', desc: 'Le Conseil d\'Administration examine votre candidature lors de sa prochaine réunion.' },
              { step: '03', title: 'Signature & Cotisation', desc: 'Signez l\'acte d\'adhésion et réglez votre cotisation d\'entrée.' },
              { step: '04', title: 'Activation', desc: 'Déclarez votre répertoire complet. Votre profil membre est activé.' },
            ].map((s, i) => (
              <Reveal key={i}>
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold text-terracotta/20">{s.step}</span>
                  <h4 className="font-serif text-base text-charcoal mt-2 mb-2">{s.title}</h4>
                  <p className="text-xs text-charcoal/50 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Profiles */}
          <Reveal>
            <div className="border border-lightborder p-8 mb-12">
              <h3 className="font-serif text-xl text-charcoal mb-6 text-center">Qui peut adhérer ?</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: BookOpen, label: 'Artistes & Créateurs culturels' },
                  { icon: Users, label: 'Producteurs culturels' },
                  { icon: Globe, label: 'Organisateurs d\'événements' },
                  { icon: Shield, label: 'Structures culturelles' },
                  { icon: Vote, label: 'Opérateurs de diffusion' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-cream">
                    <p.icon className="w-4 h-4 text-sage flex-shrink-0" />
                    <span className="text-sm text-charcoal/70">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal>
            <div className="text-center">
              <button
                onClick={() => navigate('/gouvernance/adhesion')}
                className="inline-flex items-center gap-3 px-8 py-4 text-base font-syne font-bold tracking-wider uppercase transition-all hover:opacity-90"
                style={{ background: '#2D2A26', color: '#F4F0E8' }}
                data-testid="cta-adhesion"
              >
                Devenir membre <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-xs text-charcoal/40 mt-4">
                Vous serez redirigé vers le formulaire de candidature.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default GouvernanceStoryPage;
