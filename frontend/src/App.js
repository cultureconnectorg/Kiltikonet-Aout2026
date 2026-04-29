import React, { Suspense, lazy, useEffect, useState } from "react";
import "@/App.css";
import "./i18n";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { initTracker } from "./lib/smartTracker";
import { LanguageProvider } from "./context/LanguageContext";
import { SharedDataProvider } from "./contexts/SharedDataContext";
import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { PricingPage } from "./components/PricingPage";
import { PartnershipPage } from "./components/PartnershipPage";
import { PartnerConfirmation } from "./components/PartnerConfirmation";
import { CatalogPage } from "./components/CatalogPage";
import { RegistrationForm } from "./components/RegistrationForm";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { ParticipantProfile } from "./components/ParticipantProfile";
import { Toaster } from "./components/ui/sonner";
// Legal pages
import { MentionsLegales, PolitiqueConfidentialite, CGU, Cookies, CookieBanner } from "./components/legal";
// Smart Engine - NEW Admin Dashboard
import SmartEngineDashboard from "./pages/Admin/SmartEngineDashboard";
// AI Agents Dashboard
import AIAgentsDashboard from "./components/AIAgentsDashboard";
// CMS Admin
import CMSAdmin from "./components/CMSAdmin";
// Visual Editor
import VisualEditor from "./components/VisualEditor";
// Dynamic Pages
import DynamicPage from "./components/DynamicPage";
// Program Page
import ProgramPage from "./components/ProgramPage";
// Concert Page
import ConcertPage from "./components/ConcertPage";
// Intro Sequence
import IntroSequence, { ReturnWelcome } from "./components/IntroSequence";
// Accreditation System
import { AccreditationSystem } from "./components/AccreditationSystem";
import BadgeScan from "./components/BadgeScan";
import ScanApp from "./components/omega/ScanApp";
// CC2026 Badge & Jetons
import BadgeActivation from "./components/BadgeActivation";
import BadgeInscription from "./components/BadgeInscription";
import JetonsPage from "./components/JetonsPage";
import JetonsAnalyticsDashboard from "./components/JetonsAnalyticsDashboard";
import UserDashboard from "./components/UserDashboard";
import AppelPage from "./components/AppelPage";
import AccessibilitePage from "./components/AccessibilitePage";
import FAQPage from "./components/FAQPage";
import SupportPage from "./components/SupportPage";
import GouvernancePage from "./components/GouvernancePage";
import GouvernanceCandidater from "./components/GouvernanceCandidater";
import GouvernanceConfirmation from "./components/GouvernanceConfirmation";
import GouvernanceProfil from "./components/GouvernanceProfil";
import GouvernancePaiement from "./components/GouvernancePaiement";
import GouvernanceRepertoire from "./components/GouvernanceRepertoire";
// Workspaces
import WorkspaceLaurent from "./components/workspaces/WorkspaceLaurent";
import WorkspaceTwina from "./components/workspaces/WorkspaceTwina";
import WorkspaceGwen from "./components/workspaces/WorkspaceGwen";
import WorkspaceKaige from "./components/workspaces/WorkspaceKaige";
import WorkspaceAlirio from "./components/workspaces/WorkspaceAlirio";
import WorkspaceWudy from "./components/workspaces/WorkspaceWudy";
import WorkspaceFabrice from "./components/workspaces/WorkspaceFabrice";
import WorkspaceAnalyst from "./components/workspaces/WorkspaceAnalyst";
import ColeenWorkspace from "./components/workspaces/ColeenWorkspace";
// Protected Route with session expiration
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BACKEND_URL } from "./config/api";
// Dashboard CC2026 Collaboratif
import DashboardCC2026 from "./components/DashboardCC2026";
// Pro Space (LinkedIn Culturel)
import ProSpaceDashboard, { ProSpaceLogin } from "./components/ProSpaceDashboard";
// ProProtectedRoute — affiche ProSpaceLogin inline si non connecté
const ProProtectedRoute = ({ children }) => {
  const [state, setState] = React.useState('checking');
  React.useEffect(() => {
    const checkAuth = async () => {
      // Check pro session
      const proSession = sessionStorage.getItem('cc2026_pro_session');
      if (proSession) { setState('ok'); return; }
      // Check cookie auth
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
        if (res.ok) { const d = await res.json(); if (d.authenticated) { setState('ok'); return; } }
      } catch {}
      setState('denied');
    };
    checkAuth();
  }, []);
  if (state === 'checking') return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b' }} />;
  if (state === 'denied') return <ProSpaceLogin onLogin={() => setState('ok')} />;
  return children;
};
// Auth Pages
import MagicLinkPage from "./components/MagicLinkPage";
import InvitePage from "./components/InvitePage";
// PWA Components
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import MobileBottomNav from "./components/MobileBottomNav";
// Admin Mobile Dashboard
import AdminMobileDashboard from "./components/AdminMobileDashboard";
// Performance Dashboard
import PerformanceDashboard from "./components/admin/PerformanceDashboard";
// Admin Finance Dashboard
import AdminFinanceDashboard from "./components/admin/AdminFinanceDashboard";
// Omega Espace Pro (ITER.57)
import ProApp from "./components/omega/ProApp";
import { SplashScreen } from "./components/omega/SplashScreen";
// Standalone Pro Pages
import MessagesPage from "./components/pro/MessagesPage";
import NetworkStandalonePage from "./components/pro/NetworkPage";
// Device Detection Hook
import useDeviceDetect from "./hooks/useDeviceDetect";
// Analytics
import { useAnalytics } from "./hooks/useAnalytics";
// Site Analytics Dashboard
import SiteAnalyticsDashboard from "./components/SiteAnalyticsDashboard";
// 3D Components - LAZY LOADED to avoid React 19 compatibility issues
const Dashboard3D = lazy(() => import("./components/admin/Dashboard3D"));
const SmartEngine3D = lazy(() => import("./components/admin/SmartEngine3D"));

