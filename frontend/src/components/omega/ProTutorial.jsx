import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, ChevronLeft, Sparkles, Zap, ShoppingBag, MessageSquare, Layers, Calendar, User } from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    titleFr: "Bienvenue dans ton Espace Pro",
    titleEn: "Welcome to your Pro Space",
    descFr: "Ton espace culturel souverain. Découvre les outils à ta disposition en quelques secondes.",
    descEn: "Your sovereign cultural space. Discover the tools at your disposal in a few seconds.",
    position: "center",
  },
  {
    id: "feed",
    icon: Layers,
    titleFr: "Le Feed",
    titleEn: "The Feed",
    descFr: "Consulte et publie du contenu culturel. Mode Feed classique ou Reels plein écran.",
    descEn: "Browse and publish cultural content. Classic Feed or full-screen Reels mode.",
    position: "center",
    highlight: "feed",
  },
  {
    id: "builder",
    icon: Layers,
    titleFr: "Le Builder",
    titleEn: "The Builder",
    descFr: "Crée du contenu multimédia (photo, vidéo, audio) et publie-le dans le Feed ou le Shop.",
    descEn: "Create multimedia content (photo, video, audio) and publish it to the Feed or Shop.",
    position: "center",
    highlight: "builder",
  },
  {
    id: "wallet",
    icon: Zap,
    titleFr: "Ton Wallet",
    titleEn: "Your Wallet",
    descFr: "Gère tes Kilti-Tokens (KT). Envoie, reçois et soutiens les créateurs avec des Éclairs.",
    descEn: "Manage your Kilti-Tokens (KT). Send, receive, and support creators with Éclairs.",
    position: "center",
    highlight: "wallet",
  },
  {
    id: "shop",
    icon: ShoppingBag,
    titleFr: "Le Shop",
    titleEn: "The Shop",
    descFr: "Achète des packs de jetons ou des produits culturels. Paiement sécurisé par Stripe.",
    descEn: "Buy token packs or cultural products. Secure payment via Stripe.",
    position: "center",
    highlight: "shop",
  },
  {
    id: "brain",
    icon: MessageSquare,
    titleFr: "Laurent.ia",
    titleEn: "Laurent.ia",
    descFr: "Ton assistant IA personnel. Pose-lui n'importe quelle question sur l'événement ou la plateforme.",
    descEn: "Your personal AI assistant. Ask it anything about the event or the platform.",
    position: "center",
    highlight: "brain",
  },
  {
    id: "profile",
    icon: User,
    titleFr: "Ton Profil",
    titleEn: "Your Profile",
    descFr: "Gère ton identité, tes paramètres, ta photo et tes préférences de confidentialité.",
    descEn: "Manage your identity, settings, photo, and privacy preferences.",
    position: "center",
    highlight: "profile",
  },
  {
    id: "ready",
    icon: Sparkles,
    titleFr: "Tu es prêt !",
    titleEn: "You're ready!",
    descFr: "Explore, crée et connecte-toi avec la communauté culturelle. Bon voyage !",
    descEn: "Explore, create, and connect with the cultural community. Enjoy!",
    position: "center",
  },
];

export default function ProTutorial({ userName, onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const current = STEPS[step];
  const Icon = current.icon;
  const total = STEPS.length;

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else complete();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const complete = () => {
    setVisible(false);
    localStorage.setItem("kk_tutorial_done", "1");
    setTimeout(() => onComplete?.(), 300);
  };

  // Skip on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") complete(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
        data-testid="pro-tutorial-overlay"
      >
        {/* Skip button */}
        <button
          onClick={complete}
          className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          data-testid="tutorial-skip-btn"
        >
          <X className="w-3 h-3" /> Passer
        </button>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="max-w-sm w-full mx-4"
        >
          <div
            className="rounded-3xl p-8 text-center"
            style={{
              background: "#1a1a1c",
              border: "1px solid rgba(242,202,80,0.25)",
              boxShadow: "0 0 60px rgba(242,202,80,0.08)",
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{
                background: "rgba(242,202,80,0.1)",
                border: "2px solid rgba(242,202,80,0.3)",
              }}
            >
              <Icon className="w-7 h-7" style={{ color: "#f2ca50" }} />
            </motion.div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 24 : 8,
                    background: i === step ? "#f2ca50" : i < step ? "rgba(242,202,80,0.4)" : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>

            {/* Title */}
            <h2
              className="text-xl font-bold mb-3"
              style={{ fontFamily: "'Noto Serif', serif", color: "#f2ca50" }}
            >
              {step === 0 && userName ? `${current.titleFr}, ${userName.split(" ")[0]}` : current.titleFr}
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              {current.descFr}
            </p>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={prev}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#999",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  data-testid="tutorial-prev-btn"
                >
                  <ChevronLeft className="w-4 h-4" /> Retour
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={next}
                className="flex-1 py-3.5 rounded-2xl font-bold tracking-wider text-sm flex items-center justify-center gap-2"
                style={{ background: "#f2ca50", color: "#0a0a0b" }}
                data-testid="tutorial-next-btn"
              >
                {step === total - 1 ? "C'est parti !" : "Suivant"}
                {step < total - 1 && <ChevronRight className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
