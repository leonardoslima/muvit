import { useMemo } from 'react';
import { ApiClient } from './api';
import { authClient } from './auth-client';
import { config } from './config';
import { queryClient } from './query-client';

export function useApiClient(): ApiClient {
  return useMemo(
    () =>
      new ApiClient({
        baseUrl: config.apiUrl,
        getCookie: () => authClient.getCookie(),
        onUnauthorized: async () => {
          try {
            await authClient.signOut();
          } finally {
            queryClient.clear();
          }
        },
      }),
    [],
  );
}
