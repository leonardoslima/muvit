import { ReportDashboard } from '@/app/(app)/reports/_report-dashboard';
import { PrintButton } from '@/app/(app)/reports/print/print-button';
import {
  type ReportSearchParams,
  buildReportHref,
  parseReportSearchParams,
} from '@/application/reports/report-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { configureServerClient } from '@/lib/api-client';
import { getStudentReport } from '@/lib/api/sdk.gen';
import Link from 'next/link';

interface PrintableReportPageProps {
  searchParams: Promise<ReportSearchParams>;
}

function periodLabel(from: string | null, to: string | null): string {
  const format = (value: string) =>
    new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
  if (from && to) return `${format(from)} a ${format(to)}`;
  return 'Todo o histórico disponível';
}

export default async function PrintableReportPage({ searchParams }: PrintableReportPageProps) {
  const query = parseReportSearchParams(await searchParams);

  if (!query.studentId || query.error) {
    return (
      <Card role="alert" className="items-center py-12 text-center">
        <h1 className="font-display text-xl font-bold">Relatório indisponível</h1>
        <p className="text-sm text-muted-foreground">
          {query.error ?? 'Selecione um aluno antes de abrir a versão para impressão.'}
        </p>
        <Button asChild variant="secondary">
          <Link href={buildReportHref(query)}>Voltar aos relatórios</Link>
        </Button>
      </Card>
    );
  }

  const client = await configureServerClient();
  const reportResponse = await getStudentReport({
    client,
    path: { studentId: query.studentId },
    query: {
      range: query.range,
      ...(query.range === 'custom' && query.from && query.to
        ? { from: query.from, to: query.to }
        : {}),
    },
  });
  const report = reportResponse.data;

  if (reportResponse.error || !report) {
    return (
      <Card role="alert" className="items-center py-12 text-center">
        <h1 className="font-display text-xl font-bold">Não foi possível carregar o relatório.</h1>
        <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
        <Button asChild variant="secondary">
          <Link href={buildReportHref(query)}>Voltar aos relatórios</Link>
        </Button>
      </Card>
    );
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold tracking-[0.18em] text-primary">MUVIT</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Relatório de {report.student.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Período: {periodLabel(report.period.from, report.period.to)}
          </p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </header>
      <ReportDashboard report={report} />
    </article>
  );
}
