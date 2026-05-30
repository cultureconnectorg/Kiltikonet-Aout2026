import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, ArrowLeft, ShieldCheck, Sparkles, Paperclip, Plus, MessageSquare, History, Copy, RotateCcw, ThumbsUp, ThumbsDown, PanelLeftClose, PanelLeftOpen, Terminal, Layout, Globe, Check, Loader2, Mic, MicOff, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useBrain } from "../../hooks/useBrain";

const API = process.env.REACT_APP_BACKEND_URL;

export default function BrainChat({ onBack, onSelect, balance, auth }) {
  const { messages: brainMessages, isThinking, error, send, reset, loadSession, sessionId } = useBrain();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [useWeb, setUseWeb] = useState(false);
  const [layoutMode, setLayoutMode] = useState("default"); // default | split
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Web Speech API — Micro dictée
  const toggleDictation = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('La reconnaissance vocale n\'est pas supportee par ce navigateur'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Transform brain messages for display
  const messages = brainMessages.map((m, i) => ({
    id: i.toString(),
    role: m.role,
    content: m.content,
    timestamp: i === 0 ? "Session" : "Maintenant",
    meta: m.meta,
  }));

  // Load brain sessions & activity
  useEffect(() => {
    fetch(`${API}/api/brain/sessions`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(d => setSessions(d.sessions || []))
      .catch(() => {});
    fetch(`${API}/api/brain/activity`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { activity: [] })
      .then(d => setActivity(d.activity || []))
      .catch(() => {});
  }, []);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isThinking]);

  // Copy code to clipboard (#19)
  const copyCode = useCallback(async (text, blockId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(blockId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* silent */ }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isThinking) return;
    const text = input;
    setInput("");
    setAttachedFile(null);
    await send(text, {
      useWeb,
      userName: auth?.userName || 'utilisateur',
      userContext: auth?.user ? { email: auth.user.email } : null,
      langue: 'fr',
      frekId: auth?.frekId || '',
    });
  }, [input, isThinking, send, useWeb, auth]);

  return (
    <div className="flex h-screen w-full overflow-hidden text-white" style={{ background: '#0a0a0b' }} data-testid="brain-chat">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="h-full flex flex-col z-40 shrink-0 hidden lg:flex" style={{ background: '#0d0d0e', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 280, maxWidth: 280, overflow: 'hidden' }}>
            <div className="p-4 flex flex-col h-full overflow-hidden">
              <button onClick={reset} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all mb-6" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <Plus className="w-4 h-4" style={{ color: '#f2ca50' }} />
                <span className="text-xs font-bold tracking-widest uppercase">Nouveau Chat</span>
              </button>
              <div className="flex-1 overflow-y-auto space-y-1">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest px-3 mb-2">Historique</div>
                <button key="current" className="flex items-center gap-3 w-full p-3 rounded-lg bg-white/5 text-left group" data-testid="brain-session-current">
                  <MessageSquare className="w-4 h-4 text-[#f2ca50] transition-colors" />
                  <div className="flex-1 truncate">
                    <div className="text-xs text-gray-300 truncate">Session actuelle</div>
                    <div className="text-[8px] text-gray-600 uppercase mt-0.5">Maintenant</div>
                  </div>
                </button>
                {sessions.map((s) => (
                  <button key={s.session_id || s.id} onClick={async () => { const sid = s.session_id || s.id; await loadSession(sid); setSidebarOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-all text-left group" data-testid={`brain-session-${s.session_id || s.id}`}>
                    <MessageSquare className="w-4 h-4 text-gray-600 group-hover:text-[#f2ca50] transition-colors" />
                    <div className="flex-1 truncate">
                      <div className="text-xs text-gray-300 truncate">{s.title || s.session_id || 'Session'}</div>
                      <div className="text-[8px] text-gray-600 uppercase mt-0.5">{s.updated_at ? new Date(s.updated_at).toLocaleDateString('fr') : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => {
                  fetch(`${API}/api/brain/activity`, { credentials: 'include' })
                    .then(r => r.ok ? r.json() : { activity: [] })
                    .then(d => setActivity(d.activity || []))
                    .catch(() => {});
                }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-all text-left" data-testid="brain-activity-btn">
                  <History className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400">Activité Récente {activity.length > 0 ? `(${activity.length})` : ''}</span>
                </button>
                {activity.length > 0 && (
                  <div className="space-y-1 pl-2 max-h-32 overflow-y-auto">
                    {activity.slice(0, 5).map((a, i) => (
                      <div key={i} className="text-[9px] text-gray-600 truncate px-3 py-1">
                        {a.metadata?.query?.slice(0, 40) || a.action_type || 'Requête'} — {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('fr') : ''}
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 rounded-xl" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] uppercase tracking-widest" style={{ color: '#f2ca50' }}>Plan Pro</span>
                    <Sparkles className="w-3 h-3" style={{ color: '#f2ca50' }} />
                  </div>
                  <div className="text-[10px]" style={{ color: 'rgba(242,202,80,0.8)' }}>Accès illimité au Core Engine v2.4</div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="lg:hidden fixed inset-0 z-50 flex flex-col"
            style={{ background: '#0d0d0e' }}
          >
            <div className="p-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f2ca50' }}>Sessions</span>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <button onClick={reset} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all mb-6" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <Plus className="w-4 h-4" style={{ color: '#f2ca50' }} />
                <span className="text-xs font-bold tracking-widest uppercase">Nouveau Chat</span>
              </button>
              <div className="flex-1 overflow-y-auto space-y-1">
                {sessions.map((s) => (
                  <button key={s.session_id || s.id} onClick={async () => { const sid = s.session_id || s.id; await loadSession(sid); setSidebarOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-all text-left">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <div className="flex-1 truncate">
                      <div className="text-xs text-gray-300 truncate">{s.title || s.session_id || 'Session'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative h-full min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 backdrop-blur-xl z-30 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-all">
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-gray-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
            <div className="flex flex-col">
              <span className="italic text-base" style={{ fontFamily: "'Noto Serif', serif", color: '#f2ca50' }}>Laurent.ia</span>
              <span className="font-mono text-[7px] tracking-[0.2em] text-gray-500 uppercase">Claude 3.5 Sonnet · Core Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} onClick={() => onSelect("wallet")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#f2ca50' }} />
              <span className="font-mono text-[9px] font-bold" style={{ color: 'rgba(242,202,80,0.8)' }}>{balance} JCC</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} onClick={() => onSelect("frek_id")} className="flex items-center gap-1.5 rounded-full px-3 py-1 cursor-pointer" style={{ background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)' }}>
              <span className="font-mono text-[9px] font-bold uppercase" style={{ color: 'rgba(242,202,80,0.8)' }}>{auth?.frekId || '---'}</span>
            </motion.div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex min-h-0">
          <div className={`${layoutMode === 'split' ? 'w-1/2 border-r border-white/5' : 'w-full'} overflow-y-auto transition-all duration-300`}>
            <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 space-y-10">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-6 ${msg.role === "assistant" ? "items-start" : "items-start flex-row-reverse"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${msg.role === "assistant" ? "text-[#f2ca50]" : "text-white"}`} style={{ background: msg.role === "assistant" ? 'rgba(242,202,80,0.1)' : 'rgba(255,255,255,0.1)', border: msg.role === "assistant" ? '1px solid rgba(242,202,80,0.2)' : '1px solid rgba(255,255,255,0.1)' }}>
                  {msg.role === "assistant" ? <Sparkles className="w-4 h-4" /> : <div className="text-[10px] font-bold">BA</div>}
                </div>
                <div className={`flex-1 min-w-0 space-y-2 ${msg.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block text-sm leading-relaxed max-w-full text-left ${msg.role === "user" ? "bg-white/5 p-4 rounded-2xl rounded-tr-none" : ""}`} style={msg.role === "user" ? { border: '1px solid rgba(255,255,255,0.1)' } : {}}>
                    <div className="omega-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <div className="relative group my-4">
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => copyCode(String(children).replace(/\n$/, ""), `code-${props.key || Math.random()}`)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-gray-400" data-testid="brain-copy-code">
                                    {copiedId === `code-${props.key || ''}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" className="rounded-xl !bg-black/40 !border !border-white/10 !p-4" {...props}>
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs" style={{ color: '#f2ca50' }} {...props}>{children}</code>
                            );
                          },
                          table({ children }) { return (<div className="overflow-x-auto my-4"><table className="w-full border-collapse text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{children}</table></div>); },
                          th({ children }) { return <th className="p-2 bg-white/5 uppercase font-bold" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#f2ca50' }}>{children}</th>; },
                          td({ children }) { return <td className="p-2" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{children}</td>; }
                        }}
                      >{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {isThinking && !messages.some(m => m.isStreaming) && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-6 items-start">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(242,202,80,0.1)', color: '#f2ca50', border: '1px solid rgba(242,202,80,0.2)' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkles className="w-4 h-4" /></motion.div>
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#f2ca50' }} />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#f2ca50' }} />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#f2ca50' }} />
                  </div>
                  <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: 'rgba(242,202,80,0.4)' }}>Le Core Engine analyse...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
          </div>
          {layoutMode === 'split' && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: '50%' }} exit={{ opacity: 0, width: 0 }} className="h-full overflow-y-auto p-6" style={{ background: 'rgba(0,0,0,0.3)' }} data-testid="brain-split-panel">
              <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: '#f2ca50' }}>Code Preview</div>
              <div className="space-y-3">
                {messages.filter(m => m.role === 'assistant' && m.content?.includes('```')).length > 0 ? (
                  messages.filter(m => m.role === 'assistant' && m.content?.includes('```')).slice(-3).map((m, i) => (
                    <div key={i} className="bg-black/40 rounded-xl p-4 text-xs overflow-x-auto" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" className="rounded-xl !bg-transparent !p-0" {...props}>{String(children).replace(/\n$/, "")}</SyntaxHighlighter>
                            ) : (<code className="bg-white/10 px-1 rounded text-xs" style={{ color: '#f2ca50' }} {...props}>{children}</code>);
                          },
                          p() { return null; },
                          h1() { return null; }, h2() { return null; }, h3() { return null; },
                          ul() { return null; }, ol() { return null; }, li() { return null; },
                        }}
                      >{m.content}</ReactMarkdown>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-600 text-xs text-center py-12">Les blocs de code apparaitront ici.</div>
                )}
              </div>
            </motion.div>
          )}
        </main>

        <footer className="p-6 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative rounded-2xl p-2 focus-within:border-[rgba(242,202,80,0.3)] transition-all shadow-2xl" style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.1)' }}>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Posez une question à Laurent.ia..." className="w-full bg-transparent border-none outline-none px-4 py-3 text-sm text-white placeholder-gray-600 resize-none min-h-[60px] max-h-48" />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,audio/*,video/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 50 * 1024 * 1024) { alert('Fichier trop volumineux (max 50MB)'); return; }
                    setUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', f);
                      const r = await fetch(`${API}/api/brain/upload`, { method: 'POST', credentials: 'include', body: fd });
                      if (r.ok) {
                        const d = await r.json();
                        setAttachedFile({ url: d.url, nom: d.nom, type: d.type });
                        setInput(prev => prev + (prev ? '\n' : '') + `[Fichier joint: ${d.nom}]`);
                      } else { const err = await r.json().catch(() => ({})); alert(err.detail || 'Erreur upload'); }
                    } catch { alert('Erreur réseau lors de l\'upload'); }
                    setUploading(false);
                    e.target.value = '';
                  }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className={`p-2 rounded-lg transition-all ${attachedFile ? 'bg-[rgba(242,202,80,0.15)] text-[#f2ca50]' : 'hover:bg-white/5 text-gray-500'}`} title={attachedFile ? `Fichier: ${attachedFile.nom}` : 'Joindre un fichier'} data-testid="brain-attach-btn">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setUseWeb(!useWeb)} className={`p-2 rounded-lg transition-all ${useWeb ? 'bg-[rgba(242,202,80,0.15)] text-[#f2ca50]' : 'hover:bg-white/5 text-gray-500'}`} title={useWeb ? 'Recherche web activée' : 'Activer recherche web'} data-testid="brain-web-toggle"><Globe className="w-4 h-4" /></button>
                  <button onClick={() => setLayoutMode(layoutMode === 'default' ? 'split' : 'default')} className={`p-2 rounded-lg transition-all ${layoutMode === 'split' ? 'bg-[rgba(242,202,80,0.15)] text-[#f2ca50]' : 'hover:bg-white/5 text-gray-500'}`} title="Changer le layout" data-testid="brain-layout-toggle"><Layout className="w-4 h-4" /></button>
                  <button onClick={toggleDictation} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-white/5 text-gray-500'}`} title={isListening ? 'Arreter la dictee' : 'Dictee vocale'} data-testid="brain-dictation-toggle">
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend} disabled={!input.trim() || isThinking}
                  className="p-2.5 rounded-xl transition-all"
                  style={input.trim() && !isThinking ? { background: '#f2ca50', color: 'black', boxShadow: '0 0 15px rgba(242,202,80,0.3)' } : { background: 'rgba(255,255,255,0.05)', color: 'rgb(75,85,99)' }}>
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-[9px] text-gray-600 uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 opacity-50" /><span>Souverainete Active</span></div>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <span style={{ color: 'rgba(242,202,80,0.6)' }}>1 JCC par requete</span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <div className="flex items-center gap-1.5"><Terminal className="w-3 h-3 opacity-50" /><span>Core v2.4</span></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
