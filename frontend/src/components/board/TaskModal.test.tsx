import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server';
import { useBoardStore } from '../../store/boardStore';
import { TaskModal } from './TaskModal';

const task = {
  id: 't1', title: 'Fix login', description: 'Old notes', position: 0, stack: 'web', priority: 'medium', dueDate: null,
  listId: 'todo', projectId: 'p1', assigneeId: null, commitId: null, assignee: null, createdAt: '', updatedAt: '',
};
const members = [
  { id: 'm1', userId: 'u1', projectId: 'p1', stack: 'backend', role: 'OWNER', status: 'ACTIVE', user: { id: 'u1', name: 'Olivia', username: 'olivia' } },
  { id: 'm2', userId: 'u2', projectId: 'p1', stack: 'frontend', role: 'MEMBER', status: 'ACTIVE', user: { id: 'u2', name: 'Marco', username: 'marco' } },
];

function open(onClose = vi.fn()) {
  render(<MemoryRouter><TaskModal taskId="t1" projectId="p1" onClose={onClose} /></MemoryRouter>);
  return onClose;
}

beforeEach(() => {
  useBoardStore.getState().clearBoard();
  useBoardStore.getState().setBoard([{ id: 'todo', name: 'To Do', position: 0, projectId: 'p1', tasks: [task] } as never]);
  server.use(
    http.get('/api/tasks/t1', () => HttpResponse.json({ task })),
    http.get('/api/project/member/p1', () => HttpResponse.json({ members })),
  );
});

describe('TaskModal', () => {
  it('loads the task and offers project members as assignees', async () => {
    open();
    expect(await screen.findByDisplayValue('Fix login')).toBeInTheDocument();
    const options = Array.from((screen.getByLabelText(/assignee/i) as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options[0]).toBe('Unassigned');
    expect(options.slice(1).join(' ')).toMatch(/Olivia.*Marco/);
  });

  it('saves edits, updates the board and closes', async () => {
    let sent: Record<string, unknown> = {};
    server.use(http.patch('/api/tasks/t1', async ({ request }) => {
      sent = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ task: { ...task, title: 'Fix login on Safari', assigneeId: 'u2' } });
    }));
    const onClose = open();

    const title = await screen.findByLabelText('Task title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Fix login on Safari');
    await userEvent.selectOptions(screen.getByLabelText(/assignee/i), 'u2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(sent).toMatchObject({ title: 'Fix login on Safari', assigneeId: 'u2' });
    expect(onClose).toHaveBeenCalled();
    expect(useBoardStore.getState().tasksById.t1).toMatchObject({ title: 'Fix login on Safari' });
  });

  it("keeps the modal open and shows the server's reason when saving fails", async () => {
    server.use(http.patch('/api/tasks/t1', () => HttpResponse.json({ message: 'Assignee must be an active member of this project' }, { status: 400 })));
    const onClose = open();
    await screen.findByDisplayValue('Fix login');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Assignee must be an active member of this project')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('deletes only after confirmation', async () => {
    let deleted = false;
    server.use(http.delete('/api/tasks/t1', () => { deleted = true; return HttpResponse.json({ deleted: { id: 't1', listId: 'todo', projectId: 'p1' } }); }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    open();
    await screen.findByDisplayValue('Fix login');

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(deleted).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(confirm).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(deleted).toBe(true));
    await vi.waitFor(() => expect(useBoardStore.getState().tasksById.t1).toBeUndefined());
  });

  it('shows an error for a task that no longer exists', async () => {
    server.use(http.get('/api/tasks/t1', () => HttpResponse.json({ message: 'Task not found!' }, { status: 404 })));
    open();
    expect(await screen.findByText('Task not found!')).toBeInTheDocument();
  });
});
