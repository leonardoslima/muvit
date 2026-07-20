'use server';

import { configureServerClient } from '@/lib/api-client';
import { postTrainersOnboarding } from '@/lib/api/sdk.gen';
import { redirect } from 'next/navigation';

export async function completeOnboardingAction(): Promise<void> {
  const client = await configureServerClient();
  const response = await postTrainersOnboarding({ client });

  if (response.error) {
    throw new Error('Falha ao concluir onboarding.');
  }

  redirect('/dashboard');
}
