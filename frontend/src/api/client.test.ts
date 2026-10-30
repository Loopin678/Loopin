import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { ApiError, projectsApi, authApi } from './client';
import { goToLogin } from './session';

vi.mock('./session', () => ({ goToLogin: vi.fn() }));
beforeEach(() => vi.mocked(goToLogin).mockClear());

describe('API client errors', () => {
  it("turns a failed response into an ApiError with the server's message and status", async () => {
    server.use(http.get('/api/projects/p1', () => HttpResponse.json({ message: 'You are not a member of this project' }, { status: 403 })));

    const err = await projectsApi.get('p1').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, message: 'You are not a member of this project' });
  });

  it('sends cookies (withCredentials) and unwraps the response', async () => {
    server.use(http.post('/api/auth/login', async ({ request }) => {
      expect(await request.json()).toEqual({ email: 'a@b.test', password: 'pw' });
      return HttpResponse.json({ user: { id: 'u1', name: 'A', email: 'a@b.test', createdAt: '' } });
    }));
    expect((await authApi.login({ email: 'a@b.test', password: 'pw' })).user.id).toBe('u1');
  });

  it("doesn't reload to /login when the session check fails (route guards handle it)", async () => {
    // A hard reload here used to throw away the "return to /projects/p1 after login" state
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })));
    window.history.replaceState({}, '', '/projects/p1');
    const err = await authApi.me().catch((e) => e);
    expect(err.status).toBe(401);
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it('sends a session that expired mid-use to /login, but not from public pages', async () => {
    server.use(http.get('/api/projects/p1', () => HttpResponse.json({ message: 'expired' }, { status: 401 })));
    window.history.replaceState({}, '', '/projects/p1');
    await projectsApi.get('p1').catch(() => {});
    expect(goToLogin).toHaveBeenCalledOnce();

    vi.mocked(goToLogin).mockClear();
    window.history.replaceState({}, '', '/register');
    await projectsApi.get('p1').catch(() => {});
    expect(goToLogin).not.toHaveBeenCalled();
  });
});
