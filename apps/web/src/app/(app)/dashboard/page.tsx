import { Bell, Plus, Search, Users, ClipboardList, AlertTriangle, Sparkles, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth-server';
import { configureServerClient } from '@/lib/api-client';
import { getTrainerSummary } from '@/lib/api/sdk.gen';
import { StatCard } from '@/components/stat-card';
import { TopBar } from '@/components/top-bar';

export default async function DashboardPage() {
  const user = await requireUser();
  const client = await configureServerClient();
  const res = await getTrainerSummary({ client });
  const data = res.data ?? {
    students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
    workouts: { activePlans: 0 },
    assessments: { last30d: 0 },
  };

  return (
    <>
      <TopBar
        title={`Bem-vindo, ${user.name.split(' ')[0]} 👋`}
        subtitle={new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        actions={
          <>
            <Button variant="secondary" size="default" className="gap-2">
              <Search className="size-4" />
              Buscar
            </Button>
            <Button variant="secondary" size="icon" aria-label="Notificações">
              <Bell />
            </Button>
            <Button asChild>
              <Link href="/students/new" className="gap-2">
                <Plus />
                Novo aluno
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={data.students.active}
          hint={data.students.newThisWeek > 0 ? `+${data.students.newThisWeek} esta semana` : `${data.students.total} no total`}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Pausados"
          value={data.students.paused}
          hint={data.students.paused > 0 ? 'Acompanhe' : 'Nenhum'}
          icon={AlertTriangle}
          accent="warning"
        />
        <StatCard
          label="Planos ativos"
          value={data.workouts.activePlans}
          hint={`${data.students.active} alunos ativos`}
          icon={ClipboardList}
          accent="info"
        />
        <StatCard
          label="Avaliações 30d"
          value={data.assessments.last30d}
          hint={data.assessments.last30d === 0 ? 'Nenhuma ainda' : 'Continue acompanhando'}
          icon={BarChart3}
          accent="success"
        />
      </div>

      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <div className="flex items-center justify-between pb-4">
          <h2 className="font-display text-lg font-bold">Próximos passos</h2>
          <Link href="/students" className="font-display text-[13px] font-semibold text-primary hover:underline">
            Ver alunos →
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <NextStepCard icon={Users} title="Cadastrar aluno" href="/students/new" />
          <NextStepCard icon={ClipboardList} title="Montar treino" href="/workouts" />
          <NextStepCard icon={Sparkles} title="Adicionar exercício custom" href="/exercises" />
        </ul>
      </section>
    </>
  );
}

function NextStepCard({
  icon: Icon,
  title,
  href,
}: {
  icon: typeof Users;
  title: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-md border border-border p-4 transition-colors hover:bg-card-hover"
      >
        <span className="grid size-9 place-items-center rounded-md bg-success-bg text-primary">
          <Icon className="size-4" />
        </span>
        <span className="font-display text-sm font-semibold">{title}</span>
      </Link>
    </li>
  );
}
