import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Award, BarChart3, Fingerprint, MapPin, Calendar, Mail,
  ChevronRight, Download, FileText, Globe, Users, Briefcase,
  Palette, Building2, CheckCircle, ArrowDown, ExternalLink, Clock, Send, AlertCircle
} from 'lucide-react';
import { useIntersectionObserver, useCountdown, Reveal, StaggerContainer, AnimatedNumber } from '../hooks/useAnimations';

const API = process.env.REACT_APP_BACKEND_URL;

const TERRITORIES = ['Martinique', 'Caraibes', 'Diaspora FR', 'Amerique Latine', 'Afrique', 'Autre'];
const PROFILES = ['Artiste', 'Association culturelle', 'Entreprise culturelle'];
const FORMATS = ['Conference/table ronde', 'Atelier/workshop', 'Performance scenique'];

const CRITERIA = [
  { id: 'C1', name: 'Impact territorial', pct: 25, desc: 'Impact culturel reel et documentable sur un territoire caribeen ou diaspora.' },
  { id: 'C2', name: 'Portee diaspora', pct: 20, desc: 'Liens entre la Martinique, les Caraibes et la diaspora.' },
  { id: 'C3', name: 'Transmission', pct: 20, desc: 'Formation, mediation ou transmission culturelle.' },
  { id: 'C4', name: 'Innovation culturelle', pct: 20, desc: 'Approche nouvelle dans la forme, le modele ou les outils.' },
  { id: 'C5', name: 'Contribution CC', pct: 15, desc: 'Adoption du framework Culture Connect.' },
];

const TIMELINE = [
  { date: '15 avril', label: 'Ouverture de l\'appel', active: true },
  { date: '30 avril', label: 'Date limite de candidature', active: false },
  { date: '10 mai', label: 'Annonce des laureats', active: false },
  { date: '20-23 mai', label: 'Chimin Savann', active: false },
  { date: '23 mai', label: 'Publication des scores', active: false },
];

const LAUREATE_CARDS = [
  { icon: Award, title: 'Label CC Certified', desc: 'Reconnaissance publique permanente, associee aux supports de communication du projet.' },
  { icon: BarChart3, title: 'Cultural Impact Score', desc: 'Evaluation proprietaire du CIP, publiee sur kiltikonet.fr le 23 mai 2026.' },
  { icon: Fingerprint, title: 'FREK-ID', desc: 'Empreinte numerique unique integree a l\'infrastructure CVLN, permanente et portable.' },
  { icon: MapPin, title: 'Presence a Chimin Savann', desc: 'Integration au programme officiel : conference, atelier ou performance scenique.' },
];

const ELIGIBLE_CARDS = [
  { icon: Palette, title: 'Artistes & createurs', desc: 'Musiciens, plasticiens, auteurs, choregraphes, cineastes, designers culturels.' },
  { icon: Building2, title: 'Associations culturelles', desc: 'Compagnies de danse, collectifs artistiques, reseaux diaspora.' },
  { icon: Briefcase, title: 'Entreprises culturelles', desc: 'Labels musicaux, maisons d\'edition, agences creatives, studios audiovisuels.' },
];

// --- Animated card components ---

