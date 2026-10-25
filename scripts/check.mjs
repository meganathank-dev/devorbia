import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
let count = 0;
async function check(dir) {
  for (const entry of await readdir(dir, {
    withFileTypes: true
  })) {
    if (['node_modules', 'dist', '.local-db', '.local-mail'].includes(entry.name)) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await check(path);else if (/\.(mjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', path], {
        encoding: 'utf8'
      });
      if (result.status !== 0) {
        console.error(result.stderr);
        process.exitCode = 1;
      }
      count++;
    }
  }
}
await check(root);
console.log(`Checked JavaScript syntax in ${count} files. JSX is checked by npm run build.`);
