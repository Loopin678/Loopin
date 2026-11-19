import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { BoardTableView } from '../components/board/BoardTableView';
import { BoardInsightsView } from '../components/board/BoardInsightsView';
import { useAuth } from '../context/AuthContext';
import { useBoardStore } from '../store/boardStore';
import { listsApi, tasksApi, projectsApi, membersApi, Project, ListWithTasks, TaskSummary, TaskDetail } from '../api/client';
import { useMemberStore } from '../store/memberStore';
import { Avatar } from '../components/common/Avatar';
import { connectSocket } from '../api/socket';
import { Loader2, Plus, X, MoreHorizontal, GripVertical, Edit2, Users, Radio, Check, MessageSquare, Monitor, Trash2, Columns3, Table2, BarChart3 } from 'lucide-react';

// The board's views. The choice lives in the URL (?view=table) so it survives a refresh.
type BoardView = 'kanban' | 'table' | 'insights';
const BOARD_VIEWS: { id: BoardView; label: string; icon: React.ElementType }[] = [
  { id: 'kanban', label: 'Board', icon: Columns3 },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];
import { ConnectDesktopModal } from '../components/projects/ConnectDesktopModal';
import { useDesktopConnection, wasDesktopSetupDismissed, markDesktopSetupDismissed } from '../hooks/useDesktopConnection';
import { timeAgo } from '../utils/projectStyle';
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
import { ProjectCover } from '../components/projects/ProjectCover';
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

  const onlineUserIds = useBoardStore(state => state.onlineUserIds);
  const isAssigneeOnline = task.assigneeId ? onlineUserIds.has(task.assigneeId) : false;

  const assigneeName = useMemberStore(state =>
    task.assigneeId ? state.namesById[task.assigneeId] : undefined
  );
  const membersLoaded = useMemberStore(state => state.loaded);
  // A name we can't find after loading means the assignee has left the project
  const assigneeLabel = assigneeName ?? (membersLoaded ? 'Former member' : '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#1B1E19] border border-white/[0.06] rounded-2xl p-3.5 mb-2.5 group',
        'hover:border-[#D0E36A]/30 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(0,0,0,0.9)] transition-all duration-200',
        isDragging && 'opacity-30 border-dashed border-[#D0E36A]/40'
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-[#6E7268] hover:text-[#A1A69B] cursor-grab active:cursor-grabbing shrink-0 touch-none"
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
          className="p-1 opacity-0 group-hover:opacity-100 text-[#6E7268] hover:text-[#F4F5EF] hover:bg-[#23271F] rounded transition-all"
          title="Open task"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Title — clickable */}
      <p
        onClick={() => onOpen(task.id)}
        className="text-sm font-medium text-[#F4F5EF] leading-snug cursor-pointer hover:text-[#D0E36A] transition-colors"
      >
        {task.title}
      </p>

      {/* Assignee: avatar only, name appears on hover */}
      {task.assigneeId && (
        <div className="mt-3 flex justify-end">
          <div role="img" aria-label={assigneeLabel} className="relative shrink-0 group/assignee">
            <Avatar userId={task.assigneeId} name={assigneeName ?? '?'} size="xs" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1B1E19]",
                isAssigneeOnline
                  ? "bg-[#D0E36A] shadow-[0_0_6px_rgba(208,227,106,0.6)]"
                  : "bg-[#6E7268]"
              )}
            />

            {/* Hover pop-up, placed to the left of the avatar */}
            {assigneeLabel && (
              <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 z-20 max-w-[200px] truncate whitespace-nowrap rounded-md border border-[rgba(255,255,255,0.10)] bg-[#0B0C0A] px-2 py-1 text-[11px] text-[#F4F5EF] shadow-lg opacity-0 transition-opacity group-hover/assignee:opacity-100">
                {assigneeLabel}
                <span className={isAssigneeOnline ? 'text-[#D0E36A]' : 'text-[#6E7268]'}>
                  {' · '}{isAssigneeOnline ? 'online' : 'offline'}
                </span>
              </span>
            )}
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
  const { listsById, taskIdsByList, tasksById, updateList, removeList } = useBoardStore();
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

  // Delete list (never for To Do / Done: the server refuses those too)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteList = async () => {
    if (!projectId || !list) return;
    setDeleting(true);
    setDeleteError('');
    try {
      // DELETE /api/projects/:projectId/lists/:listId → tasks move to To Do
      const result = await listsApi.remove(projectId, list.id);
      removeList(list.id, result.movedToListId, result.movedTaskIds); // the socket echo is ignored
      setConfirmDelete(false);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Failed to delete list');
    } finally {
      setDeleting(false);
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

  const kindColors: Record<string, string> = { TODO: '#A1A69B', IN_PROGRESS: '#F59E0B', DONE: '#D0E36A' };
  const customColors = ['#A9B97A', '#7C7FE8', '#06B6D4', '#EF4444'];
  const color = (list && kindColors[list.kind]) ?? customColors[(list?.position ?? 0) % customColors.length];

  if (!list) return null;

  return (
    <div className="w-[300px] shrink-0 flex flex-col max-h-full rounded-[24px] bg-[#151713] border border-white/5 p-2.5">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-3 group/header">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }} />
          
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
                className="w-full bg-[#1B1E19] border border-[#D0E36A] rounded px-2 py-0.5 text-xs font-bold text-[#F4F5EF] focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                onDoubleClick={handleStartRename}
                className="font-display text-sm font-semibold text-[#F4F5EF] truncate cursor-pointer hover:text-[#D0E36A] transition-colors"
                title="Double click to rename list"
              >
                {list.name}
              </span>
              <button
                onClick={handleStartRename}
                className="opacity-0 group-hover/header:opacity-100 p-0.5 text-[#6E7268] hover:text-[#F4F5EF] transition-all"
                title="Rename list"
              >
                <Edit2 size={11} />
              </button>
              {list.kind !== 'TODO' && list.kind !== 'DONE' && (
                <button
                  onClick={() => { setDeleteError(''); setConfirmDelete(true); }}
                  className="opacity-0 group-hover/header:opacity-100 p-0.5 text-[#6E7268] hover:text-red-400 transition-all"
                  title="Delete list"
                  aria-label={`Delete list ${list.name}`}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          )}

          <span className="text-[11px] font-semibold text-[#A1A69B] bg-white/5 px-2 py-0.5 rounded-full shrink-0">
            {taskIds.length}
          </span>
        </div>

        <button
          onClick={() => setAddingTask(true)}
          className="w-7 h-7 flex items-center justify-center text-[#A1A69B] hover:text-[#0B0C0A] hover:bg-[#D0E36A] rounded-full transition-all shrink-0"
          title="Add task"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto custom-scrollbar rounded-[18px] px-0.5 min-h-[80px]"
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
              className="w-full bg-[#1B1E19] border border-[#D0E36A] rounded-xl px-3 py-2 text-sm text-[#F4F5EF] placeholder:text-[#6E7268] focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddTask}
                disabled={!taskTitle.trim() || adding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D0E36A] text-black text-xs font-bold rounded-full hover:bg-[#BED158] disabled:opacity-50 transition-colors"
              >
                {adding ? <Loader2 size={12} className="animate-spin" /> : null}
                Add
              </button>
              <button
                onClick={() => { setAddingTask(false); setTaskTitle(''); }}
                className="p-1.5 text-[#6E7268] hover:text-[#F4F5EF] rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className={cn(
              'w-full rounded-2xl text-xs text-[#6E7268] hover:text-[#D0E36A] transition-all flex items-center gap-1.5',
              taskIds.length === 0
                ? 'h-16 border-2 border-dashed border-white/5 hover:border-[#D0E36A]/30 justify-center'
                : 'px-3 py-2 hover:bg-white/[0.03]'
            )}
          >
            <Plus size={14} /> {taskIds.length === 0 ? 'Add first task' : 'Add task'}
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !deleting && setConfirmDelete(false)} />
          <div role="alertdialog" aria-modal="true" aria-label="Delete list" className="relative w-full max-w-sm bg-[#151713] border border-red-900/40 rounded-[24px] shadow-2xl shadow-black/60 p-6 animate-rise">
            <div className="w-11 h-11 rounded-2xl bg-red-950/50 border border-red-900/50 text-red-400 flex items-center justify-center mb-4">
              <Trash2 size={18} />
            </div>
            <h3 className="text-lg font-semibold text-[#F4F5EF]">Delete “{list.name}”?</h3>
            <p className="mt-1.5 text-sm text-[#A1A69B]">
              {taskIds.length === 0
                ? 'This list is empty. It will be removed for everyone on the project.'
                : `Its ${taskIds.length} task${taskIds.length !== 1 ? 's' : ''} will move to To Do. Nothing is deleted except the list itself.`}
            </p>
            {deleteError && (
              <div className="mt-3 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">{deleteError}</div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] hover:border-white/25 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Board Page ───────────────────────────────────────────────────────────────
export function Board() {
  const { projectId, taskId: taskIdParam } = useParams<{ projectId: string; taskId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    listOrder,
    tasksById,
    setBoard,
    clearBoard,
    moveTask,
    addList,
    updateList,
    removeList,
    addTask,
    updateTask,
    removeTask,
    onlineUserIds,
    setPresenceSnapshot,
    setUserOnline,
    setUserOffline,
    clearPresence,
  } = useBoardStore();

  const setMembers = useMemberStore(state => state.setMembers);
  const clearMembers = useMemberStore(state => state.clearMembers);
  const renameMember = useMemberStore(state => state.renameMember);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [activeTask, setActiveTask] = useState<TaskSummary | TaskDetail | null>(null);
  const [newListMode, setNewListMode] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [listError, setListError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const view: BoardView = viewParam === 'table' || viewParam === 'insights' ? viewParam : 'kanban';
  const setView = (v: BoardView) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'kanban') next.delete('view'); else next.set('view', v);
    setSearchParams(next, { replace: true });
  };

  // ── Desktop app connection (per user: has *my* desktop app sent a commit here?) ──
  const desktop = useDesktopConnection(projectId, user?.id);
  const [showDesktopSetup, setShowDesktopSetup] = useState(false);

  // The first time someone opens a project they haven't connected, walk them through
  // it. Creating a project lands here too, so new projects get the same prompt.
  // Already-connected users never see it pop up; Cancel stops it popping up again.
  useEffect(() => {
    if (!projectId || !user) return;
    if (desktop.state === 'not_connected' && !wasDesktopSetupDismissed(user.id, projectId)) {
      setShowDesktopSetup(true);
    }
  }, [desktop.state, projectId, user?.id]);

  const closeDesktopSetup = () => {
    if (user && projectId) markDesktopSetupDismissed(user.id, projectId);
    setShowDesktopSetup(false);
    desktop.refresh();
  };

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

    // Member names for the assignee labels on task cards
    const loadMembers = () => {
      membersApi.list(projectId).then(setMembers).catch(() => {});
    };
    loadMembers();

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

    // The server ignores duplicate joins and just re-sends the presence
    // snapshot, so it's safe to emit on every mount and every (re)connect.
    const join = () => socket.emit('join-project', projectId);

    const handleConnect = () => {
      setSocketConnected(true);
      join();
    };
    const handleDisconnect = () => setSocketConnected(false);
    const handleError = (data: { message: string }) => {
      console.warn('Socket error:', data.message);
    };

    // Board events (handlers must stay idempotent, the store handles that)
    const handleListCreated = (list: ListWithTasks) => addList(list);
    const handleListRenamed = (list: ListWithTasks) => updateList(list);
    const handleListDeleted = (data: { listId: string; movedToListId: string | null; movedTaskIds: string[] }) =>
      removeList(data.listId, data.movedToListId, data.movedTaskIds);
    const handleTaskCreated = (task: TaskDetail) => addTask(task);
    const handleTaskUpdated = (task: TaskDetail) => updateTask(task);
    const handleTaskMoved = (task: TaskDetail) =>
      moveTask(task.id, task.listId, task.position);
    const handleTaskDeleted = (deleted: { id: string; listId: string; projectId: string }) =>
      removeTask(deleted.id, deleted.listId);

    // Presence events
    const handlePresenceSnapshot = (data: { onlineUserIds: string[] }) => {
      setPresenceSnapshot(data?.onlineUserIds ?? []);
    };
    const handlePresenceOnline = (data: { userId: string }) => {
      if (data?.userId) setUserOnline(data.userId);
    };
    const handlePresenceOffline = (data: { userId: string }) => {
      if (data?.userId) setUserOffline(data.userId);
    };
    // Someone joined or was removed: refresh the names used on task cards
    const handleMembersChanged = (data?: { projectId?: string }) => {
      if (data?.projectId && data.projectId !== projectId) return;
      loadMembers();
    };

    // A member was removed: the server already unassigned their tasks,
    // so reload the board and the names
    const handleMemberRemoved = (data?: { projectId?: string; userId?: string }) => {
      if (data?.projectId && data.projectId !== projectId) return;
      if (data?.userId && data.userId === user?.id) return; // that's me: AppShell is already taking me away
      loadMembers();
      listsApi.list(projectId).then(setBoard).catch(console.error);
    };

    // A teammate changed their name: update the labels on task cards
    const handleProfileUpdated = (data: { userId?: string; name?: string }) => {
      if (data?.userId && data.name) renameMember(data.userId, data.name);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('list:created', handleListCreated);
    socket.on('list:renamed', handleListRenamed);
    socket.on('list:deleted', handleListDeleted);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('presence:snapshot', handlePresenceSnapshot);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('member:joined', handleMembersChanged);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('profile:updated', handleProfileUpdated);

    // Already connected (e.g. navigated here from another page)
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('list:created', handleListCreated);
      socket.off('list:renamed', handleListRenamed);
      socket.off('list:deleted', handleListDeleted);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('presence:snapshot', handlePresenceSnapshot);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('member:joined', handleMembersChanged);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('profile:updated', handleProfileUpdated);
      clearPresence();
      clearMembers();
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

  // Keep ?view=… when opening/closing a task, so closing it returns to the same view
  const viewQuery = view === 'kanban' ? '' : `?view=${view}`;

  const handleOpenTask = (taskId: string) => {
    navigate(`/projects/${projectId}/tasks/${taskId}${viewQuery}`);
  };

  const handleCloseModal = () => {
    navigate(`/projects/${projectId}${viewQuery}`);
  };

  const totalTasks = Object.keys(tasksById).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D0E36A]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#1B1E19] text-[#F4F5EF] rounded-lg text-sm border border-[rgba(255,255,255,0.08)] hover:bg-[#23271F]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Top project sub-bar */}
      <div className="px-4 md:px-6 pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-rise">
        <div className="flex items-center gap-3 min-w-0">
          {projectId && (
            <ProjectCover
              projectId={projectId}
              name={project?.name || 'Board'}
              cover={project?.cover}
              hills={false}
              className="w-11 h-11 rounded-2xl shrink-0"
              monogramClassName="absolute inset-0 flex items-center justify-center text-sm"
            />
          )}
          <div className="min-w-0">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F4F5EF] truncate">
              {project?.name || 'Board'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#6E7268]">
              <span>{totalTasks} task{totalTasks !== 1 ? 's' : ''}</span>
              {projectId && (
                <>
                  <span className="text-white/15">•</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(projectId)}
                    className="hover:text-[#D0E36A] transition-colors"
                    title="Copy Project ID"
                  >
                    Copy ID
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* View switcher */}
          <div role="tablist" aria-label="Board view" className="flex items-center gap-0.5 p-0.5 rounded-full bg-[#151713] border border-white/10">
            {BOARD_VIEWS.map(v => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors',
                  view === v.id ? 'bg-[#D0E36A] text-[#0B0C0A]' : 'text-[#A1A69B] hover:text-[#F4F5EF]'
                )}
              >
                <v.icon size={13} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          {/* Desktop app: opens the setup steps, or shows the connection once linked */}
          {desktop.state !== 'loading' && (
            <button
              type="button"
              onClick={() => setShowDesktopSetup(true)}
              title={desktop.state === 'connected' ? 'Desktop app connected. Click for details.' : 'Connect this project to the desktop app'}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
                desktop.state === 'connected'
                  ? 'text-[#A1A69B] bg-[#151713] border-white/10 hover:text-[#F4F5EF] hover:border-white/20'
                  : 'text-[#D0E36A] bg-[#D0E36A]/[0.06] border-[#D0E36A]/35 border-dashed hover:bg-[#D0E36A]/15'
              )}
            >
              <Monitor size={13} />
              {desktop.state === 'connected' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D0E36A]" />
                  <span className="font-semibold">Desktop</span>
                  {desktop.lastCommitAt && <span className="hidden md:inline text-[#6E7268]">· {timeAgo(desktop.lastCommitAt)}</span>}
                </>
              ) : (
                <span className="font-semibold">Connect desktop</span>
              )}
            </button>
          )}

          {/* Socket live status */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full border',
            socketConnected ? 'text-[#D0E36A] bg-[#D0E36A]/10 border-[#D0E36A]/25' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25'
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", socketConnected ? "bg-[#D0E36A] animate-pulse-glow" : "bg-yellow-500 animate-pulse")} />
            <span className="text-[11px] font-semibold">{socketConnected ? 'Live' : 'Connecting…'}</span>
          </div>

          <Link
            to={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151713] border border-white/10 text-[#A1A69B] hover:text-[#F4F5EF] hover:border-white/20 transition-colors"
          >
            <Users size={13} />
            <span>Members</span>
            {onlineUserIds.size > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono text-[#D0E36A] bg-[#D0E36A]/10 border border-[#D0E36A]/20"
                title={`${onlineUserIds.size} member${onlineUserIds.size > 1 ? 's' : ''} online`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D0E36A] animate-pulse" />
                {onlineUserIds.size}
              </span>
            )}
          </Link>

          <Link
            to={`/projects/${projectId}/chat`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D0E36A] text-[#0B0C0A] font-semibold hover:bg-[#BED158] transition-colors"
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </Link>
        </div>
      </div>

      {/* Faint decorative glow */}
      <div className="absolute top-10 left-1/4 right-1/4 h-40 rounded-full bg-[#D0E36A] opacity-[0.05] blur-3xl pointer-events-none" />

      {view === 'kanban' && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <div className="flex items-start gap-4 px-4 md:px-6 pb-6 h-full min-w-max">
            {listOrder.map(listId => (
              <Column key={listId} listId={listId} onOpenTask={handleOpenTask} />
            ))}

            {/* Add list column */}
            <div className="w-[300px] shrink-0">
              {newListMode ? (
                <form onSubmit={handleCreateList}>
                  <div className="bg-[#151713] border border-[#D0E36A] rounded-[24px] p-3 shadow-[0_0_20px_rgba(208,227,106,0.08)]">
                    <input
                      autoFocus
                      value={newListName}
                      onChange={e => { setNewListName(e.target.value); setListError(''); }}
                      onKeyDown={e => { if (e.key === 'Escape') { setNewListMode(false); setNewListName(''); } }}
                      placeholder="List name..."
                      className="w-full bg-[#1B1E19] border-none rounded-xl px-3 py-2 text-sm text-[#F4F5EF] placeholder:text-[#6E7268] focus:outline-none"
                    />
                    {listError && <p className="text-xs text-red-400 mt-1.5 px-1">{listError}</p>}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        disabled={creatingList || !newListName.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D0E36A] text-black text-xs font-bold rounded-full hover:bg-[#BED158] disabled:opacity-50 transition-colors"
                      >
                        {creatingList && <Loader2 size={12} className="animate-spin" />}
                        Add List
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewListMode(false); setNewListName(''); setListError(''); }}
                        className="p-1.5 text-[#6E7268] hover:text-[#F4F5EF] rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setNewListMode(true)}
                  className="group w-full flex items-center gap-2 p-4 border-2 border-dashed border-white/[0.07] rounded-[24px] text-[#6E7268] hover:text-[#D0E36A] hover:border-[#D0E36A]/35 hover:bg-[#D0E36A]/[0.03] text-sm font-medium transition-all"
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
            <div className="opacity-95 rotate-2 scale-105 shadow-2xl shadow-black/70 w-[280px]">
              <TaskCard task={activeTask} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {view === 'table' && (
        <div className="flex-1 min-h-0">
          <BoardTableView onOpenTask={handleOpenTask} />
        </div>
      )}

      {view === 'insights' && (
        <div className="flex-1 min-h-0">
          <BoardInsightsView />
        </div>
      )}

      {/* Desktop app setup */}
      {showDesktopSetup && projectId && user && (
        <ConnectDesktopModal
          projectId={projectId}
          projectName={project?.name || 'this project'}
          userId={user.id}
          onCancel={closeDesktopSetup}
          onDone={closeDesktopSetup}
        />
      )}

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