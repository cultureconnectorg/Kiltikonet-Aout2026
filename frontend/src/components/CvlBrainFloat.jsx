import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WELCOME_MESSAGES = [
  "Sak pasé ? Man sé Laurent.ia — Intelligence Souveraine CVLN. Ki mannyè man pé édé'w jòdi-a ?",
  "Bienvenue. Je suis Laurent.ia. Je connais tout sur CC2026, Jeton CC, et l'écosystème CVLN. Pose ta question.",
  "Je suis là pour toi. Demandez-moi n'importe quoi sur kiltikonet, la flywheel economy, ou votre profil.",
];

const QUICK_ACTIONS = [
  { label: "Kiltikonet ?", icon: "info", q: "C'est quoi kiltikonet et qu'est-ce que je peux faire sur la plateforme ?" },
  { label: "Mon profil", icon: "person", q: "Donne-moi des conseils pour améliorer ma visibilité sur la plateforme" },
  { label: "Jeton CC", icon: "toll", q: "Comment fonctionne le Jeton CC et quels packs sont disponibles ?" },
  { label: "CC2026", icon: "festival", q: "Donne-moi les infos clés sur Culture Connect 2026" },
  { label: "Mon Identité", icon: "fingerprint", q: "À quoi sert mon identité culturelle ?" },
  { label: "Espace Pro", icon: "dashboard", q: "Quelles sont les fonctionnalités de l'Espace Pro ?" },
];

