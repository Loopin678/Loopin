import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from './NotificationBell';

const inv = { id: 'i1', userId: 'me', projectId: 'p1', stack: 'x', role: 'MEMBER' as const, status: 'PENDING' as const, project: { id: 'p1', name: 'Apollo' } };

function bell(overrides: Partial<React.ComponentProps<typeof NotificationBell>> = {}) {
  const props = {
    invitations: [inv], pendingCount: 1, loading: false, error: '', actioningId: null,
    onOpen: vi.fn(), onAccept: vi.fn(), onDecline: vi.fn(), onRetry: vi.fn(), ...overrides,
  };
  render(<NotificationBell {...props} />);
  return props;
}

describe('NotificationBell', () => {
  it('shows the pending count on the button', () => {
    bell({ pendingCount: 3 });
    expect(screen.getByRole('button', { name: /notifications — 3 pending/i })).toBeInTheDocument();
  });

  it('caps the badge at 99+', () => {
    bell({ pendingCount: 150 });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('refreshes when opened and lets me accept or decline', async () => {
    const props = bell();
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(props.onOpen).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation to Apollo' }));
    expect(props.onAccept).toHaveBeenCalledWith(inv);
    await userEvent.click(screen.getByRole('button', { name: 'Decline invitation to Apollo' }));
    expect(props.onDecline).toHaveBeenCalledWith(inv);
  });

  it('closes with Escape', async () => {
    bell();
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Apollo')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Apollo')).not.toBeInTheDocument();
  });

  it('offers a retry when loading failed', async () => {
    const props = bell({ invitations: [], pendingCount: 0, error: 'Database is down' });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Database is down')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /refresh|retry|try again/i })[0]);
    expect(props.onRetry).toHaveBeenCalled();
  });
});
