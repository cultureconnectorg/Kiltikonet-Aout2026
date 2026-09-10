import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.IS_REACT_ACT_ENVIRONMENT = true;

window.matchMedia = query => ({
  matches: false, media: query, onchange: null,
  addListener: jest.fn(), removeListener: jest.fn(),
  addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
});
