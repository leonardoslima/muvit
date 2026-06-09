'use server';

import { configureServerClient } from '@/lib/api-client';
import { postStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import {
  type PresignUploadInput,
  type PresignedUpload,
  uploadFileWithPresignedUrl,
} from '@/lib/uploads';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  const photo = formData.get('photo');
  let photoUrl: string | undefined;

  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await uploadFileWithPresignedUrl({
        file: photo,
        kind: 'assessment-photo',
        presign: (body) => presignUpload(client, body),
      });
    } catch {
      return { error: 'Falha ao enviar foto da avaliacao.' };
    }
  }

  const res = await postStudentsByStudentIdAssessments({
    client,
    path: { studentId },
    body: {
      date,
      weightKg: num(formData, 'weightKg'),
      heightCm: num(formData, 'heightCm'),
      bodyFatPct: num(formData, 'bodyFatPct'),
      measurements: hasMeasurements ? measurements : undefined,
      photos: photoUrl ? [photoUrl] : undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
    },
  });
  if (res.error || !res.data) return { error: 'Falha ao salvar avaliação.' };
  revalidatePath(`/students/${studentId}/assessments`);
  redirect(`/students/${studentId}/assessments`);
}

async function presignUpload(
  client: Awaited<ReturnType<typeof configureServerClient>>,
  body: PresignUploadInput,
): Promise<PresignedUpload> {
  const config = client.getConfig();
  const baseUrl = String(config.baseUrl ?? 'http://localhost:3333').replace(/\/$/, '');
  const headers = headersFromConfig(config.headers);
  headers.set('content-type', 'application/json');

  const response = await fetch(`${baseUrl}/uploads/presign`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('presign failed');
  }

  const payload: unknown = await response.json();
  if (!isPresignedUpload(payload)) {
    throw new Error('invalid presign response');
  }

  return payload;
}

function isPresignedUpload(value: unknown): value is PresignedUpload {
  return (
    value !== null &&
    typeof value === 'object' &&
    'uploadUrl' in value &&
    'publicUrl' in value &&
    typeof value.uploadUrl === 'string' &&
    typeof value.publicUrl === 'string'
  );
}

function headersFromConfig(value: unknown): Headers {
  const headers = new Headers();

  if (value instanceof Headers) {
    value.forEach((headerValue, headerName) => headers.set(headerName, headerValue));
    return headers;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string'
      ) {
        headers.set(entry[0], entry[1]);
      }
    }
    return headers;
  }

  if (value !== null && typeof value === 'object') {
    for (const [headerName, headerValue] of Object.entries(value)) {
      if (typeof headerValue === 'string') {
        headers.set(headerName, headerValue);
      }
    }
  }

  return headers;
}
