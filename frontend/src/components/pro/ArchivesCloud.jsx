// ═══════════════════════════════════════════════════════════
// ÉCRAN 11 — ARCHIVES / CLOUD SOUVERAIN
// Interface cloud complète avec upload, galerie, dossiers,
// compteur stockage, et section entraînement CVL Brain
// Design System: Sovereign Onyx · Material Symbols Only
// ═══════════════════════════════════════════════════════════
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';

const G = '#E8D5A0';

// ─── File system simulation ─────────────────────────────
const INITIAL_FILES = [
  { id: 'f1', name: 'Contrat_CC2026_v3.pdf', type: 'pdf', size: '2.4 MB', date: '03 Avr 2026', folder: 'Documents', icon: 'description' },
  { id: 'f2', name: 'Logo_Kiltikonet_HD.png', type: 'image', size: '8.1 MB', date: '01 Avr 2026', folder: 'Médias', icon: 'image' },
  { id: 'f3', name: 'Campagne_Gwoka_Final.mp4', type: 'video', size: '245 MB', date: '28 Mar 2026', folder: 'Médias', icon: 'movie' },
  { id: 'f4', name: 'Budget_Prévisionnel.xlsx', type: 'spreadsheet', size: '156 KB', date: '25 Mar 2026', folder: 'Documents', icon: 'table_chart' },
  { id: 'f5', name: 'Discours_Ouverture.docx', type: 'doc', size: '340 KB', date: '22 Mar 2026', folder: 'Documents', icon: 'article' },
  { id: 'f6', name: 'Portfolio_Artistes_2026.pdf', type: 'pdf', size: '15.2 MB', date: '20 Mar 2026', folder: 'Archives', icon: 'description' },
  { id: 'f7', name: 'Morceau_Demo_Zouk.mp3', type: 'audio', size: '7.8 MB', date: '18 Mar 2026', folder: 'Musique', icon: 'audio_file' },
  { id: 'f8', name: 'Photo_Showcase_001.jpg', type: 'image', size: '4.2 MB', date: '15 Mar 2026', folder: 'Médias', icon: 'image' },
  { id: 'f9', name: 'Tradition_Orale_Transcription.txt', type: 'text', size: '89 KB', date: '10 Mar 2026', folder: 'CVL Brain', icon: 'text_snippet' },
  { id: 'f10', name: 'Dataset_Créole_v2.json', type: 'data', size: '1.2 MB', date: '05 Mar 2026', folder: 'CVL Brain', icon: 'database' },
];

const FOLDERS = [
  { id: 'all', name: 'Tous les fichiers', icon: 'folder', count: 10 },
  { id: 'Documents', name: 'Documents', icon: 'folder', count: 3 },
  { id: 'Médias', name: 'Médias', icon: 'perm_media', count: 3 },
  { id: 'Musique', name: 'Musique', icon: 'library_music', count: 1 },
  { id: 'Archives', name: 'Archives', icon: 'inventory_2', count: 1 },
  { id: 'CVL Brain', name: 'CVL Brain', icon: 'psychology', count: 2 },
];

const BRAIN_TRAINING = [
  { id: 'bt1', name: 'Corpus Créole Martiniquais', entries: '14,208', status: 'indexed', lastUpdate: 'Il y a 2h' },
  { id: 'bt2', name: 'Lexique Gwoka & Traditions', entries: '3,450', status: 'indexed', lastUpdate: 'Il y a 1j' },
  { id: 'bt3', name: 'Archives Orales (Transcriptions)', entries: '892', status: 'processing', lastUpdate: 'En cours' },
  { id: 'bt4', name: 'Base Recettes Caribéennes', entries: '1,200', status: 'queued', lastUpdate: 'En attente' },
];

const STATUS_CONFIG = {
  indexed: { color: '#4ADE80', label: 'Indexé', icon: 'check_circle' },
  processing: { color: G, label: 'En traitement', icon: 'sync' },
  queued: { color: '#72727a', label: 'En attente', icon: 'schedule' },
};

const STORAGE = { used: 2.4, total: 10, unit: 'GB' };