const LaureateCard = ({ card, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = card.icon;

  return (
    <div
      ref={ref}
      className="rounded-2xl p-6 transition-all duration-500 cursor-default"
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${isHovered ? '#4A3AB730' : '#eee'}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? (isHovered ? 'translateY(-4px)' : 'translateY(0)')
          : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s, border-color 0.3s, box-shadow 0.3s`,
        boxShadow: isHovered ? '0 16px 32px rgba(74,58,183,0.1)' : '0 2px 8px rgba(0,0,0,0.03)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`laureate-card-${index}`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300"
        style={{
          background: '#4A3AB715',
          transform: isHovered ? 'rotate(-8deg) scale(1.1)' : 'rotate(0) scale(1)',
        }}
      >
        <Icon size={22} style={{ color: '#4A3AB7' }} />
      </div>
      <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">{card.title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{card.desc}</p>
    </div>
  );
};

const EligibleCard = ({ card, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = card.icon;

  return (
    <div
      ref={ref}
      className="rounded-2xl p-6 transition-all duration-500"
      style={{
        border: `2px solid ${isHovered ? '#0F6E5680' : '#0F6E5630'}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? (isHovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)')
          : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${index * 0.12}s, transform 0.6s ease-out ${index * 0.12}s, border-color 0.3s, box-shadow 0.3s`,
        boxShadow: isHovered ? '0 12px 30px rgba(15,110,86,0.08)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`eligible-card-${index}`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300"
        style={{
          background: '#0F6E5610',
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        <Icon size={24} style={{ color: '#0F6E56' }} />
      </div>
      <h3 className="text-base font-bold text-[#1A1A1A] mb-2">{card.title}</h3>
      <p className="text-sm" style={{ color: '#666' }}>{card.desc}</p>
    </div>
  );
};

const CriteriaRow = ({ criteria, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 px-5 py-4 transition-all duration-300 ${index < 4 ? 'border-b border-[#f0f0f0]' : ''}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
        transition: `opacity 0.5s ease-out ${index * 0.08}s, transform 0.5s ease-out ${index * 0.08}s, background 0.2s`,
        background: isHovered ? '#4A3AB705' : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`criteria-row-${index}`}
    >
      <span className="text-xs font-bold text-[#4A3AB7] bg-[#4A3AB7]/10 px-2.5 py-1.5 rounded-lg w-10 text-center flex-shrink-0">
        {criteria.id}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-[#1A1A1A]">{criteria.name}</span>
        <p className="text-xs text-[#888] mt-0.5">{criteria.desc}</p>
      </div>
      <div className="flex-shrink-0 w-16 text-right">
        <AnimatedNumber value={criteria.pct} suffix="%" className="text-lg font-bold" style={{ color: '#4A3AB7' }} />
      </div>
    </div>
  );
};

const TimelineStep = ({ step, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.3 });

  return (
    <div
      ref={ref}
      className="flex items-start gap-4 sm:gap-6 relative"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
        transition: `opacity 0.6s ease-out ${index * 0.15}s, transform 0.6s ease-out ${index * 0.15}s`,
      }}
      data-testid={`timeline-step-${index}`}
    >
      <div
        className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500 ${
          step.active ? 'shadow-lg' : ''
        }`}
        style={{
          background: step.active ? '#4A3AB7' : '#FFFFFF',
          border: step.active ? 'none' : '2px solid #4A3AB730',
          transform: isVisible && step.active ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <Calendar size={14} className={step.active ? 'text-white' : ''} style={step.active ? {} : { color: '#4A3AB750' }} />
      </div>
      <div className="pt-1.5 sm:pt-2.5">
        <span className="text-sm font-bold" style={{ color: '#4A3AB7' }}>{step.date}</span>
        <p className="text-sm text-[#444] mt-0.5">{step.label}</p>
      </div>
    </div>
  );
};

// --- Main Page ---

const AppelPage = () => {
  const formRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [form, setForm] = useState({
    nom_complet: '', email: '', organisation: '', territoire: '', profil: '',
    nom_projet: '', description_projet: '', impact_culturel: '', lien_web: '',
    format_souhaite: '', engagement_cc: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');

  const countdown = useCountdown('2026-04-30T23:59:59');

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.engagement_cc) { toast.error('Veuillez accepter l\'engagement Culture Connect'); return; }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/api/candidatures/cc2026`, form);
      setSubmitted(true);
      setRefId(data.id);
      toast.success('Candidature envoyee avec succes !');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="appel-page">
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4A3AB7 0%, #2D1F8C 60%, #0F6E56 100%)' }}>
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)', top: '-10%', left: '10%', animation: 'float 8s ease-in-out infinite' }} />
          <div className="absolute w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2), transparent)', bottom: '5%', right: '15%', animation: 'float 10s ease-in-out 2s infinite reverse' }} />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-20 sm:py-28 relative z-10">
          <div
            className="flex items-center gap-3 mb-6"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            <div className="h-8 w-0.5 bg-white/40" />
            <span className="text-white/60 text-sm tracking-widest uppercase">Kilti Konet</span>
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-30px)',
              transition: 'opacity 0.6s ease-out 0.15s, transform 0.6s ease-out 0.15s',
            }}
            data-testid="appel-hero-title"
          >
            Appel a projet<br />Culture Connect 2026
          </h1>

          <p
            className="text-lg sm:text-xl text-white/80 mb-2"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s',
            }}
          >
            Chimin Savann &middot; Grand Carbet du Parc culturel Aimé Césaire, Fort-de-France &middot; 20 - 23 mai 2026
          </p>

          {/* Countdown */}
          <div
            className="inline-flex items-center gap-4 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-xl mt-4 mb-6"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: 'opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s',
            }}
          >
            <Clock size={14} className="text-white/60" />
            {[
              { val: countdown.days, label: 'jours' },
              { val: countdown.hours, label: 'h' },
              { val: countdown.minutes, label: 'min' },
              { val: countdown.seconds, label: 's' },
            ].map((t, i) => (
              <div key={i} className="text-center">
                <div className="text-lg sm:text-xl font-bold text-white">{String(t.val).padStart(2, '0')}</div>
                <div className="text-[10px] text-white/40">{t.label}</div>
              </div>
            ))}
            <span className="text-xs text-white/50 ml-1">avant cloture</span>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-3 mt-4"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: 'opacity 0.6s ease-out 0.5s, transform 0.6s ease-out 0.5s',
            }}
          >
            <button onClick={scrollToForm} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#4A3AB7] font-bold rounded-full hover:bg-white/90 hover:scale-105 active:scale-95 transition-all text-sm group" data-testid="cta-candidater">
              <Send size={16} /> Candidater en ligne
              <ArrowDown size={14} className="transition-transform group-hover:translate-y-0.5" />
            </button>
            <a href={`${API}/api/docs/AAP_CahierDesCharges_FR.docx`} className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white/40 text-white rounded-full hover:bg-white/10 hover:border-white/60 transition-all text-sm" data-testid="cta-download-fr">
              <Download size={16} /> Cahier des charges (FR)
            </a>
          </div>
          <div
            className="flex gap-3 mt-3"
            style={{
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-out 0.6s',
            }}
          >
            <a href={`${API}/api/docs/AAP_CultureConnect2026_EN.docx`} className="inline-flex items-center gap-1.5 px-4 py-2 text-white/50 text-xs hover:text-white/90 transition-colors">
              <Globe size={12} /> English version
            </a>
            <a href={`${API}/api/docs/AAP_CultureConnect2026_KW.docx`} className="inline-flex items-center gap-1.5 px-4 py-2 text-white/50 text-xs hover:text-white/90 transition-colors">
              <Globe size={12} /> Vesyon kreyol
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Qui sommes-nous */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
        <Reveal direction="up" delay={0}>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A] mb-6" style={{ textDecoration: 'underline', textDecorationColor: '#4A3AB730', textUnderlineOffset: '6px' }}>
            Qui sommes-nous
          </h2>
        </Reveal>
        <Reveal direction="up" delay={0.15}>
          <div className="space-y-4 text-[#444] leading-relaxed">
            <p><strong style={{ color: '#0F6E56' }}>Kilti Konet</strong> est l'association qui porte Culture Connect en Martinique.</p>
            <p><strong style={{ color: '#4A3AB7' }}>Culture Connect</strong> est un standard de mesure de l'impact culturel caribeen.</p>
            <p>Cet appel selectionne <strong>3 a 5 projets</strong> pour integrer l'ecosysteme CC lors de <strong>Chimin Savann</strong>.</p>
          </div>
        </Reveal>
      </section>

      {/* SECTION 2 — Laureats */}
      <section className="bg-[#FAFAFA] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: '#4A3AB7' }} />
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A]">Ce que recoivent les laureats</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LAUREATE_CARDS.map((c, i) => (
              <LaureateCard key={i} card={c} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — Eligibilite */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <Reveal direction="up" delay={0}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 rounded-full" style={{ background: '#0F6E56' }} />
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A]">Qui peut candidater</h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          {ELIGIBLE_CARDS.map((c, i) => (
            <EligibleCard key={i} card={c} index={i} />
          ))}
        </div>
        <Reveal direction="up" delay={0.3}>
          <div className="bg-[#0F6E56]/5 rounded-xl p-5 border border-[#0F6E56]/20">
            <p className="text-sm text-[#444] leading-relaxed">
              <Globe size={14} className="inline mr-1.5 -mt-0.5" style={{ color: '#0F6E56' }} />
              Vous pouvez venir de partout — Martinique, Caraibes, diaspora, Amerique Latine, Afrique. Ce qui compte : <strong>l'impact culturel de votre projet</strong>.
            </p>
          </div>
        </Reveal>
      </section>

      {/* SECTION 4 — Criteres */}
      <section className="bg-[#FAFAFA] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: '#4A3AB7' }} />
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A]">Criteres de selection</h2>
            </div>
          </Reveal>
          <div className="bg-white rounded-2xl border border-[#eee] overflow-hidden shadow-sm">
            {CRITERIA.map((c, i) => (
              <CriteriaRow key={i} criteria={c} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — Formulaire */}
      <section ref={formRef} className="max-w-3xl mx-auto px-6 py-16 sm:py-20" id="formulaire">
        <Reveal direction="up" delay={0}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 rounded-full" style={{ background: '#0F6E56' }} />
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A]">Formulaire de candidature</h2>
          </div>
        </Reveal>

        {submitted ? (
          <Reveal direction="up" delay={0}>
            <div className="bg-[#0F6E56]/10 border-2 border-[#0F6E56]/30 rounded-2xl p-8 text-center" data-testid="form-success" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#0F6E56', animation: 'scaleIn 0.5s ease-out 0.2s both' }}>
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#0F6E56] mb-2">Candidature envoyee !</h3>
              <p className="text-[#444] mb-3">Votre dossier a ete enregistre avec la reference :</p>
              <p className="text-lg font-mono font-bold text-[#4A3AB7] bg-[#4A3AB7]/10 inline-block px-4 py-2 rounded-xl">{refId}</p>
              <p className="text-sm text-[#888] mt-4">Un email de confirmation vous a ete envoye. Les resultats seront annonces le 10 mai 2026.</p>
            </div>
          </Reveal>
        ) : (
          <Reveal direction="up" delay={0.1}>
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="candidature-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom complet" required>
                  <input type="text" required value={form.nom_complet} onChange={e => set('nom_complet', e.target.value)} className="form-input-appel" placeholder="Prenom Nom" data-testid="field-nom" />
                </Field>
                <Field label="Email" required>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className="form-input-appel" placeholder="email@exemple.com" data-testid="field-email" />
                </Field>
              </div>
              <Field label="Organisation / structure">
                <input type="text" value={form.organisation} onChange={e => set('organisation', e.target.value)} className="form-input-appel" placeholder="Optionnel" data-testid="field-organisation" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Territoire d'ancrage du projet" required>
                  <select required value={form.territoire} onChange={e => set('territoire', e.target.value)} className="form-input-appel" data-testid="field-territoire">
                    <option value="">Selectionner...</option>
                    {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Profil" required>
                  <select required value={form.profil} onChange={e => set('profil', e.target.value)} className="form-input-appel" data-testid="field-profil">
                    <option value="">Selectionner...</option>
                    {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Nom du projet" required>
                <input type="text" required value={form.nom_projet} onChange={e => set('nom_projet', e.target.value)} className="form-input-appel" placeholder="Le nom de votre projet culturel" data-testid="field-projet" />
              </Field>
              <Field label="Description du projet" required count={form.description_projet.length} max={1500}>
                <textarea required maxLength={1500} rows={5} value={form.description_projet} onChange={e => set('description_projet', e.target.value)} className="form-input-appel resize-none" placeholder="Decrivez votre projet, ses objectifs, son public..." data-testid="field-description" />
              </Field>
              <Field label="Impact culturel — decrivez l'impact existant ou projete" required count={form.impact_culturel.length} max={1000}>
                <textarea required maxLength={1000} rows={4} value={form.impact_culturel} onChange={e => set('impact_culturel', e.target.value)} className="form-input-appel resize-none" placeholder="Quel est l'impact culturel de votre projet ?" data-testid="field-impact" />
              </Field>
              <Field label="Lien web ou reseaux sociaux du projet">
                <input type="url" value={form.lien_web} onChange={e => set('lien_web', e.target.value)} className="form-input-appel" placeholder="https://..." data-testid="field-lien" />
              </Field>
              <Field label="Format souhaite a Chimin Savann" required>
                <select required value={form.format_souhaite} onChange={e => set('format_souhaite', e.target.value)} className="form-input-appel" data-testid="field-format">
                  <option value="">Selectionner...</option>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <div className="bg-[#4A3AB7]/5 rounded-xl p-5 border border-[#4A3AB7]/20 transition-all hover:border-[#4A3AB7]/40">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.engagement_cc} onChange={e => set('engagement_cc', e.target.checked)} className="mt-1 w-4 h-4 accent-[#4A3AB7]" data-testid="field-engagement" />
                  <span className="text-sm text-[#444] leading-relaxed">
                    J'accepte le framework Culture Connect et la publication de mon Cultural Impact Score le 23 mai 2026.
                    <span className="text-red-500 ml-0.5">*</span>
                  </span>
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-white font-bold rounded-full text-sm transition-all duration-300 disabled:opacity-50 hover:scale-105 active:scale-95 group"
                style={{ background: 'linear-gradient(135deg, #4A3AB7, #0F6E56)' }}
                data-testid="submit-candidature"
              >
                {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={16} />}
                {submitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                {!submitting && <ArrowDown size={14} className="rotate-[-90deg] transition-transform group-hover:translate-x-1" />}
              </button>
            </form>
          </Reveal>
        )}
      </section>

      {/* SECTION 6 — Calendrier */}
      <section className="bg-[#FAFAFA] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-1 h-8 rounded-full" style={{ background: '#4A3AB7' }} />
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A]">Calendrier</h2>
            </div>
          </Reveal>
          <div className="relative">
            <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 bg-[#4A3AB7]/15" />
            <div className="space-y-6">
              {TIMELINE.map((t, i) => (
                <TimelineStep key={i} step={t} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Contact */}
      <section className="relative overflow-hidden py-16 sm:py-20" style={{ background: 'linear-gradient(135deg, #4A3AB7, #0F6E56)' }}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2), transparent 50%)' }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <Reveal direction="up" delay={0}>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-6">Contact</h2>
          </Reveal>
          <Reveal direction="up" delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="mailto:appel2026@kiltikonet.fr" className="flex items-center gap-2 text-white/90 hover:text-white transition-all hover:scale-105">
                <Mail size={18} /> appel2026@kiltikonet.fr
              </a>
              <a href="https://kiltikonet.fr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/90 hover:text-white transition-all hover:scale-105">
                <ExternalLink size={18} /> kiltikonet.fr
              </a>
            </div>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-white/40 text-xs mt-8">Kilti Konet — Association loi 1901 | Cultural Impact Program | Culture Connect 2026</p>
          </Reveal>
        </div>
      </section>

      <style>{`
        .form-input-appel {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 14px;
          color: #1A1A1A;
          background: #fff;
          transition: border-color 0.3s, box-shadow 0.3s;
          outline: none;
        }
        .form-input-appel:focus {
          border-color: #4A3AB7;
          box-shadow: 0 0 0 4px rgba(74,58,183,0.08);
        }
        .form-input-appel:hover:not(:focus) {
          border-color: #ccc;
        }
        .form-input-appel::placeholder { color: #bbb; }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const Field = ({ label, required, children, count, max }) => (
  <div>
    <label className="block text-sm font-medium text-[#333] mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {count !== undefined && max && (
      <p className={`text-xs mt-1 text-right ${count > max * 0.9 ? 'text-red-500' : 'text-[#bbb]'}`}>{count}/{max}</p>
    )}
  </div>
);

export default AppelPage;
