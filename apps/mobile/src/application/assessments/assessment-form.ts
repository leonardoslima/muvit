import { createAssessmentSchema } from '@muvit/validators';
import type { CreateAssessmentInput } from './assessment-data';

export type AssessmentPhotoInput = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export type TrainerAssessmentMeasurements = {
  chest: string;
  waist: string;
  hip: string;
  armRight: string;
  armLeft: string;
  thighRight: string;
  thighLeft: string;
  calfRight: string;
  calfLeft: string;
};

export type TrainerAssessmentFormValues = {
  date: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  measurements: TrainerAssessmentMeasurements;
  notes: string;
};

export type BuildAssessmentInputResult =
  | { ok: true; body: CreateAssessmentInput }
  | { ok: false; message: string };

export function emptyTrainerAssessmentMeasurements(): TrainerAssessmentMeasurements {
  return {
    chest: '',
    waist: '',
    hip: '',
    armRight: '',
    armLeft: '',
    thighRight: '',
    thighLeft: '',
    calfRight: '',
    calfLeft: '',
  };
}

function parseOptionalNumber(
  label: string,
  value: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return { ok: true, value: undefined };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${label} deve ser um número válido.` };
  }

  return { ok: true, value: parsed };
}

export function buildCreateAssessmentInput(
  values: TrainerAssessmentFormValues,
  photoUrls: string[],
): BuildAssessmentInputResult {
  const scalarFields = [
    ['Peso', 'weightKg', values.weightKg],
    ['Altura', 'heightCm', values.heightCm],
    ['Gordura corporal', 'bodyFatPct', values.bodyFatPct],
  ] as const;

  const parsedScalars: Record<string, number | undefined> = {};
  for (const [label, key, rawValue] of scalarFields) {
    const parsed = parseOptionalNumber(label, rawValue);
    if (!parsed.ok) return parsed;
    parsedScalars[key] = parsed.value;
  }

  const measurementLabels: Record<keyof TrainerAssessmentMeasurements, string> = {
    chest: 'Peito',
    waist: 'Cintura',
    hip: 'Quadril',
    armRight: 'Braço direito',
    armLeft: 'Braço esquerdo',
    thighRight: 'Coxa direita',
    thighLeft: 'Coxa esquerda',
    calfRight: 'Panturrilha direita',
    calfLeft: 'Panturrilha esquerda',
  };

  const measurements: Partial<Record<keyof TrainerAssessmentMeasurements, number>> = {};
  for (const key of Object.keys(values.measurements) as Array<
    keyof TrainerAssessmentMeasurements
  >) {
    const parsed = parseOptionalNumber(measurementLabels[key], values.measurements[key]);
    if (!parsed.ok) return parsed;
    if (parsed.value !== undefined) measurements[key] = parsed.value;
  }

  const candidate = {
    date: values.date.trim(),
    weightKg: parsedScalars.weightKg,
    heightCm: parsedScalars.heightCm,
    bodyFatPct: parsedScalars.bodyFatPct,
    measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
    photos: photoUrls.length > 0 ? photoUrls : undefined,
    notes: values.notes.trim() || undefined,
  };

  const parsed = createAssessmentSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados da avaliação.',
    };
  }

  return { ok: true, body: parsed.data };
}

export function calculateBmi(weightKg: string, heightCm: string): number | null {
  const weight = Number(weightKg.replace(',', '.').trim());
  const height = Number(heightCm.replace(',', '.').trim());

  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    return null;
  }

  return weight / (height / 100) ** 2;
}
