import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitFileStatus, RepoStatus } from '../types.js';

const execFileAsync = promisify(execFile);

export async function execGit(
  args: string[],
  cwd: string = process.cwd()
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || '').toString().trim(),
      stderr: (err.stderr || err.message || '').toString().trim(),
      exitCode: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

export async function isGitRepo(cwd?: string): Promise<boolean> {
  const res = await execGit(['rev-parse', '--is-inside-work-tree'], cwd);
  return res.exitCode === 0 && res.stdout === 'true';
}

export async function getRepoRoot(cwd?: string): Promise<string> {
  const res = await execGit(['rev-parse', '--show-toplevel'], cwd);
  if (res.exitCode !== 0) {
    throw new Error(`Not inside a git repository: ${res.stderr}`);
  }
  return res.stdout;
}

export async function getCurrentBranch(cwd?: string): Promise<string> {
  const res = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (res.exitCode !== 0) {
    return 'HEAD (detached)';
  }
  return res.stdout;
}

export async function getStatus(cwd?: string): Promise<RepoStatus> {
  const branch = await getCurrentBranch(cwd);
  const res = await execGit(['status', '--porcelain=v1', '-uall'], cwd);
  if (res.exitCode !== 0) {
    throw new Error(`Git status failed: ${res.stderr}`);
  }

  const lines = res.stdout.split('\n').filter((l) => l.trim().length > 0);
  const files: GitFileStatus[] = [];
  const stagedFiles: string[] = [];
  const unstagedFiles: string[] = [];
  const untrackedFiles: string[] = [];
  const conflictedFiles: string[] = [];

  for (const line of lines) {
    if (line.length < 3) continue;
    const x = line[0];
    const y = line[1];
    let filePath = line.substring(3).trim();
    // Handle renamed files "orig -> new"
    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ')[1].trim();
    }
    // Remove quotes if git added them for special characters
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.substring(1, filePath.length - 1);
    }

    const isConflict =
      (x === 'U' || y === 'U') ||
      (x === 'A' && y === 'A') ||
      (x === 'D' && y === 'D');

    if (isConflict) {
      conflictedFiles.push(filePath);
      files.push({ path: filePath, status: 'conflicted', staged: false });
      continue;
    }

    if (x === '?' && y === '?') {
      untrackedFiles.push(filePath);
      files.push({ path: filePath, status: 'untracked', staged: false });
      continue;
    }

    if (x !== ' ' && x !== '?') {
      stagedFiles.push(filePath);
      let st: GitFileStatus['status'] = 'modified';
      if (x === 'A') st = 'added';
      else if (x === 'D') st = 'deleted';
      else if (x === 'R') st = 'renamed';
      files.push({ path: filePath, status: st, staged: true });
    }

    if (y !== ' ' && y !== '?') {
      unstagedFiles.push(filePath);
      let st: GitFileStatus['status'] = 'modified';
      if (y === 'D') st = 'deleted';
      // Only push if not already recorded as staged
      if (!files.some((f) => f.path === filePath)) {
        files.push({ path: filePath, status: st, staged: false });
      }
    }
  }

  return {
    branch,
    clean: files.length === 0,
    files,
    stagedFiles: Array.from(new Set(stagedFiles)),
    unstagedFiles: Array.from(new Set(unstagedFiles)),
    untrackedFiles: Array.from(new Set(untrackedFiles)),
    conflictedFiles: Array.from(new Set(conflictedFiles)),
  };
}

export async function getDiff(staged: boolean = false, files: string[] = [], cwd?: string): Promise<string> {
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (files.length > 0) {
    args.push('--', ...files);
  }
  const res = await execGit(args, cwd);
  return res.stdout;
}

export async function getFileDiff(filePath: string, staged: boolean = false, cwd?: string): Promise<string> {
  return getDiff(staged, [filePath], cwd);
}

export async function stageFiles(files: string[], cwd?: string): Promise<void> {
  if (files.length === 0) return;
  const res = await execGit(['add', '--', ...files], cwd);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to stage files: ${res.stderr}`);
  }
}

export async function unstageFiles(files: string[], cwd?: string): Promise<void> {
  if (files.length === 0) return;
  const res = await execGit(['reset', 'HEAD', '--', ...files], cwd);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to unstage files: ${res.stderr}`);
  }
}

export async function commit(message: string, cwd?: string): Promise<string> {
  const res = await execGit(['commit', '-m', message], cwd);
  if (res.exitCode !== 0) {
    throw new Error(`Git commit failed: ${res.stderr || res.stdout}`);
  }

  const shaRes = await execGit(['rev-parse', 'HEAD'], cwd);
  if (shaRes.exitCode !== 0) {
    throw new Error(`Could not determine commit SHA: ${shaRes.stderr}`);
  }
  return shaRes.stdout.trim();
}

export async function push(
  remote: string = 'origin',
  branch?: string,
  cwd?: string
): Promise<{ success: boolean; output: string }> {
  const targetBranch = branch || (await getCurrentBranch(cwd));
  const res = await execGit(['push', remote, targetBranch], cwd);
  return {
    success: res.exitCode === 0,
    output: res.exitCode === 0 ? res.stdout : res.stderr || res.stdout,
  };
}

export async function pull(
  rebase: boolean = true,
  cwd?: string
): Promise<{ success: boolean; output: string }> {
  const args = ['pull'];
  if (rebase) args.push('--rebase');
  const res = await execGit(args, cwd);
  return {
    success: res.exitCode === 0,
    output: res.exitCode === 0 ? res.stdout : res.stderr || res.stdout,
  };
}

export async function getRecentCommits(
  count: number = 10,
  cwd?: string
): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const delimiter = '---DELIM---';
  const format = `%H%x09%s%x09%an%x09%ar${delimiter}`;
  const res = await execGit(['log', `-n`, count.toString(), `--pretty=format:${format}`], cwd);
  if (res.exitCode !== 0) return [];

  const rawCommits = res.stdout.split(delimiter).filter((c) => c.trim().length > 0);
  return rawCommits.map((c) => {
    const [sha, message, author, date] = c.trim().split('\t');
    return { sha: sha || '', message: message || '', author: author || '', date: date || '' };
  });
}

export async function getConflictedFiles(cwd?: string): Promise<string[]> {
  const status = await getStatus(cwd);
  return status.conflictedFiles;
}
