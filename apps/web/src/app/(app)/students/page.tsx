import { TopBar } from '@/components/top-bar';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getStudents } from '@/lib/api/sdk.gen';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { StudentSearch } from './_search';

interface SearchParams {
  q?: string;
  status?: 'active' | 'inactive' | 'paused';
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const client = await configureServerClient();
  const res = await getStudents({
    client,
    query: { q: params.q, status: params.status, limit: 50 },
  });
  const items = (res.data?.items ?? []) as Array<{
    id: string;
    name: string;
    email: string | null;
    status: 'active' | 'inactive' | 'paused';
    isIndependent: boolean;
    createdAt: string;
  }>;
  const total = res.data?.total ?? 0;

  return (
    <>
      <TopBar
        title="Alunos"
        subtitle={`${total} ${total === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}`}
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
          <h2 className="font-display text-lg font-bold">Lista de alunos</h2>
          <StudentSearch />
        </div>

        <div className="grid grid-cols-[minmax(220px,2fr)_140px_1fr_120px_80px] items-center gap-4 bg-card-hover px-5 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <span>Aluno</span>
          <span>Status</span>
          <span>Tipo</span>
          <span>Cadastrado</span>
          <span className="text-right">Ações</span>
        </div>

        {items.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center">
            <Search className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {params.q
                ? 'Nenhum aluno encontrado para esta busca.'
                : 'Nenhum aluno cadastrado ainda.'}
            </p>
            {!params.q && (
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
            {items.map((s) => (
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
      </section>
    </>
  );
}
