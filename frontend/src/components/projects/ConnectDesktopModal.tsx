import React, { useState } from 'react';
import {
  X, Download, KeyRound, FolderGit2, Settings2, GitCommitHorizontal, Copy, Check, Loader2,
  CheckCircle2, Monitor, ChevronDown, ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { DESKTOP_DOWNLOAD_URL } from '../../utils/desktopDownload';
import { timeAgo } from '../../utils/projectStyle';
import { useDesktopConnection } from '../../hooks/useDesktopConnection';

// The desktop app's own default is http://localhost:3000, which matches local dev.
// In production VITE_API_URL is the backend's public address.
const BACKEND_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const RELEASES_URL = 'https://github.com/Loopin678/Loopin/releases/latest';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the value is still selectable */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#0B0C0A] border border-white/10 pl-3 pr-1 py-1">
      <span className="text-[11px] font-semibold text-[#6E7268] w-24 shrink-0">{label}</span>
      <code className="flex-1 min-w-0 truncate text-xs font-mono text-[#F4F5EF] select-all">{value}</code>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
          copied ? 'bg-[#D0E36A] text-[#0B0C0A]' : 'bg-white/5 text-[#A1A69B] hover:text-white hover:bg-white/10'
        )}
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

interface ConnectDesktopModalProps {
  projectId: string;
  projectName: string;
  userId: string;
  /** Called when the user closes without finishing ("I'll do it later") */
  onCancel: () => void;
  /** Called from the "Done" button once connected */
  onDone: () => void;
}

