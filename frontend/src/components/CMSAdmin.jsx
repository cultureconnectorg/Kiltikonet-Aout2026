import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useBidirectionalSync } from '../hooks/useRealtime';
import {
  ArrowLeft,
  Image,
  Users,
  Mic2,
  Building2,
  Upload,
  Trash2,
  GripVertical,
  Eye,
  Save,
  Plus,
  Edit2,
  X,
  Check,
  ExternalLink,
  RefreshCw,
  Settings,
  Palette,
  FileText,
  Layout,
  Calendar,
  Type,
  ChevronDown,
  ChevronUp,
  Globe,
  Link2,
  Copy,
  Loader2,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  Music,
  MapPin,
  Radio
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const API = process.env.REACT_APP_BACKEND_URL || '';

// ================== MEDIA SECTION (Existing) ==================
const MediaSection = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const categories = [
    { id: 'hero', label: 'Bannière Principale', desc: 'Image hero de la page d\'accueil' },
    { id: 'logo', label: 'Logo Culture Connect', desc: 'Logo officiel de l\'événement' },
    { id: 'venue', label: 'Photos des Sites', desc: 'Grand Carbet Aimé Césaire, Schoelcher, TOM' },
    { id: 'gallery', label: 'Galerie Ambiance', desc: 'Photos de l\'événement' }
  ];

  useEffect(() => { loadMedia(); }, []);

  const loadMedia = async () => {
    try {
      const res = await axios.get(`${API}/api/cms/media`);
      setMedia(res.data.media || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des médias');
    } finally {
      setLoading(false);
    }
  };

  const createMedia = async (category) => {
    try {
      const res = await axios.post(`${API}/api/cms/media`, {
        category,
        title: `Nouveau ${categories.find(c => c.id === category)?.label || 'média'}`,
        published: false
      });
      setMedia([...media, res.data.media]);
      toast.success('Média créé');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const uploadImage = async (mediaId, file) => {
    setUploading(mediaId);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/api/cms/media/${mediaId}/upload`, formData);
      setMedia(media.map(m => m.id === mediaId ? { ...m, image_url: res.data.image_url } : m));
      toast.success('Image uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const deleteMedia = async (mediaId) => {
    if (!window.confirm('Supprimer ce média ?')) return;
    try {
      await axios.delete(`${API}/api/cms/media/${mediaId}`);
      setMedia(media.filter(m => m.id !== mediaId));
      toast.success('Média supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const updateMedia = async (mediaId) => {
    try {
      await axios.put(`${API}/api/cms/media/${mediaId}`, editForm);
      setMedia(media.map(m => m.id === mediaId ? { ...m, ...editForm } : m));
      setEditingId(null);
      toast.success('Média mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getMediaByCategory = (categoryId) => media.filter(m => m.category === categoryId);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-8">
      {categories.map(category => (
        <div key={category.id} className="bg-paper border border-lightborder rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-charcoal">{category.label}</h3>
              <p className="text-sm text-charcoal/60">{category.desc}</p>
            </div>
            <Button onClick={() => createMedia(category.id)} variant="outline" size="sm" className="border-sage text-sage hover:bg-sage/10">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getMediaByCategory(category.id).map(item => (
              <div key={item.id} className="border border-lightborder rounded-lg overflow-hidden bg-cream/50">
                <div className="relative aspect-video bg-charcoal/5 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-12 h-12 text-charcoal/20" />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(item.id, e.target.files[0])} />
                    {uploading === item.id ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
                  </label>
                </div>
                <div className="p-3">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <Input value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Titre" className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMedia(item.id)} className="flex-1 bg-sage"><Check className="w-3 h-3 mr-1" /> Sauver</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-charcoal text-sm truncate">{item.title}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingId(item.id); setEditForm(item); }} className="p-1 hover:bg-charcoal/10 rounded"><Edit2 className="w-4 h-4 text-charcoal/60" /></button>
                        <button onClick={() => deleteMedia(item.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getMediaByCategory(category.id).length === 0 && (
              <div className="col-span-full py-8 text-center text-charcoal/40 border border-dashed border-charcoal/20 rounded-lg">
                Aucun média dans cette catégorie
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ================== EXHIBITORS SECTION ==================
const ExhibitorsSection = () => {
  const [profiles, setProfiles] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [exhibitorPhotos, setExhibitorPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [activeTab, setActiveTab] = useState('smart_engine');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profilesRes, participantsRes, photosRes] = await Promise.all([
        axios.get(`${API}/api/v1/smart-recommendations/profiles`),
        axios.get(`${API}/api/registrations?status=approved`),
        axios.get(`${API}/api/cms/exhibitors`)
      ]);
      setProfiles(profilesRes.data.profiles || []);
      setParticipants(participantsRes.data.registrations || []);
      const photosMap = {};
      (photosRes.data.exhibitors || []).forEach(ex => { photosMap[ex.profile_id] = ex.photo_url; });
      setExhibitorPhotos(photosMap);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (profileId, profileType, file) => {
    setUploading(profileId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/api/cms/exhibitors/${profileId}/upload?profile_type=${profileType}`, formData);
      setExhibitorPhotos({ ...exhibitorPhotos, [profileId]: res.data.photo_url });
      toast.success('Photo uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const getInitialsColor = (name) => {
    const colors = ['#A65D47', '#C8922A', '#4A5D4E', '#1A1A1A', '#6B4423'];
    return colors[name?.charCodeAt(0) % colors.length || 0];
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  const renderProfileCard = (profile, type) => {
    const id = profile.id;
    const name = type === 'smart_engine' ? profile.name : profile.full_name;
    const photoUrl = exhibitorPhotos[id];
    return (
      <div key={id} className="border border-lightborder rounded-lg overflow-hidden bg-paper">
        <div className="relative aspect-square bg-charcoal/5 flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: getInitialsColor(name) }}>
              {getInitials(name)}
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(id, type, e.target.files[0])} />
            {uploading === id ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
          </label>
        </div>
        <div className="p-3">
          <div className="font-medium text-charcoal text-sm truncate">{name}</div>
          <div className="text-xs text-charcoal/50 mt-0.5">{type === 'smart_engine' ? profile.type : profile.profile_type} • {profile.territory || profile.country}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-lightborder pb-2">
        <button onClick={() => setActiveTab('smart_engine')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'smart_engine' ? 'bg-terracotta text-white' : 'text-charcoal/60 hover:text-charcoal'}`}>
          Profils Smart Engine ({profiles.length})
        </button>
        <button onClick={() => setActiveTab('participants')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'participants' ? 'bg-terracotta text-white' : 'text-charcoal/60 hover:text-charcoal'}`}>
          Participants ({participants.length})
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {activeTab === 'smart_engine' && profiles.map(p => renderProfileCard(p, 'smart_engine'))}
        {activeTab === 'participants' && participants.map(p => renderProfileCard(p, 'participant'))}
      </div>
    </div>
  );
};

// ================== SPEAKERS SECTION ==================
const SpeakersSection = () => {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', bio: '' });

  useEffect(() => { loadSpeakers(); }, []);

  const loadSpeakers = async () => {
    try {
      const res = await axios.get(`${API}/api/cms/speakers`);
      setSpeakers(res.data.speakers || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const saveSpeaker = async () => {
    if (!form.name || !form.role) { toast.error('Nom et rôle requis'); return; }
    try {
      if (editingSpeaker) {
        await axios.put(`${API}/api/cms/speakers/${editingSpeaker.id}`, form);
        setSpeakers(speakers.map(s => s.id === editingSpeaker.id ? { ...s, ...form } : s));
        toast.success('Intervenant mis à jour');
      } else {
        const res = await axios.post(`${API}/api/cms/speakers`, { ...form, order: speakers.length });
        setSpeakers([...speakers, res.data.speaker]);
        toast.success('Intervenant ajouté');
      }
      setShowForm(false); setEditingSpeaker(null); setForm({ name: '', role: '', bio: '' });
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const deleteSpeaker = async (id) => {
    if (!window.confirm('Supprimer cet intervenant ?')) return;
    try {
      await axios.delete(`${API}/api/cms/speakers/${id}`);
      setSpeakers(speakers.filter(s => s.id !== id));
      toast.success('Intervenant supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const uploadPhoto = async (speakerId, file) => {
    setUploading(speakerId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/api/cms/speakers/${speakerId}/upload`, formData);
      setSpeakers(speakers.map(s => s.id === speakerId ? { ...s, photo_url: res.data.photo_url } : s));
      toast.success('Photo uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const moveSpeaker = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= speakers.length) return;
    const newSpeakers = [...speakers];
    [newSpeakers[index], newSpeakers[newIndex]] = [newSpeakers[newIndex], newSpeakers[index]];
    const orders = newSpeakers.map((s, i) => ({ id: s.id, order: i }));
    try {
      await axios.put(`${API}/api/cms/speakers/reorder`, orders);
      setSpeakers(newSpeakers);
    } catch (error) {
      toast.error('Erreur lors du réordonnement');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setEditingSpeaker(null); setForm({ name: '', role: '', bio: '' }); }} className="bg-sage text-white">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un intervenant
        </Button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Intervenant">
          <div className="bg-paper rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-charcoal mb-4">{editingSpeaker ? 'Modifier' : 'Nouvel'} intervenant</h3>
            <div className="space-y-4">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom *" aria-label="Nom" />
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Rôle *" aria-label="Rôle" />
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio (3-4 lignes)" aria-label="Biographie" className="w-full px-3 py-2 border border-lightborder rounded-md text-sm resize-none" rows={4} />
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={saveSpeaker} className="flex-1 bg-terracotta text-white"><Check className="w-4 h-4 mr-2" /> {editingSpeaker ? 'Mettre à jour' : 'Ajouter'}</Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {speakers.map((speaker, index) => (
          <div key={speaker.id} className="flex items-center gap-4 bg-paper border border-lightborder rounded-lg p-4">
            <div className="flex flex-col gap-1">
              <button onClick={() => moveSpeaker(index, 'up')} disabled={index === 0} className="p-1 hover:bg-charcoal/10 rounded disabled:opacity-30"><ChevronUp className="w-4 h-4 text-charcoal/40" /></button>
              <button onClick={() => moveSpeaker(index, 'down')} disabled={index === speakers.length - 1} className="p-1 hover:bg-charcoal/10 rounded disabled:opacity-30"><ChevronDown className="w-4 h-4 text-charcoal/40" /></button>
            </div>
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-charcoal/5 flex-shrink-0">
              {speaker.photo_url ? <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-8 h-8 text-charcoal/20" /></div>}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(speaker.id, e.target.files[0])} />
                {uploading === speaker.id ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Upload className="w-6 h-6 text-white" />}
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-charcoal">{speaker.name}</div>
              <div className="text-sm text-terracotta">{speaker.role}</div>
              {speaker.bio && <p className="text-xs text-charcoal/60 mt-1 line-clamp-2">{speaker.bio}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingSpeaker(speaker); setForm(speaker); setShowForm(true); }} className="p-2 hover:bg-charcoal/10 rounded"><Edit2 className="w-4 h-4 text-charcoal/60" /></button>
              <button onClick={() => deleteSpeaker(speaker.id)} className="p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {speakers.length === 0 && <div className="py-12 text-center text-charcoal/40 border border-dashed border-charcoal/20 rounded-lg">Aucun intervenant ajouté</div>}
      </div>
    </div>
  );
};

// ================== PARTNERS SECTION ==================
const PartnersSection = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [form, setForm] = useState({ name: '', website_url: '' });

  useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    try {
      const res = await axios.get(`${API}/api/cms/partners`);
      setPartners(res.data.partners || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const savePartner = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    try {
      if (editingPartner) {
        await axios.put(`${API}/api/cms/partners/${editingPartner.id}`, form);
        setPartners(partners.map(p => p.id === editingPartner.id ? { ...p, ...form } : p));
        toast.success('Partenaire mis à jour');
      } else {
        const res = await axios.post(`${API}/api/cms/partners`, { ...form, order: partners.length });
        setPartners([...partners, res.data.partner]);
        toast.success('Partenaire ajouté');
      }
      setShowForm(false); setEditingPartner(null); setForm({ name: '', website_url: '' });
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const deletePartner = async (id) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    try {
      await axios.delete(`${API}/api/cms/partners/${id}`);
      setPartners(partners.filter(p => p.id !== id));
      toast.success('Partenaire supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const uploadLogo = async (partnerId, file) => {
    setUploading(partnerId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/api/cms/partners/${partnerId}/upload`, formData);
      setPartners(partners.map(p => p.id === partnerId ? { ...p, logo_url: res.data.logo_url } : p));
      toast.success('Logo uploadé');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setEditingPartner(null); setForm({ name: '', website_url: '' }); }} className="bg-sage text-white">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un partenaire
        </Button>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Partenaire">
          <div className="bg-paper rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-charcoal mb-4">{editingPartner ? 'Modifier' : 'Nouveau'} partenaire</h3>
            <div className="space-y-4">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom *" aria-label="Nom du partenaire" />
              <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="Site web (https://...)" aria-label="URL du site web" />
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={savePartner} className="flex-1 bg-terracotta text-white"><Check className="w-4 h-4 mr-2" /> {editingPartner ? 'Mettre à jour' : 'Ajouter'}</Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {partners.map((partner) => (
          <div key={partner.id} className="bg-paper border border-lightborder rounded-lg overflow-hidden">
            <div className="relative aspect-video bg-white flex items-center justify-center p-4">
              {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" /> : <Building2 className="w-12 h-12 text-charcoal/20" />}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(partner.id, e.target.files[0])} />
                {uploading === partner.id ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Upload className="w-6 h-6 text-white" />}
              </label>
            </div>
            <div className="p-3 border-t border-lightborder">
              <div className="font-medium text-charcoal text-sm truncate">{partner.name}</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-lightborder">
                <button onClick={() => { setEditingPartner(partner); setForm(partner); setShowForm(true); }} className="p-1 hover:bg-charcoal/10 rounded"><Edit2 className="w-3 h-3 text-charcoal/60" /></button>
                <button onClick={() => deletePartner(partner.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {partners.length === 0 && <div className="py-12 text-center text-charcoal/40 border border-dashed border-charcoal/20 rounded-lg">Aucun partenaire ajouté</div>}
    </div>
  );
};

// ================== DESIGN SECTION (NEW) ==================
const DesignSection = () => {
  const [theme, setTheme] = useState({
    primary_color: '#A65D47',
    secondary_color: '#C8922A',
    accent_color: '#4A5D4E',
    background_color: '#1A1A1A',
    text_color: '#F4F1EA',
    font_family: 'Inter',
    hero_image_url: null,
    hero_title: 'Culture Connect 2026',
    hero_subtitle: 'Le premier marché professionnel des industries culturelles afro-caribéennes'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fonts = ['Inter', 'Poppins', 'DM Sans', 'Montserrat', 'Source Sans Pro'];

  useEffect(() => { loadTheme(); }, []);

  const loadTheme = async () => {
    try {
      const res = await axios.get(`${API}/api/cms/theme`);
      setTheme(res.data);
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/cms/theme`, theme);
      toast.success('Thème publié avec succès');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const uploadHeroImage = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/api/cms/theme/hero-upload`, formData);
      setTheme({ ...theme, hero_image_url: res.data.image_url });
      toast.success('Image hero uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-8">
      {/* Color Pickers */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-terracotta" /> Couleurs du thème
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { key: 'primary_color', label: 'Couleur principale', desc: 'Terracotta' },
            { key: 'secondary_color', label: 'Couleur secondaire', desc: 'Or' },
            { key: 'accent_color', label: 'Accent', desc: 'Sauge' },
            { key: 'background_color', label: 'Fond', desc: 'Charbon' },
            { key: 'text_color', label: 'Texte', desc: 'Crème' }
          ].map(color => (
            <div key={color.key} className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">{color.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme[color.key]}
                  onChange={(e) => setTheme({ ...theme, [color.key]: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-lightborder"
                />
                <div>
                  <div className="font-mono text-sm text-charcoal">{theme[color.key]}</div>
                  <div className="text-xs text-charcoal/50">{color.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font Selector */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-terracotta" /> Typographie
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {fonts.map(font => (
            <button
              key={font}
              onClick={() => setTheme({ ...theme, font_family: font })}
              className={`p-4 rounded-lg border-2 transition-all ${theme.font_family === font ? 'border-terracotta bg-terracotta/10' : 'border-lightborder hover:border-charcoal/30'}`}
              style={{ fontFamily: font }}
            >
              <div className="text-lg font-semibold text-charcoal">{font}</div>
              <div className="text-sm text-charcoal/60">Aa Bb Cc 123</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section Editor */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-terracotta" /> Section Hero
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hero Image Upload */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Image de fond</label>
            <div className="relative aspect-video bg-charcoal/5 rounded-lg overflow-hidden border border-lightborder">
              {theme.hero_image_url ? (
                <img src={theme.hero_image_url} alt="Hero" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal/30">
                  <Image className="w-16 h-16" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadHeroImage(e.target.files[0])} />
                {uploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
              </label>
            </div>
          </div>
          {/* Hero Text */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Titre principal</label>
              <Input
                value={theme.hero_title || ''}
                onChange={(e) => setTheme({ ...theme, hero_title: e.target.value })}
                placeholder="Culture Connect 2026"
                className="text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Sous-titre / Tagline</label>
              <textarea
                value={theme.hero_subtitle || ''}
                onChange={(e) => setTheme({ ...theme, hero_subtitle: e.target.value })}
                placeholder="Le premier marché professionnel..."
                className="w-full px-3 py-2 border border-lightborder rounded-md text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-terracotta" /> Prévisualisation en direct
        </h3>
        <div className="rounded-lg overflow-hidden border-2 border-charcoal/20" style={{ backgroundColor: theme.background_color, fontFamily: theme.font_family }}>
          {/* Header Preview */}
          <div className="p-4 flex items-center gap-4" style={{ backgroundColor: theme.background_color, borderBottom: `1px solid ${theme.primary_color}33` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: theme.primary_color }}>CC</div>
            <span className="font-bold" style={{ color: theme.text_color }}>Culture Connect 2026</span>
            <div className="ml-auto flex gap-2">
              <span className="px-3 py-1 rounded text-sm" style={{ backgroundColor: theme.secondary_color, color: theme.background_color }}>Inscription</span>
            </div>
          </div>
          {/* Hero Preview */}
          <div className="relative h-48" style={{ backgroundColor: theme.background_color }}>
            {theme.hero_image_url && <img src={theme.hero_image_url} alt="Hero Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4" style={{ background: `linear-gradient(to top, ${theme.background_color}, transparent)` }}>
              <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text_color }}>{theme.hero_title || 'Titre'}</h1>
              <p className="text-sm opacity-80 max-w-md" style={{ color: theme.text_color }}>{theme.hero_subtitle || 'Sous-titre'}</p>
              <button className="mt-4 px-4 py-2 rounded font-medium" style={{ backgroundColor: theme.primary_color, color: theme.text_color }}>En savoir plus</button>
            </div>
          </div>
          {/* Accent Bar */}
          <div className="h-1" style={{ background: `linear-gradient(to right, ${theme.primary_color}, ${theme.secondary_color}, ${theme.accent_color})` }}></div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveTheme} disabled={saving} className="bg-terracotta text-white px-8">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Publier le thème
        </Button>
      </div>
    </div>
  );
};

// ================== PROGRAM EDITOR COMPONENT ==================
const ProgramEditor = ({ content, setContent, saveSection, saving, loadContent }) => {
  const [expandedDay, setExpandedDay] = useState('day3'); // Day 3 (Abolition) expanded by default
  const [draggedSlot, setDraggedSlot] = useState(null);
  
  // Default program structure
  const defaultDays = [
    {
      id: 'day1',
      date: '2026-05-20',
      label: 'DAY 1 — Mardi 20 Mai 2026',
      site: 'Bibliothèque Schoelcher',
      is_highlight: false,
      highlight_color: null,
      slots: []
    },
    {
      id: 'day2',
      date: '2026-05-21',
      label: 'DAY 2 — Mercredi 21 Mai 2026',
      site: 'Bibliothèque Schoelcher + Grand Carbet Aimé Césaire',
      is_highlight: false,
      highlight_color: null,
      slots: []
    },
    {
      id: 'day3',
      date: '2026-05-22',
      label: 'DAY 3 — Jeudi 22 Mai 2026 (JOURNÉE ABOLITION)',
      site: 'Grand Carbet Aimé Césaire + Grand Carbet Aimé Césaire',
      is_highlight: true,
      highlight_color: '#A65D47',
      slots: []
    },
    {
      id: 'day4',
      date: '2026-05-23',
      label: 'DAY 4 — Vendredi 23 Mai 2026',
      site: 'Grand Carbet Aimé Césaire',
      is_highlight: false,
      highlight_color: null,
      slots: []
    }
  ];

  const programData = content.official_program?.days || defaultDays;

  const updateProgramDay = (dayId, field, value) => {
    const updatedDays = programData.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
    );
    setContent({
      ...content,
      official_program: { days: updatedDays }
    });
  };

  const addSlot = (dayId) => {
    const newSlot = { time: '', title: '', description: '', speaker: '' };
    const updatedDays = programData.map(day => {
      if (day.id === dayId) {
        return { ...day, slots: [...(day.slots || []), newSlot] };
      }
      return day;
    });
    setContent({
      ...content,
      official_program: { days: updatedDays }
    });
  };

  const updateSlot = (dayId, slotIdx, field, value) => {
    const updatedDays = programData.map(day => {
      if (day.id === dayId) {
        const newSlots = [...(day.slots || [])];
        newSlots[slotIdx] = { ...newSlots[slotIdx], [field]: value };
        return { ...day, slots: newSlots };
      }
      return day;
    });
    setContent({
      ...content,
      official_program: { days: updatedDays }
    });
  };

  const deleteSlot = (dayId, slotIdx) => {
    const updatedDays = programData.map(day => {
      if (day.id === dayId) {
        const newSlots = [...(day.slots || [])];
        newSlots.splice(slotIdx, 1);
        return { ...day, slots: newSlots };
      }
      return day;
    });
    setContent({
      ...content,
      official_program: { days: updatedDays }
    });
  };

  const moveSlot = (dayId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const updatedDays = programData.map(day => {
      if (day.id === dayId) {
        const newSlots = [...(day.slots || [])];
        const [movedSlot] = newSlots.splice(fromIdx, 1);
        newSlots.splice(toIdx, 0, movedSlot);
        return { ...day, slots: newSlots };
      }
      return day;
    });
    setContent({
      ...content,
      official_program: { days: updatedDays }
    });
  };

  const saveProgramme = async () => {
    await saveSection('official_program', { days: programData });
  };

  const initializeDefaults = async () => {
    try {
      await axios.post(`${API}/api/cms/content/init-defaults`);
      toast.success('Programme par défaut initialisé');
      loadContent();
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between bg-paper border border-lightborder rounded-lg p-4">
        <div>
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <Calendar className="w-5 h-5 text-terracotta" />
            Programme Officiel Culture Connect 2026
          </h3>
          <p className="text-sm text-charcoal/60 mt-1">
            Gérez les 4 jours du programme • Ce contenu alimente la page /programme et l'assistant IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={initializeDefaults} variant="outline" size="sm" className="border-sage text-sage">
            <RefreshCw className="w-4 h-4 mr-1" /> Réinitialiser
          </Button>
          <Button onClick={saveProgramme} disabled={saving} className="bg-terracotta text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Publier le programme
          </Button>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h4 className="font-semibold text-charcoal mb-4">Introduction de la page Programme</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">Titre</label>
            <Input
              value={content.intro?.title || 'Programme Officiel Culture Connect 2026'}
              onChange={(e) => setContent({ ...content, intro: { ...content.intro, title: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">Description</label>
            <Input
              value={content.intro?.text || ''}
              onChange={(e) => setContent({ ...content, intro: { ...content.intro, text: e.target.value } })}
              placeholder="4 jours de rencontres professionnelles..."
            />
          </div>
        </div>
        <Button onClick={() => saveSection('intro', content.intro)} disabled={saving} size="sm" className="bg-sage text-white mt-4">
          <Save className="w-4 h-4 mr-2" /> Sauvegarder intro
        </Button>
      </div>

      {/* Days */}
      {programData.map((day, dayIdx) => (
        <div 
          key={day.id} 
          className={`border-2 rounded-xl overflow-hidden transition-all ${
            day.is_highlight 
              ? 'border-terracotta bg-terracotta/5' 
              : 'border-lightborder bg-paper'
          }`}
        >
          {/* Day Header */}
          <div 
            className={`p-4 cursor-pointer flex items-center justify-between ${
              day.is_highlight ? 'bg-terracotta/10' : 'bg-cream/50'
            }`}
            onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
          >
            <div className="flex items-center gap-4">
              <div 
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                  day.is_highlight ? 'bg-terracotta' : 'bg-charcoal/70'
                }`}
              >
                J{dayIdx + 1}
              </div>
              <div>
                <h4 className={`font-bold ${day.is_highlight ? 'text-terracotta' : 'text-charcoal'}`}>
                  {day.label}
                </h4>
                <div className="flex items-center gap-2 text-sm text-charcoal/60">
                  <span>{day.site}</span>
                  {day.is_highlight && (
                    <span className="px-2 py-0.5 bg-terracotta text-white text-xs rounded-full">
                      JOURNÉE SPÉCIALE
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-charcoal/50">
                {(day.slots || []).length} créneaux
              </span>
              {expandedDay === day.id ? (
                <ChevronUp className="w-5 h-5 text-charcoal/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-charcoal/40" />
              )}
            </div>
          </div>

          {/* Day Content - Expanded */}
          {expandedDay === day.id && (
            <div className="p-6 space-y-4">
              {/* Day Settings */}
              <div className="grid md:grid-cols-3 gap-4 pb-4 border-b border-lightborder">
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 mb-1">Intitulé du jour</label>
                  <Input
                    value={day.label}
                    onChange={(e) => updateProgramDay(day.id, 'label', e.target.value)}
                    placeholder="DAY 1 — Mardi 20 Mai 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 mb-1">Site(s)</label>
                  <Input
                    value={day.site}
                    onChange={(e) => updateProgramDay(day.id, 'site', e.target.value)}
                    placeholder="Bibliothèque Schoelcher"
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={day.is_highlight}
                      onChange={(e) => {
                        updateProgramDay(day.id, 'is_highlight', e.target.checked);
                        if (e.target.checked) {
                          updateProgramDay(day.id, 'highlight_color', '#A65D47');
                        }
                      }}
                      className="rounded border-charcoal/30"
                    />
                    <span className="text-charcoal">Journée spéciale (terracotta)</span>
                  </label>
                </div>
              </div>

              {/* Slots Header */}
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-charcoal">Créneaux horaires</h5>
                <Button 
                  onClick={() => addSlot(day.id)} 
                  size="sm" 
                  variant="outline" 
                  className="border-sage text-sage hover:bg-sage/10"
                >
                  <Plus className="w-4 h-4 mr-1" /> Ajouter un créneau
                </Button>
              </div>

              {/* Slots List */}
              <div className="space-y-3">
                {(day.slots || []).length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-charcoal/20 rounded-lg text-charcoal/40">
                    Aucun créneau • Cliquez sur "Ajouter un créneau" pour commencer
                  </div>
                ) : (
                  (day.slots || []).map((slot, slotIdx) => (
                    <div 
                      key={slotIdx} 
                      className={`rounded-lg p-4 border transition-all ${
                        day.is_highlight ? 'bg-white border-terracotta/30' : 'bg-cream/50 border-lightborder'
                      }`}
                    >
                      {/* Slot reorder buttons */}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 pt-2">
                          <button
                            onClick={() => moveSlot(day.id, slotIdx, slotIdx - 1)}
                            disabled={slotIdx === 0}
                            className="p-1 hover:bg-charcoal/10 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4 text-charcoal/50" />
                          </button>
                          <GripVertical className="w-4 h-4 text-charcoal/30 mx-auto" />
                          <button
                            onClick={() => moveSlot(day.id, slotIdx, slotIdx + 1)}
                            disabled={slotIdx === (day.slots || []).length - 1}
                            className="p-1 hover:bg-charcoal/10 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4 text-charcoal/50" />
                          </button>
                        </div>

                        {/* Slot content */}
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-charcoal/50 mb-1">Heure</label>
                            <Input
                              value={slot.time}
                              onChange={(e) => updateSlot(day.id, slotIdx, 'time', e.target.value)}
                              placeholder="09:00"
                              className="font-mono"
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-charcoal/50 mb-1">Titre</label>
                            <Input
                              value={slot.title}
                              onChange={(e) => updateSlot(day.id, slotIdx, 'title', e.target.value)}
                              placeholder="Titre de l'événement"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-charcoal/50 mb-1">Description</label>
                            <Input
                              value={slot.description}
                              onChange={(e) => updateSlot(day.id, slotIdx, 'description', e.target.value)}
                              placeholder="Détails..."
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-charcoal/50 mb-1">Intervenant(s)</label>
                            <Input
                              value={slot.speaker}
                              onChange={(e) => updateSlot(day.id, slotIdx, 'speaker', e.target.value)}
                              placeholder="Nom(s)"
                            />
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteSlot(day.id, slotIdx)}
                          className="p-2 hover:bg-red-50 rounded mt-5"
                          title="Supprimer ce créneau"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Live Preview */}
      <div className="bg-paper border border-lightborder rounded-lg p-6">
        <h4 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-terracotta" />
          Prévisualisation du programme
        </h4>
        <div className="border-2 border-charcoal/10 rounded-lg p-6 bg-charcoal text-cream max-h-96 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {content.intro?.title || 'Programme Officiel Culture Connect 2026'}
          </h2>
          {programData.map((day) => (
            <div key={day.id} className={`mb-6 pb-6 border-b border-cream/20 last:border-0 ${
              day.is_highlight ? 'bg-terracotta/20 -mx-4 px-4 py-4 rounded-lg' : ''
            }`}>
              <h3 className={`font-bold text-lg mb-1 ${day.is_highlight ? 'text-terracotta' : 'text-gold'}`}>
                {day.label}
              </h3>
              <p className="text-cream/60 text-sm mb-3">{day.site}</p>
              {(day.slots || []).length > 0 ? (
                <div className="space-y-2">
                  {(day.slots || []).map((slot, idx) => (
                    <div key={idx} className="flex gap-4 text-sm">
                      <span className="text-gold font-mono w-14">{slot.time || '--:--'}</span>
                      <div>
                        <span className="font-medium">{slot.title || 'Sans titre'}</span>
                        {slot.speaker && <span className="text-cream/60 ml-2">— {slot.speaker}</span>}
                        {slot.description && <p className="text-cream/50 text-xs mt-0.5">{slot.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-cream/40 text-sm italic">Aucun créneau défini</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export info */}
      <div className="bg-sage/10 border border-sage/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-sage mt-0.5" />
          <div className="text-sm text-charcoal/70">
            <strong className="text-charcoal">Ce programme alimente :</strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>La page publique <strong>/programme</strong></li>
              <li>L'export PDF du programme officiel</li>
              <li>L'assistant IA (RAG) pour répondre aux questions sur le planning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================== CONTENT SECTION (NEW) ==================
const ContentSection = () => {
  const [activePage, setActivePage] = useState('home');
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pages = [
    { id: 'home', label: 'Accueil', icon: Layout },
    { id: 'program', label: 'Programme', icon: Calendar },
    { id: 'about', label: 'À propos', icon: FileText }
  ];

  useEffect(() => { loadContent(); }, [activePage]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/cms/content?page=${activePage}`);
      const contentMap = {};
      (res.data.content || []).forEach(item => {
        contentMap[item.section] = item.content;
      });
      setContent(contentMap);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const initDefaults = async () => {
    try {
      await axios.post(`${API}/api/cms/content/init-defaults`);
      toast.success('Contenu par défaut initialisé');
      loadContent();
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  const saveSection = async (section, data) => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/cms/content/${activePage}/${section}`, { content: data });
      setContent({ ...content, [section]: data });
      toast.success('Section sauvegardée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (section, key, value) => {
    const sectionContent = content[section] || {};
    setContent({
      ...content,
      [section]: { ...sectionContent, [key]: value }
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      {/* Page Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activePage === page.id ? 'bg-terracotta text-white' : 'bg-cream text-charcoal/60 hover:text-charcoal'}`}
            >
              <page.icon className="w-4 h-4" />
              {page.label}
            </button>
          ))}
        </div>
        <Button onClick={initDefaults} variant="outline" size="sm" className="border-sage text-sage">
          <RefreshCw className="w-4 h-4 mr-2" /> Initialiser contenu par défaut
        </Button>
      </div>

      {/* Home Page Content */}
      {activePage === 'home' && (
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="bg-paper border border-lightborder rounded-lg p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Section Hero</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Titre principal</label>
                <Input
                  value={content.hero?.title || ''}
                  onChange={(e) => updateContent('hero', 'title', e.target.value)}
                  placeholder="Culture Connect 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Sous-titre</label>
                <Input
                  value={content.hero?.subtitle || ''}
                  onChange={(e) => updateContent('hero', 'subtitle', e.target.value)}
                  placeholder="Le premier marché professionnel..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Texte bouton CTA</label>
                <Input
                  value={content.hero?.cta_text || ''}
                  onChange={(e) => updateContent('hero', 'cta_text', e.target.value)}
                  placeholder="Découvrir le programme"
                />
              </div>
              <Button onClick={() => saveSection('hero', content.hero)} disabled={saving} size="sm" className="bg-sage text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Sauvegarder Hero
              </Button>
            </div>
          </div>

          {/* Intro Section */}
          <div className="bg-paper border border-lightborder rounded-lg p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Introduction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Titre</label>
                <Input
                  value={content.intro?.title || ''}
                  onChange={(e) => updateContent('intro', 'title', e.target.value)}
                  placeholder="Bienvenue à Culture Connect"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Texte de présentation</label>
                <textarea
                  value={content.intro?.text || ''}
                  onChange={(e) => updateContent('intro', 'text', e.target.value)}
                  placeholder="Du 20 au 23 mai 2026, Fort-de-France accueille..."
                  className="w-full px-3 py-2 border border-lightborder rounded-md text-sm resize-none"
                  rows={5}
                />
              </div>
              <Button onClick={() => saveSection('intro', content.intro)} disabled={saving} size="sm" className="bg-sage text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Sauvegarder Introduction
              </Button>
            </div>
          </div>

          {/* Key Figures */}
          <div className="bg-paper border border-lightborder rounded-lg p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Chiffres clés</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(content.key_figures?.figures || [
                { value: '50+', label: 'Exposants', description: 'Labels, agents, institutions' },
                { value: '500', label: 'Participants', description: 'Professionnels attendus' },
                { value: '12', label: 'Territoires', description: 'Caraïbe, Afrique, Europe' },
                { value: '4', label: 'Jours', description: 'De rencontres B2B' }
              ]).map((fig, idx) => (
                <div key={idx} className="border border-lightborder rounded-lg p-4 bg-cream/50">
                  <Input
                    value={fig.value}
                    onChange={(e) => {
                      const figures = [...(content.key_figures?.figures || [])];
                      figures[idx] = { ...figures[idx], value: e.target.value };
                      updateContent('key_figures', 'figures', figures);
                    }}
                    placeholder="50+"
                    className="text-2xl font-bold text-center mb-2"
                  />
                  <Input
                    value={fig.label}
                    onChange={(e) => {
                      const figures = [...(content.key_figures?.figures || [])];
                      figures[idx] = { ...figures[idx], label: e.target.value };
                      updateContent('key_figures', 'figures', figures);
                    }}
                    placeholder="Exposants"
                    className="text-sm text-center mb-1"
                  />
                  <Input
                    value={fig.description}
                    onChange={(e) => {
                      const figures = [...(content.key_figures?.figures || [])];
                      figures[idx] = { ...figures[idx], description: e.target.value };
                      updateContent('key_figures', 'figures', figures);
                    }}
                    placeholder="Labels, agents..."
                    className="text-xs text-center text-charcoal/60"
                  />
                </div>
              ))}
            </div>
            <Button onClick={() => saveSection('key_figures', content.key_figures)} disabled={saving} size="sm" className="bg-sage text-white mt-4">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Sauvegarder Chiffres
            </Button>
          </div>
        </div>
      )}

      {/* Program Page Content */}
      {activePage === 'program' && (
        <ProgramEditor 
          content={content} 
          setContent={setContent} 
          saveSection={saveSection} 
          saving={saving} 
          loadContent={loadContent}
        />
      )}

      {/* About Page Content */}
      {activePage === 'about' && (
        <div className="space-y-6">
          {['history', 'mission', 'vision'].map(section => (
            <div key={section} className="bg-paper border border-lightborder rounded-lg p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4 capitalize">
                {section === 'history' ? 'Notre Histoire' : section === 'mission' ? 'Notre Mission' : 'Notre Vision'}
              </h3>
              <div className="space-y-4">
                <Input
                  value={content[section]?.title || ''}
                  onChange={(e) => updateContent(section, 'title', e.target.value)}
                  placeholder="Titre de la section"
                />
                <textarea
                  value={content[section]?.text || ''}
                  onChange={(e) => updateContent(section, 'text', e.target.value)}
                  placeholder="Contenu..."
                  className="w-full px-3 py-2 border border-lightborder rounded-md text-sm resize-none"
                  rows={5}
                />
                <Button onClick={() => saveSection(section, content[section])} disabled={saving} size="sm" className="bg-sage text-white">
                  <Save className="w-4 h-4 mr-2" /> Sauvegarder
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================== PAGES SECTION (NEW) ==================
const PagesSection = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', meta_description: '', published: false });

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    try {
      const res = await axios.get(`${API}/api/cms/pages`);
      setPages(res.data.pages || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const savePage = async () => {
    if (!form.title || !form.slug) { toast.error('Titre et slug requis'); return; }
    try {
      if (editingPage) {
        await axios.put(`${API}/api/cms/pages/${editingPage.id}`, form);
        setPages(pages.map(p => p.id === editingPage.id ? { ...p, ...form } : p));
        toast.success('Page mise à jour');
      } else {
        const res = await axios.post(`${API}/api/cms/pages`, form);
        setPages([res.data.page, ...pages]);
        toast.success('Page créée');
      }
      setShowForm(false);
      setEditingPage(null);
      setForm({ title: '', slug: '', content: '', meta_description: '', published: false });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const deletePage = async (id) => {
    if (!window.confirm('Supprimer cette page ?')) return;
    try {
      await axios.delete(`${API}/api/cms/pages/${id}`);
      setPages(pages.filter(p => p.id !== id));
      toast.success('Page supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublish = async (page) => {
    try {
      await axios.put(`${API}/api/cms/pages/${page.id}`, { ...page, published: !page.published });
      setPages(pages.map(p => p.id === page.id ? { ...p, published: !p.published } : p));
      toast.success(page.published ? 'Page dépubliée' : 'Page publiée');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const copyUrl = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
    toast.success('URL copiée');
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">Pages dynamiques</h3>
          <p className="text-sm text-charcoal/60">Créez des pages personnalisées accessibles via /p/[slug]</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingPage(null); setForm({ title: '', slug: '', content: '', meta_description: '', published: false }); }} className="bg-sage text-white">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle page
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Page CMS">
          <div className="bg-paper rounded-lg p-6 w-full max-w-2xl my-8">
            <h3 className="text-lg font-semibold text-charcoal mb-4">{editingPage ? 'Modifier' : 'Nouvelle'} page</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 mb-1">Titre *</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Actualités" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 mb-1">Slug URL *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-charcoal/50 text-sm">/p/</span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                      placeholder="actualites"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Meta description (SEO)</label>
                <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="Description pour les moteurs de recherche" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">Contenu (HTML)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="<h2>Titre</h2><p>Contenu de la page...</p>"
                  className="w-full px-3 py-2 border border-lightborder rounded-md text-sm font-mono resize-none"
                  rows={12}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="published" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded border-lightborder" />
                <label htmlFor="published" className="text-sm text-charcoal">Publier immédiatement</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={savePage} className="flex-1 bg-terracotta text-white"><Check className="w-4 h-4 mr-2" /> {editingPage ? 'Mettre à jour' : 'Créer'}</Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.map(page => (
          <div key={page.id} className="bg-paper border border-lightborder rounded-lg p-4 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${page.published ? 'bg-green-500' : 'bg-charcoal/30'}`} title={page.published ? 'Publiée' : 'Brouillon'}></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-charcoal">{page.title}</div>
              <div className="flex items-center gap-2 text-sm text-charcoal/50">
                <Globe className="w-3 h-3" />
                <span>/p/{page.slug}</span>
                <button onClick={() => copyUrl(page.slug)} className="p-1 hover:bg-charcoal/10 rounded"><Copy className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => togglePublish(page)} className={`px-3 py-1 rounded text-sm font-medium ${page.published ? 'bg-green-100 text-green-700' : 'bg-charcoal/10 text-charcoal/60'}`}>
                {page.published ? 'Publiée' : 'Brouillon'}
              </button>
              <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-charcoal/10 rounded"><ExternalLink className="w-4 h-4 text-charcoal/60" /></a>
              <button onClick={() => { setEditingPage(page); setForm(page); setShowForm(true); }} className="p-2 hover:bg-charcoal/10 rounded"><Edit2 className="w-4 h-4 text-charcoal/60" /></button>
              <button onClick={() => deletePage(page.id)} className="p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {pages.length === 0 && (
          <div className="py-12 text-center text-charcoal/40 border border-dashed border-charcoal/20 rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-charcoal/20" />
            <p>Aucune page créée</p>
            <p className="text-sm">Créez des pages pour Actualités, Presse, Règlement...</p>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="bg-cream/50 border border-lightborder rounded-lg p-4">
        <p className="text-sm text-charcoal/70">
          <strong>Pages suggérées:</strong> Actualités, Presse, Partenaires, Programme détaillé, Règlement exposants, FAQ
        </p>
      </div>
    </div>
  );
};

// ================== PREVIEW SECTION ==================
const PreviewSection = () => {
  const [preview, setPreview] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPreview(); }, []);

  const loadPreview = async () => {
    try {
      const [previewRes, themeRes] = await Promise.all([
        axios.get(`${API}/api/cms/preview`),
        axios.get(`${API}/api/cms/theme`)
      ]);
      setPreview(previewRes.data);
      setTheme(themeRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const publishChanges = async () => {
    if (!window.confirm('Publier toutes les modifications ?')) return;
    try {
      await axios.post(`${API}/api/cms/publish`);
      toast.success('Toutes les modifications ont été publiées');
      loadPreview();
    } catch (error) {
      toast.error('Erreur lors de la publication');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">Prévisualisation globale</h3>
          <p className="text-sm text-charcoal/60">Vérifiez vos modifications avant publication</p>
        </div>
        <Button onClick={publishChanges} className="bg-sage text-white">
          <Save className="w-4 h-4 mr-2" /> Publier toutes les modifications
        </Button>
      </div>

      {/* Preview Frame */}
      <div className="border-2 border-terracotta/30 rounded-lg overflow-hidden" style={{ backgroundColor: theme?.background_color || '#1A1A1A', fontFamily: theme?.font_family || 'Inter' }}>
        {/* Header */}
        <div className="p-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${theme?.primary_color || '#A65D47'}33` }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: theme?.primary_color || '#A65D47' }}>CC</div>
          <span className="font-bold" style={{ color: theme?.text_color || '#F4F1EA' }}>Culture Connect 2026</span>
        </div>

        {/* Hero */}
        <div className="relative h-48">
          {theme?.hero_image_url && <img src={theme.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4" style={{ background: `linear-gradient(to top, ${theme?.background_color || '#1A1A1A'}, transparent)` }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme?.text_color || '#F4F1EA' }}>{theme?.hero_title || 'Culture Connect 2026'}</h1>
            <p className="text-sm opacity-80 max-w-md" style={{ color: theme?.text_color || '#F4F1EA' }}>{theme?.hero_subtitle || 'Le premier marché professionnel...'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
          {['Médias', 'Exposants', 'Intervenants', 'Partenaires'].map((label, idx) => (
            <div key={idx} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${theme?.primary_color || '#A65D47'}20` }}>
              <div className="text-2xl font-bold" style={{ color: theme?.secondary_color || '#C8922A' }}>
                {idx === 0 ? preview?.media?.length || 0 : idx === 1 ? preview?.exhibitors?.length || 0 : idx === 2 ? preview?.speakers?.length || 0 : preview?.partners?.length || 0}
              </div>
              <div className="text-sm" style={{ color: theme?.text_color || '#F4F1EA', opacity: 0.7 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Color Bar */}
        <div className="h-1" style={{ background: `linear-gradient(to right, ${theme?.primary_color || '#A65D47'}, ${theme?.secondary_color || '#C8922A'}, ${theme?.accent_color || '#4A5D4E'})` }}></div>
      </div>
    </div>
  );
};

// ================== INTENTION SECTION (Annual Experience) ==================
const IntentionSection = () => {
  const [intention, setIntention] = useState({
    annee: '2026',
    mot_annee: 'NOU.',
    mot_annee_note: '2026 — Nous. La reconnexion.',
    image_annee_url: null,
    phrase_ligne_1: 'Pendant des siècles on nous a séparés.',
    phrase_ligne_2: 'Le 22 Mai 2026 — nous nous retrouvons.',
    mot_cle_phrase_2: 'nous',
    couleur_annee: '#A65D47',
    son_tambour_url: null,
    sons_identites: {},
    territoire_messages: {
      'Martinique': 'Ou ka vini.',
      'Guadeloupe': 'An nou.',
      'Haiti': 'Nou la.',
      'Colombia': 'Aquí estamos.',
      'Senegal': 'Dëkk bi.',
      'France': 'La diaspora rentre.',
      'Afrique': 'Les racines appellent.'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);

  useEffect(() => {
    loadIntention();
  }, []);

  const loadIntention = async () => {
    try {
      const res = await axios.get(`${API}/api/annual-intention`);
      if (res.data) {
        setIntention(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const saveIntention = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/annual-intention`, intention);
      toast.success('Intention de l\'année publiée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (type, file) => {
    setUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
      const res = await axios.post(`${API}/api/cms/upload`, formData);
      if (type === 'image') {
        setIntention(prev => ({ ...prev, image_annee_url: res.data.url }));
      } else if (type === 'audio') {
        setIntention(prev => ({ ...prev, son_tambour_url: res.data.url }));
      }
      toast.success('Fichier uploadé');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const updateTerritoireMessage = (territoire, message) => {
    setIntention(prev => ({
      ...prev,
      territoire_messages: {
        ...prev.territoire_messages,
        [territoire]: message
      }
    }));
  };

  const addTerritoire = () => {
    const newTerr = prompt('Nom du territoire:');
    if (newTerr) {
      updateTerritoireMessage(newTerr, '');
    }
  };

  const removeTerritoire = (territoire) => {
    const { [territoire]: _, ...rest } = intention.territoire_messages;
    setIntention(prev => ({ ...prev, territoire_messages: rest }));
  };

  // Preview animation
  useEffect(() => {
    if (showPreview) {
      setPreviewStep(0);
      const steps = [0, 1, 2, 3, 4, 5, 6];
      const timings = [0, 1000, 1800, 4800, 10300, 11800];
      
      steps.forEach((step, idx) => {
        if (idx > 0 && timings[idx]) {
          setTimeout(() => setPreviewStep(step), timings[idx]);
        }
      });
    }
  }, [showPreview]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-charcoal text-cream rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: intention.couleur_annee }}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Intention de l'année {intention.annee}</h2>
              <p className="text-cream/60 text-sm">Séquence d'introduction pour les nouveaux visiteurs</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowPreview(true)} variant="outline" className="border-cream/30 text-cream hover:bg-white/10">
              <Play className="w-4 h-4 mr-2" /> Prévisualiser
            </Button>
            <Button onClick={saveIntention} disabled={saving} className="bg-terracotta text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Publier l'intention
            </Button>
          </div>
        </div>
      </div>

      {/* Mot d'ouverture */}
      <div className="bg-paper border border-lightborder rounded-xl p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-terracotta" />
          Mot d'ouverture (créole)
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-2">Mot affiché</label>
            <Input
              value={intention.mot_annee}
              onChange={(e) => setIntention(prev => ({ ...prev, mot_annee: e.target.value }))}
              placeholder="NOU."
              className="text-2xl font-bold"
            />
            <p className="text-xs text-charcoal/50 mt-1">Ce mot apparaît seul, plein écran, avant toute image.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-2">Note interne (non affichée)</label>
            <Input
              value={intention.mot_annee_note || ''}
              onChange={(e) => setIntention(prev => ({ ...prev, mot_annee_note: e.target.value }))}
              placeholder="2026 — Nous. La reconnexion."
            />
            <p className="text-xs text-charcoal/50 mt-1">Pour votre mémoire éditoriale.</p>
          </div>
        </div>
      </div>

      {/* Image d'ouverture */}
      <div className="bg-paper border border-lightborder rounded-xl p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-terracotta" />
          Image d'ouverture
        </h3>
        <div className="flex gap-6">
          <div className="flex-1">
            <div 
              className="aspect-video rounded-lg border-2 border-dashed border-charcoal/20 flex items-center justify-center overflow-hidden bg-charcoal/5"
              style={{ backgroundImage: intention.image_annee_url ? `url(${intention.image_annee_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {!intention.image_annee_url && (
                <div className="text-center p-6">
                  <Image className="w-12 h-12 text-charcoal/30 mx-auto mb-2" />
                  <p className="text-sm text-charcoal/50">Privilégier les détails — mains, textures, lumière. Pas de visages.</p>
                </div>
              )}
            </div>
          </div>
          <div className="w-48">
            <label className="block">
              <span className="sr-only">Upload image</span>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadFile('image', e.target.files[0])}
                className="hidden"
                id="image-upload"
              />
              <Button 
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={uploading === 'image'}
                className="w-full bg-charcoal/10 text-charcoal hover:bg-charcoal/20"
              >
                {uploading === 'image' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading === 'image' ? 'Upload...' : 'Choisir image'}
              </Button>
            </label>
            {intention.image_annee_url && (
              <Button 
                onClick={() => setIntention(prev => ({ ...prev, image_annee_url: null }))}
                variant="outline"
                size="sm"
                className="w-full mt-2 text-red-500 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Phrases */}
      <div className="bg-paper border border-lightborder rounded-xl p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-terracotta" />
          Les phrases de vérité
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-2">Ligne 1</label>
            <Input
              value={intention.phrase_ligne_1}
              onChange={(e) => setIntention(prev => ({ ...prev, phrase_ligne_1: e.target.value }))}
              placeholder="Pendant des siècles on nous a séparés."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-2">Ligne 2</label>
            <Input
              value={intention.phrase_ligne_2}
              onChange={(e) => setIntention(prev => ({ ...prev, phrase_ligne_2: e.target.value }))}
              placeholder="Le 22 Mai 2026 — nous nous retrouvons."
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-2">Mot à coloriser dans ligne 2</label>
              <Input
                value={intention.mot_cle_phrase_2}
                onChange={(e) => setIntention(prev => ({ ...prev, mot_cle_phrase_2: e.target.value }))}
                placeholder="nous"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-2">Couleur accent de l'année</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={intention.couleur_annee}
                  onChange={(e) => setIntention(prev => ({ ...prev, couleur_annee: e.target.value }))}
                  className="w-12 h-10 rounded cursor-pointer border border-charcoal/20"
                />
                <Input
                  value={intention.couleur_annee}
                  onChange={(e) => setIntention(prev => ({ ...prev, couleur_annee: e.target.value }))}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Son tambour */}
      <div className="bg-paper border border-lightborder rounded-xl p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-terracotta" />
          Son d'ouverture
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {intention.son_tambour_url ? (
              <div className="flex items-center gap-4 p-4 bg-charcoal/5 rounded-lg">
                <Volume2 className="w-6 h-6 text-terracotta" />
                <audio src={intention.son_tambour_url} controls className="flex-1" />
                <Button onClick={() => setIntention(prev => ({ ...prev, son_tambour_url: null }))} size="sm" variant="outline" className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-charcoal/5 rounded-lg text-center">
                <VolumeX className="w-8 h-8 text-charcoal/30 mx-auto mb-2" />
                <p className="text-sm text-charcoal/50">Max 3 secondes. Grave et résonnant (battement de tambour bèlè).</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && uploadFile('audio', e.target.files[0])}
            className="hidden"
            id="audio-upload"
          />
          <Button 
            onClick={() => document.getElementById('audio-upload')?.click()}
            disabled={uploading === 'audio'}
            className="bg-charcoal/10 text-charcoal hover:bg-charcoal/20"
          >
            {uploading === 'audio' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload son
          </Button>
        </div>
      </div>

      {/* Messages territoriaux */}
      <div className="bg-paper border border-lightborder rounded-xl p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-terracotta" />
          Messages territoriaux
        </h3>
        <p className="text-sm text-charcoal/60 mb-4">Message affiché sous le mot d'ouverture selon le territoire du visiteur.</p>
        
        <div className="space-y-3">
          {Object.entries(intention.territoire_messages || {}).map(([territoire, message]) => (
            <div key={territoire} className="flex items-center gap-3">
              <div className="w-32 text-sm font-medium text-charcoal">{territoire}</div>
              <Input
                value={message}
                onChange={(e) => updateTerritoireMessage(territoire, e.target.value)}
                placeholder="Message en créole ou français..."
                className="flex-1"
              />
              <Button 
                onClick={() => removeTerritoire(territoire)} 
                size="sm" 
                variant="outline"
                className="text-red-500 border-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <Button onClick={addTerritoire} variant="outline" size="sm" className="mt-4 border-sage text-sage">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un territoire
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-terracotta/10 border border-terracotta/30 rounded-xl p-6">
        <h4 className="font-semibold text-charcoal mb-3">Comment fonctionne cette séquence ?</h4>
        <ul className="space-y-2 text-sm text-charcoal/70">
          <li className="flex items-start gap-2">
            <span className="text-terracotta font-bold">1.</span>
            <span>La séquence ne se joue qu'une seule fois par visiteur (stocké en localStorage)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-terracotta font-bold">2.</span>
            <span>Elle inclut : souffle → tambour → mot créole → image + vérité → silence → choix d'identité</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-terracotta font-bold">3.</span>
            <span>Le visiteur choisit son identité (artiste, label, agent...) qui personnalise son retour</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-terracotta font-bold">4.</span>
            <span>Chaque année : changez le mot (2027: SONJE, 2028: MOVÉ, 2029: FÒS, 2030: ERITAJ)</span>
          </li>
        </ul>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Aperçu du site">
          <button 
            onClick={() => setShowPreview(false)}
            aria-label="Fermer l'aperçu"
            className="absolute top-4 right-4 text-white/50 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Step indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(s => (
              <div 
                key={s} 
                className={`w-2 h-2 rounded-full transition-all ${previewStep >= s ? 'bg-white' : 'bg-white/30'}`} 
              />
            ))}
          </div>

          {/* Preview content */}
          {previewStep === 0 && (
            <div className="text-white/50 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Chargement de la séquence...</p>
            </div>
          )}
          
          {previewStep === 1 && (
            <div 
              className="w-32 h-32 rounded-full animate-pulse"
              style={{ backgroundColor: intention.couleur_annee, opacity: 0.6 }}
            />
          )}
          
          {previewStep === 2 && (
            <div 
              className="w-40 h-40 rounded-full"
              style={{ backgroundColor: intention.couleur_annee, animation: 'ping 0.8s ease-out' }}
            />
          )}
          
          {previewStep === 3 && (
            <div className="text-center">
              <h1 className="text-white text-7xl md:text-9xl font-bold">{intention.mot_annee}</h1>
              <p className="text-white/50 mt-4">Ou ka vini.</p>
            </div>
          )}
          
          {previewStep === 4 && (
            <div className="text-center max-w-2xl px-6">
              <p className="text-white text-2xl mb-8">{intention.phrase_ligne_1}</p>
              <p className="text-white text-2xl">
                {intention.phrase_ligne_2.split(intention.mot_cle_phrase_2).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <span style={{ color: intention.couleur_annee }}>{intention.mot_cle_phrase_2}</span>}
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}
          
          {previewStep === 5 && (
            <div className="text-center text-white/30">
              <p>[ silence sacré ]</p>
            </div>
          )}
          
          {previewStep === 6 && (
            <div className="text-center">
              <h2 className="text-white text-2xl mb-8">Qu'est-ce que vous portez ?</h2>
              <div className="space-y-3">
                {['🎤 Une voix', '📀 Un catalogue', '🌐 Un réseau', '📖 Une histoire', '🔭 Une vision'].map((opt, i) => (
                  <div 
                    key={i}
                    className="px-6 py-3 text-white/80 hover:text-white transition-all cursor-pointer"
                    style={{ borderLeft: `3px solid transparent` }}
                    onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = intention.couleur_annee}
                    onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPreview(false)} className="mt-8 text-white/30 text-sm">
                Passer →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ================== MAP & FONDS SECTION ==================
const MapFondsSection = () => {
  const [territories, setTerritories] = useState([]);
  const [siteConfig, setSiteConfig] = useState({
    animations_enabled: true,
    countdown_enabled: true,
    particles_enabled: true,
    map_lines_enabled: true,
    section_backgrounds: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [activeTab, setActiveTab] = useState('territories');
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [newTerritory, setNewTerritory] = useState({
    id: '',
    name: '',
    lat: 0,
    lon: 0,
    color: '#A65D47',
    size: 'medium',
    label: '',
    isCenter: false,
    active: true
  });
  const [previewVisible, setPreviewVisible] = useState(false);

  const SIZE_OPTIONS = [
    { value: 'primary', label: 'Principale (centre)', desc: 'Point central du globe' },
    { value: 'large', label: 'Grande', desc: 'Points importants' },
    { value: 'medium', label: 'Moyenne', desc: 'Points standards' },
    { value: 'small', label: 'Petite', desc: 'Points secondaires' },
  ];

  const COLOR_PRESETS = [
    { value: '#A65D47', label: 'Terracotta (Caraïbes)' },
    { value: '#C8922A', label: 'Doré (Afrique/Amérique Sud)' },
    { value: '#FFFFFF', label: 'Blanc (Europe/USA)' },
    { value: '#6B8E7B', label: 'Sage (Asie/Océanie)' },
  ];

  const SECTION_BACKGROUNDS = [
    { id: 'hero', label: 'Hero (Accueil)' },
    { id: 'vision', label: 'Notre Vision' },
    { id: 'diaspora', label: 'La Diaspora (Carte)' },
    { id: 'programme', label: 'Programme' },
    { id: 'partenaires', label: 'Partenaires' },
    { id: 'cta', label: 'Rejoignez (CTA)' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mapRes, configRes] = await Promise.all([
        axios.get(`${API}/api/cms/map-territories`),
        axios.get(`${API}/api/cms/site-config`)
      ]);
      setTerritories(mapRes.data?.territories || []);
      setSiteConfig(configRes.data || siteConfig);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const saveTerritories = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/cms/map-territories`, {
        tenant_id: 'culture-connect-2026',
        territories,
        counter_text: 'territoires connectés',
        animations_enabled: siteConfig.map_lines_enabled,
        lines_enabled: siteConfig.map_lines_enabled
      });
      toast.success('Carte sauvegardée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveSiteConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/cms/site-config`, siteConfig);
      toast.success('Configuration sauvegardée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addTerritory = () => {
    if (!newTerritory.id || !newTerritory.name) {
      toast.error('ID et nom requis');
      return;
    }
    setTerritories([...territories, { ...newTerritory, opacity: 1.0 }]);
    setNewTerritory({
      id: '',
      name: '',
      lat: 0,
      lon: 0,
      color: '#A65D47',
      size: 'medium',
      label: '',
      isCenter: false,
      active: true
    });
    toast.success('Territoire ajouté');
  };

  const updateTerritory = (id, field, value) => {
    setTerritories(territories.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const deleteTerritory = (id) => {
    if (confirm('Supprimer ce territoire ?')) {
      setTerritories(territories.filter(t => t.id !== id));
      toast.success('Territoire supprimé');
    }
  };

  const uploadSectionBackground = async (sectionId, file) => {
    setUploading(sectionId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'image');
    
    try {
      const res = await axios.post(`${API}/api/cms/upload`, formData);
      const backgrounds = [...(siteConfig.section_backgrounds || [])];
      const idx = backgrounds.findIndex(b => b.section_id === sectionId);
      
      if (idx >= 0) {
        backgrounds[idx] = { ...backgrounds[idx], image_url: res.data.url, background_type: 'image' };
      } else {
        backgrounds.push({ section_id: sectionId, background_type: 'image', image_url: res.data.url, active: true });
      }
      
      setSiteConfig({ ...siteConfig, section_backgrounds: backgrounds });
      toast.success('Image uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-charcoal text-cream rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-terracotta flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Carte & Fonds</h2>
              <p className="text-cream/60 text-sm">Gérez la carte diaspora et les arrière-plans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-lightborder pb-2">
        {[
          { id: 'territories', label: 'Territoires' },
          { id: 'backgrounds', label: 'Fonds d\'écran' },
          { id: 'animations', label: 'Animations' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id 
                ? 'bg-terracotta text-white' 
                : 'bg-cream text-charcoal hover:bg-charcoal/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Territories Tab */}
      {activeTab === 'territories' && (
        <div className="space-y-6">
          {/* Preview Banner */}
          <div className="bg-charcoal/5 border border-charcoal/10 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-terracotta" />
              </div>
              <div>
                <p className="font-medium text-charcoal">Globe 3D Interactif</p>
                <p className="text-sm text-charcoal/60">Les modifications seront visibles après sauvegarde et rechargement de la page d'accueil</p>
              </div>
            </div>
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-terracotta text-white rounded-lg text-sm flex items-center gap-2 hover:bg-terracotta/90"
            >
              <Eye className="w-4 h-4" />
              Voir le globe
            </a>
          </div>

          {/* Territory List */}
          <div className="bg-paper border border-lightborder rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">
                Territoires ({territories.filter(t => t.active).length}/{territories.length} actifs)
              </h3>
              <Button onClick={saveTerritories} disabled={saving} className="bg-terracotta text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Sauvegarder
              </Button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4 text-xs text-charcoal/60 border-b border-lightborder pb-3">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-terracotta"></div> Couleur</span>
              <span>Nom</span>
              <span>Label (survol)</span>
              <span>Lat</span>
              <span>Lon</span>
              <span>Taille</span>
              <span>Statut</span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {territories.map((territory) => (
                <div 
                  key={territory.id}
                  className={`p-4 rounded-lg border transition-all ${
                    territory.isCenter 
                      ? 'bg-terracotta/10 border-terracotta shadow-sm' 
                      : territory.active 
                        ? 'bg-cream border-lightborder hover:border-sage' 
                        : 'bg-charcoal/5 border-charcoal/10 opacity-60'
                  }`}
                  data-testid={`territory-${territory.id}`}
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Color with presets */}
                    <div className="col-span-1">
                      <div className="relative group">
                        <input
                          type="color"
                          value={territory.color}
                          onChange={(e) => updateTerritory(territory.id, 'color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-lightborder"
                        />
                        {/* Quick color presets on hover */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:flex gap-1 bg-white p-1 rounded shadow-lg z-10">
                          {COLOR_PRESETS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => updateTerritory(territory.id, 'color', c.value)}
                              className="w-5 h-5 rounded border border-lightborder hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Name */}
                    <div className="col-span-2">
                      <Input
                        value={territory.name}
                        onChange={(e) => updateTerritory(territory.id, 'name', e.target.value)}
                        placeholder="Nom"
                        className="text-sm h-8"
                      />
                    </div>
                    {/* Label (for hover) */}
                    <div className="col-span-2">
                      <Input
                        value={territory.label || ''}
                        onChange={(e) => updateTerritory(territory.id, 'label', e.target.value)}
                        placeholder="Label survol"
                        className="text-sm h-8 text-charcoal/70"
                      />
                    </div>
                    {/* Lat */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={territory.lat}
                        onChange={(e) => updateTerritory(territory.id, 'lat', parseFloat(e.target.value))}
                        placeholder="Lat"
                        className="text-sm font-mono h-8"
                      />
                    </div>
                    {/* Lon */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={territory.lon}
                        onChange={(e) => updateTerritory(territory.id, 'lon', parseFloat(e.target.value))}
                        placeholder="Lon"
                        className="text-sm font-mono h-8"
                      />
                    </div>
                    {/* Size */}
                    <div className="col-span-2">
                      <select
                        value={territory.size}
                        onChange={(e) => updateTerritory(territory.id, 'size', e.target.value)}
                        className="w-full px-2 py-1 border border-lightborder rounded text-sm h-8"
                      >
                        {SIZE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Active + Center badge */}
                    <div className="col-span-2 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={territory.active}
                          onChange={(e) => updateTerritory(territory.id, 'active', e.target.checked)}
                          className="rounded text-sage"
                        />
                        <span className={territory.active ? 'text-sage' : 'text-charcoal/40'}>Actif</span>
                      </label>
                      {territory.isCenter && (
                        <span className="px-2 py-0.5 bg-terracotta text-white text-xs rounded font-medium">
                          CENTRE
                        </span>
                      )}
                    </div>
                    {/* Delete */}
                    <div className="col-span-1 text-right">
                      {!territory.isCenter && (
                        <button
                          onClick={() => deleteTerritory(territory.id)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Territory */}
          <div className="bg-sage/10 border border-sage/30 rounded-xl p-6">
            <h4 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sage" />
              Ajouter un nouveau territoire
            </h4>
            <div className="grid grid-cols-7 gap-3 items-end">
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">ID unique</label>
                <Input
                  value={newTerritory.id}
                  onChange={(e) => setNewTerritory({ ...newTerritory, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  placeholder="ex: jamaica"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">Nom (ville)</label>
                <Input
                  value={newTerritory.name}
                  onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                  placeholder="ex: Kingston"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">Label (pays)</label>
                <Input
                  value={newTerritory.label}
                  onChange={(e) => setNewTerritory({ ...newTerritory, label: e.target.value })}
                  placeholder="ex: Jamaïque"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">Latitude</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newTerritory.lat || ''}
                  onChange={(e) => setNewTerritory({ ...newTerritory, lat: parseFloat(e.target.value) || 0 })}
                  placeholder="18.0"
                  className="text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">Longitude</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newTerritory.lon || ''}
                  onChange={(e) => setNewTerritory({ ...newTerritory, lon: parseFloat(e.target.value) || 0 })}
                  placeholder="-76.8"
                  className="text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1">Couleur</label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={newTerritory.color}
                    onChange={(e) => setNewTerritory({ ...newTerritory, color: e.target.value })}
                    className="w-10 h-9 rounded cursor-pointer border border-lightborder"
                  />
                  <div className="flex gap-0.5">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setNewTerritory({ ...newTerritory, color: c.value })}
                        className="w-4 h-9 rounded border border-lightborder hover:scale-105 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={addTerritory} className="bg-sage text-white h-9">
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
            <p className="text-xs text-charcoal/50 mt-3">
              💡 Astuce: Utilisez <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-sage underline">latlong.net</a> pour trouver les coordonnées d'une ville
            </p>
          </div>
        </div>
      )}

      {/* Backgrounds Tab */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={saveSiteConfig} disabled={saving} className="bg-terracotta text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </div>

          {SECTION_BACKGROUNDS.map((section) => {
            const bg = siteConfig.section_backgrounds?.find(b => b.section_id === section.id) || {};
            
            return (
              <div key={section.id} className="bg-paper border border-lightborder rounded-xl p-6">
                <h4 className="font-semibold text-charcoal mb-4">{section.label}</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Type selector */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal/70 mb-2">Type de fond</label>
                    <select
                      value={bg.background_type || 'color'}
                      onChange={(e) => {
                        const backgrounds = [...(siteConfig.section_backgrounds || [])];
                        const idx = backgrounds.findIndex(b => b.section_id === section.id);
                        if (idx >= 0) {
                          backgrounds[idx] = { ...backgrounds[idx], background_type: e.target.value };
                        } else {
                          backgrounds.push({ section_id: section.id, background_type: e.target.value, active: true });
                        }
                        setSiteConfig({ ...siteConfig, section_backgrounds: backgrounds });
                      }}
                      className="w-full px-3 py-2 border border-lightborder rounded"
                    >
                      <option value="color">Couleur</option>
                      <option value="image">Image</option>
                      <option value="gradient">Dégradé</option>
                    </select>
                  </div>

                  {/* Color picker */}
                  {(bg.background_type || 'color') === 'color' && (
                    <div>
                      <label className="block text-sm font-medium text-charcoal/70 mb-2">Couleur</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={bg.color || '#F4F1EA'}
                          onChange={(e) => {
                            const backgrounds = [...(siteConfig.section_backgrounds || [])];
                            const idx = backgrounds.findIndex(b => b.section_id === section.id);
                            if (idx >= 0) {
                              backgrounds[idx] = { ...backgrounds[idx], color: e.target.value };
                            } else {
                              backgrounds.push({ section_id: section.id, background_type: 'color', color: e.target.value, active: true });
                            }
                            setSiteConfig({ ...siteConfig, section_backgrounds: backgrounds });
                          }}
                          className="w-12 h-10 rounded cursor-pointer border-0"
                        />
                        <Input value={bg.color || '#F4F1EA'} readOnly className="font-mono" />
                      </div>
                    </div>
                  )}

                  {/* Image upload */}
                  {bg.background_type === 'image' && (
                    <div>
                      <label className="block text-sm font-medium text-charcoal/70 mb-2">Image</label>
                      {bg.image_url ? (
                        <div className="flex items-center gap-2">
                          <img src={bg.image_url} alt="" className="w-16 h-10 object-cover rounded" />
                          <span className="text-xs text-charcoal/50 truncate flex-1">{bg.image_url.split('/').pop()}</span>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && uploadSectionBackground(section.id, e.target.files[0])}
                            className="hidden"
                            id={`bg-upload-${section.id}`}
                          />
                          <Button
                            onClick={() => document.getElementById(`bg-upload-${section.id}`)?.click()}
                            disabled={uploading === section.id}
                            size="sm"
                            variant="outline"
                          >
                            {uploading === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overlay opacity */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal/70 mb-2">
                      Overlay: {bg.overlay_opacity || 0}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bg.overlay_opacity || 0}
                      onChange={(e) => {
                        const backgrounds = [...(siteConfig.section_backgrounds || [])];
                        const idx = backgrounds.findIndex(b => b.section_id === section.id);
                        if (idx >= 0) {
                          backgrounds[idx] = { ...backgrounds[idx], overlay_opacity: parseInt(e.target.value) };
                        }
                        setSiteConfig({ ...siteConfig, section_backgrounds: backgrounds });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Animations Tab */}
      {activeTab === 'animations' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={saveSiteConfig} disabled={saving} className="bg-terracotta text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </div>

          {/* Global toggle */}
          <div className="bg-terracotta/10 border border-terracotta/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-charcoal">Animations actives</h4>
                <p className="text-sm text-charcoal/60">Activer ou désactiver toutes les animations du site</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteConfig.animations_enabled}
                  onChange={(e) => setSiteConfig({ ...siteConfig, animations_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-charcoal/20 rounded-full peer peer-checked:bg-terracotta peer-focus:ring-2 peer-focus:ring-terracotta/50 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-6"></div>
              </label>
            </div>
          </div>

          {/* Individual toggles */}
          <div className="bg-paper border border-lightborder rounded-xl p-6 space-y-4">
            <h4 className="font-semibold text-charcoal mb-4">Animations par section</h4>
            
            {[
              { key: 'countdown_enabled', label: 'Compte à rebours', desc: 'Secondes qui défilent en temps réel' },
              { key: 'particles_enabled', label: 'Particules (CTA)', desc: 'Effet de particules dans la section Rejoignez' },
              { key: 'map_lines_enabled', label: 'Lignes de la carte', desc: 'Animation des connexions sur le planisphère' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-lightborder last:border-0">
                <div>
                  <span className="font-medium text-charcoal">{item.label}</span>
                  <p className="text-sm text-charcoal/50">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteConfig[item.key]}
                    onChange={(e) => setSiteConfig({ ...siteConfig, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-charcoal/20 rounded-full peer peer-checked:bg-sage peer-focus:ring-2 peer-focus:ring-sage/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="bg-sage/10 border border-sage/30 rounded-xl p-4">
            <p className="text-sm text-charcoal/70">
              <strong>Note:</strong> Les utilisateurs avec <code className="bg-charcoal/10 px-1 rounded">prefers-reduced-motion</code> activé 
              verront automatiquement une version sans animations, indépendamment de ces réglages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ================== MAIN CMS COMPONENT ==================
const CMSAdmin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState('media');
  
  // 🔄 Bidirectional Real-time Sync
  const { isConnected, connectionCount, sendUpdate } = useBidirectionalSync();

  const sections = [
    { id: 'media', label: 'Médias', icon: Image },
    { id: 'exhibitors', label: 'Profils', icon: Users },
    { id: 'speakers', label: 'Intervenants', icon: Mic2 },
    { id: 'partners', label: 'Partenaires', icon: Building2 },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'content', label: 'Contenu', icon: FileText },
    { id: 'pages', label: 'Pages', icon: Layout },
    { id: 'mapfonds', label: 'Carte & Fonds', icon: Globe },
    { id: 'intention', label: 'Intention', icon: Sparkles },
    { id: 'preview', label: 'Aperçu', icon: Eye }
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'CC2026admin') {
      setIsAuthenticated(true);
    } else {
      toast.error('Mot de passe incorrect');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-paper rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Settings className="w-12 h-12 text-terracotta mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-charcoal">CMS Admin</h1>
            <p className="text-charcoal/60 text-sm">Culture Connect 2026</p>
          </div>
          <form onSubmit={handleLogin}>
            <Input type="password" placeholder="Mot de passe administrateur" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4" />
            <Button type="submit" className="w-full bg-terracotta text-white">Connexion</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-charcoal text-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">CMS Admin</h1>
                <p className="text-sm text-paper/60">Gestion complète du contenu</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Visual Editor Button */}
              <Button 
                onClick={() => navigate('/admin/cms/visual-editor')}
                variant="outline" 
                size="sm" 
                className="border-terracotta/50 text-terracotta hover:bg-terracotta hover:text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Editeur Visuel
              </Button>
              {/* Real-time Status Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                isConnected ? 'bg-sage/20 text-sage' : 'bg-red-500/20 text-red-400'
              }`}>
                <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse' : ''}`} />
                {isConnected ? (
                  <>Live Sync {connectionCount > 1 && <span className="font-bold">({connectionCount})</span>}</>
                ) : (
                  'Deconnecte'
                )}
              </div>
              <Button onClick={() => setIsAuthenticated(false)} variant="outline" size="sm" className="border-paper/30 text-paper hover:bg-white/10">
                Deconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-paper border-b border-lightborder sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeSection === section.id ? 'border-terracotta text-terracotta' : 'border-transparent text-charcoal/60 hover:text-charcoal'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'media' && <MediaSection />}
        {activeSection === 'exhibitors' && <ExhibitorsSection />}
        {activeSection === 'speakers' && <SpeakersSection />}
        {activeSection === 'partners' && <PartnersSection />}
        {activeSection === 'design' && <DesignSection />}
        {activeSection === 'content' && <ContentSection />}
        {activeSection === 'pages' && <PagesSection />}
        {activeSection === 'mapfonds' && <MapFondsSection />}
        {activeSection === 'intention' && <IntentionSection />}
        {activeSection === 'preview' && <PreviewSection />}
      </div>
    </div>
  );
};

export default CMSAdmin;
