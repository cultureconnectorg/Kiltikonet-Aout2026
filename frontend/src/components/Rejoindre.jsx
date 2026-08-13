import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Star, Handshake, ArrowRight } from 'lucide-react';
import SEO from './SEO';

const K = { bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0', dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C', terra: '#A65D47', ink: '#0F0C09' };

const PROFILES = [
  { icon: Star, label: 'Artiste', desc: 'Musicien, plasticien, auteur, créateur culturel — obtenir son identifiant culturel Kiltikonet.', link: '/badge-inscription', testId: 'join-artist' },
  { icon: Users, label: 'Professionnel', desc: 'Producteur, distributeur, média, agent — accéder au réseau et aux marchés.', link: '/badge-inscription', testId: 'join-pro' },
  { icon: Building2, label: 'Institution', desc: 'Collectivité, ministère, école — devenir partenaire structurel du réseau.', link: '/partenaires', testId: 'join-institution' },
  { icon: Handshake, label: 'Partenaire', desc: "Sponsor, entreprise, fondation — soutenir la construction de l'infrastructure culturelle.", link: '/partenaires', testId: 'join-partner' },
];

export default function Rejoindre() {
  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="rejoindre-page">
      <SEO
        title="Rejoindre Kiltikonet"
        description="Artistes, professionnels, institutions et partenaires — rejoignez le réseau Kiltikonet et prenez part à l'infrastructure culturelle afro-caribéenne."
        path="/rejoindre"
      />

      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → Rejoindre
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight mb-6"
              style={{ fontFamily: "'Newsreader', serif", color: K.dark, letterSpacing: '-0.02em' }}
              data-testid="rejoindre-title">
            Rejoindre le réseau.
          </h1>
          <p className="text-lg max-w-2xl" style={{ color: K.muted, lineHeight: 1.6 }}>
            Choisissez votre profil ci-dessous. Chaque parcours est adapté à votre rôle
            dans l'écosystème culturel afro-caribéen.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16 pb-24">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5" data-testid="join-grid">
          {PROFILES.map((p) => (
            <Link key={p.testId} to={p.link}
                  className="p-6 md:p-8 rounded-2xl transition-all hover:shadow-lg group"
                  style={{ background: K.card, border: `1px solid ${K.warm}` }}
                  data-testid={p.testId}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                   style={{ background: `${K.terra}12` }}>
                <p.icon className="w-6 h-6" style={{ color: K.terra }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: K.dark }}>{p.label}</h3>
              <p className="text-sm mb-4" style={{ color: K.muted, lineHeight: 1.6 }}>{p.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: K.terra }}>
                Continuer <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
