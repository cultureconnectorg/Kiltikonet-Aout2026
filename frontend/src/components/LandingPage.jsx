import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  ArrowRight, MapPin, Calendar, Users, Globe, Layers,
  Mail, Instagram, Linkedin, Send, ChevronDown, Star
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { LegalFooter } from './legal';
import { 
  useIntersectionObserver, 
  useCountUp, 
  Reveal, 
  StaggerContainer,
  AnimatedNumber 
} from '../hooks/useAnimations';
import { ParticleBackground, Countdown } from './CinematicElements';
import { Globe3D } from './Globe3D';
import { useSharedData } from '../contexts/SharedDataContext';
import HCaptchaWidget from './HCaptchaWidget';

export const LandingPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactCaptchaToken, setContactCaptchaToken] = useState(null);
  const contactCaptchaRef = useRef(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const parallaxRef = useRef(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  
  // Shared data (synced from all workspaces)
  const { partners: sharedPartners } = useSharedData();
  
  // Reduced motion check
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero load animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Parallax effect for hero
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setParallaxOffset(scrollY * 0.5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);
  
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactCaptchaToken) {
      toast.error(language === 'fr' ? 'Veuillez compléter le captcha' : 'Please complete the captcha');
      return;
    }
    setIsSubmitting(true);
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      await axios.post(`${API}/contact`, {
        ...contactForm,
        captcha_token: contactCaptchaToken,
      });
      toast.success(language === 'fr' ? 'Message envoyé !' : 'Message sent!');
      setContactForm({ name: '', email: '', message: '' });
      setContactCaptchaToken(null);
      contactCaptchaRef.current?.reset();
    } catch (err) {
      toast.error(language === 'fr' ? 'Erreur lors de l\'envoi' : 'Send error');
    }
    setIsSubmitting(false);
  };
  
  const programDays = [
    { day: 'Mer. 20 Mai', title: language === 'fr' ? 'Accueil & Accréditations' : 'Welcome & Accreditation', location: 'Bibliothèque Schœlcher' },
    { day: 'Jeu. 21 Mai', title: language === 'fr' ? 'Workshop & Rencontres' : 'Workshop & Meetings', location: 'Grand Carbet Aimé Césaire' },
    { day: 'Ven. 22 Mai', title: language === 'fr' ? 'Sélébrasyon 22 Mé' : 'Celebration 22 May', location: 'Grand Carbet Aimé Césaire', highlight: true },
    { day: 'Sam. 23 Mai', title: language === 'fr' ? 'Brunch & Bilan' : 'Brunch & Review', location: 'Grand Carbet Aimé Césaire' }
  ];
  
  const partners = [
    'CTM', 'France Travail', 'ISCA Business School', 'SACEM', 'DAC Martinique', 'Factory Maker', 'Skillfor', 'JTV Digital', 'Labo des histoires', 'CFA Audiovisuel'
  ];

  // Stats data with animation directions
  const stats = [
    { num: '40', suffix: '-60', title: language === 'fr' ? 'Stands Accrédités' : 'Accredited Stands', direction: 'left' },
    { num: 'Live', title: language === 'fr' ? 'Scène Démo' : 'Demo Stage', direction: 'down', isText: true },
    { num: 'VIP', title: 'Networking B2B', direction: 'right', isText: true },
    { num: '5', suffix: '+', title: language === 'fr' ? 'Institutions' : 'Institutions', direction: 'up' }
  ];

  return (
    <div className="min-h-screen bg-paper overflow-hidden">
      {/* ═══════════ MOMENT 1 — HERO ═══════════ */}
      <section 
        ref={parallaxRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden" 
        data-testid="hero-section"
      >
        {/* Parallax Background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-charcoal/5 via-cream to-terracotta/5"
          style={{
            transform: prefersReducedMotion ? 'none' : `translateY(${parallaxOffset}px)`,
          }}
        />
        
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-paper/70" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl">
            {/* Eyebrow - Slides from left */}
            <p 
              className="text-terracotta font-syne text-sm tracking-widest uppercase mb-6"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? 'translateX(0)' : 'translateX(-40px)',
                transition: prefersReducedMotion 
                  ? 'opacity 0.3s ease-out' 
                  : 'opacity 0.6s ease-out, transform 0.6s ease-out',
              }}
            >
              Fort-de-France, Martinique · 20—23 Mai 2026
            </p>
            
            {/* Logo - Fades in */}
            <div 
              className="mb-8"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? 'translateY(0)' : 'translateY(-20px)',
                transition: prefersReducedMotion 
                  ? 'opacity 0.3s ease-out' 
                  : 'opacity 0.6s ease-out 0.2s, transform 0.6s ease-out 0.2s',
              }}
            >
              <img 
                src="/logo.png" 
                alt="Culture Connect" 
                className="h-20 sm:h-24 lg:h-28 w-auto"
              />
            </div>
            
            {/* Title - Each line drops from above */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-charcoal leading-tight mb-6">
              <span 
                className="block"
                style={{
                  opacity: heroLoaded ? 1 : 0,
                  transform: heroLoaded ? 'translateY(0)' : 'translateY(-30px)',
                  transition: prefersReducedMotion 
                    ? 'opacity 0.3s ease-out' 
                    : 'opacity 0.5s ease-out 0.4s, transform 0.5s ease-out 0.4s',
                }}
              >
                {language === 'fr' ? 'Marché professionnel' : 'Professional market'}
              </span>
              <span 
                className="block"
                style={{
                  opacity: heroLoaded ? 1 : 0,
                  transform: heroLoaded ? 'translateY(0)' : 'translateY(-30px)',
                  transition: prefersReducedMotion 
                    ? 'opacity 0.3s ease-out' 
                    : 'opacity 0.5s ease-out 0.6s, transform 0.5s ease-out 0.6s',
                }}
              >
                {language === 'fr' ? 'des industries culturelles' : 'for cultural industries'}
              </span>
              <span 
                className="block text-terracotta"
                style={{
                  opacity: heroLoaded ? 1 : 0,
                  transform: heroLoaded ? 'translateY(0)' : 'translateY(-30px)',
                  transition: prefersReducedMotion 
                    ? 'opacity 0.3s ease-out' 
                    : 'opacity 0.5s ease-out 0.8s, transform 0.5s ease-out 0.8s',
                }}
              >
                {language === 'fr' ? 'afro-descendantes' : 'of the Afro-descendant'}
              </span>
            </h1>
            
            {/* Subtitle - Fades up */}
            <p 
              className="text-lg sm:text-xl text-charcoal/70 font-body max-w-2xl mb-10"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
                transition: prefersReducedMotion 
                  ? 'opacity 0.3s ease-out' 
                  : 'opacity 0.6s ease-out 1s, transform 0.6s ease-out 1s',
              }}
            >
              {language === 'fr'
                ? 'Connecter la diaspora et les territoires d\'origine pour façonner l\'avenir de la culture caribéenne.'
                : 'Connecting the diaspora and territories of origin to shape the future of Caribbean culture.'
              }
            </p>
            
            {/* CTAs - Rise together */}
            <div 
              className="flex flex-col sm:flex-row gap-4"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? 'translateY(0)' : 'translateY(30px)',
                transition: prefersReducedMotion 
                  ? 'opacity 0.3s ease-out' 
                  : 'opacity 0.6s ease-out 1.2s, transform 0.6s ease-out 1.2s',
              }}
            >
              <Button
                onClick={() => navigate('/pricing')}
                className="group h-14 px-8 bg-terracotta text-paper font-syne text-sm tracking-wide hover:bg-terracotta/90 rounded-none transition-all duration-300 hover:scale-[1.02]"
                data-testid="hero-cta-register"
              >
                {language === 'fr' ? "Demander une accréditation" : "Request accreditation"}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button
                onClick={() => scrollToSection('programme')}
                variant="outline"
                className="h-14 px-8 border-charcoal text-charcoal font-syne text-sm tracking-wide hover:bg-charcoal hover:text-paper rounded-none transition-all duration-300"
                data-testid="hero-cta-program"
              >
                {language === 'fr' ? "Découvrir le programme" : "Discover the program"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <button 
          onClick={() => scrollToSection('stats')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-charcoal/40 hover:text-terracotta transition-colors animate-bounce"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transition: 'opacity 0.6s ease-out 1.5s',
          }}
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-lightborder" />
      </div>

      {/* ═══════════ MOMENT 2 — LES CHIFFRES ═══════════ */}
      <section id="stats" className="py-24 sm:py-32" data-testid="stats-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((item, i) => (
                <StatCard 
                  key={item.title} 
                  {...item} 
                  index={i}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </div>
            
            {/* Text Content */}
            <Reveal direction="right" delay={0.3}>
              <p className="text-terracotta font-syne text-sm tracking-widest uppercase mb-4">
                22 Mai 2026
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mb-6">
                {language === 'fr' ? 'Le Marché Culturel' : 'The Cultural Market'}
              </h2>
              <p className="text-charcoal/70 font-body text-lg leading-relaxed mb-4">
                {language === 'fr'
                  ? 'Un espace de rencontre unique pour les professionnels de l\'industrie musicale et culturelle caribéenne. Exposants, showcases live, rencontres B2B.'
                  : 'A unique meeting space for Caribbean music and cultural industry professionals. Exhibitors, live showcases, B2B meetings.'
                }
              </p>
              <p className="text-charcoal/50 text-sm italic">
                Inspiré du Mercado Cultural del Caribe
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ MOMENT 3 — LA DIASPORA SE RASSEMBLE (GLOBE 3D) ═══════════ */}
      <Globe3D />

      {/* ═══════════ MOMENT 4 — LE COMPTE À REBOURS ═══════════ */}
      <Countdown targetDate="2026-05-22T00:00:00" />

      {/* ═══════════ MOMENT 5 — PROGRAMME ═══════════ */}
      <section id="programme" className="py-24 sm:py-32 bg-cream" data-testid="programme-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-terracotta font-syne text-sm tracking-widest uppercase mb-4">
                {language === 'fr' ? '4 jours d\'événements' : '4 days of events'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">
                Programme
              </h2>
            </div>
          </Reveal>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programDays.map((day, i) => (
              <ProgramCard 
                key={day.day} 
                day={day} 
                index={i} 
                isLast={i === programDays.length - 1}
                language={language}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
          
          {/* Bouton vers le programme complet */}
          <Reveal>
            <div className="text-center mt-12">
              <button
                onClick={() => navigate('/programme')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-charcoal text-paper font-syne text-sm tracking-wider uppercase rounded-full hover:bg-terracotta transition-all duration-300 group"
                data-testid="view-full-programme-btn"
              >
                {language === 'fr' ? 'Découvrir le programme complet' : 'View full programme'}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ MOMENT 6 — PARTENAIRES ═══════════ */}
      <section id="partenaires" className="py-24 sm:py-32" data-testid="partenaires-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sage font-syne text-sm tracking-widest uppercase mb-4">
                {language === 'fr' ? 'Nos soutiens' : 'Our supporters'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">
                {language === 'fr' ? 'Ils soutiennent Culture Connect' : 'They support Culture Connect'}
              </h2>
            </div>
          </Reveal>
          
          <PartnersGrid partners={partners} navigate={navigate} language={language} />
        </div>
      </section>

      {/* ═══════════ MOMENT 7 — L'APPEL FINAL ═══════════ */}
      <section className="relative py-24 sm:py-32 bg-charcoal overflow-hidden" data-testid="cta-section">
        {/* Particle Background */}
        <ParticleBackground />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Split title animation */}
          <CTATitle language={language} />
          
          <Reveal delay={0.4}>
            <p className="text-paper/70 font-body text-lg mb-10 max-w-2xl mx-auto">
              {language === 'fr' 
                ? 'Artistes, labels, institutions, presse — déposez votre dossier d\'accréditation'
                : 'Artists, labels, institutions, press — submit your accreditation request'
              }
            </p>
          </Reveal>
          
          <Reveal delay={0.6}>
            <Button
              onClick={() => navigate('/pricing')}
              className="group h-14 px-10 bg-terracotta text-paper font-syne text-sm tracking-wide hover:bg-terracotta/80 rounded-none transition-all duration-300 hover:scale-[1.02]"
            >
              {language === 'fr' ? "S'accréditer maintenant" : "Register now"}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1 group-hover:pause" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 sm:py-32 bg-paper" data-testid="contact-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <Reveal direction="left">
              <p className="text-terracotta font-syne text-sm tracking-widest uppercase mb-4">
                Contact
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mb-6">
                {language === 'fr' ? 'Restons en contact' : 'Stay in touch'}
              </h2>
              
              <div className="space-y-4 mb-8">
                <a 
                  href="mailto:contact@kiltikonet.fr" 
                  className="flex items-center gap-3 text-charcoal/70 hover:text-terracotta transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  contact@kiltikonet.fr
                </a>
              </div>
              
              <div className="flex items-center gap-4">
                <a 
                  href="https://www.instagram.com/culturconnect?igsh=ODB1cXF1enVya3cz&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 border border-lightborder flex items-center justify-center text-charcoal/50 hover:text-terracotta hover:border-terracotta transition-all duration-300"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-12 h-12 border border-lightborder flex items-center justify-center text-charcoal/50 hover:text-terracotta hover:border-terracotta transition-all duration-300"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </Reveal>
            
            <Reveal direction="right" delay={0.15}>
              <form 
                onSubmit={handleContactSubmit}
                className="space-y-5"
              >
                <Input
                  type="text"
                  placeholder={language === 'fr' ? 'Votre nom' : 'Your name'}
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12 bg-cream border-lightborder text-charcoal placeholder:text-charcoal/40 rounded-none focus:border-terracotta transition-colors"
                  required
                />
                <Input
                  type="email"
                  placeholder={language === 'fr' ? 'Votre email' : 'Your email'}
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-12 bg-cream border-lightborder text-charcoal placeholder:text-charcoal/40 rounded-none focus:border-terracotta transition-colors"
                  required
                />
                <Textarea
                  placeholder={language === 'fr' ? 'Votre message' : 'Your message'}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className="bg-cream border-lightborder text-charcoal placeholder:text-charcoal/40 min-h-[120px] rounded-none focus:border-terracotta transition-colors"
                  required
                />
                {/* hCaptcha Widget */}
                <div data-testid="captcha-container-contact">
                  <HCaptchaWidget
                    ref={contactCaptchaRef}
                    onVerify={(token) => setContactCaptchaToken(token)}
                    onExpire={() => setContactCaptchaToken(null)}
                    onError={() => setContactCaptchaToken(null)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-charcoal text-paper font-syne text-sm tracking-wide hover:bg-charcoal/90 rounded-none transition-all duration-300"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Envoyer' : 'Send'}
                </Button>
              </form>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-lightborder bg-paper" data-testid="footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-charcoal/50">
            <p>Culture Connect 2026 · Fort-de-France, Martinique</p>
            <div className="flex items-center gap-4">
              <a href="/faq" className="hover:text-terracotta transition-colors">FAQ</a>
              <a href="/support" className="hover:text-terracotta transition-colors">{language === 'fr' ? 'Support' : 'Support'}</a>
              <span>Factory Maker Studio</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-lightborder">
            <LegalFooter />
          </div>
        </div>
      </footer>
    </div>
  );
};

// ═══════════ STAT CARD COMPONENT ═══════════
const StatCard = ({ num, suffix = '', title, direction, isText, index, prefersReducedMotion }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.3 });
  const [isHovered, setIsHovered] = useState(false);
  const [hasFlashed, setHasFlashed] = useState(false);
  const countValue = useCountUp(isText ? 0 : parseInt(num), 2000, isVisible);

  // Flash effect for text stats
  useEffect(() => {
    if (isVisible && isText && !hasFlashed) {
      setHasFlashed(true);
    }
  }, [isVisible, isText, hasFlashed]);

  const getTransform = () => {
    if (prefersReducedMotion) return 'none';
    if (!isVisible) {
      switch (direction) {
        case 'left': return 'translateX(-40px)';
        case 'right': return 'translateX(40px)';
        case 'down': return 'translateY(-40px)';
        case 'up': return 'translateY(40px)';
        default: return 'translateY(20px)';
      }
    }
    return 'translateX(0) translateY(0)';
  };

  return (
    <div 
      ref={ref}
      className={`p-6 border bg-cream transition-all duration-300 cursor-pointer ${
        isHovered ? 'border-terracotta bg-terracotta/5' : 'border-lightborder'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: prefersReducedMotion 
          ? 'opacity 0.3s ease-out, border-color 0.3s ease-out, background-color 0.3s ease-out' 
          : `opacity 0.5s ease-out ${index * 0.3}s, transform 0.5s ease-out ${index * 0.3}s, border-color 0.3s ease-out, background-color 0.3s ease-out`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p 
        className={`font-serif text-2xl text-terracotta mb-2 transition-transform duration-300 ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${isText && hasFlashed && isVisible ? 'animate-flash' : ''}`}
      >
        {isText ? num : countValue}{suffix}
      </p>
      <p className="text-sm text-charcoal/70">{title}</p>
    </div>
  );
};

// ═══════════ PROGRAM CARD COMPONENT ═══════════
const ProgramCard = ({ day, index, isLast, language, prefersReducedMotion }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2 });
  const [hasPulsed, setHasPulsed] = useState(false);

  // Pulse effect for highlight card (May 22)
  useEffect(() => {
    if (isVisible && day.highlight && !hasPulsed) {
      setHasPulsed(true);
    }
  }, [isVisible, day.highlight, hasPulsed]);

  const getTransform = () => {
    if (prefersReducedMotion) return 'none';
    if (!isVisible) {
      // Last card (May 22) comes from bottom
      if (day.highlight) {
        return 'translateY(40px) scale(0.95)';
      }
      return 'translateX(-40px)';
    }
    return 'translateX(0) translateY(0) scale(1)';
  };

  return (
    <div 
      ref={ref}
      className={`p-6 border bg-paper transition-all duration-500 ${
        day.highlight 
          ? `border-terracotta ${hasPulsed && isVisible ? 'animate-pulse-border' : ''}` 
          : 'border-lightborder hover:border-charcoal/30'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: prefersReducedMotion 
          ? 'opacity 0.3s ease-out' 
          : `opacity 0.5s ease-out ${index * 0.2}s, transform 0.5s ease-out ${index * 0.2}s`,
      }}
    >
      {day.highlight && (
        <p className="text-terracotta font-syne text-xs tracking-widest uppercase mb-3">
          {language === 'fr' ? 'Jour principal' : 'Main day'}
        </p>
      )}
      <p className={`text-sm mb-2 ${day.highlight ? 'text-terracotta' : 'text-charcoal/50'}`}>
        {day.day}
      </p>
      <h3 className="font-serif text-xl text-charcoal mb-3">{day.title}</h3>
      <p className="text-sm text-charcoal/50 flex items-center gap-2">
        <MapPin className="w-3 h-3" />
        {day.location}
      </p>
    </div>
  );
};

