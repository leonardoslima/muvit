import { type BuildAppOptions, buildApp } from '../../src/app.js';

export async function buildTestApp(options: BuildAppOptions = {}) {
  const app = await buildApp({ sendVerificationEmail: async () => {}, ...options });
  return app;
}
