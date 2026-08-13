import React from 'react';
import { Link } from 'react-router-dom';
import { Network, Layers, GraduationCap, Sparkles, ArrowRight, ChevronRight, MapPin, Users, Handshake } from 'lucide-react';
import SEO from './SEO';

// ─── Palette Kiltikonet institutionnel ───────────────
const K = {
  bg: '#F4F0E8',       // sable
  card: '#FFFFFF',
  warm: '#E8E0D0',     // ligne / bordure
  dark: '#1A1510',     // texte principal
  muted: '#6B6560',    // texte secondaire
  gold: '#C9A84C',     // accent chaud
  terra: '#A65D47',    // accent principal
  sage: '#4A5D4E',     // accent vert
  ink: '#0F0C09',      // bandeau sombre
};

// ─── Section — atome de composition (chapô + contenu) ─
const Section = ({ eyebrow, title, lead, children, className = '', dark = false }) => (
  <section
    className={`px-6 md:px-10 lg:px-16 py-16 md:py-24 ${className}`}
    style={{ background: dark ? K.ink : 'transparent', color: dark ? '#F1EBDD' : K.dark }}
  >
    <div className="max-w-6xl mx-auto">
      {eyebrow && (
        <div
          className="text-xs uppercase tracking-[0.2em] mb-4 font-medium"
          style={{ color: dark ? K.gold : K.terra }}
        >
          {eyebrow}
        </div>
      )}
      {title && (
        <h2
          className="text-3xl md:text-4xl lg:text-5xl leading-tight mb-6 max-w-3xl"
          style={{ fontFamily: "'Newsreader', 'Cormorant Garamond', serif", fontWeight: 500 }}
        >
          {title}
        </h2>
      )}
      {lead && (
        <p
          className="text-base md:text-lg max-w-3xl mb-10"
          style={{ color: dark ? '#B8B0A0' : K.muted, lineHeight: 1.7 }}
        >
          {lead}
        </p>
      )}
      {children}
    </div>
  </section>
);

// ─── Card institutionnelle (pilier / capacité) ────────
const PillarCard = ({ icon: Icon, title, description, testId }) => (
  <div
    data-testid={testId}
    className="p-6 md:p-8 rounded-2xl transition-all hover:shadow-lg"
    style={{ background: K.card, border: `1px solid ${K.warm}` }}
  >
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
      style={{ background: `${K.terra}12` }}
    >
      <Icon className="w-6 h-6" style={{ color: K.terra }} />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{ color: K.dark }}>
      {title}
    </h3>
    <p className="text-sm" style={{ color: K.muted, lineHeight: 1.6 }}>
      {description}
    </p>
  </div>
);

