import React, { useState } from 'react';
import type { Commit, Project, User, Task } from '../types';
import { 
  GitCommit, 
  Laptop, 
  Copy, 
  Check, 
  Calendar, 
  User as UserIcon, 
  PlusCircle,
  Tag
} from 'lucide-react';

interface CommitsViewProps {
  commits: Commit[];
  currentProject: Project | null;
  currentUser: User;
  tasks: Task[];
  onReportCommit: (sha: string, message: string, taskIds: string[]) => void;
  onSelectTaskById: (taskId: string) => void;
}

export const CommitsView: React.FC<CommitsViewProps> = ({
  commits,
  currentProject,
  currentUser,
  tasks,
  onReportCommit,
  onSelectTaskById,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simMessage, setSimMessage] = useState('feat: update task implementation');
  const [simTaskIds, setSimTaskIds] = useState<string[]>([]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;
    const sha = Math.random().toString(16).substring(2, 9) + Math.random().toString(16).substring(2, 9);
    onReportCommit(sha, simMessage.trim(), simTaskIds);
    setSimMessage('');
    setSimTaskIds([]);
    setShowSimulateModal(false);
  };

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner: Desktop Client Integration Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Laptop className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Loopin Desktop Integration</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Connect your local Git repository
            </h3>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              When you stage and commit changes in the <strong className="text-sky-400">Loopin Desktop Client</strong>, 
              commits are automatically parsed with Gemini AI and synced with your tasks in Supabase.
            </p>
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 shrink-0 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simulate Desktop Commit</span>
          </button>
        </div>

        {/* Credentials / Config Box */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Backend URL</span>
              <span className="text-xs font-mono text-slate-200">http://localhost:3000</span>
            </div>
            <button
              onClick={() => copyToClipboard('http://localhost:3000', 'url')}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
            >
              {copiedKey === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Project ID</span>
              <span className="text-xs font-mono text-sky-400 truncate block">
                {currentProject?.id || 'No project selected'}
              </span>
            </div>
            {currentProject?.id && (
              <button
                onClick={() => copyToClipboard(currentProject.id, 'pid')}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 shrink-0"
              >
                {copiedKey === 'pid' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">User ID</span>
              <span className="text-xs font-mono text-emerald-400 truncate block">
                {currentUser.id}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(currentUser.id, 'uid')}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 shrink-0"
            >
              {copiedKey === 'uid' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Commit History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-sky-400" />
            <h4 className="text-lg font-bold text-white">Project Commits</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {commits.length}
            </span>
          </div>
          <span className="text-xs text-slate-500">Synced in real-time with Supabase DB</span>
        </div>

        {commits.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <GitCommit className="w-10 h-10 text-slate-600 mx-auto" />
            <h5 className="text-base font-semibold text-slate-300">No commits recorded yet</h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Stage and commit changes in your Loopin desktop client, or use the simulation button above to record a commit against this project.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {commits.map((commit) => (
              <div
                key={commit.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all shadow-md flex items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {commit.id.substring(0, 7)}
                    </span>
                    <h5 className="text-sm font-semibold text-slate-100">
                      {commit.message}
                    </h5>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>{commit.authorId ? `Author: ${commit.authorId.substring(0, 8)}...` : 'Unknown'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(commit.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Linked Tasks Badges */}
                  {commit.tasks && commit.tasks.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-medium">Linked Tasks:</span>
                      {commit.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onSelectTaskById(t.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{t.title || `Task #${t.id.substring(0, 6)}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulate Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-400" />
              <span>Simulate Desktop Commit</span>
            </h4>
            <p className="text-xs text-slate-400">
              This simulates the exact <code className="text-sky-300">POST /api/commits</code> payload that the Loopin Desktop client sends to the backend when committing local changes.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  required
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Select Linked Task (Optional)
                </label>
                <select
                  multiple
                  value={simTaskIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setSimTaskIds(selected);
                  }}
                  className="w-full bg-slate-800 text-slate-100 text-xs p-2 rounded-xl border border-slate-700 h-28 focus:outline-none"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">Hold Ctrl/Cmd to select multiple tasks</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Post Commit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
