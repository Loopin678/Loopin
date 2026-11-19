import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { useBoardStore, AnyTask } from '../../store/boardStore';
import { useMemberStore } from '../../store/memberStore';
import { Avatar } from '../common/Avatar';
import { cn } from '../../utils/cn';
import { KIND_COLORS, dueInfo, priorityRank, priorityLabel } from './boardViewData';

type SortKey = 'title' | 'list' | 'assignee' | 'priority' | 'due' | 'updated';

interface Row {
  task: AnyTask & { priority?: string | null; dueDate?: string | null; updatedAt?: string };
  listName: string;
  listKind: string;
  listPos: number;
  assignee: string | null;
}

// Every task in one sortable, searchable table: good for scanning lots of work at once.
export function BoardTableView({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { listsById, listOrder, taskIdsByList, tasksById } = useBoardStore();
  const namesById = useMemberStore(s => s.namesById);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'list', dir: 1 });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    listOrder.forEach((listId, listPos) => {
      const list = listsById[listId];
      if (!list) return;
      for (const id of taskIdsByList[listId] ?? []) {
        const task = tasksById[id];
        if (!task) continue;
        out.push({
          task: task as Row['task'],
          listName: list.name,
          listKind: list.kind,
          listPos,
          assignee: task.assigneeId ? namesById[task.assigneeId] ?? 'Former member' : null,
        });
      }
    });
    return out;
  }, [listsById, listOrder, taskIdsByList, tasksById, namesById]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r =>
          r.task.title.toLowerCase().includes(q) ||
          r.listName.toLowerCase().includes(q) ||
          (r.assignee ?? '').toLowerCase().includes(q) ||
          (r.task.stack ?? '').toLowerCase().includes(q)
        )
      : rows;

    const cmp = (a: Row, b: Row): number => {
      switch (sort.key) {
        case 'title': return a.task.title.localeCompare(b.task.title);
        case 'list': return a.listPos - b.listPos || a.task.position - b.task.position;
        case 'assignee': return (a.assignee ?? '￿').localeCompare(b.assignee ?? '￿');
        case 'priority': return priorityRank(a.task.priority) - priorityRank(b.task.priority);
        case 'due': {
          const da = dueInfo(a.task.dueDate).time ?? Infinity;
          const db = dueInfo(b.task.dueDate).time ?? Infinity;
          return da - db;
        }
        case 'updated': {
          const ua = a.task.updatedAt ? new Date(a.task.updatedAt).getTime() : 0;
          const ub = b.task.updatedAt ? new Date(b.task.updatedAt).getTime() : 0;
          return ub - ua;
        }
      }
    };
    return [...filtered].sort((a, b) => cmp(a, b) * sort.dir);
  }, [rows, query, sort]);

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th className={cn('px-4 py-3 text-left font-medium', className)}>
        <button
          onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
          className={cn('inline-flex items-center gap-1.5 transition-colors', active ? 'text-[#D0E36A]' : 'hover:text-white')}
          aria-label={`Sort by ${label}`}
        >
          {label} <Icon size={12} className={active ? '' : 'opacity-40'} />
        </button>
      </th>
    );
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 md:px-6 pb-6 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7268]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter tasks, lists, people…"
            className="w-full pl-9 pr-4 py-2 rounded-full bg-[#151713] border border-white/10 text-sm text-white placeholder:text-[#6E7268] focus:outline-none focus:border-[#D0E36A]/60 transition-colors"
          />
        </div>
        <span className="text-xs text-[#6E7268]">
          {visible.length} of {rows.length} task{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="rounded-[20px] border border-white/5 bg-[#151713] overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-xs text-[#A1A69B] border-b border-white/5">
            <tr>
              {header('title', 'Task', 'w-[34%]')}
              {header('list', 'List')}
              {header('assignee', 'Assignee')}
              {header('priority', 'Priority')}
              {header('due', 'Due')}
              {header('updated', 'Updated')}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const due = dueInfo(r.task.dueDate);
              const overdue = due.time !== null && due.time < Date.now() && r.listKind !== 'DONE';
              return (
                <tr
                  key={r.task.id}
                  onClick={() => onOpenTask(r.task.id)}
                  className="border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={cn('font-medium', r.listKind === 'DONE' ? 'text-[#6E7268] line-through' : 'text-[#F4F5EF]')}>
                      {r.task.title}
                    </span>
                    {r.task.stack && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[#6E7268]">{r.task.stack}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-[#A1A69B]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: KIND_COLORS[r.listKind] }} />
                      {r.listName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.assignee ? (
                      <span className="inline-flex items-center gap-2 text-[#F4F5EF]">
                        <Avatar userId={r.task.assigneeId!} name={r.assignee} size="xs" />
                        <span className="truncate max-w-[140px]">{r.assignee}</span>
                      </span>
                    ) : (
                      <span className="text-[#6E7268]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#A1A69B]">{priorityLabel(r.task.priority)}</td>
                  <td className={cn('px-4 py-3', overdue ? 'text-red-400 font-medium' : 'text-[#A1A69B]')}>
                    {due.label ?? <span className="text-[#6E7268]">—</span>}
                    {overdue && <span className="ml-1.5 text-[10px] uppercase tracking-wide">Overdue</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6E7268]">
                    {r.task.updatedAt ? new Date(r.task.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#6E7268]">
                  {rows.length === 0 ? 'No tasks on this board yet.' : `No tasks match “${query}”.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
