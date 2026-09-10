import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, saveSession } from './components/ProtectedRoute';
import CompatibilityRedirect from './components/CompatibilityRedirect';
import JetonsPage from './components/JetonsPage';
import { PricingPage } from './components/PricingPage';
import { documentTitleFor } from './config/routeMetadata';
import { routeOwnershipFor, ROUTE_OWNERSHIP } from './config/routeOwnership';

// Unit fixtures only: no external authentication, payment or data service is called.
jest.mock('./hooks/useAnimations', () => ({
  useIntersectionObserver: () => [null, true],
  useCountdown: () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
  Reveal: ({ children }) => children,
  AnimatedNumber: ({ value }) => value,
}));
jest.mock('./context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
jest.mock('./lib/smartTracker', () => ({ trackConversion: jest.fn() }));

let container;
let root;
const originalFetch = global.fetch;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sessionStorage.clear();
  global.fetch = jest.fn();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = originalFetch;
});

function Location() {
  const { pathname, search, hash, state } = useLocation();
  return <output>{JSON.stringify({ pathname, search, hash, state })}</output>;
}

async function render(element, initialEntry) {
  // eslint-disable-next-line testing-library/no-unnecessary-act -- Uses ReactDOM.createRoot, not Testing Library.
  await act(async () => root.render(
    <MemoryRouter initialEntries={[initialEntry || '/']}>{element}</MemoryRouter>
  ));
}

function guardedRoutes() {
  return <Routes>
    <Route path="/smart-engine" element={
      <ProtectedRoute allowedRoles={['admin', 'founder']}><div>Private console</div></ProtectedRoute>
    } />
    <Route path="/admin" element={<Location />} />
  </Routes>;
}

test('a forged display cache never reveals protected content while auth is pending or denied', async () => {
  saveSession({ role: 'founder' });
  let resolveAuth;
  global.fetch.mockImplementation(() => new Promise(resolve => { resolveAuth = resolve; }));
  await render(guardedRoutes(), '/smart-engine');
  expect(container.textContent).toContain('Verification');
  expect(container.textContent).not.toContain('Private console');
  await act(async () => resolveAuth({ ok: false }));
  const location = JSON.parse(container.querySelector('output').textContent);
  expect(location.pathname).toBe('/admin');
  expect(location.state.requireAuth).toBe(true);
  expect(sessionStorage.getItem('cc2026_session')).toBeNull();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/me$/), { credentials: 'include' });
});

test.each(['admin', 'founder'])('verified %s can still open the console', async role => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, session: { role } }) });
  await render(guardedRoutes(), '/smart-engine');
  expect(container.textContent).toBe('Private console');
});

test('a verified role outside the existing allowlist is denied', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, session: { role: 'finance' } }) });
  await render(guardedRoutes(), '/smart-engine');
  expect(JSON.parse(container.querySelector('output').textContent).state.unauthorized).toBe(true);
});

test('authentication transport failure does not authorize cached roles', async () => {
  saveSession({ role: 'admin' });
  global.fetch.mockRejectedValue(new Error('offline'));
  await render(guardedRoutes(), '/smart-engine');
  expect(JSON.parse(container.querySelector('output').textContent).pathname).toBe('/admin');
});

test('compatibility redirects retain the full navigation context', async () => {
  await render(<Routes>
    <Route path="/reseau" element={<CompatibilityRedirect to="/rejoindre" />} />
    <Route path="/rejoindre" element={<Location />} />
  </Routes>, { pathname: '/reseau', search: '?source=partner', hash: '#contact', state: { from: 'mail' } });
  expect(JSON.parse(container.querySelector('output').textContent)).toEqual({
    pathname: '/rejoindre', search: '?source=partner', hash: '#contact', state: { from: 'mail' },
  });
});

test('the historical Stripe return renders the existing ticket confirmation', async () => {
  await render(<PricingPage />, '/tarifs?ticket=success&session_id=test-only#billet');
  expect(container.textContent).toContain('Paiement confirmé');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('Jetons uses the API value without inventing a monetary qualification', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ packs: [], jeton_value_eur: 2.3 }) });
  await render(<JetonsPage />, '/jetons');
  expect(container.textContent).toMatch(/2,30\s*€/);
  expect(container.textContent).not.toMatch(/monnaie|unité d’usage interne/i);
});

test('Jetons does not invent a face value when the API is unavailable', async () => {
  global.fetch.mockResolvedValue({ ok: false });
  await render(<JetonsPage />, '/jetons');
  expect(container.textContent).not.toMatch(/1 jeton\s*=/i);
  expect(container.textContent).toContain('Jetons CC');
});

test('specific document titles win and path boundaries are respected', () => {
  expect(documentTitleFor('/culture-connect/2026')).toContain('2026');
  expect(documentTitleFor('/observatory/founder/')).toContain('fondateur');
  expect(documentTitleFor('/admin/ai-agents')).toContain('agents');
  expect(documentTitleFor('/smart-engine-3d')).toContain('3D');
  expect(documentTitleFor('/projet-inconnu')).toBe(documentTitleFor('/'));
});

test('descriptive inventory resolves parameterized URLs without expanding route ownership', () => {
  expect(routeOwnershipFor('/p/exemple').path).toBe('/p/:slug');
  expect(routeOwnershipFor('/workspace/alirio').ownershipStatus).toBe('DECISION REQUIRED');
  expect(routeOwnershipFor('/not-a-route')).toBeNull();
  expect(new Set(ROUTE_OWNERSHIP.map(route => route.path)).size).toBe(ROUTE_OWNERSHIP.length);
});

test('the installed router resolves duplicate paths by their first declaration', async () => {
  await render(<Routes>
    <Route path="/contact" element={<div>First contact</div>} />
    <Route path="/contact" element={<div>Second contact</div>} />
  </Routes>, '/contact');
  expect(container.textContent).toBe('First contact');
});
