import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/top-bar';
import { configureServerClient } from '@/lib/api-client';
import { getExercises, getStudentsById } from '@/lib/api/sdk.gen';
import { WorkoutEditor } from './_editor';
import type { MuscleGroup } from '@/lib/muscle-groups';

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  if (!studentId) redirect('/workouts');

  const client = await configureServerClient();
  const [studentRes, exRes] = await Promise.all([
    getStudentsById({ client, path: { id: studentId } }),
    getExercises({ client, query: { scope: 'all', limit: 200 } }),
  ]);
  if (studentRes.error || !studentRes.data) redirect('/workouts');

  const student = studentRes.data as { id: string; name: string };
  const exercises = (exRes.data?.items ?? []) as Array<{
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
  }>;

  return (
    <>
      <Link
        href={`/students/${student.id}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <TopBar title="Novo treino" subtitle={`Para ${student.name}`} />
      <WorkoutEditor studentId={student.id} exercises={exercises} />
    </>
  );
}
