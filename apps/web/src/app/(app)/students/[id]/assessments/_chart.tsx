'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type MetricPoint = { date: string; value: number | null };

type MetricEvolutionChartProps = {
  title: string;
  metricLabel: string;
  unit: string;
  color: string;
  points: MetricPoint[];
};

function dateFrom(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    dateFrom(value),
  );
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(dateFrom(value));
}

function formatValue(value: number, unit: string): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
}

function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatValue(Math.abs(value), unit)}`;
}

function trendLabel(delta: number): string {
  if (delta < 0) return 'Tendência de redução';
  if (delta > 0) return 'Tendência de aumento';
  return 'Sem alteração no período';
}

export function MetricEvolutionChart({
  title,
  metricLabel,
  unit,
  color,
  points,
}: MetricEvolutionChartProps) {
  const recorded = points
    .map((point, index) => ({ ...point, chartId: `${point.date}-${index}` }))
    .filter(
      (point): point is MetricPoint & { value: number; chartId: string } => point.value !== null,
    );

  const first = recorded.at(0);
  if (!first) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Sem dados de {metricLabel.toLocaleLowerCase('pt-BR')} registrados.
        </p>
      </section>
    );
  }

  const latest = recorded.at(-1) ?? first;
  const periodDelta = latest.value - first.value;
  const chartData = recorded.map((point) => ({ ...point, label: formatShortDate(point.date) }));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm font-medium">Atual: {formatValue(latest.value, unit)}</p>
        </div>
        <div className="text-right text-xs">
          <p className={periodDelta <= 0 ? 'text-success' : 'text-warning'}>
            Variação: {formatDelta(periodDelta, unit)}
          </p>
          <p className="mt-1 text-muted-foreground">{trendLabel(periodDelta)}</p>
        </div>
      </div>

      {recorded.length >= 2 ? (
        <div
          className="h-44 w-full"
          role="img"
          aria-label={`Gráfico de evolução de ${metricLabel}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={36}
                domain={['auto', 'auto']}
              />
              <Tooltip formatter={(value) => formatValue(Number(value), unit)} />
              <Line
                type="monotone"
                dataKey="value"
                name={metricLabel}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Apenas uma observação; ainda não há tendência gráfica.
        </p>
      )}

      <div className="sr-only">
        <table aria-label={`Dados de evolução de ${metricLabel}`}>
          <thead>
            <tr>
              <th>Data</th>
              <th>{metricLabel}</th>
              <th>Variação desde a medição anterior</th>
            </tr>
          </thead>
          <tbody>
            {recorded.map((point, index) => {
              const previous = recorded[index - 1];
              return (
                <tr key={point.chartId}>
                  <td>{formatFullDate(point.date)}</td>
                  <td>{formatValue(point.value, unit)}</td>
                  <td>
                    {previous
                      ? formatDelta(point.value - previous.value, unit)
                      : 'Primeira medição'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
