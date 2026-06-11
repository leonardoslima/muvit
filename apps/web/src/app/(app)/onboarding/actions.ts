'use server';

import { headersFromConfig } from '@/application/http/headers';
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
