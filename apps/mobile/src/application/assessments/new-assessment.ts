import type { ApiRequester } from '../../lib/api';
import { type CreateAssessmentInput, createAssessment } from './assessment-data';

export type AssessmentPhotoInput = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export type AssessmentFormValues = {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photos: readonly AssessmentPhotoInput[];
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

export function normalizeAssessmentPhotoSelection(
  assets: readonly { uri?: string; mimeType?: string }[],
): AssessmentPhotoInput[] | null {
  const photos: AssessmentPhotoInput[] = [];

  for (const asset of assets) {
    const contentType = toSupportedContentType(asset.mimeType);
    if (!asset.uri || !contentType) return null;

    photos.push({ uri: asset.uri, contentType });
  }

  return photos;
}

export function buildAssessmentPayload({
  date,
  weightKg,
  bodyFatPct,
  notes,
  photoUrls,
}: {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photoUrls?: readonly string[];
}): CreateAssessmentInput {
  return {
    date,
    weightKg: toOptionalNumber(weightKg),
    bodyFatPct: toOptionalNumber(bodyFatPct),
    photos: photoUrls?.length ? [...photoUrls] : undefined,
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
  const photoUrls: string[] = [];
  for (const photo of values.photos) {
    photoUrls.push(await uploadPhoto(photo));
  }

  const payload = buildAssessmentPayload({
    date: values.date,
    weightKg: values.weightKg,
    bodyFatPct: values.bodyFatPct,
    notes: values.notes,
    photoUrls,
  });

  await createAssessment(api, { kind: 'self' }, payload);
  await invalidateAssessments();
}
