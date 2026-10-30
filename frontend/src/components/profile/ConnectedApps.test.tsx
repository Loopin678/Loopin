import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server';
import { ConnectedApps } from './ConnectedApps';

const apps = [
  { id: 'a1', name: 'Loopin Desktop on fedora', createdAt: '2026-10-01T00:00:00Z', lastUsedAt: '2026-10-30T00:00:00Z' },
  { id: 'a2', name: 'loopin CLI', createdAt: '2026-10-02T00:00:00Z', lastUsedAt: null },
];

describe('ConnectedApps', () => {
  it('lists signed-in apps and signs one out after confirming', async () => {
    let removed = '';
    server.use(
      http.get('/api/auth/tokens', () => HttpResponse.json({ tokens: apps })),
      http.delete('/api/auth/tokens/:id', ({ params }) => { removed = String(params.id); return new HttpResponse(null, { status: 204 }); }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ConnectedApps />);

    expect(await screen.findByText('Loopin Desktop on fedora')).toBeInTheDocument();
    expect(screen.getByText('loopin CLI')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]);
    await vi.waitFor(() => expect(removed).toBe('a1'));
    expect(screen.queryByText('Loopin Desktop on fedora')).not.toBeInTheDocument();
  });

  it('says how to add an app when there are none', async () => {
    server.use(http.get('/api/auth/tokens', () => HttpResponse.json({ tokens: [] })));
    render(<ConnectedApps />);
    expect(await screen.findByText(/no apps signed in/i)).toBeInTheDocument();
  });
});
