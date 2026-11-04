import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getStudentsById } from '@/lib/api/sdk.gen';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssessmentForm } from '../_form';

export default async function NewAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await configureServerClient();
  const response = await getStudentsById({ client, path: { id } });

  if (response.error || !response.data) notFound();

  const student = response.data as { id: string; name: string };

  return (
    <div className="flex flex-col gap-6" data-responsive-layout="new-assessment">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-medium">
        <Link href="/students" className="text-primary hover:text-primary-hover">
          Alunos
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <Link
          href={`/students/${student.id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {student.name}
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Avaliação física</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-xl font-bold text-foreground">{student.name}</h1>
            <p className="text-sm text-muted-foreground">Avaliação física</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/students/${student.id}`}>
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
          href={`/students/${student.id}/assessments/new`}
          aria-current="page"
          className="whitespace-nowrap rounded-md bg-primary px-5 py-2 font-display text-[13px] font-semibold text-primary-foreground"
        >
          Registrar nova avaliação
        </Link>
        <Link
          href={`/students/${student.id}/assessments`}
          className="whitespace-nowrap rounded-md px-5 py-2 font-display text-[13px] font-medium text-muted-foreground hover:bg-card hover:text-foreground"
        >
          Histórico de avaliações
        </Link>
      </nav>

      <AssessmentForm studentId={student.id} />
    </div>
  );
}
