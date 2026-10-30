import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { me, renderAt, signedInAs } from '../test/render';
import { Connect } from './Connect';
import { ProtectedRoute } from '../App';

const request = { userCode: 'WXYZ-BCDF', clientName: 'Loopin Desktop on fedora', expiresAt: '' };

function page(path: string) {
  return renderAt(path, [
    { path: '/connect', element: <ProtectedRoute><Connect /></ProtectedRoute> },
    { path: '/login', element: <h1>Login page</h1> },
  ]);
}

describe('Connect page ("Sign in with Loopin")', () => {
  it('shows which app is asking, with the code, and approves it', async () => {
    signedInAs(me);
    let approved: unknown;
    server.use(
      http.get('/api/auth/device/WXYZ-BCDF', () => HttpResponse.json(request)),
      http.post('/api/auth/device/approve', async ({ request: r }) => { approved = await r.json(); return HttpResponse.json({ message: 'ok' }); }),
    );
    page('/connect?code=WXYZ-BCDF');

    expect(await screen.findByText('Loopin Desktop on fedora')).toBeInTheDocument();
    expect(screen.getByText('WXYZ-BCDF')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText(/is now signed in/)).toBeInTheDocument();
    expect(approved).toEqual({ userCode: 'WXYZ-BCDF' });
  });

  it('can deny', async () => {
    signedInAs(me);
    const deny = vi.fn(() => HttpResponse.json({ message: 'Declined' }));
    server.use(http.get('/api/auth/device/WXYZ-BCDF', () => HttpResponse.json(request)), http.post('/api/auth/device/deny', deny));
    page('/connect?code=WXYZ-BCDF');

    await userEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(await screen.findByText(/declined/i)).toBeInTheDocument();
    expect(deny).toHaveBeenCalledOnce();
  });

  it('lets me type the code when I open the page without one', async () => {
    signedInAs(me);
    server.use(http.get('/api/auth/device/wxyz-bcdf', () => HttpResponse.json(request)));
    page('/connect');

    await userEvent.type(await screen.findByLabelText('Code'), 'wxyz-bcdf');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Loopin Desktop on fedora')).toBeInTheDocument();
  });

  it('explains an expired or wrong code', async () => {
    signedInAs(me);
    server.use(http.get('/api/auth/device/WXYZ-BCDF', () =>
      HttpResponse.json({ message: 'That code is invalid or has expired. Start signing in again from the app.' }, { status: 404 })));
    page('/connect?code=WXYZ-BCDF');
    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
  });

  it('signed-out visitors go to login first, keeping the code for afterwards', async () => {
    signedInAs(null);
    page('/connect?code=WXYZ-BCDF');
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument();
  });
});
