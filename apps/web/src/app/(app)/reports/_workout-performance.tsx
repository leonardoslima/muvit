'use client';

import { Card } from '@/components/ui/card';
import type { GetStudentReportResponse } from '@/lib/api/types.gen';
import { Dumbbell } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Report = GetStudentReportResponse;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}

function frequencyClass(count: number): string {
  if (count <= 0) return 'bg-muted';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary';
}

function isoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function completeFrequencyDays(report: Report): Report['trainingFrequency']['days'] {
  const { from, to } = report.period;
  const start = from ? isoDate(from) : null;
  const end = to ? isoDate(to) : null;
  if (!start || !end || start > end) {
    return [...report.trainingFrequency.days].sort((a, b) => a.date.localeCompare(b.date));
  }

  const countsByDate = new Map(report.trainingFrequency.days.map((day) => [day.date, day.count]));
  const days: Report['trainingFrequency']['days'] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = dateToIso(cursor);
    days.push({ date, count: countsByDate.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function frequencyLabel(date: string, count: number): string {
  if (count === 0) return `${formatDate(date)}: nenhum treino`;
  if (count === 1) return `${formatDate(date)}: 1 treino`;
  return `${formatDate(date)}: ${count} treinos`;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WorkoutPerformance({ report }: { report: Report }) {
  const { workoutAdherence, trainingFrequency, topExercises, rpeTrend } = report;
  const frequencyDays = completeFrequencyDays(report);
  const firstFrequencyDate = frequencyDays[0] ? isoDate(frequencyDays[0].date) : null;

  return (
    <section aria-labelledby="workout-performance-title" className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <Dumbbell className="size-5 text-primary" />
        <h2 id="workout-performance-title" className="font-display text-xl font-bold">
          Desempenho nos treinos
        </h2>
      </div>

      <Card>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="font-display text-base font-semibold">Aderência aos treinos</h3>
          {workoutAdherence.hasEnoughData && (
            <p className="text-sm text-muted-foreground">
              {workoutAdherence.completed} de {workoutAdherence.planned} treinos planejados
              concluídos
            </p>
          )}
        </div>
        {!workoutAdherence.hasEnoughData || workoutAdherence.percentage === null ? (
          <p className="text-sm text-muted-foreground">Aderência ainda sem dados suficientes.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, workoutAdherence.percentage))}%` }}
              />
            </div>
            <strong className="font-display text-sm text-primary">
              {workoutAdherence.percentage.toLocaleString('pt-BR')}%
            </strong>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold">Frequência de treinos</h3>
        {!trainingFrequency.hasEnoughData ? (
          <p className="text-sm text-muted-foreground">Frequência ainda sem dados suficientes.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-112">
                <div
                  aria-hidden="true"
                  className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground"
                >
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <ol
                  aria-label="Calendário de frequência de treinos"
                  className="grid grid-cols-7 gap-1.5"
                >
                  {frequencyDays.map((day, index) => (
                    <li
                      key={day.date}
                      aria-label={frequencyLabel(day.date, day.count)}
                      className={`flex min-h-9 items-center justify-center rounded-md text-[11px] ${frequencyClass(day.count)}`}
                      style={
                        index === 0 && firstFrequencyDate
                          ? { gridColumnStart: firstFrequencyDate.getUTCDay() + 1 }
                          : undefined
                      }
                    >
                      <time dateTime={day.date}>{Number(day.date.slice(-2))}</time>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <table
              aria-label="Frequência de treinos"
              className="sr-only print:not-sr-only print:table"
            >
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Treinos concluídos</th>
                </tr>
              </thead>
              <tbody>
                {frequencyDays.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDate(day.date)}</td>
                    <td>{day.count === 0 ? 'Nenhum' : day.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        <h3 className="px-6 py-5 font-display text-base font-semibold">Principais exercícios</h3>
        {!topExercises.hasEnoughData ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">
            Exercícios ainda sem dados suficientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Desempenho por exercício" className="w-full min-w-175 text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Exercício</th>
                  <th className="px-4 py-3">Carga máxima</th>
                  <th className="px-4 py-3">Progressão</th>
                  <th className="px-4 py-3">Séries</th>
                  <th className="px-4 py-3">Volume total</th>
                </tr>
              </thead>
              <tbody>
                {topExercises.items.map((exercise) => (
                  <tr key={exercise.exerciseId} className="border-t border-border align-top">
                    <th scope="row" className="px-6 py-4 text-left font-medium">
                      {exercise.name}
                    </th>
                    <td className="px-4 py-4">
                      {exercise.maxLoadKg === null ? '—' : `${exercise.maxLoadKg} kg`}
                    </td>
                    <td className="px-4 py-4">
                      {exercise.progression.length === 0 ? (
                        '—'
                      ) : (
                        <ol
                          aria-label={`Progressão de carga de ${exercise.name}`}
                          className="flex min-w-40 flex-col gap-1 text-xs"
                        >
                          {exercise.progression.map((point) => (
                            <li key={`${point.date}-${point.loadKg}`}>
                              <time dateTime={point.date}>{formatDate(point.date)}</time>:{' '}
                              {point.loadKg.toLocaleString('pt-BR')} kg
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                    <td className="px-4 py-4">{exercise.totalSets}</td>
                    <td className="px-4 py-4">
                      {exercise.totalVolumeKg.toLocaleString('pt-BR')} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold">
          Tendência de esforço percebido (RPE)
        </h3>
        {!rpeTrend.hasEnoughData ? (
          <p className="text-sm text-muted-foreground">RPE ainda sem dados suficientes.</p>
        ) : (
          <>
            <div
              className="h-44 min-w-0 print:hidden"
              role="img"
              aria-label="Gráfico de tendência de esforço percebido"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rpeTrend.points}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} fontSize={11} />
                  <YAxis domain={[0, 10]} tickLine={false} axisLine={false} width={28} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} />
                  <Line
                    type="monotone"
                    dataKey="averageRpe"
                    name="RPE"
                    stroke="var(--color-info)"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table
              aria-label="Tendência de esforço percebido"
              className="sr-only print:not-sr-only print:table"
            >
              <thead>
                <tr>
                  <th>Data</th>
                  <th>RPE médio registrado</th>
                </tr>
              </thead>
              <tbody>
                {rpeTrend.points.map((point) => (
                  <tr key={point.date}>
                    <td>{formatDate(point.date)}</td>
                    <td>{point.averageRpe.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </section>
  );
}
