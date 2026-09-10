import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, MonumentalHeading, EditorialLink } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const PROFILES = [
  {
    id: '01',
    label: 'Acteur',
    name: 'Artiste · Créateur',
    description: 'Musicien, plasticien, auteur ou créateur culturel afro-caribéen. Découvrir le parcours de badge et d’identité culturelle.',
    to: '/badge-inscription',
    testId: 'join-artist',
  },
  {
    id: '02',
    label: 'Professionnel',
    name: 'Producteur · Distributeur · Média',
    description: 'Professionnel des industries culturelles. Découvrir les inscriptions et les rencontres proposées dans les programmes Culture Connect.',
    to: '/badge-inscription',
    testId: 'join-pro',
  },
  {
    id: '03',
    label: 'Institution',
    name: 'Collectivité · Ministère · École',
    description: 'Institution publique ou éducative. Prendre contact avec Kiltikonet pour un partenariat, un programme ou une coopération territoriale à instruire.',
    to: '/partenaires',
    testId: 'join-institution',
  },
  {
    id: '04',
    label: 'Partenaire',
    name: 'Sponsor · Entreprise · Fondation',
    description: 'Soutenir un programme, une édition Culture Connect ou une action structurante portée par Kiltikonet, selon le périmètre effectivement ouvert.',
    to: '/partenaires',
    testId: 'join-partner',
  },
];

export default function Rejoindre() {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="rejoindre-page"
    >
      <SEO
        title="Rejoindre Kiltikonet — quatre parcours d'entrée"
        description="Artistes, professionnels, institutions et partenaires : découvrez les parcours de participation à Kiltikonet."
        path="/rejoindre"
      />

      <ArchiveBar
        left={`Kiltikonet / Rejoindre / ${year}`}
        center="Quatre portes d'entrée"
        right={dateStr}
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — IDENTITÉ */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="rejoindre-hero">
        <SectionIndex n="01" label="Participer à Kiltikonet" />
        <MonumentalHeading italic="reste ouvert.">Kiltikonet</MonumentalHeading>
        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-6 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }} data-testid="rejoindre-lead">
              Chaque acteur — artiste, structure, institution ou partenaire — peut découvrir
              le parcours correspondant à son rôle : badge culturel, participation à Culture
              Connect ou prise de contact pour une coopération.
            </p>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — QUATRE PORTES */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="join-grid">
        <SectionIndex n="02" label="Quatre portes" />
        {PROFILES.map((p) => (
          <Link key={p.testId} to={p.to} className="block">
            <div
              className="grid grid-cols-12 gap-4 py-10 md:py-14 group"
              style={{ borderTop: `1px solid ${K.ruleLight}` }}
              data-testid={p.testId}
            >
              <div className="col-span-2 md:col-span-1">
                <span className="text-xs font-mono tracking-widest" style={{ color: K.dust }}>
                  {p.id}
                </span>
              </div>
              <div className="col-span-10 md:col-span-3">
                <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: K.rust }}>
                  {p.label}
                </div>
                <div style={{ fontFamily: K.serif, fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                  {p.name}
                </div>
              </div>
              <div className="col-span-12 md:col-span-7 md:pl-8">
                <p style={{ color: K.bone, fontSize: '15px', lineHeight: 1.65 }}>{p.description}</p>
              </div>
              <div className="col-span-12 md:col-span-1 md:text-right md:pt-2">
                <span
                  className="text-xs font-mono uppercase tracking-widest transition-opacity group-hover:opacity-100"
                  style={{ color: K.rust, opacity: 0.7 }}
                >
                  Continuer →
                </span>
              </div>
            </div>
          </Link>
        ))}
        <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
      </section>

      {/* 03 — IDENTITÉ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="rejoindre-support"
      >
        <SectionIndex n="03" label="Identité et continuité" tone="light" />
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7">
            <h2
              style={{
                fontFamily: K.serif,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4.4vw, 3.6rem)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: K.paper,
              }}
            >
              Un identifiant culturel. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                Une continuité entre les usages.
              </span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
              Le parcours de badge vous accompagne dans votre participation à Culture Connect.
              Les informations d’identité culturelle et les usages associés sont précisés
              dans votre parcours d’inscription.
            </p>
            <div className="mt-8">
              <EditorialLink to="/contact" tone="light" testId="cta-contact">
                Une question, un contact
              </EditorialLink>
            </div>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
