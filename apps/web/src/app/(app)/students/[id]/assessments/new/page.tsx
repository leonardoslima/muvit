import { TopBar } from '@/components/top-bar';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { AssessmentForm } from '../_form';

export default async function NewAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Link
        href={`/students/${id}/assessments`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <TopBar title="Nova avaliação" subtitle="Registre as métricas de hoje." />
      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <AssessmentForm studentId={id} />
      </section>
    </>
  );
}
