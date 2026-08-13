import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';

// ─── Palette institutionnelle Kiltikonet ─────────────
const K = {
  paper: '#F1EBDD',    // grain doux
  ivory: '#EAE3D2',
  ink:   '#0F0C09',    // noir profond
  ash:   '#1F1B15',    // noir chaud
  bone:  '#3C342A',    // taupe
  dust:  '#6B6560',    // secondaire
  rust:  '#A65D47',    // accent (rare)
  gold:  '#C9A84C',    // accent (rare)
  rule:  '#00000010',  // 1px hairline
};

// ─── Numérotation de section (documentaire) ───────────
const SectionIndex = ({ n, label, tone = 'dark' }) => (
  <div
    className="flex items-baseline gap-4 mb-8 md:mb-12"
    style={{ color: tone === 'dark' ? K.ink : K.paper }}
    data-testid={`section-index-${n}`}
  >
    <span
      className="text-xs font-mono tracking-[0.2em]"
      style={{ opacity: 0.5 }}
    >
      {n} ——
    </span>
    <span
      className="text-xs uppercase tracking-[0.25em] font-medium"
      style={{ opacity: 0.7 }}
    >
      {label}
    </span>
  </div>
);

// ─── Rule (trait horizontal fin, style archive) ───────
const Rule = ({ dark = false }) => (
  <div
    className="w-full h-px"
    style={{ background: dark ? '#ffffff15' : K.rule }}
  />
);

// ─── Metadata bloc (dates, coord, index — style catalogue) ─
const MetaLine = ({ items, dark = false }) => (
  <div
    className="flex flex-wrap gap-x-8 gap-y-2 text-xs font-mono tracking-wider"
    style={{ color: dark ? '#8A8378' : K.dust, opacity: 0.85 }}
  >
    {items.map((it, i) => (
      <span key={i} className="uppercase" data-testid={`meta-${i}`}>
        {it.label} <span style={{ color: dark ? K.paper : K.ink }}>{it.value}</span>
      </span>
    ))}
  </div>
);

