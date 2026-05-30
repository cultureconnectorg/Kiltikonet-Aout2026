import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bot, Activity, Shield, Zap, Globe, BarChart3, MessageSquare,
  ArrowLeft, RefreshCw, Loader2, Power, AlertTriangle, Clock,
  ChevronRight, Search, Terminal, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/ai-agents`;

const CATEGORY_LABELS = {
  core: { label: 'Noyau', color: '#A65D47' },
  operations: { label: 'Opérations', color: '#F39C12' },
  integrations: { label: 'Intégrations', color: '#3498DB' },
  maintenance: { label: 'Maintenance', color: '#95A5A6' },
  pro: { label: 'Pro', color: '#9B59B6' },
  security: { label: 'Sécurité', color: '#E74C3C' },
};

const TYPE_ICONS = {
  analytics: BarChart3,
  monitoring: Activity,
  automation: Zap,
  payment: Shield,
  content: Globe,
  communication: MessageSquare,
  social: MessageSquare,
  security: Shield,
};

const AIAgentsDashboard = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentDetail, setAgentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [toggling, setToggling] = useState(null);

  const loadAgents = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/list`);
      setAgents(data.agents || []);
      setStats(data.stats || {});
    } catch (err) {
      toast.error('Erreur chargement agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const loadAgentDetail = async (agentId) => {
    setLoadingDetail(true);
    setSelectedAgent(agentId);
    try {
      const { data } = await axios.get(`${API}/${agentId}/status`);
      setAgentDetail(data);
    } catch (err) {
      toast.error('Erreur chargement détail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleAgent = async (agentId) => {
    setToggling(agentId);
    try {
      const { data } = await axios.post(`${API}/${agentId}/toggle`);
      toast.success(`Agent ${data.enabled ? 'activé' : 'désactivé'}`);
      loadAgents();
      if (selectedAgent === agentId) loadAgentDetail(agentId);
    } catch (err) {
      toast.error('Erreur toggle');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div data-testid="ai-agents-dashboard" className="min-h-screen bg-[#0D0D0D] text-[#F4F1EA]">
      {/* Header */}
      <div className="border-b border-[#222] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/coleen')} className="text-[#888] hover:text-[#F4F1EA]">
            <ArrowLeft size={16} className="mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
              <Bot size={20} className="text-[#A65D47]" /> Dashboard Agents IA
            </h1>
            <p className="text-xs text-[#666]">Monitoring des agents automatisés CC2026</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadAgents} disabled={loading} className="border-[#333] text-[#CCC] hover:bg-[#222]">
          <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* Stats Bar */}
      {!loading && (
        <div className="px-6 py-4 border-b border-[#1A1A1A] flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-[#CCC]">{stats.active} actifs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-[#CCC]">{stats.inactive} inactifs</span>
          </div>
          <div className="text-sm text-[#666]">{stats.total} agents au total</div>
        </div>
      )}

      <div className="flex">
        {/* Agent List */}
        <div className="w-80 border-r border-[#222] min-h-[calc(100vh-130px)] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#A65D47]" />
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {agents.map(agent => {
                const Icon = TYPE_ICONS[agent.type] || Bot;
                const cat = CATEGORY_LABELS[agent.category] || { label: agent.category, color: '#666' };
                const isSelected = selectedAgent === agent.id;

                return (
                  <button
                    key={agent.id}
                    data-testid={`agent-card-${agent.id}`}
                    onClick={() => loadAgentDetail(agent.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${isSelected ? 'bg-[#1A1A1A] border border-[#333]' : 'hover:bg-[#141414]'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${agent.enabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Icon size={14} style={{ color: agent.enabled ? '#2ECC71' : '#E74C3C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#F4F1EA] truncate">{agent.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] truncate" style={{ color: cat.color }}>{cat.label}</span>
                          {agent.cvl_brain_connected && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${agent.cvl_brain_last_success !== false ? 'bg-cyan-500/15 text-cyan-400' : 'bg-orange-500/15 text-orange-400'}`}>
                              BRAIN
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${agent.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <main className="flex-1 p-6 overflow-auto max-h-[calc(100vh-130px)]">
          {!selectedAgent ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#555]">
              <Bot size={48} className="mb-4 opacity-30" />
              <p className="text-sm">Sélectionnez un agent pour voir ses détails</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#A65D47]" />
            </div>
          ) : agentDetail ? (
            <div className="space-y-6">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{agentDetail.name}</h2>
                  <p className="text-sm text-[#888] mt-1">{agentDetail.description}</p>
                  {agentDetail.warning && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-[#F39C12] bg-[#F39C12]/10 px-3 py-1.5 rounded">
                      <AlertTriangle size={12} /> {agentDetail.warning}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAgent(agentDetail.id)}
                  disabled={toggling === agentDetail.id}
                  className={`border-[#333] ${agentDetail.enabled ? 'text-green-400' : 'text-red-400'}`}
                  data-testid={`toggle-${agentDetail.id}`}
                >
                  {agentDetail.enabled ? <ToggleRight size={16} className="mr-1" /> : <ToggleLeft size={16} className="mr-1" />}
                  {agentDetail.enabled ? 'Actif' : 'Inactif'}
                </Button>
              </div>

              {/* Laurent.ia Connection */}
              {agentDetail.cvl_brain_connected && (
                <div className="bg-gradient-to-r from-cyan-900/20 to-[#141414] border border-cyan-500/30 p-5 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide flex items-center gap-2 text-cyan-400">
                    <Zap size={14} /> Laurent.ia connecte
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#888]">Endpoint BRAIN</span>
                      <p className="text-cyan-300 font-mono mt-1">{agentDetail.cvl_brain_endpoint || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[#888]">Total appels</span>
                      <p className="text-xl font-bold text-cyan-400 mt-1">{agentDetail.cvl_brain_total_calls || 0}</p>
                    </div>
                    <div>
                      <span className="text-[#888]">Dernier appel</span>
                      <p className="text-[#CCC] mt-1">{agentDetail.cvl_brain_last_call ? new Date(agentDetail.cvl_brain_last_call).toLocaleString('fr-FR') : 'Aucun'}</p>
                    </div>
                    <div>
                      <span className="text-[#888]">Statut</span>
                      <p className={`mt-1 font-medium ${agentDetail.cvl_brain_last_success !== false ? 'text-green-400' : 'text-red-400'}`}>
                        {agentDetail.cvl_brain_last_success !== false ? 'Operationnel' : 'Erreur'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-lg">
                  <span className="text-xs text-[#888]">Endpoints</span>
                  <p className="text-xl font-bold">{agentDetail.endpoints?.length || 0}</p>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-lg">
                  <span className="text-xs text-[#888]">Exécutions 24h</span>
                  <p className="text-xl font-bold">{agentDetail.metrics?.executions_24h || 0}</p>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-lg">
                  <span className="text-xs text-[#888]">Erreurs 24h</span>
                  <p className="text-xl font-bold text-red-400">{agentDetail.metrics?.errors_24h || 0}</p>
                </div>
              </div>

              {/* Endpoints */}
              <div className="bg-[#141414] border border-[#222] p-5 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Endpoints</h3>
                <div className="space-y-1.5">
                  {agentDetail.endpoints?.map((ep, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-[#2ECC71] font-mono">GET</span>
                      <span className="text-[#CCC] font-mono">{ep}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div className="bg-[#141414] border border-[#222] p-5 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Fichier source</h3>
                <code className="text-xs text-[#F39C12] font-mono">{agentDetail.source_file}</code>
              </div>

              {/* Logs */}
              <div className="bg-[#141414] border border-[#222] p-5 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Terminal size={14} /> Logs récents
                </h3>
                {agentDetail.logs?.length ? (
                  <div className="space-y-2 max-h-60 overflow-auto font-mono text-xs">
                    {agentDetail.logs.map((log, i) => (
                      <div key={i} className="flex gap-3 py-1 border-b border-[#222]">
                        <span className="text-[#555] flex-shrink-0">{log.timestamp?.slice(11, 19)}</span>
                        <span className={`flex-shrink-0 ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                          [{log.level}]
                        </span>
                        <span className="text-[#CCC]">{log.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#555] text-sm">Aucun log récent</p>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default AIAgentsDashboard;
