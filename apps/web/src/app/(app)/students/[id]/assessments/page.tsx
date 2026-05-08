import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getStudentsById, getStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import { EvolutionChart } from './_chart';

interface Props {
  params: Promise<{ id: string }>;
}

type Assessment = {
  id: string;
  date: string;
  weightKg: string | number | null;
  bodyFatPct: string | number | null;
  notes: string | null;
};

function toNum(v: string | number | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function AssessmentsListPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const [studentRes, listRes] = await Promise.all([
    getStudentsById({ client, path: { id } }),
    getStudentsByStudentIdAssessments({ client, path: { studentId: id }, query: { limit: 100 } }),
  ]);
  if (studentRes.error || !studentRes.data) notFound();
  const student = studentRes.data as { name: string };
  const items = (listRes.data?.items ?? []) as Assessment[];

  const series = items
    .map((a) => ({ date: a.date, weight: toNum(a.weightKg), bodyFat: toNum(a.bodyFatPct) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <Link
        href={`/students/${id}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {student.name}
      </Link>
      <TopBar
        title="Avaliações físicas"
        subtitle={`${items.length} ${items.length === 1 ? 'registro' : 'registros'}`}
        actions={
          <Button asChild>
            <Link href={`/students/${id}/assessments/new`} className="gap-2">
              <Plus />
              Nova avaliação
            </Link>
          </Button>
        }
      />

      {series.length >= 2 && (
        <section className="rounded-[12px] bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-bold">Evolução</h2>
          <EvolutionChart points={series} />
        </section>
      )}

      <section className="overflow-hidden rounded-[12px] bg-card shadow-card">
        <div className="grid grid-cols-[120px_120px_120px_1fr] gap-4 bg-card-hover px-5 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <span>Data</span>
          <span>Peso</span>
          <span>% Gordura</span>
          <span>Notas</span>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nenhuma avaliação registrada ainda.
          </p>
        ) : (
          <ul>
            {items.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[120px_120px_120px_1fr] gap-4 border-b border-border px-5 py-4 last:border-b-0 text-sm"
              >
                <span className="font-display font-semibold">
                  {new Date(a.date).toLocaleDateString('pt-BR')}
                </span>
                <span>{toNum(a.weightKg) !== null ? `${toNum(a.weightKg)} kg` : '—'}</span>
                <span>{toNum(a.bodyFatPct) !== null ? `${toNum(a.bodyFatPct)}%` : '—'}</span>
                <span className="truncate text-muted-foreground">{a.notes ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
