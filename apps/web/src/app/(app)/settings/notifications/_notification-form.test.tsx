import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationForm } from './_notification-form';
import { updateNotificationPreferencesAction } from './actions';

vi.mock('./actions', () => ({ updateNotificationPreferencesAction: vi.fn() }));

const preferences = {
  inactivity: { enabled: true, afterDays: 7, channel: 'both' as const },
  workoutPlanExpiring: { enabled: true, daysBefore: 5, channel: 'email' as const },
  pendingAssessment: { enabled: false, staleAfterDays: 60, channel: 'push' as const },
  newStudentRegistration: { enabled: true, channel: 'both' as const },
};

describe('NotificationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateNotificationPreferencesAction).mockReset();
  });

  it('expõe obrigatoriedade e máximos correspondentes ao contrato', () => {
    render(<NotificationForm preferences={preferences} />);

    expect(screen.getByLabelText('Dias de inatividade')).toHaveAttribute('required');
    expect(screen.getByLabelText('Dias de inatividade')).toHaveAttribute('max', '90');
    expect(screen.getByLabelText('Dias antes do vencimento')).toHaveAttribute('max', '30');
    expect(screen.getByLabelText('Dias sem avaliação')).toHaveAttribute('max', '365');
  });

  it('preserva o valor inválido e associa o erro retornado ao campo', async () => {
    vi.mocked(updateNotificationPreferencesAction).mockResolvedValue({
      error: 'Revise os campos destacados.',
      fieldErrors: { inactivityAfterDays: 'Informe os dias de inatividade.' },
    });
    render(<NotificationForm preferences={preferences} />);
    const input = screen.getByLabelText('Dias de inatividade');
    fireEvent.change(input, { target: { value: '' } });
    const form = screen.getByRole('button', { name: 'Salvar preferências' }).closest('form');
    if (!form) throw new Error('Formulário de notificações não encontrado.');

    fireEvent.submit(form);

    expect(await screen.findByText('Informe os dias de inatividade.')).toBeInTheDocument();
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'inactivityAfterDays-error');
  });

  it('bloqueia novo envio enquanto a action está pendente', async () => {
    let resolveAction:
      | ((state: Awaited<ReturnType<typeof updateNotificationPreferencesAction>>) => void)
      | undefined;
    vi.mocked(updateNotificationPreferencesAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<NotificationForm preferences={preferences} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
    const pendingButton = await screen.findByRole('button', { name: 'Salvando…' });
    fireEvent.click(pendingButton);

    expect(pendingButton).toBeDisabled();
    await waitFor(() => expect(updateNotificationPreferencesAction).toHaveBeenCalledOnce());
    await act(async () => resolveAction?.({ success: true }));
    expect(await screen.findByText('Preferências salvas.')).toBeInTheDocument();
  });
});
