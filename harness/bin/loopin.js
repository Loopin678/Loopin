#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist/index.js');

if (fs.existsSync(distPath)) {
  await import(distPath);
} else {
  // If not built yet, fallback to tsx loading src/index.ts
  const srcPath = path.resolve(__dirname, '../src/index.ts');
  try {
    const { register } = await import('tsx/esm/api');
    await import(srcPath);
  } catch {
    console.error('Please build the harness first using: npm run build');
    process.exit(1);
  }
}
