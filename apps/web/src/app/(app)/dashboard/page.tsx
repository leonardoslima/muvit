import { StatCard } from '@/components/stat-card';
import { StudentListTable } from '@/components/student-list-table';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getTrainerSummary } from '@/lib/api/sdk.gen';
import { requireUser } from '@/lib/auth-server';
import { loadDashboardStudentList } from '@/lib/dashboard-student-list';
import { AlertTriangle, BarChart3, Bell, ClipboardList, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireUser();
  const client = await configureServerClient();
  const [summaryRes, studentListState] = await Promise.all([
    getTrainerSummary({ client }),
    loadDashboardStudentList(client),
  ]);
  const data = summaryRes.data ?? {
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
          hint={
            data.students.newThisWeek > 0
              ? `+${data.students.newThisWeek} esta semana`
              : `${data.students.total} no total`
          }
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

      <StudentListTable state={studentListState} />
    </>
  );
}
