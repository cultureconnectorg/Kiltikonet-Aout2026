import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Check, ArrowRight, Star, Ticket, Loader2, X, XCircle } from 'lucide-react';
import { useIntersectionObserver } from '../hooks/useAnimations';
import { toast } from 'sonner';
import { trackConversion } from '../lib/smartTracker';

const API = process.env.REACT_APP_BACKEND_URL;

// Animated pricing card component
const PricingCard = ({ tier, index, language, onSelect }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);
  
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorClasses = {
    sage: 'border-sage hover:border-sage',
    terracotta: 'border-terracotta hover:border-terracotta',
    charcoal: 'border-charcoal hover:border-charcoal'
  };

  const buttonClasses = {
    sage: 'bg-sage hover:bg-sage/90',
    terracotta: 'bg-terracotta hover:bg-terracotta/90',
    charcoal: 'bg-charcoal hover:bg-charcoal/90'
  };

  return (
    <div
      ref={ref}
      className={`relative bg-paper border-2 rounded-lg p-6 sm:p-8 transition-all duration-500 ${
        colorClasses[tier.color]
      } ${tier.popular ? 'shadow-xl scale-105' : ''} ${
        isHovered ? 'shadow-lg -translate-y-1' : ''
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? (isHovered ? 'translateY(-4px)' : 'translateY(0)') 
          : 'translateY(40px)',
        transition: prefersReducedMotion 
          ? 'opacity 0.3s ease-out' 
          : `opacity 0.6s ease-out ${index * 0.15}s, transform 0.6s ease-out ${index * 0.15}s`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`pricing-card-${tier.id}`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-terracotta text-paper text-xs font-medium rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          {language === 'fr' ? 'Populaire' : 'Popular'}
        </div>
      )}

      <h3 className="font-serif text-2xl text-charcoal mb-2">{tier.name}</h3>
      <p className="text-charcoal/60 text-sm mb-6">{tier.description}</p>

      <div className="mb-6">
        <span className="font-serif text-4xl text-charcoal">
          {tier.price === 0 ? (language === 'fr' ? 'Gratuit' : 'Free') : `${tier.price}€`}
        </span>
        {tier.price > 0 && (
          <span className="text-charcoal/50 text-sm ml-2">
            {language === 'fr' ? '/ personne' : '/ person'}
          </span>
        )}
      </div>

      <ul className="space-y-3 mb-4">
        {tier.features.map((feature, i) => (
          <li 
            key={i} 
            className="flex items-start gap-3 text-sm text-charcoal/70"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-10px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.2s' 
                : `opacity 0.4s ease-out ${(index * 0.15) + (i * 0.05)}s, transform 0.4s ease-out ${(index * 0.15) + (i * 0.05)}s`,
            }}
          >
            <Check className={`w-4 h-4 mt-0.5 text-${tier.color} flex-shrink-0`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {tier.exclusions && tier.exclusions.length > 0 && (
        <ul className="space-y-2 mb-8 pt-3 border-t border-lightborder">
          {tier.exclusions.map((excl, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-terracotta/70">
              <XCircle className="w-4 h-4 mt-0.5 text-terracotta/50 flex-shrink-0" />
              <span>{excl}</span>
            </li>
          ))}
        </ul>
      )}

      {!tier.exclusions && <div className="mb-8" />}

      <Button
        onClick={() => onSelect(tier)}
        className={`w-full h-12 ${buttonClasses[tier.color]} text-paper font-syne text-sm tracking-wide rounded-none transition-all duration-300 group`}
      >
        {tier.price === 0
          ? (language === 'fr' ? "S'inscrire gratuitement" : 'Register for free')
          : (language === 'fr' ? "S'inscrire" : 'Register')
        }
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Button>
    </div>
  );
};

export const PricingPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [heroVisible, setHeroVisible] = useState(false);

  // Ticket purchase state
  const [ticketModal, setTicketModal] = useState(null); // 'general' | 'vip' | null
  const [ticketForm, setTicketForm] = useState({ name: '', email: '' });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Show success toast when returning from Stripe
  useEffect(() => {
    if (new URLSearchParams(location.search).get('ticket') === 'success') {
      setTicketSuccess(true);
    }
  }, [location.search]);

  const handleTicketCheckout = async (tier) => {
    if (!ticketForm.name.trim() || !ticketForm.email.trim()) {
      toast.error(language === 'fr' ? 'Nom et email requis' : 'Name and email required');
      return;
    }
    setTicketLoading(true);
    try {
      const res = await fetch(`${API}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ticket',
          tier,
          origin_url: window.location.origin,
          buyer_name: ticketForm.name.trim(),
          buyer_email: ticketForm.email.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        trackConversion('ticket_checkout', { tier, price: tier === 'vip' ? 150 : 45 });
        window.location.href = data.url;
      } else {
        toast.error(data.detail || 'Erreur paiement');
      }
    } catch {
      toast.error('Erreur de connexion');
    }
    setTicketLoading(false);
  };
  
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const tiers = [
    {
      id: 'visiteur',
      name: language === 'fr' ? 'Visiteur' : 'Visitor',
      price: 0,
      description: language === 'fr'
        ? 'Pré-inscription gratuite — Marché Culturel uniquement'
        : 'Free pre-registration — Cultural Market only',
      color: 'sage',
      badge_type: 'VIS',
      features: language === 'fr' ? [
        'Accès au Marché Culturel',
        'Badge visiteur Culture Connect',
        'Ateliers ouverts gratuits',
        'Documentation digitale'
      ] : [
        'Cultural Market access',
        'Culture Connect visitor badge',
        'Free open workshops',
        'Digital documentation'
      ],
      exclusions: language === 'fr' ? [
        'Concerts & spectacles non inclus',
        'Conférences non incluses'
      ] : [
        'Concerts & shows not included',
        'Conferences not included'
      ]
    },
    {
      id: 'emerging',
      name: language === 'fr' ? 'Émergent' : 'Emerging',
      price: 50,
      description: language === 'fr' 
        ? 'Jeunes entrepreneurs, PME, startups culturelles & artistes émergents'
        : 'Young entrepreneurs, SMEs, cultural startups & emerging artists',
      color: 'sage',
      badge_type: 'BNV',
      features: language === 'fr' ? [
        'Accès aux conférences',
        'Badge accréditation officiel',
        'Networking sessions',
        'Accès au Concert (22 Mai)',
        'Documentation digitale',
        'Certificat de participation'
      ] : [
        'Conference access',
        'Official accreditation badge',
        'Networking sessions',
        'Concert access (May 22)',
        'Digital documentation',
        'Participation certificate'
      ]
    },
    {
      id: 'professional',
      name: language === 'fr' ? 'Professionnel' : 'Professional',
      price: 300,
      description: language === 'fr'
        ? 'Pour les professionnels et structures'
        : 'For professionals and organizations',
      color: 'terracotta',
      popular: true,
      badge_type: 'INT',
      features: language === 'fr' ? [
        'Tout le pack Émergent',
        'Accès prioritaire aux tables rondes',
        'Rendez-vous B2B personnalisés',
        'Espace networking VIP',
        'Catalogue des participants',
        'Stand partagé (option)',
        'Accès backstage concerts',
        'Support dédié'
      ] : [
        'All Emerging benefits',
        'Priority roundtable access',
        'Personalized B2B meetings',
        'VIP networking lounge',
        'Participant directory',
        'Shared stand (option)',
        'Concert backstage access',
        'Dedicated support'
      ]
    },
    {
      id: 'institutional',
      name: language === 'fr' ? 'Institutionnel' : 'Institutional',
      price: 500,
      description: language === 'fr'
        ? 'Pour les institutions et partenaires majeurs'
        : 'For institutions and major partners',
      color: 'charcoal',
      badge_type: 'SPO',
      features: language === 'fr' ? [
        'Tout le pack Professionnel',
        'Stand dédié au Marché Culturel',
        'Prise de parole en plénière',
        'Accès aux données & analytics',
        'Logo sur supports officiels',
        'Invitations VIP illimitées',
        'Accès zone presse',
        'Partenariat média'
      ] : [
        'All Professional benefits',
        'Dedicated Cultural Market stand',
        'Plenary speaking slot',
        'Data & analytics access',
        'Logo on official materials',
        'Unlimited VIP invitations',
        'Press area access',
        'Media partnership'
      ]
    }
  ];

  const handleSelectTier = (tier) => {
    if (tier.price === 0) {
      // Visiteur gratuit → formulaire simplifié
      navigate('/badge-inscription', { state: { selectedType: tier.badge_type, tierName: tier.name } });
    } else {
      // Payant → formulaire complet 3 étapes (identité, activité pro, objectifs)
      navigate('/badge-inscription', { state: { selectedTier: tier.id, selectedType: tier.badge_type, tierName: tier.name, useFullForm: true } });
    }
  };

  return (
    <div className="min-h-screen bg-paper overflow-hidden">
      {/* Hero Section */}
      <section className="py-20 sm:py-28 bg-charcoal text-cream overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta/20 rounded-full mb-6"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-20px)',
              transition: prefersReducedMotion ? 'opacity 0.3s' : 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            <span className="text-terracotta text-sm font-medium">
              20-23 Mai 2026 · Fort-de-France
            </span>
          </div>

          {/* Title */}
          <h1 
            className="font-serif text-4xl sm:text-5xl lg:text-6xl mb-6"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-30px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.3s ease-out' 
                : 'opacity 0.6s ease-out 0.2s, transform 0.6s ease-out 0.2s',
            }}
          >
            {language === 'fr' ? 'Tarifs & Accréditations' : 'Pricing & Accreditations'}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg text-cream/70 max-w-2xl mx-auto"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.3s ease-out' 
                : 'opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s',
            }}
          >
            {language === 'fr'
              ? 'Choisissez le pass qui correspond à votre profil et rejoignez Culture Connect 2026.'
              : 'Choose the pass that fits your profile and join Culture Connect 2026.'
            }
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 sm:py-28 -mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {tiers.map((tier, index) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                index={index}
                language={language}
                onSelect={handleSelectTier}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Ticket success banner */}
      {ticketSuccess && (
        <div className="bg-sage/10 border-b border-sage/30 py-4 px-4 text-center">
          <p className="text-sage font-medium text-sm">
            {language === 'fr'
              ? 'Paiement confirmé — votre billet a été envoyé par email.'
              : 'Payment confirmed — your ticket has been sent by email.'}
          </p>
        </div>
      )}

      {/* Tickets Section */}
      <section className="py-20 bg-charcoal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta/20 rounded-full mb-4">
              <Ticket className="w-4 h-4 text-terracotta" />
              <span className="text-terracotta text-sm font-medium">
                {language === 'fr' ? 'Billetterie — Entrée Événement' : 'Tickets — Event Entry'}
              </span>
            </div>
            <h2 className="font-serif text-3xl text-cream mb-3">
              {language === 'fr' ? 'Venez vivre l\'expérience' : 'Come live the experience'}
            </h2>
            <p className="text-cream/60 text-sm">20-23 Mai 2026 · Grand Carbet Aimé Césaire, Fort-de-France</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                id: 'general',
                name: language === 'fr' ? 'Billet Général' : 'General Ticket',
                price: 45,
                access: language === 'fr'
                  ? ['Entrée générale 4 jours', 'Concerts & spectacles', 'Marché culturel', 'Ateliers ouverts', 'Accès Concert (22 Mai)']
                  : ['4-day general entry', 'Concerts & shows', 'Cultural market', 'Open workshops', 'Concert access (May 22)'],
              },
              {
                id: 'vip',
                name: language === 'fr' ? 'Billet VIP' : 'VIP Ticket',
                price: 150,
                popular: true,
                access: language === 'fr'
                  ? ['Tout le Billet Général', 'Lounge VIP 4 jours', 'Conférences & tables rondes', 'Networking privé', 'Backstage & rencontres artistes']
                  : ['All General Ticket', 'VIP Lounge 4 days', 'Conferences & round tables', 'Private networking', 'Backstage & artist meet'],
              }
            ].map((t) => (
              <div key={t.id} className={`relative bg-paper rounded-lg p-6 ${t.popular ? 'ring-2 ring-terracotta' : ''}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-terracotta text-paper text-xs font-medium rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> VIP
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-serif text-xl text-charcoal">{t.name}</h3>
                  <div className="mt-2">
                    <span className="font-serif text-3xl text-charcoal">{t.price}€</span>
                    <span className="text-charcoal/50 text-sm ml-1">
                      {language === 'fr' ? '/ personne' : '/ person'}
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {t.access.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-charcoal/70">
                      <Check className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => { setTicketModal(t.id); setTicketForm({ name: '', email: '' }); }}
                  className={`w-full h-11 font-syne text-sm rounded-none ${t.popular ? 'bg-terracotta hover:bg-terracotta/90 text-paper' : 'bg-charcoal hover:bg-charcoal/90 text-paper'}`}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Acheter ce billet' : 'Buy this ticket'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticket checkout modal */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !ticketLoading && setTicketModal(null)}>
          <div className="bg-paper rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg text-charcoal">
                {ticketModal === 'vip' ? (language === 'fr' ? 'Billet VIP — 150€' : 'VIP Ticket — €150') : (language === 'fr' ? 'Billet Général — 45€' : 'General Ticket — €45')}
              </h3>
              <button onClick={() => setTicketModal(null)} disabled={ticketLoading} className="text-charcoal/40 hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-1">
                  {language === 'fr' ? 'Nom complet' : 'Full name'} *
                </label>
                <input
                  type="text"
                  required
                  value={ticketForm.name}
                  onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 px-3 border border-lightborder bg-cream text-charcoal text-sm rounded-none"
                  placeholder={language === 'fr' ? 'Votre nom' : 'Your name'}
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={ticketForm.email}
                  onChange={e => setTicketForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-10 px-3 border border-lightborder bg-cream text-charcoal text-sm rounded-none"
                  placeholder="votre@email.com"
                />
              </div>
              <Button
                onClick={() => handleTicketCheckout(ticketModal)}
                disabled={ticketLoading || !ticketForm.name || !ticketForm.email}
                className="w-full h-11 bg-terracotta hover:bg-terracotta/90 text-paper font-syne text-sm rounded-none disabled:opacity-50"
              >
                {ticketLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
                {language === 'fr' ? 'Payer avec Stripe' : 'Pay with Stripe'}
              </Button>
              <p className="text-xs text-charcoal/40 text-center">
                {language === 'fr' ? 'Paiement sécurisé · Billet envoyé par email' : 'Secure payment · Ticket sent by email'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl text-charcoal mb-4">
            {language === 'fr' ? 'Des questions ?' : 'Questions?'}
          </h2>
          <p className="text-charcoal/60 mb-6">
            {language === 'fr'
              ? 'Contactez-nous pour plus d\'informations sur les accréditations.'
              : 'Contact us for more information about accreditations.'
            }
          </p>
          <a 
            href="mailto:contact@kiltikonet.fr"
            className="text-terracotta hover:text-terracotta/80 underline underline-offset-4 transition-colors"
          >
            contact@kiltikonet.fr
          </a>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
