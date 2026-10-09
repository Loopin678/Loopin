import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardStore } from '../store/boardStore';
import { listsApi, tasksApi, projectsApi, Project, ListWithTasks, TaskSummary, TaskDetail } from '../api/client';
import { connectSocket } from '../api/socket';
import { Loader2, Plus, X, MoreHorizontal, GripVertical, Edit2, Users, Radio, Check, MessageSquare } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../utils/cn';
import { TaskModal } from '../components/board/TaskModal';

// ─── Task Card ───────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onOpen,
}: {
  task: TaskSummary | TaskDetail;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const hash = (task.stack ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#161A1F] border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 mb-2.5 group',
        'hover:border-[rgba(255,255,255,0.12)] hover:shadow-lg transition-all',
        isDragging && 'opacity-30 border-dashed border-[#5EE6B0]/40'
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-[#5B616A] hover:text-[#8A9099] cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          <GripVertical size={14} />
        </button>

        {/* Stack chip */}
        {task.stack ? (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0"
            style={{
              backgroundColor: `hsla(${hue}, 70%, 60%, 0.12)`,
              color: `hsl(${hue}, 70%, 65%)`,
            }}
          >
            {task.stack}
          </span>
        ) : (
          <div />
        )}

        <div className="flex-1" />

        {/* Open task button */}
        <button
          onClick={() => onOpen(task.id)}
          className="p-1 opacity-0 group-hover:opacity-100 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#1C2127] rounded transition-all"
          title="Open task"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Title — clickable */}
      <p
        onClick={() => onOpen(task.id)}
        className="text-sm font-medium text-[#ECEAE4] leading-snug cursor-pointer hover:text-[#5EE6B0] transition-colors"
      >
        {task.title}
      </p>

      {/* Assignee avatar */}
      {task.assigneeId && (
        <div className="mt-3 flex justify-end">
          <div
            className="w-6 h-6 rounded-full bg-[#1C2127] border border-[rgba(255,255,255,0.10)] flex items-center justify-center text-[10px] font-bold text-[#8A9099]"
            title={task.assigneeId}
          >
            {task.assigneeId.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column (Droppable + Sortable) ───────────────────────────────────────────
function Column({
  listId,
  onOpenTask,
}: {
  listId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const { listsById, taskIdsByList, tasksById, updateList } = useBoardStore();
  const { projectId } = useParams<{ projectId: string }>();

  const list = listsById[listId];
  const taskIds = taskIdsByList[listId] ?? [];

  const { setNodeRef } = useDroppable({ id: listId, data: { type: 'list', listId } });

  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // List rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTask) inputRef.current?.focus();
  }, [addingTask]);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const handleStartRename = () => {
    if (!list) return;
    setNameInput(list.name);
    setIsRenaming(true);
  };

  const handleSaveRename = async () => {
    if (!nameInput.trim() || !projectId || !list) {
      setIsRenaming(false);
      return;
    }
    if (nameInput.trim() === list.name) {
      setIsRenaming(false);
      return;
    }
    setRenameLoading(true);
    try {
      // PATCH /api/projects/:projectId/lists/:listId { name }
      const updated = await listsApi.rename(projectId, list.id, { name: nameInput.trim() });
      updateList(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to rename list');
    } finally {
      setRenameLoading(false);
      setIsRenaming(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !projectId || !list) return;
    setAdding(true);
    try {
      // POST /api/projects/:projectId/tasks { title, listId }
      await tasksApi.create(projectId, { title: taskTitle.trim(), listId: list.id });
      setTaskTitle('');
      // Task will arrive via socket 'task:created'
    } catch (err: any) {
      console.error('Create task error:', err.message);
    } finally {
      setAdding(false);
      setAddingTask(false);
    }
  };

  const statusColors = ['#8A9099', '#7C7FE8', '#5EE6B0', '#F59E0B', '#EF4444', '#06B6D4'];
  const color = statusColors[list?.position % statusColors.length] ?? '#8A9099';

  if (!list) return null;

  return (
    <div className="w-72 shrink-0 flex flex-col max-h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1 group/header">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          
          {isRenaming ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={renameInputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                disabled={renameLoading}
                className="w-full bg-[#161A1F] border border-[#5EE6B0] rounded px-2 py-0.5 text-xs font-bold text-[#ECEAE4] focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                onDoubleClick={handleStartRename}
                className="text-xs font-bold text-[#ECEAE4] uppercase tracking-wider truncate cursor-pointer hover:text-[#5EE6B0] transition-colors"
                title="Double click to rename list"
              >
                {list.name}
              </span>
              <button
                onClick={handleStartRename}
                className="opacity-0 group-hover/header:opacity-100 p-0.5 text-[#5B616A] hover:text-[#ECEAE4] transition-all"
                title="Rename list"
              >
                <Edit2 size={11} />
              </button>
            </div>
          )}

          <span className="text-xs font-mono text-[#5B616A] bg-[#161A1F] px-1.5 py-0.5 rounded shrink-0">
            {taskIds.length}
          </span>
        </div>

        <button
          onClick={() => setAddingTask(true)}
          className="p-1 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#161A1F] rounded-lg transition-all shrink-0"
          title="Add task"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 min-h-[80px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map(id => {
            const task = tasksById[id];
            return task ? <TaskCard key={id} task={task} onOpen={onOpenTask} /> : null;
          })}
        </SortableContext>

        {/* Add task inline */}
        {addingTask ? (
          <div className="mt-1">
            <input
              ref={inputRef}
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setAddingTask(false); setTaskTitle(''); }
              }}
              disabled={adding}
              placeholder="Task title..."
              className="w-full bg-[#161A1F] border border-[#5EE6B0] rounded-xl px-3 py-2 text-sm text-[#ECEAE4] placeholder:text-[#5B616A] focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddTask}
                disabled={!taskTitle.trim() || adding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5EE6B0] text-black text-xs font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
              >
                {adding ? <Loader2 size={12} className="animate-spin" /> : null}
                Add
              </button>
              <button
                onClick={() => { setAddingTask(false); setTaskTitle(''); }}
                className="p-1.5 text-[#5B616A] hover:text-[#ECEAE4] rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : taskIds.length === 0 ? (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full h-16 border-2 border-dashed border-[rgba(255,255,255,0.05)] rounded-xl text-xs text-[#5B616A] hover:text-[#8A9099] hover:border-[rgba(255,255,255,0.10)] transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add first task
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Board Page ───────────────────────────────────────────────────────────────
export function Board() {
  const { projectId, taskId: taskIdParam } = useParams<{ projectId: string; taskId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { listOrder, tasksById, setBoard, clearBoard, moveTask, addList, updateList, addTask, updateTask, removeTask } =
    useBoardStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [activeTask, setActiveTask] = useState<TaskSummary | TaskDetail | null>(null);
  const [newListMode, setNewListMode] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [listError, setListError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // Active task modal state
  const [modalTaskId, setModalTaskId] = useState<string | null>(taskIdParam ?? null);

  useEffect(() => {
    setModalTaskId(taskIdParam ?? null);
  }, [taskIdParam]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError('');

    // Fetch project details for header
    projectsApi.get(projectId).then(setProject).catch(() => {});

    // 1. Load board lists & tasks
    listsApi
      .list(projectId)
      .then(lists => {
        setBoard(lists);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to load board');
        setLoading(false);
      });

    // 2. Connect socket (already authenticated via cookie)
    const socket = connectSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit('join-project', projectId);
    };

    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('error', (data: { message: string }) => {
      console.warn('Socket error:', data.message);
    });

    // Socket event handlers (idempotent - handled by store)
    socket.on('list:created', (list: ListWithTasks) => addList(list));
    socket.on('list:renamed', (list: ListWithTasks) => updateList(list));
    socket.on('task:created', (task: TaskDetail) => addTask(task));
    socket.on('task:updated', (task: TaskDetail) => updateTask(task));
    socket.on('task:moved', (task: TaskDetail) => {
      moveTask(task.id, task.listId, task.position);
    });
    socket.on('task:deleted', (deleted: { id: string; listId: string; projectId: string }) => {
      removeTask(deleted.id, deleted.listId);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect');
      socket.off('error');
      socket.off('list:created');
      socket.off('list:renamed');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      clearBoard();
    };
  }, [projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasksById[event.active.id as string];
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !projectId) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const store = useBoardStore.getState();
    const task = store.tasksById[activeId];
    if (!task) return;

    // Find destination
    let destListId: string;
    let destIndex: number;

    const overTask = store.tasksById[overId];
    if (overTask) {
      // Dropped over another task — find its list
      destListId =
        Object.keys(store.taskIdsByList).find(lId => store.taskIdsByList[lId].includes(overId)) ?? '';
      destIndex = store.taskIdsByList[destListId]?.indexOf(overId) ?? 0;
    } else {
      // Dropped over a list (droppable)
      destListId = overId;
      destIndex = store.taskIdsByList[destListId]?.length ?? 0;
    }

    if (!destListId) return;

    // Optimistic move
    moveTask(activeId, destListId, destIndex);

    try {
      // PATCH /api/tasks/:taskId/move { newListId, newPosition }
      await tasksApi.move(activeId, { newListId: destListId, newPosition: destIndex });
    } catch (err) {
      console.error('Move task failed:', err);
      // Reload board to recover
      listsApi.list(projectId).then(setBoard).catch(console.error);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !projectId) return;
    setCreatingList(true);
    setListError('');
    try {
      // POST /api/projects/:projectId/lists { name }
      // 409 if duplicate name
      await listsApi.create(projectId, { name: newListName.trim() });
      setNewListName('');
      setNewListMode(false);
      // List arrives via socket 'list:created'
    } catch (err: any) {
      if (err.status === 409) {
        setListError('A list with that name already exists');
      } else {
        setListError(err.message || 'Failed to create list');
      }
    } finally {
      setCreatingList(false);
    }
  };

  const handleOpenTask = (taskId: string) => {
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  const handleCloseModal = () => {
    navigate(`/projects/${projectId}`);
  };

  const totalTasks = Object.keys(tasksById).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#161A1F] text-[#ECEAE4] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#1C2127]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Top project sub-bar */}
      <div className="h-12 border-b border-[rgba(255,255,255,0.06)] bg-[#111418]/60 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-[#ECEAE4] truncate">
            {project?.name || 'Board'}
          </h2>
          <span className="text-xs text-[#5B616A] font-mono">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Socket live status */}
          <div className="flex items-center gap-1.5 text-[#5B616A]">
            <div className={cn("w-1.5 h-1.5 rounded-full", socketConnected ? "bg-[#5EE6B0] shadow-[0_0_8px_#5EE6B0]" : "bg-yellow-500")} />
            <span className="text-[11px] font-mono">{socketConnected ? 'Live' : 'Connecting...'}</span>
          </div>

          <Link
            to={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
          >
            <Users size={13} />
            <span>Members</span>
          </Link>

          <Link
            to={`/projects/${projectId}/chat`}
            className="flex items-center gap-1.5 text-[#8A9099] hover:text-[#5EE6B0] transition-colors"
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </Link>
        </div>
      </div>

      {/* Faint decorative glow */}
      <div className="absolute top-12 left-0 right-0 h-24 bg-[#5EE6B0] opacity-[0.015] blur-3xl pointer-events-none" />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <div className="flex items-start gap-5 p-6 h-full min-w-max">
            {listOrder.map(listId => (
              <Column key={listId} listId={listId} onOpenTask={handleOpenTask} />
            ))}

            {/* Add list column */}
            <div className="w-72 shrink-0">
              {newListMode ? (
                <form onSubmit={handleCreateList}>
                  <div className="bg-[#111418] border border-[#5EE6B0] rounded-2xl p-3 shadow-[0_0_20px_rgba(94,230,176,0.08)]">
                    <input
                      autoFocus
                      value={newListName}
                      onChange={e => { setNewListName(e.target.value); setListError(''); }}
                      onKeyDown={e => { if (e.key === 'Escape') { setNewListMode(false); setNewListName(''); } }}
                      placeholder="List name..."
                      className="w-full bg-[#161A1F] border-none rounded-xl px-3 py-2 text-sm text-[#ECEAE4] placeholder:text-[#5B616A] focus:outline-none"
                    />
                    {listError && <p className="text-xs text-red-400 mt-1.5 px-1">{listError}</p>}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        disabled={creatingList || !newListName.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5EE6B0] text-black text-xs font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
                      >
                        {creatingList && <Loader2 size={12} className="animate-spin" />}
                        Add List
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewListMode(false); setNewListName(''); setListError(''); }}
                        className="p-1.5 text-[#5B616A] hover:text-[#ECEAE4] rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setNewListMode(true)}
                  className="w-full flex items-center gap-2 p-4 border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#5B616A] hover:text-[#8A9099] hover:border-[rgba(255,255,255,0.10)] text-sm font-medium transition-all"
                >
                  <Plus size={16} /> Add List
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.3' } } }),
          }}
        >
          {activeTask ? (
            <div className="opacity-90 rotate-1 scale-105 shadow-2xl w-72">
              <TaskCard task={activeTask} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {modalTaskId && (
        <TaskModal
          taskId={modalTaskId}
          projectId={projectId!}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}