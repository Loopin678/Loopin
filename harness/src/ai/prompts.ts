export function buildSlicingPrompt(params: {
  files: string[];
  diffSummary: string;
  activeTask?: { id: string; title: string };
}): string {
  const taskContext = params.activeTask
    ? `Active Task: #${params.activeTask.id} - "${params.activeTask.title}"`
    : 'No specific task claimed.';

  return `You are an expert Git Architect and Pair-Programming Tech Lead.
Your goal is to inspect a set of file changes and divide them into atomic, logical, self-contained Conventional Commits.

${taskContext}

Changed Files:
${params.files.map((f) => `- ${f}`).join('\n')}

Diff Summary:
${params.diffSummary.substring(0, 10000)}

Rules for Commit Slicing:
1. Every commit must be atomic: it should represent a single coherent unit of work.
2. Group files by architectural subsystem:
   - Config / Dependencies (package.json, tsconfig, etc.) -> "build" or "chore"
   - Database / Migrations / Schema (prisma, sql) -> "chore(db)" or "feat(db)"
   - Core / Services / Backend routes -> "feat" / "fix" / "refactor"
   - Frontend / UI components / Pages -> "feat(ui)" / "fix(ui)"
   - Tests -> "test"
   - Documentation -> "docs"
3. Do NOT lump unrelated frontend, backend, and config changes into a single mega-commit unless they are intrinsically coupled to 1 single tiny change.
4. If an active task is provided, append \`Refs #${params.activeTask?.id || ''}\` to the commit body or title.
5. All changed files must be included across the commit slices with no duplicates.

Respond ONLY with valid JSON in this exact structure:
[
  {
    "type": "feat",
    "scope": "backend",
    "title": "feat(backend): add commit slicing endpoint",
    "body": "- Added slicer service\\n- Handled error responses\\n\\nRefs #${params.activeTask?.id || ''}",
    "files": ["backend/src/services/slicer.ts"],
    "reasoning": "Encapsulates backend service logic"
  }
]`;
}

export function buildConflictPrompt(params: {
  filePath: string;
  fileContentWithMarkers: string;
  oursBranch?: string;
  theirsBranch?: string;
}): string {
  return `You are an expert Git Merge and Software Architecture assistant.
The following file "${params.filePath}" has merge conflict markers (<<<<<<< HEAD ... ======= ... >>>>>>>).

Resolve the conflict completely:
1. Preserve intent and necessary logic from both branches where possible.
2. Ensure valid syntax (e.g., matching braces, correct imports, no duplicate declarations).
3. Completely remove all conflict markers (<<<<<<<, =======, >>>>>>>).
4. Do NOT output any markdown backticks, explanations, or commentary. Output ONLY the raw resolved file content.

File Content with Conflicts:
${params.fileContentWithMarkers}`;
}

export function buildQueryPrompt(params: {
  question: string;
  branch: string;
  clean: boolean;
  changedFilesCount: number;
  recentCommits: Array<{ sha: string; message: string; author: string }>;
  tasks: Array<{ id: string; title: string; listTitle?: string }>;
  activeTask?: { id: string; title: string };
}): string {
  const taskListStr = params.tasks
    .slice(0, 15)
    .map((t) => `- [${t.listTitle || 'Task'}] #${t.id}: ${t.title}`)
    .join('\n');

  const commitListStr = params.recentCommits
    .slice(0, 5)
    .map((c) => `- ${c.sha.substring(0, 7)} ${c.message} (${c.author})`)
    .join('\n');

  return `You are Loopin Cowork AI, the intelligent Git and Task Management companion.
You assist developers and autonomous agents in coordinating work, splitting tasks, structuring commits, and understanding project velocity.

Workspace Context:
- Current Branch: ${params.branch}
- Working Tree: ${params.clean ? 'Clean' : `${params.changedFilesCount} modified/untracked files`}
- Active Claimed Task: ${params.activeTask ? `#${params.activeTask.id} (${params.activeTask.title})` : 'None'}

Recent Commits:
${commitListStr || '(none)'}

Project Tasks:
${taskListStr || '(no tasks)'}

User / Agent Question:
"${params.question}"

Provide a concise, direct, and actionable answer. Highlight specific tasks, files, or git strategies when relevant.`;
}