// 3D Loading fallback
const Loading3D = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C1A14' }}>
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#D4A84B transparent' }} />
      <div style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement 3D...</div>
    </div>
  </div>
);

// Pro Splash Wrapper — plays splash FIRST, then checks auth, then shows ProApp
const ProSplashWrapper = () => {
  const [splashDone, setSplashDone] = React.useState(() => {
    return !!sessionStorage.getItem('kk_pro_splash_done');
  });
  const [sessionReady, setSessionReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);

  const handleSplashComplete = () => {
    sessionStorage.setItem('kk_pro_splash_done', '1');
    setSplashDone(true);
  };

  // Check session after splash
  React.useEffect(() => {
    if (!splashDone) return;
    const stored = sessionStorage.getItem('cc2026_pro_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.createdAt && (Date.now() - parsed.createdAt) < 7 * 24 * 60 * 60 * 1000) {
          setHasSession(true);
          setSessionReady(true);
          return;
        }
      } catch {}
    }
    // No valid session
    setHasSession(false);
    setSessionReady(true);
  }, [splashDone]);

  // Phase 1: Splash video
  if (!splashDone) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Phase 2: Checking session (should be instant, but show logo as safety)
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b' }}>
        <img src="/logo-kiltikonet.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.5 }} />
      </div>
    );
  }

  // Phase 3: No session → login inline
  if (!hasSession) {
    return <ProSpaceLogin onLogin={() => window.location.reload()} />;
  }

  // Phase 4: Authenticated → ProApp (Omega)
  return <ProApp />;
};

// Page tracker component - must be inside BrowserRouter
const PageTracker = () => {
  useAnalytics();
  return null;
};

// Dynamic document title per route (WCAG 2.4.2)
const ROUTE_TITLES = {
  '/': 'Accueil — Kilti Konet',
  '/pricing': 'Tarifs — Kilti Konet',
  '/concert': 'Concert — Kilti Konet',
  '/programme': 'Programme — Kilti Konet',
  '/catalogue': 'Catalogue — Kilti Konet',
  '/jetons': 'Jetons CC — Kilti Konet',
  '/appel-2026': 'Appel à projet CC2026 — Kilti Konet',
  '/partnership': 'Partenariat — Kilti Konet',
  '/badge-inscription': 'Inscription Badge — Kilti Konet',
  '/admin': 'Administration — Kilti Konet',
  '/smart-engine': 'Smart Engine — Kilti Konet',
  '/espace-pro': 'Espace Pro — Kilti Konet',
  '/accessibilite': 'Accessibilité — Kilti Konet',
  '/mentions-legales': 'Mentions légales — Kilti Konet',
  '/politique-confidentialite': 'Politique de confidentialité — Kilti Konet',
  '/cgu': 'CGU — Kilti Konet',
  '/cookies': 'Cookies — Kilti Konet',
};
const DocumentTitle = () => {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const matchedKey = Object.keys(ROUTE_TITLES).find(k => path === k || (k !== '/' && path.startsWith(k)));
    document.title = matchedKey ? ROUTE_TITLES[matchedKey] : 'Kilti Konet — Culture Connect 2026';
  }, [location.pathname]);
  return null;
};

