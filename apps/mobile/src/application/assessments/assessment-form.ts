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

type AssessmentValidationIssue = {
  code: string;
  path: ReadonlyArray<string | number>;
};

const FALLBACK_VALIDATION_MESSAGE = 'Revise os dados da avaliação.';

const SCHEMA_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'invalid_string:date': 'Informe uma data válida.',
  'invalid_type:date': 'Informe uma data válida.',
  'too_small:weightKg': 'Peso está fora dos limites permitidos.',
  'too_big:weightKg': 'Peso está fora dos limites permitidos.',
  'invalid_type:weightKg': 'Informe um peso válido.',
  'too_small:heightCm': 'Altura está fora dos limites permitidos.',
  'too_big:heightCm': 'Altura está fora dos limites permitidos.',
  'invalid_type:heightCm': 'Informe uma altura válida.',
  'too_small:bodyFatPct': 'Gordura corporal está fora dos limites permitidos.',
  'too_big:bodyFatPct': 'Gordura corporal está fora dos limites permitidos.',
  'invalid_type:bodyFatPct': 'Informe uma gordura corporal válida.',
  'too_small:measurements.chest': 'Peito deve ser maior que zero.',
  'too_small:measurements.waist': 'Cintura deve ser maior que zero.',
  'too_small:measurements.hip': 'Quadril deve ser maior que zero.',
  'too_small:measurements.armRight': 'Braço direito deve ser maior que zero.',
  'too_small:measurements.armLeft': 'Braço esquerdo deve ser maior que zero.',
  'too_small:measurements.thighRight': 'Coxa direita deve ser maior que zero.',
  'too_small:measurements.thighLeft': 'Coxa esquerda deve ser maior que zero.',
  'too_small:measurements.calfRight': 'Panturrilha direita deve ser maior que zero.',
  'too_small:measurements.calfLeft': 'Panturrilha esquerda deve ser maior que zero.',
  'invalid_type:measurements': 'Informe medidas válidas.',
  'too_big:photos': 'A quantidade de fotos excede o limite permitido.',
  'invalid_type:photos': 'Informe fotos válidas.',
  'too_big:notes': 'As observações excedem o limite permitido.',
  'invalid_type:notes': 'Informe observações válidas.',
};

function localizeValidationIssue(issue: AssessmentValidationIssue): string {
  const key = `${issue.code}:${issue.path.join('.')}`;
  const message = SCHEMA_ERROR_MESSAGES[key];
  if (message) return message;

  if (issue.path[0] === 'photos' && issue.code === 'invalid_string') {
    return 'A foto informada deve ser uma URL válida.';
  }

  return FALLBACK_VALIDATION_MESSAGE;
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
      message: parsed.error.issues[0]
        ? localizeValidationIssue(parsed.error.issues[0])
        : FALLBACK_VALIDATION_MESSAGE,
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
