import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Send, Search, X, Check, CheckCheck,
  MoreVertical, Trash2, Smile, Clock, Zap, Shield, Users
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const G = '#E8D5A0';
const C = {
  bg: '#0a0a0b', surface: '#111111', card: '#141414', border: '#1a1a1a',
  text: '#FFFFFF', muted: '#72727a', dim: '#555555',
};

const Avatar = ({ name, src, size = 44 }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return src ? (
    <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${G}30, ${G}10)`, border: `1px solid ${G}25` }}>
      <span className="font-bold" style={{ color: G, fontSize: size * 0.35 }}>{initials}</span>
    </div>
  );
};

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "a l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const MessagesPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('cc2026_pro_session');
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      navigate('/espace-pro/connexion');
    }
  }, [navigate]);

  const loadMessages = useCallback(async () => {
    if (!session?.id) return;
    try {
      const res = await axios.get(`${API}/pro/messages/${session.id}`);
      setMessages(res.data.messages || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [session?.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Poll for new messages
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
  }, [session?.id, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv, messages]);

  // Build conversations
  const convos = messages.reduce((acc, msg) => {
    const otherId = msg.from === session?.id ? msg.to : msg.from;
    const otherName = msg.from === session?.id ? msg.toName : msg.fromName;
    if (!acc[otherId]) acc[otherId] = { id: otherId, name: otherName || 'Utilisateur', messages: [], unread: 0, lastTime: null };
    acc[otherId].messages.push(msg);
    if (!msg.read && msg.to === session?.id) acc[otherId].unread++;
    const msgTime = msg.timestamp || msg.created_at;
    if (!acc[otherId].lastTime || msgTime > acc[otherId].lastTime) acc[otherId].lastTime = msgTime;
    return acc;
  }, {});

  const sortedConvos = Object.values(convos).sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''));
  const filteredConvos = sortedConvos.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
  const activeConvo = selectedConv ? convos[selectedConv] : null;

  const sendMsg = async () => {
    if (!newMsg.trim() || !selectedConv || sending) return;
    setSending(true);
    try {
      await axios.post(`${API}/pro/messages`, { from: session.id, to: selectedConv, content: newMsg.trim() });
      setNewMsg('');
      await loadMessages();
      inputRef.current?.focus();
    } catch { toast.error('Erreur d\'envoi'); }
    finally { setSending(false); }
  };

  const markAsRead = async (msgId) => {
    try { await axios.post(`${API}/pro/messages/${msgId}/read`); } catch { /* silent */ }
  };

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!selectedConv || !activeConvo) return;
    activeConvo.messages
      .filter(m => !m.read && m.to === session?.id)
      .forEach(m => markAsRead(m.id));
  }, [selectedConv, activeConvo, session?.id]);

  if (!session) return null;

  const totalUnread = sortedConvos.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="h-screen flex flex-col" style={{ background: C.bg, fontFamily: "'DM Sans', sans-serif" }} data-testid="messages-page">
      {/* Header */}
      <header className="flex-shrink-0" style={{ background: 'rgba(10,10,11,0.97)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/core')} className="p-2 rounded-lg hover:bg-white/5"
              data-testid="messages-back-btn">
              <ArrowLeft size={18} style={{ color: C.muted }} />
            </button>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} style={{ color: G }} />
              <h1 className="text-base font-black" style={{ color: C.text }}>Messages</h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: '#ef4444', color: '#fff' }}>{totalUnread}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden max-w-5xl mx-auto w-full">
        {/* Conversations List */}
        <div className={`w-full sm:w-80 lg:w-96 flex-shrink-0 flex flex-col ${selectedConv ? 'hidden sm:flex' : 'flex'}`}
          style={{ borderRight: `1px solid ${C.border}` }} data-testid="conversations-list">
          {/* Search */}
          <div className="p-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: C.dim }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                style={{ background: '#0a0a0b', border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                data-testid="messages-search" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: G }} />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare size={36} className="mx-auto mb-3" style={{ color: '#222' }} />
                <p className="text-sm font-medium" style={{ color: C.muted }}>
                  {search ? 'Aucun resultat' : 'Aucune conversation'}
                </p>
                <p className="text-xs mt-1" style={{ color: C.dim }}>
                  Connectez-vous avec des professionnels pour echanger
                </p>
              </div>
            ) : (
              filteredConvos.map(conv => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const isActive = selectedConv === conv.id;
                return (
                  <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left"
                    style={{ background: isActive ? 'rgba(232,213,160,0.06)' : 'transparent', borderBottom: `1px solid ${C.border}`, borderLeft: isActive ? `3px solid ${G}` : '3px solid transparent' }}
                    data-testid={`conv-${conv.id}`}>
                    <div className="relative flex-shrink-0">
                      <Avatar name={conv.name} size={44} />
                      {conv.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                          style={{ background: '#ef4444', color: '#fff' }}>{conv.unread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate" style={{ color: conv.unread > 0 ? C.text : C.muted }}>
                          {conv.name}
                        </span>
                        <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: C.dim }}>
                          {formatTime(conv.lastTime)}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: conv.unread > 0 ? C.text : C.dim }}>
                        {lastMsg?.from === session.id ? 'Vous: ' : ''}{lastMsg?.content}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden sm:flex' : 'flex'}`} data-testid="chat-area">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: `${G}10`, border: `1px solid ${G}20` }}>
                  <MessageSquare size={32} style={{ color: G, opacity: 0.5 }} />
                </div>
                <p className="text-sm font-medium" style={{ color: C.muted }}>Selectionnez une conversation</p>
                <p className="text-xs mt-1" style={{ color: C.dim }}>Vos messages apparaitront ici</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
                style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(10,10,11,0.5)' }}>
                <button onClick={() => setSelectedConv(null)} className="sm:hidden p-2 rounded-lg hover:bg-white/5"
                  data-testid="chat-back-btn">
                  <ArrowLeft size={16} style={{ color: C.muted }} />
                </button>
                <Avatar name={activeConvo?.name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: C.text }}>{activeConvo?.name}</p>
                  <p className="text-[10px]" style={{ color: C.dim }}>
                    {activeConvo?.messages.length} message{activeConvo?.messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="chat-messages">
                {activeConvo?.messages.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '')).map((msg) => {
                  const isMine = msg.from === session.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%] group">
                        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={{
                            background: isMine ? G : C.card,
                            color: isMine ? '#0a0a0b' : C.text,
                            borderBottomRightRadius: isMine ? 4 : 16,
                            borderBottomLeftRadius: isMine ? 16 : 4,
                          }}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[9px]" style={{ color: C.dim }}>
                            {formatTime(msg.timestamp)}
                          </span>
                          {isMine && (
                            msg.read ?
                              <CheckCheck size={10} style={{ color: G }} /> :
                              <Check size={10} style={{ color: C.dim }} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: `1px solid ${C.border}`, background: 'rgba(10,10,11,0.5)' }}>
                <div className="flex items-center gap-2">
                  <input ref={inputRef} value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                    placeholder="Ecrire un message..."
                    className="flex-1 px-4 py-3 rounded-xl text-sm"
                    style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                    data-testid="message-input" />
                  <button onClick={sendMsg} disabled={!newMsg.trim() || sending}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-30"
                    style={{ background: G }}
                    data-testid="send-message-btn">
                    <Send size={16} style={{ color: '#0a0a0b' }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
