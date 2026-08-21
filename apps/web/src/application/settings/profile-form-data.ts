import { updateTrainerProfileSchema } from '@muvit/validators';
import { readTrimmed } from '../form-data';

export type ProfileFormData = {
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
};

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<'name' | 'email' | 'phone' | 'bio' | 'specialties' | 'avatarUrl', string>
  >;
  success?: true;
} | null;

export type ProfileSubmission =
  | { ok: true; body: ProfileFormData }
  | { ok: false; state: ProfileFormState };

export function parseProfileFormData(formData: FormData): ProfileFormData {
  return {
    name: readTrimmed(formData, 'name'),
    email: readTrimmed(formData, 'email'),
    phone: readNullableTrimmed(formData, 'phone'),
    bio: readNullableTrimmed(formData, 'bio'),
    specialties: readSpecialties(formData),
    avatarUrl: readNullableTrimmed(formData, 'avatarUrl'),
  };
}

export function buildProfileSubmission(formData: FormData): ProfileSubmission {
  const body = parseProfileFormData(formData);
  const validation = updateTrainerProfileSchema.safeParse(body);
  if (validation.success) return { ok: true, body };

  const fieldErrors: NonNullable<ProfileFormState>['fieldErrors'] = {};
  for (const issue of validation.error.issues) {
    const field = issue.path[0];
    if (field === 'name') fieldErrors.name = 'Informe seu nome.';
    if (field === 'email') fieldErrors.email = 'Informe um e-mail válido.';
    if (field === 'phone') fieldErrors.phone = 'Informe um telefone com até 20 caracteres.';
    if (field === 'bio') fieldErrors.bio = 'A bio deve ter até 2000 caracteres.';
    if (field === 'specialties') {
      fieldErrors.specialties = 'Informe no máximo 10 especialidades de até 50 caracteres.';
    }
    if (field === 'avatarUrl') fieldErrors.avatarUrl = 'Informe uma URL válida para o avatar.';
  }
  return { ok: false, state: { fieldErrors } };
}

function readNullableTrimmed(formData: FormData, key: string): string | null {
  return readTrimmed(formData, key) || null;
}

function readSpecialties(formData: FormData): string[] {
  return [
    ...new Set(
      readTrimmed(formData, 'specialties')
        .split(',')
        .map((item) => item.trim()),
    ),
  ].filter(Boolean);
}
