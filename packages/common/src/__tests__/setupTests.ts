// Setup file for Jest tests

// Since we're using jsdom test environment, it should provide fetch
// If not available, we'll add a simple polyfill
if (typeof fetch === 'undefined') {
  // Use dynamic import to avoid TypeScript issues
  const nodeFetch = eval('require')('node-fetch');
  (globalThis as any).fetch = nodeFetch.default || nodeFetch;
  (globalThis as any).Response = nodeFetch.Response;
  (globalThis as any).Request = nodeFetch.Request;
  (globalThis as any).Headers = nodeFetch.Headers;
}

// Ensure URL and URLSearchParams are available
if (typeof URL === 'undefined') {
  const { URL: NodeURL, URLSearchParams: NodeURLSearchParams } =
    eval('require')('url');
  (globalThis as any).URL = NodeURL;
  (globalThis as any).URLSearchParams = NodeURLSearchParams;
}

// Mock console methods to reduce noise during tests
(globalThis as any).console = {
  ...console,
  // Suppress debug logs during tests
  debug: jest.fn(),
  // Keep error and warn for important messages
  error: console.error,
  warn: console.warn,
  log: console.log,
  info: console.info
};