export default function KiltikonetHome() {
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
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="kiltikonet-home">
      <SEO
        title="Réseau et infrastructure culturelle afro-caribéenne"
        description="Kiltikonet connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques. Une initiative CVLN Group."
        path="/"
        jsonLd={jsonLd}
      />

      {/* ─── HERO — Mission institutionnelle ─────────── */}
      <section
        className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-20 md:pb-32 relative overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${K.bg} 0%, ${K.card} 100%)` }}
      >
        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] mb-8 px-3 py-1.5 rounded-full"
            style={{ background: `${K.gold}15`, color: K.gold, border: `1px solid ${K.gold}30` }}
            data-testid="hero-eyebrow"
          >
            <Sparkles className="w-3 h-3" />
            Une initiative CVLN Group
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-8 max-w-4xl"
            style={{
              fontFamily: "'Newsreader', 'Cormorant Garamond', serif",
              fontWeight: 500,
              color: K.dark,
              letterSpacing: '-0.02em',
            }}
            data-testid="hero-title"
          >
            Un réseau. Une infrastructure. <br />
            <span style={{ color: K.terra, fontStyle: 'italic' }}>
              Une culture qui se relie.
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mb-10"
            style={{ color: K.muted, lineHeight: 1.6 }}
            data-testid="hero-lead"
          >
            Kiltikonet est un réseau et une infrastructure culturelle qui connecte les acteurs,
            territoires et opportunités des industries culturelles afro-caribéennes et diasporiques.
          </p>

          <div className="flex flex-wrap gap-4" data-testid="hero-cta-group">
            <Link
              to="/rejoindre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: K.terra, color: '#fff' }}
              data-testid="hero-cta-join"
            >
              Rejoindre le réseau
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/culture-connect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'transparent', color: K.dark, border: `1px solid ${K.dark}30` }}
              data-testid="hero-cta-cc"
            >
              Découvrir Culture Connect
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Piliers — ce que fait Kiltikonet ────────── */}
      <Section
        eyebrow="Ce que fait Kiltikonet"
        title="Quatre fonctions, une même finalité : rendre la culture reliable et valorisable."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="pillars-grid">
          <PillarCard
            icon={Network}
            title="Réseau"
            description="Connecter artistes, structures, institutions et territoires autour d'objectifs partagés."
            testId="pillar-network"
          />
          <PillarCard
            icon={Layers}
            title="Infrastructure"
            description="Une architecture d'identité culturelle, de données et d'objets culturels réutilisable au-delà d'un seul événement."
            testId="pillar-infrastructure"
          />
          <PillarCard
            icon={GraduationCap}
            title="Programmes"
            description="Formation, accompagnement et coopération pour les acteurs des industries culturelles afro-caribéennes."
            testId="pillar-programs"
          />
          <PillarCard
            icon={Handshake}
            title="Marché"
            description="Culture Connect, notre marché international récurrent, où le réseau et l'infrastructure prennent forme."
            testId="pillar-market"
          />
        </div>
      </Section>

      {/* ─── Culture Connect — présenté comme initiative ─ */}
      <Section
        dark
        eyebrow="Initiative majeure"
        title="Culture Connect — le marché international des industries culturelles afro-caribéennes."
        lead="Un rendez-vous récurrent porté par Kiltikonet. La première édition a eu lieu en mai 2026 à Fort-de-France. Les éditions suivantes s'inscrivent dans une continuité pluriannuelle."
      >
        <div className="grid md:grid-cols-3 gap-4" data-testid="cc-editions">
          <Link
            to="/culture-connect/2026"
            className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ background: '#1a1712', border: `1px solid ${K.gold}30` }}
            data-testid="cc-edition-2026"
          >
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: K.gold }}>
              Édition 2026 · Terminée
            </div>
            <div className="text-3xl font-semibold mb-2" style={{ color: '#F1EBDD', fontFamily: "'Newsreader', serif" }}>
              CC 2026
            </div>
            <div className="text-sm mb-4" style={{ color: '#B8B0A0' }}>
              20-23 Mai 2026 · Fort-de-France
            </div>
            <div className="text-xs inline-flex items-center gap-1" style={{ color: K.gold }}>
              Voir le bilan <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link
            to="/culture-connect/2027"
            className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ background: '#1a1712', border: `1px solid ${K.terra}40` }}
            data-testid="cc-edition-2027"
          >
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: K.terra }}>
              Édition 2027 · À venir
            </div>
            <div className="text-3xl font-semibold mb-2" style={{ color: '#F1EBDD', fontFamily: "'Newsreader', serif" }}>
              CC 2027
            </div>
            <div className="text-sm mb-4" style={{ color: '#B8B0A0' }}>
              Programmation en cours
            </div>
            <div className="text-xs inline-flex items-center gap-1" style={{ color: K.terra }}>
              Être informé <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link
            to="/culture-connect"
            className="p-6 rounded-2xl flex flex-col justify-center transition-all hover:scale-[1.02]"
            style={{ background: 'transparent', border: `1px dashed ${K.gold}40` }}
            data-testid="cc-mother-page"
          >
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#B8B0A0' }}>
              Toutes les éditions
            </div>
            <div className="text-lg mb-4" style={{ color: '#F1EBDD' }}>
              Voir la page mère Culture Connect et l'ensemble de la série d'éditions.
            </div>
            <div className="text-xs inline-flex items-center gap-1" style={{ color: K.gold }}>
              Explorer <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </Section>

      {/* ─── Infrastructure culturelle ─────────────── */}
      <Section
        eyebrow="Infrastructure culturelle"
        title="Une identité culturelle numérique, structurée et souveraine."
        lead="Kiltikonet développe une infrastructure permettant d'identifier, structurer, connecter et valoriser les acteurs et objets culturels de l'écosystème afro-caribéen."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <div
            className="p-6 rounded-2xl"
            style={{ background: K.card, border: `1px solid ${K.warm}` }}
            data-testid="infra-identity"
          >
            <div className="text-sm font-semibold mb-2" style={{ color: K.terra }}>
              Identité
            </div>
            <p className="text-sm" style={{ color: K.muted, lineHeight: 1.6 }}>
              Identification numérique des acteurs et objets culturels via un identifiant souverain.
            </p>
          </div>

          <div
            className="p-6 rounded-2xl"
            style={{ background: K.card, border: `1px solid ${K.warm}` }}
            data-testid="infra-data"
          >
            <div className="text-sm font-semibold mb-2" style={{ color: K.terra }}>
              Données culturelles
            </div>
            <p className="text-sm" style={{ color: K.muted, lineHeight: 1.6 }}>
              Structuration et documentation des actifs culturels — cartographie vivante du réseau.
            </p>
          </div>

          <div
            className="p-6 rounded-2xl"
            style={{ background: K.card, border: `1px solid ${K.warm}` }}
            data-testid="infra-value"
          >
            <div className="text-sm font-semibold mb-2" style={{ color: K.terra }}>
              Valorisation
            </div>
            <p className="text-sm" style={{ color: K.muted, lineHeight: 1.6 }}>
              Création de nouvelles possibilités de circulation et d'exploitation de la valeur culturelle.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link
            to="/infrastructure"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: K.terra }}
            data-testid="infra-more"
          >
            Voir l'infrastructure en détail <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* ─── Territoire ancré ────────────────────── */}
      <Section eyebrow="Territoire" title="Ancré à Fort-de-France, ouvert au monde.">
        <div className="flex flex-wrap gap-6 items-center">
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
            style={{ background: K.card, border: `1px solid ${K.warm}` }}
            data-testid="territory-fdf"
          >
            <MapPin className="w-4 h-4" style={{ color: K.terra }} />
            <span className="text-sm font-medium" style={{ color: K.dark }}>
              Fort-de-France, Martinique
            </span>
          </div>
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
            style={{ background: K.card, border: `1px solid ${K.warm}` }}
          >
            <Users className="w-4 h-4" style={{ color: K.terra }} />
            <span className="text-sm font-medium" style={{ color: K.dark }}>
              Diaspora afro-caribéenne
            </span>
          </div>
        </div>
      </Section>

      {/* ─── CTA final ───────────────────────────── */}
      <Section dark>
        <div className="text-center max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl mb-6"
            style={{ fontFamily: "'Newsreader', serif", color: '#F1EBDD' }}
            data-testid="final-cta-title"
          >
            Vous êtes artiste, structure, institution ou partenaire ?
          </h2>
          <p className="text-base mb-8" style={{ color: '#B8B0A0' }}>
            Rejoignez le réseau Kiltikonet et prenez part à la prochaine édition de Culture Connect.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/rejoindre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ background: K.gold, color: K.ink }}
              data-testid="final-cta-join"
            >
              Rejoindre Kiltikonet
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ background: 'transparent', color: '#F1EBDD', border: '1px solid #F1EBDD30' }}
              data-testid="final-cta-contact"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </Section>

      {/* ─── Footer institutionnel ───────────────── */}
      <footer
        className="px-6 md:px-10 lg:px-16 py-12"
        style={{ background: K.ink, borderTop: `1px solid #ffffff10` }}
        data-testid="institutional-footer"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 text-sm" style={{ color: '#B8B0A0' }}>
          <div>
            <div className="font-semibold mb-3" style={{ color: '#F1EBDD' }}>Kiltikonet</div>
            <p className="text-xs">Une initiative CVLN Group.</p>
          </div>
          <div>
            <div className="font-semibold mb-3" style={{ color: '#F1EBDD' }}>Culture Connect</div>
            <ul className="space-y-1 text-xs">
              <li><Link to="/culture-connect">Page mère</Link></li>
              <li><Link to="/culture-connect/2026">Édition 2026</Link></li>
              <li><Link to="/culture-connect/2027">Édition 2027</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3" style={{ color: '#F1EBDD' }}>Infrastructure</div>
            <ul className="space-y-1 text-xs">
              <li><Link to="/infrastructure">Identité culturelle</Link></li>
              <li><Link to="/gouvernance">Gouvernance</Link></li>
              <li><Link to="/partenaires">Partenaires</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3" style={{ color: '#F1EBDD' }}>Contact</div>
            <ul className="space-y-1 text-xs">
              <li><Link to="/rejoindre">Rejoindre le réseau</Link></li>
              <li><Link to="/contact">Nous contacter</Link></li>
              <li><a href="/legal/mentions-legales.html">Mentions légales</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
