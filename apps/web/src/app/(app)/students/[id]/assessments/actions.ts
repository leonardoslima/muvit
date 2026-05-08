'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { configureServerClient } from '@/lib/api-client';
import { postStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';

export type AssessmentState = { error?: string } | null;

function num(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function createAssessmentAction(
  studentId: string,
  _: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const date = String(formData.get('date') ?? '');
  if (!date) return { error: 'Informe a data.' };

  const measurements = {
    chest: num(formData, 'chest'),
    waist: num(formData, 'waist'),
    hip: num(formData, 'hip'),
    armRight: num(formData, 'armRight'),
    armLeft: num(formData, 'armLeft'),
    thighRight: num(formData, 'thighRight'),
    thighLeft: num(formData, 'thighLeft'),
  };
  const hasMeasurements = Object.values(measurements).some((v) => v !== undefined);

  const client = await configureServerClient();
  const res = await postStudentsByStudentIdAssessments({
    client,
    path: { studentId },
    body: {
      date,
      weightKg: num(formData, 'weightKg'),
      heightCm: num(formData, 'heightCm'),
      bodyFatPct: num(formData, 'bodyFatPct'),
      measurements: hasMeasurements ? measurements : undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
    },
  });
  if (res.error || !res.data) return { error: 'Falha ao salvar avaliação.' };
  revalidatePath(`/students/${studentId}/assessments`);
  redirect(`/students/${studentId}/assessments`);
}
