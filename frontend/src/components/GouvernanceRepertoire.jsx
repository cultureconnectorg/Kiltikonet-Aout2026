import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_OEUVRE = [
  { value: 'phonogramme', label: 'Phonogramme' },
  { value: 'video', label: 'Vidéo' },
  { value: 'spectacle', label: 'Spectacle' },
  { value: 'exposition', label: 'Exposition' },
  { value: 'oeuvre_litteraire', label: 'Œuvre littéraire' },
  { value: 'autre', label: 'Autre' },
];

const GouvernanceRepertoire = () => {
  const navigate = useNavigate();
  const { numMembre } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [membre, setMembre] = useState(null);
  const [projets, setProjets] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/gouvernance/repertoire/${numMembre}`);
        if (res.ok) {
          const data = await res.json();
          setMembre(data);
          setProjets(data.projets_culturels?.length > 0
            ? data.projets_culturels.map(p => ({ ...p, droits_detenus: p.droits_detenus || false, droits_representes: p.droits_representes || false, territoire_fr: p.territoire_fr || false }))
            : [{ titre: '', type: 'phonogramme', annee: '', territoire: '', droits_detenus: false, droits_representes: false, territoire_fr: false }]
          );
          if (data.repertoire_declare) setDone(true);
        } else {
          const d = await res.json().catch(() => ({}));
          setError(d.detail || 'Erreur');
        }
      } catch { setError('Erreur de connexion'); }
      finally { setLoading(false); }
    };
    load();
  }, [numMembre]);

  const addProjet = () => {
    setProjets(p => [...p, { titre: '', type: 'phonogramme', annee: '', territoire: '', droits_detenus: false, droits_representes: false, territoire_fr: false }]);
  };

  const removeProjet = (idx) => {
    if (projets.length <= 1) return;
    setProjets(p => p.filter((_, i) => i !== idx));
  };

  const updateProjet = (idx, field, value) => {
    setProjets(p => p.map((proj, i) => i === idx ? { ...proj, [field]: value } : proj));
  };

  const handleSubmit = async () => {
    const valid = projets.filter(p => p.titre.trim());
    if (valid.length === 0) { toast.error('Au moins 1 œuvre requise.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/gouvernance/repertoire/${numMembre}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projets_culturels: valid.map(p => ({
            titre: p.titre.trim(),
            type: p.type,
            annee: parseInt(p.annee) || 2025,
            territoire: p.territoire?.trim() || '',
            droits_detenus: p.droits_detenus,
            droits_representes: p.droits_representes,
            territoire_fr: p.territoire_fr,
          }))
        }),
      });
      if (res.ok) {
        setDone(true);
        toast.success('Répertoire validé !');
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.detail || 'Erreur');
      }
    } catch { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-paper flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sage" /></div>;
  if (error) return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="text-center"><p className="text-terracotta mb-4">{error}</p>
        <Button onClick={() => navigate('/gouvernance/profil')} className="h-10 bg-charcoal text-paper rounded-none font-syne">Retour</Button>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4" data-testid="repertoire-done">
      <div className="max-w-md w-full text-center border border-sage/30 bg-sage/5 p-10">
        <CheckCircle className="w-14 h-14 text-sage mx-auto mb-6" />
        <h2 className="font-serif text-2xl text-charcoal mb-3">Répertoire validé</h2>
        <p className="text-sm text-charcoal/60 leading-relaxed mb-6">
          Votre profil membre est maintenant pleinement activé sur Kiltikonet.
        </p>
        <Button onClick={() => navigate('/gouvernance/profil')} className="h-11 bg-charcoal text-paper rounded-none font-syne">Voir mon profil</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-repertoire">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/gouvernance/profil')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Mon profil</span>
          </button>
          <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">{numMembre}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <BookOpen className="w-10 h-10 text-charcoal/20 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-charcoal mb-2">Déclaration de répertoire</h2>
          <p className="text-sm text-charcoal/60">
            Déclarez les œuvres et projets que vous souhaitez protéger et valoriser au sein de l'écosystème Kilti Konet.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {projets.map((p, i) => (
            <div key={i} className="border border-lightborder p-4" data-testid={`rep-projet-${i}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">Œuvre {i + 1}</span>
                {projets.length > 1 && (
                  <button onClick={() => removeProjet(i)} className="text-terracotta/50 hover:text-terracotta"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <Input value={p.titre} onChange={e => updateProjet(i, 'titre', e.target.value)}
                  placeholder="Titre" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
                <select value={p.type} onChange={e => updateProjet(i, 'type', e.target.value)}
                  className="h-10 px-3 bg-cream border border-lightborder text-sm text-charcoal">
                  {TYPE_OEUVRE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Input type="number" value={p.annee} onChange={e => updateProjet(i, 'annee', e.target.value)}
                  placeholder="Année" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
                <Input value={p.territoire || ''} onChange={e => updateProjet(i, 'territoire', e.target.value)}
                  placeholder="Territoire" className="h-10 bg-cream border-lightborder rounded-none text-sm" />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-charcoal/60">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={p.droits_detenus} onChange={e => updateProjet(i, 'droits_detenus', e.target.checked)} className="accent-sage" />
                  Droits détenus
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={p.droits_representes} onChange={e => updateProjet(i, 'droits_representes', e.target.checked)} className="accent-sage" />
                  Droits représentés
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={p.territoire_fr} onChange={e => updateProjet(i, 'territoire_fr', e.target.checked)} className="accent-sage" />
                  Territoire FR
                </label>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addProjet} className="w-full py-3 border border-dashed border-sage/40 text-sage text-sm flex items-center justify-center gap-2 hover:bg-sage/5 transition-colors mb-8" data-testid="add-oeuvre">
          <Plus className="w-4 h-4" /> Ajouter une œuvre
        </button>

        <Button onClick={handleSubmit} disabled={submitting}
          className="w-full h-14 bg-sage text-paper rounded-none font-syne text-base" data-testid="validate-repertoire">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          Valider mon répertoire
        </Button>
      </div>
    </div>
  );
};

export default GouvernanceRepertoire;
