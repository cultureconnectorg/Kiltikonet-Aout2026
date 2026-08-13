import React from 'react';

/**
 * SEO — Composant réutilisable (React 19 native document metadata).
 * React 19 hoiste automatiquement <title>, <meta>, <link> vers <head>.
 * Aucune dépendance externe (react-helmet-async retirée).
 *
 * @param {string} title    Titre <title> (suffixé par "— Kiltikonet")
 * @param {string} description Meta description (~155 chars)
 * @param {string} path     Chemin de la page (canonical + og:url)
 * @param {string} image    Image OG absolue (ratio 1200x630 recommandé)
 * @param {string} type     og:type — "website" | "article" | "event"
 * @param {object} jsonLd   Optionnel : JSON-LD schema.org
 */
const SEO = ({
  title,
  description,
  path = '/',
  image = 'https://kiltikonet.fr/og-image.png',
  type = 'website',
  jsonLd = null,
}) => {
  const BASE = 'https://kiltikonet.fr';
  const fullUrl = `${BASE}${path}`;
  const fullTitle = title
    ? `${title} — Kiltikonet`
    : 'Kiltikonet — Réseau et infrastructure culturelle afro-caribéenne';
  const desc =
    description ||
    'Un réseau et une infrastructure culturelle qui connecte les acteurs, territoires et opportunités des industries culturelles afro-caribéennes et diasporiques.';

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="Kiltikonet" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
};

export default SEO;
