import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const file = new URL('../.env', import.meta.url);
if (existsSync(file)) {
  console.log('.env already exists. It has not been changed.');
} else {
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  await writeFile(file, example.replace('APP_SECRET=GENERATE_WITH_NPM_RUN_SETUP', `APP_SECRET=${randomBytes(48).toString('hex')}`), {
    mode: 0o600
  });
  console.log(`Created ${fileURLToPath(file)}. Choose MongoDB and bootstrap credentials before starting.`);
}
