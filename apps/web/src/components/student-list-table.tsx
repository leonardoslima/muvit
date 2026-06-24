import type { DashboardStudentListRow } from '@/application/dashboard/student-list';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DashboardStudentListState } from '@/lib/dashboard-student-list';
import { ChevronRight, Download, ListFilter } from 'lucide-react';
import Link from 'next/link';

type StudentListTableProps = {
  state: DashboardStudentListState;
};

export function StudentListTable({ state }: StudentListTableProps) {
  const pageCount = Math.max(1, Math.ceil(state.total / state.pageSize));
  const hasMoreStudents = state.status === 'ready' && state.total > state.rows.length;

  return (
    <section aria-label="Lista de alunos">
      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
          <CardTitle>Lista de alunos</CardTitle>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="h-8 px-3 text-xs">
              <Link href="/students">
                <ListFilter className="size-3.5" />
                Filtrar
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled
              aria-label="Exportar indisponível"
              title="Exportação indisponível neste dashboard"
            >
              <Download className="size-3.5" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        {state.status === 'error' ? (
          <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
            {state.message}
          </CardContent>
        ) : (
          <CardContent className="gap-0 overflow-x-auto p-0">
            <Table aria-label="Lista de alunos" className="min-w-[760px] border-collapse">
              <TableHeader className="bg-card-hover">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px] px-5 py-3 font-display text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                    ALUNO
                  </TableHead>
                  <TableHead className="w-[140px] px-5 py-3 font-display text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                    ÚLTIMO TREINO
                  </TableHead>
                  <TableHead className="px-5 py-3 font-display text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                    PLANO ATUAL
                  </TableHead>
                  <TableHead className="w-[100px] px-5 py-3 font-display text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                    STATUS
                  </TableHead>
                  <TableHead className="w-20 px-5 py-3 font-display text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                    AÇÃO
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody(state.rows)}</TableBody>
            </Table>
          </CardContent>
        )}

        <CardFooter className="justify-between px-5 py-3 pt-3">
          <span className="text-xs text-muted-foreground">
            Mostrando {state.rows.length} de {state.total} alunos
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled
            >
              Anterior
            </Button>
            <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-xs font-semibold text-primary-foreground">
              1
            </span>
            {pageCount > 1 && (
              <Link
                href="/students"
                className="grid size-8 place-items-center rounded-md font-display text-xs text-muted-foreground hover:bg-card-hover"
              >
                2
              </Link>
            )}
            {hasMoreStudents ? (
              <Button asChild variant="secondary" size="sm" className="h-8 px-3 text-xs">
                <Link href="/students">Próxima</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled
              >
                Próxima
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </section>
  );
}

function renderTableBody(rows: DashboardStudentListRow[]) {
  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
          Nenhum aluno encontrado.
        </TableCell>
      </TableRow>
    );
  }

  return rows.map((row) => <StudentTableRow key={row.id} row={row} />);
}

function StudentTableRow({ row }: { row: DashboardStudentListRow }) {
  const lastWorkoutClass = row.status === 'inactive' ? 'text-destructive' : 'text-foreground';

  return (
    <TableRow className="last:border-b-0">
      <TableCell className="w-[220px] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <span className="font-display text-sm font-medium text-foreground">{row.name}</span>
        </div>
      </TableCell>
      <TableCell className={`w-[140px] px-5 py-3.5 text-[13px] ${lastWorkoutClass}`}>
        {row.lastWorkout}
      </TableCell>
      <TableCell className="px-5 py-3.5 text-[13px] text-foreground">{row.currentPlan}</TableCell>
      <TableCell className="w-[100px] px-5 py-3.5">
        <Badge variant={row.status}>{row.statusLabel}</Badge>
      </TableCell>
      <TableCell className="w-20 px-5 py-3.5">
        <Button asChild variant="secondary" size="icon-sm" className="text-muted-foreground">
          <Link href={row.href} aria-label={`Abrir ${row.name}`}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