// ═══════════ PARTNERS GRID COMPONENT ═══════════
// ═══════════ PARTNERS CAROUSEL COMPONENT ═══════════
const PartnersCarousel = ({ language }) => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Default partners with official logos
  const defaultPartners = [
    { id: 1, name: 'CTM - Collectivité Territoriale de Martinique', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/2et0vzvg_kit_officiel_logo_ctm%20-%20Modifie%CC%81.png' },
    { id: 2, name: 'France Travail', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/3djbduvs_689c5f5694b80b98e3038504_logo-france-travail-removebg-preview.webp' },
    { id: 3, name: 'ISCA Business School', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/yxac0hgc_Design%20sans%20titre.png' },
    { id: 4, name: 'SACEM', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/420p3fna_logosacem.webp' },
    { id: 5, name: 'Direction des Affaires Culturelles - Martinique', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/zj0l5jv3_logo%20DAC%20HD%20%281%29%20-%20Modifie%CC%81.png' },
    { id: 6, name: 'Factory Maker', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/mwtuuqva_AB6E1437-7F2F-4BA2-8213-4B04929B2465_L0_001-09_02_2026%2017_20_17.png' },
    { id: 7, name: 'Skillfor - Centre d\'Etude de Langues', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/zdas8vpg_Skillfor%20-%20CEL%20-%20Bleu%20-%20Modifie%CC%81.png' },
    { id: 8, name: 'JTV Digital by Trace', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/o2a782m0_481984724_9427778390612290_4240110814266624264_n.jpg' },
    { id: 9, name: 'Labo des histoires', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/wk4o9uan_channels4_profile.jpg' },
    { id: 10, name: 'CFA - Métiers de l\'Audiovisuel', logo_url: 'https://customer-assets.emergentagent.com/job_2222c9b5-06b5-4a3e-bc20-92d5461f4150/artifacts/hasqcy3q_Logo-CFA-V2.webp' },
  ];

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const res = await axios.get(`${API}/cms/partners`);
        if (res.data?.partners?.length > 0) {
          setPartners(res.data.partners.filter(p => p.published));
        } else {
          setPartners(defaultPartners);
        }
      } catch (err) {
        setPartners(defaultPartners);
      }
      setIsLoading(false);
    };
    loadPartners();
  }, []);

  // Duplicate partners for seamless infinite scroll
  const displayPartners = [...partners, ...partners, ...partners];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse flex gap-8">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-32 h-16 bg-lightborder rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-paper to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-paper to-transparent z-10 pointer-events-none"></div>
      
      {/* Scrolling container */}
      <div 
        className="flex gap-12 py-8 animate-scroll-left"
        style={{
          width: 'max-content',
        }}
      >
        {displayPartners.map((partner, index) => (
          <div
            key={`${partner.id}-${index}`}
            className="flex-shrink-0 group"
          >
            <div className="w-40 h-20 flex items-center justify-center px-4 border border-lightborder bg-paper rounded-lg transition-all duration-300 group-hover:border-terracotta group-hover:bg-terracotta/5 group-hover:-translate-y-1 group-hover:shadow-lg">
              {partner.logo_url ? (
                <img 
                  src={partner.logo_url} 
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              ) : (
                <span className="text-charcoal/50 text-sm font-syne text-center group-hover:text-charcoal transition-colors">
                  {partner.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PartnersGrid = ({ partners, navigate, language }) => {
  return (
    <>
      <PartnersCarousel language={language} />
      
      <Reveal>
        <div className="text-center mt-8">
          <button 
            onClick={() => {
              navigate('/partnership');
              setTimeout(() => {
                document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="text-terracotta hover:text-terracotta/80 font-syne text-sm tracking-wide underline underline-offset-4 transition-colors"
          >
            {language === 'fr' ? 'Devenir partenaire' : 'Become a partner'}
          </button>
        </div>
      </Reveal>
    </>
  );
};

// ═══════════ PARTNER CARD COMPONENT ═══════════
const PartnerCard = ({ partner, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2 });
  const [isHovered, setIsHovered] = useState(false);
  const row = Math.floor(index / 4);
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      ref={ref}
      className={`p-4 border bg-paper flex items-center justify-center min-h-[80px] transition-all duration-300 ${
        isHovered ? 'border-terracotta bg-terracotta/5 -translate-y-1' : 'border-lightborder'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? (isHovered ? 'translateY(-3px)' : 'translateY(0)') 
          : 'translateY(20px)',
        transition: prefersReducedMotion 
          ? 'opacity 0.3s ease-out, border-color 0.3s ease-out, background-color 0.3s ease-out' 
          : `opacity 0.4s ease-out ${row * 0.15}s, transform 0.4s ease-out ${row * 0.15}s, border-color 0.3s ease-out, background-color 0.3s ease-out`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-charcoal/50 text-xs font-syne text-center">{partner}</span>
    </div>
  );
};

// ═══════════ CTA TITLE COMPONENT ═══════════
const CTATitle = ({ language }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.3 });
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const title = language === 'fr' ? 'Rejoignez Culture Connect 2026' : 'Join Culture Connect 2026';
  const words = title.split(' ');
  const midPoint = Math.floor(words.length / 2);
  const firstPart = words.slice(0, midPoint).join(' ');
  const secondPart = words.slice(midPoint).join(' ');

  return (
    <h2 ref={ref} className="font-serif text-3xl sm:text-4xl text-paper mb-6 overflow-hidden">
      <span 
        className="inline-block"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateX(0)' : 'translateX(-50px)',
          transition: prefersReducedMotion 
            ? 'opacity 0.3s ease-out' 
            : 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        {firstPart}
      </span>{' '}
      <span 
        className="inline-block"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateX(0)' : 'translateX(50px)',
          transition: prefersReducedMotion 
            ? 'opacity 0.3s ease-out' 
            : 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        {secondPart}
      </span>
    </h2>
  );
};

// Add custom animations to global CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-flash {
    animation: flash 0.3s ease-out 2;
  }
  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 0 rgba(166, 93, 71, 0); }
    50% { box-shadow: 0 0 0 4px rgba(166, 93, 71, 0.3); }
  }
  .animate-pulse-border {
    animation: pulse-border 0.5s ease-out 3;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('cinematic-styles')) {
  style.id = 'cinematic-styles';
  document.head.appendChild(style);
}

export default LandingPage;
