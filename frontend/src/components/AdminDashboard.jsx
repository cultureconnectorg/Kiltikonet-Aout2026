import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { AdminLogin } from './AdminLogin';
import { getSession } from './ProtectedRoute';
import { usePermissions } from '../lib/usePermissions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Download, LogOut, Users, Clock, CheckCircle, XCircle, 
  Search, Mail, MoreHorizontal, Trash2, Eye, EyeOff, Plus,
  BarChart3, Handshake, FileDown,
  CheckSquare, Square, Send, History, Loader2, Coins, Shield, FileText,
  Sparkles, QrCode, RefreshCw, BookOpen, Settings, Calendar, X, MessageSquare
} from 'lucide-react';
import SmartEngineDashboard from './SmartEngineDashboard';
import AIAgentsDashboard from './AIAgentsDashboard';
import JetonsAnalyticsDashboard from './JetonsAnalyticsDashboard';
import SiteAnalyticsDashboard from './SiteAnalyticsDashboard';
import { profileTypes, countryList } from '../lib/translations';
import axios from 'axios';
import { toast } from 'sonner';
import { PartnerManagement } from './PartnerManagement';
import AdminNotifications from './AdminNotifications';
import CandidaturesAdmin from './CandidaturesAdmin';
import GhostPopulationAdmin from './GhostPopulationAdmin';
import AdminInsightsPanel from './admin/AdminInsightsPanel';
import AdminRegistrationDetail from './admin/AdminRegistrationDetail';
import { AdminAddParticipantModal, AdminExportModal, AdminEmailHistoryModal } from './admin/AdminModals';
import AdminHealthPanel from './admin/AdminHealthPanel';
import AdminTeamPanel from './admin/AdminTeamPanel';
import AdminSupportPanel from './admin/AdminSupportPanel';
import AdminGouvernancePanel from './admin/AdminGouvernancePanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const API_V1 = `${BACKEND_URL}/api/v1`;

const profileIcons = {
  'artist': Users, 'label': Users, 'booking_agency': Users,
  'institution': Users, 'press': Users, 'other': MoreHorizontal
};

// Pas de placeholderImages — les participants sans photo affichent leurs initiales

