import { Bell, Plus, Search, Users, ClipboardList, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/auth-server';
import { configureServerClient } from '@/lib/api-client';
import { getStudents } from '@/lib/api/sdk.gen';
import { StatCard } from '@/components/stat-card';
import { TopBar } from '@/components/top-bar';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireUser();
  const client = await configureServerClient();
  const studentsRes = await getStudents({ client, query: { limit: 100 } });
  const students = (studentsRes.data?.items ?? []) as Array<{ status: string }>;
  const active = students.filter((s) => s.status === 'active').length;
  const paused = students.filter((s) => s.status === 'paused').length;
  const inactive = students.filter((s) => s.status === 'inactive').length;

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
        <StatCard label="Alunos ativos" value={active} hint={`${students.length} no total`} icon={Users} accent="primary" />
        <StatCard label="Pausados" value={paused} hint={paused > 0 ? 'Acompanhe' : 'Nenhum'} icon={AlertTriangle} accent="warning" />
        <StatCard label="Inativos" value={inactive} hint="Reengajar" icon={ClipboardList} accent="info" />
        <StatCard label="Novos esta semana" value={0} hint="Convide mais" icon={Sparkles} accent="success" />
      </div>

      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <div className="flex items-center justify-between pb-4">
          <h2 className="font-display text-lg font-bold">Atividade recente</h2>
          <Link href="/students" className="font-display text-[13px] font-semibold text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Logs de treino aparecem aqui assim que seus alunos começarem a registrar sessões.
        </p>
      </section>
    </>
  );
}
