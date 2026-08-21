import { Badge } from '@/components/ui/badge';
import { configureServerClient } from '@/lib/api-client';
import { getTrainerSubscription } from '@/lib/api/sdk.gen';
import Link from 'next/link';
import { PlanSelector } from './_plan-selector';

export default async function BillingPage() {
  const client = await configureServerClient();
  const response = await getTrainerSubscription({ client });

  if (response.error || !response.data) {
    return (
      <p role="alert" className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive">
        Não foi possível carregar suas informações de cobrança.
      </p>
    );
  }

  const { subscription, usage, invoices } = response.data;
  const limit =
    usage.activeStudentLimit === null
      ? 'alunos ativos ilimitados'
      : `${usage.activeStudents} de ${usage.activeStudentLimit} alunos ativos`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Plano e cobrança</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acompanhe seu plano e as faturas da sua conta.
        </p>
      </header>

      <section
        aria-label="Resumo da assinatura"
        className="rounded-[12px] bg-card p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">
              Plano{' '}
              {subscription.plan === 'pro'
                ? 'Pro'
                : subscription.plan === 'free'
                  ? 'Grátis'
                  : subscription.plan === 'starter'
                    ? 'Starter'
                    : 'Team'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{limit}</p>
          </div>
          <Badge variant={subscription.status === 'active' ? 'active' : 'inactive'}>
            {subscription.status === 'active' ? 'Ativo' : 'Cancelado'}
          </Badge>
        </div>
      </section>

      <PlanSelector subscription={response.data} />

      <section
        aria-labelledby="faturas-title"
        className="rounded-[12px] bg-card p-5 shadow-card sm:p-6"
      >
        <h2 id="faturas-title" className="font-display text-base font-semibold">
          Faturas
        </h2>
        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda não há faturas para esta conta.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-125 text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-3">EMISSÃO</th>
                  <th className="px-2 py-3">PLANO</th>
                  <th className="px-2 py-3">VALOR</th>
                  <th className="px-2 py-3">STATUS</th>
                  <th className="px-2 py-3" aria-label="Documento" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-3">{formatDate(invoice.issuedAt)}</td>
                    <td className="px-2 py-3 capitalize">{invoice.plan}</td>
                    <td className="px-2 py-3">
                      {formatPrice(invoice.amountCents, invoice.currency)}
                    </td>
                    <td className="px-2 py-3 capitalize">
                      {invoice.status === 'paid'
                        ? 'Paga'
                        : invoice.status === 'issued'
                          ? 'Emitida'
                          : 'Cancelada'}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Link
                        href={`/settings/billing/invoices/${invoice.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                        aria-label={`Ver fatura de ${formatDate(invoice.issuedAt)}`}
                      >
                        Ver fatura
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(value))
    .replace('.', '');
}

function formatPrice(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}