export default function KiltikonetHome() {
  // ─── Année vivante (mise à jour au 1er janvier — pas d'animation) ─
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const dateStr = now.toISOString().slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kiltikonet',
    url: 'https://kiltikonet.fr',
    description:
      'Réseau et infrastructure culturelle qui connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques.',
    parentOrganization: { '@type': 'Organization', name: 'CVLN Group' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Fort-de-France',
      addressRegion: 'Martinique',
      addressCountry: 'FR',
    },
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: K.paper,
        color: K.ink,
        fontFamily: "'Manrope', 'DM Sans', sans-serif",
      }}
      data-testid="kiltikonet-home"
    >
      <SEO
        title="Réseau et infrastructure culturelle afro-caribéenne"
        description="Kiltikonet connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques. Une initiative CVLN Group."
        path="/"
        jsonLd={jsonLd}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* BANDEAU DOCUMENTAIRE — Numéro d'archive, date, coord */}
      {/* ═══════════════════════════════════════════════════ */}
      <div
        className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28 pb-6 flex flex-wrap justify-between items-baseline gap-4 text-xs font-mono tracking-widest uppercase"
        style={{ color: K.dust }}
        data-testid="archive-bar"
      >
        <span>Kiltikonet / Institution / {year}</span>
        <span>N° 001 · {dateStr}</span>
        <span>14.6161°N · 61.0588°W</span>
      </div>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 01 — IDENTITÉ                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40"
        data-testid="section-identity"
      >
        <SectionIndex n="01" label="Identité" />

        <h1
          className="mb-16 md:mb-24"
          style={{
            fontFamily: "'Newsreader', 'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: 'clamp(3.2rem, 8vw, 8rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.035em',
            color: K.ink,
            maxWidth: '18ch',
          }}
          data-testid="hero-title"
        >
          Kiltikonet.
          <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>
            Une infrastructure culturelle
          </span>
          <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>pour un monde relié.</span>
        </h1>

        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5 md:col-start-2">
            <p
              className="text-base md:text-lg"
              style={{ color: K.bone, lineHeight: 1.65, fontFamily: "'Manrope', sans-serif" }}
              data-testid="hero-lead"
            >
              Kiltikonet est un réseau et une infrastructure culturelle. Nous relions
              les acteurs, les territoires et les opportunités des industries culturelles
              afro-caribéennes et diasporiques — de la Caraïbe vers le monde.
            </p>
            <p
              className="mt-6 text-sm uppercase tracking-widest font-mono"
              style={{ color: K.dust }}
            >
              Initiative CVLN Group
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:pt-2">
            <MetaLine
              items={[
                { label: 'Siège', value: 'Fort-de-France, MQ' },
                { label: 'Champ', value: 'Industries culturelles' },
                { label: 'Portée', value: 'Caraïbe → Monde' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 02 — TERRITOIRE                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        data-testid="section-territoire"
      >
        <SectionIndex n="02" label="Territoire" />

        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: K.ink,
              }}
            >
              La Caraïbe n'est pas un décor. <br />
              <span style={{ fontStyle: 'italic', color: K.bone }}>
                C'est un point de départ.
              </span>
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Nous partons de Fort-de-France pour tracer des lignes vers Paris,
              Dakar, New York, Kingston, Cayenne, Pointe-à-Pitre, São Paulo. Les
              routes de la diaspora afro-caribéenne ne sont pas des trajectoires
              isolées — elles forment un ensemble, un système, un réseau. Kiltikonet
              en documente les nœuds et en cartographie les flux.
            </p>
          </div>
        </div>

        {/* Grille de territoires — pas de cards, uniquement lignes documentaires */}
        <div
          className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2"
          data-testid="territoire-index"
        >
          {[
            ['Fort-de-France', '14.6161°N'],
            ['Pointe-à-Pitre', '16.2411°N'],
            ['Cayenne', '4.9331°N'],
            ['Paris', '48.8566°N'],
            ['Dakar', '14.7167°N'],
            ['Kingston', '17.9714°N'],
            ['New York', '40.7128°N'],
            ['São Paulo', '23.5505°S'],
          ].map(([city, coord]) => (
            <div key={city} className="py-3" style={{ borderTop: `1px solid ${K.rule}` }}>
              <div
                className="text-base md:text-lg"
                style={{ color: K.ink, fontFamily: "'Newsreader', serif" }}
              >
                {city}
              </div>
              <div
                className="text-xs font-mono uppercase tracking-widest mt-0.5"
                style={{ color: K.dust }}
              >
                {coord}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 03 — RÉSEAU (bande sombre, silence + monumental)     */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="section-reseau"
      >
        <SectionIndex n="03" label="Réseau" tone="light" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5.2vw, 5rem)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: K.paper,
              }}
            >
              Un réseau se voit <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                à ce qu'il relie.
              </span>
            </h2>
            <p
              className="mt-10 md:mt-14 max-w-xl"
              style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}
            >
              Artistes. Structures. Institutions. Territoires. Chaque nœud du
              réseau Kiltikonet reçoit une identité culturelle numérique
              souveraine, portable, réutilisable au-delà d'un seul événement.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-10 md:pt-2 space-y-6" data-testid="network-index">
            {[
              ['Artistes', 'individus'],
              ['Structures', 'organisations'],
              ['Institutions', 'partenaires'],
              ['Territoires', 'lieux'],
            ].map(([label, kind], i) => (
              <div key={label}>
                <div
                  className="text-xs font-mono tracking-widest uppercase mb-1"
                  style={{ color: K.gold, opacity: 0.8 }}
                >
                  N.{String(i + 1).padStart(2, '0')} · {kind}
                </div>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '1.75rem',
                    color: K.paper,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 04 — MÉMOIRE / ARCHIVE                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        data-testid="section-memoire"
      >
        <SectionIndex n="04" label="Mémoire" />

        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div
              className="text-xs font-mono uppercase tracking-widest mb-3"
              style={{ color: K.rust }}
            >
              Kiltikonet / Archive · 001
            </div>
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                lineHeight: 1,
                letterSpacing: '-0.025em',
              }}
            >
              Culture Connect <br />
              <span style={{ fontStyle: 'italic', color: K.bone }}>2026</span>
            </h2>
            <div className="mt-6 text-sm font-mono uppercase tracking-widest" style={{ color: K.dust }}>
              20 – 23 mai 2026 · Fort-de-France
            </div>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Une première édition. Quatre jours de rencontres. Un marché
              culturel, des conférences, des espaces de mise en relation, un
              concert de clôture. Chaque participant a reçu son identifiant
              culturel — un fragment permanent du réseau.
            </p>
            <p className="mt-6" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Culture Connect 2026 ne s'achève pas avec la clôture de l'événement.
              L'archive continue.
            </p>
            <div className="mt-8">
              <Link
                to="/culture-connect/2026"
                className="inline-flex items-center gap-3 text-sm font-medium"
                style={{ color: K.ink, borderBottom: `1px solid ${K.ink}` }}
                data-testid="link-archive-cc2026"
              >
                Consulter l'archive 001
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 05 — INFRASTRUCTURE                                 */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        data-testid="section-infrastructure"
      >
        <SectionIndex n="05" label="Infrastructure" />

        <h2
          className="mb-16 md:mb-20 max-w-4xl"
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 400,
            fontSize: 'clamp(2.2rem, 4.6vw, 4.2rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          Une architecture <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>
            faite pour durer.
          </span>
        </h2>

        <div className="space-y-0" data-testid="infra-list">
          {[
            { id: '01', label: 'Identité', name: 'FREK-ID', desc: 'Identifiant culturel numérique souverain.' },
            { id: '02', label: 'Objets culturels', name: 'Cultural Cards', desc: 'Documentation structurée des actifs culturels.' },
            { id: '03', label: 'Réseau', name: 'Actors · Orgs · Territoires', desc: 'Cartographie vivante des acteurs et lieux du champ afro-caribéen.' },
            { id: '04', label: 'Trace', name: 'Événements · Contributions · Présence', desc: 'Mémoire des interactions et des présences dans le réseau.' },
            { id: '05', label: 'Valeur', name: 'Cultural Value Engine', desc: 'Moteur de circulation et de valorisation de la valeur culturelle.' },
          ].map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 gap-4 py-8 md:py-10"
              style={{ borderTop: `1px solid ${K.rule}` }}
              data-testid={`infra-row-${row.id}`}
            >
              <div className="col-span-2 md:col-span-1">
                <span className="text-xs font-mono tracking-widest" style={{ color: K.dust }}>
                  {row.id}
                </span>
              </div>
              <div className="col-span-10 md:col-span-3">
                <div className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: K.rust }}>
                  {row.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '1.5rem',
                    lineHeight: 1.1,
                    color: K.ink,
                  }}
                >
                  {row.name}
                </div>
              </div>
              <div className="col-span-12 md:col-span-8 md:pl-8">
                <p style={{ color: K.bone, fontSize: '15px', lineHeight: 1.65 }}>{row.desc}</p>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${K.rule}` }} />
        </div>

        <div className="mt-16">
          <Link
            to="/infrastructure"
            className="inline-flex items-center gap-3 text-sm font-medium"
            style={{ color: K.ink, borderBottom: `1px solid ${K.ink}` }}
            data-testid="link-infrastructure"
          >
            Voir l'infrastructure complète
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>→</span>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 06 — CULTURE CONNECT (bande sombre / éditions)      */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ash, color: K.paper }}
        data-testid="section-culture-connect"
      >
        <SectionIndex n="06" label="Culture Connect" tone="light" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5.4vw, 5.5rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: K.paper,
              }}
            >
              Le marché récurrent <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                des industries culturelles <br />
                afro-caribéennes.
              </span>
            </h2>
            <p
              className="mt-10 max-w-xl"
              style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}
            >
              Culture Connect n'est pas un événement unique — c'est une série.
              Une édition ancre la précédente, une édition prépare la suivante.
              Kiltikonet en porte la permanence institutionnelle.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-10 space-y-1" data-testid="editions-list">
            {[
              { year: '2026', status: 'archive', path: '/culture-connect/2026' },
              { year: '2027', status: 'à venir', path: '/culture-connect/2027' },
              { year: '2028', status: 'projeté', path: null },
            ].map((ed, i) => (
              <div
                key={ed.year}
                className="py-4"
                style={{ borderTop: i === 0 ? `1px solid #ffffff20` : `1px solid #ffffff10` }}
              >
                {ed.path ? (
                  <Link to={ed.path} className="block group" data-testid={`edition-${ed.year}`}>
                    <div className="flex items-baseline justify-between">
                      <span
                        style={{
                          fontFamily: "'Newsreader', serif",
                          fontSize: '2rem',
                          color: K.paper,
                          lineHeight: 1,
                        }}
                      >
                        {ed.year}
                      </span>
                      <span
                        className="text-xs uppercase tracking-widest font-mono"
                        style={{ color: K.gold, opacity: 0.85 }}
                      >
                        {ed.status} →
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-baseline justify-between opacity-40" data-testid={`edition-${ed.year}`}>
                    <span
                      style={{
                        fontFamily: "'Newsreader', serif",
                        fontSize: '2rem',
                        color: K.paper,
                        lineHeight: 1,
                      }}
                    >
                      {ed.year}
                    </span>
                    <span className="text-xs uppercase tracking-widest font-mono" style={{ color: '#B8B0A0' }}>
                      {ed.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div style={{ borderTop: `1px solid #ffffff10` }} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 07 — IMPACT (typographie monumentale, données réelles) */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        data-testid="section-impact"
      >
        <SectionIndex n="07" label="Impact" />

        <h2
          className="mb-12 md:mb-20 max-w-4xl"
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 400,
            fontSize: 'clamp(2.2rem, 4.6vw, 4.2rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          Les preuves <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>plutôt que les promesses.</span>
        </h2>

        <p
          className="max-w-2xl mb-16"
          style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}
        >
          Les chiffres consolidés de Culture Connect 2026 sont en cours de
          validation par l'équipe organisatrice et ses partenaires. Ils seront
          publiés uniquement une fois vérifiés — la mémoire ne s'écrit pas
          approximativement.
        </p>

        <div className="grid md:grid-cols-4 gap-x-8 gap-y-10" data-testid="impact-index">
          {[
            ['Participants', 'en consolidation'],
            ['Professionnels', 'en consolidation'],
            ['Territoires', 'en consolidation'],
            ['Rendez-vous B2B', 'en consolidation'],
          ].map(([label, note]) => (
            <div key={label} className="pt-6" style={{ borderTop: `1px solid ${K.rule}` }}>
              <div
                className="mb-3"
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontSize: 'clamp(3rem, 6vw, 5rem)',
                  lineHeight: 1,
                  color: K.dust,
                  fontStyle: 'italic',
                }}
              >
                —
              </div>
              <div className="text-sm uppercase tracking-widest font-mono" style={{ color: K.ink }}>
                {label}
              </div>
              <div className="text-xs mt-1 font-mono uppercase tracking-widest" style={{ color: K.dust }}>
                {note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 08 — PARTICIPATION (bandeau sombre final)           */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="section-participation"
      >
        <SectionIndex n="08" label="Participation" tone="light" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7">
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5.4vw, 5rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: K.paper,
              }}
            >
              Le réseau reste ouvert. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                À qui veut en écrire la suite.
              </span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:pt-4 space-y-6">
            <Link
              to="/rejoindre"
              className="block py-6"
              style={{ borderTop: `1px solid #ffffff30`, borderBottom: `1px solid #ffffff20` }}
              data-testid="cta-join"
            >
              <div className="flex items-baseline justify-between">
                <span
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    color: K.paper,
                  }}
                >
                  Rejoindre
                </span>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: K.gold }}>
                  Artiste · Pro · Institution
                </span>
              </div>
            </Link>
            <Link
              to="/contact"
              className="block py-6"
              style={{ borderTop: `1px solid #ffffff10`, borderBottom: `1px solid #ffffff20` }}
              data-testid="cta-contact"
            >
              <div className="flex items-baseline justify-between">
                <span
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    color: K.paper,
                  }}
                >
                  Contact
                </span>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#B8B0A0' }}>
                  Partenariat · Presse
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* COLOPHON — pied documentaire                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <footer
        className="px-6 md:px-12 lg:px-20 py-16 md:py-24"
        style={{ background: K.ink, color: '#8A8378', borderTop: `1px solid #ffffff10` }}
        data-testid="colophon"
      >
        <div className="grid md:grid-cols-12 gap-8 text-xs font-mono uppercase tracking-widest">
          <div className="md:col-span-4">
            <div className="mb-2" style={{ color: K.paper, fontFamily: "'Newsreader', serif", textTransform: 'none', fontSize: '1.5rem', letterSpacing: 'normal' }}>
              Kiltikonet
            </div>
            <div>Initiative CVLN Group · {year}</div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-3" style={{ color: K.paper }}>Culture Connect</div>
            <div className="space-y-1" style={{ textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' }}>
              <div><Link to="/culture-connect">Page mère</Link></div>
              <div><Link to="/culture-connect/2026">Édition 2026</Link></div>
              <div><Link to="/culture-connect/2027">Édition 2027</Link></div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-3" style={{ color: K.paper }}>Institution</div>
            <div className="space-y-1" style={{ textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' }}>
              <div><Link to="/a-propos">À propos</Link></div>
              <div><Link to="/infrastructure">Infrastructure</Link></div>
              <div><Link to="/gouvernance">Gouvernance</Link></div>
              <div><Link to="/partenaires">Partenaires</Link></div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-3" style={{ color: K.paper }}>Contact</div>
            <div className="space-y-1" style={{ textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' }}>
              <div><Link to="/rejoindre">Rejoindre</Link></div>
              <div><Link to="/contact">Contact</Link></div>
              <div><a href="mailto:contact@kiltikonet.fr">contact@kiltikonet.fr</a></div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-3" style={{ color: K.paper }}>Légal</div>
            <div className="space-y-1" style={{ textTransform: 'none', letterSpacing: 'normal', fontFamily: 'inherit' }}>
              <div><a href="/legal/mentions-legales.html">Mentions légales</a></div>
              <div><a href="/legal/politique-confidentialite.html">Confidentialité</a></div>
              <div><a href="/legal/cgu.html">CGU</a></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
