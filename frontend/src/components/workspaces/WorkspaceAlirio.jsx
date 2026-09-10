import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, Calendar, FileText, Send, Loader2, Bot, User, Briefcase, Clock, Plus, Users, Search, Edit2, Save, X, CheckCircle, Circle, AlertCircle, ArrowUpCircle, ListTodo, UserPlus, Award, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useSendNotification } from './NotificationSystem';
import InternalMessaging from '../InternalMessaging';
import WorkspaceHeader from './WorkspaceHeader';
import { HelpButton } from '../UserGuides';
import { useSharedData } from '../../contexts/SharedDataContext';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = {
  charbon: '#1C1A14',
  terracotta: '#C4714A',
  gold: '#D4A84B',
  forest: '#4A5D4E'
};

const WorkspaceAlirio = () => {
  const navigate = useNavigate();
  const sendNotification = useSendNotification();
  const [activeTab, setActiveTab] = useState('assistant');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', type: 'Bronze', contact: '', email: '', phone: '' });
  const [searchPartners, setSearchPartners] = useState('');
  const messagesEndRef = useRef(null);

  // Shared data from context (synchronized across all workspaces)
  const {
    partners, tasks, contacts: sharedContacts,
    addPartner: addPartnerCtx, updatePartner: updatePartnerCtx, deletePartner: deletePartnerCtx,
    addTask: addTaskCtx, updateTask: updateTaskCtx, deleteTask: deleteTaskCtx,
    addContact: addContactCtx, deleteContact: deleteContactCtx
  } = useSharedData();

  // Agenda (local - specific to Alirio's schedule)
  const [agenda, setAgenda] = useState([
    { id: 1, title: 'Réunion équipe CC2026', date: '2026-03-10', time: '10:00', type: 'reunion', participants: 'Toute l\'équipe' },
    { id: 2, title: 'Call CTM - Subvention', date: '2026-03-11', time: '14:00', type: 'call', participants: 'Laurent, Alirio' },
    { id: 3, title: 'Deadline dossier SACEM', date: '2026-03-15', time: '09:00', type: 'deadline', participants: '' },
    { id: 4, title: 'Rendez-vous partenaire Or', date: '2026-03-18', time: '11:00', type: 'rdv', participants: 'Laurent, Alirio' }
  ]);

  // Notes de réunion (local)
  const [notes, setNotes] = useState([
    { id: 1, date: '05/03/2026', title: 'Réunion équipe - Point budget', participants: 'Laurent, Gwen, Wudy', decisions: ['Budget validé', 'Artiste Kathy confirmée'], actions: ['Wudy: Mise à jour fichier dépenses', 'Gwen: Confirmer sono'] },
    { id: 2, date: '01/03/2026', title: 'Call SACEM', participants: 'Laurent, Alirio', decisions: ['Dossier accepté'], actions: ['Alirio: Suivi versement'] }
  ]);

  // Contact management state
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [newContact, setNewContact] = useState({ 
    prenom: '', nom: '', email: '', tel: '', organisation: '', 
    type: 'Personnel', statut: 'Contact', niveau_partenariat: null, notes: '' 
  });
  const [contactFilter, setContactFilter] = useState('all');

  // Task management state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', deadline: '', priority: 'moyenne', category: 'Partenariat' });

  // Filter contacts owned by Alirio
  const myContacts = sharedContacts.filter(c => c.owner === 'alirio' || !c.owner);

  // ═══ TASK HELPERS ═══
  const taskStats = {
    total: tasks.length,
    fait: tasks.filter(t => t.status === 'fait').length,
    en_cours: tasks.filter(t => t.status === 'en_cours').length,
    a_faire: tasks.filter(t => t.status === 'a_faire').length,
    en_retard: tasks.filter(t => t.status === 'en_retard').length,
    progression: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'fait').length / tasks.length) * 100) : 0
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateTaskCtx(taskId, { status: newStatus });
      if (newStatus === 'fait') {
        sendNotification?.({
          sender: 'Alirio',
          senderRole: 'business',
          type: 'task_complete',
          title: 'Tâche terminée',
          message: tasks.find(t => t.id === taskId)?.title,
          target: 'laurent'
        });
      }
      toast.success(`Tâche mise à jour: ${newStatus === 'fait' ? 'Terminée' : newStatus}`);
    } catch (error) {
      toast.error('Erreur de mise à jour');
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await addTaskCtx({
        ...newTask,
        status: 'a_faire',
        assigned_to: 'alirio',
        created_by: 'Alirio'
      });
      setNewTask({ title: '', deadline: '', priority: 'moyenne', category: 'Partenariat' });
      setShowAddTask(false);
      toast.success('Tâche ajoutée (synchronisée)');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // ═══ CONTACT HELPERS ═══
  const addContact = async () => {
    if (!newContact.prenom.trim() || !newContact.nom.trim()) return;
    try {
      await addContactCtx({
        prenom: newContact.prenom,
        nom: newContact.nom,
        email: newContact.email,
        phone: newContact.tel,
        organisation: newContact.organisation,
        categorie: newContact.type,
        statut: newContact.statut,
        notes: newContact.notes,
        owner: 'alirio'
      });
      setNewContact({ prenom: '', nom: '', email: '', tel: '', organisation: '', type: 'Personnel', statut: 'Contact', niveau_partenariat: null, notes: '' });
      setShowAddContact(false);
      toast.success('Contact ajouté (synchronisé)');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const promoteToPartner = async (contactId, level) => {
    // Find the contact to get details
    const contact = myContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Add as partner in shared data
    try {
      await addPartnerCtx({
        name: `${contact.prenom} ${contact.nom}`,
        type: level,
        status: 'Prospect',
        contact: contact.prenom,
        email: contact.email || '',
        phone: contact.phone || contact.tel || '',
        lastAction: new Date().toLocaleDateString('fr-FR'),
        nextAction: 'Premier contact',
        created_by: 'Alirio'
      });
      
      sendNotification?.({
        sender: 'Alirio',
        senderRole: 'business',
        type: 'partner_promoted',
        title: 'Nouveau partenaire',
        message: `${contact.prenom} ${contact.nom} (${contact.organisation}) - Niveau ${level}`,
        target: 'laurent'
      });
      toast.success(`Promu en Partenaire ${level} (synchronisé)`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const filteredContacts = myContacts.filter(c => {
    if (contactFilter === 'all') return true;
    return c.categorie === contactFilter || c.type === contactFilter || c.statut === contactFilter;
  });

  useEffect(() => {
    axios.post(`${API}/workspace/log`, {
      user: 'Alirio',
      role: 'business',
      action: 'login',
      details: 'Accès workspace business'
    });
    
    // Welcome message
    setMessages([{
      role: 'assistant',
      content: `Bonjour Alirio ! Je suis l'assistant IA de Culture Connect 2026.

Je connais tous les détails du projet : partenaires, budget (97 750€ HT), programme, équipe, deadlines...

Exemples de questions :
• "Quels partenaires n'ont pas encore signé ?"
• "Rédige un email de relance pour CTM"
• "Prépare l'ordre du jour de la réunion de demain"
• "Quel est le budget com prévu ?"

Comment puis-je vous aider ?`
    }]);
  }, []);

  const handleLogout = async () => {
    await axios.post(`${API}/workspace/logout`, { user: 'Alirio', role: 'business' });
    sessionStorage.removeItem('workspace_user');
    navigate('/admin');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/ai/assistant`, {
        message: userMessage,
        user: 'Alirio',
        context: 'business_secretary'
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      
      await axios.post(`${API}/workspace/log`, {
        user: 'Alirio',
        role: 'business',
        action: 'ai_chat',
        details: userMessage.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const addPartner = async () => {
    if (!newPartner.name) {
      toast.error('Nom requis');
      return;
    }

    try {
      await addPartnerCtx({
        ...newPartner,
        status: 'Prospect',
        lastAction: new Date().toLocaleDateString('fr-FR'),
        nextAction: 'Premier contact',
        created_by: 'Alirio'
      });

      await axios.post(`${API}/workspace/log`, {
        user: 'Alirio',
        role: 'business',
        action: 'partner_added',
        details: `Nouveau partenaire: ${newPartner.name} (${newPartner.type})`
      });

      await sendNotification({
        sender: 'Alirio',
        senderRole: 'business',
        type: 'partner_added',
        title: 'Nouveau partenaire ajouté',
        message: `${newPartner.name} - Type: ${newPartner.type}`,
        target: 'laurent'
      });

      toast.success(`Partenaire ajouté (synchronisé) - LC notifié`);
      setShowAddPartner(false);
      setNewPartner({ name: '', type: 'Bronze', contact: '', email: '', phone: '' });
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // === GESTION DES PARTENAIRES ===
  const deletePartner = async (partner) => {
    if (window.confirm(`Supprimer ${partner.name} ?`)) {
      try {
        await deletePartnerCtx(partner.id);
        toast.success(`${partner.name} supprimé (synchronisé)`);
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  const updatePartnerStatus = async (partner, newStatus) => {
    try {
      await updatePartnerCtx(partner.id, { status: newStatus, lastAction: new Date().toLocaleDateString('fr-FR') });

      if (newStatus === 'Signé') {
        await sendNotification({
          sender: 'Alirio',
          senderRole: 'business',
          type: 'partner_signed',
          title: 'Partenaire signé !',
          message: `${partner.name} (${partner.type}) a signé son contrat`,
          target: 'all'
        });
      }

      toast.success(`${partner.name}: ${newStatus} (synchronisé)`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const contactPartner = async (partner) => {
    try {
      await updatePartnerCtx(partner.id, { status: 'Contacté', lastAction: new Date().toLocaleDateString('fr-FR') });
      toast.success(`${partner.name} marqué comme contacté (synchronisé)`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const sendDossier = async (partner) => {
    try {
      await updatePartnerCtx(partner.id, { status: 'Dossier envoyé', lastAction: new Date().toLocaleDateString('fr-FR'), nextAction: 'Relance' });

      await sendNotification({
        sender: 'Alirio',
        senderRole: 'business',
        type: 'dossier_sent',
        title: 'Dossier partenariat envoyé',
        message: `Dossier envoyé à ${partner.name} (${partner.type})`,
        target: 'laurent'
      });

      toast.success(`Dossier envoyé à ${partner.name} (synchronisé)`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // === GESTION DES TÂCHES ===
  const deleteTask = async (task) => {
    if (window.confirm(`Supprimer "${task.title}" ?`)) {
      try {
        await deleteTaskCtx(task.id);
        toast.success('Tâche supprimée (synchronisée)');
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  // === GESTION DES CONTACTS ===
  const deleteContact = async (contact) => {
    if (window.confirm(`Supprimer ${contact.prenom} ${contact.nom} ?`)) {
      try {
        await deleteContactCtx(contact.id);
        toast.success('Contact supprimé (synchronisé)');
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  // === NOTIFICATIONS ÉQUIPE ===
  const notifyTeam = async (message, target = 'all') => {
    await sendNotification({
      sender: 'Alirio',
      senderRole: 'business',
      type: 'team_update',
      title: 'Mise à jour Partenariats',
      message: message,
      target: target
    });
    toast.success('Notification envoyée');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredPartners = partners.filter(p => 
    searchPartners === '' || 
    p.name.toLowerCase().includes(searchPartners.toLowerCase()) ||
    p.type.toLowerCase().includes(searchPartners.toLowerCase())
  );

  const getStatusStyle = (status) => {
    const styles = {
      'Signé': { bg: 'rgba(77,191,138,0.2)', color: '#4DBF8A' },
      'En négociation': { bg: `${COLORS.gold}20`, color: COLORS.gold },
      'Contacté': { bg: `${COLORS.terracotta}20`, color: COLORS.terracotta },
      'Prospect': { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' },
      'Refusé': { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' }
    };
    return styles[status] || styles['Prospect'];
  };

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: COLORS.charbon, fontFamily: "'Syne', sans-serif" }}>
      {/* Header unifié */}
      <WorkspaceHeader
        userName="Alirio"
        userRole="business"
        subtitle="Business & Secrétariat CC2026"
        dashboardPath="/dashboard-cc2026/alirio"
        onLogout={handleLogout}
        showNotifications={false}
        extraButtons={<HelpButton guideId="contacts" />}
      />

      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Tabs - Scroll horizontal sur mobile */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {[
            { id: 'taches', label: 'Tâches', shortLabel: 'Tâches', icon: ListTodo },
            { id: 'mescontacts', label: 'Contacts', shortLabel: 'Contacts', icon: UserPlus },
            { id: 'assistant', label: 'Assistant IA', shortLabel: 'IA', icon: Bot },
            { id: 'partenaires', label: 'Partenaires', shortLabel: 'Partners', icon: Users },
            { id: 'agenda', label: 'Agenda', shortLabel: 'Agenda', icon: Calendar },
            { id: 'notes', label: 'Notes', shortLabel: 'Notes', icon: FileText },
            { id: 'contacts', label: 'Carnet', shortLabel: 'Carnet', icon: Briefcase }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-all flex-shrink-0 whitespace-nowrap"
              style={{ 
                background: activeTab === tab.id ? COLORS.terracotta : 'rgba(255,255,255,0.05)',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)'
              }}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MES TÂCHES - Section 4.1 du PROMPT MAÎTRE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'taches' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className="col-span-2 rounded-lg p-4 sm:p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
                <div className="text-sm font-bold mb-3 sm:mb-4" style={{ color: COLORS.gold }}>Progression globale</div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-2xl sm:text-4xl font-bold" style={{ color: COLORS.gold }}>{taskStats.progression}%</div>
                  <div className="flex-1">
                    <div className="h-3 sm:h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div 
                        className="h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${taskStats.progression}%`, background: `linear-gradient(90deg, ${COLORS.forest}, ${COLORS.gold})` }} 
                      />
                    </div>
                    <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {taskStats.fait} / {taskStats.total} tâches terminées
                    </div>
                  </div>
                </div>
              </div>
              
              {[
                { label: 'En retard', value: taskStats.en_retard, color: '#ef4444', icon: AlertCircle },
                { label: 'Aujourd\'hui', value: taskStats.en_cours, color: COLORS.terracotta, icon: Clock },
                { label: 'À faire', value: taskStats.a_faire, color: 'rgba(255,255,255,0.5)', icon: Circle }
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg p-3 sm:p-4 text-center" style={{ background: '#2A2820', border: `1px solid ${stat.color}30` }}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" style={{ color: stat.color }} />
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Task Lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* En retard */}
              <div className="rounded-lg overflow-hidden" style={{ background: '#2A2820', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="p-4 flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                    <span className="font-bold text-white">En retard</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{taskStats.en_retard}</span>
                </div>
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {tasks.filter(t => t.status === 'en_retard').map(task => (
                    <div key={task.id} className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          <div className="text-xs mt-1" style={{ color: '#ef4444' }}>Deadline: {task.deadline}</div>
                        </div>
                        <button 
                          onClick={() => updateTaskStatus(task.id, 'fait')}
                          className="p-1 rounded hover:bg-white/10"
                          title="Marquer comme fait"
                        >
                          <CheckCircle className="w-4 h-4" style={{ color: COLORS.forest }} />
                        </button>
                      </div>
                      <div className="text-xs mt-2 px-2 py-1 rounded inline-block" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                        {task.category}
                      </div>
                    </div>
                  ))}
                  {taskStats.en_retard === 0 && <div className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Aucune tâche en retard</div>}
                </div>
              </div>

              {/* À faire / En cours */}
              <div className="rounded-lg overflow-hidden" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}30` }}>
                <div className="p-4 flex items-center justify-between" style={{ background: `${COLORS.terracotta}15` }}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" style={{ color: COLORS.terracotta }} />
                    <span className="font-bold text-white">À faire</span>
                  </div>
                  <Button size="sm" onClick={() => setShowAddTask(true)} style={{ background: COLORS.terracotta }} data-testid="add-task-btn">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {tasks.filter(t => ['a_faire', 'en_cours'].includes(t.status)).map(task => (
                    <div key={task.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {task.deadline} • {task.priority === 'haute' ? '🔴' : task.priority === 'moyenne' ? '🟡' : '🟢'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'en_cours')}
                            className="p-1 rounded hover:bg-white/10"
                            title="En cours"
                          >
                            <ArrowUpCircle className="w-4 h-4" style={{ color: COLORS.terracotta }} />
                          </button>
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'fait')}
                            className="p-1 rounded hover:bg-white/10"
                            title="Terminé"
                          >
                            <CheckCircle className="w-4 h-4" style={{ color: COLORS.forest }} />
                          </button>
                          <button 
                            onClick={() => deleteTask(task)}
                            className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminées */}
              <div className="rounded-lg overflow-hidden" style={{ background: '#2A2820', border: `1px solid ${COLORS.forest}30` }}>
                <div className="p-4 flex items-center justify-between" style={{ background: `${COLORS.forest}15` }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" style={{ color: COLORS.forest }} />
                    <span className="font-bold text-white">Terminées</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: COLORS.forest }}>{taskStats.fait}</span>
                </div>
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {tasks.filter(t => t.status === 'fait').map(task => (
                    <div key={task.id} className="p-3 rounded-lg opacity-70" style={{ background: `${COLORS.forest}10` }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: COLORS.forest }} />
                        <span className="text-sm line-through text-white">{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#2A2820' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">Nouvelle tâche</h3>
                    <button onClick={() => setShowAddTask(false)}><X className="w-5 h-5 text-white/50" /></button>
                  </div>
                  <div className="space-y-4">
                    <Input 
                      placeholder="Titre de la tâche"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      data-testid="new-task-title"
                    />
                    <Input 
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <select 
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      <option value="haute">Priorité haute</option>
                      <option value="moyenne">Priorité moyenne</option>
                      <option value="basse">Priorité basse</option>
                    </select>
                    <select 
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      <option value="Partenariat">Partenariat</option>
                      <option value="Admin">Admin</option>
                      <option value="Finance">Finance</option>
                      <option value="Organisation">Organisation</option>
                      <option value="Communication">Communication</option>
                    </select>
                    <Button onClick={addTask} className="w-full" style={{ background: COLORS.terracotta }} data-testid="save-task-btn">
                      Ajouter la tâche
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MES CONTACTS - Section 4.1 du PROMPT MAÎTRE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'mescontacts' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Mes Contacts</h2>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Annuaire personnel distinct des partenaires officiels
                </p>
              </div>
              <Button onClick={() => setShowAddContact(true)} style={{ background: COLORS.terracotta }} data-testid="add-contact-btn" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau contact
              </Button>
            </div>

            {/* Filters - Scroll horizontal sur mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              {['all', 'Partenaire', 'Institutionnel', 'Presse', 'Personnel'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setContactFilter(filter)}
                  className="px-3 py-1 rounded-full text-sm transition-all whitespace-nowrap flex-shrink-0"
                  style={{ 
                    background: contactFilter === filter ? COLORS.terracotta : 'rgba(255,255,255,0.05)',
                    color: contactFilter === filter ? '#fff' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {filter === 'all' ? 'Tous' : filter}
                </button>
              ))}
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className="rounded-lg p-4 relative"
                  style={{ background: '#2A2820', border: `1px solid ${contact.statut === 'Partenaire' ? COLORS.gold : 'rgba(255,255,255,0.1)'}` }}
                >
                  {contact.statut === 'Partenaire' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold" 
                      style={{ background: COLORS.gold, color: COLORS.charbon }}>
                      {contact.niveau_partenariat}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: `${COLORS.terracotta}30`, color: COLORS.terracotta }}>
                      {contact.prenom[0]}{contact.nom[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white">{contact.prenom} {contact.nom}</div>
                      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{contact.organisation}</div>
                      <div className="text-xs mt-1 inline-block px-2 py-0.5 rounded" 
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                        {contact.type}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Email:</span> {contact.email}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Tél:</span> {contact.tel}
                    </div>
                    {contact.notes && (
                      <div className="text-xs mt-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                        {contact.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {contact.statut !== 'Partenaire' && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => promoteToPartner(contact.id, 'Bronze')}
                          style={{ color: '#CD7F32' }}
                          title="Promouvoir Bronze"
                        >
                          <Award className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => promoteToPartner(contact.id, 'Silver')}
                          style={{ color: '#C0C0C0' }}
                          title="Promouvoir Silver"
                        >
                          <Award className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => promoteToPartner(contact.id, 'Or')}
                          style={{ color: COLORS.gold }}
                          title="Promouvoir Or"
                        >
                          <Award className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {contact.statut === 'Partenaire' && <div />}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteContact(contact)}
                      className="text-red-400 hover:text-red-300"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Contact Modal */}
            {showAddContact && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#2A2820' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">Nouveau contact</h3>
                    <button onClick={() => setShowAddContact(false)}><X className="w-5 h-5 text-white/50" /></button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        placeholder="Prénom"
                        value={newContact.prenom}
                        onChange={(e) => setNewContact({ ...newContact, prenom: e.target.value })}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        data-testid="contact-prenom"
                      />
                      <Input 
                        placeholder="Nom"
                        value={newContact.nom}
                        onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        data-testid="contact-nom"
                      />
                    </div>
                    <Input 
                      placeholder="Email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <Input 
                      placeholder="Téléphone"
                      value={newContact.tel}
                      onChange={(e) => setNewContact({ ...newContact, tel: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <Input 
                      placeholder="Organisation"
                      value={newContact.organisation}
                      onChange={(e) => setNewContact({ ...newContact, organisation: e.target.value })}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <select 
                      value={newContact.type}
                      onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      <option value="Partenaire">Partenaire</option>
                      <option value="Presse">Presse</option>
                      <option value="Institutionnel">Institutionnel</option>
                      <option value="Personnel">Personnel</option>
                    </select>
                    <textarea 
                      placeholder="Notes..."
                      value={newContact.notes}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg h-20"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <Button onClick={addContact} className="w-full" style={{ background: COLORS.terracotta }} data-testid="save-contact-btn">
                      Ajouter le contact
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Chat panel */}
            <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}20` }}>
              <div className="p-4" style={{ background: `${COLORS.terracotta}15`, borderBottom: `1px solid ${COLORS.terracotta}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.terracotta }}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Assistant CC2026</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>IA contextuelle - Claude</div>
                  </div>
                </div>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={msg.id || `msg-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className="max-w-[80%] p-4 rounded-lg"
                      style={{ background: msg.role === 'user' ? COLORS.terracotta : 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" style={{ color: COLORS.gold }} />}
                        <span className="text-xs font-bold" style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : COLORS.gold }}>
                          {msg.role === 'user' ? 'Vous' : 'Assistant'}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-white">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.gold }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex gap-3">
                  <Input 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Posez votre question..."
                    className="flex-1"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <Button onClick={sendMessage} disabled={loading || !inputMessage.trim()} style={{ background: COLORS.terracotta }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-lg p-4" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: COLORS.gold }}>Questions fréquentes</h3>
                <div className="space-y-2">
                  {[
                    "Quels partenaires n'ont pas signé ?",
                    "Quel est le budget com prévu ?",
                    "Rédige un email de relance CTM",
                    "Prépare l'ordre du jour demain",
                    "Liste les actions en attente"
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInputMessage(q)}
                      className="w-full text-left p-2 rounded text-sm transition-all hover:bg-white/5"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}20` }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: COLORS.terracotta }}>Prochains RDV</h3>
                <div className="space-y-2">
                  {agenda.slice(0, 3).map(item => (
                    <div key={item.id} className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="text-xs" style={{ color: COLORS.gold }}>{item.date} - {item.time}</div>
                      <div className="text-sm text-white">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partenaires' && (
          <div className="rounded-lg p-4 sm:p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}20` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg font-bold" style={{ color: COLORS.terracotta }}>Registre Partenaires</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <Input 
                    value={searchPartners}
                    onChange={(e) => setSearchPartners(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-10 w-full sm:w-48"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>
                <Button onClick={() => setShowAddPartner(true)} style={{ background: COLORS.terracotta }} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredPartners.map(partner => {
                const statusStyle = getStatusStyle(partner.status);
                return (
                  <div key={partner.id} className="p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${COLORS.terracotta}20`, color: COLORS.terracotta }}>
                          {partner.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-base sm:text-lg">{partner.name}</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Type: {partner.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-3 py-1 rounded text-xs font-bold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {partner.status}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deletePartner(partner)}
                          className="p-1 h-auto text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                      <div>
                        <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</div>
                        <div className="text-white">{partner.contact || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</div>
                        <div className="text-white truncate">{partner.email || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Dernière action</div>
                        <div style={{ color: COLORS.gold }}>{partner.lastAction || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Prochaine action</div>
                        <div style={{ color: COLORS.terracotta }}>{partner.nextAction}</div>
                      </div>
                    </div>
                    {/* Actions partenaire */}
                    <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {partner.status === 'Prospect' && (
                        <Button size="sm" onClick={() => contactPartner(partner)} className="text-xs px-2 py-1 h-auto" style={{ background: COLORS.gold, color: COLORS.charbon }}>
                          Contacter
                        </Button>
                      )}
                      {partner.status === 'Contacté' && (
                        <Button size="sm" onClick={() => sendDossier(partner)} className="text-xs px-2 py-1 h-auto" style={{ background: COLORS.terracotta }}>
                          Envoyer dossier
                        </Button>
                      )}
                      {partner.status === 'Dossier envoyé' && (
                        <>
                          <Button size="sm" onClick={() => updatePartnerStatus(partner, 'En négociation')} className="text-xs px-2 py-1 h-auto" style={{ background: COLORS.terracotta }}>
                            Négociation
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => contactPartner(partner)} className="text-xs px-2 py-1 h-auto" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                            Relancer
                          </Button>
                        </>
                      )}
                      {partner.status === 'En négociation' && (
                        <Button size="sm" onClick={() => updatePartnerStatus(partner, 'Signé')} className="text-xs px-2 py-1 h-auto" style={{ background: COLORS.forest }}>
                          Marquer signé
                        </Button>
                      )}
                      {partner.status === 'Signé' && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Partenaire confirmé
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="rounded-lg p-4 sm:p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.gold}20` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg font-bold" style={{ color: COLORS.gold }}>Agenda CC2026</h2>
              <Button style={{ background: COLORS.gold, color: COLORS.charbon }} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </Button>
            </div>
            <div className="space-y-3">
              {agenda.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex sm:flex-col items-center gap-2 sm:w-16 sm:text-center">
                    <div className="text-base sm:text-lg font-bold" style={{ color: COLORS.gold }}>{item.time}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.date}</div>
                  </div>
                  <div className="w-3 h-3 rounded-full" style={{ 
                    background: item.type === 'reunion' ? COLORS.terracotta : 
                               item.type === 'deadline' ? '#ef4444' : 
                               item.type === 'call' ? COLORS.gold : COLORS.forest 
                  }} />
                  <div className="flex-1">
                    <div className="font-bold text-white">{item.title}</div>
                    {item.participants && (
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.participants}</div>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="rounded-lg p-4 sm:p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.forest}20` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg font-bold" style={{ color: COLORS.forest }}>Notes de réunion</h2>
              <Button style={{ background: COLORS.forest }} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle note
              </Button>
            </div>
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="font-bold text-white text-sm sm:text-base">{note.title}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{note.date} - {note.participants}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="flex-shrink-0"><Edit2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <div className="text-xs font-bold mb-2" style={{ color: COLORS.gold }}>Décisions</div>
                      <ul className="space-y-1">
                        {note.decisions.map((d, i) => (
                          <li key={`dec-${i}-${d.slice(0,8)}`} className="text-sm text-white">• {d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold mb-2" style={{ color: COLORS.terracotta }}>Actions</div>
                      <ul className="space-y-1">
                        {note.actions.map((a, i) => (
                          <li key={`act-${i}-${a.slice(0,8)}`} className="text-sm text-white">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="rounded-lg p-4 sm:p-6" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}20` }}>
            <h2 className="text-lg font-bold mb-4 sm:mb-6" style={{ color: COLORS.terracotta }}>Carnet de contacts global</h2>
            <div className="space-y-3">
              {sharedContacts.map(contact => (
                <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: COLORS.terracotta, color: '#fff' }}>
                      {(contact.name || `${contact.prenom || ''} ${contact.nom || ''}`).trim().substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm sm:text-base">{contact.name || `${contact.prenom || ''} ${contact.nom || ''}`.trim()}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{contact.role || contact.type} - {contact.org || contact.organisation}</div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-xs sm:text-sm ml-12 sm:ml-0">
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>{contact.email}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)' }}>{contact.phone || contact.tel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add partner modal */}
        {showAddPartner && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="rounded-lg p-6 w-full max-w-md" style={{ background: '#2A2820', border: `1px solid ${COLORS.terracotta}20` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: COLORS.terracotta }}>Ajouter partenaire</h3>
                <button onClick={() => setShowAddPartner(false)}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
              </div>
              <div className="space-y-3">
                <Input 
                  value={newPartner.name}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom *"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <select 
                  value={newPartner.type}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  {['Bronze', 'Silver', 'Or', 'Institutionnel'].map(t => (
                    <option key={t} value={t} style={{ background: '#2A2820' }}>{t}</option>
                  ))}
                </select>
                <Input 
                  value={newPartner.contact}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Contact principal"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Input 
                  value={newPartner.email}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Input 
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Téléphone"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setShowAddPartner(false)} variant="outline" className="flex-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  Annuler
                </Button>
                <Button onClick={addPartner} className="flex-1" style={{ background: COLORS.terracotta }}>
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Internal Messaging */}
      <InternalMessaging 
        currentUser={{ id: 'alirio', name: 'Alirio', role: 'business' }} 
        isFounder={false} 
      />
    </div>
  );
};

export default WorkspaceAlirio;
