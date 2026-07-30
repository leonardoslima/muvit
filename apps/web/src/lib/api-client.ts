import { headers } from 'next/headers';
import { createClient, createConfig } from './api/client';
import type { ClientOptions } from './api/types.gen';

export async function configureServerClient() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');

  return createClient(
    createConfig<ClientOptions>({
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
      credentials: 'include',
      headers: cookie ? { cookie } : {},
    }),
  );
}
