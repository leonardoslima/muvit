import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ACCESS_KEY = 'muvit_access';
const REFRESH_KEY = 'muvit_refresh';
const USER_KEY = 'muvit_user';

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  hydrated: boolean;
};

type AuthActions = {
  setTokens: (accessToken: string, refreshToken: string, userId: string) => Promise<void>;
  setAccessToken: (accessToken: string) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuth = create<AuthState & AuthActions>((set) => ({
  hydrated: false,

  setTokens: async (accessToken: string, refreshToken: string, userId: string) => {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, userId);
    set({ accessToken, refreshToken, userId });
  },

  setAccessToken: async (accessToken: string) => {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    set({ accessToken });
  },

  clear: async () => {
    await Promise.all(
      [ACCESS_KEY, REFRESH_KEY, USER_KEY].map((key: string) => SecureStore.deleteItemAsync(key)),
    );
    set({ accessToken: undefined, refreshToken: undefined, userId: undefined });
  },

  hydrate: async () => {
    const [accessToken, refreshToken, userId] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    set({
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
      userId: userId ?? undefined,
      hydrated: true,
    });
  },
}));
