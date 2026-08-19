export const REPORT_RANGES = ['30d', '90d', '6m', 'all', 'custom'] as const;

export type ReportRange = (typeof REPORT_RANGES)[number];

export type ReportSearchParams = Record<string, string | string[] | undefined>;

export type ReportQuery = {
  studentId?: string;
  range: ReportRange;
  from?: string;
  to?: string;
  error?: string;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  const selected = Array.isArray(value) ? value[0] : value;
  const trimmed = selected?.trim();
  return trimmed ? trimmed : undefined;
}

function isReportRange(value: string | undefined): value is ReportRange {
  return REPORT_RANGES.some((range) => range === value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function parseReportSearchParams(params: ReportSearchParams): ReportQuery {
  const studentId = firstValue(params.studentId);
  const requestedRange = firstValue(params.range);
  const range = isReportRange(requestedRange) ? requestedRange : '90d';

  if (studentId && !isUuid(studentId)) {
    return { range, error: 'Identificador de aluno inválido.' };
  }

  const base = studentId ? { studentId, range } : { range };

  if (range !== 'custom') return base;

  const from = firstValue(params.from);
  const to = firstValue(params.to);
  const custom = { ...base, ...(from ? { from } : {}), ...(to ? { to } : {}) };

  if (!from || !to) return { ...custom, error: 'Informe as datas inicial e final.' };
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return { ...custom, error: 'Informe datas válidas no formato AAAA-MM-DD.' };
  }
  if (from > to) {
    return { ...custom, error: 'A data inicial não pode ser posterior à data final.' };
  }

  return custom;
}

export function buildReportHref(query: Omit<ReportQuery, 'error'>): string {
  const params = new URLSearchParams();
  if (query.studentId) params.set('studentId', query.studentId);
  params.set('range', query.range);
  if (query.range === 'custom' && query.from && query.to) {
    params.set('from', query.from);
    params.set('to', query.to);
  }
  return `/reports?${params.toString()}`;
}

export function buildReportPrintHref(query: Omit<ReportQuery, 'error'>): string {
  return buildReportHref(query).replace('/reports?', '/reports/print?');
}
