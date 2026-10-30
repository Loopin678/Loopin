import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { me, signedInAs } from './test/render';
import { GuestRoute, ProtectedRoute } from './App';

function LoginProbe() {
  const location = useLocation();
  return <h1>Login, then back to {(location.state as { from?: string } | null)?.from ?? 'nowhere'}</h1>;
}

function app(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginProbe /></GuestRoute>} />
          <Route path="/home" element={<h1>Home</h1>} />
          <Route path="/projects/:id" element={<ProtectedRoute><h1>Secret project</h1></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('route guards', () => {
  it('sends signed-out users to login, remembering where they were going', async () => {
    signedInAs(null);
    app('/projects/42?tab=chat');
    expect(await screen.findByRole('heading', { name: 'Login, then back to /projects/42?tab=chat' })).toBeInTheDocument();
  });

  it('waits for the session check instead of flashing the login page', async () => {
    signedInAs(me);
    app('/projects/42');
    expect(screen.queryByRole('heading', { name: /login/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Secret project' })).toBeInTheDocument();
  });

  it('keeps signed-in users off the login page', async () => {
    signedInAs(me);
    app('/login');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
