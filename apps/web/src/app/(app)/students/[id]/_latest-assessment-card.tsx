import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import { WeightEvolutionChart, type WeightEvolutionPoint } from './_weight-evolution-chart';

export type AssessmentMeasurements = {
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

export type LatestAssessment = {
  id: string;
  date: string;
  weightKg: string | number | null;
  heightCm?: string | number | null;
  bodyFatPct: string | number | null;
  measurements: AssessmentMeasurements | null;
  notes: string | null;
};

const measurementLabels: Array<{ key: keyof AssessmentMeasurements; label: string }> = [
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'armRight', label: 'Braço (D)' },
  { key: 'thighRight', label: 'Coxa (D)' },
  { key: 'chest', label: 'Peito' },
  { key: 'armLeft', label: 'Braço (E)' },
  { key: 'thighLeft', label: 'Coxa (E)' },
  { key: 'calfRight', label: 'Panturrilha (D)' },
  { key: 'calfLeft', label: 'Panturrilha (E)' },
];

function buildMeasurementRows(measurements: AssessmentMeasurements | null) {
  if (!measurements) return [];
  return measurementLabels.flatMap(({ key, label }) => {
    const value = measurements[key];
    return typeof value === 'number' ? [{ key, label, value: `${value} cm` }] : [];
  });
}

function toNum(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetric(value: string | number | null | undefined, suffix: string): string {
  const metric = toNum(value ?? null);
  if (metric === null) return 'Sem registro';
  const separator = suffix.startsWith('%') ? '' : ' ';
  return `${metric}${separator}${suffix}`;
}

function formatDate(date: string): string {
  const dateOnly = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
  }

  return new Date(date).toLocaleDateString('pt-BR');
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card-hover p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function LoadError() {
  return (
    <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        {'Não foi possível carregar as avaliações deste aluno.'}
      </p>
    </div>
  );
}

export function LatestAssessmentCard({
  studentId,
  latestAssessment,
  weightChartPoints,
  loadFailed,
}: {
  studentId: string;
  latestAssessment: LatestAssessment | undefined;
  weightChartPoints: WeightEvolutionPoint[];
  loadFailed: boolean;
}) {
  const measurementRows = buildMeasurementRows(latestAssessment?.measurements ?? null);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle>{'Última avaliação'}</CardTitle>
        {latestAssessment && (
          <span className="text-sm text-muted-foreground">{formatDate(latestAssessment.date)}</span>
        )}
      </CardHeader>
      <CardContent className="gap-4 px-5 py-5">
        {loadFailed ? (
          <LoadError />
        ) : latestAssessment ? (
          <>
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {'Métricas principais'}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <MetricCard label="Peso" value={formatMetric(latestAssessment.weightKg, 'kg')} />
              <MetricCard
                label="Gordura"
                value={formatMetric(latestAssessment.bodyFatPct, '% gordura')}
              />
              <MetricCard label="Altura" value={formatMetric(latestAssessment.heightCm, 'cm')} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {'Observações'}
              </span>
              <p className="rounded-lg bg-card-hover px-3.5 py-3 text-sm text-muted-foreground">
                {latestAssessment.notes ?? 'Sem observações.'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Medidas
              </span>
              {measurementRows.length > 0 ? (
                <dl>
                  {measurementRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
                    >
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="font-display text-sm font-semibold text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma medida registrada.</p>
              )}
            </div>
            <WeightEvolutionChart points={weightChartPoints} />
            <div className="flex gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="flex-1 text-primary hover:bg-success-bg hover:text-primary"
              >
                <Link href={`/students/${studentId}/assessments`}>{'Ver histórico'}</Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                <Link href={`/students/${studentId}/assessments/new`} className="gap-2">
                  <Plus />
                  {'Nova avaliação'}
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
            <ClipboardList className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{'Nenhuma avaliação registrada ainda.'}</p>
            <Button asChild size="sm">
              <Link href={`/students/${studentId}/assessments/new`} className="gap-2">
                <Plus />
                {'Nova avaliação'}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
