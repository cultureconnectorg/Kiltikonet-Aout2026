import { matchRoutes } from 'react-router-dom';
import routeInventory from './routeInventory.json';

// Historical export names are retained for compatibility. This is a descriptive
// inventory, not an ownership decision, access-control policy or migration plan.
// Source: App.js; regenerate with python scripts/rebuild_inventory.py.
export const ROUTE_DOMAINS = Object.freeze({
  INSTITUTION: 'institution',
  CULTURE_CONNECT: 'culture-connect',
  EVENT_OPS: 'event-ops',
  COMMUNITY: 'community',
  PRO: 'pro',
  ADMIN: 'admin',
  INTELLIGENCE: 'local-intelligence',
  OBSERVATORY: 'observatory',
  GOVERNANCE: 'governance',
  WORKSPACE: 'workspace',
  SYSTEM: 'system',
});

export const ROUTE_STATUS = Object.freeze({
  CURRENT: 'CURRENT',
  TARGET: 'TARGET',
  DECISION_REQUIRED: 'DECISION REQUIRED',
  LEGACY: 'LEGACY',
});

function surfaceFor(path) {
  if (path.startsWith('/smart-engine') || path === '/admin/ai-agents') return ROUTE_DOMAINS.INTELLIGENCE;
  if (path.startsWith('/observatory') || ['/now', '/maintenant'].includes(path)) return ROUTE_DOMAINS.OBSERVATORY;
  if (path.startsWith('/gouvernance')) return ROUTE_DOMAINS.GOVERNANCE;
  if (path.startsWith('/workspace/') || path.startsWith('/dashboard-cc2026')) return ROUTE_DOMAINS.WORKSPACE;
  if (path.startsWith('/admin/core') || path.startsWith('/espace-pro') || path === '/pro') return ROUTE_DOMAINS.PRO;
  if (path.startsWith('/admin')) return ROUTE_DOMAINS.ADMIN;
  if (path.startsWith('/badge') || path.startsWith('/activer-badge/') || path.startsWith('/participant/') || ['/scan', '/scanner-cc2026', '/register-pro'].includes(path)) return ROUTE_DOMAINS.EVENT_OPS;
  if (path.startsWith('/jetons') || path === '/mon-espace') return ROUTE_DOMAINS.COMMUNITY;
  if (path.startsWith('/culture-connect') || ['/legacy-cc2026', '/pricing', '/tarifs', '/register', '/inscription', '/programme', '/concert', '/catalogue', '/catalog', '/appel-2026', '/partnership', '/partenaires', '/partenaire/confirmation', '/confirmation'].includes(path)) return ROUTE_DOMAINS.CULTURE_CONNECT;
  if (['/', '/a-propos', '/about', '/infrastructure', '/rejoindre', '/reseau', '/contact'].includes(path)) return ROUTE_DOMAINS.INSTITUTION;
  return ROUTE_DOMAINS.SYSTEM;
}

export const ROUTE_OWNERSHIP = Object.freeze(routeInventory.map(route => Object.freeze({
  ...route,
  domain: surfaceFor(route.path),
  status: ROUTE_STATUS.CURRENT,
  evidenceStatus: 'OBSERVED_IN_SOURCE',
  ownershipStatus: ROUTE_STATUS.DECISION_REQUIRED,
  // No ProtectedRoute wrapper does not imply public API access.
  accessEvidence: route.guard,
  legacy: route.path === '/legacy-cc2026',
})));

// Existing name retained; each product has separate current evidence and target.
export const TARGET_PRODUCTS = Object.freeze({
  KILTIKONET_NETWORK: {
    status: ROUTE_STATUS.CURRENT,
    current: 'Read-only Network backend mounted in server.py; data model documented; no Network UI route observed.',
    evidence: ['backend/routes/network.py', 'backend/tests/test_network_phase1.py', 'memory/KILTIKONET_NETWORK_DATA_MODEL.md'],
    targetStatus: ROUTE_STATUS.DECISION_REQUIRED,
    decisionRef: 'D-03',
  },
  KILTIKONET_ACADEMY: {
    status: ROUTE_STATUS.CURRENT,
    current: 'Academy programme entry and training-record read endpoint. No LMS or shared learning-engine integration verified.',
    evidence: ['backend/routes/network.py:PROGRAMMES_CATALOG', 'backend/routes/network.py:list_training'],
    targetStatus: ROUTE_STATUS.DECISION_REQUIRED,
    decisionRef: 'D-04',
  },
});

export function routeOwnershipFor(pathname) {
  // Use the application's router semantics, including parameters and boundaries.
  return matchRoutes(ROUTE_OWNERSHIP, pathname)?.[0]?.route || null;
}
