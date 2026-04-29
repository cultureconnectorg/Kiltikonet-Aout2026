import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, FileText, CreditCard, BookOpen, AlertCircle, Loader2, PenLine, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const STEP_LABELS = ['Candidature', 'Examen CA', 'Signature charte', 'Cotisation', 'Répertoire'];

const StatusBadge = ({ statut }) => {
  const map = {
    candidature_soumise: { bg: 'bg-charcoal/10', text: 'text-charcoal/60', label: 'Candidature soumise' },
    en_examen: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En examen' },
    accepte: { bg: 'bg-sage/15', text: 'text-sage', label: 'Accepté' },
    refuse: { bg: 'bg-terracotta/10', text: 'text-terracotta', label: 'Refusé' },
  };
  const s = map[statut] || map.candidature_soumise;
  return <span className={`px-3 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
};

const StepTracker = ({ membre }) => {
  const getActiveStep = () => {
    if (membre.repertoire_declare) return 5;
    if (membre.cotisation_entree_payee) return 4;
    if (membre.signature_done) return 3;
    if (membre.statut === 'accepte') return 2;
    if (membre.statut === 'en_examen') return 1;
    return 0;
  };
  const active = getActiveStep();

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8" data-testid="step-tracker">
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < active ? 'bg-sage border-sage text-paper' :
              i === active ? 'border-terracotta text-terracotta bg-terracotta/10' :
              'border-lightborder text-charcoal/20'
            }`}>
              {i < active ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[9px] sm:text-[10px] mt-1 text-center leading-tight ${i <= active ? 'text-charcoal/70' : 'text-charcoal/30'}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 mt-[-16px] ${i < active ? 'bg-sage' : 'bg-lightborder'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const PROFIL_LABELS = {
  artiste_createur: 'Artiste / Créateur',
  producteur_culturel: 'Producteur culturel',
  organisateur: 'Organisateur',
  structure_culturelle: 'Structure culturelle',
  operateur_diffusion: 'Opérateur de diffusion',
};

const SignatureBlock = ({ membre, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(membre.signature_link || '');
  const [polling, setPolling] = useState(false);

  const initiate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/gouvernance/signature/initiate/${membre.num_membre}`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.detail || 'Erreur Yousign');
        return;
      }
      setLink(d.signature_link);
      window.open(d.signature_link, '_blank', 'noopener,noreferrer');
      toast.success("Document de signature ouvert dans un nouvel onglet.");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setPolling(true);
    try {
      const res = await fetch(`${API}/api/gouvernance/signature/status/${membre.num_membre}`);
      const d = await res.json();
      if (d.signature_done) {
        toast.success("Charte signée — Vous pouvez maintenant payer la cotisation.");
        // refresh full profil
        const r2 = await fetch(`${API}/api/gouvernance/profil/${membre.frek_id}`);
        if (r2.ok) onUpdated(await r2.json());
      } else {
        toast.info("Signature en attente. Pensez à terminer la signature dans l'onglet Yousign.");
      }
    } catch {
      toast.error("Erreur lors de la vérification");
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="border border-amber-300 bg-amber-50/60 p-6 mb-8" data-testid="signature-block">
      <div className="flex items-start gap-3">
        <PenLine className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-serif text-lg text-charcoal mb-1">Signature de la charte d'engagement</h3>
          <p className="text-sm text-charcoal/60 mb-4">
            Avant de régler votre cotisation, vous devez signer électroniquement la charte d'engagement de l'association
            (signature légale via <strong>Yousign</strong>). Cette étape protège juridiquement vos droits et ceux de la communauté.
          </p>
          <div className="flex flex-wrap gap-3">
            {!link ? (
              <Button
                onClick={initiate}
                disabled={loading}
                className="h-10 px-6 bg-amber-700 hover:bg-amber-800 text-paper rounded-none font-syne"
                data-testid="btn-sign-charte"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PenLine className="w-4 h-4 mr-2" />}
                Signer la charte
              </Button>
            ) : (
              <>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-6 bg-amber-700 hover:bg-amber-800 text-paper font-syne text-sm font-bold uppercase tracking-wider"
                  data-testid="btn-open-signature"
                >
                  <ExternalLink className="w-4 h-4" /> Reprendre la signature
                </a>
                <Button
                  onClick={checkStatus}
                  disabled={polling}
                  variant="outline"
                  className="h-10 px-6 rounded-none font-syne border-charcoal text-charcoal"
                  data-testid="btn-check-signature"
                >
                  {polling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  J'ai signé
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-charcoal/40 mt-3">Document légalement contraignant — conservé par Yousign et l'association.</p>
        </div>
      </div>
    </div>
  );
};

const GouvernanceProfil = () => {
  const navigate = useNavigate();
  const [frekInput, setFrekInput] = useState('');
  const [membre, setMembre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (fid) => {
    const id = fid || frekInput.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/gouvernance/profil/${encodeURIComponent(id)}`);
      if (res.ok) {
        setMembre(await res.json());
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || 'Aucune candidature trouvée.');
        setMembre(null);
      }
    } catch { setError('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  // Auto-lookup if frek_id in session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cc2026_pro_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.frek_id) { setFrekInput(s.frek_id); lookup(s.frek_id); }
      }
    } catch {}
  }, []);

  if (!membre) {
    return (
      <div className="min-h-screen bg-paper" data-testid="gouvernance-profil">
        <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate('/gouvernance')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm">Gouvernance</span>
            </button>
            <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">Mon profil membre</span>
          </div>
        </header>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <ShieldCheck className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal mb-4">Accéder à mon profil</h2>
          <div className="flex gap-3 mb-4">
            <Input value={frekInput} onChange={e => setFrekInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="Votre identifiant culturel" className="flex-1 h-12 bg-cream border-lightborder rounded-none" data-testid="profil-frek-input" />
            <Button onClick={() => lookup()} disabled={loading} className="h-12 px-6 bg-charcoal text-paper rounded-none font-syne" data-testid="profil-lookup-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accéder'}
            </Button>
          </div>
          {error && <p className="text-sm text-terracotta">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-profil">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/gouvernance')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Gouvernance</span>
          </button>
          <StatusBadge statut={membre.statut} />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header info */}
        <div className="border border-lightborder p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              {membre.num_membre && <p className="font-mono text-lg font-bold text-charcoal mb-1" data-testid="num-membre">{membre.num_membre}</p>}
              <h2 className="font-serif text-xl text-charcoal">{membre.raison_sociale}</h2>
            </div>
            <span className={`px-3 py-1.5 text-xs font-bold ${membre.niveau === 'actif' ? 'bg-amber-100 text-amber-800' : 'bg-sage/15 text-sage'}`}>
              {membre.niveau === 'actif' ? 'Membre Actif' : 'Membre Associé'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-xs text-charcoal/40 uppercase tracking-wider block">Profil</span><span className="text-charcoal/70">{PROFIL_LABELS[membre.profil_type] || membre.profil_type}</span></div>
            <div><span className="text-xs text-charcoal/40 uppercase tracking-wider block">Identifiant</span><span className="text-charcoal/70 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-sage" />{membre.frek_id}</span></div>
            <div><span className="text-xs text-charcoal/40 uppercase tracking-wider block">Email</span><span className="text-charcoal/70">{membre.email}</span></div>
            <div><span className="text-xs text-charcoal/40 uppercase tracking-wider block">Candidature</span><span className="text-charcoal/70">{membre.date_candidature ? new Date(membre.date_candidature).toLocaleDateString('fr-FR') : '—'}</span></div>
          </div>
        </div>

        {/* Step tracker */}
        <StepTracker membre={membre} />

        {/* Signature charte — show if accepted but not yet signed */}
        {membre.statut === 'accepte' && !membre.signature_done && (
          <SignatureBlock membre={membre} onUpdated={(m) => setMembre(m)} />
        )}

        {/* Signature confirmée */}
        {membre.signature_done && !membre.cotisation_entree_payee && (
          <div className="border border-sage/30 bg-sage/5 p-4 mb-8 flex items-center gap-3" data-testid="signature-confirmed">
            <CheckCircle className="w-5 h-5 text-sage" />
            <span className="text-sm text-sage font-semibold">Charte d'engagement signée — Vous pouvez maintenant régler votre cotisation.</span>
          </div>
        )}

        {/* Cotisation section — show if accepted AND signature_done */}
        {membre.statut === 'accepte' && membre.signature_done && !membre.cotisation_entree_payee && (
          <div className="border border-terracotta/30 bg-terracotta/5 p-6 mb-8">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-terracotta flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg text-charcoal mb-1">Cotisation d'entrée en attente</h3>
                <p className="text-sm text-charcoal/60 mb-4">
                  Montant : {membre.niveau === 'actif' ? '150 €' : '50 €'}. Votre adhésion sera finalisée après le paiement.
                </p>
                <Button onClick={() => navigate(`/gouvernance/paiement/${membre.num_membre}`)}
                  className="h-10 px-6 bg-terracotta text-paper rounded-none font-syne" data-testid="pay-cotisation-btn">
                  Payer ma cotisation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cotisation annuelle — for actifs */}
        {membre.niveau === 'actif' && membre.cotisation_entree_payee && (
          <div className={`border p-4 mb-8 flex items-center gap-3 ${membre.cotisation_annuelle_payee ? 'border-sage/30 bg-sage/5' : 'border-amber-200 bg-amber-50'}`}>
            {membre.cotisation_annuelle_payee ? (
              <><CheckCircle className="w-5 h-5 text-sage" /><span className="text-sm text-sage font-semibold">Cotisation annuelle à jour</span></>
            ) : (
              <><AlertCircle className="w-5 h-5 text-amber-600" /><span className="text-sm text-amber-700 font-semibold">Cotisation annuelle en attente — 30 €</span></>
            )}
          </div>
        )}

        {/* Projets culturels */}
        <div className="mb-8">
          <h3 className="font-serif text-lg text-charcoal mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-charcoal/40" /> Mes projets culturels</h3>
          {membre.projets_culturels?.length > 0 ? (
            <div className="space-y-2">
              {membre.projets_culturels.map((p, i) => (
                <div key={i} className="flex items-center justify-between border border-lightborder p-3">
                  <div>
                    <span className="text-sm font-medium text-charcoal">{p.titre}</span>
                    <span className="text-xs text-charcoal/40 ml-2">{p.type}</span>
                  </div>
                  <div className="text-xs text-charcoal/50">{p.annee} · {p.territoire}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/40">Aucun projet déclaré.</p>
          )}
        </div>

        {/* Documents */}
        <div className="mb-8">
          <h3 className="font-serif text-lg text-charcoal mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-charcoal/40" /> Mes documents</h3>
          {membre.documents?.length > 0 ? (
            <div className="space-y-2">
              {membre.documents.map((d, i) => (
                <div key={i} className="flex items-center gap-3 border border-lightborder p-3">
                  <FileText className="w-4 h-4 text-charcoal/30" />
                  <span className="text-sm text-charcoal/70">{d}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/40">Aucun document.</p>
          )}
        </div>

        {/* Répertoire link */}
        {membre.cotisation_entree_payee && !membre.repertoire_declare && (
          <Button onClick={() => navigate(`/gouvernance/repertoire/${membre.num_membre}`)}
            className="w-full h-12 bg-sage text-paper rounded-none font-syne" data-testid="declare-repertoire-btn">
            Déclarer mon répertoire
          </Button>
        )}
        {membre.repertoire_declare && (
          <div className="flex items-center gap-3 p-4 bg-sage/10 border border-sage/30">
            <CheckCircle className="w-5 h-5 text-sage" />
            <span className="text-sm text-sage font-semibold">Répertoire déclaré — Profil pleinement activé</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GouvernanceProfil;
