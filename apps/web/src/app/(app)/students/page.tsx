import {
  buildStudentListHref,
  parseStudentListPage,
} from '@/application/students/student-list-navigation';
import { TopBar } from '@/components/top-bar';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { loadStudentList } from '@/lib/student-list';
import type { StudentListState } from '@/lib/student-list';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { StudentSearch } from './_search';

interface SearchParams {
  q?: string;
  status?: 'active' | 'inactive' | 'paused';
  page?: string;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const client = await configureServerClient();
  const page = parseStudentListPage(params.page);
  const state = await loadStudentList(client, {
    q: params.q,
    status: params.status,
    page,
  });
  const retryHref = buildStudentListHref({ q: params.q, status: params.status, page });
  const filtered = Boolean(params.q || params.status);

  return (
    <>
      <TopBar
        title="Alunos"
        subtitle={
          state.status === 'ready'
            ? `${state.portfolioTotal} ${
                state.portfolioTotal === 1 ? 'aluno cadastrado' : 'alunos cadastrados'
              }`
            : undefined
        }
        actions={
          <Button asChild>
            <Link href="/students/new" className="gap-2">
              <Plus />
              Novo aluno
            </Link>
          </Button>
        }
      />

      <section className="overflow-hidden rounded-[12px] bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold">Lista de alunos</h2>
            {filtered && state.status === 'ready' && (
              <span className="text-sm text-muted-foreground">
                {state.total} {state.total === 1 ? 'aluno encontrado' : 'alunos encontrados'}
              </span>
            )}
          </div>
          <StudentSearch />
        </div>

        {state.status === 'error' ? (
          <div role="alert" className="grid place-items-center px-5 py-16 text-center">
            <Search className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-display text-lg font-semibold">{state.message}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente novamente em alguns instantes.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <a href={retryHref}>Tentar novamente</a>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(220px,2fr)_140px_1fr_120px_80px] items-center gap-4 bg-card-hover px-5 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Aluno</span>
              <span>Status</span>
              <span>Tipo</span>
              <span>Cadastrado</span>
              <span className="text-right">Ações</span>
            </div>

            {state.items.length === 0 ? (
              <div className="grid place-items-center px-5 py-16 text-center">
                <Search className="mb-3 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {filtered
                    ? 'Nenhum aluno encontrado para os filtros aplicados.'
                    : 'Nenhum aluno cadastrado ainda.'}
                </p>
                {!filtered && (
                  <Button asChild className="mt-4">
                    <Link href="/students/new" className="gap-2">
                      <Plus />
                      Cadastrar primeiro aluno
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <ul>
                {state.items.map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-[minmax(220px,2fr)_140px_1fr_120px_80px] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 transition-colors hover:bg-card-hover"
                  >
                    <Link href={`/students/${s.id}`} className="flex items-center gap-3 min-w-0">
                      <Avatar name={s.name} size="md" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-display font-semibold text-foreground">
                          {s.name}
                        </span>
                        {s.email && (
                          <span className="truncate text-xs text-muted-foreground">{s.email}</span>
                        )}
                      </div>
                    </Link>
                    <span>
                      <Badge
                        variant={
                          s.status === 'active'
                            ? 'active'
                            : s.status === 'paused'
                              ? 'paused'
                              : 'inactive'
                        }
                      >
                        {s.status === 'active'
                          ? 'Ativo'
                          : s.status === 'paused'
                            ? 'Pausado'
                            : 'Inativo'}
                      </Badge>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {s.isIndependent ? 'Independente' : 'Personal'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/students/${s.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {state.status === 'ready' && (
          <StudentListFooter
            state={state}
            previousHref={buildStudentListHref({
              q: params.q,
              status: params.status,
              page: state.page - 1,
            })}
            nextHref={buildStudentListHref({
              q: params.q,
              status: params.status,
              page: state.page + 1,
            })}
          />
        )}
      </section>
    </>
  );
}

function StudentListFooter({
  state,
  previousHref,
  nextHref,
}: {
  state: Extract<StudentListState, { status: 'ready' }>;
  previousHref: string;
  nextHref: string;
}) {
  const pageCount = Math.max(1, Math.ceil(state.total / state.pageSize));
  const start = state.items.length === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const end = start === 0 ? 0 : start + state.items.length - 1;
  const range =
    start === 0
      ? `Mostrando 0 de ${state.total} alunos`
      : `Mostrando ${start}–${end} de ${state.total} alunos`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <span className="text-sm text-muted-foreground">{range}</span>
      <nav aria-label="Paginação de alunos" className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Página {state.page} de {pageCount}
        </span>
        {state.page > 1 ? (
          <Button asChild variant="secondary" size="sm" className="h-8 px-3 text-xs">
            <Link href={previousHref}>Anterior</Link>
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" className="h-8 px-3 text-xs" disabled>
            Anterior
          </Button>
        )}
        {state.page < pageCount ? (
          <Button asChild variant="secondary" size="sm" className="h-8 px-3 text-xs">
            <Link href={nextHref}>Próxima</Link>
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" className="h-8 px-3 text-xs" disabled>
            Próxima
          </Button>
        )}
      </nav>
    </div>
  );
}
