import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Instagram, Linkedin, ArrowRight } from 'lucide-react';
import SEO from './SEO';

const K = { bg: '#F4F0E8', card: '#FFFFFF', warm: '#E8E0D0', dark: '#1A1510', muted: '#6B6560', terra: '#A65D47', ink: '#0F0C09' };

export default function ContactKiltikonet() {
  return (
    <div className="min-h-screen" style={{ background: K.bg }} data-testid="contact-page">
      <SEO
        title="Contact"
        description="Contacter Kiltikonet — email, adresse et réseaux sociaux du réseau et de l'infrastructure culturelle afro-caribéenne."
        path="/contact"
      />

      <section className="px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: K.terra }}>
            <Link to="/">Kiltikonet</Link> → Contact
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6"
              style={{ fontFamily: "'Newsreader', serif", color: K.dark, letterSpacing: '-0.02em' }}
              data-testid="contact-title">
            Nous contacter.
          </h1>
          <p className="text-lg max-w-2xl mb-12" style={{ color: K.muted, lineHeight: 1.6 }}>
            Écrivez-nous pour toute demande d'information, de partenariat ou de collaboration.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            <a href="mailto:contact@kiltikonet.fr"
               className="p-6 rounded-2xl block transition-all hover:shadow-lg"
               style={{ background: K.card, border: `1px solid ${K.warm}` }}
               data-testid="contact-email">
              <Mail className="w-6 h-6 mb-3" style={{ color: K.terra }} />
              <div className="font-semibold mb-1" style={{ color: K.dark }}>Email</div>
              <div className="text-sm" style={{ color: K.muted }}>contact@kiltikonet.fr</div>
            </a>

            <div className="p-6 rounded-2xl"
                 style={{ background: K.card, border: `1px solid ${K.warm}` }}
                 data-testid="contact-location">
              <MapPin className="w-6 h-6 mb-3" style={{ color: K.terra }} />
              <div className="font-semibold mb-1" style={{ color: K.dark }}>Localisation</div>
              <div className="text-sm" style={{ color: K.muted }}>Fort-de-France, Martinique</div>
            </div>

            <a href="https://www.instagram.com/kiltikonet" target="_blank" rel="noopener noreferrer"
               className="p-6 rounded-2xl block transition-all hover:shadow-lg"
               style={{ background: K.card, border: `1px solid ${K.warm}` }}
               data-testid="contact-instagram">
              <Instagram className="w-6 h-6 mb-3" style={{ color: K.terra }} />
              <div className="font-semibold mb-1" style={{ color: K.dark }}>Instagram</div>
              <div className="text-sm" style={{ color: K.muted }}>@kiltikonet</div>
            </a>

            <a href="https://www.linkedin.com/company/kiltikonet" target="_blank" rel="noopener noreferrer"
               className="p-6 rounded-2xl block transition-all hover:shadow-lg"
               style={{ background: K.card, border: `1px solid ${K.warm}` }}
               data-testid="contact-linkedin">
              <Linkedin className="w-6 h-6 mb-3" style={{ color: K.terra }} />
              <div className="font-semibold mb-1" style={{ color: K.dark }}>LinkedIn</div>
              <div className="text-sm" style={{ color: K.muted }}>company/kiltikonet</div>
            </a>
          </div>

          <div className="mt-12 p-6 rounded-2xl"
               style={{ background: K.ink, color: '#F1EBDD' }}
               data-testid="contact-cta">
            <div className="font-semibold mb-2">Vous cherchez à rejoindre le réseau ?</div>
            <Link to="/rejoindre" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#C9A84C' }}>
              Voir les parcours d'adhésion <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
