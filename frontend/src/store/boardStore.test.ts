import { beforeEach, describe, expect, it } from 'vitest';
import { useBoardStore } from './boardStore';

const list = (id: string, position: number, tasks: { id: string; position: number }[] = []) =>
  ({ id, name: id, position, kind: 'CUSTOM', projectId: 'p', createdAt: '', tasks: tasks.map((t) => ({ ...t, title: t.id, listId: id })) }) as never;

const ids = (listId: string) => useBoardStore.getState().taskIdsByList[listId];

beforeEach(() => {
  useBoardStore.getState().clearBoard();
  useBoardStore.getState().setBoard([
    list('done', 2),
    list('todo', 0, [{ id: 'b', position: 1 }, { id: 'a', position: 0 }, { id: 'c', position: 2 }]),
    list('doing', 1, [{ id: 'x', position: 0 }]),
  ]);
});

describe('board store', () => {
  it('orders lists and tasks by position', () => {
    expect(useBoardStore.getState().listOrder).toEqual(['todo', 'doing', 'done']);
    expect(ids('todo')).toEqual(['a', 'b', 'c']);
  });

  it('moves a task within a list', () => {
    useBoardStore.getState().moveTask('a', 'todo', 2);
    expect(ids('todo')).toEqual(['b', 'c', 'a']);
  });

  it('moves a task to another list and updates its listId', () => {
    useBoardStore.getState().moveTask('b', 'doing', 0);
    expect(ids('todo')).toEqual(['a', 'c']);
    expect(ids('doing')).toEqual(['b', 'x']);
    expect((useBoardStore.getState().tasksById.b as { listId: string }).listId).toBe('doing');
  });

  it('clamps an out-of-range position to the end', () => {
    useBoardStore.getState().moveTask('a', 'done', 99);
    expect(ids('done')).toEqual(['a']);
  });

  it('ignores a duplicate task:created event (socket echo of our own create)', () => {
    const task = { id: 'n', title: 'n', position: 1, listId: 'doing' } as never;
    useBoardStore.getState().addTask(task);
    useBoardStore.getState().addTask(task);
    expect(ids('doing')).toEqual(['x', 'n']);
  });

  it('ignores tasks for lists it does not know', () => {
    useBoardStore.getState().addTask({ id: 'z', title: 'z', position: 0, listId: 'nope' } as never);
    expect(useBoardStore.getState().tasksById.z).toBeUndefined();
  });

  it('removes a task even when the given list id is stale', () => {
    useBoardStore.getState().removeTask('c', 'wrong-list');
    expect(ids('todo')).toEqual(['a', 'b']);
    expect(useBoardStore.getState().tasksById.c).toBeUndefined();
  });

  it('adds a list in position order, only once', () => {
    useBoardStore.getState().addList(list('review', 1.5));
    useBoardStore.getState().addList(list('review', 1.5));
    expect(useBoardStore.getState().listOrder).toEqual(['todo', 'doing', 'review', 'done']);
  });

  it('tracks presence', () => {
    const s = useBoardStore.getState();
    s.setPresenceSnapshot(['u1']);
    s.setUserOnline('u2');
    s.setUserOffline('u1');
    expect([...useBoardStore.getState().onlineUserIds]).toEqual(['u2']);
  });
});
