import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
const directory = fileURLToPath(new URL('../.local-db', import.meta.url));
await mkdir(directory, {
  recursive: true
});
let failed = false;
const child = spawn(process.env.MONGOD_BINARY || (process.platform === 'win32' ? 'mongod.exe' : 'mongod'), ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', '27017', '--replSet', 'devorbia'], {
  stdio: ['ignore', 'ignore', 'inherit']
});
child.on('error', () => {
  failed = true;
  console.error('MongoDB Community mongod was not found. Install it and add its bin directory to PATH, or set MONGOD_BINARY.');
  process.exitCode = 1;
});
child.on('exit', code => {
  failed = true;
  if (code) console.error('MongoDB stopped. Port 27017 may already be in use; see docs/SETUP.md.');
  process.exitCode = code || 0;
});
let connected = false;
for (let i = 0; i < 20; i++) {
  if (failed) break;
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/admin?directConnection=true', {
      serverSelectionTimeoutMS: 1000
    });
    const admin = mongoose.connection.db.admin(),
      hello = await admin.command({
        hello: 1
      });
    if (failed) break;
    if (hello.setName && hello.setName !== 'devorbia') throw new Error('A different replica set is running on this port.');
    if (!hello.setName) await admin.command({
      replSetInitiate: {
        _id: 'devorbia',
        members: [{
          _id: 0,
          host: '127.0.0.1:27017'
        }]
      }
    });
    connected = true;
    console.log('Local MongoDB replica set is ready. Keep this terminal open; run npm run dev in another terminal.');
    await mongoose.disconnect();
    break;
  } catch {
    await mongoose.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
if (!connected) {
  await mongoose.disconnect();
  console.error('Could not initialize local MongoDB. See docs/SETUP.md.');
  child.kill();
  process.exitCode = 1;
}
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
