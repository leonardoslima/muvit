import { describe, expect, it, vi } from 'vitest';
import { type KeyValueStorage, createOfflineCache } from './offline-cache';

function memoryStorage(seed: Record<string, string | null> = {}): KeyValueStorage {
  const values = new Map(Object.entries(seed));
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe('createOfflineCache', () => {
  it('salva resposta fresca e marca stale como false', async () => {
    const storage = memoryStorage();
    const cache = createOfflineCache(storage);

    const result = await cache.get('treino-hoje', async () => ({ name: 'Treino A' }));

    expect(result).toEqual({ data: { name: 'Treino A' }, stale: false });
    expect(storage.setItem).toHaveBeenCalledWith(
      'treino-hoje',
      JSON.stringify({ name: 'Treino A' }),
    );
  });

  it('retorna ultimo valor cacheado quando fetch falha', async () => {
    const storage = memoryStorage({ 'treino-hoje': JSON.stringify({ name: 'Treino A' }) });
    const cache = createOfflineCache(storage);

    const result = await cache.get('treino-hoje', async () => {
      throw new Error('offline');
    });

    expect(result).toEqual({ data: { name: 'Treino A' }, stale: true });
  });
});
