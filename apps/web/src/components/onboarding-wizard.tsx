import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type OnboardingWizardProps = {
  completeAction: () => Promise<void> | void;
};

export function OnboardingWizard({ completeAction }: OnboardingWizardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <section className="rounded-[12px] bg-card p-5 shadow-card">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Passo 1
          </span>
          <h2 className="mt-2 font-display text-xl font-bold">Perfil</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trainer-name">Nome publico</Label>
              <Input id="trainer-name" name="trainerName" placeholder="Seu nome profissional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trainer-photo">Foto</Label>
              <Input id="trainer-photo" name="trainerPhoto" type="file" accept="image/jpeg,image/png" />
            </div>
          </div>
        </section>

        <section className="rounded-[12px] bg-card p-5 shadow-card">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Passo 2
          </span>
          <h2 className="mt-2 font-display text-xl font-bold">Primeiro aluno</h2>
          <div className="mt-4">
            <Button asChild>
              <Link href="/students/new">Adicionar aluno</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-[12px] bg-card p-5 shadow-card">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Passo 3
          </span>
          <h2 className="mt-2 font-display text-xl font-bold">Primeiro treino</h2>
          <div className="mt-4">
            <Button asChild variant="secondary">
              <Link href="/workouts/new">Montar treino</Link>
            </Button>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-[12px] bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Finalizar onboarding</h2>
        <form action={completeAction} className="mt-4 flex flex-col gap-3">
          <Button type="submit">Concluir</Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Pular por agora</Link>
          </Button>
        </form>
      </aside>
    </div>
  );
}
