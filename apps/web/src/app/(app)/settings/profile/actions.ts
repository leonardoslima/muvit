'use server';

import {
  type ProfileFormData,
  parseProfileFormData,
} from '@/application/settings/profile-form-data';
import { configureServerClient } from '@/lib/api-client';
import { updateTrainerProfile } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'email', string>>;
  success?: true;
} | null;

export async function updateProfileAction(
  _: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const body = parseProfileFormData(formData);
  const validationError = validateProfile(body);
  if (validationError) return validationError;

  const client = await configureServerClient();
  const response = await updateTrainerProfile({ client, body });
  if (response.error || !response.data) {
    return { error: getProfileError(response.error) };
  }

  revalidatePath('/settings', 'layout');
  revalidatePath('/settings/profile');
  return { success: true };
}

function validateProfile(body: ProfileFormData): ProfileFormState | null {
  if (body.name.length < 2) return { fieldErrors: { name: 'Informe seu nome.' } };
  if (!body.email.includes('@')) return { fieldErrors: { email: 'Informe um e-mail válido.' } };
  return null;
}

function getProfileError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const message = error.error;
    if (typeof message === 'string' && /e-?mail|email/i.test(message)) {
      return 'Este e-mail já está em uso ou não pôde ser sincronizado. Revise-o e tente novamente.';
    }
  }
  return 'Não foi possível salvar seu perfil. Seus dados permanecem no formulário para nova tentativa.';
}
