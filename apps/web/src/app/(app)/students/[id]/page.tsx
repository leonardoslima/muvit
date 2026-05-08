import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StudentForm } from '@/components/student-form';
import { configureServerClient } from '@/lib/api-client';
import { getStudentsById } from '@/lib/api/sdk.gen';
import { deleteStudentAction, updateStudentAction } from './actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const res = await getStudentsById({ client, path: { id } });
  if (res.error || !res.data) notFound();
  const s = res.data as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    gender: 'male' | 'female' | 'other' | null;
    goals: string | null;
    restrictions: string | null;
    status: 'active' | 'inactive' | 'paused';
    isIndependent: boolean;
    createdAt: string;
  };

  return (
    <>
      <Link
        href="/students"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size="lg" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] font-bold leading-tight">{s.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {s.email && <span>{s.email}</span>}
              <Badge
                variant={
                  s.status === 'active' ? 'active' : s.status === 'paused' ? 'paused' : 'inactive'
                }
              >
                {s.status === 'active' ? 'Ativo' : s.status === 'paused' ? 'Pausado' : 'Inativo'}
              </Badge>
              <span className="text-xs uppercase tracking-[0.08em]">
                {s.isIndependent ? 'Independente' : 'Personal'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/workouts/new?studentId=${s.id}`}>+ Treino</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/students/${s.id}/assessments/new`}>+ Avaliação</Link>
          </Button>
          <form action={deleteStudentAction}>
            <input type="hidden" name="id" value={s.id} />
            <Button type="submit" variant="ghost" size="icon" aria-label="Excluir aluno">
              <Trash2 />
            </Button>
          </form>
        </div>
      </header>

      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Dados do aluno</h2>
        <StudentForm action={updateStudentAction} initial={s} submitLabel="Salvar alterações" />
      </section>
    </>
  );
}
