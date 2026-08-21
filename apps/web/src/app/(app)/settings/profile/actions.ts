'use server';

import {
  type ProfileFormState,
  buildProfileSubmission,
} from '@/application/settings/profile-form-data';
import { configureServerClient } from '@/lib/api-client';
import { updateTrainerProfile } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type { ProfileFormState } from '@/application/settings/profile-form-data';

export async function updateProfileAction(
  _: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const submission = buildProfileSubmission(formData);
  if (!submission.ok) return submission.state;

  const client = await configureServerClient();
  const response = await updateTrainerProfile({ client, body: submission.body });
  if (response.error || !response.data) {
    return getProfileError(response.response?.status);
  }

  await forwardSetCookies(response.response?.headers);
  revalidatePath('/settings', 'layout');
  revalidatePath('/settings/profile');
  return { success: true };
}

function getProfileError(status: number | undefined): ProfileFormState {
  if (status === 409) {
    return {
      fieldErrors: {
        email: 'Esse e-mail não está disponível. Atualize a página e tente outro e-mail.',
      },
    };
  }
  if (status === 500) {
    return { error: 'Não foi possível sincronizar seus dados de acesso. Tente novamente.' };
  }
  return { error: 'Não foi possível salvar seu perfil. Seus dados permanecem no formulário.' };
}

async function forwardSetCookies(headers: Headers | undefined): Promise<void> {
  if (!headers) return;
  const cookieStore = await cookies();
  for (const header of headers.getSetCookie()) {
    const parsed = parseSetCookie(header);
    if (parsed) cookieStore.set(parsed.name, parsed.value, parsed.options);
  }
}

type ForwardedCookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'none' | 'strict';
  secure?: boolean;
};

function parseSetCookie(
  value: string,
): { name: string; value: string; options: ForwardedCookieOptions } | null {
  const [pair, ...attributes] = value.split(';').map((part) => part.trim());
  if (!pair) return null;
  const separator = pair.indexOf('=');
  if (separator < 1) return null;
  const options: ForwardedCookieOptions = {};
  for (const attribute of attributes) {
    const [rawName, ...rawValue] = attribute.split('=');
    const name = rawName?.toLowerCase();
    const attributeValue = rawValue.join('=');
    if (name === 'path' && attributeValue) options.path = attributeValue;
    if (name === 'domain' && attributeValue) options.domain = attributeValue;
    if (name === 'httponly') options.httpOnly = true;
    if (name === 'secure') options.secure = true;
    if (name === 'max-age' && /^\d+$/.test(attributeValue)) options.maxAge = Number(attributeValue);
    if (name === 'expires' && attributeValue) options.expires = new Date(attributeValue);
    if (name === 'samesite' && /^(lax|strict|none)$/i.test(attributeValue)) {
      options.sameSite = attributeValue.toLowerCase() as ForwardedCookieOptions['sameSite'];
    }
  }
  return { name: pair.slice(0, separator), value: pair.slice(separator + 1), options };
}
