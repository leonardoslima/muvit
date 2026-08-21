import { readTrimmed } from '../form-data';

export type ProfileFormData = {
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
};

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
