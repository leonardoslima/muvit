import { buildApp } from '../../src/app.js';
export async function buildTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
