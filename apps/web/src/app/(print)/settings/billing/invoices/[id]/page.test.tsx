import { getTrainerInvoice } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoicePage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getTrainerInvoice: vi.fn() }));

describe('InvoicePage', () => {
  beforeEach(() => {
    vi.mocked(getTrainerInvoice).mockResolvedValue({
      data: {
        id: 'invoice-1',
        trainerId: 'trainer-1',
        plan: 'pro',
        billingInterval: 'monthly',
        amountCents: 4900,
        status: 'paid',
        issuedAt: '2026-08-01T00:00:00.000Z',
        paidAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(),
    });
  });

  it('consulta a fatura pelo endpoint autenticado e oferece impressão sem shell do app', async () => {
    const { container } = render(
      await InvoicePage({ params: Promise.resolve({ id: 'invoice-1' }) }),
    );

    expect(getTrainerInvoice).toHaveBeenCalledWith({ client: {}, path: { id: 'invoice-1' } });
    expect(screen.getByRole('heading', { name: 'Fatura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeInTheDocument();
    expect(container.querySelector('[data-app-shell]')).not.toBeInTheDocument();
  });
});
