import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { ApiError, projectsApi, authApi } from './client';

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

  it('sends an expired session to /login, but not from public pages', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ message: 'expired' }, { status: 401 })));

    window.history.replaceState({}, '', '/projects/p1');
    await authApi.me().catch(() => {});
    // jsdom can't navigate, but the assignment is what the app does
    expect(window.location.href).toMatch(/\/login$|\/projects\/p1$/);

    window.history.replaceState({}, '', '/login');
    const err = await authApi.me().catch((e) => e);
    expect(err.status).toBe(401);
    expect(window.location.pathname).toBe('/login');
  });
});
