import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colors, radii } from '../lib/styles';
import { TrainerHomeScreen } from './trainer-home';

type LinkProps = {
  children: ReactNode;
  href: string;
};

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const linkState = vi.hoisted(() => ({ hrefs: [] as string[] }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));
const authState = vi.hoisted(() => ({
  session: {
    data: {
      user: {
        id: 'trainer-auth-id',
        name: 'Ana Costa',
        email: 'ana@example.com',
        role: 'trainer',
      },
    } as { user: { id: string; name: string; email: string; role: string } } | null,
    isPending: false,
  },
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => authState.session,
  },
}));

vi.mock('expo-router', () => ({
  Link: ({ children, href }: LinkProps) => {
    linkState.hrefs.push(href);
    return children;
  },
  router: routerState,
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function renderTrainerHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <TrainerHomeScreen />
    </QueryClientProvider>,
  );

  return { ...renderResult, queryClient };
}

beforeEach(() => {
  apiState.request.mockReset();
  linkState.hrefs.length = 0;
  routerState.push.mockReset();
  authState.session.data = {
    user: {
      id: 'trainer-auth-id',
      name: 'Ana Costa',
      email: 'ana@example.com',
      role: 'trainer',
    },
  };
  authState.session.isPending = false;
});

describe('TrainerHomeScreen', () => {
  it('mostra loading enquanto o resumo está pendente', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerHome();

    expect(screen.getByText('Carregando visão geral')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    expect(screen.getByTestId('trainer-home-header')).toBeTruthy();
    expect(screen.getAllByTestId('trainer-home-loading-metric')).toHaveLength(2);
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-loading-state').props.style),
    ).toMatchObject({ minHeight: 160 });
  });

  it('usa o primeiro nome autenticado no cabeçalho do treinador', async () => {
    authState.session.data = {
      user: {
        id: 'trainer-auth-id',
        name: 'Mariana Costa',
        email: 'mariana@example.com',
        role: 'trainer',
      },
    };
    apiState.request.mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByRole('header', { name: 'Bom dia, Mariana' })).toBeTruthy();
    expect(screen.queryByText('Bom dia, João')).toBeNull();
  });

  it('permite retry após erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByText('Não foi possível carregar a visão geral')).toBeTruthy();
    expect(screen.getByTestId('trainer-home-header')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('exibe o estado vazio quando não há alunos vinculados', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
    expect(screen.getByText('Nenhum aluno vinculado para acompanhar no momento.')).toBeTruthy();
    expect(screen.queryByText('Alunos ativos')).toBeNull();
  });

  it('usa um cartão compacto com skeletons no carregamento', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerHome();

    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-loading-state').props.style),
    ).toMatchObject({
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderRadius: radii.control,
      borderWidth: 1,
      padding: 14,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-loading-greeting').props.style),
    ).toMatchObject({
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.sm,
      height: 20,
      width: 168,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-loading-subtitle').props.style),
    ).toMatchObject({
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.sm,
      height: 10,
      width: 236,
    });
  });

  it('mantém o vazio em um cartão centralizado com ícone sem ação', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    expect(await screen.findByTestId('trainer-home-empty-state')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-empty-icon').props.style),
    ).toMatchObject({
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      height: 34,
      width: 34,
    });
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver todos os alunos' })).toBeTruthy();
    expect(linkState.hrefs).toContain('/trainer/students');
  });

  it('prioriza o retry no cartão de erro', async () => {
    apiState.request.mockRejectedValueOnce(new Error('offline'));

    renderTrainerHome();

    expect(await screen.findByTestId('trainer-home-error-state')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-home-error-icon').props.style),
    ).toMatchObject({
      backgroundColor: colors.dangerSoft,
      borderRadius: radii.pill,
      height: 34,
      width: 34,
    });
    expect(
      StyleSheet.flatten(
        screen.getByRole('button', { name: 'Tentar novamente' }).props.style({ pressed: false }),
      ),
    ).toMatchObject({
      backgroundColor: colors.primary,
      borderRadius: radii.control,
      height: 48,
    });
  });

  it('renderiza os indicadores retornados pela API', async () => {
    apiState.request.mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    });

    renderTrainerHome();

    expect(await screen.findByText('9')).toBeTruthy();
    expect(screen.getByText('com vínculo ativo')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('Avaliações recentes')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeTruthy();
  });

  it('mantém a composição compacta definida para o início do treinador', async () => {
    apiState.request
      .mockResolvedValueOnce({
        students: { total: 3, active: 2, paused: 1, inactive: 0, newThisWeek: 1 },
        workouts: { activePlans: 2 },
        assessments: { last30d: 4 },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'student-1',
            trainerId: 'trainer-1',
            isIndependent: false,
            name: 'Mariana Costa',
            email: 'mariana@example.com',
            phone: null,
            birthDate: null,
            gender: null,
            goals: null,
            restrictions: null,
            status: 'active',
            avatarUrl: null,
            expoPushToken: null,
            createdAt: '2026-09-18T12:00:00.000Z',
          },
        ],
        total: 1,
      });

    renderTrainerHome();

    expect(await screen.findByText('Ver todos os alunos')).toBeTruthy();
    expect(screen.getByTestId('trainer-home-dashboard')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-metric-students').props.style),
    ).toMatchObject({
      flex: 1,
      borderRadius: radii.md,
      minHeight: 118,
      padding: 14,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-student-row').props.style({ pressed: false })),
    ).toMatchObject({
      borderRadius: radii.md,
      minHeight: 72,
      paddingHorizontal: 16,
      paddingVertical: 12,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-recent-students').props.style),
    ).toMatchObject({ gap: 10 });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-student-avatar').props.style),
    ).toMatchObject({
      height: 40,
      width: 40,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-metric-students-icon').props.style),
    ).toMatchObject({ backgroundColor: colors.primarySoft });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-metric-assessments-icon').props.style),
    ).toMatchObject({ backgroundColor: '#EBF5FB' });
    expect(screen.getByText('INÍCIO').props.style).toMatchObject({ color: colors.primary });
    const sectionAction = screen.getByRole('button', { name: 'Ver todos os alunos' });
    expect(StyleSheet.flatten(sectionAction.props.style)).toMatchObject({
      minHeight: 22,
    });
    expect(sectionAction.props.hitSlop).toBe(12);
    expect(screen.getByText('Ver todos os alunos').props.style).toMatchObject({
      color: colors.primary,
    });
  });

  it('mostra até três alunos recentes usando os dados existentes da carteira', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        students: { total: 3, active: 2, paused: 1, inactive: 0, newThisWeek: 1 },
        workouts: { activePlans: 2 },
        assessments: { last30d: 4 },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'student-1',
            trainerId: 'trainer-1',
            isIndependent: false,
            name: 'Mariana Costa',
            email: 'mariana@example.com',
            phone: null,
            birthDate: null,
            gender: null,
            goals: null,
            restrictions: null,
            status: 'active',
            avatarUrl: null,
            expoPushToken: null,
            createdAt: '2026-09-18T12:00:00.000Z',
          },
        ],
        total: 1,
      });

    renderTrainerHome();

    expect(await screen.findByText('Mariana Costa')).toBeTruthy();
    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir Mariana Costa' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Abrir Mariana Costa' }));

    expect(routerState.push).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('navega para a carteira ao pressionar Ver alunos', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      students: { total: 2, active: 2, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 1 },
      assessments: { last30d: 0 },
    });

    renderTrainerHome();

    await user.press(await screen.findByRole('button', { name: 'Ver todos os alunos' }));

    expect(linkState.hrefs).toContain('/trainer/students');
  });

  it('preserva os indicadores quando uma atualização tardia falha', async () => {
    apiState.request
      .mockResolvedValueOnce({
        students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
        workouts: { activePlans: 8 },
        assessments: { last30d: 6 },
      })
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockRejectedValueOnce(new Error('offline'));

    const { queryClient } = renderTrainerHome();

    expect(await screen.findByText('com vínculo ativo')).toBeTruthy();
    await queryClient.refetchQueries({ queryKey: ['trainer', 'summary'] });

    expect(await screen.findByText('Não foi possível atualizar a visão geral.')).toBeTruthy();
    expect(screen.getByText('com vínculo ativo')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });
});
