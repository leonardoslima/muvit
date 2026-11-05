import { buildApp } from '../src/app.js';
import { env } from '../src/env.js';

if (env.NODE_ENV !== 'test' || !process.send)
  throw new Error('Servidor E2E exige IPC e NODE_ENV=test');
const app = await buildApp({
  sendVerificationEmail: async (message) => {
    if (!process.send) throw new Error('Canal E2E indisponível');
    await new Promise<void>((resolve, reject) => {
      process.send?.({ type: 'verification', message }, (error) =>
        error ? reject(error) : resolve(),
      );
    });
  },
});
await app.listen({ port: env.API_PORT, host: env.API_HOST });