// Layout wrapper that conditionally shows Header and Mobile Nav
const AppLayout = ({ children }) => {
  const location = useLocation();
  
  // Routes where header should be hidden
  const hideHeaderRoutes = ['/smart-engine', '/admin', '/badge', '/workspace', '/dashboard-cc2026', '/espace-pro', '/pro'];
  const showHeader = !hideHeaderRoutes.some(route => location.pathname.startsWith(route));
  
  return (
    <>
      <PageTracker />
      <DocumentTitle />
      {showHeader && <Header />}
      <div className="pb-16 md:pb-0"> {/* Add padding for mobile nav on mobile only */}
        {children}
      </div>
      <MobileBottomNav />
      <PWAInstallPrompt />
      <CookieBanner />
    </>
  );
};

// Intro wrapper that checks URL — ONLY shows on root path "/"
const IntroWrapper = () => {
  const location = window.location.pathname;
  const [showIntro, setShowIntro] = React.useState(() => {
    // Only show intro on the ROOT path "/"
    if (location !== '/') return false;
    // Skip intro if visual editor mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ve') === '1' || urlParams.get('skip_intro') === '1') {
      return false;
    }
    // Only show intro on first visit
    return typeof window !== 'undefined' && !localStorage.getItem('kk_visited');
  });

  if (!showIntro) return null;
  
  return <IntroSequence onComplete={() => setShowIntro(false)} />;
};

