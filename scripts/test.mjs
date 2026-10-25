import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const folder = new URL(process.argv.includes('--integration') ? '../tests/integration/' : '../tests/', import.meta.url);
const files = (await readdir(folder)).filter(name => name.endsWith('.test.mjs')).map(name => fileURLToPath(new URL(name, folder)));
if (!files.length) throw new Error('No test files found.');
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit'
});
child.on('exit', code => {
  process.exitCode = code ?? 1;
});
