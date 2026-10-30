import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { useInvitations } from './useInvitations';

const invite = (id: string, projectId: string) =>
  ({ id, userId: 'me', projectId, stack: 'x', role: 'MEMBER', status: 'PENDING', project: { id: projectId, name: `P ${projectId}` } });

describe('useInvitations', () => {
  it('loads my pending invitations', async () => {
    server.use(http.get('/api/project/member/invites', () => HttpResponse.json({ invitations: [invite('i1', 'p1'), invite('i2', 'p2')] })));
    const { result } = renderHook(() => useInvitations());
    await act(() => result.current.refreshInvitations());
    expect(result.current.pendingCount).toBe(2);
  });

  it('accepting removes the invite and tells the caller to refresh projects', async () => {
    const onAfterAccept = vi.fn();
    server.use(
      http.get('/api/project/member/invites', () => HttpResponse.json({ invitations: [invite('i1', 'p1')] })),
      http.post('/api/project/member/p1/accept', () => HttpResponse.json({ message: 'ok' })),
    );
    const { result } = renderHook(() => useInvitations(onAfterAccept));
    await act(() => result.current.refreshInvitations());
    await act(() => result.current.acceptInvitation(result.current.invitations[0]));

    expect(result.current.invitations).toEqual([]);
    expect(onAfterAccept).toHaveBeenCalledOnce();
  });

  it('explains a stale invite and resyncs the list', async () => {
    let calls = 0;
    server.use(
      http.get('/api/project/member/invites', () => HttpResponse.json({ invitations: calls++ === 0 ? [invite('i1', 'p1')] : [] })),
      http.post('/api/project/member/p1/decline', () => HttpResponse.json({ message: 'gone' }, { status: 404 })),
    );
    const { result } = renderHook(() => useInvitations());
    await act(() => result.current.refreshInvitations());
    await act(() => result.current.declineInvitation(result.current.invitations[0]));

    expect(result.current.error).toBe('This invitation is no longer available.');
    await waitFor(() => expect(result.current.invitations).toEqual([]));
  });

  it('shows the server error when loading fails', async () => {
    server.use(http.get('/api/project/member/invites', () => HttpResponse.json({ message: 'Database is down' }, { status: 500 })));
    const { result } = renderHook(() => useInvitations());
    await act(() => result.current.refreshInvitations());
    expect(result.current.error).toBe('Database is down');
    expect(result.current.loading).toBe(false);
  });
});
