import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanSelector } from './_plan-selector';
import { updateSubscriptionAction } from './actions';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./actions', () => ({ updateSubscriptionAction: vi.fn() }));

const subscription = {
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
    renewsAt: null,
  },
  usage: { activeStudents: 5, activeStudentLimit: 30 },
  invoices: [],
};

describe('PlanSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateSubscriptionAction).mockResolvedValue({});
  });

  it('confirma e salva a mudança da periodicidade do plano atual', async () => {
    render(<PlanSelector subscription={subscription} />);

    expect(screen.queryByRole('button', { name: 'Selecionar Plano Pro' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Plano Pro' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Trocar para o Plano Pro?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar troca' }));

    await waitFor(() => expect(updateSubscriptionAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(updateSubscriptionAction).mock.calls[0]?.[0];
    expect(formData?.get('plan')).toBe('pro');
    expect(formData?.get('billingInterval')).toBe('annual');
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('mantém o erro recuperável da alteração e bloqueia confirmação concorrente', async () => {
    let resolveAction: ((value: { error?: string }) => void) | undefined;
    vi.mocked(updateSubscriptionAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<PlanSelector subscription={subscription} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Plano Starter' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Trocar para o Plano Starter?' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar troca' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(updateSubscriptionAction).toHaveBeenCalledOnce());
    expect(within(dialog).getByRole('button', { name: 'Alterando…' })).toBeDisabled();
    resolveAction?.({ error: 'Não é possível reduzir para este plano com 5 alunos ativos.' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Não é possível reduzir');
    expect(refresh).not.toHaveBeenCalled();
  });
});
