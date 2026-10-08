import React from 'react';
import { Task } from '../../types';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

interface TaskCardProps {
  task: Partial<Task>;
  isOverlay?: boolean;
  index?: number;
}

const getCardColorIndicator = (index: number = 0) => {
  const colors = [
    'bg-editorial-mustard',
    'bg-editorial-coral',
    'bg-editorial-lavender',
    'bg-editorial-mint',
    'bg-editorial-cobalt'
  ];
  return colors[index % colors.length];
};

export function TaskCard({ task, isOverlay, index = 0 }: TaskCardProps) {
  const navigate = useNavigate();

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id as string,
    data: {
      type: 'Task',
      task,
    }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const colorIndicator = getCardColorIndicator(index);

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="h-24 bg-black/5 border-2 border-dashed border-black/15 rounded-xl opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white p-3 rounded-xl border transition-all duration-200 flex flex-col gap-2 text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-[#111111] overflow-hidden",
        isOverlay 
          ? "border-black/20 shadow-xl shadow-black/10 rotate-2 cursor-grabbing scale-[1.02]" 
          : "border-black/10 shadow-sm hover:shadow-md hover:shadow-black/5 hover:border-black/20 hover:-translate-y-0.5 cursor-pointer"
      )}
      onClick={() => navigate(`tasks/${task.id}`)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`tasks/${task.id}`);
      }}
    >
      {/* Editorial Colored Edge Marker */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-80", colorIndicator)} />

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity z-10 bg-white/80 backdrop-blur-sm rounded-md px-0.5 py-0.5 shadow-sm border border-black/5">
        <button 
          className="p-1 text-black/40 hover:bg-black/5 hover:text-[#111111] rounded transition-colors cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} strokeWidth={2} />
        </button>
        
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button 
              className="p-1 text-black/40 hover:bg-black/5 hover:text-[#111111] rounded transition-colors focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={5} className="w-40 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans">
              <DropdownMenu.Item className="text-xs font-bold text-[#111111] px-2 py-1.5 rounded-lg hover:bg-black/5 focus:bg-black/5 outline-none cursor-pointer">
                Edit Task
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-black/5 my-1" />
              <DropdownMenu.Item className="text-xs font-bold text-editorial-coral px-2 py-1.5 rounded-lg hover:bg-editorial-coral/10 focus:bg-editorial-coral/10 outline-none cursor-pointer">
                Delete Task
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* TOP metadata - Tags if any */}
      {task.stack && (
        <div className="flex flex-wrap gap-1.5 pr-12 pl-2 relative z-0">
          <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-black/60 bg-black/5 border border-black/10">
            {task.stack}
          </span>
        </div>
      )}

      {/* MIDDLE - Title and Description */}
      <div className={cn("flex flex-col pl-2", task.stack ? "mt-0.5" : "pr-12")}>
        <p className="text-[14px] font-display font-bold text-[#111111] leading-snug line-clamp-2">
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] font-medium text-black/50 mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>
      
      {/* BOTTOM metadata */}
      {(task.assigneeId) && (
        <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2 pl-2">
          <div className="flex items-center gap-2">
            {/* Future extension point */}
          </div>
          
          <div className="flex items-center shrink-0">
            {task.assigneeId && (
              <Tooltip.Provider delayDuration={200}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className="w-[22px] h-[22px] rounded-full bg-editorial-mustard border-2 border-white flex items-center justify-center text-[#111111] text-[10px] font-bold shadow-sm">
                      {task.assigneeId.charAt(0).toUpperCase()}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content side="top" sideOffset={4} className="px-2 py-1 bg-[#111111] text-[10px] font-bold text-white rounded shadow-lg z-50">
                      Assigned to {task.assigneeId}
                      <Tooltip.Arrow className="fill-[#111111]" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