export function ConnectDesktopModal({ projectId, projectName, userId, onCancel, onDone }: ConnectDesktopModalProps) {
  // Check every 5 s while open, so the last step turns green when the first commit lands
  const connection = useDesktopConnection(projectId, userId, 5000);
  const connected = connection.state === 'connected';
  const [showSteps, setShowSteps] = useState(false);
  const stepsVisible = !connected || showSteps;

  const steps: { icon: React.ElementType; title: string; body: React.ReactNode }[] = [
    {
      icon: Download,
      title: 'Install the desktop app',
      body: (
        <div className="space-y-2">
          <p>Download Loopin for Windows and run the installer.</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={DESKTOP_DOWNLOAD_URL}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D0E36A] text-[#0B0C0A] text-xs font-bold hover:bg-[#BED158] transition-colors"
            >
              <Download size={13} /> Download for Windows
            </a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#A1A69B] hover:text-[#D0E36A] transition-colors"
            >
              macOS &amp; Linux <ExternalLink size={11} />
            </a>
          </div>
        </div>
      ),
    },
    {
      icon: KeyRound,
      title: 'Sign in with GitHub',
      body: <p>Open Loopin, choose <b className="text-[#F4F5EF]">Continue with GitHub</b>, and enter the code it shows on the GitHub page.</p>,
    },
    {
      icon: FolderGit2,
      title: 'Open your repository',
      body: <p>On the <b className="text-[#F4F5EF]">Changes</b> tab, press <b className="text-[#F4F5EF]">Browse</b>, pick the git folder for <b className="text-[#F4F5EF]">{projectName}</b>, then press <b className="text-[#F4F5EF]">Open</b>.</p>,
    },
    {
      icon: Settings2,
      title: 'Link this project',
      body: (
        <div className="space-y-2">
          <p>Go to the <b className="text-[#F4F5EF]">Settings</b> tab and paste these three values:</p>
          <CopyField label="Backend URL" value={BACKEND_URL} />
          <CopyField label="Project ID" value={projectId} />
          <CopyField label="User ID" value={userId} />
        </div>
      ),
    },
    {
      icon: GitCommitHorizontal,
      title: 'Make your first commit',
      body: (
        <div className="space-y-2">
          <p>Commit from the desktop app. Loopin will suggest which tasks it finishes and only moves them if you approve.</p>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
              connected
                ? 'bg-[#D0E36A]/10 text-[#D0E36A] border-[#D0E36A]/30'
                : 'bg-white/5 text-[#A1A69B] border-white/10'
            )}
          >
            {connected ? (
              <><CheckCircle2 size={13} /> Commit received</>
            ) : connection.state === 'unknown' ? (
              <>Can’t check right now. It will show here once the server is reachable.</>
            ) : (
              <><Loader2 size={13} className="animate-spin" /> Waiting for your first commit…</>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={connected ? onDone : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect this project to the desktop app"
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#151713] border border-[#D0E36A]/15 rounded-[28px] shadow-2xl shadow-black/60 animate-rise overflow-hidden"
      >
        {/* Header */}
        <div className="relative overflow-hidden dusk-sky px-6 pt-6 pb-5 shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-1/2 hills opacity-60" aria-hidden />
          <button
            onClick={connected ? onDone : onCancel}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-[#0B0C0A]/40 hover:bg-[#0B0C0A]/60 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="relative flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#D0E36A] text-[#0B0C0A] flex items-center justify-center shrink-0">
              <Monitor size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-white">
                {connected ? 'Desktop app connected' : 'Connect the desktop app'}
              </h3>
              <p className="text-sm text-white/75 truncate">{projectName}</p>
            </div>
          </div>
          <p className="relative mt-3 text-sm text-white/80 max-w-md">
            {connected
              ? 'Your commits for this project are reaching Loopin.'
              : 'Link your local repository so every commit shows up here and Loopin can suggest which tasks it completes.'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
          {connected && (
            <div className="mb-4 rounded-2xl border border-[#D0E36A]/25 bg-[#D0E36A]/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#D0E36A]">
                <CheckCircle2 size={16} /> Connected
              </div>
              <p className="mt-1 text-sm text-[#A1A69B]">
                {connection.commitCount} commit{connection.commitCount !== 1 ? 's' : ''} from you
                {connection.lastCommitAt ? `, the latest ${timeAgo(connection.lastCommitAt)}` : ''}.
              </p>
              <p className="mt-2 text-xs text-[#6E7268]">
                To stop syncing, clear the Project ID in the desktop app’s Settings tab. To use another computer,
                repeat the steps there.
              </p>
              <button
                type="button"
                onClick={() => setShowSteps(s => !s)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#A1A69B] hover:text-white transition-colors"
              >
                <ChevronDown size={14} className={cn('transition-transform', showSteps && 'rotate-180')} />
                {showSteps ? 'Hide setup steps' : 'Set up on another computer'}
              </button>
            </div>
          )}

          {stepsVisible && (
            <ol className="relative">
              {steps.map((step, i) => {
                const last = i === steps.length - 1;
                const done = last && connected;
                return (
                  <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                    {/* Connector line */}
                    {!last && <span className="absolute left-[17px] top-10 bottom-0 w-px bg-white/10" aria-hidden />}
                    <span
                      className={cn(
                        'relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border font-display text-sm font-semibold',
                        done ? 'bg-[#D0E36A] text-[#0B0C0A] border-[#D0E36A]' : 'bg-[#1B1E19] text-[#D0E36A] border-[#D0E36A]/25'
                      )}
                    >
                      {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F5EF]">
                        <step.icon size={15} className="text-[#A9B97A]" /> {step.title}
                      </div>
                      <div className="mt-1.5 text-[13px] leading-relaxed text-[#A1A69B]">{step.body}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/5 flex flex-wrap items-center gap-3">
          {!connected && (
            <p className="text-xs text-[#6E7268] mr-auto">
              You can reopen this anytime from <b className="text-[#A1A69B]">Connect desktop</b> on the board.
            </p>
          )}
          {connected ? (
            <button
              type="button"
              onClick={onDone}
              className="ml-auto px-5 py-2 bg-[#D0E36A] text-[#0B0C0A] text-sm font-bold rounded-full hover:bg-[#BED158] transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] hover:border-white/25 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
