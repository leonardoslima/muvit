'use server';

import { type StudentFormState, buildUpdateStudentBody } from '@/application/students/student-form';
import { configureServerClient } from '@/lib/api-client';
import { deleteStudentsById, patchStudentsById } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateStudentAction(
  _: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = buildUpdateStudentBody(formData);
  if (!input.ok) return input.state;

  const client = await configureServerClient();
  const res = await patchStudentsById({ client, path: { id: input.id }, body: input.body });
  if (res.error || !res.data) return { error: 'Falha ao atualizar.' };
  revalidatePath(`/students/${input.id}`);
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
