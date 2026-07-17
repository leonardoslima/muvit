import { readOptionalNumber, readOptionalTrimmed, readTrimmed } from '../form-data';

export type AssessmentState = { error?: string } | null;

type AssessmentMeasurements = {
  chest?: number;
  waist?: number;
  hip?: number;
  armRight?: number;
  armLeft?: number;
  thighRight?: number;
  thighLeft?: number;
  calfRight?: number;
  calfLeft?: number;
};

type AssessmentBody = {
  date: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  measurements?: AssessmentMeasurements;
  photos?: string[];
  notes?: string;
};

type AssessmentPayloadResult =
  | { ok: true; body: AssessmentBody }
  | { ok: false; state: AssessmentState };

export function buildAssessmentPayload(
  formData: FormData,
  photoUrls: string[] = [],
): AssessmentPayloadResult {
  const date = readTrimmed(formData, 'date');
  if (!date) return { ok: false, state: { error: 'Informe a data.' } };

  const measurements: AssessmentMeasurements = {
    chest: readOptionalNumber(formData, 'chest'),
    waist: readOptionalNumber(formData, 'waist'),
    hip: readOptionalNumber(formData, 'hip'),
    armRight: readOptionalNumber(formData, 'armRight'),
    armLeft: readOptionalNumber(formData, 'armLeft'),
    thighRight: readOptionalNumber(formData, 'thighRight'),
    thighLeft: readOptionalNumber(formData, 'thighLeft'),
    calfRight: readOptionalNumber(formData, 'calfRight'),
    calfLeft: readOptionalNumber(formData, 'calfLeft'),
  };
  const hasMeasurements = Object.values(measurements).some((value) => value !== undefined);

  return {
    ok: true,
    body: {
      date,
      weightKg: readOptionalNumber(formData, 'weightKg'),
      heightCm: readOptionalNumber(formData, 'heightCm'),
      bodyFatPct: readOptionalNumber(formData, 'bodyFatPct'),
      measurements: hasMeasurements ? measurements : undefined,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      notes: readOptionalTrimmed(formData, 'notes'),
    },
  };
}
