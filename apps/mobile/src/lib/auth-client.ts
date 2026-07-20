import { expoClient } from '@better-auth/expo/client';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

export type AuthRole = 'trainer' | 'student';

export const authClient = createAuthClient({
  baseURL: config.apiUrl,
  plugins: [
    expoClient({
      scheme: 'muvit',
      storagePrefix: 'muvit_auth',
      cookiePrefix: 'muvit',
      storage: SecureStore,
    }),
    inferAdditionalFields({
      user: {
        role: {
          type: 'string',
          required: true,
        },
      },
    }),
  ],
});
