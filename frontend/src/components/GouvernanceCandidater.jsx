import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, AlertTriangle, Plus, Trash2, Upload, Loader2, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PROFIL_OPTIONS = [
  { value: 'artiste_createur', label: 'Artiste / Créateur culturel' },
  { value: 'producteur_culturel', label: 'Producteur culturel' },
  { value: 'organisateur', label: 'Organisateur d\'événements' },
  { value: 'structure_culturelle', label: 'Structure culturelle' },
  { value: 'operateur_diffusion', label: 'Opérateur de diffusion' },
];

const TYPE_OEUVRE = [
  { value: 'phonogramme', label: 'Phonogramme' },
  { value: 'video', label: 'Vidéo' },
  { value: 'spectacle', label: 'Spectacle' },
  { value: 'exposition', label: 'Exposition' },
  { value: 'oeuvre_litteraire', label: 'Œuvre littéraire' },
  { value: 'autre', label: 'Autre' },
];

const StepIndicator = ({ current, total }) => (
  <div className="flex items-center justify-center gap-2 mb-10" data-testid="step-indicator">
    {Array.from({ length: total }, (_, i) => (
      <React.Fragment key={i}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
          i < current ? 'bg-sage border-sage text-paper' :
          i === current ? 'border-terracotta text-terracotta bg-terracotta/10' :
          'border-lightborder text-charcoal/30'
        }`}>
          {i < current ? <Check className="w-4 h-4" /> : i + 1}
        </div>
        {i < total - 1 && <div className={`w-8 h-0.5 ${i < current ? 'bg-sage' : 'bg-lightborder'}`} />}
      </React.Fragment>
    ))}
  </div>
);

const GouvernanceCandidater = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — FREK
  const [frekId, setFrekId] = useState('');
  const [frekVerified, setFrekVerified] = useState(false);
  const [frekName, setFrekName] = useState('');
  const [frekLoading, setFrekLoading] = useState(false);

  // Step 2 — Profil
  const [niveau, setNiveau] = useState(params.get('niveau') || 'associe');
  const [profilType, setProfilType] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [email, setEmail] = useState('');

  // Step 3 — Répertoire
  const [projets, setProjets] = useState([
    { titre: '', type: 'phonogramme', annee: '', territoire: '' },
    { titre: '', type: 'phonogramme', annee: '', territoire: '' },
    { titre: '', type: 'phonogramme', annee: '', territoire: '' },
  ]);

  // Step 4 — Documents
  const [docFile, setDocFile] = useState(null);
  const [certifie, setCertifie] = useState(false);

  const verifyFrek = useCallback(async () => {
    if (!frekId.trim()) return;
    setFrekLoading(true);
    try {
      const res = await fetch(`${API}/api/gouvernance/verify-frek?id=${encodeURIComponent(frekId.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setFrekVerified(true);
        setFrekName(data.name || 'Membre');
        toast.success('Identité vérifiée');
      } else {
        setFrekVerified(false);
        toast.error('Identité non vérifiée');
      }
    } catch {
      toast.error('Erreur de vérification');
    } finally { setFrekLoading(false); }
  }, [frekId]);

  const addProjet = () => {
    if (projets.length >= 20) return;
    setProjets(p => [...p, { titre: '', type: 'phonogramme', annee: '', territoire: '' }]);
  };

  const removeProjet = (idx) => {
    if (projets.length <= 3) return;
    setProjets(p => p.filter((_, i) => i !== idx));
  };

  const updateProjet = (idx, field, value) => {
    setProjets(p => p.map((proj, i) => i === idx ? { ...proj, [field]: value } : proj));
  };

  const canAdvance = () => {
    if (step === 0) return frekVerified;
    if (step === 1) return profilType && raisonSociale.trim() && email.trim();
    if (step === 2) {
      const valid = projets.filter(p => p.titre.trim() && p.annee);
      return valid.length >= 3;
    }
    if (step === 3) return certifie;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/gouvernance/candidater`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frek_id: frekId.trim(),
          profil_type: profilType,
          niveau,
          raison_sociale: raisonSociale.trim(),
          email: email.trim(),
          projets_culturels: projets.filter(p => p.titre.trim()).map(p => ({
            titre: p.titre.trim(),
            type: p.type,
            annee: parseInt(p.annee) || 2025,
            territoire: p.territoire.trim(),
          })),
          documents: docFile ? [docFile.name] : [],
          certification_acceptee: certifie,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        navigate('/gouvernance/confirmation', { state: { id: data.id } });
      } else {
        toast.error(data.detail || 'Erreur lors de la soumission');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally { setSubmitting(false); }
  };

  const raisonLabel = ['structure_culturelle', 'producteur_culturel', 'organisateur', 'operateur_diffusion'].includes(profilType)
    ? "Nom de l'entité" : 'Nom complet';

  const docLabel = profilType === 'artiste_createur' ? "Pièce d'identité (carte d'identité ou passeport)"
    : profilType === 'structure_culturelle' ? "Récépissé de déclaration d'association"
    : "Extrait Kbis";

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-candidater">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/gouvernance')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">{step > 0 ? 'Retour' : 'Gouvernance'}</span>
          </button>
          <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">Étape {step + 1}/4</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <StepIndicator current={step} total={4} />

        {/* STEP 1 — FREK */}
        {step === 0 && (
          <div className="space-y-6" data-testid="step-frek">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl text-charcoal mb-2">Vérification de votre identité</h2>
              <p className="text-sm text-charcoal/60">Saisissez votre identifiant culturel pour continuer.</p>
            </div>
            <div className="border border-lightborder p-6">
              <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-2">Votre identifiant culturel</label>
              <div className="flex gap-3">
                <Input value={frekId} onChange={e => { setFrekId(e.target.value); setFrekVerified(false); }}
                  placeholder="Ex: FREK-XXX-XXXX" className="flex-1 h-12 bg-cream border-lightborder rounded-none" data-testid="frek-input" />
                <Button onClick={verifyFrek} disabled={!frekId.trim() || frekLoading}
                  className="h-12 px-6 bg-charcoal text-paper rounded-none font-syne" data-testid="frek-verify-btn">
                  {frekLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
                </Button>
              </div>
              {frekVerified && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-sage/10 border border-sage/30">
                  <ShieldCheck className="w-5 h-5 text-sage" />
                  <span className="text-sm text-sage font-semibold">Identité vérifiée — {frekName}</span>
                </div>
              )}
              {!frekVerified && frekId && !frekLoading && (
                <p className="mt-3 text-xs text-charcoal/40">
                  Votre identifiant n'est pas actif ? Obtenez votre identité culturelle sur <a href="https://frekcore.com" target="_blank" rel="noopener noreferrer" className="text-terracotta underline">frekcore.com</a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 — PROFIL */}
        {step === 1 && (
          <div className="space-y-6" data-testid="step-profil">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl text-charcoal mb-2">Profil et niveau</h2>
              <p className="text-sm text-charcoal/60">Choisissez votre niveau d'adhésion et complétez votre profil.</p>
            </div>

            {/* Niveau radio */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'associe', label: 'Membre Associé', price: '50 €' },
                { val: 'actif', label: 'Membre Actif', price: '150 € + 30 €/an' },
              ].map(n => (
                <button key={n.val} onClick={() => setNiveau(n.val)}
                  className={`p-4 border text-left transition-all ${niveau === n.val ? 'border-terracotta bg-terracotta/5' : 'border-lightborder hover:border-terracotta/30'}`}
                  data-testid={`niveau-${n.val}`}>
                  <span className="text-sm font-semibold text-charcoal block">{n.label}</span>
                  <span className="text-xs text-charcoal/50">{n.price}</span>
                </button>
              ))}
            </div>

            {/* Profil type radio */}
            <div>
              <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-3">Type de profil</label>
              <div className="space-y-2">
                {PROFIL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setProfilType(opt.value)}
                    className={`w-full p-3 border text-left text-sm transition-all ${profilType === opt.value ? 'border-terracotta bg-terracotta/5 text-charcoal' : 'border-lightborder text-charcoal/70 hover:border-terracotta/30'}`}
                    data-testid={`profil-${opt.value}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-2">{raisonLabel} *</label>
                <Input value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)}
                  className="h-12 bg-cream border-lightborder rounded-none" data-testid="raison-sociale" />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-2">Email *</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="h-12 bg-cream border-lightborder rounded-none" data-testid="email-input" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — REPERTOIRE */}
        {step === 2 && (
          <div className="space-y-6" data-testid="step-repertoire">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl text-charcoal mb-2">Répertoire culturel</h2>
              <p className="text-sm text-charcoal/60">Déclarez au minimum 3 projets culturels.</p>
            </div>

            <div className="space-y-4">
              {projets.map((p, i) => (
                <div key={i} className="border border-lightborder p-4 relative" data-testid={`projet-${i}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">Projet {i + 1}</span>
                    {projets.length > 3 && (
                      <button onClick={() => removeProjet(i)} className="text-terracotta/50 hover:text-terracotta">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={p.titre} onChange={e => updateProjet(i, 'titre', e.target.value)}
                      placeholder="Titre de l'œuvre" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
                    <select value={p.type} onChange={e => updateProjet(i, 'type', e.target.value)}
                      className="h-10 px-3 bg-cream border border-lightborder text-sm text-charcoal">
                      {TYPE_OEUVRE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <Input type="number" value={p.annee} onChange={e => updateProjet(i, 'annee', e.target.value)}
                      placeholder="Année" min="1900" max="2030" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
                    <Input value={p.territoire} onChange={e => updateProjet(i, 'territoire', e.target.value)}
                      placeholder="Territoire" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
                  </div>
                </div>
              ))}
            </div>

            {projets.length < 20 && (
              <button onClick={addProjet} className="w-full py-3 border border-dashed border-terracotta/30 text-terracotta text-sm flex items-center justify-center gap-2 hover:bg-terracotta/5 transition-colors" data-testid="add-projet">
                <Plus className="w-4 h-4" /> Ajouter un projet
              </button>
            )}

            {projets.filter(p => p.titre.trim() && p.annee).length < 3 && (
              <div className="flex items-start gap-3 p-4 bg-terracotta/5 border border-terracotta/20">
                <AlertTriangle className="w-5 h-5 text-terracotta flex-shrink-0 mt-0.5" />
                <p className="text-sm text-terracotta">Au minimum 3 projets culturels sont requis pour candidater.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — DOCUMENTS */}
        {step === 3 && (
          <div className="space-y-6" data-testid="step-documents">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl text-charcoal mb-2">Pièces justificatives</h2>
              <p className="text-sm text-charcoal/60">Finalisez votre dossier de candidature.</p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Tout dossier incomplet ne pourra être présenté au Conseil d'Administration.</p>
            </div>

            {/* File upload */}
            <div className="border border-lightborder p-6">
              <label className="block text-xs text-charcoal/60 uppercase tracking-wider mb-3">{docLabel}</label>
              <div className="border-2 border-dashed border-lightborder p-8 text-center hover:border-terracotta/30 transition-colors cursor-pointer relative">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer" data-testid="doc-upload" />
                {docFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-sage" />
                    <span className="text-sm text-charcoal">{docFile.name}</span>
                    <span className="text-xs text-charcoal/40">({(docFile.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-charcoal/30 mx-auto mb-3" />
                    <p className="text-sm text-charcoal/50">Cliquez ou déposez votre fichier</p>
                    <p className="text-xs text-charcoal/30 mt-1">PDF, JPG, PNG — 5 Mo max</p>
                  </>
                )}
              </div>
            </div>

            {/* Certification */}
            <label className="flex items-start gap-3 p-4 border border-lightborder cursor-pointer hover:border-terracotta/30 transition-colors" data-testid="certification-checkbox">
              <input type="checkbox" checked={certifie} onChange={e => setCertifie(e.target.checked)}
                className="mt-1 accent-terracotta" />
              <span className="text-sm text-charcoal/70 leading-relaxed">
                Je certifie l'exactitude des informations fournies et accepte les statuts de l'association, le règlement intérieur et la Loi COEURVOLAN.
              </span>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-lightborder">
          {step > 0 ? (
            <Button onClick={() => setStep(s => s - 1)} variant="outline" className="h-12 px-6 rounded-none border-lightborder font-syne" data-testid="btn-prev">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
          ) : <div />}

          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="h-12 px-8 bg-charcoal text-paper rounded-none font-syne" data-testid="btn-next">
              Continuer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canAdvance() || submitting}
              className="h-12 px-8 bg-terracotta text-paper rounded-none font-syne" data-testid="btn-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Soumettre ma candidature
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GouvernanceCandidater;
