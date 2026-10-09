import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi, listsApi, TaskDetail } from '../api/client';
import { useBoardStore } from '../store/boardStore';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export function FocusMode() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const store = useBoardStore();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Navigation
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    if (Object.keys(store.listsById).length === 0) {
      listsApi.list(projectId).then(lists => store.setBoard(lists)).catch(() => {});
    }
  }, [projectId]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    tasksApi.get(taskId)
      .then(taskData => {
        setTask(taskData);
        // Find adjacent tasks purely client-side from the store
        const listIds = store.taskIdsByList[taskData.listId] || [];
        const currentIndex = listIds.indexOf(taskId);
        if (currentIndex > 0) setPrevId(listIds[currentIndex - 1]);
        else setPrevId(null);
        if (currentIndex !== -1 && currentIndex < listIds.length - 1) setNextId(listIds[currentIndex + 1]);
        else setNextId(null);
        setLoading(false);
      })
      .catch(() => navigate(`/projects/${projectId}`));
  }, [taskId, projectId, store.taskIdsByList]);

  // Timer logic
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
  };

  const hue = task?.stack ? task.stack.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360 : 0;

  return (
    <div className="fixed inset-0 bg-[#060709] text-[var(--color-text-main)] font-sans flex flex-col z-[200]">
      {/* Decorative Focus Loop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full border border-[var(--color-accent)] opacity-10 blur-sm animate-[spin_60s_linear_infinite]" />
        <div className="absolute w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-[var(--color-accent)] opacity-[0.02] blur-3xl" />
      </div>

      {/* Topbar */}
      <header className="h-16 border-b border-[var(--color-border)] flex items-center justify-between px-6 shrink-0 relative z-10 bg-[#060709]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to project
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10">
            <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-[var(--color-accent)] animate-pulse" : "bg-[var(--color-text-muted)]")} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
              In the loop
            </span>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {loading ? (
          <Loader2 className="animate-spin text-[var(--color-accent)]" size={48} />
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            
            {/* Timer */}
            <div className="font-mono text-6xl md:text-8xl font-medium tracking-tight text-[var(--color-text-main)] mb-12 drop-shadow-lg">
              {formatTime(seconds)}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-4 mb-16">
              <button 
                onClick={() => setIsActive(!isActive)}
                className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-black flex items-center justify-center hover:bg-[#4CD59F] hover:scale-105 transition-all shadow-mint-glow"
              >
                {isActive ? <Pause size={28} className="fill-black" /> : <Play size={28} className="fill-black ml-1" />}
              </button>
              <button 
                onClick={() => { setIsActive(false); setSeconds(0); }}
                className="w-12 h-12 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors"
                title="Reset Timer"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            {/* Centered Task Card */}
            <div className="w-full bg-[var(--color-surface-1)]/80 backdrop-blur-xl border border-[var(--color-border-strong)] rounded-3xl p-8 shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                {task?.stack ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm backdrop-blur-md"
                        style={{ backgroundColor: `hsla(${hue}, 70%, 60%, 0.1)`, color: `hsl(${hue}, 70%, 60%)`, borderColor: `hsla(${hue}, 70%, 60%, 0.2)` }}>
                    {task.stack}
                  </span>
                ) : null}
              </div>
              
              <h2 className="text-3xl font-bold text-center mt-4 mb-6 leading-tight">{task?.title}</h2>
              <div className="text-center text-[var(--color-text-muted)] whitespace-pre-wrap text-sm max-w-lg mx-auto">
                {task?.description || "No description provided."}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6 mt-12">
              <button 
                onClick={() => prevId && navigate(`/projects/${projectId}/focus/${prevId}`)}
                disabled={!prevId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-1)] disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft size={18} /> Previous Task
              </button>
              <button 
                onClick={() => nextId && navigate(`/projects/${projectId}/focus/${nextId}`)}
                disabled={!nextId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-1)] disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                Next Task <ChevronRight size={18} />
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
