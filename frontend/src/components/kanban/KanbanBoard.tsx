import React, { useState } from 'react';
import { ListWithTasks, Task } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { tasksService } from '../../services/tasks';
import { listsService } from '../../services/lists';
import { Plus, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  projectId: string;
  lists: ListWithTasks[];
  setLists: React.Dispatch<React.SetStateAction<ListWithTasks[]>>;
}

export function KanbanBoard({ projectId, lists, setLists }: KanbanBoardProps) {
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleTaskAdded = (listId: string, task: Task) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return { ...list, tasks: [...list.tasks, task] };
      }
      return list;
    }));
  };

  const handleListAdded = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setIsCreatingList(true);
    try {
      const newList = await listsService.createList(projectId, newListName);
      setLists([...lists, { ...newList, tasks: [] }]);
      setNewListName('');
      setIsAddingList(false);
    } catch (error) {
      console.error('Failed to create list', error);
    } finally {
      setIsCreatingList(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    for (const list of lists) {
      const task = list.tasks.find(t => t.id === active.id);
      if (task) {
        setActiveTask(task as Task);
        return;
      }
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    setLists((prevLists) => {
      const activeListIndex = prevLists.findIndex(l => l.tasks.some(t => t.id === activeId));
      let overListIndex = -1;

      if (isOverTask) {
        overListIndex = prevLists.findIndex(l => l.tasks.some(t => t.id === overId));
      } else if (isOverColumn) {
        overListIndex = prevLists.findIndex(l => l.id === overId);
      }

      if (activeListIndex === -1 || overListIndex === -1) return prevLists;

      const activeList = prevLists[activeListIndex];
      const overList = prevLists[overListIndex];

      if (activeList.id !== overList.id) {
        const activeTaskIndex = activeList.tasks.findIndex(t => t.id === activeId);
        const overTaskIndex = isOverTask ? overList.tasks.findIndex(t => t.id === overId) : overList.tasks.length;
        
        const newLists = [...prevLists];
        const taskToMove = { ...activeList.tasks[activeTaskIndex], listId: overList.id };
        
        newLists[activeListIndex] = {
          ...activeList,
          tasks: activeList.tasks.filter(t => t.id !== activeId)
        };
        
        const newOverTasks = [...overList.tasks];
        newOverTasks.splice(overTaskIndex, 0, taskToMove);
        newLists[overListIndex] = {
          ...overList,
          tasks: newOverTasks
        };
        
        return newLists;
      }
      return prevLists;
    });
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const isActiveTask = active.data.current?.type === 'Task';
    
    if (isActiveTask) {
      const activeList = lists.find(l => l.tasks.some(t => t.id === activeId));
      if (!activeList) return;
      const activeTaskIndex = activeList.tasks.findIndex(t => t.id === activeId);
      try {
        await tasksService.moveTask(activeId, activeList.id, activeTaskIndex);
      } catch (error) {
        console.error('Failed to persist task move', error);
      }
    }
  };

  const listIds = lists.map(l => l.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="absolute inset-0 overflow-x-auto overflow-y-hidden p-6 flex gap-5 custom-scrollbar items-start">
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {lists.map((list, index) => (
            <KanbanColumn 
              key={list.id} 
              list={list} 
              projectId={projectId} 
              onTaskAdded={handleTaskAdded}
              index={index}
            />
          ))}
        </SortableContext>

        {/* Add List Block */}
        <div className="flex-shrink-0 w-[340px]">
          {isAddingList ? (
            <form onSubmit={handleListAdded} className="p-3 bg-white border border-black/10 rounded-xl shadow-sm">
              <input
                autoFocus
                type="text"
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-3 py-2 bg-editorial-surface border border-black/10 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all font-semibold text-[#111111] placeholder:text-black/40"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddingList(false)} className="text-sm px-3 py-1.5 font-bold text-black/50 hover:bg-black/5 hover:text-[#111111] rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isCreatingList} className="flex items-center gap-2 text-sm px-4 py-1.5 bg-[#111111] text-white font-bold rounded-lg shadow-sm hover:bg-editorial-mint hover:text-[#111111] transition-colors disabled:opacity-70">
                  {isCreatingList ? <Loader2 size={14} className="animate-spin" /> : 'Create List'}
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsAddingList(true)}
              className="flex items-center justify-center gap-2 w-full h-[100px] rounded-xl border-2 border-dashed border-black/15 text-black/50 hover:text-[#111111] hover:border-editorial-cobalt hover:bg-editorial-cobalt/5 transition-all duration-200 bg-transparent group"
            >
              <Plus size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
              <span className="font-display font-bold text-sm tracking-wide">Add another list</span>
            </button>
          )}
        </div>
      </div>
      
      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        }}
      >
        {activeId && activeTask ? (
          <TaskCard task={activeTask} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
