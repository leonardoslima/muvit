'use server';

import { type StudentFormState, buildCreateStudentBody } from '@/application/students/student-form';
import { configureServerClient } from '@/lib/api-client';
import { postStudents } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createStudentAction(
  _: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = buildCreateStudentBody(formData);
  if (!input.ok) return input.state;

  const client = await configureServerClient();
  const res = await postStudents({ client, body: input.body });
  if (res.error || !res.data) {
    return { error: 'Nao foi possivel cadastrar o aluno.' };
  }
  revalidatePath('/students');
  redirect(`/students/${res.data.id}`);
}
