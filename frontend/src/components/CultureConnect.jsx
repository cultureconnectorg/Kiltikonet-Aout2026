import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, MonumentalHeading, EditorialLink } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const editions = [
  {
    year: '2026',
    slug: '2026',
    title: 'Culture Connect 2026',
    dates: '20 – 23 mai 2026',
    location: 'Fort-de-France · Martinique',
    status: 'Archive',
    tagline: 'Première édition. Poser les bases du marché.',
    to: '/culture-connect/2026',
  },
  {
    year: '2027',
    slug: '2027',
    title: 'Culture Connect 2027',
    dates: 'Programmation en cours',
    location: 'À annoncer',
    status: 'À venir',
    tagline: "Consolidation. L'édition qui prolonge la première.",
    to: '/culture-connect/2027',
  },
  {
    year: '2028',
    slug: '2028',
    title: 'Culture Connect 2028',
    dates: 'Non planifiée',
    location: 'À définir',
    status: 'Projetée',
    tagline: 'Édition future du réseau.',
    to: null,
  },
];

export default function CultureConnect() {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: 'Culture Connect',
    description:
      'Le marché et rendez-vous international des industries culturelles afro-caribéennes.',
    url: 'https://kiltikonet.fr/culture-connect',
    organizer: { '@type': 'Organization', name: 'Kiltikonet', url: 'https://kiltikonet.fr' },
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="culture-connect-page"
    >
      <SEO
        title="Culture Connect — Marché international afro-caribéen"
        description="Culture Connect est le marché et rendez-vous international des industries culturelles afro-caribéennes. Une initiative Kiltikonet, éditions récurrentes."
        path="/culture-connect"
        jsonLd={jsonLd}
      />

      <ArchiveBar
        left={`Kiltikonet / Culture Connect / ${year}`}
        center="Série récurrente · Portée par Kiltikonet"
        right={`N° 002 · ${dateStr}`}
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — HÉRITAGE */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="cc-hero">
        <SectionIndex n="01" label="Culture Connect" />
        <MonumentalHeading italic="des industries culturelles afro-caribéennes.">
          Le marché récurrent
        </MonumentalHeading>
        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-6 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }} data-testid="cc-hero-lead">
              Culture Connect n'est pas un événement isolé. C'est une série d'éditions
              programmées dans une continuité pluriannuelle. Chaque édition prend appui sur
              la précédente ; chaque édition prépare la suivante.
            </p>
            <p className="mt-6" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Kiltikonet en assure la permanence institutionnelle. Le marché récurrent
              devient ainsi une preuve historique vivante du réseau.
            </p>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — ÉDITIONS (index éditorial, pas de cards) */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="cc-editions-list">
        <SectionIndex n="02" label="Éditions" />

        <div data-testid="cc-editions-index">
          {editions.map((ed, i) => {
            const disabled = !ed.to;
            const content = (
              <div
                className="grid grid-cols-12 gap-4 py-10 md:py-14"
                style={{
                  borderTop: `1px solid ${K.ruleLight}`,
                  opacity: disabled ? 0.5 : 1,
                }}
                data-testid={`cc-edition-item-${ed.slug}`}
              >
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs font-mono tracking-widest" style={{ color: K.dust }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="col-span-10 md:col-span-3">
                  <div
                    className="text-xs uppercase tracking-widest font-mono mb-2"
                    style={{ color: K.rust }}
                  >
                    {ed.status}
                  </div>
                  <div
                    style={{
                      fontFamily: K.serif,
                      fontSize: 'clamp(2rem, 3.2vw, 3rem)',
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: K.ink,
                    }}
                  >
                    {ed.year}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6 md:pl-8">
                  <div
                    style={{
                      fontFamily: K.serif,
                      fontSize: '1.25rem',
                      color: K.ink,
                      lineHeight: 1.2,
                      marginBottom: 8,
                    }}
                  >
                    {ed.title}
                  </div>
                  <p style={{ color: K.bone, fontSize: '14px', lineHeight: 1.6 }}>{ed.tagline}</p>
                  <div className="mt-3 text-xs font-mono uppercase tracking-widest" style={{ color: K.dust }}>
                    {ed.dates} · {ed.location}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right">
                  <span
                    className="text-xs font-mono uppercase tracking-widest"
                    style={{ color: disabled ? K.dust : K.rust }}
                  >
                    {disabled ? '—' : 'Voir →'}
                  </span>
                </div>
              </div>
            );

            return disabled ? (
              <div key={ed.slug}>{content}</div>
            ) : (
              <Link key={ed.slug} to={ed.to} className="block">
                {content}
              </Link>
            );
          })}
          <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
        </div>
      </section>

      {/* 03 — CONTINUITÉ (bande sombre) */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="cc-continuity"
      >
        <SectionIndex n="03" label="Continuité" tone="light" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7">
            <h2
              style={{
                fontFamily: K.serif,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.6vw, 4rem)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: K.paper,
              }}
            >
              Une série <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                ne s'achève pas avec une édition.
              </span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
              Chaque acteur intégré à une édition rejoint le réseau permanent. Chaque
              objet culturel documenté rejoint la mémoire commune. Culture Connect est le
              rendez-vous, Kiltikonet en est la persistance.
            </p>
            <div className="mt-8">
              <EditorialLink to="/infrastructure" tone="light" testId="link-infrastructure">
                Voir l'infrastructure
              </EditorialLink>
            </div>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
