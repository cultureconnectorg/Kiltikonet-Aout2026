import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, MonumentalHeading, EditorialLink, IndexRow, MetaLine } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

/**
 * /culture-connect/2027 — Édition à venir, en continuité
 * Ne présente rien de chiffré, aucune promesse marketing.
 */
export default function CultureConnect2027() {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="cc2027-page"
    >
      <SEO
        title="Culture Connect 2027 — Édition à venir"
        description="Culture Connect 2027, la prochaine édition du marché international des industries culturelles afro-caribéennes. Programmation en cours."
        path="/culture-connect/2027"
      />

      <ArchiveBar
        left="Kiltikonet / Culture Connect / 2027"
        center="Édition à venir · Programmation en cours"
        right={dateStr}
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — Identité */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="cc2027-hero">
        <div className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: K.rust }}>
          <Link to="/">Kiltikonet</Link> → <Link to="/culture-connect">Culture Connect</Link> → 2027
        </div>

        <MonumentalHeading italic="Consolidation." maxWidth="18ch">
          Culture Connect 2027.
        </MonumentalHeading>

        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-6 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }} data-testid="cc2027-lead">
              La deuxième édition du marché international des industries culturelles
              afro-caribéennes. Elle prend appui sur ce qui a été construit en 2026 :
              acteurs déjà présents, identifiants culturels actifs, mémoire des interactions.
            </p>
            <p className="mt-6" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              La programmation est en cours. Les dates, le lieu et le format définitif
              seront annoncés officiellement.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MetaLine
              items={[
                { label: 'Statut', value: 'À venir' },
                { label: 'Dates', value: 'À confirmer' },
                { label: 'Lieu', value: 'En sélection' },
                { label: 'Portage', value: 'Kiltikonet' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — Perspectives */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="cc2027-perspectives">
        <SectionIndex n="02" label="Perspectives" />

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
          Ce qui prolonge. <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>Ce qui s'amplifie.</span>
        </h2>

        <div data-testid="cc2027-persp-list">
          <IndexRow
            id="01"
            label="Réseau"
            name="Continuité du réseau"
            description="Les artistes, structures et institutions présents en 2026 restent activement mobilisés. Leurs identifiants FREK-ID restent actifs, leurs interactions déjà tracées dans l'infrastructure."
            testId="cc2027-persp-01"
          />
          <IndexRow
            id="02"
            label="Territoire"
            name="Élargissement territorial"
            description="L'édition 2027 vise une ouverture accrue à la diaspora afro-caribéenne au-delà de la Martinique. Extension aux territoires partenaires en cours de définition."
            testId="cc2027-persp-02"
          />
          <IndexRow
            id="03"
            label="Infrastructure"
            name="Infrastructure renforcée"
            description="Les identifiants culturels FREK-ID, la cartographie des acteurs et la mémoire des interactions sont pleinement opérationnels — l'édition 2027 en bénéficie dès son lancement."
            testId="cc2027-persp-03"
          />
          <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
        </div>
      </section>

      {/* 03 — Notification / Rejoindre */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="cc2027-notify"
      >
        <SectionIndex n="03" label="Être informé" tone="light" />

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
              Recevoir les annonces officielles. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                Dates, lieu, appels.
              </span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
              Rejoindre le réseau Kiltikonet, c'est recevoir en priorité les annonces
              officielles de Culture Connect 2027 — sans publication marketing intermédiaire.
            </p>
            <div className="mt-8">
              <EditorialLink to="/rejoindre" tone="light" testId="cc2027-cta-join">
                Rejoindre le réseau
              </EditorialLink>
            </div>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
