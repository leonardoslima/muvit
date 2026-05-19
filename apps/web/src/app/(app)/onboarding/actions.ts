'use server';

import { configureServerClient } from '@/lib/api-client';
import { redirect } from 'next/navigation';

export async function completeOnboardingAction(): Promise<void> {
  const client = await configureServerClient();
  const config = client.getConfig();
  const baseUrl = String(config.baseUrl ?? 'http://localhost:3333').replace(/\/$/, '');

  const response = await fetch(`${baseUrl}/trainers/me/onboarding`, {
    method: 'POST',
    headers: headersFromConfig(config.headers),
  });

  if (!response.ok) {
    throw new Error('Falha ao concluir onboarding.');
  }

  redirect('/dashboard');
}

function headersFromConfig(value: unknown): Headers {
  const headers = new Headers();

  if (value instanceof Headers) {
    value.forEach((headerValue, headerName) => headers.set(headerName, headerValue));
    return headers;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string'
      ) {
        headers.set(entry[0], entry[1]);
      }
    }
    return headers;
  }

  if (value !== null && typeof value === 'object') {
    for (const [headerName, headerValue] of Object.entries(value)) {
      if (typeof headerValue === 'string') headers.set(headerName, headerValue);
    }
  }

  return headers;
}
