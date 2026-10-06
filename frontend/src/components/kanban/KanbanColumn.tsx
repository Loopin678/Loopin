import React, { useState } from 'react';
import { ListWithTasks, Task } from '../../types';
import { TaskCard } from './TaskCard';
import { tasksService } from '../../services/tasks';
import { listsService } from '../../services/lists';
import { Plus, MoreHorizontal, Loader2, PenLine, Trash2 } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

interface KanbanColumnProps {
  list: ListWithTasks;
  projectId: string;
  onTaskAdded: (listId: string, task: Task) => void;
  index?: number;
}

const getColumnColorClass = (index: number = 0) => {
  const colors = [
    'bg-editorial-mustard',
    'bg-editorial-coral',
    'bg-editorial-lavender',
    'bg-editorial-mint',
    'bg-editorial-cobalt text-white'
  ];
  return colors[index % colors.length];
};

export function KanbanColumn({ list, projectId, onTaskAdded, index = 0 }: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [isEditingList, setIsEditingList] = useState(false);
  const [listNameInput, setListNameInput] = useState(list.name);

  const { setNodeRef } = useSortable({
    id: list.id,
    data: {
      type: 'Column',
      list,
    },
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      const newTask = await tasksService.createTask(
        projectId,
        list.id,
        newTaskTitle.trim()
      );

      onTaskAdded(list.id, newTask);
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameList = async () => {
    if (!listNameInput.trim() || listNameInput === list.name) {
      setIsEditingList(false);
      setListNameInput(list.name);
      return;
    }
    try {
      await listsService.renameList(projectId, list.id, listNameInput.trim());
      setIsEditingList(false);
    } catch (e) {
      console.error(e);
      setListNameInput(list.name);
    }
  };

  const badgeColor = getColumnColorClass(index);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col flex-shrink-0 w-[340px] bg-white rounded-xl shadow-sm border border-black/10 overflow-hidden"
      )}
    >
      <div className={cn("h-2 w-full", badgeColor)} />
      
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 pb-2 border-b border-black/5 bg-editorial-surface group">
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          {isEditingList ? (
            <input
              autoFocus
              className="text-[15px] font-display font-bold text-[#111111] bg-white border border-editorial-cobalt rounded px-1.5 py-0.5 w-full outline-none"
              value={listNameInput}
              onChange={(e) => setListNameInput(e.target.value)}
              onBlur={handleRenameList}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameList();
                if (e.key === 'Escape') {
                  setListNameInput(list.name);
                  setIsEditingList(false);
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 
                className="text-[15px] font-display font-black tracking-wide text-[#111111] truncate cursor-pointer hover:text-editorial-cobalt transition-colors uppercase"
                onClick={() => setIsEditingList(true)}
              >
                {listNameInput}
              </h3>
              <span className="text-[10px] font-bold bg-black/5 text-black/60 px-1.5 py-0.5 rounded leading-none border border-black/5 shrink-0">
                {list.tasks.length}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="p-1 text-black/40 hover:text-[#111111] hover:bg-black/5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="top" sideOffset={5} className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg z-50">
                  Add task
                  <Tooltip.Arrow className="fill-[#111111]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          <DropdownMenu.Root>
            <Tooltip.Provider delayDuration={200}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1 text-black/40 hover:text-[#111111] hover:bg-black/5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] data-[state=open]:bg-black/5 data-[state=open]:text-[#111111]">
                      <MoreHorizontal size={18} strokeWidth={2} />
                    </button>
                  </DropdownMenu.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top" sideOffset={5} className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg z-50">
                    More actions
                    <Tooltip.Arrow className="fill-[#111111]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={5} className="w-48 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans">
                <DropdownMenu.Item onSelect={() => setIsEditingList(true)} className="flex items-center justify-between text-sm font-semibold text-[#111111] px-3 py-2 rounded-lg hover:bg-black/5 focus:bg-black/5 focus:outline-none cursor-pointer outline-none">
                  Rename list <PenLine size={16} strokeWidth={2} className="text-black/40" /> 
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-black/5 my-1" />
                <DropdownMenu.Item className="flex items-center justify-between text-sm font-semibold text-editorial-coral px-3 py-2 rounded-lg hover:bg-editorial-coral/10 focus:bg-editorial-coral/10 focus:outline-none cursor-not-allowed opacity-50 outline-none">
                  Delete Column <Trash2 size={16} strokeWidth={2} className="text-editorial-coral/50" /> 
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[50px] p-3 bg-editorial-surface/50">
        <SortableContext items={list.tasks.map(t => t.id!)} strategy={verticalListSortingStrategy}>
          {list.tasks.map((task) => (
            <TaskCard key={task.id} task={task as Task} index={index} />
          ))}
        </SortableContext>
        
        {list.tasks.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-black/5 rounded-lg text-black/40 mt-1">
            <span className="text-xs font-bold uppercase tracking-wider">Empty</span>
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleCreateTask} className="p-3 bg-white border border-black/10 rounded-xl shadow-sm mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <textarea
              autoFocus
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full text-sm font-semibold text-[#111111] bg-transparent resize-none focus:outline-none placeholder:text-black/30 placeholder:font-medium"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateTask(e);
                }
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTaskTitle('');
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-black/5">
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setNewTaskTitle('');
                }}
                className="text-xs font-bold text-black/50 hover:text-[#111111] hover:bg-black/5 px-2 py-1 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newTaskTitle.trim() || isCreating}
                className="flex items-center gap-1.5 bg-[#111111] text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-editorial-mustard hover:text-[#111111] disabled:opacity-50 transition-colors shadow-sm"
              >
                {isCreating && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
