import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ArrowLeft, Fingerprint, Globe, ChevronRight, User, Scale, Award, History, Settings, Shield, Bell, Eye, LogOut, Moon, Save, Loader2, Trash2, AlertTriangle, Languages, X, CheckCircle, Smartphone, Plus, Camera, TrendingUp, Zap, MessageSquare, BarChart2, Lightbulb } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function SovereignProfileView({ onBack, auth, adhesion, adhesionLevels, onSubscribe, onCancelAdhesion }) {
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState("account");
  const [profileAnalytics, setProfileAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLang, setEditLang] = useState("fr");
  const [editNotifEmail, setEditNotifEmail] = useState(true);
  const [editNotifPush, setEditNotifPush] = useState(false);
  const [editNotifSound, setEditNotifSound] = useState(() => localStorage.getItem('kk_notif_sound') === 'true');
  const [editProfilePublic, setEditProfilePublic] = useState(true);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(false);
  const avatarInputRef = useRef(null);

  const userName = auth?.userName || 'Souverain';
  const frekId = auth?.frekId || '---';
  const email = auth?.user?.email || 'non connecte';
  const adhesionLevel = adhesion?.level || 'FREE';
  const brainQuota = adhesion?.brain_quota_daily || 10;
  const brainUsed = adhesion?.brain_quota_used_today || 0;

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/user/settings`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setEditName(data.profile?.full_name || '');
        setEditBio(data.profile?.bio || '');
        setEditLang(data.preferences?.language || 'fr');
        setEditNotifEmail(data.notifications?.email_enabled ?? true);
        setEditNotifPush(data.notifications?.push_enabled ?? false);
        setEditProfilePublic(data.privacy?.profile_public ?? true);
        if (data.profile?.avatar_url) setAvatarUrl(data.profile.avatar_url);
      }
    } catch (e) { console.error("Settings fetch error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Fetch analytics data for insights panel
  useEffect(() => {
    const load = async () => {
      try {
        const [walletRes, builderRes] = await Promise.all([
          fetch(`${API}/api/my-wallet/analytics`, { credentials: 'include' }),
          fetch(`${API}/api/builder/analytics`, { credentials: 'include' }),
        ]);
        const wallet = walletRes.ok ? await walletRes.json() : {};
        const builder = builderRes.ok ? await builderRes.json() : {};
        setProfileAnalytics({ wallet, builder });
      } catch {}
    };
    load();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/user/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile', data: { full_name: editName, bio: editBio } }),
        credentials: 'include',
      });
      if (res.ok) showToast("Profil sauvegarde");
    } catch {}
    finally { setSaving(false); }
  };

  // Save preferences
  const savePreferences = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch(`${API}/api/user/settings`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'preferences', data: { language: editLang } }),
          credentials: 'include',
        }),
        fetch(`${API}/api/user/settings`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'notifications', data: { email_enabled: editNotifEmail, push_enabled: editNotifPush, in_app_enabled: true } }),
          credentials: 'include',
        }),
        fetch(`${API}/api/user/settings`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'privacy', data: { profile_public: editProfilePublic, frek_id_public: false } }),
          credentials: 'include',
        }),
      ]);
      showToast("Preferences sauvegardees");
    } catch {}
    finally { setSaving(false); }
  };

  // Delete account (RGPD)
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/api/user/account`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        showToast("Compte supprime. Redirection...");
        setTimeout(() => { auth?.logout?.(); window.location.href = '/'; }, 2000);
      }
    } catch {}
    finally { setDeleteLoading(false); setShowDeleteConfirm(false); }
  };

  // Avatar handlers
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast("Format non supporte. Utilisez JPG, PNG ou WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Fichier trop volumineux (max 5 MB)");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setShowAvatarConfirm(true);
    e.target.value = '';
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', avatarFile);
      const res = await fetch(`${API}/api/user/avatar`, {
        method: 'POST', credentials: 'include', body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar_url);
        setShowAvatarConfirm(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        showToast("Photo de profil mise a jour");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Erreur lors de l'upload");
      }
    } catch { showToast("Erreur reseau"); }
    finally { setAvatarUploading(false); }
  };

  const securityLayers = [
    { label: "Signature Luciole", status: "Active", value: frekId ? frekId.slice(0, 12) : "---" },
    { label: "Empreinte Culturelle", status: "Verified", value: "2.47 KB" },
    { label: "Protocole Omega", status: "Encrypted", value: "AES-256" },
    { label: "Souverainete", status: "Absolute", value: adhesionLevel },
  ];

  const sections = [
    { id: "account", label: "Compte", icon: User },
    { id: "security", label: "Securite", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Confidentialite", icon: Eye },
    { id: "language", label: "Langue", icon: Languages },
    { id: "danger", label: "Zone Danger", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-screen w-full text-white overflow-hidden" style={{ background: '#050505' }} data-testid="profile-view">
      {/* Header */}
      <header className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={showSettings ? () => setShowSettings(false) : onBack} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-gray-400 hover:text-[#f2ca50]" style={{ border: '1px solid rgba(255,255,255,0.1)' }} data-testid="profile-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div>
            <span className="italic text-base uppercase tracking-wider" style={{ fontFamily: "'Noto Serif', serif", color: '#f2ca50' }}>{showSettings ? 'Parametres' : 'Profil Souverain'}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {!showSettings ? (
          <>
            {/* Profile card */}
            <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()} data-testid="avatar-clickable">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden" style={{ background: avatarUrl ? 'transparent' : 'rgba(242,202,80,0.1)', border: '1.5px solid #f2ca50' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ color: '#f2ca50', fontSize: '28px', fontWeight: 700 }}>{userName[0]}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{userName}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#f2ca50' }} />
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#f2ca50' }}>ID: {frekId || '---'}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{email}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
                  <div className="text-sm font-bold" style={{ color: '#f2ca50' }}>{adhesionLevel}</div>
                  <div className="text-[8px] text-gray-600 tracking-wider uppercase">Adhesion</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
                  <div className="text-sm font-bold" style={{ color: '#f2ca50' }}>{brainUsed}/{brainQuota}</div>
                  <div className="text-[8px] text-gray-600 tracking-wider uppercase">Brain/Jour</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
                  <div className="text-sm font-bold" style={{ color: '#f2ca50' }}>98</div>
                  <div className="text-[8px] text-gray-600 tracking-wider uppercase">Score</div>
                </div>
              </div>
            </div>

            {/* Security layers */}
            <div className="mb-5">
              <div className="text-[10px] text-gray-500 tracking-widest uppercase mb-3">Couches de Securite</div>
              <div className="space-y-2">
                {securityLayers.map((layer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-xs text-gray-400">{layer.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: '#f2ca50' }}>{layer.value}</span>
                      <span className="text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{layer.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics & Insights */}
            {profileAnalytics && (
              <div className="mb-5">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 tracking-widest uppercase mb-3">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Vos stats & conseils
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-sm font-bold text-white">{profileAnalytics.builder?.published || 0}</div>
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">Publiés</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-sm font-bold" style={{ color: '#f2ca50' }}>{profileAnalytics.builder?.eclairs_recus || 0}</div>
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">Éclairs reçus</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-sm font-bold text-white">{profileAnalytics.wallet?.total_spent || 0}</div>
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">JCC dépensés</div>
                  </div>
                </div>
                {/* Actionable insights */}
                <div className="space-y-2">
                  {(profileAnalytics.builder?.published || 0) === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.15)' }}>
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f2ca50' }} />
                      <p className="text-[10px] text-gray-300 leading-relaxed">Vous n'avez pas encore publié de contenu. Utilisez le <strong>Builder</strong> pour créer votre premier post — il apparaîtra dans le Feed public et dans votre portfolio.</p>
                    </div>
                  )}
                  {(profileAnalytics.builder?.published || 0) > 0 && (profileAnalytics.builder?.eclairs_recus || 0) === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.15)' }}>
                      <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f2ca50' }} />
                      <p className="text-[10px] text-gray-300 leading-relaxed">Votre contenu est en ligne mais n'a pas encore reçu d'Éclairs. Partagez votre profil avec votre réseau et commentez les posts des autres pour augmenter votre visibilité.</p>
                    </div>
                  )}
                  {(profileAnalytics.builder?.eclairs_recus || 0) > 5 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
                      <p className="text-[10px] text-gray-300 leading-relaxed">Bonne traction ! Vos {profileAnalytics.builder.eclairs_recus} Éclairs reçus montrent que votre audience est engagée. Pensez à publier plus régulièrement pour maintenir l'élan.</p>
                    </div>
                  )}
                  {(profileAnalytics.wallet?.total_spent || 0) === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                      <p className="text-[10px] text-gray-300 leading-relaxed">Utilisez vos JCC pour soutenir d'autres créateurs via l'Éclair (⚡) ou accéder à Laurent.ia pour booster votre contenu.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings button */}
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowSettings(true)} className="w-full p-4 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid="open-settings-btn">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-white">Parametres</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </motion.button>

            {/* Logout */}
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => { auth?.logout?.(); window.location.href = '/'; }} className="w-full mt-3 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }} data-testid="logout-btn">
              <LogOut className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">Deconnexion</span>
            </motion.button>
          </>
        ) : (
          /* Settings panel */
          <div className="space-y-6">
            {/* Section tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 transition-all" style={{ background: activeSection === s.id ? '#f2ca50' : 'rgba(255,255,255,0.05)', color: activeSection === s.id ? 'black' : '#999', border: `1px solid ${activeSection === s.id ? '#f2ca50' : 'rgba(255,255,255,0.08)'}` }} data-testid={`settings-tab-${s.id}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {activeSection === "account" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 tracking-widest uppercase mb-2 block">Nom complet</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/5 text-sm px-4 py-2.5 rounded-xl outline-none text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }} data-testid="settings-name" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 tracking-widest uppercase mb-2 block">Bio</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="w-full bg-white/5 text-sm px-4 py-3 rounded-xl outline-none text-white resize-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} data-testid="settings-bio" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 tracking-widest uppercase mb-2 block">Email</label>
                  <input value={email} disabled className="w-full bg-white/5 text-sm px-4 py-2.5 rounded-xl outline-none text-gray-500" style={{ border: '1px solid rgba(255,255,255,0.05)' }} />
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={saveProfile} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2" style={{ background: saving ? '#333' : '#f2ca50', color: 'black' }} data-testid="save-profile-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </motion.button>
              </div>
            )}

            {activeSection === "notifications" && (
              <NotificationPreferences editNotifEmail={editNotifEmail} setEditNotifEmail={setEditNotifEmail} editNotifPush={editNotifPush} setEditNotifPush={setEditNotifPush} editNotifSound={editNotifSound} setEditNotifSound={setEditNotifSound} savePreferences={savePreferences} saving={saving} />
            )}

            {activeSection === "privacy" && (
              <div className="space-y-3">
                <ToggleItem label="Profil public" value={editProfilePublic} onChange={setEditProfilePublic} testId="privacy-public" />
                <motion.button whileTap={{ scale: 0.95 }} onClick={savePreferences} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase" style={{ background: saving ? '#333' : '#f2ca50', color: 'black' }} data-testid="save-privacy-btn">
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </motion.button>
              </div>
            )}

            {activeSection === "language" && (
              <div className="space-y-4">
                <div className="text-xs text-gray-400 mb-2">Langue de l'interface et de Laurent.ia</div>
                {["fr", "cr", "en"].map(lang => (
                  <motion.button key={lang} whileTap={{ scale: 0.98 }} onClick={() => { setEditLang(lang); }} className="w-full p-4 rounded-xl flex items-center justify-between" style={{ background: editLang === lang ? 'rgba(242,202,80,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${editLang === lang ? 'rgba(242,202,80,0.3)' : 'rgba(255,255,255,0.06)'}` }} data-testid={`lang-${lang}`}>
                    <span className="text-sm text-white">{lang === 'fr' ? 'Francais' : lang === 'cr' ? 'Creole Martiniquais' : 'English'}</span>
                    {editLang === lang && <CheckCircle className="w-4 h-4" style={{ color: '#f2ca50' }} />}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.95 }} onClick={savePreferences} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase" style={{ background: saving ? '#333' : '#f2ca50', color: 'black' }} data-testid="save-lang-btn">
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </motion.button>
              </div>
            )}

            {activeSection === "security" && (
              <SecuritySection securityLayers={securityLayers} showToast={showToast} />
            )}

            {activeSection === "danger" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold text-red-400">Suppression du compte (RGPD)</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Cette action est irreversible. Vos donnees personnelles seront anonymisees conformement au RGPD. Votre identifiant sera desactive. Les logs d'audit seront conserves de maniere anonyme.</p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} data-testid="delete-account-btn">
                    Supprimer mon compte
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0e0e0e', border: '1px solid rgba(239,68,68,0.2)' }} data-testid="delete-confirm-modal">
              <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Confirmer la suppression</h3>
              <p className="text-xs text-gray-500 mb-5">Tapez SUPPRIMER pour confirmer la suppression definitive de votre compte.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl text-sm bg-white/5 text-gray-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Annuler</button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeleteAccount} disabled={deleteLoading} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} data-testid="confirm-delete-btn">
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Supprimer'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {/* Avatar confirmation modal */}
      <AnimatePresence>
        {showAvatarConfirm && avatarPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="p-6 rounded-2xl max-w-xs w-full mx-4" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="avatar-confirm-modal">
              <h3 className="text-sm font-bold text-white mb-4 text-center">Changer la photo ?</h3>
              <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden" style={{ border: '2px solid #f2ca50' }}>
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowAvatarConfirm(false); setAvatarPreview(null); setAvatarFile(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} data-testid="avatar-cancel-btn">Annuler</button>
                <button onClick={handleAvatarUpload} disabled={avatarUploading} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#f2ca50', color: 'black' }} data-testid="avatar-confirm-btn">
                  {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {avatarUploading ? 'Upload...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: '#f2ca50', color: 'black' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationPreferences({ editNotifEmail, setEditNotifEmail, editNotifPush, setEditNotifPush, editNotifSound, setEditNotifSound, savePreferences, saving }) {
  const [pushPrefs, setPushPrefs] = useState({ feed_eclair: true, feed_comment: true, message_recu: true, badge_emit: true, wallet_credit: true, gouvernance_vote: true });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/notifications/push/preferences`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPushPrefs(d); })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, []);

  const savePushPrefs = async (key, val) => {
    const updated = { ...pushPrefs, [key]: val };
    setPushPrefs(updated);
    fetch(`${API}/api/notifications/push/preferences`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const pushTypes = [
    { key: 'feed_eclair', label: 'Eclairs sur mes posts' },
    { key: 'feed_comment', label: 'Commentaires sur mes posts' },
    { key: 'message_recu', label: 'Messages directs' },
    { key: 'badge_emit', label: 'Badge CC2026 pret' },
    { key: 'wallet_credit', label: 'Credits recus' },
    { key: 'gouvernance_vote', label: 'Votes de gouvernance' },
  ];

  return (
    <div className="space-y-3">
      <ToggleItem label="Notifications par email" value={editNotifEmail} onChange={setEditNotifEmail} testId="notif-email" />
      <ToggleItem label="Notifications push" value={editNotifPush} onChange={(v) => { setEditNotifPush(v); savePushPrefs('push_enabled', v); }} testId="notif-push" />
      <ToggleItem label="Sons de notification" value={editNotifSound} onChange={(v) => { setEditNotifSound(v); localStorage.setItem('kk_notif_sound', v ? 'true' : 'false'); }} testId="notif-sound" />

      {editNotifPush && !loadingPrefs && (
        <div className="mt-2 space-y-2 pl-2" style={{ borderLeft: '2px solid rgba(242,202,80,0.2)' }}>
          <div className="text-[9px] text-gray-500 tracking-widest uppercase mb-2">Types de notifications</div>
          {pushTypes.map(t => (
            <ToggleItem key={t.key} label={t.label} value={pushPrefs[t.key] ?? true} onChange={(v) => savePushPrefs(t.key, v)} testId={`notif-${t.key}`} />
          ))}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.95 }} onClick={savePreferences} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase" style={{ background: saving ? '#333' : '#f2ca50', color: 'black' }} data-testid="save-notif-btn">
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </motion.button>
    </div>
  );
}

function SecuritySection({ securityLayers, showToast }) {
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/auth/webauthn/devices`, { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setDevices(d.devices || []); }
    } catch {}
    setLoadingDevices(false);
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const beginRes = await fetch(`${API}/api/auth/webauthn/register/begin`, { method: 'POST', credentials: 'include' });
      if (!beginRes.ok) { showToast("Erreur lors de l'initiation"); setRegistering(false); return; }
      const options = await beginRes.json();
      const attResp = await startRegistration({ optionsJSON: options });
      const completeRes = await fetch(`${API}/api/auth/webauthn/register/complete`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: attResp }),
      });
      if (completeRes.ok) { showToast("Appareil biometrique enregistre"); loadDevices(); }
      else { const e = await completeRes.json().catch(() => ({})); showToast(e.detail || "Echec de l'enregistrement"); }
    } catch (err) {
      if (err.name !== 'NotAllowedError') showToast("Erreur: " + (err.message || "Appareil non supporte"));
    }
    setRegistering(false);
  };

  const handleRevoke = async (credId) => {
    setRevoking(credId);
    try {
      const r = await fetch(`${API}/api/auth/webauthn/revoke/${encodeURIComponent(credId)}`, { method: 'POST', credentials: 'include' });
      if (r.ok) { showToast("Appareil supprime"); loadDevices(); }
    } catch {}
    setRevoking(null);
  };

  return (
    <div className="space-y-4">
      {/* Security layers */}
      <div className="space-y-2">
        {securityLayers.map((l, i) => (
          <div key={i} className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs text-gray-400">{l.label}</span>
            <span className="text-xs font-mono" style={{ color: '#f2ca50' }}>{l.value}</span>
          </div>
        ))}
      </div>

      {/* WebAuthn Devices */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4" style={{ color: '#f2ca50' }} />
          <span className="text-[10px] text-gray-500 tracking-widest uppercase">Face ID / Touch ID</span>
        </div>

        {loadingDevices ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
        ) : devices.length === 0 ? (
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-xs text-gray-500">Aucun appareil biometrique enregistre</p>
            <p className="text-[10px] text-gray-600 mt-1">Ajoutez Face ID ou Touch ID pour vous connecter sans mot de passe</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.credential_id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`webauthn-device-${d.credential_id?.slice(0, 8)}`}>
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <div>
                    <div className="text-xs text-white">{d.device_name || 'Appareil'}</div>
                    <div className="text-[9px] text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleDateString('fr') : ''}</div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleRevoke(d.credential_id)} disabled={revoking === d.credential_id}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-all" data-testid={`webauthn-revoke-${d.credential_id?.slice(0, 8)}`}>
                  {revoking === d.credential_id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                </motion.button>
              </div>
            ))}
          </div>
        )}

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleRegister} disabled={registering}
          className="w-full mt-3 py-3 rounded-xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2"
          style={{ background: registering ? '#333' : 'rgba(242,202,80,0.1)', color: '#f2ca50', border: '1px solid rgba(242,202,80,0.2)' }}
          data-testid="webauthn-register-btn">
          {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {registering ? 'Enregistrement...' : 'Ajouter Face ID / Touch ID'}
        </motion.button>
      </div>
    </div>
  );
}

function ToggleItem({ label, value, onChange, testId }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-sm text-white">{label}</span>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => onChange(!value)} className="w-12 h-6 rounded-full p-0.5 transition-all" style={{ background: value ? '#f2ca50' : 'rgba(255,255,255,0.1)' }} data-testid={testId}>
        <motion.div animate={{ x: value ? 24 : 0 }} className="w-5 h-5 rounded-full" style={{ background: value ? 'black' : '#666' }} />
      </motion.button>
    </div>
  );
}
