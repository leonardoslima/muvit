'use server';

import { buildCreateStudentBody } from '@/application/students/student-form';
import { configureServerClient } from '@/lib/api-client';
import { postStudents } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type CreateStudentState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  studentId?: string;
} | null;

export async function createStudentAction(
  _: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const input = buildCreateStudentBody(formData);
  if (!input.ok) return input.state;

  const client = await configureServerClient();
  const response = await postStudents({ client, body: input.body });
  if (response.error || !response.data) {
    return { error: 'Não foi possível cadastrar o aluno.' };
  }
  revalidatePath('/students');
  return { studentId: response.data.id };
}
