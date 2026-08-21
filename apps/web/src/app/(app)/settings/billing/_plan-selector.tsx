'use client';

import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { GetTrainerSubscriptionResponse } from '@/lib/api/types.gen';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateSubscriptionAction } from './actions';

type SubscriptionData = GetTrainerSubscriptionResponse;
type Plan = SubscriptionData['subscription']['plan'];
type Interval = SubscriptionData['subscription']['billingInterval'];

const planNames: Record<Plan, string> = {
  free: 'Grátis',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
};

export function PlanSelector({ subscription }: { subscription: SubscriptionData }) {
  const [interval, setInterval] = useState<Interval>(subscription.subscription.billingInterval);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function selectPlan(formData: FormData) {
    const result = await updateSubscriptionAction(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <section aria-labelledby="planos-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="planos-title" className="font-display text-base font-semibold">
            Escolha seu plano
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Altere quando precisar, sem processar pagamentos nesta tela.
          </p>
        </div>
        <fieldset className="flex rounded-md border border-border p-1">
          <legend className="sr-only">Periodicidade de cobrança</legend>
          <IntervalButton checked={interval === 'monthly'} onClick={() => setInterval('monthly')}>
            Mensal
          </IntervalButton>
          <IntervalButton checked={interval === 'annual'} onClick={() => setInterval('annual')}>
            Anual
          </IntervalButton>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(subscription.catalog) as Plan[]).map((plan) => {
          const catalog = subscription.catalog[plan];
          const current =
            plan === subscription.subscription.plan &&
            interval === subscription.subscription.billingInterval;
          const price =
            interval === 'monthly' ? catalog.monthlyPriceCents : catalog.annualPriceCents;
          return (
            <article
              key={plan}
              aria-label={`Plano ${planNames[plan]}`}
              className={cn(
                'flex flex-col gap-4 rounded-[12px] border bg-card p-5',
                current ? 'border-primary shadow-card' : 'border-border',
              )}
            >
              <div>
                <h3 className="font-display text-base font-bold">Plano {planNames[plan]}</h3>
                <p className="mt-2 text-2xl font-bold">{formatPrice(price)}</p>
                <p className="text-xs text-muted-foreground">
                  por {interval === 'monthly' ? 'mês' : 'ano'}
                </p>
              </div>
              <p className="min-h-10 text-sm text-muted-foreground">
                {catalog.activeStudentLimit === null
                  ? 'Alunos ativos ilimitados'
                  : `Até ${catalog.activeStudentLimit} alunos ativos`}
              </p>
              {current ? (
                <span className="text-sm font-semibold text-success">Plano atual</span>
              ) : (
                <ConfirmationDialog
                  trigger={
                    <Button variant="secondary" aria-label={`Selecionar Plano ${planNames[plan]}`}>
                      Selecionar
                    </Button>
                  }
                  title={`Trocar para o Plano ${planNames[plan]}?`}
                  description="A alteração será aplicada à sua assinatura interna e poderá gerar uma nova fatura."
                  confirmLabel="Confirmar troca"
                  pendingLabel="Alterando…"
                  confirmAction={selectPlan}
                  hiddenFields={{ plan, billingInterval: interval }}
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IntervalButton({
  checked,
  children,
  onClick,
}: {
  checked: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        'rounded px-3 py-1.5 text-sm font-medium',
        checked && 'bg-primary text-primary-foreground',
      )}
    >
      {children}
    </button>
  );
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