const ArchivesCloud = ({ session }) => {
  const [activeFolder, setActiveFolder] = useState('all');
  const [files, setFiles] = useState(INITIAL_FILES);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const fileInputRef = useRef(null);

  const filteredFiles = files.filter(f => {
    if (activeFolder !== 'all' && f.folder !== activeFolder) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length) {
      droppedFiles.forEach(f => {
        const newFile = {
          id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: f.name,
          type: f.type.split('/')[0] || 'file',
          size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
          date: 'Maintenant',
          folder: activeFolder === 'all' ? 'Documents' : activeFolder,
          icon: f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'movie' : f.type.startsWith('audio') ? 'audio_file' : 'description',
        };
        setFiles(prev => [newFile, ...prev]);
      });
      toast.success(`${droppedFiles.length} fichier(s) ajouté(s)`);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target?.files || []);
    selectedFiles.forEach(f => {
      setFiles(prev => [{
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: f.name, type: f.type.split('/')[0] || 'file',
        size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
        date: 'Maintenant', folder: activeFolder === 'all' ? 'Documents' : activeFolder,
        icon: f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'movie' : 'description',
      }, ...prev]);
    });
    if (selectedFiles.length) toast.success(`${selectedFiles.length} fichier(s) ajouté(s)`);
  };

  const handleDelete = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast.success('Fichier supprimé');
  };

  const storagePercent = Math.round((STORAGE.used / STORAGE.total) * 100);

  return (
    <div className="max-w-5xl mx-auto pb-16" data-testid="archives-cloud">
      {/* Header */}
      <header className="pt-4 space-y-3 mb-6">
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Stockage Souverain</span>
        <div className="flex items-center justify-between">
          <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 300, letterSpacing: '-0.02em', color: '#e5e2e3', lineHeight: 1 }}>
            Archives <span style={{ color: G }}>Cloud</span>
          </h1>
          {/* Storage meter */}
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: '#e5e2e3' }}>{STORAGE.used} / {STORAGE.total} {STORAGE.unit}</span>
            </div>
            <div className="w-32 h-1.5 rounded-full" style={{ background: '#2a2a2b' }}>
              <div className="h-full rounded-full" style={{ width: `${storagePercent}%`, background: storagePercent > 80 ? '#ffb4ab' : `linear-gradient(90deg, #c8a84b, ${G})` }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#131314' }}>
          {[
            { id: 'files', icon: 'folder', label: 'Fichiers' },
            { id: 'brain', icon: 'psychology', label: 'Laurent.ia Data' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all" style={{ background: activeTab === tab.id ? 'rgba(232,213,160,0.08)' : 'transparent', color: activeTab === tab.id ? G : '#72727a' }} data-testid={`cloud-tab-${tab.id}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ─── FILES TAB ───────────────────────────────────── */}
      {activeTab === 'files' && (
        <div className="flex gap-4">
          {/* Sidebar — Folders */}
          <div className="w-48 flex-shrink-0 hidden sm:block space-y-1">
            {FOLDERS.map(folder => (
              <button key={folder.id} onClick={() => setActiveFolder(folder.id)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all" style={{ background: activeFolder === folder.id ? 'rgba(232,213,160,0.06)' : 'transparent', color: activeFolder === folder.id ? G : '#72727a' }} data-testid={`folder-${folder.id}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: activeFolder === folder.id ? "'FILL' 1" : "'FILL' 0" }}>{folder.icon}</span>
                <span className="flex-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600 }}>{folder.name}</span>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>{folder.count}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555', fontSize: 18 }}>search</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2.5 rounded-xl" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.1)', color: '#e5e2e3', outline: 'none', fontFamily: "'Manrope', sans-serif", fontSize: 12 }} data-testid="cloud-search" />
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: G, color: '#3a2f09', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700 }} data-testid="upload-btn">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_upload</span>
                Upload
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <div className="flex items-center gap-1">
                <button onClick={() => setView('grid')} className="p-1.5 rounded-lg" style={{ background: view === 'grid' ? 'rgba(232,213,160,0.08)' : 'transparent' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: view === 'grid' ? G : '#555' }}>grid_view</span>
                </button>
                <button onClick={() => setView('list')} className="p-1.5 rounded-lg" style={{ background: view === 'list' ? 'rgba(232,213,160,0.08)' : 'transparent' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: view === 'list' ? G : '#555' }}>view_list</span>
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="rounded-xl p-6 transition-all"
              style={{
                background: dragOver ? 'rgba(232,213,160,0.06)' : 'transparent',
                border: `2px dashed ${dragOver ? G : 'rgba(75,70,59,0.12)'}`,
                display: filteredFiles.length === 0 || dragOver ? 'flex' : 'none',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: dragOver ? 150 : 200,
              }}
              data-testid="drop-zone"
            >
              <span className="material-symbols-outlined mb-2" style={{ fontSize: 36, color: dragOver ? G : '#2a2a2b' }}>cloud_upload</span>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: dragOver ? G : '#72727a' }}>
                {dragOver ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos fichiers ou cliquez sur Upload'}
              </p>
            </div>

            {/* Files grid/list */}
            {filteredFiles.length > 0 && !dragOver && (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="rounded-xl p-4 group transition-all hover:bg-white/[0.02]" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.06)' }} data-testid={`file-${file.id}`}>
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto" style={{ background: 'rgba(232,213,160,0.04)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: file.type === 'image' ? '#5B9BD5' : file.type === 'video' ? '#C4714A' : file.type === 'audio' ? '#8B5CF6' : G }}>{file.icon}</span>
                      </div>
                      <p className="truncate text-center" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600, color: '#e5e2e3' }}>{file.name}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>{file.size}</span>
                        <span style={{ fontSize: 3, color: '#555' }}>●</span>
                        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#555' }}>{file.date}</span>
                      </div>
                      <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-white/5"><span className="material-symbols-outlined" style={{ fontSize: 14, color: '#72727a' }}>download</span></button>
                        <button onClick={() => handleDelete(file.id)} className="p-1 rounded hover:bg-white/5"><span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ffb4ab' }}>delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: '#131314' }}>
                  {filteredFiles.map((file, i) => (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-white/[0.02] transition-colors" style={{ borderTop: i > 0 ? '1px solid rgba(75,70,59,0.06)' : 'none' }} data-testid={`file-list-${file.id}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: file.type === 'image' ? '#5B9BD5' : file.type === 'video' ? '#C4714A' : file.type === 'audio' ? '#8B5CF6' : G }}>{file.icon}</span>
                      <span className="flex-1 truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e2e3' }}>{file.name}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: '#1c1b1c', fontFamily: "'Manrope', sans-serif", fontSize: 9, color: '#72727a' }}>{file.folder}</span>
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555', width: 60, textAlign: 'right' }}>{file.size}</span>
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555', width: 80, textAlign: 'right' }}>{file.date}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-white/5"><span className="material-symbols-outlined" style={{ fontSize: 14, color: '#72727a' }}>download</span></button>
                        <button onClick={() => handleDelete(file.id)} className="p-1 rounded hover:bg-white/5"><span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ffb4ab' }}>delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ─── CVL BRAIN DATA TAB ──────────────────────────── */}
      {activeTab === 'brain' && (
        <div className="space-y-6" data-testid="brain-data-tab">
          {/* Intro */}
          <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.1)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(196,113,74,0.06), transparent 60%)' }} />
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,113,74,0.1)', border: '1px solid rgba(196,113,74,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#C4714A', fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 20, color: '#e5e2e3' }}>Données d'entraînement Laurent.ia</h3>
                <p className="mt-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#72727a', lineHeight: 1.6 }}>
                  Uploadez vos corpus, transcriptions et datasets pour enrichir l'intelligence culturelle souveraine.
                  Plus vous fournissez de données, plus Laurent.ia comprend votre contexte.
                </p>
              </div>
            </div>
          </div>

          {/* Training datasets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 18, color: '#e5e2e3' }}>Datasets Actifs</h3>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(196,113,74,0.1)', color: '#C4714A', fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, border: '1px solid rgba(196,113,74,0.15)' }} data-testid="add-dataset-btn">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Nouveau dataset
              </button>
            </div>

            {BRAIN_TRAINING.map(ds => {
              const status = STATUS_CONFIG[ds.status];
              return (
                <div key={ds.id} className="rounded-xl p-5 flex items-center gap-4" style={{ background: '#131314', border: '1px solid rgba(75,70,59,0.08)' }} data-testid={`dataset-${ds.id}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${status.color}12`, border: `1px solid ${status.color}20` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: status.color, animation: ds.status === 'processing' ? 'spin 2s linear infinite' : 'none' }}>{status.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: '#e5e2e3' }}>{ds.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#72727a' }}>{ds.entries} entrées</span>
                      <span style={{ fontSize: 3, color: '#555' }}>●</span>
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555' }}>{ds.lastUpdate}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full" style={{ background: `${status.color}10`, color: status.color, fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700 }}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Training stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: 'database', value: '19,750', label: 'Entrées totales' },
              { icon: 'model_training', value: '3', label: 'Modèles actifs' },
              { icon: 'speed', value: '94%', label: 'Précision' },
              { icon: 'update', value: '2h', label: 'Dernière sync' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl" style={{ background: '#131314' }}>
                <span className="material-symbols-outlined" style={{ color: '#C4714A', fontSize: 20 }}>{s.icon}</span>
                <div className="mt-2">
                  <span style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 400, color: '#e5e2e3' }}>{s.value}</span>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#72727a', marginTop: 2 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ArchivesCloud;
