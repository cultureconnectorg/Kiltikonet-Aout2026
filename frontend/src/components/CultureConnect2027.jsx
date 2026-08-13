import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Bell, ArrowRight, Sparkles } from 'lucide-react';
import SEO from './SEO';

const K = {
  bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0',
  dark: '#1A1510', muted: '#6B6560', gold: '#C9A84C',
  terra: '#A65D47', ink: '#0F0C09',
};

export default function CultureConnect2027() {
  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="cc2027-page">
      <SEO
        title="Culture Connect 2027 — Édition à venir"
        description="Culture Connect 2027, la prochaine édition du marché international des industries culturelles afro-caribéennes. Programmation en cours."
        path="/culture-connect/2027"
      />

      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → <Link to="/culture-connect">Culture Connect</Link> → 2027
          </div>

          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full mb-6"
               style={{ background: `${K.terra}20`, color: K.terra, border: `1px solid ${K.terra}40` }}
               data-testid="cc2027-status">
            <Sparkles className="w-3.5 h-3.5" />
            Édition à venir · Programmation en cours
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 max-w-4xl"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: K.dark, letterSpacing: '-0.02em' }}
            data-testid="cc2027-title"
          >
            Culture Connect 2027
          </h1>

          <p className="text-lg md:text-xl max-w-3xl mb-10" style={{ color: K.muted, lineHeight: 1.6 }}>
            La deuxième édition du marché international des industries culturelles afro-caribéennes.
            Consolidation de la dynamique lancée en 2026.
          </p>

          <div className="flex flex-wrap gap-6 mb-10 text-sm" style={{ color: K.muted }}>
            <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" /> Dates à confirmer</span>
            <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Lieu en cours de sélection</span>
          </div>

          <div className="p-6 md:p-8 rounded-2xl max-w-2xl"
               style={{ background: K.card, border: `1px solid ${K.warm}` }}
               data-testid="cc2027-notify">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: `${K.terra}15` }}>
                <Bell className="w-5 h-5" style={{ color: K.terra }} />
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: K.dark }}>Être informé en priorité</div>
                <p className="text-sm mb-4" style={{ color: K.muted }}>
                  Rejoignez le réseau Kiltikonet pour recevoir les annonces officielles de CC 2027 :
                  dates, lieu, appels à candidature, ouverture des inscriptions.
                </p>
                <Link
                  to="/rejoindre"
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                  style={{ color: K.terra }}
                  data-testid="cc2027-cta-join"
                >
                  Rejoindre le réseau <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ce qui change en 2027 */}
      <section className="px-6 md:px-10 lg:px-16 py-16" style={{ background: K.card }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: K.terra }}>
            Perspectives
          </div>
          <h2 className="text-3xl md:text-4xl mb-12 max-w-3xl" style={{ fontFamily: "'Newsreader', serif", color: K.dark }}>
            Ce qui prolonge, ce qui s'amplifie.
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: 'Continuité du réseau', desc: 'Les artistes, structures et institutions présents en 2026 restent activement mobilisés.' },
              { title: 'Élargissement territorial', desc: "L'édition 2027 vise une ouverture accrue à la diaspora afro-caribéenne au-delà de la Martinique." },
              { title: 'Infrastructure renforcée', desc: 'Les identifiants culturels FREK-ID et les données du réseau sont pleinement opérationnels.' },
            ].map((it, i) => (
              <div key={i} className="p-6 rounded-2xl"
                   style={{ background: K.bg, border: `1px solid ${K.warm}` }}
                   data-testid={`cc2027-persp-${i}`}>
                <div className="font-semibold mb-2" style={{ color: K.dark }}>{it.title}</div>
                <p className="text-sm" style={{ color: K.muted, lineHeight: 1.6 }}>{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
