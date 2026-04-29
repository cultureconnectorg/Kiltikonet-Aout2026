import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Vote, ChevronRight } from 'lucide-react';
import { Reveal } from '../hooks/useAnimations';

const GouvernancePage = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      id: 'associe',
      label: 'Membre Associé',
      cotisation: '50 €',
      cotisationAnnuelle: 'Aucune',
      droits: 'Vote en Assemblée Générale',
      eligible_ca: false,
      color: '#4A5D4E',
    },
    {
      id: 'actif',
      label: 'Membre Actif',
      cotisation: '150 €',
      cotisationAnnuelle: '30 € / an',
      droits: 'Vote en Assemblée Générale + éligible au Conseil d\'Administration',
      eligible_ca: true,
      color: '#C9A84C',
    },
  ];

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-page">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Retour</span>
          </button>
          <h1 className="font-serif text-lg text-charcoal">Gouvernance</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <Reveal>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal/5 border border-lightborder mb-6">
              <Shield className="w-4 h-4 text-charcoal/50" />
              <span className="text-xs text-charcoal/60 uppercase tracking-widest font-syne">Association Loi 1901</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mb-6">Adhérer à Kilti Konet</h2>
            <p className="text-charcoal/60 text-base leading-relaxed max-w-2xl mx-auto">
              Kilti Konet est une association loi 1901. Ses membres participent à la gouvernance de l'écosystème culturel caribéen et afro-descendant. Le Conseil d'Administration examine chaque candidature. L'adhésion n'est pas automatique.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {tiers.map((tier, i) => (
            <Reveal key={tier.id}>
              <div className="border border-lightborder bg-paper p-8 flex flex-col h-full" data-testid={`tier-${tier.id}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                    {tier.eligible_ca ? <Shield className="w-5 h-5" style={{ color: tier.color }} /> : <Users className="w-5 h-5" style={{ color: tier.color }} />}
                  </div>
                  <h3 className="font-serif text-xl text-charcoal">{tier.label}</h3>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-baseline border-b border-lightborder pb-3">
                    <span className="text-xs text-charcoal/50 uppercase tracking-wider">Cotisation d'entrée</span>
                    <span className="font-serif text-2xl text-charcoal">{tier.cotisation}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-lightborder pb-3">
                    <span className="text-xs text-charcoal/50 uppercase tracking-wider">Cotisation annuelle</span>
                    <span className="text-sm text-charcoal/70">{tier.cotisationAnnuelle}</span>
                  </div>
                  <div className="border-b border-lightborder pb-3">
                    <span className="text-xs text-charcoal/50 uppercase tracking-wider block mb-1">Droits</span>
                    <p className="text-sm text-charcoal/70 flex items-start gap-2">
                      <Vote className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tier.color }} />
                      {tier.droits}
                    </p>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-charcoal/50 uppercase tracking-wider">Éligible au CA</span>
                    <span className={`text-sm font-semibold ${tier.eligible_ca ? 'text-sage' : 'text-charcoal/40'}`}>
                      {tier.eligible_ca ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/gouvernance/candidater?niveau=${tier.id}`)}
                  className="mt-8 w-full py-4 text-sm font-syne font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: tier.color, color: '#F4F0E8' }}
                  data-testid={`candidater-${tier.id}`}
                >
                  Candidater <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="text-center border-t border-lightborder pt-8">
            <p className="text-xs text-charcoal/40 max-w-xl mx-auto leading-relaxed">
              Le dossier complet doit être soumis au moins une semaine avant la réunion du Conseil d'Administration.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default GouvernancePage;
