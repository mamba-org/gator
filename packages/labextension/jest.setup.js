// Jest setup file for labextension package - use actual node-fetch
if (typeof global !== 'undefined') {
  // In Node.js environment, use the actual node-fetch
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
  global.Request = nodeFetch.Request;
  global.Response = nodeFetch.Response;
  global.Headers = nodeFetch.Headers;
}
