'use client';

import {
  REPORT_RANGES,
  type ReportQuery,
  buildReportHref,
} from '@/application/reports/report-query';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

type StudentOption = { id: string; name: string };

interface ReportFiltersProps {
  students: StudentOption[];
  query: ReportQuery;
}

const rangeLabels: Record<(typeof REPORT_RANGES)[number], string> = {
  '30d': '30d',
  '90d': '90d',
  '6m': '6m',
  all: 'Tudo',
  custom: 'Personalizado',
};

export function ReportFilters({ students, query }: ReportFiltersProps) {
  const fromInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.error) fromInputRef.current?.focus();
  }, [query.error]);

  return (
    <div className="flex flex-col gap-3 xl:items-end">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <form action="/reports" className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Aluno
            <select
              name="studentId"
              defaultValue={query.studentId ?? ''}
              className="h-11 min-w-56 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione um aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="range" value={query.range} />
          {query.range === 'custom' && query.from && (
            <input type="hidden" name="from" value={query.from} />
          )}
          {query.range === 'custom' && query.to && (
            <input type="hidden" name="to" value={query.to} />
          )}
          <Button type="submit" variant="secondary">
            Aplicar aluno
          </Button>
        </form>

        <nav
          aria-label="Período do relatório"
          className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-card p-1"
        >
          {REPORT_RANGES.map((range) => (
            <Link
              key={range}
              href={buildReportHref({ studentId: query.studentId, range })}
              aria-current={query.range === range ? 'page' : undefined}
              className={
                query.range === range
                  ? 'rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground'
                  : 'rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            >
              {rangeLabels[range]}
            </Link>
          ))}
        </nav>
      </div>

      {query.range === 'custom' && (
        <form action="/reports" className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          {query.studentId && <input type="hidden" name="studentId" value={query.studentId} />}
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Data inicial
            <input
              type="date"
              name="from"
              defaultValue={query.from}
              ref={fromInputRef}
              aria-invalid={Boolean(query.error)}
              aria-describedby={query.error ? 'report-range-error' : undefined}
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Data final
            <input
              type="date"
              name="to"
              defaultValue={query.to}
              aria-invalid={Boolean(query.error)}
              aria-describedby={query.error ? 'report-range-error' : undefined}
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit">
            <CalendarDays />
            Aplicar período
          </Button>
        </form>
      )}
      {query.error && (
        <p id="report-range-error" role="alert" className="w-full text-sm text-destructive">
          {query.error}
        </p>
      )}
    </div>
  );
}
