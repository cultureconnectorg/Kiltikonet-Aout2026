import React from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, Database, Share2, Shield, ArrowRight } from 'lucide-react';
import SEO from './SEO';

const K = {
  bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0',
  dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C',
  terra: '#A65D47', sage: '#4A5D4E', ink: '#0F0C09',
};

export default function Infrastructure() {
  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="infrastructure-page">
      <SEO
        title="Infrastructure culturelle — Identité, données, valorisation"
        description="Kiltikonet développe une infrastructure culturelle permettant d'identifier, structurer, connecter et valoriser les acteurs et objets culturels des industries afro-caribéennes."
        path="/infrastructure"
      />

      {/* HERO */}
      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16" data-testid="infra-hero">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → Infrastructure
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-8 max-w-4xl"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: K.dark, letterSpacing: '-0.02em' }}
            data-testid="infra-title"
          >
            Une infrastructure <br/>
            <span style={{ color: K.terra, fontStyle: 'italic' }}>pour la culture.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-3xl" style={{ color: K.muted, lineHeight: 1.6 }}>
            Kiltikonet développe une architecture permettant d'identifier, structurer, connecter et
            valoriser les acteurs et objets culturels de l'écosystème afro-caribéen — au-delà d'un
            seul événement.
          </p>
        </div>
      </section>

      {/* 4 CAPACITÉS */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.card }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Fingerprint,
                title: 'Identité culturelle',
                desc: "Chaque acteur et chaque objet culturel reçoit un identifiant numérique souverain. Une identité stable, portable, contrôlée par son porteur.",
                testId: 'cap-identity',
              },
              {
                icon: Database,
                title: 'Données structurées',
                desc: "Le réseau documente ses actifs, cartographie ses membres et enrichit chaque interaction. Une mémoire vivante du secteur culturel afro-caribéen.",
                testId: 'cap-data',
              },
              {
                icon: Share2,
                title: 'Connexion',
                desc: "L'infrastructure relie les acteurs entre eux, les territoires aux opportunités, et les objets culturels à leurs marchés potentiels.",
                testId: 'cap-network',
              },
              {
                icon: Shield,
                title: 'Souveraineté',
                desc: "Les données culturelles restent la propriété de leurs détenteurs. Kiltikonet est un pont — pas un propriétaire.",
                testId: 'cap-sovereignty',
              },
            ].map((c) => (
              <div key={c.testId} className="p-6 md:p-8 rounded-2xl"
                   style={{ background: K.bg, border: `1px solid ${K.warm}` }}
                   data-testid={c.testId}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                     style={{ background: `${K.terra}12` }}>
                  <c.icon className="w-6 h-6" style={{ color: K.terra }} />
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: K.dark }}>{c.title}</h3>
                <p className="text-sm" style={{ color: K.muted, lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USAGE / APPLICATION */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.ink, color: '#F1EBDD' }} data-testid="infra-usage">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.gold }}>
            Réutilisable
          </div>
          <h2 className="text-3xl md:text-4xl mb-6 max-w-3xl" style={{ fontFamily: "'Newsreader', serif" }}>
            Une infrastructure conçue pour vivre au-delà de chaque édition.
          </h2>
          <p className="text-base mb-10 max-w-3xl" style={{ color: '#B8B0A0', lineHeight: 1.7 }}>
            L'identifiant culturel utilisé lors de Culture Connect 2026 reste actif entre les éditions.
            Il devient l'identité numérique d'un acteur culturel et permet la continuité :
            un artiste identifié en 2026 le reste en 2027, en 2028, et bénéficie de tout ce que
            Kiltikonet construit dans le temps.
          </p>
          <Link
            to="/rejoindre"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
            style={{ background: K.gold, color: K.ink }}
            data-testid="infra-cta"
          >
            Rejoindre le réseau
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