export const AdminDashboard = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin: isAdminPerm, canDeleteRegistrations } = usePermissions();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [counts, setCounts] = useState({ total: 0, by_status: { pending: 0, approved: 0, rejected: 0 }, in_catalog: 0 });
  const [filters, setFilters] = useState({ profile_type: '', country: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReg, setSelectedReg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('registrations');
  const [exportFilters, setExportFilters] = useState({ expertiseTags: [], profileType: '' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [newParticipant, setNewParticipant] = useState({
    full_name: '',
    organization_name: '',
    country: 'SN',
    email: '',
    phone: '',
    profile_type: 'artist',
    tier: 'professional',
    status: 'approved',
    show_in_catalog: true,
    bio: ''
  });
  
  // Check for existing session on mount
  useEffect(() => {
    const { session } = getSession();
    if (session && (session.role === 'admin' || isAdminPerm)) {
      setIsAuthenticated(true);
      return;
    }
    // No sessionStorage cache — check cookie via API
    const checkCookie = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.session?.role === 'admin') {
            saveSession({ name: data.session.name || 'Admin', role: 'admin' }, false);
            setIsAuthenticated(true);
          }
        }
      } catch { /* silent */ }
    };
    checkCookie();
  }, [navigate]);
  
  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.profile_type) params.append('profile_type', filters.profile_type);
      if (filters.country) params.append('country', filters.country);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`${API}/registrations?${params.toString()}`);
      const regs = response.data.registrations.map((r, i) => ({
        ...r,
        image: r.logo_url || null,
        show_in_catalog: r.show_in_catalog || false
      }));
      setRegistrations(regs);
      
      // Calculate catalog count
      const inCatalog = regs.filter(r => r.show_in_catalog).length;
      setCounts({
        ...response.data.counts,
        in_catalog: inCatalog
      });
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? '✗ Impossible de charger les données. Vérifiez votre connexion.' 
          : '✗ Failed to load data. Check your connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, language]);
  
  // Fetch statistics from API v1
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_V1}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
      fetchStats();
      const interval = setInterval(fetchRegistrations, 30000);
      const statsInterval = setInterval(fetchStats, 60000);
      return () => {
        clearInterval(interval);
        clearInterval(statsInterval);
      };
    }
  }, [isAuthenticated, fetchRegistrations, fetchStats]);
  
  const handleStatusChange = async (id, status) => {
    const statusLabels = {
      pending: language === 'fr' ? 'en attente' : 'pending',
      approved: language === 'fr' ? 'approuvé' : 'approved',
      rejected: language === 'fr' ? 'refusé' : 'rejected'
    };
    try {
      await axios.patch(`${API}/registrations/${id}/status`, { status });
      toast.success(
        language === 'fr' 
          ? `✓ Participant marqué comme ${statusLabels[status]}` 
          : `✓ Participant marked as ${statusLabels[status]}`
      );
      fetchRegistrations();
      if (selectedReg?.id === id) {
        setSelectedReg(prev => ({ ...prev, status }));
      }
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? '✗ Impossible de modifier le statut. Veuillez réessayer.' 
          : '✗ Failed to update status. Please try again.'
      );
    }
  };

  const handleCatalogToggle = async (id, showInCatalog) => {
    try {
      await axios.patch(`${API}/registrations/${id}/catalog`, { show_in_catalog: showInCatalog });
      toast.success(language === 'fr' 
        ? (showInCatalog ? '✓ Profil ajouté au catalogue public' : '✓ Profil retiré du catalogue')
        : (showInCatalog ? '✓ Profile added to public catalog' : '✓ Profile removed from catalog')
      );
      fetchRegistrations();
      if (selectedReg?.id === id) {
        setSelectedReg(prev => ({ ...prev, show_in_catalog: showInCatalog }));
      }
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? '✗ Impossible de modifier la visibilité catalogue. Veuillez réessayer.' 
          : '✗ Failed to update catalog visibility. Please try again.'
      );
    }
  };

  const handleDelete = async (id) => {
    if (deletingId) return;
    if (!window.confirm(language === 'fr' ? 'Supprimer cette inscription ?' : 'Delete this registration?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API}/registrations/${id}`);
      toast.success(language === 'fr' ? '✓ Inscription supprimée avec succès' : '✓ Registration deleted successfully');
      setSelectedReg(null);
      fetchRegistrations();
    } catch (error) {
      toast.error(
        language === 'fr'
          ? '✗ Impossible de supprimer l\'inscription. Veuillez réessayer.'
          : '✗ Failed to delete registration. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/registrations/manual`, newParticipant);
      toast.success(
        language === 'fr' 
          ? `✓ ${newParticipant.full_name} ajouté avec succès` 
          : `✓ ${newParticipant.full_name} added successfully`
      );
      setShowAddModal(false);
      setNewParticipant({
        full_name: '',
        organization_name: '',
        country: 'SN',
        email: '',
        phone: '',
        profile_type: 'artist',
        tier: 'professional',
        status: 'approved',
        show_in_catalog: true,
        bio: ''
      });
      fetchRegistrations();
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? `✗ Impossible d'ajouter le participant. ${error.response?.data?.detail || 'Veuillez réessayer.'}` 
          : `✗ Failed to add participant. ${error.response?.data?.detail || 'Please try again.'}`
      );
    }
  };
  
  const getProfileLabel = (type) => {
    const labels = {
      artist: language === 'fr' ? 'Artiste' : 'Artist',
      label: 'Label',
      booking_agency: language === 'fr' ? 'Booking' : 'Booking',
      institution: 'Institution',
      press: language === 'fr' ? 'Presse' : 'Press',
      other: language === 'fr' ? 'Autre' : 'Other'
    };
    return labels[type] || type;
  };
  
  const handleExportCSV = async () => {
    try {
      toast.loading(language === 'fr' ? 'Génération de l\'export CSV...' : 'Generating CSV export...', { id: 'export' });
      const response = await axios.get(`${API}/registrations/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registrations_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(
        language === 'fr' 
          ? '✓ Export CSV téléchargé avec succès' 
          : '✓ CSV export downloaded successfully', 
        { id: 'export' }
      );
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? '✗ Échec de l\'export. Veuillez réessayer.' 
          : '✗ Export failed. Please try again.', 
        { id: 'export' }
      );
    }
  };

  // Batch selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRegs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRegs.map(r => r.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Batch approve handler
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error(language === 'fr' ? '⚠ Veuillez sélectionner au moins un participant' : '⚠ Please select at least one participant');
      return;
    }
    
    if (!window.confirm(t('confirmBatchApprove') || `${language === 'fr' ? 'Approuver' : 'Approve'} ${selectedIds.length} ${language === 'fr' ? 'participants ?' : 'participants?'}`)) return;
    
    setIsBatchProcessing(true);
    toast.loading(
      language === 'fr' 
        ? `Approbation de ${selectedIds.length} participant(s)...` 
        : `Approving ${selectedIds.length} participant(s)...`, 
      { id: 'batch-approve' }
    );
    try {
      const response = await axios.post(`${API}/registrations/batch/approve`, {
        registration_ids: selectedIds
      });
      
      toast.success(
        language === 'fr' 
          ? `✓ ${response.data.approved_count} participant(s) approuvé(s) avec succès` 
          : `✓ ${response.data.approved_count} participant(s) approved successfully`, 
        { id: 'batch-approve' }
      );
      setSelectedIds([]);
      fetchRegistrations();
      fetchStats();
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? `✗ Échec de l'approbation. ${error.response?.data?.detail || 'Veuillez réessayer.'}` 
          : `✗ Approval failed. ${error.response?.data?.detail || 'Please try again.'}`, 
        { id: 'batch-approve' }
      );
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch send badges handler with progress tracking
  const handleBatchSendBadges = async (sendToAll = false) => {
    const idsToSend = sendToAll ? [] : selectedIds;
    
    if (!sendToAll && idsToSend.length === 0) {
      toast.error(language === 'fr' ? '⚠ Veuillez sélectionner au moins un participant' : '⚠ Please select at least one participant');
      return;
    }
    
    const confirmMsg = sendToAll 
      ? (language === 'fr' ? 'Envoyer les badges à TOUS les participants approuvés ?' : 'Send badges to ALL approved participants?')
      : `${language === 'fr' ? 'Envoyer les badges à' : 'Send badges to'} ${idsToSend.length} ${language === 'fr' ? 'participant(s) ?' : 'participant(s)?'}`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setIsBatchProcessing(true);
    setBatchProgress({ status: 'starting', processed: 0, total: 0, sent: 0, failed: 0 });
    
    try {
      const response = await axios.post(`${API}/registrations/batch/send-badges`, {
        registration_ids: idsToSend
      });
      
      const jobId = response.data.job_id;
      const total = response.data.total;
      
      setBatchProgress({ status: 'running', processed: 0, total, sent: 0, failed: 0, jobId });
      
      // Poll for progress
      const pollProgress = async () => {
        try {
          const progressRes = await axios.get(`${API}/registrations/batch/progress/${jobId}`);
          const progress = progressRes.data;
          
          setBatchProgress({
            status: progress.status,
            processed: progress.processed,
            total: progress.total,
            sent: progress.sent,
            failed: progress.failed,
            percent: progress.progress_percent,
            jobId
          });
          
          if (progress.status !== 'completed') {
            setTimeout(pollProgress, 1000);
          } else {
            const failedMsg = progress.failed > 0 
              ? (language === 'fr' ? ` (${progress.failed} échec(s))` : ` (${progress.failed} failed)`) 
              : '';
            toast.success(
              language === 'fr' 
                ? `✓ ${progress.sent} badge(s) envoyé(s) avec succès${failedMsg}` 
                : `✓ ${progress.sent} badge(s) sent successfully${failedMsg}`
            );
            setSelectedIds([]);
            setIsBatchProcessing(false);
            fetchEmailLogs();
            // Keep progress visible for a moment
            setTimeout(() => setBatchProgress(null), 5000);
          }
        } catch (e) {
          console.error('Progress poll error:', e);
          toast.error(
            language === 'fr' 
              ? '✗ Erreur lors du suivi de la progression' 
              : '✗ Error tracking progress'
          );
          setIsBatchProcessing(false);
          setBatchProgress(null);
        }
      };
      
      setTimeout(pollProgress, 500);
      
    } catch (error) {
      toast.error(
        language === 'fr' 
          ? `✗ Échec de l'envoi des badges. ${error.response?.data?.detail || 'Veuillez réessayer.'}` 
          : `✗ Failed to send badges. ${error.response?.data?.detail || 'Please try again.'}`
      );
      setIsBatchProcessing(false);
      setBatchProgress(null);
    }
  };

  // Fetch email logs
  const fetchEmailLogs = async () => {
    try {
      const response = await axios.get(`${API}/email-logs?limit=50`);
      setEmailLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  // Fetch advanced stats
  const fetchAdvancedStats = async () => {
    try {
      const response = await axios.get(`${API_V1}/stats/advanced`);
      setAdvancedStats(response.data);
    } catch (error) {
      console.error('Error fetching advanced stats:', error);
    }
  };

  useEffect(() => {
    if (showEmailLogs && emailLogs.length === 0) {
      fetchEmailLogs();
    }
  }, [showEmailLogs]);

  useEffect(() => {
    if (showInsights) {
      fetchAdvancedStats();
    }
  }, [showInsights]);
  
  const getCountryLabel = (code) => {
    const c = countryList.find(x => x.value === code);
    return c ? (t(`countries.${c.labelKey}`) !== `countries.${c.labelKey}` ? t(`countries.${c.labelKey}`) : code) : code;
  };
  
  const filteredRegs = registrations.filter(r => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return r.full_name?.toLowerCase().includes(s) || r.organization_name?.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s);
  });
  
  const StatusBadge = ({ status }) => {
    const config = {
      pending: { label: language === 'fr' ? 'En attente' : 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      approved: { label: language === 'fr' ? 'Approuvé' : 'Approved', bg: 'bg-sage/10', text: 'text-sage', border: 'border-sage/30' },
      rejected: { label: language === 'fr' ? 'Refusé' : 'Rejected', bg: 'bg-terracotta/10', text: 'text-terracotta', border: 'border-terracotta/30' }
    };
    const c = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'pending' ? 'bg-amber-500' : status === 'approved' ? 'bg-sage' : 'bg-terracotta'}`} />
        {c.label}
      </span>
    );
  };
  
  if (!isAuthenticated) {
    return <AdminLogin onLogin={(role, redirectPath) => {
      if (role === 'admin') {
        setIsAuthenticated(true);
      } else if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    }} />;
  }
  
  return (
    <div className="min-h-screen bg-paper pt-20 pb-20 sm:pb-0">
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Main Content */}
        <div className={`flex-1 flex flex-col overflow-hidden ${selectedReg ? 'lg:mr-[420px]' : ''}`}>
          {/* Header */}
          <div className="border-b border-lightborder bg-cream px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-serif text-xl sm:text-2xl text-charcoal">
                  {language === 'fr' ? 'Gestion des accréditations' : 'Accreditation Management'}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal/50 mt-1">Culture Connect 2026</p>
              </div>
              {/* Boutons principaux - affichés en grille sur mobile */}
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  onClick={() => navigate('/smart-engine')} 
                  className="h-9 sm:h-10 bg-terracotta text-paper font-syne text-xs sm:text-sm rounded-none" 
                  data-testid="smart-engine-button"
                >
                  <Sparkles className="w-4 h-4 sm:mr-2" /> 
                  <span className="hidden sm:inline">Smart Engine</span>
                </Button>
                <Button 
                  onClick={() => navigate('/admin/accreditation')} 
                  className="h-9 sm:h-10 bg-[#8B1A4A] text-paper font-syne text-xs sm:text-sm rounded-none" 
                  data-testid="accreditation-button"
                >
                  <QrCode className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Accréditation</span>
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="h-9 sm:h-10 bg-sage text-paper font-syne text-xs sm:text-sm rounded-none" data-testid="add-participant-button">
                  <Plus className="w-4 h-4 sm:mr-2" /> 
                  <span className="hidden sm:inline">{language === 'fr' ? 'Ajouter' : 'Add'}</span>
                </Button>
                <Button 
                  onClick={() => navigate('/admin/cms')} 
                  variant="outline"
                  className="h-9 sm:h-10 border-gold text-gold hover:bg-gold/10 font-syne text-xs sm:text-sm rounded-none hidden sm:flex" 
                  data-testid="cms-button"
                >
                  <Settings className="w-4 h-4 mr-2" /> CMS
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard-cc2026')} 
                  className="h-9 sm:h-10 bg-[#0D0B08] text-[#C9933A] border border-[#C9933A] hover:bg-[#C9933A]/10 font-syne text-xs sm:text-sm rounded-none" 
                  data-testid="dashboard-cc2026-button"
                >
                  <Calendar className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">CC2026</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('jetons')} 
                  className="h-9 sm:h-10 bg-[#C9A84C] text-[#1A1510] hover:bg-[#C9A84C]/90 font-syne text-xs sm:text-sm rounded-none" 
                  data-testid="analytics-jetons-button"
                >
                  <Coins className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Jetons</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('trafic')} 
                  className="h-9 sm:h-10 bg-[#A65D47] text-white hover:bg-[#A65D47]/90 font-syne text-xs sm:text-sm rounded-none" 
                  data-testid="analytics-site-button"
                >
                  <BarChart3 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Trafic</span>
                </Button>
                <Button onClick={fetchRegistrations} variant="outline" className="h-9 sm:h-10 border-lightborder text-charcoal/70 hover:text-charcoal rounded-none">
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={handleExportCSV} className="h-9 sm:h-10 bg-charcoal text-paper font-syne text-xs sm:text-sm rounded-none hidden sm:flex" data-testid="export-csv-button">
                  <Download className="w-4 h-4 mr-2" /> CSV
                </Button>
                <AdminNotifications />
                <Button onClick={async () => { 
                  setIsAuthenticated(false); 
                  sessionStorage.removeItem('workspace_user');
                  sessionStorage.removeItem('cc2026_session');
                  try { await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { /* silent */ }
                  navigate('/admin'); 
                }} variant="outline" className="h-9 sm:h-10 border-lightborder text-charcoal/50 rounded-none" data-testid="logout-button">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="border-b border-lightborder bg-paper px-6 py-4">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-lightborder flex items-center justify-center">
                  <Users className="w-4 h-4 text-charcoal/60" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-charcoal">{counts.total || '--'}</p>
                  <p className="text-xs text-charcoal/50">Total</p>
                </div>
              </div>
              <div className="h-8 w-px bg-lightborder" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-charcoal/70">{counts.by_status?.pending || 0} {language === 'fr' ? 'en attente' : 'pending'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-sage" />
                <span className="text-sm text-charcoal/70">{counts.by_status?.approved || 0} {language === 'fr' ? 'approuvés' : 'approved'}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-terracotta" />
                <span className="text-sm text-charcoal/70">{counts.by_status?.rejected || 0} {language === 'fr' ? 'refusés' : 'rejected'}</span>
              </div>
              <div className="h-8 w-px bg-lightborder" />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sage" />
                <span className="text-sm text-charcoal/70">{counts.in_catalog || 0} {language === 'fr' ? 'au catalogue' : 'in catalog'}</span>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b border-lightborder bg-paper px-6">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('registrations')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'registrations'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-registrations"
              >
                <Users className="w-4 h-4 inline mr-2" />
                {language === 'fr' ? 'Participants' : 'Registrations'}
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'partners'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-partners"
              >
                <Handshake className="w-4 h-4 inline mr-2" />
                {language === 'fr' ? 'Partenaires' : 'Partners'}
              </button>
              <button
                onClick={() => setActiveTab('smart-engine')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'smart-engine'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-smart-engine"
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Smart Engine
              </button>
              <button
                onClick={() => setActiveTab('ai-agents')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'ai-agents'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-ai-agents"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Agents IA
              </button>
              <button
                onClick={() => setActiveTab('jetons')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'jetons'
                    ? 'border-[#C9A84C] text-[#C9A84C]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-jetons"
              >
                <Coins className="w-4 h-4 inline mr-2" />
                Jetons
              </button>
              <button
                onClick={() => setActiveTab('trafic')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'trafic'
                    ? 'border-[#A65D47] text-[#A65D47]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-trafic"
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Trafic
              </button>
              <button
                onClick={() => setActiveTab('candidatures')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'candidatures'
                    ? 'border-[#4A3AB7] text-[#4A3AB7]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-candidatures"
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Candidatures
              </button>
              <button
                onClick={() => setActiveTab('ghost')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'ghost'
                    ? 'border-[#8B5CF6] text-[#8B5CF6]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-ghost"
              >
                <Users className="w-4 h-4 inline mr-2" />
                Ghost Pop.
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'team'
                    ? 'border-[#E8D5A0] text-[#E8D5A0]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-team"
              >
                <Users className="w-4 h-4 inline mr-2" />
                Equipe
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'health'
                    ? 'border-[#4ade80] text-[#4ade80]'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-health"
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Sante
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'support'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-support"
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Support
              </button>
              <button
                onClick={() => setActiveTab('gouvernance')}
                className={`px-4 py-3 text-sm font-syne border-b-2 transition-colors ${
                  activeTab === 'gouvernance'
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal'
                }`}
                data-testid="tab-gouvernance"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Gouvernance
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="ml-auto px-4 py-3 text-sm font-syne text-charcoal/50 hover:text-terracotta transition-colors"
                data-testid="filtered-export-btn"
              >
                <FileDown className="w-4 h-4 inline mr-2" />
                {language === 'fr' ? 'Export ciblé' : 'Filtered Export'}
              </button>
            </div>
          </div>
          
          {activeTab === 'partners' ? (
            <div className="flex-1 overflow-auto p-6">
              <PartnerManagement />
            </div>
          ) : activeTab === 'smart-engine' ? (
            <div className="flex-1 overflow-auto">
              <SmartEngineDashboard />
            </div>
          ) : activeTab === 'ai-agents' ? (
            <div className="flex-1 overflow-auto">
              <AIAgentsDashboard />
            </div>
          ) : activeTab === 'jetons' ? (
            <div className="flex-1 overflow-auto">
              <JetonsAnalyticsDashboard />
            </div>
          ) : activeTab === 'trafic' ? (
            <div className="flex-1 overflow-auto">
              <SiteAnalyticsDashboard />
            </div>
          ) : activeTab === 'candidatures' ? (
            <div className="flex-1 overflow-auto">
              <CandidaturesAdmin />
            </div>
          ) : activeTab === 'ghost' ? (
            <div className="flex-1 overflow-auto">
              <GhostPopulationAdmin />
            </div>
          ) : activeTab === 'team' ? (
            <div className="flex-1 overflow-auto p-6">
              <AdminTeamPanel />
            </div>
          ) : activeTab === 'health' ? (
            <div className="flex-1 overflow-auto p-6">
              <AdminHealthPanel />
            </div>
          ) : activeTab === 'support' ? (
            <div className="flex-1 overflow-auto">
              <AdminSupportPanel />
            </div>
          ) : activeTab === 'gouvernance' ? (
            <div className="flex-1 overflow-auto">
              <AdminGouvernancePanel />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
          {/* Insights Section */}
          <AdminInsightsPanel
            stats={stats}
            advancedStats={advancedStats}
            showInsights={showInsights}
            setShowInsights={setShowInsights}
            language={language}
            getProfileLabel={getProfileLabel}
            API_V1={API_V1}
          />
          
          {/* Toggle Insights Button (if hidden) */}
          {stats && !showInsights && (
            <div className="border-b border-lightborder bg-paper px-6 py-2">
              <button 
                onClick={() => setShowInsights(true)}
                className="flex items-center gap-2 text-xs text-charcoal/50 hover:text-terracotta transition-colors"
              >
                <BarChart3 className="w-3 h-3" />
                {language === 'fr' ? 'Afficher les insights' : 'Show insights'}
              </button>
            </div>
          )}
          
          {/* Filters */}
          <div className="border-b border-lightborder bg-paper px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <Input placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} aria-label={language === 'fr' ? 'Rechercher une inscription' : 'Search a registration'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-cream border-lightborder rounded-none text-sm" />
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}>
                <SelectTrigger className="w-[130px] h-10 bg-cream border-lightborder rounded-none text-sm">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-paper border-lightborder">
                  <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                  <SelectItem value="pending">{language === 'fr' ? 'En attente' : 'Pending'}</SelectItem>
                  <SelectItem value="approved">{language === 'fr' ? 'Approuvé' : 'Approved'}</SelectItem>
                  <SelectItem value="rejected">{language === 'fr' ? 'Refusé' : 'Rejected'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.profile_type} onValueChange={(v) => setFilters(prev => ({ ...prev, profile_type: v === 'all' ? '' : v }))}>
                <SelectTrigger className="w-[130px] h-10 bg-cream border-lightborder rounded-none text-sm">
                  <SelectValue placeholder="Profil" />
                </SelectTrigger>
                <SelectContent className="bg-paper border-lightborder">
                  <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                  {profileTypes.map(p => <SelectItem key={p.value} value={p.value}>{t(p.labelKey)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Table */}
          <div>
            {/* Batch Progress Bar */}
            {batchProgress && (
              <div className="sticky top-0 z-20 bg-charcoal text-paper px-6 py-4">
                <div className="flex items-center gap-4 mb-2">
                  {batchProgress.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-sage" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  <span className="font-syne text-sm">
                    {batchProgress.status === 'completed' 
                      ? (language === 'fr' ? 'Envoi terminé !' : 'Sending complete!')
                      : (language === 'fr' ? 'Envoi des badges en cours...' : 'Sending badges...')
                    }
                  </span>
                  <span className="ml-auto text-sm">
                    {batchProgress.sent}/{batchProgress.total} {language === 'fr' ? 'envoyé(s)' : 'sent'}
                    {batchProgress.failed > 0 && (
                      <span className="text-terracotta ml-2">
                        ({batchProgress.failed} {language === 'fr' ? 'échec(s)' : 'failed'})
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-paper/20 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sage transition-all duration-300"
                    style={{ width: `${batchProgress.percent || 0}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Batch Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="sticky top-0 z-10 bg-terracotta/10 border-b border-terracotta/30 px-6 py-3 flex items-center gap-4">
                <span className="text-sm text-terracotta font-syne">
                  {selectedIds.length} {t('selected') || 'selected'}
                </span>
                <div className="flex-1" />
                <Button
                  onClick={handleBatchApprove}
                  disabled={isBatchProcessing}
                  className="h-8 bg-sage text-paper text-xs font-syne rounded-none"
                  data-testid="batch-approve-btn"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('approveSelected') || 'Approve selected'}
                </Button>
                <Button
                  onClick={() => handleBatchSendBadges(false)}
                  disabled={isBatchProcessing}
                  className="h-8 bg-terracotta text-paper text-xs font-syne rounded-none"
                  data-testid="batch-send-badges-btn"
                >
                  {isBatchProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                  {t('sendBadgesToSelected') || 'Send badges'}
                </Button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-charcoal/50 hover:text-charcoal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Send to All Approved Button + Email History */}
            {selectedIds.length === 0 && counts.by_status?.approved > 0 && (
              <div className="sticky top-0 z-10 bg-paper border-b border-lightborder px-6 py-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowEmailLogs(true); fetchEmailLogs(); }}
                  className="flex items-center gap-1 text-xs text-charcoal/50 hover:text-terracotta transition-colors"
                  data-testid="email-history-btn"
                >
                  <History className="w-3 h-3" />
                  {language === 'fr' ? 'Historique envois' : 'Send history'}
                </button>
                <Button
                  onClick={() => handleBatchSendBadges(true)}
                  disabled={isBatchProcessing}
                  variant="outline"
                  className="h-8 border-terracotta text-terracotta text-xs font-syne rounded-none hover:bg-terracotta/10"
                  data-testid="send-all-badges-btn"
                >
                  {isBatchProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
                  {t('sendBadgesToAll') || 'Send badges to all approved'} ({counts.by_status?.approved || 0})
                </Button>
              </div>
            )}
            
            <table className="w-full" data-testid="registrations-table">
              <thead className="bg-cream border-b border-lightborder sticky top-0">
                <tr>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-lightborder">
                      {selectedIds.length === filteredRegs.length && filteredRegs.length > 0 
                        ? <CheckSquare className="w-4 h-4 text-terracotta" />
                        : <Square className="w-4 h-4 text-charcoal/40" />
                      }
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Participant</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Organisation</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Profil</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Statut</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Catalogue</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-charcoal/60 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lightborder">
                {filteredRegs.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-charcoal/50">{language === 'fr' ? 'Aucune inscription' : 'No registrations'}</td></tr>
                ) : (
                  filteredRegs.map((reg) => {
                    const Icon = profileIcons[reg.profile_type] || Users;
                    const isSelected = selectedIds.includes(reg.id);
                    return (
                      <tr key={reg.id} className={`hover:bg-cream/50 cursor-pointer transition-colors ${selectedReg?.id === reg.id ? 'bg-cream' : ''} ${isSelected ? 'bg-terracotta/5' : ''}`}
                        onClick={() => setSelectedReg(reg)} data-testid={`registration-row-${reg.id}`}>
                        <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelectOne(reg.id)} className="p-1 hover:bg-lightborder">
                            {isSelected 
                              ? <CheckSquare className="w-4 h-4 text-terracotta" />
                              : <Square className="w-4 h-4 text-charcoal/40" />
                            }
                          </button>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            {reg.image
                              ? <img src={reg.image} alt={`Photo de ${reg.full_name}`} className="w-10 h-10 object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                              : <div className="w-10 h-10 flex-shrink-0 bg-charcoal/10 flex items-center justify-center text-charcoal/40 font-serif text-sm">{(reg.full_name || '?')[0].toUpperCase()}</div>
                            }
                            <div>
                              <p className="font-medium text-charcoal">{reg.full_name}</p>
                              <p className="text-xs text-charcoal/50">{reg.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-sm text-charcoal/70">{reg.organization_name}</td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2 text-sm text-charcoal/70">
                            <Icon className="w-4 h-4 text-charcoal/40" />
                            {getProfileLabel(reg.profile_type)}
                          </div>
                        </td>
                        <td className="py-4 px-3"><StatusBadge status={reg.status} /></td>
                        <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCatalogToggle(reg.id, !reg.show_in_catalog)}
                            className={`p-2 border transition-colors ${reg.show_in_catalog 
                              ? 'border-sage bg-sage/10 text-sage' 
                              : 'border-lightborder text-charcoal/30 hover:border-sage hover:text-sage'}`}
                            title={reg.show_in_catalog ? 'Retirer du catalogue' : 'Ajouter au catalogue'}
                          >
                            {reg.show_in_catalog ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleStatusChange(reg.id, 'approved')}
                              className={`p-2 border transition-colors ${reg.status === 'approved' ? 'border-sage bg-sage/10 text-sage' : 'border-lightborder text-charcoal/40 hover:border-sage hover:text-sage'}`}>
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleStatusChange(reg.id, 'rejected')}
                              className={`p-2 border transition-colors ${reg.status === 'rejected' ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-lightborder text-charcoal/40 hover:border-terracotta hover:text-terracotta'}`}>
                              <XCircle className="w-4 h-4" />
                            </button>
                            {canDeleteRegistrations && (
                              <button onClick={() => handleDelete(reg.id)}
                                disabled={deletingId === reg.id}
                                className="p-2 border border-lightborder text-charcoal/40 hover:border-[#C94040] hover:text-[#C94040] hover:bg-[#C94040]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                data-testid={`delete-btn-${reg.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
            </div>
          )}
        </div>
        
        {/* Detail Panel */}
        <AdminRegistrationDetail
          selectedReg={selectedReg}
          setSelectedReg={setSelectedReg}
          handleStatusChange={handleStatusChange}
          handleCatalogToggle={handleCatalogToggle}
          handleDelete={handleDelete}
          getProfileLabel={getProfileLabel}
          getCountryLabel={getCountryLabel}
          fetchRegistrations={fetchRegistrations}
          language={language}
          API={API}
        />
      </div>

      {/* Modals */}
      <AdminAddParticipantModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newParticipant={newParticipant}
        setNewParticipant={setNewParticipant}
        handleAddParticipant={handleAddParticipant}
        language={language}
        t={t}
      />

      <AdminExportModal
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        exportFilters={exportFilters}
        setExportFilters={setExportFilters}
        language={language}
        t={t}
        API={API}
      />

      <AdminEmailHistoryModal
        showEmailLogs={showEmailLogs}
        setShowEmailLogs={setShowEmailLogs}
        emailLogs={emailLogs}
        language={language}
      />
    </div>
  );
};
