import { getTrainerNotificationPreferences } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getTrainerNotificationPreferences: vi.fn() }));

function apiOk() {
  return {
    data: {
      inactivity: { enabled: true, afterDays: 7, channel: 'both' as const },
      workoutPlanExpiring: { enabled: true, daysBefore: 5, channel: 'email' as const },
      pendingAssessment: { enabled: false, staleAfterDays: 14, channel: 'push' as const },
      newStudentRegistration: { enabled: true, channel: 'both' as const },
    },
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.mocked(getTrainerNotificationPreferences).mockResolvedValue(apiOk());
  });

  it('apresenta preferências vindas da API sem substituí-las por defaults locais', async () => {
    render(await NotificationsPage());

    expect(getTrainerNotificationPreferences).toHaveBeenCalledWith({ client: {} });
    expect(screen.getByRole('heading', { name: 'Notificações' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alertas de inatividade dos alunos')).toBeChecked();
    expect(screen.getByLabelText('Dias de inatividade')).toHaveValue(7);
    expect(screen.getByLabelText('Canal dos alertas de inatividade')).toHaveValue('both');
    expect(screen.getByRole('button', { name: 'Salvar preferências' })).toBeInTheDocument();
  });

  it('mostra erro de carregamento em vez de preferências vazias', async () => {
    vi.mocked(getTrainerNotificationPreferences).mockResolvedValue({
      ...apiOk(),
      data: undefined,
      error: {},
    });

    render(await NotificationsPage());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar suas preferências de notificação.',
    );
  });
});
