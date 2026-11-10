import { StatCard } from '@/components/stat-card';
import { StudentListTable } from '@/components/student-list-table';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { configureServerClient } from '@/lib/api-client';
import { requireUser } from '@/lib/auth-server';
import { loadDashboardStudentList } from '@/lib/dashboard-student-list';
import { loadTrainerSummary } from '@/lib/trainer-summary';
import { AlertTriangle, Bell, ClipboardCheck, Clock, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireUser();
  const client = await configureServerClient();
  const [summaryState, studentListState] = await Promise.all([
    loadTrainerSummary(client),
    loadDashboardStudentList(client),
  ]);

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

      {summaryState.status === 'error' ? (
        <Card role="alert" className="items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Indicadores indisponíveis</h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os indicadores. Tente novamente em alguns instantes.
          </p>
          <Button asChild variant="secondary">
            <a href="/dashboard">Tentar novamente</a>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Alunos ativos"
            value={summaryState.data.students.active}
            hint={
              summaryState.data.students.newThisWeek > 0
                ? `+${summaryState.data.students.newThisWeek} esta semana`
                : `${summaryState.data.students.total} no total`
            }
            icon={Users}
            accent="primary"
          />
          <StatCard
            label="Vencendo esta semana"
            value={summaryState.data.workouts.expiringThisWeek}
            hint={
              summaryState.data.workouts.expiringThisWeek === 0
                ? 'Nenhum vencimento'
                : 'Revise os planos'
            }
            icon={Clock}
            accent="warning"
          />
          <StatCard
            label="Avaliações pendentes"
            value={summaryState.data.assessments.pending}
            hint={
              summaryState.data.assessments.pending === 0 ? 'Todas em dia' : 'Acompanhe os alunos'
            }
            icon={ClipboardCheck}
            accent="info"
          />
          <StatCard
            label="Inativos (7+ dias)"
            value={summaryState.data.students.inactive7d}
            hint={
              summaryState.data.students.inactive7d === 0
                ? 'Todos em movimento'
                : 'Precisam de atenção'
            }
            icon={AlertTriangle}
            accent="destructive"
          />
        </div>
      )}

      <StudentListTable state={studentListState} />
    </>
  );
}
