import React, { useState } from 'react';
import type { Project, User } from '../types';
import { Laptop, Terminal, GitBranch, Cpu, ShieldCheck, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

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
        <div className="flex items-center gap-2 text-primary mb-2">
          <Laptop className="size-4.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Companion Application</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Loopin Desktop Client Setup</h2>
        <p className="text-xs text-muted-foreground mt-1">
          The desktop app watches your local Git repository in real time, automatically grouping uncommitted diffs into logical AI commits.
        </p>
      </div>

      {/* Connection Card */}
      <Card className="p-6 space-y-6 shadow-xl bg-card/90">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">1</span>
          <span>Copy Configuration into Desktop App Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary/60 border border-border rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Backend URL</span>
              <span className="text-xs font-mono text-foreground font-semibold block mt-1">http://localhost:3000</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard('http://localhost:3000', 'url')}
              className="mt-2 text-xs h-7"
            >
              {copiedKey === 'url' ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
              <span>Copy URL</span>
            </Button>
          </div>

          <div className="bg-secondary/60 border border-border rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="truncate">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Project ID</span>
              <span className="text-xs font-mono text-primary font-semibold block mt-1 truncate">
                {currentProject?.id || 'None'}
              </span>
            </div>
            {currentProject?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(currentProject.id, 'pid')}
                className="mt-2 text-xs h-7"
              >
                {copiedKey === 'pid' ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
                <span>Copy Project ID</span>
              </Button>
            )}
          </div>

          <div className="bg-secondary/60 border border-border rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="truncate">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">User ID</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold block mt-1 truncate">
                {currentUser.id}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(currentUser.id, 'uid')}
              className="mt-2 text-xs h-7"
            >
              {copiedKey === 'uid' ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
              <span>Copy User ID</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Feature Architecture Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2.5 bg-card/80">
          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Cpu className="size-3.5" />
          </div>
          <h4 className="text-xs font-bold text-foreground">AI Auto-Commit Grouping</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Diffs are parsed with Gemini 1.5 Flash to automatically generate Conventional Commit messages.
          </p>
        </Card>

        <Card className="p-4 space-y-2.5 bg-card/80">
          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <GitBranch className="size-3.5" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Native libgit2 Core</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fast, native git operations on local branches, stash, staging, pushing to GitHub, and safe conflict resolution.
          </p>
        </Card>

        <Card className="p-4 space-y-2.5 bg-card/80">
          <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="size-3.5" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Bi-directional Task Sync</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Commits link directly to your project's tasks, making project progress trackable straight from git history.
          </p>
        </Card>
      </div>

      {/* CLI Helper */}
      <Card className="p-5 space-y-3 bg-card/80">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          <Terminal className="size-4 text-primary" />
          <span>Loopin CLI Commands</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Built into native executable (`desktop/build/loopin_cli`):
        </p>
        <div className="bg-background rounded-xl p-3 font-mono text-xs text-foreground space-y-2 border border-border">
          <div>
            <span className="text-muted-foreground"># Auto-resolve merge conflicts using AI</span>
            <div className="text-primary">./loopin_cli merge-resolve src/file.cpp</div>
          </div>
          <div className="pt-1">
            <span className="text-muted-foreground"># Auto-generate .gitignore by scanning project files</span>
            <div className="text-emerald-400">./loopin_cli generate-gitignore</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
