'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { configureServerClient } from '@/lib/api-client';
import { postStudents } from '@/lib/api/sdk.gen';
import type { StudentFormState } from '@/components/student-form';

function pickOpt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim();
  return v ? v : undefined;
}

export async function createStudentAction(_: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return { fieldErrors: { name: 'Informe o nome.' } };

  const body = {
    name,
    email: pickOpt(formData, 'email'),
    phone: pickOpt(formData, 'phone'),
    birthDate: pickOpt(formData, 'birthDate'),
    gender: pickOpt(formData, 'gender') as 'male' | 'female' | 'other' | undefined,
    goals: pickOpt(formData, 'goals'),
    restrictions: pickOpt(formData, 'restrictions'),
    status: (pickOpt(formData, 'status') ?? 'active') as 'active' | 'inactive' | 'paused',
  };

  const client = await configureServerClient();
  const res = await postStudents({ client, body });
  if (res.error || !res.data) {
    return { error: 'Não foi possível cadastrar o aluno.' };
  }
  revalidatePath('/students');
  redirect(`/students/${res.data.id}`);
}
