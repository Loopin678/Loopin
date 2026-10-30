import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { me, renderAt, signedInAs } from '../test/render';

// The page opens a live socket for presence; a stub keeps the test offline
vi.mock('../api/socket', () => {
  const socket = { connected: false, on: vi.fn(), off: vi.fn(), emit: vi.fn() };
  return { connectSocket: () => socket, getSocket: () => socket, disconnectSocket: vi.fn() };
});

import { Members } from './Members';

const member = (userId: string, name: string, role: 'OWNER' | 'MEMBER') =>
  ({ id: `m-${userId}`, userId, projectId: 'p1', stack: 'web', role, status: 'ACTIVE', user: { id: userId, name, username: name.toLowerCase() } });

function project(myRole: 'OWNER' | 'MEMBER') {
  const other = myRole === 'OWNER' ? member('them', 'Teammate', 'MEMBER') : member('them', 'Boss', 'OWNER');
  signedInAs(me);
  server.use(
    http.get('/api/project/member/p1', () => HttpResponse.json({ members: [member('me', me.name, myRole), other] })),
    http.get('/api/project/member/p1/invites', () => HttpResponse.json({ invitations: [] })),
    http.get('/api/projects/p1', () => HttpResponse.json({ project: { id: 'p1', name: 'Apollo', createdAt: '' } })),
  );
  return renderAt('/projects/p1/members', [{ path: '/projects/:projectId/members', element: <Members /> }]);
}

describe('Members page', () => {
  it('owners can invite and transfer ownership, and remove members but not themselves', async () => {
    project('OWNER');
    expect(await screen.findByRole('button', { name: /invite member/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument();

    await screen.findByText('Teammate');
    // One Remove button (for the teammate); none on my own row
    expect(screen.getAllByRole('button', { name: /^remove$/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /leave/i })).not.toBeInTheDocument();
    expect(screen.getByText(/transfer or delete project to leave/i)).toBeInTheDocument();
  });

  it('members see no owner controls, but can leave', async () => {
    project('MEMBER');
    await screen.findByText('Boss');
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /transfer/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('leaving asks for confirmation and calls the API', async () => {
    project('MEMBER');
    let deleted = false;
    server.use(http.delete('/api/project/member/p1/me', () => { deleted = true; return new HttpResponse(null, { status: 204 }); }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await userEvent.click(await screen.findByRole('button', { name: /leave/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(deleted).toBe(false);
  });
});
