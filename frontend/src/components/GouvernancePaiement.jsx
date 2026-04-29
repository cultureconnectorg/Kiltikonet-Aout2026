import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const GouvernancePaiement = () => {
  const navigate = useNavigate();
  const { numMembre } = useParams();
  const [membre, setMembre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/gouvernance/paiement/${numMembre}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setMembre(data);
        } else {
          const d = await res.json().catch(() => ({}));
          setError(d.detail || 'Erreur');
        }
      } catch { setError('Erreur de connexion'); }
      finally { setLoading(false); }
    };
    load();
  }, [numMembre]);

  const handlePay = async () => {
    setPaying(true);
    try {
      // Confirm payment
      const res = await fetch(`${API}/api/gouvernance/paiement/${numMembre}/confirm`, { method: 'POST' });
      if (res.ok) {
        setPaid(true);
        toast.success('Paiement confirmé !');
      } else {
        toast.error('Erreur de confirmation');
      }
    } catch { toast.error('Erreur'); }
    finally { setPaying(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-terracotta mb-4">{error}</p>
          <Button onClick={() => navigate('/gouvernance/profil')} className="h-10 bg-charcoal text-paper rounded-none font-syne">
            Retour au profil
          </Button>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4" data-testid="paiement-success">
        <div className="max-w-md w-full text-center border border-sage/30 bg-sage/5 p-10">
          <CheckCircle className="w-14 h-14 text-sage mx-auto mb-6" />
          <h2 className="font-serif text-2xl text-charcoal mb-3">Bienvenue, membre {numMembre}</h2>
          <p className="text-sm text-charcoal/60 leading-relaxed mb-6">
            Votre cotisation a été confirmée. Vous pouvez maintenant déclarer votre répertoire culturel pour finaliser votre adhésion.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate(`/gouvernance/repertoire/${numMembre}`)}
              className="h-11 bg-sage text-paper rounded-none font-syne">Déclarer mon répertoire</Button>
            <Button onClick={() => navigate('/gouvernance/profil')} variant="outline"
              className="h-11 border-lightborder rounded-none font-syne">Voir mon profil</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper" data-testid="gouvernance-paiement">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-lightborder">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/gouvernance/profil')} className="flex items-center gap-2 text-charcoal/60 hover:text-terracotta transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Mon profil</span>
          </button>
          <span className="text-xs text-charcoal/40 font-syne uppercase tracking-wider">Cotisation</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <CreditCard className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-charcoal mb-2">Cotisation d'entrée</h2>
          <p className="text-sm text-charcoal/60">Membre {numMembre}</p>
        </div>

        <div className="border border-lightborder p-8 text-center mb-8">
          <p className="font-serif text-5xl text-charcoal mb-2">{membre?.amount ? (membre.amount / 100) : '—'} €</p>
          <p className="text-sm text-charcoal/50">
            Cotisation d'entrée — {membre?.amount === 15000 ? 'Membre Actif' : 'Membre Associé'}
          </p>
        </div>

        <div className="bg-cream border border-lightborder p-4 text-xs text-charcoal/60 leading-relaxed mb-8">
          Cette cotisation constitue votre apport au capital social de l'association. Elle est remboursable en cas de démission dans les 30 jours suivant l'adhésion pour les Membres Associés.
        </div>

        <Button onClick={handlePay} disabled={paying}
          className="w-full h-14 bg-terracotta text-paper rounded-none font-syne text-base" data-testid="pay-btn">
          {paying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
          Payer {membre?.amount ? (membre.amount / 100) : ''} €
        </Button>

        <p className="text-xs text-charcoal/30 text-center mt-4">Paiement sécurisé par Stripe</p>
      </div>
    </div>
  );
};

export default GouvernancePaiement;
