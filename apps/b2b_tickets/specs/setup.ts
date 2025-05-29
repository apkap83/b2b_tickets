// Add testing-library custom matchers
import '@testing-library/jest-dom';

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