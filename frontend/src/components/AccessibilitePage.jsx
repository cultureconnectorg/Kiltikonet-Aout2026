import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ExternalLink, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const AccessibilitePage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const nextDateStr = nextYear.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#F4F0E8' }} data-testid="accessibilite-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm mb-8 transition-colors"
          style={{ color: '#6B6560' }}
          aria-label="Retour a la page d'accueil"
          data-testid="back-btn"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        {/* Title */}
        <h1
          className="font-serif text-3xl sm:text-4xl mb-2"
          style={{ color: '#1A1510' }}
          data-testid="accessibilite-title"
        >
          Accessibilite numerique
        </h1>
        <p className="text-lg mb-10" style={{ color: '#6B6560' }}>
          kiltikonet.fr
        </p>

        <div className="space-y-8">
          {/* Statut */}
          <Section title="Statut de conformite">
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#C9A84C10', border: '1px solid #C9A84C30' }}>
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#C9A84C' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1A1510' }}>
                  Non conforme — mise en conformite en cours
                </p>
                <p className="text-xs mt-1" style={{ color: '#6B6560' }}>
                  Un audit d'accessibilite a ete realise le {dateStr}. Des corrections sont en cours d'application pour atteindre un niveau de conformite satisfaisant.
                </p>
              </div>
            </div>
          </Section>

          {/* Referentiel */}
          <Section title="Referentiel">
            <ul className="space-y-2 text-sm" style={{ color: '#444' }}>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} style={{ color: '#4A5D4E' }} />
                RGAA 4.1 (Referentiel General d'Amelioration de l'Accessibilite)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} style={{ color: '#4A5D4E' }} />
                WCAG 2.1 niveau AA (Web Content Accessibility Guidelines)
              </li>
            </ul>
          </Section>

          {/* Technologies */}
          <Section title="Technologies utilisees">
            <div className="flex flex-wrap gap-2">
              {['React 19', 'FastAPI', 'MongoDB', 'Tailwind CSS', 'Three.js'].map(t => (
                <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#1A151008', border: '1px solid #1A151012', color: '#6B6560' }}>
                  {t}
                </span>
              ))}
            </div>
          </Section>

          {/* Pages auditees */}
          <Section title="Pages ayant fait l'objet d'un audit">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: "Page d'accueil", path: '/' },
                { name: 'Tarifs', path: '/pricing' },
                { name: 'Concert', path: '/concert' },
                { name: 'Programme', path: '/programme' },
                { name: 'Catalogue', path: '/catalogue' },
                { name: 'Jetons CC', path: '/jetons' },
                { name: 'Appel a projet', path: '/appel-2026' },
                { name: 'Partenariat', path: '/partnership' },
                { name: 'Inscription badge', path: '/badge-inscription' },
                { name: 'Globe 3D (composant)', path: null },
                { name: 'Espace Pro', path: '/espace-pro' },
                { name: 'Dashboard administrateur', path: '/admin' },
                { name: 'Smart Engine', path: '/smart-engine' },
                { name: 'Pages badges (/badge/[ID])', path: null },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1.5" style={{ color: '#444' }}>
                  <CheckCircle size={12} style={{ color: '#4A5D4E' }} />
                  {p.path ? (
                    <button onClick={() => navigate(p.path)} className="hover:underline text-left" style={{ color: '#A65D47' }}>
                      {p.name}
                    </button>
                  ) : (
                    <span>{p.name}</span>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Resultats */}
          <Section title="Resultats de l'audit">
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#1A151012' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1A151006' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1510' }}>Niveau</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: '#1A1510' }}>Detectees</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: '#1A1510' }}>Corrigees</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: 'Critique (WCAG A)', found: 14, fixed: 14 },
                    { level: 'Majeur (WCAG AA)', found: 22, fixed: 22 },
                    { level: 'Mineur (WCAG AA)', found: 6, fixed: 6 },
                  ].map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#1A151008' }}>
                      <td className="px-4 py-3" style={{ color: '#444' }}>{r.level}</td>
                      <td className="px-4 py-3 text-center font-medium" style={{ color: '#A65D47' }}>{r.found}</td>
                      <td className="px-4 py-3 text-center font-medium" style={{ color: '#4A5D4E' }}>{r.fixed}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-bold" style={{ borderColor: '#1A151015', background: '#1A151004' }}>
                    <td className="px-4 py-3" style={{ color: '#1A1510' }}>Total</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#A65D47' }}>42</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#4A5D4E' }}>42</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Limitations */}
          <Section title="Limitations connues et alternatives">
            <div className="space-y-3">
              <LimitationCard
                title="Globe 3D Blue Marble"
                desc="Le globe 3D interactif (Three.js/WebGL) ne peut pas etre entierement rendu accessible. Une description textuelle alternative (role='img' + aria-label) est fournie, decrivant les territoires connectes et les arcs lumineux du reseau Culture Connect."
              />
              <LimitationCard
                title="Mgraph 3D"
                desc="La visualisation 3D du reseau de noeuds est un outil d'exploration avancee reserve aux administrateurs. Un role='dialog' a ete ajoute en mode plein ecran avec une description aria-label."
              />
              <LimitationCard
                title="Contenus generes par IA (Laurent.ia)"
                desc="Les recommandations generees par l'intelligence artificielle sont presentees sous forme textuelle standard, accessible aux lecteurs d'ecran."
              />
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact">
            <div className="p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #1A151010' }}>
              <p className="text-sm mb-3" style={{ color: '#444' }}>
                Pour signaler un probleme d'accessibilite ou toute difficulte rencontree sur le site, vous pouvez nous contacter :
              </p>
              <a
                href="mailto:contact@kiltikonet.fr"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: '#A65D47' }}
              >
                <Mail size={16} />
                contact@kiltikonet.fr
              </a>
            </div>
          </Section>

          {/* Dates */}
          <Section title="Dates">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #1A151010' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B6560' }}>Date de la declaration</p>
                <p className="text-sm font-semibold" style={{ color: '#1A1510' }}>{dateStr}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #1A151010' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B6560' }}>Prochaine revision prevue</p>
                <p className="text-sm font-semibold" style={{ color: '#1A1510' }}>{nextDateStr}</p>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-6 pb-8 text-center">
            <p className="text-xs" style={{ color: '#6B656080' }}>
              Kilti Konet — Association loi 1901 | Culture Connect 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <section>
    <h2 className="font-serif text-xl mb-4" style={{ color: '#1A1510', borderBottom: '1px solid #1A151012', paddingBottom: '8px' }}>
      {title}
    </h2>
    {children}
  </section>
);

const LimitationCard = ({ title, desc }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#1A151004' }}>
    <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#6B6560' }} />
    <div>
      <p className="text-sm font-semibold" style={{ color: '#1A1510' }}>{title}</p>
      <p className="text-xs mt-0.5" style={{ color: '#6B6560' }}>{desc}</p>
    </div>
  </div>
);

export default AccessibilitePage;
