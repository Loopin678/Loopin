import pc from 'picocolors';

export const fmt = {
  bold: pc.bold,
  dim: pc.dim,
  cyan: pc.cyan,
  green: pc.green,
  yellow: pc.yellow,
  red: pc.red,
  magenta: pc.magenta,
  blue: pc.blue,

  tag: (label: string, color: (s: string) => string = pc.cyan) => color(`[${label}]`),
  success: (msg: string) => `${pc.green('✔')} ${msg}`,
  error: (msg: string) => `${pc.red('✖')} ${msg}`,
  warn: (msg: string) => `${pc.yellow('⚠')} ${msg}`,
  info: (msg: string) => `${pc.blue('ℹ')} ${msg}`,

  sha: (s: string) => pc.magenta(s.substring(0, 7)),
  task: (id: string, title?: string) => pc.cyan(`#${id.substring(0, 8)}${title ? ` (${title})` : ''}`),

  box: (title: string, lines: string[]) => {
    const width = Math.max(title.length + 4, ...lines.map((l) => l.length + 2), 48);
    const top = `┌─ ${pc.bold(title)} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`;
    const bottom = `└${'─'.repeat(width)}┘`;
    const middle = lines.map((l) => `│ ${l.padEnd(width - 2)} │`).join('\n');
    return `${top}\n${middle}\n${bottom}`;
  },

  table: (headers: string[], rows: string[][]) => {
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => (r[i] || '').replace(/\x1b\[[0-9;]*m/g, '').length))
    );

    const pad = (s: string, w: number) => {
      const plainLen = s.replace(/\x1b\[[0-9;]*m/g, '').length;
      return s + ' '.repeat(Math.max(0, w - plainLen));
    };

    const headStr = headers.map((h, i) => pc.bold(pad(h, colWidths[i]))).join('  ');
    const divider = colWidths.map((w) => '─'.repeat(w)).join('  ');
    const rowStrs = rows.map((r) => r.map((c, i) => pad(c, colWidths[i])).join('  ')).join('\n');

    return `${headStr}\n${pc.dim(divider)}\n${rowStrs}`;
  },
};
