import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import MessagesPage from './components/pro/MessagesPage';
import NetworkPage from './components/pro/NetworkPage';

// Navigation tests use the real pages/router and synthetic API/display-session
// fixtures. They do not validate authentication or send messages to real people.
jest.mock('axios');

let container;
let root;
const scrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sessionStorage.clear();
  sessionStorage.setItem('cc2026_pro_session', JSON.stringify({ id: 'atlas-self' }));
  Element.prototype.scrollIntoView = () => {};
  axios.get.mockImplementation(async url => {
    if (url.endsWith('/pro/social/directory')) {
      return { data: { professionals: [{ id: 'atlas-contact', full_name: 'Contact Atlas' }] } };
    }
    if (url.endsWith('/pro/connections/atlas-self')) {
      return { data: { connections: [{ id: 'atlas-contact' }] } };
    }
    if (url.endsWith('/pro/messages/atlas-self')) return { data: { messages: [] } };
    throw new Error(`Unexpected fixture request: ${url}`);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  sessionStorage.clear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

function Destination() {
  return <output>{useLocation().pathname}</output>;
}

async function render(path) {
  // eslint-disable-next-line testing-library/no-unnecessary-act -- Direct ReactDOM renderer.
  await act(async () => root.render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/core" element={<Destination />} />
        <Route path="/admin/core/messages" element={<MessagesPage />} />
        <Route path="/admin/core/reseau" element={<NetworkPage />} />
        <Route path="*" element={<div>Route absente</div>} />
      </Routes>
    </MemoryRouter>
  ));
}

async function click(testId) {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  expect(element).not.toBeNull();
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

test.each([
  ['/admin/core/messages', 'messages-back-btn'],
  ['/admin/core/reseau', 'network-back-btn'],
])('the return action from %s opens its existing Core parent', async (path, button) => {
  await render(path);
  await click(button);
  expect(container.querySelector('output')?.textContent).toBe('/admin/core');
});

test('the Core directory opens the existing Messages screen', async () => {
  await render('/admin/core/reseau');
  await click('pro-card-atlas-contact');
  const button = [...container.querySelectorAll('[data-testid="profile-modal"] button')]
    .find(element => element.textContent.includes('Message'));
  expect(button).toBeDefined();
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(container.querySelector('[data-testid="messages-page"]')).not.toBeNull();
  expect(axios.post).not.toHaveBeenCalled();
});
