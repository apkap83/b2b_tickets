// Add testing-library custom matchers
import '@testing-library/jest-dom';

// Mock Next.js server components for Jest environment
// These are needed for API route testing
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(input: any, init: any = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    url: string;
    method: string;
    headers: Map<string, any>;
    json = jest.fn();
    text = jest.fn();
    formData = jest.fn();
  },
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(body: any, init: any = {}) {
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = body;
    }
    status: number;
    statusText: string;
    headers: Map<string, any>;
    body: any;
    json = jest.fn();
    text = jest.fn();
    
    // Add static json method
    static json(data: any, init: any = {}) {
      return new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init.headers,
        },
      });
    }
  },
});

// Mock Headers for Next.js API routes
Object.defineProperty(global, 'Headers', {
  value: Map,
});

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
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