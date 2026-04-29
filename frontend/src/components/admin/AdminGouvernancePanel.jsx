import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Users, ShieldCheck, ArrowLeft, CheckCircle, XCircle, Clock, Eye, Filter, Loader2, AlertCircle, FileText, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_MAP = {
  candidature_soumise: { bg: 'bg-charcoal/10', text: 'text-charcoal/60', label: 'Soumise', icon: Clock },
  en_examen: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En examen', icon: Eye },
  accepte: { bg: 'bg-sage/15', text: 'text-sage', label: 'Accepté', icon: CheckCircle },
  refuse: { bg: 'bg-terracotta/10', text: 'text-terracotta', label: 'Refusé', icon: XCircle },
};

const PROFIL_LABELS = {
  artiste_createur: 'Artiste / Créateur',
  producteur_culturel: 'Producteur culturel',
  organisateur: 'Organisateur',
  structure_culturelle: 'Structure culturelle',
  operateur_diffusion: 'Opérateur de diffusion',
};

const Badge = ({ statut }) => {
  const s = STATUS_MAP[statut] || STATUS_MAP.candidature_soumise;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
};

// ═══════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════

const DetailView = ({ candidature, onBack, onRefresh }) => {
  const [notes, setNotes] = useState(candidature.notes_admin || '');
  const [acting, setActing] = useState(false);

  const handleDecision = async (action) => {
    if (!window.confirm(action === 'accepter' ? 'Accepter cette candidature ?' : 'Refuser cette candidature ?')) return;
    setActing(true);
    try {
      const res = await axios.post(`${API}/admin/gouvernance/${candidature.id}/decision`, { action, notes_admin: notes || null });
      toast.success(action === 'accepter' ? `Accepté — ${res.data.num_membre}` : 'Candidature refusée');
      onRefresh();
      onBack();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    finally { setActing(false); }
  };

  const saveNotes = async () => {
    try {
      await axios.put(`${API}/admin/gouvernance/${candidature.id}/notes`, { notes_admin: notes });
      toast.success('Notes sauvegardées');
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="space-y-6" data-testid="gov-detail">
      <button onClick={onBack} className="flex items-center gap-2 text-charcoal/50 hover:text-terracotta text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour à la liste
      </button>

      {/* Header */}
      <div className="border border-lightborder p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            {candidature.num_membre && <p className="font-mono text-lg font-bold text-charcoal mb-1">{candidature.num_membre}</p>}
            <h2 className="font-serif text-xl text-charcoal">{candidature.raison_sociale}</h2>
            <p className="text-sm text-charcoal/50 mt-1">{candidature.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge statut={candidature.statut} />
            <span className={`px-2 py-0.5 text-[10px] font-bold ${candidature.niveau === 'actif' ? 'bg-amber-100 text-amber-800' : 'bg-sage/15 text-sage'}`}>
              {candidature.niveau === 'actif' ? 'Actif' : 'Associé'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-[10px] text-charcoal/40 uppercase block">Profil</span>{PROFIL_LABELS[candidature.profil_type] || candidature.profil_type}</div>
          <div><span className="text-[10px] text-charcoal/40 uppercase block">FREK-ID</span><span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-sage" />{candidature.frek_id}</span></div>
          <div><span className="text-[10px] text-charcoal/40 uppercase block">Candidature</span>{new Date(candidature.date_candidature).toLocaleDateString('fr-FR')}</div>
          <div><span className="text-[10px] text-charcoal/40 uppercase block">Décision</span>{candidature.date_decision ? new Date(candidature.date_decision).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
      </div>

      {/* Projets */}
      <div className="border border-lightborder p-6">
        <h3 className="text-sm font-bold text-charcoal mb-3">Projets culturels ({candidature.projets_culturels?.length || 0})</h3>
        <div className="space-y-2">
          {(candidature.projets_culturels || []).map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-cream p-3 text-sm">
              <span className="font-medium text-charcoal">{p.titre} <span className="text-charcoal/40 font-normal">({p.type})</span></span>
              <span className="text-xs text-charcoal/50">{p.annee} · {p.territoire}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="border border-lightborder p-6">
        <h3 className="text-sm font-bold text-charcoal mb-3">Documents</h3>
        {(candidature.documents || []).length > 0 ? (
          <div className="space-y-2">
            {candidature.documents.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-charcoal/70"><FileText className="w-4 h-4 text-charcoal/30" />{d}</div>
            ))}
          </div>
        ) : <p className="text-sm text-charcoal/40">Aucun document joint.</p>}
      </div>

      {/* Notes admin */}
      <div className="border border-lightborder p-6">
        <h3 className="text-sm font-bold text-charcoal mb-3">Notes internes</h3>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes privées (visibles uniquement par l'admin)..."
          className="bg-cream border-lightborder rounded-none text-sm min-h-[80px] mb-3" />
        <Button onClick={saveNotes} className="h-8 px-4 bg-charcoal/10 text-charcoal rounded-none text-xs font-syne"><Send className="w-3 h-3 mr-1" /> Sauver les notes</Button>
      </div>

      {/* Actions */}
      {candidature.statut !== 'accepte' && candidature.statut !== 'refuse' && (
        <div className="flex gap-3 pt-4 border-t border-lightborder">
          <Button onClick={() => handleDecision('accepter')} disabled={acting}
            className="flex-1 h-12 bg-sage text-paper rounded-none font-syne" data-testid="gov-accept">
            <CheckCircle className="w-4 h-4 mr-2" /> Accepter
          </Button>
          <Button onClick={() => handleDecision('refuser')} disabled={acting}
            className="flex-1 h-12 bg-terracotta/10 text-terracotta border border-terracotta/30 rounded-none font-syne" data-testid="gov-refuse">
            <XCircle className="w-4 h-4 mr-2" /> Refuser
          </Button>
        </div>
      )}

      {/* Status for accepted */}
      {candidature.statut === 'accepte' && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 text-center border ${candidature.cotisation_entree_payee ? 'border-sage/30 bg-sage/5' : 'border-terracotta/20 bg-terracotta/5'}`}>
            <span className="text-[10px] text-charcoal/40 uppercase block mb-1">Cotisation</span>
            {candidature.cotisation_entree_payee ? <CheckCircle className="w-5 h-5 text-sage mx-auto" /> : <AlertCircle className="w-5 h-5 text-terracotta mx-auto" />}
          </div>
          <div className={`p-3 text-center border ${candidature.cotisation_annuelle_payee ? 'border-sage/30 bg-sage/5' : candidature.niveau === 'actif' ? 'border-amber-200 bg-amber-50' : 'border-lightborder'}`}>
            <span className="text-[10px] text-charcoal/40 uppercase block mb-1">Annuelle</span>
            {candidature.niveau !== 'actif' ? <span className="text-xs text-charcoal/30">N/A</span> :
              candidature.cotisation_annuelle_payee ? <CheckCircle className="w-5 h-5 text-sage mx-auto" /> : <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />}
          </div>
          <div className={`p-3 text-center border ${candidature.repertoire_declare ? 'border-sage/30 bg-sage/5' : 'border-lightborder'}`}>
            <span className="text-[10px] text-charcoal/40 uppercase block mb-1">Répertoire</span>
            {candidature.repertoire_declare ? <CheckCircle className="w-5 h-5 text-sage mx-auto" /> : <Clock className="w-5 h-5 text-charcoal/20 mx-auto" />}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════

export default function AdminGouvernancePanel() {
  const [tab, setTab] = useState('candidatures');
  const [candidatures, setCandidatures] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterProfil, setFilterProfil] = useState('');
  const [selected, setSelected] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatut) params.set('statut', filterStatut);
      if (filterNiveau) params.set('niveau', filterNiveau);
      if (filterProfil) params.set('profil_type', filterProfil);
      const url = tab === 'membres' ? `${API}/admin/gouvernance/membres/actifs` : `${API}/admin/gouvernance?${params}`;
      const res = await axios.get(url);
      setCandidatures(tab === 'membres' ? (res.data.membres || []) : (res.data.candidatures || []));
      if (res.data.stats) setStats(res.data.stats);
    } catch {} finally { setLoading(false); }
  }, [filterStatut, filterNiveau, filterProfil, tab]);

  useEffect(() => { setLoading(true); fetch_(); }, [fetch_]);

  if (selected) {
    return (
      <div className="p-6" data-testid="admin-gouvernance">
        <DetailView candidature={selected} onBack={() => { setSelected(null); fetch_(); }} onRefresh={fetch_} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-gouvernance">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-lightborder pb-4">
        <button onClick={() => setTab('candidatures')} className={`px-4 py-2 text-sm font-syne border-b-2 transition-colors ${tab === 'candidatures' ? 'border-terracotta text-terracotta' : 'border-transparent text-charcoal/50'}`}>
          Candidatures
        </button>
        <button onClick={() => setTab('membres')} className={`px-4 py-2 text-sm font-syne border-b-2 transition-colors ${tab === 'membres' ? 'border-sage text-sage' : 'border-transparent text-charcoal/50'}`}>
          Membres actifs
        </button>
      </div>

      {/* Stats */}
      {tab === 'candidatures' && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', val: stats.total || 0, color: 'text-charcoal' },
            { label: 'Soumises', val: stats.candidature_soumise || 0, color: 'text-charcoal/60' },
            { label: 'En examen', val: stats.en_examen || 0, color: 'text-amber-600' },
            { label: 'Acceptées', val: stats.accepte || 0, color: 'text-sage' },
            { label: 'Refusées', val: stats.refuse || 0, color: 'text-terracotta' },
          ].map(s => (
            <div key={s.label} className="border border-lightborder bg-cream p-3 text-center">
              <p className={`font-serif text-xl ${s.color}`}>{s.val}</p>
              <p className="text-[9px] text-charcoal/40 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {tab === 'candidatures' && (
        <div className="flex flex-wrap gap-2">
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="h-9 px-3 text-xs bg-cream border border-lightborder text-charcoal">
            <option value="">Tous statuts</option>
            <option value="candidature_soumise">Soumises</option>
            <option value="en_examen">En examen</option>
            <option value="accepte">Acceptées</option>
            <option value="refuse">Refusées</option>
          </select>
          <select value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}
            className="h-9 px-3 text-xs bg-cream border border-lightborder text-charcoal">
            <option value="">Tous niveaux</option>
            <option value="associe">Associé</option>
            <option value="actif">Actif</option>
          </select>
          <select value={filterProfil} onChange={e => setFilterProfil(e.target.value)}
            className="h-9 px-3 text-xs bg-cream border border-lightborder text-charcoal">
            <option value="">Tous profils</option>
            {Object.entries(PROFIL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>
      ) : candidatures.length === 0 ? (
        <div className="text-center py-12 text-charcoal/40"><Users className="w-8 h-8 mx-auto mb-3" /><p className="text-sm">Aucune candidature</p></div>
      ) : (
        <div className="space-y-1">
          {candidatures.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              className="flex items-center gap-3 p-4 border border-lightborder bg-paper hover:border-terracotta/30 cursor-pointer transition-colors" data-testid={`gov-row-${c.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-charcoal truncate">{c.raison_sociale}</span>
                  <Badge statut={c.statut} />
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold ${c.niveau === 'actif' ? 'bg-amber-100 text-amber-800' : 'bg-sage/10 text-sage'}`}>
                    {c.niveau === 'actif' ? 'Actif' : 'Associé'}
                  </span>
                </div>
                <p className="text-xs text-charcoal/40">
                  {PROFIL_LABELS[c.profil_type] || c.profil_type} · {c.frek_id} · {new Date(c.date_candidature).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {c.num_membre && <span className="text-xs font-mono text-charcoal/30">{c.num_membre}</span>}
              {tab === 'membres' && (
                <div className="flex gap-1">
                  {c.cotisation_entree_payee ? <CheckCircle className="w-4 h-4 text-sage" /> : <AlertCircle className="w-4 h-4 text-terracotta" />}
                  {c.niveau === 'actif' && (c.cotisation_annuelle_payee ? <CheckCircle className="w-4 h-4 text-sage" /> : <AlertCircle className="w-4 h-4 text-amber-500" />)}
                  {c.repertoire_declare ? <CheckCircle className="w-4 h-4 text-sage" /> : <Clock className="w-4 h-4 text-charcoal/20" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
