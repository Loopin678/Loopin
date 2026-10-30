import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

// Any request without a handler fails the test, so nothing silently hits a real backend
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterAll(() => server.close());
