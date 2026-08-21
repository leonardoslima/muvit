import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getTrainerInvoice } from '@/lib/api/sdk.gen';
import Link from 'next/link';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await configureServerClient();
  const response = await getTrainerInvoice({ client, path: { id } });

  if (response.error || !response.data) {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        Fatura não encontrada.
      </p>
    );
  }

  const invoice = response.data;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 bg-card p-6 shadow-card print:max-w-none print:shadow-none sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-display text-xl font-bold">MUVIT</p>
          <h1 className="mt-4 font-display text-2xl font-bold">Fatura</h1>
        </div>
        <p className="text-sm text-muted-foreground">Emitida em {formatDate(invoice.issuedAt)}</p>
      </header>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">PLANO</dt>
          <dd className="mt-1 capitalize">{invoice.plan}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">PERIODICIDADE</dt>
          <dd className="mt-1">{invoice.billingInterval === 'monthly' ? 'Mensal' : 'Anual'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">STATUS</dt>
          <dd className="mt-1 capitalize">
            {invoice.status === 'paid'
              ? 'Paga'
              : invoice.status === 'issued'
                ? 'Emitida'
                : 'Cancelada'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">VALOR</dt>
          <dd className="mt-1 text-xl font-bold">
            {formatPrice(invoice.amountCents, invoice.currency)}
          </dd>
        </div>
      </dl>
      <div className="flex justify-end print:hidden">
        <Button asChild variant="secondary">
          <Link href="/settings/billing">Voltar para cobrança</Link>
        </Button>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatPrice(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}
