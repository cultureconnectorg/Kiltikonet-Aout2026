// Display metadata only; this module does not assign product or service ownership.
export const ROUTE_TITLES = Object.freeze({
  '/': 'Kiltikonet — Réseau et infrastructure culturelle afro-caribéenne',
  '/a-propos': 'À propos — Kiltikonet',
  '/about': 'À propos — Kiltikonet',
  '/culture-connect': 'Culture Connect — Kiltikonet',
  '/culture-connect/2026': 'Culture Connect 2026 — Bilan — Kiltikonet',
  '/culture-connect/2027': 'Culture Connect 2027 — À venir — Kiltikonet',
  '/culture-connect/programme': 'Programme — Culture Connect',
  '/culture-connect/concert': 'Concert — Culture Connect',
  '/culture-connect/inscription': 'Inscription — Culture Connect',
  '/culture-connect/catalogue': 'Catalogue — Culture Connect',
  '/infrastructure': 'Infrastructure culturelle — Kiltikonet',
  '/rejoindre': 'Rejoindre — Kiltikonet',
  '/reseau': 'Rejoindre — Kiltikonet',
  '/contact': 'Contact — Kiltikonet',
  '/legacy-cc2026': 'Culture Connect 2026 — Édition historique — Kiltikonet',
  '/observatory': 'Observatory · Kiltikonet',
  '/observatory/founder': 'Observatory — Espace fondateur — Kiltikonet',
  '/now': 'Maintenant — Kiltikonet',
  '/maintenant': 'Maintenant — Kiltikonet',
  '/pricing': 'Tarifs — Kiltikonet',
  '/tarifs': 'Tarifs — Kiltikonet',
  '/register': 'Inscription — Kiltikonet',
  '/inscription': 'Inscription — Kiltikonet',
  '/programme': 'Programme — Kiltikonet',
  '/concert': 'Concert — Kiltikonet',
  '/catalogue': 'Catalogue — Kiltikonet',
  '/catalog': 'Catalogue — Kiltikonet',
  '/jetons': 'Jetons CC — Kiltikonet',
  '/appel-2026': 'Appel à projet — Kiltikonet',
  '/partnership': 'Partenariat — Kiltikonet',
  '/partenaires': 'Partenaires — Kiltikonet',
  '/gouvernance': 'Gouvernance — Kiltikonet',
  '/badge-inscription': 'Inscription Badge — Kiltikonet',
  '/admin': 'Administration — Kiltikonet',
  '/admin/ai-agents': 'Administration des agents — Kiltikonet',
  '/smart-engine': 'Smart Engine — Kiltikonet',
  '/smart-engine-3d': 'Smart Engine 3D — Kiltikonet',
  '/pro': 'Espace Pro — Kiltikonet',
  '/espace-pro': 'Espace Pro — Kiltikonet',
  '/accessibilite': 'Accessibilité — Kiltikonet',
  '/mentions-legales': 'Mentions légales — Kiltikonet',
  '/confidentialite': 'Politique de confidentialité — Kiltikonet',
  '/cgu': 'CGU — Kiltikonet',
  '/cookies': 'Cookies — Kiltikonet',
  '/faq': 'FAQ — Kiltikonet',
  '/aide': 'FAQ — Kiltikonet',
  '/support': 'Assistance — Kiltikonet',
});

const titlePaths = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);

export function documentTitleFor(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const key = titlePaths.find(candidate =>
    path === candidate || (candidate !== '/' && path.startsWith(`${candidate}/`))
  );
  return ROUTE_TITLES[key || '/'];
}
