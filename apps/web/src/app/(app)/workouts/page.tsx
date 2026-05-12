import { TopBar } from '@/components/top-bar';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getStudents } from '@/lib/api/sdk.gen';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function WorkoutsPage() {
  const client = await configureServerClient();
  const res = await getStudents({ client, query: { limit: 100, status: 'active' } });
  const items = (res.data?.items ?? []) as Array<{
    id: string;
    name: string;
    email: string | null;
  }>;

  return (
    <>
      <TopBar
        title="Treinos"
        subtitle="Selecione um aluno para criar ou editar treinos."
        actions={
          <Button asChild>
            <Link href="/students/new" className="gap-2">
              <Plus />
              Novo aluno
            </Link>
          </Button>
        }
      />
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <p className="col-span-full rounded-[12px] bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            Cadastre um aluno para começar a montar treinos.
          </p>
        ) : (
          items.map((s) => (
            <Link
              key={s.id}
              href={`/workouts/new?studentId=${s.id}`}
              className="flex items-center justify-between gap-3 rounded-[12px] bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <Avatar name={s.name} size="md" />
                <div className="flex flex-col">
                  <span className="font-display font-semibold">{s.name}</span>
                  {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                </div>
              </div>
              <span className="font-display text-[13px] font-semibold text-primary">+ Treino</span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
