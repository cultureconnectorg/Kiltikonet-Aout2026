import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';

const K = {
  paper: '#F1EBDD', ivory: '#EAE3D2', ink: '#0F0C09', ash: '#1F1B15',
  bone: '#3C342A', dust: '#6B6560', rust: '#A65D47', gold: '#C9A84C', rule: '#00000010',
};

const Rule = ({ dark = false }) => (
  <div className="w-full h-px" style={{ background: dark ? '#ffffff15' : K.rule }} />
);

const BRICKS = [
  {
    id: '01', label: 'Identity', name: 'FREK-ID',
    role: 'Identifiant culturel numérique souverain',
    detail: "Chaque acteur, chaque objet culturel du réseau reçoit un identifiant stable, portable, contrôlé par son porteur. Il ne dépend d'aucun événement particulier — il traverse le temps.",
  },
  {
    id: '02', label: 'Cultural Objects', name: 'Cultural Cards',
    role: 'Documentation structurée des actifs',
    detail: "Œuvres, structures, projets, biens culturels : chaque objet culturel du réseau reçoit sa carte documentaire — attribution, provenance, métadonnées, liens.",
  },
  {
    id: '03', label: 'Network', name: 'Actors · Orgs · Territoires',
    role: 'Cartographie vivante du champ',
    detail: "L'infrastructure relie les artistes aux structures, les structures aux institutions, les institutions aux territoires — et les territoires entre eux. Une topologie du réseau afro-caribéen.",
  },
  {
    id: '04', label: 'Trace', name: 'Événements · Contributions · Présence',
    role: 'Mémoire des interactions',
    detail: "Chaque présence à Culture Connect, chaque contribution au réseau, chaque rencontre B2B laisse une trace dans l'infrastructure. Le réseau se souvient.",
  },
  {
    id: '05', label: 'Value', name: 'Cultural Value Engine',
    role: 'Circulation et valorisation',
    detail: "Le moteur de valeur culturelle rend possibles de nouvelles formes de circulation, de mise en marché et de reconnaissance des actifs culturels afro-caribéens.",
  },
];

export default function Infrastructure() {
  return (
    <div
      className="min-h-screen"
      style={{ background: K.paper, color: K.ink, fontFamily: "'Manrope', sans-serif" }}
      data-testid="infrastructure-page"
    >
      <SEO
        title="Infrastructure culturelle — Identité, données, valorisation"
        description="Kiltikonet développe une architecture d'identité culturelle, de données, de trace et de valeur pour les industries culturelles afro-caribéennes."
        path="/infrastructure"
      />

      {/* Bandeau documentaire */}
      <div
        className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28 pb-6 flex flex-wrap justify-between text-xs font-mono uppercase tracking-widest"
        style={{ color: K.dust }}
      >
        <span>Kiltikonet / Infrastructure</span>
        <span>5 briques fonctionnelles</span>
        <span>Souveraineté · Réutilisabilité</span>
      </div>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* Ouverture — H1 monumental */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-24 md:pb-40">
        <div className="text-xs font-mono uppercase tracking-widest mb-8" style={{ color: K.rust }}>
          <Link to="/">Kiltikonet</Link> · Infrastructure
        </div>

        <h1
          className="mb-16 md:mb-20 max-w-5xl"
          style={{
            fontFamily: "'Newsreader', serif", fontWeight: 400,
            fontSize: 'clamp(3rem, 7vw, 7rem)', lineHeight: 0.94,
            letterSpacing: '-0.035em', color: K.ink,
          }}
          data-testid="infra-title"
        >
          Une architecture <br />
          <span style={{ fontStyle: 'italic', color: K.bone }}>
            qui traverse chaque édition.
          </span>
        </h1>

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-6 md:col-start-1">
            <p style={{ color: K.bone, lineHeight: 1.75, fontSize: '15px' }}>
              L'infrastructure Kiltikonet est conçue pour vivre au-delà d'un seul
              événement. L'identifiant culturel utilisé à Culture Connect 2026
              reste actif pour l'édition 2027, 2028 et les suivantes. Un artiste
              identifié une fois le reste — et bénéficie de tout ce que Kiltikonet
              construit dans le temps.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:pt-2">
            <div className="text-xs font-mono uppercase tracking-widest space-y-1" style={{ color: K.dust }}>
              <div>Statut · Actif</div>
              <div>Premier déploiement · 2026</div>
              <div>Souveraineté · Kiltikonet</div>
              <div>Portage stratégique · CVLN Group</div>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* 5 briques — table éditoriale, pas de cards */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-32" data-testid="bricks-table">
        {BRICKS.map((b) => (
          <div key={b.id} className="grid grid-cols-12 gap-4 py-10 md:py-14"
               style={{ borderTop: `1px solid ${K.rule}` }}
               data-testid={`brick-${b.id}`}>
            <div className="col-span-2 md:col-span-1">
              <span className="text-xs font-mono tracking-widest" style={{ color: K.dust }}>
                {b.id}
              </span>
            </div>
            <div className="col-span-10 md:col-span-4">
              <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: K.rust }}>
                {b.label}
              </div>
              <div style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {b.name}
              </div>
              <div className="mt-2 text-sm italic" style={{ color: K.bone, fontFamily: "'Newsreader', serif" }}>
                {b.role}
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7">
              <p style={{ color: K.bone, fontSize: '15px', lineHeight: 1.7 }}>{b.detail}</p>
            </div>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${K.rule}` }} />
      </section>

      {/* Continuité — bande sombre */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-40"
               style={{ background: K.ink, color: K.paper }}
               data-testid="infra-continuity">
        <div className="text-xs font-mono uppercase tracking-widest mb-8" style={{ color: K.gold, opacity: 0.85 }}>
          Continuité
        </div>
        <h2
          className="mb-10 max-w-4xl"
          style={{
            fontFamily: "'Newsreader', serif", fontWeight: 400,
            fontSize: 'clamp(2.2rem, 4.6vw, 4.2rem)', lineHeight: 1,
            letterSpacing: '-0.03em', color: K.paper,
          }}
        >
          Une infrastructure <br />
          <span style={{ fontStyle: 'italic', color: '#B8B0A0' }}>
            ne se dissout pas avec la fin d'un événement.
          </span>
        </h2>
        <p className="max-w-2xl mb-10" style={{ color: '#B8B0A0', lineHeight: 1.75, fontSize: '15px' }}>
          Chaque édition de Culture Connect en active un morceau supplémentaire.
          Chaque acteur intégré au réseau augmente sa portée. Chaque objet
          documenté rejoint la mémoire commune. Ce qui se construit ne se défait plus.
        </p>
        <Link to="/rejoindre" className="inline-flex items-center gap-3 text-sm font-medium"
              style={{ color: K.paper, borderBottom: `1px solid ${K.paper}` }}
              data-testid="infra-cta">
          Rejoindre le réseau
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>→</span>
        </Link>
      </section>
    </div>
  );
}