function App() {
  // Initialize analytics tracker
  useEffect(() => { initTracker(); }, []);

  return (
    <LanguageProvider>
      <SharedDataProvider>
      <div className="App">
        {/* Intro Sequence - only on first visit, not on admin pages */}
        <IntroWrapper />
        
        <BrowserRouter>
          {/* Return welcome message for returning visitors */}
          <ReturnWelcome />
          
          <Routes>
            {/* Omega Espace Pro — HORS AppLayout (fullscreen immersif) */}
            <Route path="/pro" element={<ProSplashWrapper />} />

            {/* PWA NFC Scan — Agent Terrain (fullscreen, HORS AppLayout) */}
            <Route path="/scan" element={<ScanApp />} />

            {/* Toutes les routes vitrine — DANS AppLayout */}
            <Route path="/*" element={
              <AppLayout>
                <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/partnership" element={<PartnershipPage />} />
              <Route path="/partenaires" element={<PartnershipPage />} />
              <Route path="/partenaire/confirmation" element={<PartnerConfirmation />} />
              <Route path="/catalogue" element={<CatalogPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/tarifs" element={<PricingPage />} />
              <Route path="/register" element={<PricingPage />} />
              <Route path="/inscription" element={<PricingPage />} />
              <Route path="/programme" element={<ProgramPage />} />
              <Route path="/appel-2026" element={<AppelPage />} />
              <Route path="/accessibilite" element={<AccessibilitePage />} />
              <Route path="/concert" element={<ConcertPage />} />
              <Route path="/confirmation" element={<ConfirmationScreen />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard-3d" element={<ProtectedRoute allowedRoles={['admin']}><Suspense fallback={<Loading3D />}><Dashboard3D /></Suspense></ProtectedRoute>} />
              <Route path="/admin/cms" element={<ProtectedRoute allowedRoles={['admin']}><CMSAdmin /></ProtectedRoute>} />
              <Route path="/admin/cms/visual-editor" element={<ProtectedRoute allowedRoles={['admin']}><VisualEditor /></ProtectedRoute>} />
              <Route path="/admin/accreditation" element={<ProtectedRoute allowedRoles={['admin']}><AccreditationSystem /></ProtectedRoute>} />
              {/* Performance Dashboard */}
              <Route path="/admin/performance" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><PerformanceDashboard /></ProtectedRoute>} />
              {/* Admin Finance Dashboard */}
              <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={['admin', 'founder', 'finance']}><AdminFinanceDashboard /></ProtectedRoute>} />
              {/* Admin Mobile Dashboard */}
              <Route path="/admin/mobile" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><AdminMobileDashboard /></ProtectedRoute>} />
              <Route path="/admin/terrain" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><AdminMobileDashboard /></ProtectedRoute>} />
              <Route path="/badge/:id" element={<BadgeScan />} />
              <Route path="/badge-scan" element={<BadgeScan />} />
              {/* CC2026 Badge & Jetons */}
              <Route path="/activer-badge/:qrToken" element={<BadgeActivation />} />
              <Route path="/badge-inscription" element={<BadgeInscription />} />
              <Route path="/register-pro" element={<RegistrationForm />} />
              <Route path="/jetons" element={<JetonsPage />} />
              <Route path="/mon-espace" element={<UserDashboard />} />
              <Route path="/jetons/confirmation" element={<JetonsPage />} />
              <Route path="/admin/analytics/jetons" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><JetonsAnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/participant/:participantId" element={<ParticipantProfile />} />
              {/* Workspaces - Protected */}
              <Route path="/workspace/laurent" element={<ProtectedRoute allowedRoles={['founder']}><WorkspaceLaurent /></ProtectedRoute>} />
              <Route path="/workspace/twina" element={<ProtectedRoute allowedRoles={['design']}><WorkspaceTwina /></ProtectedRoute>} />
              <Route path="/workspace/gwen" element={<ProtectedRoute allowedRoles={['event']}><WorkspaceGwen /></ProtectedRoute>} />
              <Route path="/workspace/kaige" element={<ProtectedRoute allowedRoles={['press']}><WorkspaceKaige /></ProtectedRoute>} />
              <Route path="/workspace/alirio" element={<ProtectedRoute allowedRoles={['business']}><WorkspaceAlirio /></ProtectedRoute>} />
              <Route path="/workspace/wudy" element={<ProtectedRoute allowedRoles={['finance']}><WorkspaceWudy /></ProtectedRoute>} />
              <Route path="/workspace/fabrice" element={<ProtectedRoute allowedRoles={['captions']}><WorkspaceFabrice /></ProtectedRoute>} />
              <Route path="/workspace/analyst" element={<ProtectedRoute allowedRoles={['analyst']}><WorkspaceAnalyst /></ProtectedRoute>} />
              <Route path="/workspace/coleen" element={<ProtectedRoute allowedRoles={['partnerships']}><ColeenWorkspace /></ProtectedRoute>} />
              {/* Dashboard CC2026 Collaboratif */}
              <Route path="/dashboard-cc2026" element={<ProtectedRoute allowedRoles={['admin', 'design']}><DashboardCC2026 workspaceId="CC2026admin" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/laurent" element={<ProtectedRoute allowedRoles={['founder']}><DashboardCC2026 workspaceId="LC2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/twina" element={<ProtectedRoute allowedRoles={['design']}><DashboardCC2026 workspaceId="Twina2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/gwen" element={<ProtectedRoute allowedRoles={['event']}><DashboardCC2026 workspaceId="Gwen2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/fabrice" element={<ProtectedRoute allowedRoles={['captions']}><DashboardCC2026 workspaceId="Fabrice2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/kaige" element={<ProtectedRoute allowedRoles={['press']}><DashboardCC2026 workspaceId="Kaige2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/alirio" element={<ProtectedRoute allowedRoles={['business']}><DashboardCC2026 workspaceId="Alirio2026" /></ProtectedRoute>} />
              <Route path="/dashboard-cc2026/wudy" element={<ProtectedRoute allowedRoles={['finance']}><DashboardCC2026 workspaceId="Wudy2026" /></ProtectedRoute>} />
              {/* Site Analytics */}
              <Route path="/admin/analytics/site" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><SiteAnalyticsDashboard /></ProtectedRoute>} />
              {/* Smart Engine - 3D version */}
              <Route path="/smart-engine" element={<SmartEngineDashboard />} />
              <Route path="/smart-engine-3d" element={<Suspense fallback={<Loading3D />}><SmartEngine3D /></Suspense>} />
              {/* AI Agents Dashboard */}
              <Route path="/admin/ai-agents" element={<AIAgentsDashboard />} />
              {/* Login gate pour /pro (Omega) */}
              <Route path="/espace-pro/connexion" element={<ProSpaceLogin />} />
              {/* Ancien Espace Pro — SUPER_ADMIN only sur /admin/core */}
              <Route path="/admin/core" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><ProSpaceDashboard /></ProtectedRoute>} />
              <Route path="/admin/core/messages" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><MessagesPage /></ProtectedRoute>} />
              <Route path="/admin/core/reseau" element={<ProtectedRoute allowedRoles={['admin', 'founder']}><NetworkStandalonePage /></ProtectedRoute>} />
              {/* Auth routes */}
              <Route path="/auth/magic/:token" element={<MagicLinkPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              {/* Legal pages */}
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/cgu" element={<CGU />} />
              <Route path="/cookies" element={<Cookies />} />
              {/* FAQ & Support */}
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/aide" element={<FAQPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/contact" element={<SupportPage />} />
              {/* Gouvernance */}
              <Route path="/gouvernance" element={<GouvernancePage />} />
              <Route path="/gouvernance/candidater" element={<GouvernanceCandidater />} />
              <Route path="/gouvernance/confirmation" element={<GouvernanceConfirmation />} />
              <Route path="/gouvernance/profil" element={<GouvernanceProfil />} />
              <Route path="/gouvernance/paiement/:numMembre" element={<GouvernancePaiement />} />
              <Route path="/gouvernance/repertoire/:numMembre" element={<GouvernanceRepertoire />} />
              {/* Dynamic CMS Pages */}
              <Route path="/p/:slug" element={<DynamicPage />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#141311',
              border: '1px solid #2A2825',
              color: '#EDE8DC',
            },
          }}
        />
      </div>
      </SharedDataProvider>
    </LanguageProvider>
  );
}

export default App;
