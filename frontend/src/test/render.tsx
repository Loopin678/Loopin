import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { server } from './server';

export const me = { id: 'me', name: 'Me Myself', email: 'me@example.test', username: 'me_myself', createdAt: '' };

// Mock /api/auth/me as signed in (user) or signed out (null)
export function signedInAs(user: typeof me | null) {
  server.use(http.get('/api/auth/me', () =>
    user ? HttpResponse.json({ user }) : HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })));
}

// Render a page inside the app's providers at the given URL
export function renderAt(path: string, routes: { path: string; element: React.ReactNode }[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          {routes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}
