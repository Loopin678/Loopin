import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDot, AlertTriangle, ListChecks, UserX } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { useMemberStore } from '../../store/memberStore';
import { cn } from '../../utils/cn';
import { KIND_COLORS, KIND_LABELS, KIND_ORDER, dueInfo, priorityLabel, priorityRank } from './boardViewData';

// Single-series bars use the brand chartreuse; it clears 3:1 on the card surface.
const BAR = '#D0E36A';
const BAR_H = 14; // bars stay thin (<= 24px), rounded at the data end only

// ── Hover tooltip shared by every chart card ────────────────────────────────

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: (show: (e: React.MouseEvent, title: string, lines: string[]) => void, hide: () => void) => React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);

  const show = (e: React.MouseEvent, t: string, lines: string[]) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: t, lines });
  };

  return (
    <section ref={ref} className={cn('relative rounded-[22px] bg-[#151713] border border-white/5 p-5', className)}>
      <h3 className="text-[15px] font-semibold text-[#F4F5EF]">{title}</h3>
      {subtitle && <p className="text-xs text-[#6E7268] mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children(show, () => setTip(null))}</div>
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 min-w-[120px] rounded-xl bg-[#0B0C0A] border border-white/10 px-3 py-2 shadow-xl text-xs"
          style={{ left: Math.min(tip.x + 12, (ref.current?.clientWidth ?? 300) - 150), top: tip.y + 12 }}
        >
          <p className="font-semibold text-[#F4F5EF]">{tip.title}</p>
          {tip.lines.map(l => <p key={l} className="text-[#A1A69B] mt-0.5">{l}</p>)}
        </div>
      )}
    </section>
  );
}

