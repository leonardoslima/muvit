import type { StudentListQuery } from '@/lib/student-list';

const STUDENT_LIST_OFFSET_STEP = 50;

export const MAX_SAFE_STUDENT_LIST_PAGE =
  Math.floor(Number.MAX_SAFE_INTEGER / STUDENT_LIST_OFFSET_STEP) + 1;

export function normalizeStudentListPage(page: number | undefined): number {
  if (page === undefined || !Number.isSafeInteger(page) || page < 1) return 1;
  if (page > MAX_SAFE_STUDENT_LIST_PAGE) return 1;

  return page;
}

export function parseStudentListPage(value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value)) return 1;

  return normalizeStudentListPage(Number(value));
}

export function buildStudentListHref({ q, status, page }: StudentListQuery): string {
  const search = new URLSearchParams();
  if (q) search.set('q', q);
  if (status) search.set('status', status);

  const effectivePage = normalizeStudentListPage(page);
  if (effectivePage > 1) search.set('page', String(effectivePage));

  const query = search.toString();

  return query ? `/students?${query}` : '/students';
}
