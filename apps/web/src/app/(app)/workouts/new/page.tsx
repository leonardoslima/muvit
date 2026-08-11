import { redirect } from 'next/navigation';

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  if (!studentId) redirect('/workouts');

  const query = new URLSearchParams({ studentId });
  redirect(`/workouts?${query.toString()}`);
}
