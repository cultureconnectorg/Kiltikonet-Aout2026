// Kiltikonet route ownership baseline — generated from the verified route atlas.
//
// This file is intentionally declarative. It gives future refactors a single place
// to decide what a route belongs to without changing runtime behaviour by itself.
//
// Status vocabulary follows the CVLN iOS evidence discipline:
// OBSERVED | IMPLEMENTED | TARGET | OPEN | LEGACY | INTERNAL.

export const ROUTE_DOMAINS = Object.freeze({
  INSTITUTION: 'institution',
  CULTURE_CONNECT: 'culture-connect',
  EVENT_OPS: 'event-ops',
  COMMUNITY: 'community',
  PRO: 'pro',
  ADMIN: 'admin',
  INTELLIGENCE_CONSOLE: 'intelligence-console',
  WORKSPACE: 'workspace',
  SYSTEM: 'system',
});

export const ROUTE_STATUS = Object.freeze({
  OBSERVED: 'OBSERVED',
  IMPLEMENTED: 'IMPLEMENTED',
  TARGET: 'TARGET',
  OPEN: 'OPEN',
  LEGACY: 'LEGACY',
  INTERNAL: 'INTERNAL',
});

export const ROUTE_OWNERSHIP = [
  // Kiltikonet institutional/public core
  { path: '/', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true },
  { path: '/a-propos', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true },
  { path: '/about', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.LEGACY, aliasOf: '/a-propos' },
  { path: '/infrastructure', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true },
  { path: '/rejoindre', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true, note: 'Participation page. Must not claim territorial Network is already deployed.' },
  { path: '/contact', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true, note: 'ContactKiltikonet is canonical; duplicate SupportPage route must be removed.' },
  { path: '/observatory', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true, note: 'Cultural observatory, not CVLN estate observability.' },
  { path: '/observatory/founder', domain: ROUTE_DOMAINS.ADMIN, status: ROUTE_STATUS.INTERNAL },
  { path: '/now', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.IMPLEMENTED, canonical: true },
  { path: '/maintenant', domain: ROUTE_DOMAINS.INSTITUTION, status: ROUTE_STATUS.LEGACY, aliasOf: '/now' },

  // Culture Connect product/event universe
  { path: '/culture-connect', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.IMPLEMENTED, canonical: true },
  { path: '/culture-connect/2026', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.OBSERVED, canonical: true },
  { path: '/culture-connect/2027', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.TARGET, canonical: true, note: 'Future edition; do not present as verified runtime capability.' },
  { path: '/legacy-cc2026', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.LEGACY },
  { path: '/programme', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.IMPLEMENTED, migrationTarget: '/culture-connect/programme' },
  { path: '/concert', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.IMPLEMENTED, migrationTarget: '/culture-connect/concert' },
  { path: '/appel-2026', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.OBSERVED, migrationTarget: '/culture-connect/appel-2026' },
  { path: '/pricing', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.IMPLEMENTED, migrationTarget: '/culture-connect/inscription' },
  { path: '/tarifs', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.LEGACY, aliasOf: '/pricing' },
  { path: '/register', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.LEGACY, aliasOf: '/pricing' },
  { path: '/inscription', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.LEGACY, aliasOf: '/pricing' },
  { path: '/catalogue', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.OPEN, migrationTarget: '/culture-connect/catalogue', note: 'May later split between community directory and event catalogue.' },
  { path: '/catalog', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.LEGACY, aliasOf: '/catalogue' },
  { path: '/partnership', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.OPEN, note: 'Split institutional partnerships from event sponsorship before final migration.' },
  { path: '/partenaires', domain: ROUTE_DOMAINS.CULTURE_CONNECT, status: ROUTE_STATUS.OPEN, aliasOf: '/partnership' },

  // Event identity / field operations
  { path: '/badge/:id', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/badge-scan', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/activer-badge/:qrToken', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/badge-inscription', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/scanner-cc2026', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/scan', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/participant/:participantId', domain: ROUTE_DOMAINS.EVENT_OPS, status: ROUTE_STATUS.IMPLEMENTED },

  // Community / member
  { path: '/mon-espace', domain: ROUTE_DOMAINS.COMMUNITY, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/jetons', domain: ROUTE_DOMAINS.COMMUNITY, status: ROUTE_STATUS.OPEN, note: 'JCC/Jetons wording and legal status remain unresolved in CVLN iOS.' },
  { path: '/jetons/confirmation', domain: ROUTE_DOMAINS.COMMUNITY, status: ROUTE_STATUS.OPEN, aliasOf: '/jetons' },

  // Pro product
  { path: '/pro', domain: ROUTE_DOMAINS.PRO, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/espace-pro/connexion', domain: ROUTE_DOMAINS.PRO, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/admin/core', domain: ROUTE_DOMAINS.PRO, status: ROUTE_STATUS.LEGACY },
  { path: '/admin/core/messages', domain: ROUTE_DOMAINS.PRO, status: ROUTE_STATUS.INTERNAL },
  { path: '/admin/core/reseau', domain: ROUTE_DOMAINS.PRO, status: ROUTE_STATUS.INTERNAL },

  // CVLN intelligence must be consumed, not owned, by Kiltikonet.
  { path: '/smart-engine', domain: ROUTE_DOMAINS.INTELLIGENCE_CONSOLE, status: ROUTE_STATUS.INTERNAL, note: 'Console only. Cognition/model routing target owner is CVL BRAIN.' },
  { path: '/smart-engine-3d', domain: ROUTE_DOMAINS.INTELLIGENCE_CONSOLE, status: ROUTE_STATUS.INTERNAL },
  { path: '/admin/ai-agents', domain: ROUTE_DOMAINS.INTELLIGENCE_CONSOLE, status: ROUTE_STATUS.INTERNAL, note: 'Console only. Agent runtime/lifecycle target owner is CVLN Agent Factory.' },

  // Workspaces / CC operations are internal application surfaces.
  { pathPrefix: '/workspace/', domain: ROUTE_DOMAINS.WORKSPACE, status: ROUTE_STATUS.INTERNAL },
  { pathPrefix: '/dashboard-cc2026', domain: ROUTE_DOMAINS.WORKSPACE, status: ROUTE_STATUS.INTERNAL, note: 'Do not conflate with estate CVLN Command Center.' },
  { pathPrefix: '/admin/', domain: ROUTE_DOMAINS.ADMIN, status: ROUTE_STATUS.INTERNAL },

  // System/legal
  { path: '/faq', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/aide', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.LEGACY, aliasOf: '/faq' },
  { path: '/support', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/mentions-legales', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.OPEN, note: 'Legal entity/brand ownership must be evidence-backed before structural rewrite.' },
  { path: '/confidentialite', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.IMPLEMENTED },
  { path: '/cgu', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.OPEN },
  { path: '/cookies', domain: ROUTE_DOMAINS.SYSTEM, status: ROUTE_STATUS.IMPLEMENTED },
];

export const TARGET_PRODUCTS = Object.freeze({
  KILTIKONET_NETWORK: {
    status: ROUTE_STATUS.TARGET,
    evidence: 'CVLN iOS NETWORK-MODEL: operator network/hubs/licences/deployment model not evidenced in audited Kiltikonet repo.',
  },
  KILTIKONET_ACADEMY: {
    status: ROUTE_STATUS.TARGET,
    evidence: 'CVLN iOS PROGRAMMES-REGISTRY: Academy name referenced, no Kiltikonet Academy artefact verified.',
  },
});

export function routeOwnershipFor(pathname) {
  const exact = ROUTE_OWNERSHIP.find((route) => route.path === pathname);
  if (exact) return exact;
  return ROUTE_OWNERSHIP.find((route) => route.pathPrefix && pathname.startsWith(route.pathPrefix)) || null;
}
