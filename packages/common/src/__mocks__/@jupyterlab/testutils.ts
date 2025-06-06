// Mock implementation of @jupyterlab/testutils
export const testEmission = jest.fn(() => {
  return Promise.resolve();
});

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const acceptDialog = jest.fn(() => Promise.resolve());

export const dismissDialog = jest.fn(() => Promise.resolve());

// Add other testutils functions as needed
export const framePromise = () => new Promise(resolve => requestAnimationFrame(resolve)); 