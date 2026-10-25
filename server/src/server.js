import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { startJobs } from './services/jobs.js';
try {
  await connectDatabase();
  const server = createApp().listen(env.PORT, env.HOST, () => console.log(`DevOrbia API listening on ${env.HOST}:${env.PORT}`));
  const stopJobs = startJobs();
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    stopJobs();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error(error.name === 'Error' ? error.message : 'Startup failed. Check MongoDB replica-set access and .env configuration.');
  await mongoose.disconnect();
  process.exitCode = 1;
}
