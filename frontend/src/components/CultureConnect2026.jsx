import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, Metric, Source, MonumentalHeading, EditorialLink, IndexRow, MetaLine } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * /culture-connect/2026 — Archive institutionnelle de l'édition 2026
 * Uniquement des données réelles. Aucun chiffre inventé.
 * Les métriques encore non consolidées apparaissent avec la mention explicite.
 */
export default function CultureConnect2026() {
  const [publicNow, setPublicNow] = useState(null);
  useEffect(() => {
    axios
      .get(`${API}/api/observatory/public/now`)
      .then((r) => setPublicNow(r.data?.digital_memory || null))
      .catch(() => setPublicNow(null));
  }, []);

  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

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
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="cc2026-impact-page"
    >
      <SEO
        title="Culture Connect 2026 — Archive · Bilan"
        description="Culture Connect 2026 a eu lieu du 20 au 23 mai 2026 à Fort-de-France. Archive institutionnelle : programme, données consolidées, continuité vers CC2027."
        path="/culture-connect/2026"
        type="article"
        jsonLd={jsonLd}
      />

      <ArchiveBar
        left={`Kiltikonet / Culture Connect / 2026`}
        center="Archive 001 · Édition terminée"
        right={`Consulté le ${dateStr}`}
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — IDENTITÉ ARCHIVE */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="cc2026-hero">
        <div className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: K.rust }}>
          <Link to="/">Kiltikonet</Link> → <Link to="/culture-connect">Culture Connect</Link> → 2026
        </div>

        <MonumentalHeading italic="Une édition, une preuve." maxWidth="20ch">
          Culture Connect 2026.
        </MonumentalHeading>

        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Première édition de Culture Connect. Quatre jours de rencontres à
              Fort-de-France : un marché culturel, des conférences, des espaces de mise en
              relation, un concert de clôture. Chaque participant a reçu son identifiant
              culturel numérique — un fragment permanent du réseau.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MetaLine
              items={[
                { label: 'Dates', value: '20 – 23 mai 2026' },
                { label: 'Lieu', value: 'Fort-de-France, MQ' },
                { label: 'Statut', value: 'Terminée' },
                { label: 'Portage', value: 'Kiltikonet' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — DONNÉES RÉELLES (dispo via Observatory) */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="cc2026-metrics">
        <SectionIndex n="02" label="Preuves" />

        <h2
          className="mb-12 max-w-4xl"
          style={{
            fontFamily: K.serif,
            fontWeight: 400,
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.025em',
          }}
        >
          Les chiffres <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>enregistrés par l'infrastructure.</span>
        </h2>

        <p className="max-w-2xl mb-16" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
          Les données ci-dessous proviennent directement des collections métier de
          l'infrastructure Kiltikonet (analytics_events, registrations, workspace_logs).
          Aucun chiffre marketing. Les indicateurs de participation détaillés (nombre de
          professionnels, pays représentés) sont en cours de consolidation par l'équipe
          organisatrice et seront publiés une fois vérifiés.
        </p>

        <div className="grid md:grid-cols-2 gap-x-12" data-testid="cc2026-metrics-grid">
          <Metric
            label="Traces enregistrées"
            value={publicNow?.recorded_events}
            source="db.analytics_events (canonical)"
            testId="cc2026-metric-events"
          />
          <Metric
            label="Inscriptions"
            value={publicNow?.registrations}
            source="db.registrations"
            testId="cc2026-metric-registrations"
          />
          <Metric
            label="Activité workspace"
            value={publicNow?.workspace_activity}
            source="db.workspace_logs"
            testId="cc2026-metric-workspace"
          />
          <Metric
            label="Identités actives"
            value={publicNow?.cultural_identities_active}
            source="db.registrations (distinct)"
            testId="cc2026-metric-identities"
          />
        </div>

        <div className="mt-16">
          <Source>observatory/public/now · agrégats sans PII</Source>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 03 — PROGRAMME (index éditorial) */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="cc2026-programme">
        <SectionIndex n="03" label="Programme" />

        <h2
          className="mb-16 max-w-4xl"
          style={{
            fontFamily: K.serif,
            fontWeight: 400,
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.025em',
          }}
        >
          Quatre jours. <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>Un ensemble.</span>
        </h2>

        <div data-testid="cc2026-highlights">
          <IndexRow id="01" label="Marché" name="Marché culturel" description="Exposants Bronze / Silver / Gold, stands professionnels, mise en relation directe entre acteurs des industries culturelles afro-caribéennes." />
          <IndexRow id="02" label="Conférences" name="Tables rondes & keynotes" description="Programmation thématique sur les industries culturelles, la transmission, l'innovation, le marché et la souveraineté culturelle afro-caribéenne." />
          <IndexRow id="03" label="B2B" name="Rendez-vous professionnels" description="Sessions de networking B2B programmées, catalyseur de partenariats entre artistes, structures, institutions et distributeurs." />
          <IndexRow id="04" label="Scène" name="Concert de clôture" description="Le 22 mai — scène principale, invitation partenaires et VIP. Programmation artistique afro-caribéenne." />
          <IndexRow id="05" label="Ateliers" name="Formations ouvertes" description="Ateliers pratiques accessibles à tous les visiteurs accrédités : production, distribution, propriété intellectuelle, financement." />
          <IndexRow id="06" label="Identité" name="Badges FREK-ID" description="Chaque participant a reçu son identifiant culturel numérique — infrastructure pérenne qui traverse les éditions." />
          <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
        </div>
      </section>

      {/* 04 — CONTINUITÉ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="cc2026-continuity"
      >
        <SectionIndex n="04" label="Suite" tone="light" />

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
              CC 2026 pose les bases. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>CC 2027 les consolide.</span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
              Les liens créés en 2026, l'infrastructure déployée et l'expérience acquise
              nourrissent directement la prochaine édition.
            </p>
            <div className="mt-8">
              <EditorialLink to="/culture-connect/2027" tone="light" testId="link-cc2027">
                Voir Culture Connect 2027
              </EditorialLink>
            </div>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
