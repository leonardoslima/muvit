'use server';

import {
  type AssessmentState,
  buildAssessmentPayload,
} from '@/application/assessments/assessment-form-data';
import { presignUpload } from '@/application/uploads/presign-upload';
import { configureServerClient } from '@/lib/api-client';
import { postStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import { uploadFileWithPresignedUrl } from '@/lib/uploads';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type { AssessmentState } from '@/application/assessments/assessment-form-data';

export async function createAssessmentAction(
  studentId: string,
  _: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const client = await configureServerClient();
  const photo = formData.get('photo');
  let photoUrl: string | undefined;

  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await uploadFileWithPresignedUrl({
        file: photo,
        kind: 'assessment-photo',
        presign: (body) => presignUpload({ client, body }),
      });
    } catch {
      return { error: 'Falha ao enviar foto da avaliacao.' };
    }
  }

  const input = buildAssessmentPayload(formData, photoUrl);
  if (!input.ok) return input.state;

  const res = await postStudentsByStudentIdAssessments({
    client,
    path: { studentId },
    body: input.body,
  });
  if (res.error || !res.data) return { error: 'Falha ao salvar avaliação.' };
  revalidatePath(`/students/${studentId}/assessments`);
  redirect(`/students/${studentId}/assessments`);
}
