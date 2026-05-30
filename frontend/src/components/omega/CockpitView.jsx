import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal as TermIcon, Rocket, ArrowLeft, Play, Save, History, Brain, ChevronRight, X, RotateCcw, Eye, Code, Send, Loader2, PanelRightOpen, PanelRightClose, Activity, ShieldCheck } from "lucide-react";
import Editor from "@monaco-editor/react";
import AdminHealthPanel from "./AdminHealthPanel";
import CC2026Dashboard from "./CC2026Dashboard";

const API = process.env.REACT_APP_BACKEND_URL;

const TERMINAL_BRAIN_PROMPT = `Tu es un agent de developpement web complet. Tu construis tout : landing pages, outils, dashboards, animations, mini-apps. Tu utilises HTML5, CSS3, JS vanilla + CDNs (Tailwind, Alpine.js, Chart.js, Three.js, GSAP). Tu gardes le contexte de tout ce qu'on a construit dans cette session. Tu modifies chirurgicalement. Tu debugges les erreurs. Identite kiltikonet : #0a0a0b, #f2ca50. Pas de frameworks necessitant un build. Reponds UNIQUEMENT avec le code HTML complet, sans commentaire superflu. Commence toujours par <!DOCTYPE html>.`;

export default function CockpitView({ onBack, onSelect, auth }) {
  const [activeTab, setActiveTab] = useState("terminal");
  const isAdmin = auth?.user?.role === 'admin' || auth?.user?.role === 'founder';
  const [code, setCode] = useState(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ma Page Kiltikonet</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    body { background: #0a0a0b; color: white; font-family: 'Segoe UI', sans-serif; }
    .gold { color: #f2ca50; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-5xl font-bold gold mb-4">Kiltikonet</h1>
    <p class="text-gray-400 text-lg">Ma premiere page souveraine</p>
  </div>
</body>
</html>`);
  const [slug, setSlug] = useState("");
  const [brainOpen, setBrainOpen] = useState(false);
  const [brainInput, setBrainInput] = useState("");
  const [brainMessages, setBrainMessages] = useState([]);
  const [brainThinking, setBrainThinking] = useState(false);
  const [deploys, setDeploys] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [mobilePreview, setMobilePreview] = useState(false);
  const iframeRef = useRef(null);
  const brainEndRef = useRef(null);

  const frekId = auth?.frekId || 'anon';
  const frekShort = frekId.slice(0, 5) || 'anon';

  // Refresh preview on code change (debounced)
  useEffect(() => {
    const t = setTimeout(() => setPreviewKey(k => k + 1), 500);
    return () => clearTimeout(t);
  }, [code]);

  // Load deploy history
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/terminal/deploys?frek_id=${frekId}`, { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setDeploys(d.deploys || []); }
      } catch {}
    })();
  }, [frekId]);

  // Auto-scroll brain
  useEffect(() => { brainEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [brainMessages, brainThinking]);

  const handleDeploy = async () => {
    if (!slug.trim()) { setSlug('page-1'); }
    setDeploying(true);
    try {
      const res = await fetch(`${API}/api/terminal/deploy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug || 'page-1', html: code, title: `Page ${slug || 'page-1'}`, frek_id: frekId }),
        credentials: 'include',
      });
      if (res.ok) {
        const d = await res.json();
        setDeploys(prev => [d, ...prev].slice(0, 10));
      }
    } catch {} finally { setDeploying(false); }
  };

  const handleRollback = async (deployId) => {
    try {
      const res = await fetch(`${API}/api/terminal/rollback/${deployId}`, { method: 'POST', credentials: 'include' });
      if (res.ok) { const d = await res.json(); if (d.html) setCode(d.html); }
    } catch {}
  };

  const handleBrainSend = useCallback(async () => {
    if (!brainInput.trim() || brainThinking) return;
    const userMsg = { role: 'user', content: brainInput };
    setBrainMessages(prev => [...prev, userMsg]);
    const currentInput = brainInput;
    setBrainInput("");
    setBrainThinking(true);

    try {
      const contextMsg = `[CODE ACTUEL DANS L'EDITEUR]\n\`\`\`html\n${code.slice(0, 3000)}\n\`\`\`\n\n[DEMANDE]\n${currentInput}`;

      const res = await fetch(`${API}/api/brain/chat-enriched`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextMsg,
          messages: brainMessages.map(m => ({ role: m.role, content: m.content.slice(0, 500) })),
          use_web_search: false, user_name: auth?.userName || 'Dev',
          langue_preference: 'fr', frek_id: frekId,
          session_id: `terminal-${frekId}`,
        }),
        credentials: 'include',
      });

      if (res.ok) {
        const d = await res.json();
        const responseText = d.response || '';
        setBrainMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

        const htmlMatch = responseText.match(/```html\n([\s\S]*?)```/) || responseText.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
        if (htmlMatch) {
          const extractedHtml = htmlMatch[1].trim();
          setBrainMessages(prev => [...prev, { role: 'system', content: 'Code detecte. Cliquer "Inserer" pour l\'appliquer.', html: extractedHtml }]);
        }
      } else {
        const d = await res.json();
        setBrainMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${d.detail || 'Erreur Brain'}` }]);
      }
    } catch (e) {
      setBrainMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${e.message}` }]);
    } finally { setBrainThinking(false); }
  }, [brainInput, brainThinking, brainMessages, code, auth, frekId]);

  const insertCode = (html) => { setCode(html); };

  // Brain panel content (shared between desktop sidebar and mobile overlay)
  const BrainPanel = ({ onClose }) => (
    <div className="flex flex-col h-full" style={{ background: '#0e0e0e' }}>
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: '#f2ca50' }} />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#f2ca50' }}>LAURENT.IA · TERMINAL</span>
        </div>
        {onClose && <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-gray-400" /></button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {brainMessages.length === 0 && (
          <p className="text-[10px] text-gray-500 text-center py-8">Decris ce que tu veux construire.<br/>Le Brain generera le code.</p>
        )}
        {brainMessages.map((m, i) => (
          <div key={i} className={`text-xs ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            {m.role === 'user' ? (
              <span className="inline-block px-3 py-2 rounded-xl max-w-[90%] text-left" style={{ background: 'rgba(242,202,80,0.1)', color: '#f2ca50' }}>{m.content}</span>
            ) : m.role === 'system' ? (
              <div className="p-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-green-400 text-[10px] mb-2">{m.content}</p>
                {m.html && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertCode(m.html)} className="px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest uppercase" style={{ background: '#22c55e', color: 'black' }}>
                    <Code className="w-3 h-3 inline mr-1" /> Inserer dans l'editeur
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="p-2 rounded-xl text-gray-300 whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content}
              </div>
            )}
          </div>
        ))}
        {brainThinking && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500"><Loader2 className="w-3 h-3 animate-spin" style={{ color: '#f2ca50' }} /> Brain reflechit...</div>
        )}
        <div ref={brainEndRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); handleBrainSend(); }} className="p-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <input value={brainInput} onChange={e => setBrainInput(e.target.value)} placeholder="Construis-moi une landing page..." className="flex-1 bg-black/40 text-xs px-3 py-2 rounded-xl outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
        <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={brainThinking} className="p-2 rounded-xl" style={{ background: '#f2ca50', color: 'black' }}>
          <Send className="w-3.5 h-3.5" />
        </motion.button>
      </form>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: '#0a0a0b' }} data-testid="terminal-view">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><ArrowLeft className="w-4 h-4 text-gray-400" /></button>
          {/* Tab Switcher */}
          <div className="flex items-center gap-0.5 md:gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <button onClick={() => setActiveTab("terminal")} className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-[8px] md:text-[9px] font-bold tracking-widest uppercase transition-all ${activeTab === 'terminal' ? 'text-[#f2ca50]' : 'text-gray-500 hover:text-gray-300'}`} style={activeTab === 'terminal' ? { background: 'rgba(242,202,80,0.1)' } : {}} data-testid="cockpit-tab-terminal">
              <TermIcon className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Terminal</span>
            </button>
            <button onClick={() => setActiveTab("health")} className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-[8px] md:text-[9px] font-bold tracking-widest uppercase transition-all ${activeTab === 'health' ? 'text-[#f2ca50]' : 'text-gray-500 hover:text-gray-300'}`} style={activeTab === 'health' ? { background: 'rgba(242,202,80,0.1)' } : {}} data-testid="cockpit-tab-health">
              <Activity className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">Sante</span>
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab("cc2026")} className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-[8px] md:text-[9px] font-bold tracking-widest uppercase transition-all ${activeTab === 'cc2026' ? 'text-[#f2ca50]' : 'text-gray-500 hover:text-gray-300'}`} style={activeTab === 'cc2026' ? { background: 'rgba(242,202,80,0.1)' } : {}} data-testid="cockpit-tab-cc2026">
                <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">CC2026</span>
              </button>
            )}
          </div>
          <span className="text-[9px] text-gray-600 font-mono hidden md:inline">{frekShort}</span>
        </div>
        {activeTab === "terminal" && (
          <div className="flex items-center gap-1.5 md:gap-2">
            <input value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="slug" className="bg-black/40 text-[10px] font-mono px-2 py-1 rounded w-16 md:w-24 outline-none hidden sm:block" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#f2ca50' }} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeploy} disabled={deploying} className="flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold tracking-widest uppercase" style={{ background: deploying ? '#333' : '#f2ca50', color: 'black' }}>
              {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />} <span className="hidden sm:inline">{deploying ? 'DEPLOY...' : 'DEPLOY'}</span>
            </motion.button>
            {/* Mobile: Preview toggle */}
            <button onClick={() => setMobilePreview(!mobilePreview)} className={`p-1.5 rounded-lg md:hidden ${mobilePreview ? 'bg-[#f2ca50]/20' : 'hover:bg-white/5'}`}>
              <Eye className="w-4 h-4" style={{ color: mobilePreview ? '#f2ca50' : '#9ca3af' }} />
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 rounded-lg hover:bg-white/5 hidden sm:block"><History className="w-4 h-4 text-gray-400" /></button>
            <button onClick={() => setBrainOpen(!brainOpen)} className={`p-1.5 rounded-lg transition-colors ${brainOpen ? 'bg-[#f2ca50]/20' : 'hover:bg-white/5'}`} data-testid="terminal-brain-toggle">
              {brainOpen ? <PanelRightClose className="w-4 h-4" style={{ color: '#f2ca50' }} /> : <Brain className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Health Tab */}
      {activeTab === "health" && (
        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full" style={{ scrollbarWidth: 'thin' }}>
          <AdminHealthPanel />
        </div>
      )}

      {/* CC2026 Admin Tab */}
      {activeTab === "cc2026" && isAdmin && (
        <div className="flex-1 overflow-hidden">
          <CC2026Dashboard onBack={() => setActiveTab("terminal")} />
        </div>
      )}

      {/* Terminal Tab */}
      {activeTab === "terminal" && (
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor + Preview */}
        <div className={`flex-1 flex flex-col ${brainOpen ? 'lg:w-1/2' : 'w-full'} transition-all`}>
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Monaco Editor — full width on mobile, half on desktop */}
            <div className={`flex-1 ${mobilePreview ? 'hidden md:block' : ''}`}>
              <Editor height="100%" language="html" theme="vs-dark" value={code} onChange={v => setCode(v || '')}
                options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: 'on', wordWrap: 'on', automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 8 }, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }} />
            </div>
            {/* Preview — hidden on mobile unless toggled, always visible on md+ */}
            <div className={`${mobilePreview ? 'flex-1' : 'hidden'} md:flex md:flex-1 flex-col border-l`} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 px-3 py-1 text-[9px] text-gray-500 font-mono border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <Eye className="w-3 h-3" /> PREVIEW
                <button onClick={() => setPreviewKey(k => k + 1)} className="ml-auto hover:text-white"><RotateCcw className="w-3 h-3" /></button>
              </div>
              <iframe key={previewKey} ref={iframeRef} srcDoc={code} className="flex-1 w-full bg-white" sandbox="allow-scripts allow-same-origin" title="preview" />
            </div>
          </div>
        </div>

        {/* Brain Panel — Desktop: sidebar, Mobile: fullscreen overlay */}
        {/* Desktop Brain sidebar (hidden on mobile) */}
        <AnimatePresence>
          {brainOpen && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="hidden lg:flex flex-col border-l overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <BrainPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Brain overlay */}
        <AnimatePresence>
          {brainOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="lg:hidden fixed inset-0 z-50"
              data-testid="terminal-brain-mobile"
            >
              <BrainPanel onClose={() => setBrainOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deploy History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="hidden md:block border-l overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0e0e0e' }}>
              <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">DEPLOYS</span>
                <button onClick={() => setShowHistory(false)}><X className="w-3 h-3 text-gray-500" /></button>
              </div>
              {deploys.length === 0 && <p className="text-[10px] text-gray-600 text-center py-6">Aucun deploiement</p>}
              {deploys.map((d, i) => (
                <div key={i} className="p-3 border-b hover:bg-white/5 cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-[10px] font-bold text-white">{d.slug || d.title}</div>
                  <div className="text-[8px] text-gray-500 font-mono">{d.timestamp || d.deploy_id?.slice(0, 8)}</div>
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-[8px]" style={{ color: '#f2ca50' }}>Voir</a>}
                  <button onClick={() => handleRollback(d.deploy_id)} className="text-[8px] text-orange-400 ml-2">Rollback</button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
