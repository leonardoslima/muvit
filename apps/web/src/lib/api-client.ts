import { cookies } from 'next/headers';
import { client } from './api/client.gen';

export async function configureServerClient() {
  const c = await cookies();
  const access = c.get('muvit_access')?.value;
  client.setConfig({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
    headers: access ? { authorization: `Bearer ${access}` } : {},
  });
  return client;
}
