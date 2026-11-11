import { getStudents } from '@/lib/api/sdk.gen';
import type { GetStudentsResponse } from '@/lib/api/types.gen';
import type { Client } from './api/client/types.gen';

export const STUDENT_LIST_PAGE_SIZE = 50;

export type StudentListQuery = {
  q?: string;
  status?: 'active' | 'inactive' | 'paused';
};

type StudentListItem = GetStudentsResponse['items'][number];

export type StudentListState =
  | { status: 'ready'; items: StudentListItem[]; total: number }
  | { status: 'error'; message: string };

export async function loadStudentList(
  client: Client,
  query: StudentListQuery = {},
): Promise<StudentListState> {
  try {
    const response = await getStudents({
      client,
      query: { ...query, limit: STUDENT_LIST_PAGE_SIZE },
    });

    if (response.error || !response.data) {
      return buildStudentListError();
    }

    return { status: 'ready', items: response.data.items, total: response.data.total };
  } catch {
    return buildStudentListError();
  }
}

function buildStudentListError(): StudentListState {
  return {
    status: 'error',
    message: 'Não foi possível carregar a lista de alunos.',
  };
}
