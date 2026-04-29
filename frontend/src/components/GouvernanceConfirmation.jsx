import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

const GouvernanceConfirmation = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4" data-testid="gouvernance-confirmation">
      <div className="max-w-md w-full text-center border border-sage/30 bg-sage/5 p-10">
        <CheckCircle className="w-14 h-14 text-sage mx-auto mb-6" />
        <h2 className="font-serif text-2xl text-charcoal mb-3">Dossier reçu</h2>
        <p className="text-sm text-charcoal/60 leading-relaxed mb-6">
          Votre dossier a été reçu. Le Conseil d'Administration examinera votre candidature lors de sa prochaine réunion. Vous recevrez une réponse par email.
        </p>
        {state?.id && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal/5 border border-lightborder mb-6">
            <span className="text-xs text-charcoal/50">Référence :</span>
            <span className="text-sm font-mono font-bold text-charcoal">{state.id}</span>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/')} className="h-11 bg-charcoal text-paper rounded-none font-syne">Retour à l'accueil</Button>
          <Button onClick={() => navigate('/gouvernance')} variant="outline" className="h-11 border-lightborder rounded-none font-syne">Gouvernance</Button>
        </div>
      </div>
    </div>
  );
};

export default GouvernanceConfirmation;
