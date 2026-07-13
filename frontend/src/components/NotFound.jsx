import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Page 404 — pour URLs inconnues côté SPA.
 * Ajoute une meta prerender-status-code=404 pour signaler aux crawlers
 * et prerender que cette page doit être traitée comme 404 en SEO.
 */
const NotFound = () => {
  useEffect(() => {
    // Meta tag SEO 404
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    // Titre onglet
    const prevTitle = document.title;
    document.title = '404 · Page introuvable — Kilti Konet';
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20" data-testid="not-found-page">
      <div className="max-w-md w-full text-center">
        <div className="font-mono text-charcoal/30 tracking-widest text-xs uppercase mb-4">
          Erreur 404
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl text-charcoal mb-4" style={{ letterSpacing: '-0.02em' }}>
          Page introuvable
        </h1>
        <p className="text-sm text-charcoal/60 leading-relaxed mb-10">
          Cette page n&apos;existe pas ou a été déplacée. Vérifie l&apos;URL, ou reviens à l&apos;accueil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal text-paper font-syne text-xs uppercase tracking-widest font-bold hover:bg-terracotta transition-colors"
            data-testid="not-found-home-btn"
          >
            <Home className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-charcoal/30 text-charcoal font-syne text-xs uppercase tracking-widest font-bold hover:border-charcoal transition-colors"
            data-testid="not-found-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
