import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Filter, ArrowUpDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BoardFilterSortProps {
  activeFiltersCount?: number;
}

export function BoardFilterSort({ activeFiltersCount = 0 }: BoardFilterSortProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* FILTER */}
      <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
        <Popover.Trigger asChild>
          <button className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#111111]",
            activeFiltersCount > 0 
              ? "border-editorial-cobalt text-editorial-cobalt bg-editorial-cobalt/5 hover:bg-editorial-cobalt/10" 
              : "border-black/10 text-black/60 hover:bg-black/5 hover:text-[#111111]"
          )}>
            <Filter size={16} strokeWidth={2} /> 
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded bg-editorial-cobalt text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className="w-[240px] bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans">
            <div className="px-3 py-2 border-b border-black/5 mb-1">
              <h4 className="font-display text-sm font-bold text-[#111111]">Filter</h4>
            </div>
            
            <div className="px-2 py-1">
              <h5 className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1 px-1 mt-1">Tags (Stack)</h5>
              {/* Fake options for UI architecture since we don't have dynamic distinct tags list easily available here */}
              <button className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-black/50 hover:bg-black/5 transition-colors opacity-50 cursor-not-allowed" title="Coming soon">
                Select tags...
                <span className="text-[9px] bg-black/10 text-black/60 px-1.5 rounded-sm uppercase tracking-wide">Soon</span>
              </button>
            </div>

            <div className="px-2 py-1">
              <h5 className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1 px-1 mt-1">Assignee</h5>
              <button className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-black/50 hover:bg-black/5 transition-colors opacity-50 cursor-not-allowed" title="Coming soon">
                Select assignee...
                <span className="text-[9px] bg-black/10 text-black/60 px-1.5 rounded-sm uppercase tracking-wide">Soon</span>
              </button>
            </div>

            <div className="px-2 py-1 opacity-40 grayscale pointer-events-none">
              <h5 className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1 px-1 mt-1">Priority</h5>
              <div className="text-[10px] font-semibold text-black/50 px-1">Not supported by backend</div>
            </div>
            <div className="px-2 py-1 opacity-40 grayscale pointer-events-none">
              <h5 className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1 px-1 mt-1">Due Date</h5>
              <div className="text-[10px] font-semibold text-black/50 px-1">Not supported by backend</div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* SORT */}
      <Popover.Root open={sortOpen} onOpenChange={setSortOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black/60 bg-white border border-black/10 rounded-lg hover:bg-black/5 hover:text-[#111111] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#111111]">
            <ArrowUpDown size={16} strokeWidth={2} /> 
            <span>Sort</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className="w-[200px] bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans">
            <div className="px-3 py-2 border-b border-black/5 mb-1">
              <h4 className="font-display text-sm font-bold text-[#111111]">Sort by</h4>
            </div>
            <button className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-black/50 hover:bg-black/5 transition-colors opacity-50 cursor-not-allowed" title="Coming soon">
              Created Date
              <span className="text-[9px] bg-black/10 text-black/60 px-1.5 rounded-sm uppercase tracking-wide">Soon</span>
            </button>
            <div className="px-3 py-1.5 opacity-40 grayscale pointer-events-none flex items-center justify-between w-full text-left rounded-lg text-sm font-semibold text-black/50">
              Priority
              <span className="text-[9px] bg-black/10 text-black/60 px-1.5 rounded-sm uppercase tracking-wide leading-none">Unsupported</span>
            </div>
            <div className="px-3 py-1.5 opacity-40 grayscale pointer-events-none flex items-center justify-between w-full text-left rounded-lg text-sm font-semibold text-black/50">
              Due Date
              <span className="text-[9px] bg-black/10 text-black/60 px-1.5 rounded-sm uppercase tracking-wide leading-none">Unsupported</span>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
