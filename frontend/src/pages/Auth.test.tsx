import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { me, renderAt, signedInAs } from '../test/render';
import { Login } from './Login';
import { Register } from './Register';

const routes = [
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/home', element: <h1>Home page</h1> },
  { path: '/projects/:id', element: <h1>Project page</h1> },
];

describe('Login', () => {
  it('signs in and goes to Home', async () => {
    signedInAs(null);
    server.use(http.post('/api/auth/login', () => {
      signedInAs(me);
      return HttpResponse.json({ user: me });
    }));
    renderAt('/login', routes);

    await userEvent.type(await screen.findByLabelText(/email/i), 'me@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  });

  it("shows the server's error for wrong credentials", async () => {
    signedInAs(null);
    server.use(http.post('/api/auth/login', () => HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })));
    renderAt('/login', routes);

    await userEvent.type(await screen.findByLabelText(/email/i), 'me@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('sends an already signed-in user straight on', async () => {
    signedInAs(me);
    renderAt('/login', routes);
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  });
});

describe('Register', () => {
  it('creates the account and signs in', async () => {
    signedInAs(null);
    let body: unknown;
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ user: me }, { status: 201 });
      }),
      // Registering then signs in with the same credentials
      http.post('/api/auth/login', () => {
        signedInAs(me);
        return HttpResponse.json({ user: me });
      }),
    );
    renderAt('/register', routes);

    await userEvent.type(await screen.findByLabelText(/name/i), 'Me Myself');
    await userEvent.type(screen.getByLabelText(/email/i), 'me@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'long-password');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(body).toEqual({ name: 'Me Myself', email: 'me@example.test', password: 'long-password' }));
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  });

  it('shows why registration failed', async () => {
    signedInAs(null);
    server.use(http.post('/api/auth/register', () => HttpResponse.json({ message: 'User with this email already exists' }, { status: 409 })));
    renderAt('/register', routes);

    await userEvent.type(await screen.findByLabelText(/name/i), 'Me');
    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'long-password');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('User with this email already exists')).toBeInTheDocument();
  });
});
