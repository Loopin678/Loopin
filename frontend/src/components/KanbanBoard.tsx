import React, { useState } from 'react';
import type { List, Task } from '../types';
import { Plus, MoreHorizontal, ArrowRight, ArrowLeft, GitCommit, Tag, Layers } from 'lucide-react';

interface KanbanBoardProps {
  lists: List[];
  tasks: Task[];
  onCreateList: (name: string) => void;
  onCreateTask: (listId: string, title: string) => void;
  onMoveTask: (taskId: string, newListId: string, newPosition: number) => void;
  onSelectTask: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  lists,
  tasks,
  onCreateList,
  onCreateTask,
  onMoveTask,
  onSelectTask,
}) => {
  const [newListName, setNewListName] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [addingTaskInList, setAddingTaskInList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim());
    setNewListName('');
    setIsAddingList(false);
  };

  const handleCreateTask = (listId: string) => {
    if (!newTaskTitle.trim()) return;
    onCreateTask(listId, newTaskTitle.trim());
    setNewTaskTitle('');
    setAddingTaskInList(null);
  };

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-5 items-start min-h-[calc(100vh-140px)]">
        {lists.map((list, listIndex) => {
          const listTasks = tasks
            .filter((t) => t.listId === list.id)
            .sort((a, b) => a.position - b.position);

          const prevList = listIndex > 0 ? lists[listIndex - 1] : null;
          const nextList = listIndex < lists.length - 1 ? lists[listIndex + 1] : null;

          return (
            <div
              key={list.id}
              className="w-80 shrink-0 bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-140px)] shadow-xl shadow-black/20"
            >
              {/* List Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-100 text-sm">{list.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {listTasks.length}
                  </span>
                </div>
                <button className="text-slate-500 hover:text-slate-300 p-1 rounded-lg">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks Container */}
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {listTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 rounded-xl p-3.5 transition-all shadow-md hover:shadow-sky-500/5 cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-slate-100 group-hover:text-sky-300 transition-colors leading-snug">
                        {task.title}
                      </h4>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata / Tags */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {task.stack && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          <Layers className="w-2.5 h-2.5" />
                          {task.stack}
                        </span>
                      )}

                      {task.priority && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          <Tag className="w-2.5 h-2.5" />
                          {task.priority}
                        </span>
                      )}

                      {task.commitId && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <GitCommit className="w-2.5 h-2.5" />
                          {task.commitId.substring(0, 7)}
                        </span>
                      )}
                    </div>

                    {/* Move Quick Controls */}
                    <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        {prevList && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveTask(task.id, prevList.id, 0);
                            }}
                            className="hover:text-sky-400 flex items-center gap-0.5 p-1 rounded"
                            title={`Move to ${prevList.name}`}
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>{prevList.name}</span>
                          </button>
                        )}
                      </div>

                      <div>
                        {nextList && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveTask(task.id, nextList.id, 0);
                            }}
                            className="hover:text-sky-400 flex items-center gap-0.5 p-1 rounded"
                            title={`Move to ${nextList.name}`}
                          >
                            <span>{nextList.name}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inline Add Task Form */}
                {addingTaskInList === list.id ? (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateTask(list.id);
                        if (e.key === 'Escape') setAddingTaskInList(null);
                      }}
                      className="w-full bg-slate-900 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateTask(list.id)}
                        className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingTaskInList(null)}
                        className="px-2.5 py-1 text-slate-400 hover:text-slate-200 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTaskInList(list.id);
                      setNewTaskTitle('');
                    }}
                    className="w-full py-2 px-3 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add List Column */}
        <div className="w-80 shrink-0">
          {isAddingList ? (
            <form onSubmit={handleCreateList} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="List name (e.g. In Review)..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-medium"
                >
                  Create List
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingList(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 rounded-2xl text-slate-400 hover:text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add another list</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
