import { configureServerClient } from '@/lib/api-client';
import { getExercises, getStudents } from '@/lib/api/sdk.gen';
import { WorkoutBuilder } from './_workout-builder';

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const client = await configureServerClient();
  const [studentsResponse, exercisesResponse] = await Promise.all([
    getStudents({ client, query: { limit: 100, status: 'active' } }),
    getExercises({ client, query: { limit: 100, scope: 'all' } }),
  ]);
  const students = (studentsResponse.data?.items ?? []).map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    avatarUrl: student.avatarUrl,
  }));
  const exercises = (exercisesResponse.data?.items ?? []).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
  }));
  const initialStudentId = students.some((student) => student.id === studentId)
    ? (studentId ?? '')
    : (students[0]?.id ?? '');

  return (
    <WorkoutBuilder
      students={students}
      exercises={exercises}
      equipmentFacets={exercisesResponse.data?.facets.equipment ?? []}
      initialStudentId={initialStudentId}
      studentsError={Boolean(studentsResponse.error)}
      exercisesError={Boolean(exercisesResponse.error)}
    />
  );
}
