// Add testing-library custom matchers
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

// Add window.gtag type
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params: Record<string, unknown>
    ) => void;
  }
}