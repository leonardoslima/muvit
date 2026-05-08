'use client';

interface Point {
  date: string;
  weight: number | null;
  bodyFat: number | null;
}

export function EvolutionChart({ points }: { points: Point[] }) {
  const weights = points.map((p) => p.weight).filter((v): v is number => v !== null);
  const fats = points.map((p) => p.bodyFat).filter((v): v is number => v !== null);
  if (weights.length < 2 && fats.length < 2) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes para o gráfico.</p>;
  }

  const W = 720;
  const H = 220;
  const padX = 32;
  const padY = 24;

  const lineFor = (vals: number[]) => {
    if (vals.length < 2) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const stepX = (W - 2 * padX) / (vals.length - 1);
    return vals
      .map((v, i) => {
        const x = padX + i * stepX;
        const y = padY + (H - 2 * padY) * (1 - (v - min) / range);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 text-xs">
        <Legend color="var(--primary)" label="Peso (kg)" />
        <Legend color="var(--secondary)" label="% Gordura" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full overflow-visible">
        <line x1={padX} x2={W - padX} y1={H - padY} y2={H - padY} stroke="var(--border)" />
        <line x1={padX} x2={W - padX} y1={padY} y2={padY} stroke="var(--border)" strokeDasharray="2 4" />
        {weights.length >= 2 && (
          <path d={lineFor(weights)} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {fats.length >= 2 && (
          <path d={lineFor(fats)} fill="none" stroke="var(--secondary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => {
          if (p.weight === null) return null;
          const min = Math.min(...weights);
          const range = (Math.max(...weights) - min) || 1;
          const stepX = (W - 2 * padX) / Math.max(weights.length - 1, 1);
          const x = padX + weights.findIndex((_, idx) => idx === i) * stepX;
          const y = padY + (H - 2 * padY) * (1 - (p.weight - min) / range);
          return <circle key={`w-${i}`} cx={x} cy={y} r={3.5} fill="var(--primary)" />;
        })}
      </svg>
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
