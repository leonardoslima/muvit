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

export type WeightEvolutionPoint = {
  date: string;
  label: string;
  weight: number;
};

export function WeightEvolutionChart({ points }: { points: WeightEvolutionPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Evolução de peso
        </span>
        <p className="text-sm text-muted-foreground">Sem dados de peso suficientes.</p>
      </div>
    );
  }

  const data = points.map((point, index) => ({
    ...point,
    chartId: `${point.date}-${index}`,
  }));

  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Evolução de peso
      </span>
      <div>
        <div
          className="h-[100px] w-full rounded-lg bg-card-hover"
          role="img"
          aria-label="Evolução de peso"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 12 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                name="Peso"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {data.map((point) => (
            <span key={point.chartId}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
