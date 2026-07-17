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

const PHOTO_FIELDS = ['photoFront', 'photoBack', 'photoSide'] as const;

export async function createAssessmentAction(
  studentId: string,
  _: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const initialInput = buildAssessmentPayload(formData);
  if (!initialInput.ok) return initialInput.state;

  const client = await configureServerClient();
  const photos = PHOTO_FIELDS.map((field) => formData.get(field)).filter(
    (photo): photo is File => photo instanceof File && photo.size > 0,
  );
  let photoUrls: string[] = [];

  if (photos.length > 0) {
    try {
      photoUrls = await Promise.all(
        photos.map((file) =>
          uploadFileWithPresignedUrl({
            file,
            kind: 'assessment-photo',
            presign: (body) => presignUpload({ client, body }),
          }),
        ),
      );
    } catch {
      return { error: 'Falha ao enviar as fotos da avaliação.' };
    }
  }

  const input = photoUrls.length > 0 ? buildAssessmentPayload(formData, photoUrls) : initialInput;
  if (!input.ok) return input.state;

  const response = await postStudentsByStudentIdAssessments({
    client,
    path: { studentId },
    body: input.body,
  });
  if (response.error || !response.data) return { error: 'Falha ao salvar avaliação.' };

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/assessments`);
  redirect(`/students/${studentId}/assessments`);
}
