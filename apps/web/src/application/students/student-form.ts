import { readOptionalTrimmed, readTrimmed } from '../form-data';

export type StudentFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export type StudentGender = 'male' | 'female' | 'other';
export type StudentStatus = 'active' | 'inactive' | 'paused';

type StudentBody = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: StudentGender;
  goals?: string;
  trainingDays?: number;
  restrictions?: string;
  internalNotes?: string;
  status?: StudentStatus;
};

type CreateStudentBody = StudentBody & {
  name: string;
  status: StudentStatus;
};

type CreateStudentResult =
  | { ok: true; body: CreateStudentBody }
  | { ok: false; state: StudentFormState };
type UpdateStudentResult =
  | { ok: true; id: string; body: StudentBody }
  | { ok: false; state: StudentFormState };

const studentGenders = new Set<StudentGender>(['male', 'female', 'other']);
const studentStatuses = new Set<StudentStatus>(['active', 'inactive', 'paused']);

export function buildCreateStudentBody(formData: FormData): CreateStudentResult {
  const name = readTrimmed(formData, 'name');
  if (name.length < 2) return { ok: false, state: { fieldErrors: { name: 'Informe o nome.' } } };

  return {
    ok: true,
    body: {
      name,
      email: readOptionalTrimmed(formData, 'email'),
      phone: readOptionalTrimmed(formData, 'phone'),
      birthDate: readOptionalTrimmed(formData, 'birthDate'),
      gender: readStudentGender(formData),
      goals: readOptionalTrimmed(formData, 'goals'),
      trainingDays: readTrainingDays(formData),
      restrictions: readOptionalTrimmed(formData, 'restrictions'),
      internalNotes: readOptionalTrimmed(formData, 'internalNotes'),
      status: readStudentStatus(formData) ?? 'active',
    },
  };
}

export function buildUpdateStudentBody(formData: FormData): UpdateStudentResult {
  const id = readTrimmed(formData, 'id');
  if (!id) return { ok: false, state: { error: 'ID do aluno ausente.' } };

  return {
    ok: true,
    id,
    body: {
      name: readOptionalTrimmed(formData, 'name'),
      email: readOptionalTrimmed(formData, 'email'),
      phone: readOptionalTrimmed(formData, 'phone'),
      birthDate: readOptionalTrimmed(formData, 'birthDate'),
      gender: readStudentGender(formData),
      goals: readOptionalTrimmed(formData, 'goals'),
      trainingDays: readTrainingDays(formData),
      restrictions: readOptionalTrimmed(formData, 'restrictions'),
      internalNotes: readOptionalTrimmed(formData, 'internalNotes'),
      status: readStudentStatus(formData),
    },
  };
}

function readStudentGender(formData: FormData): StudentGender | undefined {
  const value = readOptionalTrimmed(formData, 'gender');
  return value && studentGenders.has(value as StudentGender) ? (value as StudentGender) : undefined;
}

function readStudentStatus(formData: FormData): StudentStatus | undefined {
  const value = readOptionalTrimmed(formData, 'status');
  return value && studentStatuses.has(value as StudentStatus)
    ? (value as StudentStatus)
    : undefined;
}

function readTrainingDays(formData: FormData): number | undefined {
  const value = readOptionalTrimmed(formData, 'trainingDays');
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : undefined;
}
