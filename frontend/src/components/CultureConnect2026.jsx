import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, Calendar, MapPin, Trophy, Sparkles } from 'lucide-react';
import SEO from './SEO';

const K = {
  bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0',
  dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C',
  terra: '#A65D47', sage: '#4A5D4E', ink: '#0F0C09',
};

// Chiffres CC2026 — À REMPLACER par les chiffres vérifiés fournis par l'équipe
const IMPACT_METRICS = [
  { label: 'Participants inscrits', value: '—', note: 'À publier après validation' },
  { label: 'Professionnels', value: '—', note: 'À publier après validation' },
  { label: 'Pays / territoires', value: '—', note: 'À publier après validation' },
  { label: 'Rendez-vous B2B', value: '—', note: 'À publier après validation' },
];

export default function CultureConnect2026() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Culture Connect 2026',
    startDate: '2026-05-20',
    endDate: '2026-05-23',
    eventStatus: 'https://schema.org/EventCompleted',
    location: {
      '@type': 'Place',
      name: 'Fort-de-France',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Fort-de-France',
        addressRegion: 'Martinique',
        postalCode: '97200',
        addressCountry: 'FR',
      },
    },
    organizer: { '@type': 'Organization', name: 'Kiltikonet', url: 'https://kiltikonet.fr' },
  };

  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="cc2026-impact-page">
      <SEO
        title="Culture Connect 2026 — Bilan et impact"
        description="Culture Connect 2026 a eu lieu du 20 au 23 mai 2026 à Fort-de-France. Retour sur la première édition, les preuves d'exécution et la continuité vers CC2027."
        path="/culture-connect/2026"
        type="article"
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16" data-testid="cc2026-hero">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → <Link to="/culture-connect">Culture Connect</Link> → 2026
          </div>

          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full mb-6"
               style={{ background: `${K.gold}20`, color: K.gold, border: `1px solid ${K.gold}40` }}
               data-testid="cc2026-status">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Édition terminée
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 max-w-4xl"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: K.dark, letterSpacing: '-0.02em' }}
            data-testid="cc2026-title"
          >
            Culture Connect 2026
          </h1>

          <p className="text-lg md:text-xl max-w-3xl mb-8" style={{ color: K.muted, lineHeight: 1.6 }}>
            Une première édition réalisée, documentée, et servant de base à la prochaine étape.
          </p>

          <div className="flex flex-wrap gap-4 text-sm" style={{ color: K.muted }}>
            <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" /> 20-23 Mai 2026</span>
            <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Fort-de-France, Martinique</span>
          </div>
        </div>
      </section>

      {/* MÉTRIQUES D'IMPACT (à remplir avec chiffres vérifiés) */}
      <section className="px-6 md:px-10 lg:px-16 py-16" data-testid="cc2026-metrics">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.terra }}>
            Impact
          </div>
          <h2 className="text-3xl md:text-4xl mb-12 max-w-3xl" style={{ fontFamily: "'Newsreader', serif", color: K.dark }}>
            Les résultats vérifiés — bilan chiffré.
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {IMPACT_METRICS.map((m, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl"
                style={{ background: K.card, border: `1px solid ${K.warm}` }}
                data-testid={`metric-${i}`}
              >
                <div className="text-4xl md:text-5xl font-semibold mb-2"
                     style={{ color: K.terra, fontFamily: "'Newsreader', serif" }}>
                  {m.value}
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: K.dark }}>
                  {m.label}
                </div>
                <div className="text-xs italic" style={{ color: K.muted }}>{m.note}</div>
              </div>
            ))}
          </div>

          <p className="text-xs mt-8 italic" style={{ color: K.muted }}>
            Les chiffres définitifs seront publiés après consolidation avec les partenaires et l'équipe organisatrice.
          </p>
        </div>
      </section>

      {/* CE QUI A ÉTÉ FAIT */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.card }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.terra }}>
            Programme
          </div>
          <h2 className="text-3xl md:text-4xl mb-12 max-w-3xl" style={{ fontFamily: "'Newsreader', serif", color: K.dark }}>
            Ce qui s'est passé pendant 4 jours.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users, title: 'Marché culturel', desc: 'Exposants Bronze / Silver / Gold, stands professionnels, mise en relation directe.' },
              { icon: Sparkles, title: 'Conférences', desc: 'Tables rondes sur les industries culturelles afro-caribéennes, transmission et innovation.' },
              { icon: Trophy, title: 'Networking B2B', desc: 'Rendez-vous professionnels programmés, catalyseur de partenariats.' },
              { icon: Calendar, title: 'Concert de clôture', desc: 'Le 22 mai — scène principale, invitation partenaires et VIP.' },
              { icon: MapPin, title: 'Ateliers ouverts', desc: 'Formations pratiques accessibles à tous les visiteurs accrédités.' },
              { icon: CheckCircle2, title: 'Badge culturel FREK-ID', desc: "Chaque participant a reçu son identifiant culturel numérique — infrastructure pérenne." },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl"
                   style={{ background: K.bg, border: `1px solid ${K.warm}` }}
                   data-testid={`highlight-${i}`}>
                <item.icon className="w-6 h-6 mb-3" style={{ color: K.terra }} />
                <div className="font-semibold mb-1.5" style={{ color: K.dark }}>{item.title}</div>
                <p className="text-sm" style={{ color: K.muted, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTINUITÉ CC2027 */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.ink, color: '#F1EBDD' }} data-testid="cc2026-continuity">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.gold }}>
            La suite
          </div>
          <h2 className="text-3xl md:text-4xl mb-6 max-w-3xl" style={{ fontFamily: "'Newsreader', serif" }}>
            Culture Connect 2026 servait à poser les bases. CC 2027 les consolide.
          </h2>
          <p className="text-base mb-8 max-w-2xl" style={{ color: '#B8B0A0' }}>
            Les liens créés en 2026, les infrastructures déployées et l'expérience acquise
            nourrissent directement la prochaine édition.
          </p>
          <Link
            to="/culture-connect/2027"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
            style={{ background: K.gold, color: K.ink }}
            data-testid="link-cc2027"
          >
            Découvrir Culture Connect 2027
          </Link>
        </div>
      </section>
    </div>
  );
}
