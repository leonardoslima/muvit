import {
  type ReportSearchParams,
  buildReportHref,
  buildReportPrintHref,
  parseReportSearchParams,
} from '@/application/reports/report-query';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { configureServerClient } from '@/lib/api-client';
import { getStudentReport } from '@/lib/api/sdk.gen';
import { loadAllReportStudents } from '@/lib/report-student-list';
import { FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ReportDashboard } from './_report-dashboard';
import { ReportFilters } from './_report-filters';

interface ReportsPageProps {
  searchParams: Promise<ReportSearchParams>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const query = parseReportSearchParams(await searchParams);
  const client = await configureServerClient();
  const studentList = await loadAllReportStudents(client);
  const listError = studentList.status === 'error';
  const students = studentList.students;
  const selectedStudent = students.find((student) => student.id === query.studentId);
  const canLoadReport = Boolean(selectedStudent && !query.error);
  const reportResponse =
    selectedStudent && !query.error
      ? await getStudentReport({
          client,
          path: { studentId: selectedStudent.id },
          query: {
            range: query.range,
            ...(query.range === 'custom' && query.from && query.to
              ? { from: query.from, to: query.to }
              : {}),
          },
        })
      : undefined;
  const report = reportResponse?.data;
  const reportError = Boolean(reportResponse?.error) || (canLoadReport && !report);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold text-foreground">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe a evolução dos alunos e o desempenho nos treinos.
          </p>
        </div>
        {!listError && students.length > 0 && <ReportFilters students={students} query={query} />}
      </header>

      {listError ? (
        <Card role="alert" className="items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">
            Não foi possível carregar os alunos.
          </h2>
          <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
          <Button asChild variant="secondary">
            <Link href="/reports">Tentar novamente</Link>
          </Button>
        </Card>
      ) : students.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <h2 className="font-display text-lg font-semibold">
            Nenhum aluno disponível para gerar relatórios.
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre um aluno para começar a acompanhar sua evolução.
          </p>
          <Link
            href="/students/new"
            className="inline-flex h-11 items-center rounded-md bg-primary px-6 font-display text-[13px] font-semibold text-primary-foreground"
          >
            Cadastrar aluno
          </Link>
        </Card>
      ) : !query.studentId ? (
        <Card className="items-center py-14 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">
            Selecione um aluno para visualizar o relatório.
          </h2>
          <p className="text-sm text-muted-foreground">
            Use o filtro acima para consultar os dados do período desejado.
          </p>
        </Card>
      ) : !selectedStudent ? (
        <Card role="alert" className="items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Aluno indisponível.</h2>
          <p className="text-sm text-muted-foreground">
            Selecione um aluno da sua lista para continuar.
          </p>
        </Card>
      ) : query.error ? null : reportError ? (
        <Card role="alert" className="items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">
            Não foi possível carregar o relatório.
          </h2>
          <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
          <Button asChild variant="secondary">
            <Link href={buildReportHref(query)}>Tentar novamente</Link>
          </Button>
        </Card>
      ) : report ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {report.student.avatarUrl ? (
                <Image
                  src={report.student.avatarUrl}
                  alt={`Foto de perfil de ${report.student.name}`}
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <Avatar name={report.student.name} />
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Relatório de</p>
                <p className="font-display text-base font-semibold">{report.student.name}</p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href={buildReportPrintHref(query)}>
                <FileText />
                Abrir versão para impressão
              </Link>
            </Button>
          </div>
          <ReportDashboard report={report} />
        </>
      ) : null}
    </div>
  );
}
