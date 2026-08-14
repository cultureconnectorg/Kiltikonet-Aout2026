import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, MonumentalHeading, EditorialLink, MetaLine } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const CONTACTS = [
  {
    id: '01',
    label: 'Email',
    name: 'contact@kiltikonet.fr',
    kind: 'Contact institutionnel',
    href: 'mailto:contact@kiltikonet.fr',
    external: false,
    testId: 'contact-email',
  },
  {
    id: '02',
    label: 'Localisation',
    name: 'Fort-de-France · Martinique',
    kind: 'Siège opérationnel',
    href: null,
    external: false,
    testId: 'contact-location',
  },
  {
    id: '03',
    label: 'Instagram',
    name: '@kiltikonet',
    kind: 'Réseau public',
    href: 'https://www.instagram.com/kiltikonet',
    external: true,
    testId: 'contact-instagram',
  },
  {
    id: '04',
    label: 'LinkedIn',
    name: 'company/kiltikonet',
    kind: 'Réseau professionnel',
    href: 'https://www.linkedin.com/company/kiltikonet',
    external: true,
    testId: 'contact-linkedin',
  },
];

export default function ContactKiltikonet() {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: K.sans }}
      data-testid="contact-page"
    >
      <SEO
        title="Contact"
        description="Contacter Kiltikonet — email institutionnel, siège, réseaux professionnels de l'infrastructure culturelle afro-caribéenne."
        path="/contact"
      />

      <ArchiveBar
        left={`Kiltikonet / Contact / ${year}`}
        center="Contact institutionnel"
        right={dateStr}
      />
      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 01 — Identité */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40" data-testid="contact-hero">
        <SectionIndex n="01" label="Contact" />
        <MonumentalHeading italic="restent ouvertes." maxWidth="16ch">
          Les portes
        </MonumentalHeading>

        <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5 md:col-start-2">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }} data-testid="contact-lead">
              Écrivez-nous pour toute demande d'information, de partenariat institutionnel,
              de collaboration ou de presse. Chaque message est lu par un membre de
              l'équipe — pas par un service automatisé.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MetaLine
              items={[
                { label: 'Réponse', value: '48h ouvrées' },
                { label: 'Langues', value: 'FR · EN · KW' },
                { label: 'Siège', value: 'Fort-de-France, MQ' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 02 — Contacts (index éditorial) */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40" data-testid="contact-index">
        <SectionIndex n="02" label="Canaux" />

        {CONTACTS.map((c) => {
          const rowContent = (
            <div
              className="grid grid-cols-12 gap-4 py-10 md:py-14 group"
              style={{ borderTop: `1px solid ${K.ruleLight}` }}
              data-testid={c.testId}
            >
              <div className="col-span-2 md:col-span-1">
                <span className="text-xs font-mono tracking-widest" style={{ color: K.dust }}>
                  {c.id}
                </span>
              </div>
              <div className="col-span-10 md:col-span-3">
                <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: K.rust }}>
                  {c.label}
                </div>
                <div style={{ fontFamily: K.serif, fontSize: 'clamp(1.4rem, 2.2vw, 1.8rem)', lineHeight: 1.15, letterSpacing: '-0.01em', color: K.ink }}>
                  {c.name}
                </div>
              </div>
              <div className="col-span-12 md:col-span-7 md:pl-8">
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: K.dust }}>
                  {c.kind}
                </div>
              </div>
              <div className="col-span-12 md:col-span-1 md:text-right">
                {c.href && (
                  <span className="text-xs font-mono uppercase tracking-widest" style={{ color: K.rust }}>
                    → 
                  </span>
                )}
              </div>
            </div>
          );

          if (!c.href) return <div key={c.id}>{rowContent}</div>;

          if (c.external) {
            return (
              <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" className="block">
                {rowContent}
              </a>
            );
          }

          return (
            <a key={c.id} href={c.href} className="block">
              {rowContent}
            </a>
          );
        })}
        <div style={{ borderTop: `1px solid ${K.ruleLight}` }} />
      </section>

      {/* 03 — CTA rejoindre */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
        style={{ background: K.ink, color: K.paper }}
        data-testid="contact-cta"
      >
        <SectionIndex n="03" label="Rejoindre" tone="light" />
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
              Prendre part au réseau. <br />
              <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
                Quatre portes d'entrée.
              </span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:pt-4">
            <EditorialLink to="/rejoindre" tone="light" testId="link-rejoindre">
              Voir les parcours
            </EditorialLink>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
