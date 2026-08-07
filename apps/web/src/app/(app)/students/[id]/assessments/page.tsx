import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { configureServerClient } from '@/lib/api-client';
import { getStudentsById, getStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import { ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvolutionChart } from './_chart';

interface Props {
  params: Promise<{ id: string }>;
}

type Assessment = {
  id: string;
  date: string;
  weightKg: string | number | null;
  heightCm: string | number | null;
  bodyFatPct: string | number | null;
  measurements: Record<string, number> | null;
  photos: string[] | null;
  notes: string | null;
};

function toNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return date.toLocaleDateString('pt-BR');
}

function bmi(assessment: Assessment): number | null {
  const weight = toNum(assessment.weightKg);
  const height = toNum(assessment.heightCm);
  if (weight === null || height === null || height <= 0) return null;
  return weight / (height / 100) ** 2;
}

export default async function AssessmentsListPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const [studentResponse, listResponse] = await Promise.all([
    getStudentsById({ client, path: { id } }),
    getStudentsByStudentIdAssessments({ client, path: { studentId: id }, query: { limit: 100 } }),
  ]);
  if (studentResponse.error || !studentResponse.data) notFound();
  const student = studentResponse.data as { id?: string; name: string };
  const listError = !!listResponse.error || !listResponse.data;
  const items = listError
    ? []
    : ([...(listResponse.data?.items ?? [])] as Assessment[]).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
  const latest = items[0];
  const series = [...items].reverse().map((assessment) => ({
    date: assessment.date,
    weight: toNum(assessment.weightKg),
    bodyFat: toNum(assessment.bodyFatPct),
  }));

  return (
    <div className="flex flex-col gap-6" data-responsive-layout="assessment-history">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-medium">
        <Link href="/students" className="text-primary hover:text-primary-hover">
          Alunos
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <Link href={`/students/${id}`} className="text-muted-foreground hover:text-foreground">
          {student.name}
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Avaliação física</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div>
            <h1 className="font-display text-xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">Avaliação física</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/students/${id}`}>
            <ChevronLeft />
            Voltar ao perfil
          </Link>
        </Button>
      </header>

      <nav
        aria-label="Avaliações do aluno"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[10px] bg-muted p-1"
      >
        <Link
          href={`/students/${id}/assessments/new`}
          className="whitespace-nowrap rounded-md px-5 py-2 font-display text-[13px] font-medium text-muted-foreground hover:bg-card hover:text-foreground"
        >
          Registrar nova avaliação
        </Link>
        <Link
          href={`/students/${id}/assessments`}
          aria-current="page"
          className="whitespace-nowrap rounded-md bg-primary px-5 py-2 font-display text-[13px] font-semibold text-primary-foreground"
        >
          Histórico de avaliações
        </Link>
      </nav>

      {listError ? (
        <Card role="alert" className="items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">
            Não foi possível carregar as avaliações.
          </h2>
          <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <div>
            <h2 className="font-display text-lg font-semibold">
              Nenhuma avaliação registrada ainda.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre medidas e fotos para acompanhar a evolução.
            </p>
          </div>
          <Button asChild>
            <Link href={`/students/${id}/assessments/new`}>
              <Plus />
              Registrar primeira avaliação
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display font-semibold">Avaliações</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <ol className="divide-y divide-border">
              {items.map((assessment, index) => (
                <li
                  key={assessment.id}
                  className={`px-5 py-4 ${index === 0 ? 'bg-primary/5' : ''}`}
                >
                  <p className="font-display text-sm font-semibold">
                    {formatDate(assessment.date)}
                    {index === 0 && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        Mais recente
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toNum(assessment.weightKg) !== null
                      ? `${toNum(assessment.weightKg)} kg`
                      : 'Peso não informado'}{' '}
                    ·{' '}
                    {toNum(assessment.bodyFatPct) !== null
                      ? `${toNum(assessment.bodyFatPct)}% gordura`
                      : 'Gordura não informada'}
                  </p>
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <h2 className="font-display text-base font-semibold">Evolução</h2>
              <EvolutionChart points={series} />
            </Card>
            <Comparison assessments={items.slice(0, 3).reverse()} />
            {latest && <LatestDetails assessment={latest} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Comparison({ assessments }: { assessments: Assessment[] }) {
  if (assessments.length < 2) {
    return (
      <Card>
        <h2 className="font-display text-base font-semibold">Comparação de avaliações</h2>
        <p className="text-sm text-muted-foreground">
          Dados insuficientes para comparar avaliações.
        </p>
      </Card>
    );
  }
  const rows = [
    ['Peso', (item: Assessment) => toNum(item.weightKg), 'kg'],
    ['Gordura corporal', (item: Assessment) => toNum(item.bodyFatPct), '%'],
    ['IMC', (item: Assessment) => bmi(item), ''],
    ['Cintura', (item: Assessment) => toNum(item.measurements?.waist), 'cm'],
    ['Braço direito', (item: Assessment) => toNum(item.measurements?.armRight), 'cm'],
  ] as const;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-base font-semibold">Comparação de avaliações</h2>
        <p className="text-xs text-muted-foreground">Últimas {assessments.length} avaliações</p>
      </div>
      <div className="overflow-x-auto">
        <table aria-label="Comparação de avaliações" className="w-full min-w-150 text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-5 py-3 text-left">Métrica</th>
              {assessments.map((item, index) => (
                <th key={item.id} className="px-4 py-3 text-left">
                  {formatDate(item.date)}
                  {index === assessments.length - 1 && (
                    <span className="ml-2 text-[10px] text-primary">Mais recente</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, read, unit]) => (
              <tr key={label} className="border-t border-border">
                <th scope="row" className="px-5 py-3 text-left font-medium">
                  {label}
                </th>
                {assessments.map((item) => {
                  const value = read(item);
                  return (
                    <td key={item.id} className="px-4 py-3">
                      {value === null
                        ? '—'
                        : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LatestDetails({ assessment }: { assessment: Assessment }) {
  const measurements = Object.entries(assessment.measurements ?? {});
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-base font-semibold">Medidas mais recentes</h2>
        {measurements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma medida de circunferência registrada.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            {measurements.map(([name, value]) => (
              <div key={name} className="rounded-md bg-muted p-3">
                <dt className="text-xs text-muted-foreground">{measurementLabel(name)}</dt>
                <dd className="font-display font-semibold">{value} cm</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-base font-semibold">Fotos mais recentes</h2>
        {!assessment.photos?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma foto de progresso registrada.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assessment.photos.map((photo) => (
              <Image
                key={photo}
                src={photo}
                alt={`Foto de progresso de ${formatDate(assessment.date)}`}
                width={180}
                height={220}
                unoptimized
                className="aspect-[3/4] w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function measurementLabel(name: string): string {
  const labels: Record<string, string> = {
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
  return labels[name] ?? name;
}
