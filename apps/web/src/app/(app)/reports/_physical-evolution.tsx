'use client';

import { Card } from '@/components/ui/card';
import type { GetStudentReportResponse } from '@/lib/api/types.gen';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type PhysicalEvolution = GetStudentReportResponse['physicalEvolution'];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}

function formatMetric(value: number | null, unit: string): string {
  if (value === null) return 'Não informado';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function formatChange(value: number | null, unit: string): string {
  if (value === null) return 'Sem comparação';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

const changes = [
  ['Peso', 'weightKg', 'kg'],
  ['Gordura corporal', 'bodyFatPct', '%'],
  ['Cintura', 'waistCm', 'cm'],
  ['Braço', 'armCm', 'cm'],
] as const;

export function PhysicalEvolution({ data }: { data: PhysicalEvolution }) {
  return (
    <section aria-labelledby="physical-evolution-title" className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <Activity className="size-5 text-primary" />
        <h2 id="physical-evolution-title" className="font-display text-xl font-bold">
          Evolução física
        </h2>
      </div>

      {!data.hasEnoughData ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Dados físicos insuficientes neste período.
          </p>
        </Card>
      ) : (
        <>
          <Card className="gap-5">
            <div>
              <h3 className="font-display text-base font-semibold">Peso e gordura corporal</h3>
              <p className="text-xs text-muted-foreground">
                Evolução ao longo do período selecionado
              </p>
            </div>
            <div
              className="h-64 min-w-0 print:hidden"
              role="img"
              aria-label="Gráfico de evolução de peso e gordura corporal"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} fontSize={11} />
                  <YAxis yAxisId="weight" tickLine={false} axisLine={false} width={38} />
                  <YAxis
                    yAxisId="fat"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={38}
                  />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weightKg"
                    name="Peso (kg)"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    connectNulls
                  />
                  <Line
                    yAxisId="fat"
                    type="monotone"
                    dataKey="bodyFatPct"
                    name="Gordura corporal (%)"
                    stroke="var(--secondary)"
                    strokeWidth={2.5}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table aria-label="Dados de evolução física" className="w-full min-w-125 text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Peso</th>
                    <th className="px-3 py-2">Gordura corporal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((point) => (
                    <tr key={point.date} className="border-t border-border">
                      <td className="px-3 py-2">{formatDate(point.date)}</td>
                      <td className="px-3 py-2">{formatMetric(point.weightKg, 'kg')}</td>
                      <td className="px-3 py-2">{formatMetric(point.bodyFatPct, '%')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {changes.map(([label, key, unit]) => {
              const value = data.changes[key];
              return (
                <Card key={key} className="gap-2">
                  <dt className="text-xs text-muted-foreground">
                    Variação de {label.toLowerCase()}
                  </dt>
                  <dd className="flex items-center gap-2 font-display text-xl font-bold">
                    {formatChange(value, unit)}
                    {value !== null && value < 0 ? (
                      <TrendingDown className="size-4 text-success" />
                    ) : value !== null && value > 0 ? (
                      <TrendingUp className="size-4 text-primary" />
                    ) : null}
                  </dd>
                </Card>
              );
            })}
          </dl>
        </>
      )}
    </section>
  );
}
