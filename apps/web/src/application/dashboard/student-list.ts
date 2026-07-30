export type DashboardStudentStatus = 'active' | 'inactive' | 'paused';

export type DashboardStudentSource = {
  id: string;
  name: string;
  status: DashboardStudentStatus;
};

export type DashboardWorkoutLogSource = {
  date: string;
};

export type DashboardWorkoutPlanSource = {
  name: string;
  status: 'active' | 'archived' | 'draft';
};

export type DashboardStudentListRow = {
  id: string;
  name: string;
  href: string;
  status: DashboardStudentStatus;
  statusLabel: string;
  currentPlan: string;
  lastWorkout: string;
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const STUDENT_STATUS_LABELS: Record<DashboardStudentStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  paused: 'Pausado',
};

export function formatDashboardStudentDate(date: string): string {
  const [year, month, day] = date.split('-');
  const monthIndex = Number(month) - 1;
  const monthName = MONTHS[monthIndex] ?? month;

  return `${Number(day)} ${monthName} ${year}`;
}

export function buildDashboardStudentListRow({
  student,
  workoutLogs,
  workoutPlans,
}: {
  student: DashboardStudentSource;
  workoutLogs: DashboardWorkoutLogSource[];
  workoutPlans: DashboardWorkoutPlanSource[];
}): DashboardStudentListRow {
  const currentPlan =
    workoutPlans.find((plan) => plan.status === 'active')?.name ?? workoutPlans[0]?.name;
  const lastWorkout = workoutLogs[0]?.date;

  return {
    id: student.id,
    name: student.name,
    href: `/students/${student.id}`,
    status: student.status,
    statusLabel: STUDENT_STATUS_LABELS[student.status],
    currentPlan: currentPlan ?? 'Sem plano',
    lastWorkout: lastWorkout ? formatDashboardStudentDate(lastWorkout) : 'Sem treino',
  };
}