const genSessionId = () => `brain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const CvlBrainFloat = ({ session, externalOpen, onExternalClose }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(genSessionId);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (externalOpen && !open) handleOpen();
  }, [externalOpen]);

  const handleClose = () => {
    setOpen(false);
    if (onExternalClose) onExternalClose();
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Save conversation to persistent memory
  const saveToMemory = useCallback(async (msgs) => {
    if (msgs.length < 2) return;
    try {
      await axios.post(`${API}/brain/memory/save`, {
        session_id: sessionId,
        user_id: session?.id || '',
        messages: msgs,
      });
    } catch {}
  }, [sessionId, session?.id]);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/brain/memory/history`, { params: { user_id: session?.id || '', limit: 20 } });
      setHistory(res.data.conversations || []);
    } catch {}
  }, [session?.id]);

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
      }]);
    }
    loadHistory();
  };

  const loadConversation = async (convSessionId) => {
    try {
      const res = await axios.get(`${API}/brain/memory/${convSessionId}`);
      setMessages(res.data.messages || []);
      setSessionId(convSessionId);
      setShowHistory(false);
    } catch {}
  };

  const newConversation = () => {
    if (messages.length > 1) saveToMemory(messages);
    setSessionId(genSessionId());
    setMessages([{
      role: 'assistant',
      content: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
    }]);
    setShowHistory(false);
  };

  const sendMessage = async (overrideMsg) => {
    // Handle case where overrideMsg is an event object (from button click)
    const msgToSend = typeof overrideMsg === 'string' ? overrideMsg : null;
    const userMsg = (msgToSend || input).trim();
    if (!userMsg || loading) return;
    if (!msgToSend) setInput('');
    const newMsgs = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);

    // Show thought process
    const thinkingSteps = [
      "Je reflechis a ta question...",
      "Je consulte mes connaissances...",
      "C'est genial, je synthetise..."
    ];
    let thinkingIdx = 0;
    const thinkingMsg = { role: 'thinking', content: thinkingSteps[0] };
    setMessages(prev => [...prev, thinkingMsg]);
    const thinkTimer = setInterval(() => {
      thinkingIdx = (thinkingIdx + 1) % thinkingSteps.length;
      setMessages(prev => {
        const copy = [...prev];
        const tIdx = copy.findIndex(m => m.role === 'thinking');
        if (tIdx >= 0) copy[tIdx] = { ...copy[tIdx], content: thinkingSteps[thinkingIdx] };
        return copy;
      });
    }, 1200);

    try {
      const userContext = session ? {
        name: session.name || session.email,
        email: session.email,
        frek_id: session.frek_id,
        profile_type: session.type || session.profile_type,
      } : null;

      const historyMsgs = newMsgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-20);

      const res = await axios.post(`${API}/brain/chat-enriched`, {
        message: userMsg,
        messages: historyMsgs,
        user_name: session?.name || 'un utilisateur',
        user_context: userContext,
        use_web_search: userMsg.includes('?') || userMsg.toLowerCase().includes('quoi') || userMsg.toLowerCase().includes('comment') || userMsg.toLowerCase().includes('actualit'),
      });
      clearInterval(thinkTimer);
      const reply = res.data.response || "Man pa ka konprann. Eseye anko.";
      // Remove thinking message and add real reply
      const allMsgs = [...newMsgs, { role: 'assistant', content: reply, webEnriched: res.data.web_enriched }];
      setMessages(allMsgs);
      saveToMemory(allMsgs);
    } catch {
      clearInterval(thinkTimer);
      const allMsgs = [...newMsgs, { role: 'assistant', content: "Desole, man ni an ti pwoblem. Eseye anko dan an ti moman." }];
      setMessages(allMsgs);
    } finally {
      setLoading(false);
    }
  };

  const deleteConv = async (sid) => {
    try {
      await axios.delete(`${API}/brain/memory/${sid}`);
      setHistory(h => h.filter(c => c.session_id !== sid));
    } catch {}
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={handleOpen} data-testid="cvl-brain-float-btn"
          className="fixed right-4 z-[80] w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ bottom: 'var(--kk-fab-bottom-mobile)', background: 'rgba(232,213,160,0.12)', boxShadow: '0 0 32px rgba(232,213,160,0.15), 0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)' }}
          aria-label="Parle à Laurent.ia">
          <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 26, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>psychology</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed right-4 z-[95] rounded-xl overflow-hidden flex flex-col"
          style={{ bottom: 'var(--kk-fab-bottom-mobile)', width: 'min(340px, calc(100vw - 2rem))', background: '#131314', boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(232,213,160,0.05)', maxHeight: '520px', border: '1px solid rgba(75,70,59,0.1)' }}
          data-testid="cvl-brain-chat">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(232,213,160,0.03)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(232,213,160,0.08)' }}>
                <span className="material-symbols-outlined" style={{ color: '#E8D5A0', fontSize: 18, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>psychology</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 14, fontWeight: 400, color: '#e5e2e3' }}>Laurent.ia</p>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A5D4E' }}>Intelligence Souveraine</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }} className="p-2 rounded-lg hover:bg-white/5" title="Historique">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: showHistory ? '#E8D5A0' : '#555' }}>history</span>
              </button>
              <button onClick={newConversation} className="p-2 rounded-lg hover:bg-white/5" title="Nouvelle conversation">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#555' }}>add</span>
              </button>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/5">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#555' }}>close</span>
              </button>
            </div>
          </div>

          {showHistory ? (
            /* History sidebar */
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" style={{ minHeight: 200, maxHeight: 400 }}>
              <p className="px-2 py-1" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#72727a' }}>Conversations</p>
              {history.length === 0 ? (
                <p className="text-center py-8" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#555' }}>Aucun historique</p>
              ) : history.map(h => (
                <div key={h.session_id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer group"
                  onClick={() => loadConversation(h.session_id)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#72727a' }}>chat</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: '#e5e2e3' }}>{h.title}</p>
                    <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: '#555' }}>{h.message_count} messages</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteConv(h.session_id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 transition-opacity">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ffb4ab' }}>delete</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Messages */
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 200, maxHeight: 360 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {(msg.role === 'assistant' || msg.role === 'thinking') && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-1" style={{ background: msg.role === 'thinking' ? 'rgba(232,213,160,0.15)' : 'linear-gradient(135deg, #E8D5A0, #d8c591)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: msg.role === 'thinking' ? '#E8D5A0' : '#3a2f09', fontVariationSettings: "'FILL' 1", animation: msg.role === 'thinking' ? 'spin 2s linear infinite' : 'none' }}>psychology</span>
                    </div>
                  )}
                  <div className="max-w-[80%] px-4 py-3 rounded-xl leading-relaxed"
                    style={{
                      fontFamily: msg.role === 'user' ? "'Manrope', sans-serif" : "'Newsreader', serif",
                      fontStyle: msg.role === 'thinking' ? 'italic' : 'normal',
                      fontSize: msg.role === 'thinking' ? 11 : 13,
                      lineHeight: 1.6,
                      background: msg.role === 'user' ? '#201f20' : msg.role === 'thinking' ? 'rgba(232,213,160,0.04)' : 'transparent',
                      color: msg.role === 'user' ? '#e5e2e3' : msg.role === 'thinking' ? '#a09070' : '#cdc6b7',
                      borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                      borderBottomLeftRadius: msg.role === 'user' ? 12 : 4,
                    }}>
                    {msg.content}
                    {msg.webEnriched && (
                      <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(91,155,213,0.1)', fontSize: 8, color: '#5B9BD5', verticalAlign: 'middle' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 8 }}>language</span>Web
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {/* Quick Actions — show only after welcome message */}
              {messages.length === 1 && messages[0].role === 'assistant' && !loading && (
                <div className="flex flex-wrap gap-1.5 pt-1" data-testid="brain-quick-actions">
                  {QUICK_ACTIONS.map((qa, i) => (
                    <button key={i} onClick={() => sendMessage(qa.q)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
                      data-testid={`brain-qa-${i}`}
                      style={{ background: 'rgba(232,213,160,0.06)', color: '#cdc6b7', border: '1px solid rgba(232,213,160,0.1)', fontFamily: "'Manrope', sans-serif" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#E8D5A0', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{qa.icon}</span>
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl" style={{ background: '#1b1b1c' }}>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#E8D5A0', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2">
            <div className="flex gap-2 items-center rounded-full px-1" style={{ background: '#1b1b1c' }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Écrivez à Laurent.ia..." aria-label="Message pour Laurent.ia"
                className="flex-1 h-11 px-4 rounded-full text-sm" data-testid="brain-chat-input"
                style={{ background: 'transparent', border: 'none', color: '#e5e2e3', outline: 'none', fontFamily: "'Manrope', sans-serif" }} />
              <button onClick={sendMessage} disabled={!input.trim() || loading} data-testid="brain-send-btn"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: input.trim() ? '#E8D5A0' : 'transparent', opacity: input.trim() ? 1 : 0.3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: input.trim() ? '#0a0a0b' : '#555' }}>send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CvlBrainFloat;
