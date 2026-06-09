import './instrumentation.js';
import { buildApp } from './app.js';
import { env } from './env.js';
import { startNotificationCron } from './jobs/notifications.js';

async function main() {
  const app = await buildApp();
  if (env.NODE_ENV !== 'test') void startNotificationCron();

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
