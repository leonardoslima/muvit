import { buildDashboardStudentListRow } from '@/application/dashboard/student-list';
import type { DashboardStudentListRow } from '@/application/dashboard/student-list';
import {
  getStudents,
  getStudentsByStudentIdWorkoutLogs,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import type { Client } from './api/client/types.gen';

export const DASHBOARD_STUDENT_LIST_PAGE_SIZE = 5;

export type DashboardStudentListState =
  | {
      status: 'ready';
      rows: DashboardStudentListRow[];
      total: number;
      pageSize: number;
    }
  | {
      status: 'error';
      message: string;
      rows: [];
      total: number;
      pageSize: number;
    };

export async function loadDashboardStudentList(
  client: Client,
  pageSize = DASHBOARD_STUDENT_LIST_PAGE_SIZE,
): Promise<DashboardStudentListState> {
  try {
    const studentsRes = await getStudents({ client, query: { limit: pageSize } });

    if (studentsRes.error || !studentsRes.data) {
      return buildDashboardStudentListError(pageSize);
    }

    const rows = await Promise.all(
      studentsRes.data.items.map(async (student) => {
        const [logsRes, plansRes] = await Promise.all([
          getStudentsByStudentIdWorkoutLogs({
            client,
            path: { studentId: student.id },
            query: { limit: 1 },
          }),
          getStudentsByStudentIdWorkoutPlans({ client, path: { studentId: student.id } }),
        ]);

        if (logsRes.error || plansRes.error || !logsRes.data || !plansRes.data) {
          throw new Error('student-details-load-failed');
        }

        return buildDashboardStudentListRow({
          student,
          workoutLogs: logsRes.data.items.map((log) => ({ date: log.date })),
          workoutPlans: plansRes.data.items.map((plan) => ({
            name: plan.name,
            status: plan.status,
          })),
        });
      }),
    );

    return {
      status: 'ready',
      rows,
      total: studentsRes.data.total,
      pageSize,
    };
  } catch {
    return buildDashboardStudentListError(pageSize);
  }
}

function buildDashboardStudentListError(pageSize: number): DashboardStudentListState {
  return {
    status: 'error',
    message: 'Não foi possível carregar a lista de alunos.',
    rows: [],
    total: 0,
    pageSize,
  };
}
