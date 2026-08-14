import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, MonumentalHeading, EditorialLink, IndexRow, MetaLine } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

/**
 * /a-propos — Page institutionnelle "About"
 * Aucune donnée inventée. Uniquement mission, gouvernance, positionnement.
 */
export default function APropos() {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'À propos — Kiltikonet',
    description:
      'Kiltikonet est un réseau et une infrastructure culturelle qui connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques.',
    url: 'https://kiltikonet.fr/a-propos',
    isPartOf: {
      '@type': 'Organization',
      name: 'CVLN Group',
    },
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="apropos-page"
    >
      <SEO
        title="À propos — Réseau et infrastructure culturelle afro-caribéenne"
        description="Kiltikonet est une infrastructure culturelle et un réseau institutionnel afro-caribéen. Une initiative CVLN Group. Fort-de-France, Martinique."
        path="/a-propos"
        jsonLd={jsonLd}
      />

      <ArchiveBar
        left={`Kiltikonet / À propos / ${year}`}
        center={`N° 001 · ${dateStr}`}
        right="Fort-de-France, MQ"
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — MISSION */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="section-mission">
        <SectionIndex n="01" label="Mission" />
        <MonumentalHeading italic="pour un monde relié.">
          Une infrastructure <br />culturelle
        </MonumentalHeading>
        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Kiltikonet est une organisation culturelle indépendante, portée par CVLN Group.
              Nous concevons et opérons une infrastructure numérique dédiée aux industries
              culturelles afro-caribéennes et diasporiques : identités, mémoire, réseau, valeur.
            </p>
            <p className="mt-6" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Notre mission n'est pas d'organiser un seul événement. Notre mission est de
              construire une architecture qui traverse les éditions, les acteurs et les décennies.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MetaLine
              items={[
                { label: 'Statut', value: 'Actif' },
                { label: 'Portage', value: 'CVLN Group' },
                { label: 'Siège', value: 'Fort-de-France, MQ' },
                { label: 'Champ', value: 'Industries culturelles' },
                { label: 'Portée', value: 'Caraïbe → Monde' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — POSITIONNEMENT */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="section-positionnement">
        <SectionIndex n="02" label="Positionnement" />

        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <h2
              style={{
                fontFamily: K.serif,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: K.ink,
              }}
            >
              Kiltikonet n'est pas un événement. <br />
              <span style={{ fontStyle: 'italic', color: K.bone }}>
                Culture Connect en est une expression.
              </span>
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              Culture Connect, notre marché récurrent, est la partie visible d'un système
              plus large. Derrière chaque édition existent des identifiants culturels, une
              cartographie des acteurs, une mémoire des interactions et un moteur de valeur.
            </p>
            <p className="mt-6" style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              L'organisation reste distincte du holding CVLN Group : Kiltikonet est
              l'entité culturelle, CVLN en assure le portage stratégique et transverse.
            </p>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 03 — GOUVERNANCE */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="section-gouvernance"
      >
        <SectionIndex n="03" label="Gouvernance" tone="light" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-6">
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
              Une structure <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>construite pour durer.</span>
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
              La gouvernance de Kiltikonet repose sur un modèle mixte : porteurs
              opérationnels sur le terrain (Fort-de-France), portage stratégique par CVLN
              Group, et cercle de membres associés qui participent à l'orientation du réseau.
            </p>
            <div className="mt-8">
              <EditorialLink to="/gouvernance" tone="light" testId="link-gouvernance">
                Consulter la gouvernance
              </EditorialLink>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — RELATION CVLN */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="section-cvln">
        <SectionIndex n="04" label="Écosystème CVLN" />

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
          Kiltikonet appartient à un écosystème plus large.
        </h2>

        <div data-testid="cvln-index">
          <IndexRow
            id="01"
            label="Holding"
            name="CVLN Group"
            description="Portage stratégique et transverse. CVLN opère plusieurs infrastructures : identité, finance, usage. Kiltikonet est l'entité culturelle."
            testId="cvln-01"
          />
          <IndexRow
            id="02"
            label="Identité"
            name="FREKCORE"
            description="Infrastructure d'identité numérique souveraine du groupe. FREK-ID est la couche d'identité utilisée par Kiltikonet pour ses acteurs, ses objets culturels et ses interactions."
            testId="cvln-02"
          />
          <IndexRow
            id="03"
            label="Réseau"
            name="Kiltikonet"
            description="Réseau et infrastructure culturelle. Opère Culture Connect, l'Observatory, la cartographie des acteurs et la mémoire des interactions culturelles afro-caribéennes."
            testId="cvln-03"
          />
          <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
        </div>
      </section>

      {/* 05 — CONTACT */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ash, color: K.paper }}
        data-testid="section-contact"
      >
        <SectionIndex n="05" label="Contact" tone="light" />

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
              Écrivez-nous. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>Le réseau reste ouvert.</span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:pt-4 space-y-4">
            <EditorialLink to="/contact" tone="light" testId="cta-contact">
              Contact institutionnel
            </EditorialLink>
            <br />
            <EditorialLink to="/rejoindre" tone="light" testId="cta-rejoindre">
              Rejoindre le réseau
            </EditorialLink>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
