import { X } from 'lucide-react';
import Link from 'next/link';
import { StudentWizard } from './_student-wizard';
import { createStudentAction } from './actions';

export default function NewStudentPage() {
  return (
    <section className="flex min-h-[calc(100dvh-8rem)] flex-col gap-8 py-2 sm:py-4">
      <Link
        href="/students"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" /> Fechar cadastro
      </Link>
      <StudentWizard action={createStudentAction} />
    </section>
  );
}
