import type { ReportQuery } from '@muvit/validators';

export type ResolvedReportPeriod = {
  from: string | null;
  to: string | null;
};

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function subtractUtcMonthsClamped(date: Date, months: number): Date {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const lastDay = new Date(
    Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      firstDay.getUTCFullYear(),
      firstDay.getUTCMonth(),
      Math.min(date.getUTCDate(), lastDay),
    ),
  );
}

export function resolveReportPeriod(query: ReportQuery, now = new Date()): ResolvedReportPeriod {
  if (query.range === 'all') return { from: null, to: null };
  if (query.range === 'custom') return { from: query.from ?? null, to: query.to ?? null };

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = query.range === '30d' ? 30 : query.range === '90d' ? 90 : null;
  if (days !== null) {
    return { from: formatUtcDate(addUtcDays(today, -(days - 1))), to: formatUtcDate(today) };
  }

  const sixMonthsAgo = subtractUtcMonthsClamped(today, 6);
  return { from: formatUtcDate(addUtcDays(sixMonthsAgo, 1)), to: formatUtcDate(today) };
}
