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
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './reui/badge';

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
      <Card className="bg-gradient-to-r from-card via-primary/5 to-card border-border/80 p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Laptop className="size-4.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Loopin Desktop Integration</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Connect your local Git repository
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              When you stage and commit changes in the <strong className="text-primary font-medium">Loopin Desktop Client</strong>, 
              commits are automatically parsed and synced with your tasks in Supabase.
            </p>
          </div>

          <Button
            onClick={() => setShowSimulateModal(true)}
            size="sm"
            className="gap-2 shrink-0 text-xs"
          >
            <PlusCircle className="size-3.5" />
            <span>Simulate Desktop Commit</span>
          </Button>
        </div>

        {/* Credentials / Config Box */}
        <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary/60 border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Backend URL</span>
              <span className="text-xs font-mono text-foreground">http://localhost:3000</span>
            </div>
            <button
              onClick={() => copyToClipboard('http://localhost:3000', 'url')}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"
            >
              {copiedKey === 'url' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </button>
          </div>

          <div className="bg-secondary/60 border border-border rounded-xl p-3 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Project ID</span>
              <span className="text-xs font-mono text-primary truncate block">
                {currentProject?.id || 'No project selected'}
              </span>
            </div>
            {currentProject?.id && (
              <button
                onClick={() => copyToClipboard(currentProject.id, 'pid')}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted shrink-0"
              >
                {copiedKey === 'pid' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
            )}
          </div>

          <div className="bg-secondary/60 border border-border rounded-xl p-3 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">User ID</span>
              <span className="text-xs font-mono text-emerald-400 truncate block">
                {currentUser.id}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(currentUser.id, 'uid')}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted shrink-0"
            >
              {copiedKey === 'uid' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      </Card>

      {/* Commit History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="size-4.5 text-primary" />
            <h4 className="text-base font-bold text-foreground">Project Commits</h4>
            <Badge variant="outline" className="font-mono text-[11px] h-5 px-1.5">
              {commits.length}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">Synced in real-time with Supabase DB</span>
        </div>

        {commits.length === 0 ? (
          <div className="bg-card/40 border border-border rounded-2xl p-12 text-center space-y-3">
            <GitCommit className="size-8 text-muted-foreground/60 mx-auto" />
            <h5 className="text-sm font-semibold text-muted-foreground">No commits recorded yet</h5>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Stage and commit changes in your Loopin desktop client, or use the simulation button above to record a commit against this project.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {commits.map((commit) => (
              <Card
                key={commit.id}
                className="p-4 transition-all hover:border-primary/40 flex items-start justify-between gap-4 bg-card/80"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      {commit.id.substring(0, 7)}
                    </span>
                    <h5 className="text-sm font-medium text-foreground">
                      {commit.message}
                    </h5>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="size-3 text-muted-foreground" />
                      <span>{commit.authorId ? `Author: ${commit.authorId.substring(0, 8)}...` : 'Unknown'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span>{new Date(commit.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Linked Tasks Badges */}
                  {commit.tasks && commit.tasks.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-medium">Linked Tasks:</span>
                      {commit.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onSelectTaskById(t.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition cursor-pointer"
                        >
                          <Tag className="size-2.5" />
                          <span>{t.title || `Task #${t.id.substring(0, 6)}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Simulate Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <Laptop className="size-4.5 text-primary" />
              <span>Simulate Desktop Commit</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              This simulates the exact <code className="text-primary font-mono">POST /api/commits</code> payload that the Loopin Desktop client sends to the backend when committing local changes.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  required
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Select Linked Task (Optional)
                </label>
                <select
                  multiple
                  value={simTaskIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setSimTaskIds(selected);
                  }}
                  className="w-full bg-background text-foreground text-xs p-2 rounded-xl border border-input h-28 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted-foreground mt-1 block">Hold Ctrl/Cmd to select multiple tasks</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSimulateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs"
                >
                  Post Commit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
