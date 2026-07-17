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

interface Point {
  date: string;
  weight: number | null;
  bodyFat: number | null;
}

function formatChartDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(date),
  );
}

export function EvolutionChart({ points }: { points: Point[] }) {
  const weights = points.map((p) => p.weight).filter((v): v is number => v !== null);
  const fats = points.map((p) => p.bodyFat).filter((v): v is number => v !== null);
  if (weights.length < 2 && fats.length < 2) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes para o gráfico.</p>;
  }

  const data = points.map((point, index) => ({
    ...point,
    chartId: `${point.date}-${index}`,
    label: formatChartDate(point.date),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 text-xs">
        <Legend color="var(--primary)" label="Peso (kg)" />
        <Legend color="var(--secondary)" label="% Gordura" />
      </div>
      <div
        className="h-[220px] w-full"
        role="img"
        aria-label="Evolução de peso e percentual de gordura"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} />
            <Tooltip />
            {weights.length >= 2 && (
              <Line
                type="monotone"
                dataKey="weight"
                name="Peso (kg)"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--primary)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {fats.length >= 2 && (
              <Line
                type="monotone"
                dataKey="bodyFat"
                name="% Gordura"
                stroke="var(--secondary)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--secondary)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="h-2 w-4 rounded-pill" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
