import mongoose from 'mongoose';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env, root } from '../src/config/env.js';
import { connectDatabase, transaction } from '../src/config/database.js';
import { User, Organization } from '../src/models/index.js';
import { randomToken } from '../src/utils/security.js';
import { createFixtures } from './fixtures.js';
try {
  if (env.NODE_ENV !== 'development') throw new Error('Demo seeding is allowed only in development.');
  await connectDatabase();
  if ((await User.countDocuments({})) || (await Organization.countDocuments({}))) throw new Error('Demo seed requires an empty database. Existing records were not changed. Use a separate devorbia_demo database.');
  const password = `Demo-${randomToken().slice(0, 18)}-7!`,
    fixtures = await transaction(session => createFixtures({
      password,
      session
    }));
  const emails = [fixtures.platform.email, ...fixtures.organizations.flatMap(org => Object.values(org.users).map(u => `${u.email} — ${u.role}`))];
  await writeFile(path.join(root, '.demo-credentials.txt'), `DEVORBIA DEMONSTRATION ACCOUNTS\n\nGenerated password (all demo accounts): ${password}\n\n${emails.join('\n')}\n\nUse demo accounts only on a private local development database.\n`, {
    mode: 0o600
  });
  console.log('Demo records created in two organizations. Your generated sign-in credentials are in .demo-credentials.txt at the project root.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
