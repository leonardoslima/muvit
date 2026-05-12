'use server';

import type { StudentFormState } from '@/components/student-form';
import { configureServerClient } from '@/lib/api-client';
import { deleteStudentsById, patchStudentsById } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function pickOpt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim();
  return v ? v : undefined;
}

export async function updateStudentAction(
  _: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'ID do aluno ausente.' };

  const body = {
    name: pickOpt(formData, 'name'),
    email: pickOpt(formData, 'email'),
    phone: pickOpt(formData, 'phone'),
    birthDate: pickOpt(formData, 'birthDate'),
    gender: pickOpt(formData, 'gender') as 'male' | 'female' | 'other' | undefined,
    goals: pickOpt(formData, 'goals'),
    restrictions: pickOpt(formData, 'restrictions'),
    status: pickOpt(formData, 'status') as 'active' | 'inactive' | 'paused' | undefined,
  };

  const client = await configureServerClient();
  const res = await patchStudentsById({ client, path: { id }, body });
  if (res.error || !res.data) return { error: 'Falha ao atualizar.' };
  revalidatePath(`/students/${id}`);
  revalidatePath('/students');
  return null;
}

export async function deleteStudentAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const client = await configureServerClient();
  await deleteStudentsById({ client, path: { id } });
  revalidatePath('/students');
  redirect('/students');
}
