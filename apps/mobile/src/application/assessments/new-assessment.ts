import type { ApiRequester } from '../../lib/api';
import { createAssessment } from './assessment-data';

type AssessmentPayload = {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  photos?: string[];
  notes?: string;
};

export type AssessmentPhotoInput = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export type AssessmentFormValues = {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photo?: AssessmentPhotoInput;
};

export function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toSupportedContentType(
  value: string | undefined,
): AssessmentPhotoInput['contentType'] | null {
  if (value === 'image/jpeg' || value === 'image/png') return value;
  return null;
}

export function buildAssessmentPayload({
  date,
  weightKg,
  bodyFatPct,
  notes,
  photoUrl,
}: {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photoUrl?: string;
}): AssessmentPayload {
  return {
    date,
    weightKg: toOptionalNumber(weightKg),
    bodyFatPct: toOptionalNumber(bodyFatPct),
    photos: photoUrl ? [photoUrl] : undefined,
    notes: notes.trim() || undefined,
  };
}

export async function submitAssessment({
  api,
  values,
  uploadPhoto,
  invalidateAssessments,
}: {
  api: ApiRequester;
  values: AssessmentFormValues;
  uploadPhoto: (photo: AssessmentPhotoInput) => Promise<string>;
  invalidateAssessments: () => Promise<void>;
}): Promise<void> {
  const photoUrl = values.photo ? await uploadPhoto(values.photo) : undefined;
  const payload = buildAssessmentPayload({
    date: values.date,
    weightKg: values.weightKg,
    bodyFatPct: values.bodyFatPct,
    notes: values.notes,
    photoUrl,
  });

  await createAssessment(api, { kind: 'self' }, payload);
  await invalidateAssessments();
}
