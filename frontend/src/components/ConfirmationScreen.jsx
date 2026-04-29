import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { ArrowLeft, Download, Check, Loader2, Copy, QrCode, UserCheck, CreditCard, BadgeCheck, Sparkles } from 'lucide-react';
import { profileTypes } from '../lib/translations';
import { BadgeGenerator } from './BadgeGenerator';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const tierInfo = {
  emerging: { name: 'Emergent', nameEn: 'Emerging', price: 50, color: '#4A5D4E' },
  professional: { name: 'Professionnel', nameEn: 'Professional', price: 300, color: '#A65D47' },
  institutional: { name: 'Institutionnel', nameEn: 'Institutional', price: 500, color: '#1A1A1A' }
};

export const ConfirmationScreen = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showBadge, setShowBadge] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const sessionId = searchParams.get('session_id');
  const registration = location.state?.registration;
  
  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else if (!registration) {
      navigate('/');
    }
  }, [sessionId]);
  
  const pollPaymentStatus = async (sid, attempts = 0) => {
    const maxAttempts = 10;
    if (attempts >= maxAttempts) {
      setError(language === 'fr' 
        ? 'Verification du paiement expiree. Verifiez votre email.'
        : 'Payment verification timed out. Please check your email.'
      );
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/checkout/status/${sid}`);
      const data = response.data;
      if (data.payment_status === 'paid') {
        setPaymentData({
          full_name: data.metadata?.full_name || '',
          organization_name: data.metadata?.organization_name || '',
          email: data.metadata?.email || '',
          profile_type: data.metadata?.profile_type || '',
          tier: data.metadata?.tier || 'professional',
          amount: data.amount_total / 100,
          currency: data.currency,
          badge_id: data.metadata?.badge_id || data.metadata?.registration_id || '',
          frek_id: data.metadata?.frek_id || '',
          id: data.metadata?.registration_id || ''
        });
        setIsLoading(false);
        return;
      } else if (data.status === 'expired') {
        setError(language === 'fr' ? 'Session de paiement expiree.' : 'Payment session expired.');
        setIsLoading(false);
        return;
      }
      setTimeout(() => pollPaymentStatus(sid, attempts + 1), 2000);
    } catch (err) {
      setTimeout(() => pollPaymentStatus(sid, attempts + 1), 2000);
    }
  };
  
  const displayData = paymentData || registration;
  
  const copyBadgeId = async () => {
    const text = displayData?.badge_id || displayData?.id || '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true); toast.success('Badge ID copie !');
    } catch { toast.error('Copie impossible'); }
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F0E8' }}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: '#A65D47', opacity: 0.2 }} />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#A65D4710' }}>
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#A65D47' }} />
            </div>
          </div>
          <p className="font-bold text-lg" style={{ color: '#1A1510' }}>
            {language === 'fr' ? 'Verification du paiement...' : 'Verifying payment...'}
          </p>
          <p className="text-sm mt-2" style={{ color: '#6B6560' }}>
            {language === 'fr' ? 'Merci de patienter quelques instants' : 'Please wait a moment'}
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F4F0E8' }}>
        <div className="max-w-md w-full p-8 rounded-xl text-center" style={{ background: '#fff', border: '1px solid #E8E0D0' }}>
          <p className="text-sm mb-6" style={{ color: '#A65D47' }}>{error}</p>
          <Button onClick={() => navigate('/')} style={{ background: '#1A1510', color: '#fff' }}>
            {language === 'fr' ? "Retour a l'accueil" : 'Back to home'}
          </Button>
        </div>
      </div>
    );
  }
  
  if (!displayData) return null;
  
  const profileTypeObj = profileTypes.find(p => p.value === displayData.profile_type);
  const profileLabel = profileTypeObj ? t(profileTypeObj.labelKey) : displayData.profile_type;
  const tierData = tierInfo[displayData.tier] || tierInfo.professional;
  const badgeId = displayData.badge_id || displayData.id || '';
  const frekId = displayData.frek_id || '';
  
  const participantWithTier = { 
    ...displayData, 
    tier: displayData.tier || 'professional',
    image: displayData.logo_url || null
  };
  
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#F4F0E8' }} data-testid="confirmation-screen">
      <div className="max-w-lg mx-auto space-y-5">
        
        {/* ═══ SUCCESS HEADER ═══ */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E0D0' }}>
          <div className="p-8 text-center" style={{ background: tierData.color }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white" data-testid="confirmation-title">
              {language === 'fr' ? 'Bienvenue !' : 'Welcome!'}
            </h1>
            <p className="text-white/70 text-sm mt-2">
              {language === 'fr' ? 'Paiement confirme — Votre accreditation est en cours' : 'Payment confirmed — Your accreditation is being processed'}
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #E8E0D0' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${tierData.color}15`, color: tierData.color }}>
                {(displayData.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color: '#1A1510' }} data-testid="confirmation-name">{displayData.full_name}</p>
                <p className="text-xs" style={{ color: '#6B6560' }} data-testid="confirmation-organization">{displayData.organization_name}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${tierData.color}15`, color: tierData.color }}>
                {language === 'fr' ? tierData.name : tierData.nameEn}
              </span>
            </div>
            
            {/* Payment details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: '#F4F0E8' }}>
                <CreditCard className="w-4 h-4 mb-1" style={{ color: '#4A5D4E' }} />
                <p className="text-xs" style={{ color: '#6B6560' }}>{language === 'fr' ? 'Montant' : 'Amount'}</p>
                <p className="font-bold text-sm" style={{ color: '#1A1510' }}>{tierData.price}EUR</p>
              </div>
              {profileLabel && (
                <div className="p-3 rounded-lg" style={{ background: '#F4F0E8' }}>
                  <UserCheck className="w-4 h-4 mb-1" style={{ color: '#A65D47' }} />
                  <p className="text-xs" style={{ color: '#6B6560' }}>{language === 'fr' ? 'Profil' : 'Profile'}</p>
                  <p className="font-bold text-sm" style={{ color: '#1A1510' }} data-testid="confirmation-profile">{profileLabel}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* ═══ BADGE CARD ═══ */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E0D0' }} data-testid="badge-card">
          <div className="p-4 flex items-center gap-3" style={{ background: '#1A1510' }}>
            <BadgeCheck className="w-5 h-5" style={{ color: '#C9A84C' }} />
            <span className="text-sm font-bold text-white">VOTRE BADGE CC2026</span>
            <Sparkles className="w-4 h-4 ml-auto" style={{ color: '#C9A84C' }} />
          </div>
          
          <div className="p-6 space-y-4">
            {/* Badge ID */}
            {badgeId && (
              <div className="text-center p-4 rounded-xl" style={{ background: '#F4F0E8' }}>
                <p className="text-xs mb-2" style={{ color: '#6B6560' }}>BADGE ID</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold font-mono tracking-wider" style={{ color: '#A65D47' }} data-testid="badge-id">
                    {badgeId.slice(0, 12).toUpperCase()}
                  </p>
                  <button onClick={copyBadgeId} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" data-testid="copy-badge-btn">
                    {copied ? <Check className="w-4 h-4" style={{ color: '#4A5D4E' }} /> : <Copy className="w-4 h-4" style={{ color: '#6B6560' }} />}
                  </button>
                </div>
              </div>
            )}
            
            {/* Identifiant culturel - affiché sans mention technique */}
            {frekId && (
              <div className="text-center p-3 rounded-xl" style={{ background: '#F4F0E8' }}>
                <QrCode className="w-4 h-4 mx-auto mb-1" style={{ color: '#C9A84C' }} />
                <p className="text-xs" style={{ color: '#6B6560' }}>ID: {frekId}</p>
                <p className="text-xs mt-1" style={{ color: '#4A5D4E' }}>Identité culturelle certifiée</p>
              </div>
            )}
            
            {/* Zones d'acces */}
            <div className="p-3 rounded-xl" style={{ background: '#F4F0E8' }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#C9A84C' }}>Zones d'acces</p>
              <div className="flex flex-wrap gap-1.5">
                {['Grand Carbet Aimé Césaire', 'Grand Carbet Aimé Césaire', 'Espace Pro', 'Marche Culturel'].map(z => (
                  <span key={z} className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#fff', border: '1px solid #E8E0D0', color: '#1A1510' }}>
                    {z}
                  </span>
                ))}
              </div>
            </div>
            
            <p className="text-center text-xs" style={{ color: '#6B6560' }}>
              Un email de confirmation sera envoye a <span style={{ color: '#A65D47' }}>{displayData.email}</span>
            </p>
          </div>
        </div>
        
        {/* ═══ ACTIONS ═══ */}
        <div className="space-y-3">
          <Button
            onClick={() => setShowBadge(true)}
            className="w-full h-12 text-white font-bold rounded-xl"
            style={{ background: '#1A1510' }}
            data-testid="preview-badge-button"
          >
            <Download className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Telecharger mon badge' : 'Download my badge'}
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate('/mon-espace')}
              className="h-11 font-medium rounded-xl"
              style={{ background: '#A65D47', color: '#fff' }}
              data-testid="goto-espace-btn"
            >
              Mon Espace
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="h-11 font-medium rounded-xl"
              style={{ borderColor: '#E8E0D0', color: '#6B6560' }}
              data-testid="back-to-home-button"
            >
              Accueil
            </Button>
          </div>
        </div>
        
        <p className="text-center text-xs" style={{ color: '#6B656060' }}>
          Culture Connect 2026 — 20-23 Mai — Fort-de-France
        </p>
      </div>

      {showBadge && (
        <BadgeGenerator participant={participantWithTier} onClose={() => setShowBadge(false)} />
      )}
    </div>
  );
};
