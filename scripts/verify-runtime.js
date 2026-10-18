import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { check, fail } from './common.js';

async function main() {
  const root = resolve(process.argv[2] ?? '.');
  for (const name of ['playwright', 'playwright-core', '@playwright/test', 'onnxruntime-node', 'onnxruntime-common', 'typescript', 'eslint']) {
    let present = true;
    try { await access(resolve(root, 'node_modules', name)); }
    catch (error) { if (error.code === 'ENOENT') present = false; else throw error; }
    check(!present, `Production installation unexpectedly contains ${name}.`);
  }
  process.stdout.write('Production install: no browser, native model runtime, TypeScript, or ESLint dependency.\n');
}
main().catch(fail);
