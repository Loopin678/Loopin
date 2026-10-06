import React, { useState } from 'react';
import type { Project, User } from '../types';
import { Laptop, Terminal, GitBranch, Cpu, ShieldCheck, Copy, Check } from 'lucide-react';

interface DesktopSyncViewProps {
  currentProject: Project | null;
  currentUser: User;
}

export const DesktopSyncView: React.FC<DesktopSyncViewProps> = ({ currentProject, currentUser }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 text-indigo-400 mb-2">
          <Laptop className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Companion Application</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Loopin Desktop Client Setup</h2>
        <p className="text-sm text-slate-400 mt-1">
          The desktop app watches your local Git repository in real time, automatically grouping uncommitted diffs into logical AI commits.
        </p>
      </div>

      {/* Connection Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-xs font-mono">1</span>
          <span>Copy Configuration into Desktop App Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Backend URL</span>
              <span className="text-sm font-mono text-slate-100 font-semibold block mt-1">http://localhost:3000</span>
            </div>
            <button
              onClick={() => copyToClipboard('http://localhost:3000', 'url')}
              className="mt-2 text-xs py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-1.5 transition"
            >
              {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy URL</span>
            </button>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Project ID</span>
              <span className="text-sm font-mono text-sky-400 font-semibold block mt-1 truncate">
                {currentProject?.id || 'None'}
              </span>
            </div>
            {currentProject?.id && (
              <button
                onClick={() => copyToClipboard(currentProject.id, 'pid')}
                className="mt-2 text-xs py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-1.5 transition"
              >
                {copiedKey === 'pid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Project ID</span>
              </button>
            )}
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">User ID</span>
              <span className="text-sm font-mono text-emerald-400 font-semibold block mt-1 truncate">
                {currentUser.id}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(currentUser.id, 'uid')}
              className="mt-2 text-xs py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-1.5 transition"
            >
              {copiedKey === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy User ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Architecture Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">AI Auto-Commit Grouping</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Diffs are parsed with Gemini 1.5 Flash (or local Ollama) to automatically generate Conventional Commit messages.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <GitBranch className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">Native libgit2 Core</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fast, native git operations on local branches, stash, staging, pushing to GitHub, and safe conflict resolution.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white">Bi-directional Task Sync</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Commits link directly to your project's tasks, making project progress trackable straight from git history.
          </p>
        </div>
      </div>

      {/* CLI Helper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Loopin CLI Commands</span>
        </div>
        <p className="text-xs text-slate-400">
          Included in the desktop repository (`desktop/src_cli`):
        </p>
        <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-2 border border-slate-800">
          <div>
            <span className="text-slate-500"># Auto-resolve merge conflicts using AI</span>
            <div className="text-sky-300">loopin-cli merge-resolve src/file.cpp</div>
          </div>
          <div className="pt-1">
            <span className="text-slate-500"># Auto-generate .gitignore by scanning project files</span>
            <div className="text-emerald-300">loopin-cli generate-gitignore</div>
          </div>
        </div>
      </div>
    </div>
  );
};
