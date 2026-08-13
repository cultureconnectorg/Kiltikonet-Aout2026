import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import SEO from './SEO';

const K = {
  bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0',
  dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C',
  terra: '#A65D47', sage: '#4A5D4E', ink: '#0F0C09',
};

const editions = [
  {
    year: '2026',
    slug: '2026',
    title: 'Culture Connect 2026',
    dates: '20-23 Mai 2026',
    location: 'Fort-de-France, Martinique',
    status: 'terminée',
    tagline: 'Première édition. Poser les bases du marché.',
    accent: K.gold,
  },
  {
    year: '2027',
    slug: '2027',
    title: 'Culture Connect 2027',
    dates: 'Programmation en cours',
    location: 'À annoncer',
    status: 'à venir',
    tagline: "Consolidation. L'édition qui prolonge la première.",
    accent: K.terra,
  },
];

export default function CultureConnect() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: 'Culture Connect',
    description: "Le marché et rendez-vous international des industries culturelles afro-caribéennes.",
    url: 'https://kiltikonet.fr/culture-connect',
    organizer: { '@type': 'Organization', name: 'Kiltikonet', url: 'https://kiltikonet.fr' },
  };

  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="culture-connect-page">
      <SEO
        title="Culture Connect — Marché international afro-caribéen"
        description="Culture Connect est le marché et rendez-vous international des industries culturelles afro-caribéennes. Une initiative Kiltikonet, éditions récurrentes."
        path="/culture-connect"
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16" data-testid="cc-hero">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → Culture Connect
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-8 max-w-4xl"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: K.dark, letterSpacing: '-0.02em' }}
            data-testid="cc-hero-title"
          >
            Culture Connect
          </h1>
          <p className="text-lg md:text-xl max-w-3xl" style={{ color: K.muted, lineHeight: 1.6 }} data-testid="cc-hero-lead">
            Le marché et rendez-vous international des industries culturelles afro-caribéennes.
            Une initiative Kiltikonet organisée en éditions récurrentes, dans une continuité pluriannuelle.
          </p>
        </div>
      </section>

      {/* ÉDITIONS */}
      <section className="px-6 md:px-10 lg:px-16 py-16" data-testid="cc-editions-list">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.terra }}>
            Toutes les éditions
          </div>
          <h2 className="text-3xl md:text-4xl mb-12" style={{ fontFamily: "'Newsreader', serif", color: K.dark }}>
            Une continuité dans le temps.
          </h2>

          <div className="space-y-4">
            {editions.map((ed) => (
              <Link
                key={ed.slug}
                to={`/culture-connect/${ed.slug}`}
                className="block p-6 md:p-8 rounded-2xl transition-all hover:shadow-lg group"
                style={{ background: K.card, border: `1px solid ${K.warm}` }}
                data-testid={`cc-edition-item-${ed.slug}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
                        style={{ background: `${ed.accent}20`, color: ed.accent }}
                      >
                        {ed.status}
                      </span>
                      <span className="text-sm" style={{ color: K.muted }}>
                        {ed.year}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "'Newsreader', serif", color: K.dark }}>
                      {ed.title}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: K.muted }}>{ed.tagline}</p>
                    <div className="flex flex-wrap gap-4 text-xs" style={{ color: K.muted }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {ed.dates}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {ed.location}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-6 h-6 transition-transform group-hover:translate-x-1"
                    style={{ color: K.terra }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SÉRIE — Pourquoi une continuité ? */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.ink, color: '#F1EBDD' }} data-testid="cc-continuity">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.gold }}>
              Continuité
            </div>
            <h2 className="text-3xl md:text-4xl mb-6" style={{ fontFamily: "'Newsreader', serif" }}>
              Culture Connect n'est pas un événement isolé — c'est une série.
            </h2>
          </div>
          <div className="space-y-4" style={{ color: '#B8B0A0', lineHeight: 1.7 }}>
            <p>
              Chaque édition prend appui sur la précédente. Les artistes, structures et
              institutions accueillies en 2026 continuent de bénéficier des liens tissés,
              et alimentent les rencontres des éditions suivantes.
            </p>
            <p>
              Culture Connect appartient à Kiltikonet, qui en assure la permanence
              institutionnelle. Le marché récurrent devient ainsi une preuve historique
              vivante du réseau.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
