import { getStudents } from '@/lib/api/sdk.gen';
import type { GetStudentsResponse } from '@/lib/api/types.gen';
import type { Client } from './api/client/types.gen';

const REPORT_STUDENTS_PAGE_SIZE = 100;

type ReportStudent = GetStudentsResponse['items'][number];

export type ReportStudentListState =
  | { status: 'ready'; students: ReportStudent[] }
  | { status: 'error'; students: [] };

export async function loadAllReportStudents(client: Client): Promise<ReportStudentListState> {
  const students: ReportStudent[] = [];
  let offset = 0;
  let total: number | undefined;

  try {
    while (total === undefined || offset < total) {
      const response = await getStudents({
        client,
        query: { limit: REPORT_STUDENTS_PAGE_SIZE, offset },
      });
      if (response.error || !response.data) return { status: 'error', students: [] };

      total ??= response.data.total;
      students.push(...response.data.items);

      if (response.data.items.length === 0 || students.length >= total) {
        break;
      }

      offset += response.data.items.length;
    }

    return { status: 'ready', students };
  } catch {
    return { status: 'error', students: [] };
  }
}
