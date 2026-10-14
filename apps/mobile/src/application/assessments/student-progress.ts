import type { Assessment } from './assessment-data';

export type StudentProgressReadout = {
  dateLabel: string;
  weightLabel: string;
  bodyFatLabel: string;
  weightComparison?: string;
  bodyFatComparison?: string;
  heightLabel?: string;
};

export function buildStudentProgressReadout(
  assessment: Assessment,
  previousAssessment?: Assessment,
): StudentProgressReadout {
  const weight = toNumber(assessment.weightKg);
  const bodyFat = toNumber(assessment.bodyFatPct);
  const previousWeight = toNumber(previousAssessment?.weightKg);
  const previousBodyFat = toNumber(previousAssessment?.bodyFatPct);
  const height = toNumber(assessment.heightCm);

  return {
    dateLabel: formatDate(assessment.date),
    weightLabel: formatMetric(weight, 'kg'),
    bodyFatLabel: formatBodyFat(bodyFat),
    weightComparison:
      weight === null || previousWeight === null
        ? undefined
        : formatComparison(weight, previousWeight, 'kg'),
    bodyFatComparison:
      bodyFat === null || previousBodyFat === null
        ? undefined
        : formatComparison(bodyFat, previousBodyFat, 'p.p.'),
    heightLabel: height === null ? undefined : `${formatNumber(height)} cm`,
  };
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = Number(trimmed.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

function formatMetric(value: number | null, unit: string): string {
  return value === null ? `— ${unit}` : `${formatNumber(value)} ${unit}`;
}

function formatBodyFat(value: number | null): string {
  return value === null ? '—%' : `${formatNumber(value)}%`;
}

function formatComparison(current: number, previous: number, unit: string): string {
  const delta = current - previous;
  if (delta === 0) return `Sem alteração em ${unit}`;

  const direction = delta < 0 ? 'a menos' : 'a mais';
  return `${formatNumber(Math.abs(delta))} ${unit} ${direction}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
