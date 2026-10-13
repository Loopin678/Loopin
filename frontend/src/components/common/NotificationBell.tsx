import React, { useEffect, useRef, useState } from 'react';
import { Bell, Loader2, CheckCircle2, XCircle, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PendingInvitation } from '../../api/client';

interface NotificationBellProps {
  invitations: PendingInvitation[];
  pendingCount: number;
  loading: boolean;
  error: string;
  actioningId: string | null;
  onOpen: () => void; // called when dropdown opens so parent can refresh
  onAccept: (inv: PendingInvitation) => void;
  onDecline: (inv: PendingInvitation) => void;
  onRetry: () => void;
}

export function NotificationBell({
  invitations,
  pendingCount,
  loading,
  error,
  actioningId,
  onOpen,
  onAccept,
  onDecline,
  onRetry,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) onOpen();
    setOpen(prev => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label={`Notifications${pendingCount > 0 ? ` — ${pendingCount} pending` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE6B0]',
          open
            ? 'bg-[rgba(255,255,255,0.08)] text-[#ECEAE4]'
            : 'text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[rgba(255,255,255,0.06)]'
        )}
      >
        <Bell size={16} strokeWidth={2} />
        {pendingCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#5EE6B0] text-black text-[9px] font-black leading-none"
            aria-hidden="true"
          >
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Invitations"
          className={cn(
            'absolute right-0 top-full mt-2 w-80 bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-[200]',
            'animate-in fade-in slide-in-from-top-2 duration-150'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-[#5EE6B0]" />
              <span className="text-xs font-bold text-[#ECEAE4] uppercase tracking-wider">Invitations</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#5EE6B0]/15 text-[#5EE6B0] text-[10px] font-mono font-bold">
                  {pendingCount}
                </span>
              )}
            </div>
            {!loading && (
              <button
                onClick={onRetry}
                className="p-1 text-[#5B616A] hover:text-[#ECEAE4] rounded transition-colors"
                title="Refresh"
                aria-label="Refresh invitations"
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-[#5B616A]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Loading invitations…</span>
              </div>
            )}

            {!loading && error && (
              <div className="px-4 py-5 flex flex-col items-center gap-3 text-center">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                <button
                  onClick={onRetry}
                  className="text-xs text-[#5EE6B0] hover:underline font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && invitations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                <Inbox size={24} className="text-[#2A3040]" />
                <p className="text-xs text-[#5B616A]">No pending invitations</p>
              </div>
            )}

            {!loading && !error && invitations.map((inv) => {
              const isActioning = actioningId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-start gap-2.5 mb-2.5">
                    {/* Project icon */}
                    <div className="w-7 h-7 rounded-lg bg-[#5EE6B0]/10 border border-[#5EE6B0]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-black text-[#5EE6B0]">
                        {inv.project.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#ECEAE4] truncate">{inv.project.name}</p>
                      <p className="text-[10px] text-[#5B616A] mt-0.5">You've been invited to join this project</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDecline(inv)}
                      disabled={isActioning}
                      aria-label={`Decline invitation to ${inv.project.name}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-[rgba(255,255,255,0.08)] text-[10px] font-semibold text-[#5B616A] hover:text-red-400 hover:border-red-900/40 disabled:opacity-40 transition-all"
                    >
                      {isActioning ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                      Decline
                    </button>
                    <button
                      onClick={() => onAccept(inv)}
                      disabled={isActioning}
                      aria-label={`Accept invitation to ${inv.project.name}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-[#5EE6B0]/15 border border-[#5EE6B0]/25 text-[10px] font-bold text-[#5EE6B0] hover:bg-[#5EE6B0]/25 disabled:opacity-40 transition-all"
                    >
                      {isActioning ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