// Horizontal bars for one measure across categories, value at the bar's tip
function BarList({
  rows,
  show,
  hide,
  unit,
}: {
  rows: { label: string; value: number; detail?: string; muted?: boolean }[];
  show: (e: React.MouseEvent, title: string, lines: string[]) => void;
  hide: () => void;
  unit: string;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (rows.length === 0) return <p className="text-sm text-[#6E7268]">Nothing to show yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div
          key={r.label}
          className="group grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 rounded-lg -mx-2 px-2 py-1 hover:bg-white/[0.03]"
          onMouseMove={e => show(e, r.label, [`${r.value} ${unit}${r.value !== 1 ? 's' : ''}`, ...(r.detail ? [r.detail] : [])])}
          onMouseLeave={hide}
        >
          <span className={cn('text-xs truncate', r.muted ? 'text-[#6E7268]' : 'text-[#A1A69B]')} title={r.label}>{r.label}</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div
                className="rounded-r-[4px] transition-all duration-700 ease-out group-hover:brightness-110"
                style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 4 : 0, height: BAR_H, backgroundColor: r.muted ? '#6E7268' : BAR }}
              />
            </div>
            <span className="text-xs font-semibold text-[#F4F5EF] tabular-nums w-6 text-right">{r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, note, tone }: { icon: React.ElementType; label: string; value: string | number; note?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-[20px] bg-[#151713] border border-white/5 p-4">
      <div className="flex items-center gap-2 text-xs text-[#A1A69B]">
        <Icon size={14} className={tone === 'warn' ? 'text-red-400' : 'text-[#D0E36A]'} /> {label}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-[#F4F5EF] tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-[#6E7268]">{note}</p>}
    </div>
  );
}

// ── The view ────────────────────────────────────────────────────────────────

export function BoardInsightsView() {
  const { listsById, listOrder, taskIdsByList, tasksById } = useBoardStore();
  const namesById = useMemberStore(s => s.namesById);

  const data = useMemo(() => {
    type T = { id: string; kind: string; listName: string; assigneeId: string | null; priority?: string | null; dueDate?: string | null; createdAt?: string };
    const tasks: T[] = [];
    const perList: { label: string; value: number; kind: string }[] = [];
    for (const listId of listOrder) {
      const list = listsById[listId];
      if (!list) continue;
      const ids = taskIdsByList[listId] ?? [];
      perList.push({ label: list.name, value: ids.length, kind: list.kind });
      for (const id of ids) {
        const t = tasksById[id] as any;
        if (t) tasks.push({ id, kind: list.kind, listName: list.name, assigneeId: t.assigneeId, priority: t.priority, dueDate: t.dueDate, createdAt: t.createdAt });
      }
    }

    const total = tasks.length;
    const byKind: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, CUSTOM: 0, DONE: 0 };
    tasks.forEach(t => { byKind[t.kind] = (byKind[t.kind] ?? 0) + 1; });

    const open = tasks.filter(t => t.kind !== 'DONE');
    const now = Date.now();
    const overdue = open.filter(t => { const d = dueInfo(t.dueDate).time; return d !== null && d < now; }).length;
    const unassigned = open.filter(t => !t.assigneeId).length;

    // Open work per person (done tasks are finished work, not load)
    const load = new Map<string, number>();
    open.forEach(t => {
      const key = t.assigneeId ?? '__none__';
      load.set(key, (load.get(key) ?? 0) + 1);
    });
    const workload = Array.from(load.entries())
      .map(([id, value]) => ({
        label: id === '__none__' ? 'Unassigned' : namesById[id] ?? 'Former member',
        value,
        muted: id === '__none__',
      }))
      .sort((a, b) => Number(a.muted) - Number(b.muted) || b.value - a.value);

    const prio = new Map<string, number>();
    open.forEach(t => {
      const label = priorityLabel(t.priority);
      prio.set(label, (prio.get(label) ?? 0) + 1);
    });
    const priorities = Array.from(prio.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => priorityRank(a.label) - priorityRank(b.label));

    // Tasks created per week, last 8 weeks (weeks start Monday)
    const startOfWeek = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
      return x;
    };
    const thisWeek = startOfWeek(new Date());
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - (7 - i) * 7);
      return { start, value: 0 };
    });
    tasks.forEach(t => {
      if (!t.createdAt) return;
      const w = startOfWeek(new Date(t.createdAt)).getTime();
      const slot = weeks.find(x => x.start.getTime() === w);
      if (slot) slot.value++;
    });

    return { total, byKind, overdue, unassigned, perList, workload, priorities, weeks };
  }, [listsById, listOrder, taskIdsByList, tasksById, namesById]);

  const pct = (n: number) => (data.total ? Math.round((n / data.total) * 100) : 0);
  const weekMax = Math.max(1, ...data.weeks.map(w => w.value));
  const [hoverWeek, setHoverWeek] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 md:px-6 pb-6 space-y-4">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-rise">
        <StatTile icon={ListChecks} label="Total tasks" value={data.total} note={`${listOrder.length} list${listOrder.length !== 1 ? 's' : ''}`} />
        <StatTile icon={CheckCircle2} label="Completed" value={`${pct(data.byKind.DONE)}%`} note={`${data.byKind.DONE} of ${data.total} done`} />
        <StatTile icon={CircleDot} label="In progress" value={data.byKind.IN_PROGRESS} note={`${data.total - data.byKind.DONE} still open`} />
        <StatTile
          icon={data.overdue > 0 ? AlertTriangle : UserX}
          label={data.overdue > 0 ? 'Overdue' : 'Unassigned'}
          value={data.overdue > 0 ? data.overdue : data.unassigned}
          note={data.overdue > 0 ? `${data.unassigned} open task${data.unassigned !== 1 ? 's' : ''} unassigned` : 'open tasks with no owner'}
          tone={data.overdue > 0 ? 'warn' : undefined}
        />
      </div>

      {/* Progress: one stacked bar, To do → In progress → other lists → Done */}
      <ChartCard title="Progress" subtitle="Where every task on the board sits right now" className="animate-rise [animation-delay:60ms]">
        {(show, hide) => (
          <div>
            {data.total === 0 ? (
              <p className="text-sm text-[#6E7268]">No tasks yet.</p>
            ) : (
              <div className="flex h-7 w-full gap-[2px]" aria-label={KIND_ORDER.map(k => `${KIND_LABELS[k]} ${data.byKind[k]}`).join(', ')} role="img">
                {KIND_ORDER.filter(k => data.byKind[k] > 0).map((k, i, arr) => (
                  <div
                    key={k}
                    className={cn(
                      'h-full flex items-center justify-center text-[11px] font-semibold text-white transition-all duration-700 hover:brightness-110',
                      i === 0 && 'rounded-l-[6px]',
                      i === arr.length - 1 && 'rounded-r-[6px]'
                    )}
                    style={{ width: `${(data.byKind[k] / data.total) * 100}%`, backgroundColor: KIND_COLORS[k] }}
                    onMouseMove={e => show(e, KIND_LABELS[k], [`${data.byKind[k]} task${data.byKind[k] !== 1 ? 's' : ''}`, `${pct(data.byKind[k])}% of the board`])}
                    onMouseLeave={hide}
                  >
                    {/* Label only when it clearly fits */}
                    {pct(data.byKind[k]) >= 12 && `${pct(data.byKind[k])}%`}
                  </div>
                ))}
              </div>
            )}
            {/* Legend: identity never relies on colour alone */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {KIND_ORDER.map(k => (
                <span key={k} className="inline-flex items-center gap-2 text-xs text-[#A1A69B]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: KIND_COLORS[k] }} />
                  {KIND_LABELS[k]} <span className="text-[#F4F5EF] font-semibold tabular-nums">{data.byKind[k]}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Tasks per list" subtitle="All tasks, by column" className="animate-rise [animation-delay:120ms]">
          {(show, hide) => <BarList rows={data.perList} show={show} hide={hide} unit="task" />}
        </ChartCard>

        <ChartCard title="Workload" subtitle="Open tasks per person" className="animate-rise [animation-delay:160ms]">
          {(show, hide) => <BarList rows={data.workload} show={show} hide={hide} unit="open task" />}
        </ChartCard>

        <ChartCard title="Open tasks by priority" className="animate-rise [animation-delay:200ms]">
          {(show, hide) => <BarList rows={data.priorities} show={show} hide={hide} unit="task" />}
        </ChartCard>

        {/* New tasks per week: columns with a hover highlight per week */}
        <ChartCard title="New tasks per week" subtitle="Last 8 weeks" className="animate-rise [animation-delay:240ms]">
          {(show, hide) => (
            <div>
              <div className="relative h-40 flex items-end gap-2 border-b border-white/10" role="img"
                aria-label={data.weeks.map(w => `${w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${w.value}`).join(', ')}>
                {/* Recessive guide at the max */}
                <div className="absolute left-0 right-0 top-0 border-t border-white/[0.06]" />
                <span className="absolute -top-0.5 right-0 -translate-y-full text-[10px] text-[#6E7268] tabular-nums">{weekMax}</span>
                {data.weeks.map((w, i) => {
                  const isLast = i === data.weeks.length - 1;
                  const label = w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <div
                      key={i}
                      className={cn('relative flex-1 h-full flex items-end justify-center rounded-md transition-colors', hoverWeek === i && 'bg-white/[0.04]')}
                      onMouseMove={e => { setHoverWeek(i); show(e, `Week of ${label}`, [`${w.value} new task${w.value !== 1 ? 's' : ''}`]); }}
                      onMouseLeave={() => { setHoverWeek(null); hide(); }}
                    >
                      {(isLast || hoverWeek === i) && w.value > 0 && (
                        <span className="absolute text-[10px] font-semibold text-[#F4F5EF] tabular-nums" style={{ bottom: `calc(${(w.value / weekMax) * 100}% + 4px)` }}>
                          {w.value}
                        </span>
                      )}
                      <div
                        className="w-full max-w-[24px] rounded-t-[4px] transition-all duration-700"
                        style={{ height: `${(w.value / weekMax) * 100}%`, minHeight: w.value > 0 ? 4 : 0, backgroundColor: BAR, opacity: hoverWeek === null || hoverWeek === i ? 1 : 0.55 }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                {data.weeks.map((w, i) => (
                  <span key={i} className="flex-1 text-center text-[10px] text-[#6E7268] truncate">
                    {i % 2 === 1 || i === data.weeks.length - 1 ? w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <p className="text-xs text-[#6E7268] px-1">
        Every number here comes from the tasks on this board. Switch to <b className="text-[#A1A69B]">Table</b> to see them one by one.
      </p>
    </div>
  );
}
