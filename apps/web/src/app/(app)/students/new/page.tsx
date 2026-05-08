import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { StudentForm } from '@/components/student-form';
import { createStudentAction } from './actions';

export default function NewStudentPage() {
  return (
    <>
      <Link
        href="/students"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <TopBar title="Novo aluno" subtitle="Cadastre um aluno para começar a montar treinos." />
      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <StudentForm action={createStudentAction} submitLabel="Cadastrar aluno" />
      </section>
    </>
  );
}
