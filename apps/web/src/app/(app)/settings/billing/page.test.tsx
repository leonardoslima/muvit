import { getTrainerSubscription } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BillingPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getTrainerSubscription: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function apiOk() {
  return {
    data: {
      catalog: {
        free: { activeStudentLimit: 3, monthlyPriceCents: 0, annualPriceCents: 0 },
        starter: { activeStudentLimit: 10, monthlyPriceCents: 2900, annualPriceCents: 29000 },
        pro: { activeStudentLimit: 30, monthlyPriceCents: 4900, annualPriceCents: 49000 },
        team: { activeStudentLimit: null, monthlyPriceCents: 8900, annualPriceCents: 89000 },
      },
      subscription: {
        plan: 'pro' as const,
        billingInterval: 'monthly' as const,
        status: 'active' as const,
        startsAt: '2026-01-01T00:00:00.000Z',
        renewsAt: '2026-09-01T00:00:00.000Z',
      },
      usage: { activeStudents: 12, activeStudentLimit: 30 },
      invoices: [
        {
          id: 'invoice-1',
          trainerId: 'trainer-1',
          plan: 'pro' as const,
          billingInterval: 'monthly' as const,
          amountCents: 4900,
          currency: 'BRL',
          status: 'paid' as const,
          issuedAt: '2026-08-01T00:00:00.000Z',
          paidAt: '2026-08-01T00:00:00.000Z',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    },
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

describe('BillingPage', () => {
  beforeEach(() => {
    vi.mocked(getTrainerSubscription).mockResolvedValue(apiOk());
  });

  it('apresenta o catálogo, uso atual e fatura imprimível', async () => {
    render(await BillingPage());

    expect(getTrainerSubscription).toHaveBeenCalledWith({ client: {} });
    expect(screen.getByRole('heading', { name: 'Plano e cobrança' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plano Pro', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('12 de 30 alunos ativos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar Plano Starter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver fatura de 1 de ago de 2026' })).toHaveAttribute(
      'href',
      '/settings/billing/invoices/invoice-1',
    );
  });

  it('mostra erro de carregamento sem apresentar dados de cobrança desatualizados', async () => {
    vi.mocked(getTrainerSubscription).mockResolvedValue({ ...apiOk(), data: undefined, error: {} });

    render(await BillingPage());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar suas informações de cobrança.',
    );
  });
});
