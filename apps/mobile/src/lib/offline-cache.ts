export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type CacheResult<T> = {
  data: T;
  stale: boolean;
};

export function createOfflineCache(storage: KeyValueStorage) {
  return {
    async get<T>(key: string, fetcher: () => Promise<T>): Promise<CacheResult<T>> {
      try {
        const data = await fetcher();
        await storage.setItem(key, JSON.stringify(data));
        return { data, stale: false };
      } catch (error) {
        const cached = await storage.getItem(key);
        if (!cached) throw error;
        return { data: JSON.parse(cached) as T, stale: true };
      }
    },
  };
}
