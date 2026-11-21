import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('next.config distDir', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('mantém .next quando o distDir explícito não é informado', async () => {
    vi.stubEnv('MUVIT_WEB_DIST_DIR', '');
    vi.resetModules();

    const { default: config } = await import('../next.config');

    expect(config.distDir).toBe('.next');
  });

  it('usa o distDir isolado informado pelo runner de produção', async () => {
    vi.stubEnv('MUVIT_WEB_DIST_DIR', '.next-e2e-aaaa11');
    vi.resetModules();

    const { default: config } = await import('../next.config');

    expect(config.distDir).toBe('.next-e2e-aaaa11');
  });

  it('valor explícito do runner prevalece sobre MUVIT_WEB_DIST_DIR de um .env real', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-'));
    try {
      await writeFile(join(dir, '.env'), 'MUVIT_WEB_DIST_DIR=.next-do-arquivo\n', 'utf8');
      vi.stubEnv('MUVIT_WEB_DIST_DIR', '.next');
      const appRequire = createRequire(import.meta.url);
      const nextRequire = createRequire(appRequire.resolve('next/package.json'));
      const { loadEnvConfig } = nextRequire('@next/env') as {
        loadEnvConfig: (
          directory: string,
          dev: boolean,
          log: { info: () => void; error: () => void },
        ) => void;
      };
      loadEnvConfig(dir, true, { info: () => {}, error: () => {} });
      expect(process.env.MUVIT_WEB_DIST_DIR).toBe('.next');
      vi.resetModules();
      const { default: config } = await import('../next.config');
      expect(config.distDir).toBe('.next');
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
