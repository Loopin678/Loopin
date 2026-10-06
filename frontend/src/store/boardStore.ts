import { create } from 'zustand';
import { ListWithTasks, TaskSummary, TaskDetail } from '../api/client';

export type AnyTask = TaskSummary | TaskDetail;

export interface BoardState {
  listsById: Record<string, Omit<ListWithTasks, 'tasks'>>;
  listOrder: string[];
  tasksById: Record<string, AnyTask>;
  taskIdsByList: Record<string, string[]>;

  setBoard: (lists: ListWithTasks[]) => void;
  clearBoard: () => void;

  addList: (list: ListWithTasks | Omit<ListWithTasks, 'tasks'>) => void;
  updateList: (list: Partial<ListWithTasks> & { id: string }) => void;

  addTask: (task: AnyTask) => void;
  updateTask: (task: Partial<TaskDetail> & { id: string }) => void;
  moveTask: (taskId: string, newListId: string, newPosition: number) => void;
  removeTask: (taskId: string, listId: string) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  listsById: {},
  listOrder: [],
  tasksById: {},
  taskIdsByList: {},

  setBoard: (lists) => {
    const listsById: Record<string, Omit<ListWithTasks, 'tasks'>> = {};
    const tasksById: Record<string, AnyTask> = {};
    const taskIdsByList: Record<string, string[]> = {};

    const sorted = [...lists].sort((a, b) => a.position - b.position);
    const listOrder = sorted.map(l => l.id);

    sorted.forEach(list => {
      const { tasks, ...listMeta } = list;
      listsById[list.id] = listMeta;

      const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
      taskIdsByList[list.id] = sortedTasks.map(t => t.id);
      sortedTasks.forEach(t => { tasksById[t.id] = t; });
    });

    set({ listsById, listOrder, tasksById, taskIdsByList });
  },

  clearBoard: () => {
    set({ listsById: {}, listOrder: [], tasksById: {}, taskIdsByList: {} });
  },

  addList: (listInput) => {
    set(state => {
      if (state.listsById[listInput.id]) return state; // idempotent

      const { tasks: _tasks, ...listMeta } = listInput as ListWithTasks;
      const newListsById = { ...state.listsById, [listMeta.id]: listMeta };
      const newListOrder = [...state.listOrder, listMeta.id].sort(
        (a, b) => (newListsById[a]?.position ?? 0) - (newListsById[b]?.position ?? 0)
      );

      // If tasks were included (from socket), add them too
      const newTasksById = { ...state.tasksById };
      const newTaskIdsByList = {
        ...state.taskIdsByList,
        [listMeta.id]: [] as string[],
      };
      if (_tasks?.length) {
        _tasks.sort((a, b) => a.position - b.position).forEach(t => {
          newTasksById[t.id] = t;
          newTaskIdsByList[listMeta.id].push(t.id);
        });
      }

      return {
        listsById: newListsById,
        listOrder: newListOrder,
        tasksById: newTasksById,
        taskIdsByList: newTaskIdsByList,
      };
    });
  },

  updateList: (update) => {
    set(state => {
      const existing = state.listsById[update.id];
      if (!existing) return state;
      return {
        listsById: { ...state.listsById, [update.id]: { ...existing, ...update } },
      };
    });
  },

  addTask: (task) => {
    set(state => {
      if (state.tasksById[task.id]) return state; // idempotent

      const listId = (task as any).listId as string;
      if (!listId || !(listId in state.taskIdsByList)) return state;

      const newTasksById = { ...state.tasksById, [task.id]: task };
      const currentIds = [...(state.taskIdsByList[listId] ?? [])];

      // Insert at correct position
      const pos = task.position;
      const insertAt = Math.min(pos, currentIds.length);
      currentIds.splice(insertAt, 0, task.id);

      return {
        tasksById: newTasksById,
        taskIdsByList: { ...state.taskIdsByList, [listId]: currentIds },
      };
    });
  },

  updateTask: (update) => {
    set(state => {
      const existing = state.tasksById[update.id];
      if (!existing) return state;
      return {
        tasksById: { ...state.tasksById, [update.id]: { ...existing, ...update } },
      };
    });
  },

  moveTask: (taskId, newListId, newPosition) => {
    set(state => {
      const task = state.tasksById[taskId];
      if (!task) return state;

      // Find old list
      const oldListId = Object.keys(state.taskIdsByList).find(lId =>
        state.taskIdsByList[lId].includes(taskId)
      );

      const newTaskIdsByList = { ...state.taskIdsByList };

      // Remove from old list
      if (oldListId) {
        newTaskIdsByList[oldListId] = newTaskIdsByList[oldListId].filter(id => id !== taskId);
      }

      // Add to new list at newPosition
      const destList = [...(newTaskIdsByList[newListId] ?? [])];
      const clampedPos = Math.min(Math.max(0, newPosition), destList.length);
      destList.splice(clampedPos, 0, taskId);
      newTaskIdsByList[newListId] = destList;

      // Update task's listId in local state
      const updatedTask = { ...task, listId: newListId, position: newPosition };

      return {
        taskIdsByList: newTaskIdsByList,
        tasksById: { ...state.tasksById, [taskId]: updatedTask },
      };
    });
  },

  removeTask: (taskId, listId) => {
    set(state => {
      const newTasksById = { ...state.tasksById };
      delete newTasksById[taskId];

      const newTaskIdsByList = { ...state.taskIdsByList };

      // Try given listId first, then search all lists
      if (listId && newTaskIdsByList[listId]) {
        newTaskIdsByList[listId] = newTaskIdsByList[listId].filter(id => id !== taskId);
      } else {
        Object.keys(newTaskIdsByList).forEach(lId => {
          newTaskIdsByList[lId] = newTaskIdsByList[lId].filter(id => id !== taskId);
        });
      }

      return { tasksById: newTasksById, taskIdsByList: newTaskIdsByList };
    });
  },
}));
