import { useMemo } from 'react';
import { ApiClient } from './api';
import { useAuth } from './auth-store';
import { config } from './config';

export function useApiClient(): ApiClient {
  const accessToken = useAuth((state) => state.accessToken);
  const refreshToken = useAuth((state) => state.refreshToken);
  const setAccessToken = useAuth((state) => state.setAccessToken);
  const clear = useAuth((state) => state.clear);

  return useMemo(
    () =>
      new ApiClient({
        baseUrl: config.apiUrl,
        getAccessToken: () => accessToken,
        getRefreshToken: () => refreshToken,
        setAccessToken,
        clearAuth: clear,
      }),
    [accessToken, refreshToken, setAccessToken, clear],
  );
}
