import { normalizeStudentListPage } from '@/application/students/student-list-navigation';
import { getStudents } from '@/lib/api/sdk.gen';
import type { GetStudentsResponse } from '@/lib/api/types.gen';
import type { Client } from './api/client/types.gen';

export const STUDENT_LIST_PAGE_SIZE = 50;

export type StudentListQuery = {
  q?: string;
  status?: 'active' | 'inactive' | 'paused';
  page?: number;
};

type StudentListItem = GetStudentsResponse['items'][number];

export type StudentListState =
  | {
      status: 'ready';
      items: StudentListItem[];
      total: number;
      portfolioTotal: number;
      page: number;
      pageSize: number;
    }
  | { status: 'error'; message: string };

export async function loadStudentList(
  client: Client,
  query: StudentListQuery = {},
): Promise<StudentListState> {
  try {
    const page = normalizeStudentListPage(query.page);
    const response = await fetchStudentsPage(client, query, page);

    if (response.error || !response.data) {
      return buildStudentListError();
    }

    let items = response.data.items;
    let total = response.data.total;
    let effectivePage = page;
    const lastPage = Math.max(1, Math.ceil(total / STUDENT_LIST_PAGE_SIZE));

    if (page > lastPage) {
      effectivePage = total > 0 ? lastPage : 1;

      if (total > 0) {
        const clamped = await fetchStudentsPage(client, query, effectivePage);

        if (clamped.error || !clamped.data) {
          return buildStudentListError();
        }

        items = clamped.data.items;
        total = clamped.data.total;

        if (items.length === 0) {
          if (total > 0) {
            return buildStudentListError();
          }

          effectivePage = 1;
        }
      }
    }

    const filtered = Boolean(query.q || query.status);
    const portfolioTotal = filtered ? await loadPortfolioTotal(client) : total;

    if (portfolioTotal === null) {
      return buildStudentListError();
    }

    return {
      status: 'ready',
      items,
      total,
      portfolioTotal,
      page: effectivePage,
      pageSize: STUDENT_LIST_PAGE_SIZE,
    };
  } catch {
    return buildStudentListError();
  }
}

function fetchStudentsPage(client: Client, query: StudentListQuery, page: number) {
  return getStudents({
    client,
    query: {
      q: query.q,
      status: query.status,
      limit: STUDENT_LIST_PAGE_SIZE,
      offset: (page - 1) * STUDENT_LIST_PAGE_SIZE,
    },
  });
}

async function loadPortfolioTotal(client: Client): Promise<number | null> {
  const response = await getStudents({ client, query: { limit: 1, offset: 0 } });

  if (response.error || !response.data) return null;

  return response.data.total;
}

function buildStudentListError(): StudentListState {
  return {
    status: 'error',
    message: 'Não foi possível carregar a lista de alunos.',
  };
}
