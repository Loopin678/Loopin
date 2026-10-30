import { setupServer } from 'msw/node';

// Mock backend shared by all tests; each test adds the handlers it needs with server.use(...)
export const server = setupServer();
