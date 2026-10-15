import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../application/exercises/exercise-catalog';
import type {
  TrainerWorkoutPlan,
  TrainerWorkoutPlanDraft,
} from '../application/workouts/trainer-workout-data';
import { ApiError } from '../lib/api';
import { TrainerWorkoutEditorScreen } from './trainer-workout-editor';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const SECOND_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const SECOND_DRAFT_ID = '00000000-0000-0000-0000-000000000502';
const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const DAY_ID = '00000000-0000-0000-0000-000000000201';
const EXERCISE_ROW_ID = '00000000-0000-0000-0000-000000000401';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  canGoBack: vi.fn(() => true),
  dismissTo: vi.fn(),
  replace: vi.fn(),
}));
type TabPressEvent = { target?: string; preventDefault: () => void };
type TabPressListener = (event: TabPressEvent) => void;
const tabsNavigationState = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getState: vi.fn(() => ({
    routes: [
      { key: 'home-tab-key', name: 'index' },
      { key: 'students-tab-key', name: 'students' },
      { key: 'profile-tab-key', name: 'profile', params: { section: 'account' } },
    ],
  })),
  addListener: vi.fn(),
  listener: undefined as TabPressListener | undefined,
}));
const navigationState = vi.hoisted(() => ({ dispatch: vi.fn(), getParent: vi.fn() }));
const guardState = vi.hoisted(() => ({
  callback: undefined as ((event: { data: { action: unknown } }) => void) | undefined,
  enabled: false,
}));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
  planId: undefined as string | undefined,
  draftId: undefined as string | undefined,
}));

vi.mock('@react-navigation/native', () => ({
  CommonActions: {
    navigate: vi.fn((name: string, params?: Record<string, unknown>) => ({
      type: 'NAVIGATE',
      payload: { name, ...(params ? { params } : {}) },
    })),
  },
}));

const tabNavigationAction = (params: {
  name: string;
  params?: Record<string, unknown>;
}) => ({ type: 'NAVIGATE', payload: params });

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
  useNavigation: () => navigationState,
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: '00000000-0000-0000-0000-000000000801' } } }),
  },
}));

vi.mock('../lib/use-prevent-remove', () => ({
  usePreventRemove: (
    enabled: boolean,
    callback: (event: { data: { action: unknown } }) => void,
  ) => {
    guardState.enabled = enabled;
    guardState.callback = callback;
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

function exerciseFixture(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: EXERCISE_ID,
    trainerId: null,
    name: 'Supino reto',
    muscleGroup: 'chest',
    equipment: 'Barra',
    videoUrl: null,
    instructions: null,
    createdAt: '2026-09-06T12:00:00.000Z',
    ...overrides,
  };
}

function workoutPlanFixture(overrides: Partial<TrainerWorkoutPlan> = {}): TrainerWorkoutPlan {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Hipertrofia',
    startDate: null,
    endDate: null,
    status: 'draft',
    notes: null,
    createdAt: '2026-09-06T12:00:00.000Z',
    days: [
      {
        id: DAY_ID,
        planId: PLAN_ID,
        label: 'Treino A',
        dayOrder: 0,
        exercises: [],
      },
    ],
    ...overrides,
  };
}

function editablePlanFixture(overrides: Partial<TrainerWorkoutPlan> = {}): TrainerWorkoutPlan {
  return workoutPlanFixture({
    name: 'Força',
    status: 'active',
    notes: 'Progressão semanal',
    days: [
      {
        id: DAY_ID,
        planId: PLAN_ID,
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            id: EXERCISE_ROW_ID,
            workoutDayId: DAY_ID,
            exerciseId: EXERCISE_ID,
            exerciseOrder: 0,
            sets: 4,
            reps: '8-10',
            restSeconds: 90,
            loadKg: '82.50',
            tempo: '3010',
            notes: 'Sem falhar',
            exercise: {
              id: EXERCISE_ID,
              name: 'Supino reto',
              muscleGroup: 'chest',
            },
          },
        ],
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        planId: PLAN_ID,
        label: 'Treino B',
        dayOrder: 1,
        exercises: [],
      },
    ],
    ...overrides,
  });
}

function singleDayEditablePlanFixture(
  overrides: Partial<TrainerWorkoutPlan> = {},
): TrainerWorkoutPlan {
  const plan = editablePlanFixture(overrides);
  const firstDay = plan.days[0];
  return firstDay ? { ...plan, days: [firstDay] } : plan;
}

function draftFixture(): TrainerWorkoutPlanDraft {
  return {
    id: '00000000-0000-0000-0000-000000000501',
    trainerId: '00000000-0000-0000-0000-000000000901',
    studentId: STUDENT_ID,
    sourcePlanId: PLAN_ID,
    payload: {
      name: 'Força revisada',
      notes: 'Progressão semanal',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: EXERCISE_ID,
              exerciseOrder: 0,
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
              loadKg: 82.5,
              tempo: '3010',
              notes: 'Sem falhar',
            },
          ],
        },
      ],
    },
    selectedDayOrder: 0,
    revision: 1,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:30:00.000Z',
    exerciseReferences: [{ id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' }],
  };
}

function renderEditor(mode: 'create' | 'edit' = 'create') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <TrainerWorkoutEditorScreen mode={mode} />
    </QueryClientProvider>
  );
  const view = render(tree());

  return { ...view, queryClient, rerenderEditor: () => view.rerender(tree()) };
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.dismissTo.mockReset();
  routerState.replace.mockReset();
  routerState.back.mockReset();
  routerState.canGoBack.mockReturnValue(true);
  navigationState.dispatch.mockReset();
  navigationState.getParent.mockReturnValue(tabsNavigationState);
  tabsNavigationState.dispatch.mockReset();
  tabsNavigationState.getState.mockClear();
  tabsNavigationState.addListener.mockReset();
  tabsNavigationState.listener = undefined;
  tabsNavigationState.addListener.mockImplementation(
    (_event: 'tabPress', listener: TabPressListener) => {
      tabsNavigationState.listener = listener;
      return vi.fn();
    },
  );
  guardState.enabled = false;
  guardState.callback = undefined;
  paramsState.studentId = STUDENT_ID;
  paramsState.planId = undefined;
  paramsState.draftId = undefined;
  vi.restoreAllMocks();
});

describe('TrainerWorkoutEditorScreen em criação', () => {
  it('usa ações no cabeçalho e omite seletor de status e ações duplicadas no corpo', () => {
    renderEditor();

    expect(screen.queryByRole('button', { name: 'Ativo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rascunho' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Voltar para treinos' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Ver treino' })).toBeNull();
  });

  it('mostra aluno inválido sem fazer POST', async () => {
    paramsState.studentId = undefined;

    renderEditor();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('inicia sem status, mostra um dia vazio e permite adicionar até sete dias', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('Novo treino')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Selecionar Treino A' })).toBeTruthy();
    expect(screen.getByText('Nenhum exercício neste dia')).toBeTruthy();

    for (let index = 0; index < 6; index += 1) {
      await user.press(screen.getByRole('button', { name: 'Adicionar dia' }));
    }

    expect(screen.getByRole('tab', { name: 'Selecionar Treino G' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Adicionar dia' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('troca o dia ativo sem perder o conteúdo dos demais', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.press(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Adicionar dia' }));
    await user.press(screen.getByRole('tab', { name: 'Selecionar Treino A' }));
    await user.clear(screen.getByLabelText('Nome do dia'));
    await user.type(screen.getByLabelText('Nome do dia'), 'Força');
    await user.press(screen.getByRole('tab', { name: 'Selecionar Treino B' }));

    expect(screen.getByLabelText('Nome do dia').props.value).toBe('Treino B');
    await user.press(screen.getByRole('tab', { name: 'Selecionar Força' }));
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Hipertrofia');
    expect(screen.getByLabelText('Nome do dia').props.value).toBe('Força');
  });

  it('confirma remoção de dia com conteúdo e remove dia vazio diretamente', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(Alert, 'alert');
    apiState.request.mockResolvedValue({ items: [exerciseFixture()], total: 1 });

    renderEditor();
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));
    await user.press(screen.getByRole('button', { name: 'Adicionar dia' }));
    await user.press(screen.getByRole('tab', { name: 'Selecionar Treino A' }));
    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(alert).toHaveBeenCalledWith(
      'Remover dia?',
      'O dia Treino A e seus exercícios serão removidos deste treino.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2];
    expect(buttons).toBeDefined();
    await act(async () => buttons?.[0]?.onPress?.());
    expect(screen.getByRole('tab', { name: 'Selecionar Treino A' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));
    const secondButtons = alert.mock.calls[1]?.[2];
    await act(async () => secondButtons?.[1]?.onPress?.());
    expect(screen.queryByRole('tab', { name: 'Selecionar Treino A' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Selecionar Treino B' })).toBeTruthy();
  });

  it('integra o catálogo, aplica defaults e permite duplicar exercício', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    renderEditor();
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));

    expect(screen.getAllByText('Supino reto')).toHaveLength(1);
    expect(screen.getByLabelText('Séries').props.value).toBe('3');
    expect(screen.getByLabelText('Repetições').props.value).toBe('10');

    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByRole('button', { name: /Selecionar Supino reto/ });
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));

    expect(screen.getAllByText('Supino reto')).toHaveLength(2);
    expect(screen.getAllByLabelText('Séries')).toHaveLength(2);
  });

  it('valida antes do POST e preserva o formulário', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(await screen.findByText('Cada dia precisa ter ao menos 1 exercício.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalledWith('/workout-plans', expect.anything());
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Hipertrofia');
  });

  it('faz POST, atualiza cache e mostra sucesso com navegação explícita', async () => {
    const user = userEvent.setup();
    const createdPlan = workoutPlanFixture({ name: 'Hipertrofia', status: 'active' });
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce(createdPlan);

    const { queryClient } = renderEditor();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryData = vi.spyOn(queryClient, 'setQueryData');

    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));
    await user.type(screen.getByLabelText('Carga'), '82,5');
    await user.type(screen.getByLabelText('Descanso'), '90');
    await user.type(screen.getByLabelText('Observação'), 'Controlar a descida');
    await user.press(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(apiState.request).toHaveBeenCalledWith('/workout-plans', {
      method: 'POST',
      body: JSON.stringify({
        studentId: STUDENT_ID,
        name: 'Hipertrofia',
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: EXERCISE_ID,
                exerciseOrder: 0,
                sets: 3,
                reps: '10',
                restSeconds: 90,
                loadKg: 82.5,
                notes: 'Controlar a descida',
              },
            ],
          },
        ],
      }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'workouts', STUDENT_ID],
      refetchType: 'none',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'summary'],
      refetchType: 'none',
    });
    expect(setQueryData).toHaveBeenCalledWith(['trainer', 'workout', PLAN_ID], createdPlan);
    expect(await screen.findByText('Treino publicado com sucesso.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver treino' })).toBeNull();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it('bloqueia submit concorrente, mantém valores no erro e limpa sucesso ao editar', async () => {
    const user = userEvent.setup();
    let rejectPost: (error: Error) => void = () => undefined;
    const post = new Promise<never>((_, reject) => {
      rejectPost = reject;
    });
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockReturnValueOnce(post);

    renderEditor();
    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));
    await user.press(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByRole('button', { name: 'Publicando...' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await waitFor(() => rejectPost(new Error('offline')));
    expect(await screen.findByText('Não foi possível publicar o treino.')).toBeTruthy();
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Hipertrofia');
  });
});

describe('TrainerWorkoutEditorScreen em edição', () => {
  beforeEach(() => {
    paramsState.studentId = STUDENT_ID;
    paramsState.planId = PLAN_ID;
  });

  it('valida params sem fazer request', () => {
    paramsState.studentId = undefined;
    paramsState.planId = undefined;

    renderEditor('edit');

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('não faz GET quando o deep link de edição não tem studentId', () => {
    paramsState.studentId = undefined;
    paramsState.planId = PLAN_ID;

    renderEditor('edit');

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));
    renderEditor('edit');
    expect(screen.getByText('Carregando treino')).toBeTruthy();
  });

  it('trata 404 sem revelar dados', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));
    renderEditor('edit');
    expect(await screen.findByText('Treino não encontrado')).toBeTruthy();
  });

  it('permite retry depois de erro genérico', async () => {
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(editablePlanFixture());
    renderEditor('edit');
    const user = userEvent.setup();
    expect(await screen.findByText('Não foi possível carregar o treino')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Nome do treino')).toBeTruthy();
  });

  it('bloqueia mismatch sem revelar o formulário', async () => {
    apiState.request.mockResolvedValueOnce(
      editablePlanFixture({ studentId: '00000000-0000-0000-0000-000000000002' }),
    );

    renderEditor('edit');

    expect(await screen.findByText('Treino indisponível')).toBeTruthy();
    expect(screen.queryByLabelText('Nome do treino')).toBeNull();
  });

  it('reidrata dados mais novos enquanto o editor está limpo', async () => {
    const serverUpdate = editablePlanFixture({ name: 'Nome do servidor' });
    apiState.request
      .mockResolvedValueOnce(editablePlanFixture())
      .mockResolvedValueOnce(serverUpdate);

    const { queryClient } = renderEditor('edit');

    expect(await screen.findByLabelText('Nome do treino')).toBeTruthy();
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['trainer', 'workout', PLAN_ID] });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Nome do treino').props.value).toBe('Nome do servidor');
    });
  });

  it('mantém plano arquivado em somente leitura', async () => {
    apiState.request.mockResolvedValueOnce(editablePlanFixture({ status: 'archived' }));

    renderEditor('edit');

    expect(await screen.findByText('Treino arquivado')).toBeTruthy();
    expect(screen.getByText('Planos arquivados são somente leitura no mobile.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
  });

  it('hidrata uma vez, preserva tempo e não reseta alteração local no refetch', async () => {
    const serverUpdate = editablePlanFixture({ name: 'Nome do servidor' });
    apiState.request
      .mockResolvedValueOnce(editablePlanFixture())
      .mockResolvedValueOnce(serverUpdate);

    const user = userEvent.setup();
    const { queryClient } = renderEditor('edit');

    expect(await screen.findByLabelText('Nome do treino')).toBeTruthy();
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Força');
    expect(screen.getByLabelText('Carga').props.value).toBe('82.50');
    expect(screen.getByLabelText('Descanso').props.value).toBe('90');
    expect(screen.queryByLabelText('Tempo')).toBeNull();

    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Nome local');
    await queryClient.refetchQueries({ queryKey: ['trainer', 'workout', PLAN_ID] });

    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Nome local');
    await user.press(screen.getByRole('tab', { name: 'Selecionar Treino B' }));
    expect(screen.getByLabelText('Nome do dia').props.value).toBe('Treino B');
  });

  it('faz PATCH completo, limpa notas e atualiza os caches', async () => {
    const updatedPlan = singleDayEditablePlanFixture({ name: 'Força atualizada', notes: null });
    apiState.request
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockResolvedValueOnce(updatedPlan);
    const user = userEvent.setup();
    const { queryClient } = renderEditor('edit');
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryData = vi.spyOn(queryClient, 'setQueryData');

    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Força atualizada');
    await user.clear(screen.getByLabelText('Notas'));
    await user.press(screen.getByRole('button', { name: 'Salvar alterações' }));

    const patchCall = apiState.request.mock.calls.find(
      (call) => call[0] === `/workout-plans/${PLAN_ID}` && call[1]?.method === 'PATCH',
    );
    expect(patchCall).toEqual([
      `/workout-plans/${PLAN_ID}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Força atualizada',
          status: 'active',
          notes: '',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [
                {
                  exerciseId: EXERCISE_ID,
                  exerciseOrder: 0,
                  sets: 4,
                  reps: '8-10',
                  restSeconds: 90,
                  loadKg: 82.5,
                  tempo: '3010',
                  notes: 'Sem falhar',
                },
              ],
            },
          ],
        }),
      },
    ]);
    expect(patchCall?.[1]).not.toHaveProperty('studentId');
    expect(JSON.stringify(patchCall?.[1])).not.toContain('startDate');
    expect(JSON.stringify(patchCall?.[1])).not.toContain('endDate');
    expect(JSON.stringify(patchCall?.[1])).not.toContain('trainerId');
    expect(setQueryData).toHaveBeenCalledWith(['trainer', 'workout', PLAN_ID], updatedPlan);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'workouts', STUDENT_ID],
      refetchType: 'none',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'summary'],
      refetchType: 'none',
    });
    expect(await screen.findByText('Treino publicado com sucesso.')).toBeTruthy();
  });

  it('mantém alterações locais quando o PATCH falha', async () => {
    apiState.request
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();

    renderEditor('edit');
    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Nome local');
    await user.press(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Não foi possível publicar o treino.')).toBeTruthy();
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Nome local');
  });

  it('salva rascunho confirmado antes de despachar a navegação capturada uma única vez', async () => {
    const user = userEvent.setup();
    const action = { type: 'GO_BACK' };
    apiState.request
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockResolvedValueOnce(draftFixture());
    renderEditor('edit');
    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Força revisada');

    expect(guardState.enabled).toBe(true);
    act(() => guardState.callback?.({ data: { action } }));
    expect(screen.getByText('Sair do editor?')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Salvar rascunho e sair' }));

    await waitFor(() => expect(navigationState.dispatch).toHaveBeenCalledOnce());
    expect(navigationState.dispatch).toHaveBeenCalledWith(action);
    const draftSaveCalls = apiState.request.mock.calls.filter(
      (call) => call[0] === '/workout-plan-drafts',
    );
    expect(draftSaveCalls).toHaveLength(1);
    const body = JSON.parse(draftSaveCalls[0]?.[1]?.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('draftId');
    expect(body).not.toHaveProperty('revision');
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Força revisada');
  });

  it('protege tabPress dirty e reaplica o destino com params após salvar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockResolvedValueOnce(draftFixture());
    renderEditor('edit');
    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Nome local');

    const event = { target: 'profile-tab-key', preventDefault: vi.fn() };
    act(() => tabsNavigationState.listener?.(event));

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(screen.getByText('Sair do editor?')).toBeTruthy();
    expect(tabsNavigationState.dispatch).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Salvar rascunho e sair' }));

    await waitFor(() => expect(tabsNavigationState.dispatch).toHaveBeenCalledOnce());
    expect(tabsNavigationState.dispatch).toHaveBeenCalledWith(
      tabNavigationAction({
        name: 'profile',
        params: { section: 'account' },
      }),
    );
    expect(navigationState.dispatch).not.toHaveBeenCalled();
  });

  it('bloqueia novos tabPress durante save e reaplica somente o destino capturado', async () => {
    const user = userEvent.setup();
    let resolveDraftSave: (draft: TrainerWorkoutPlanDraft) => void = () => undefined;
    const pendingDraftSave = new Promise<TrainerWorkoutPlanDraft>((resolve) => {
      resolveDraftSave = resolve;
    });
    apiState.request
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockReturnValueOnce(pendingDraftSave);
    renderEditor('edit');
    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Nome local');

    act(() => {
      tabsNavigationState.listener?.({
        target: 'profile-tab-key',
        preventDefault: vi.fn(),
      });
    });
    await user.press(screen.getByRole('button', { name: 'Salvar rascunho e sair' }));
    expect(screen.getByText('Sair do editor?')).toBeTruthy();

    const busyTabPress = { target: 'home-tab-key', preventDefault: vi.fn() };
    act(() => tabsNavigationState.listener?.(busyTabPress));

    expect(busyTabPress.preventDefault).toHaveBeenCalledOnce();
    expect(tabsNavigationState.dispatch).not.toHaveBeenCalled();
    await act(async () => resolveDraftSave(draftFixture()));

    await waitFor(() => expect(tabsNavigationState.dispatch).toHaveBeenCalledOnce());
    expect(tabsNavigationState.dispatch).toHaveBeenCalledWith(
      tabNavigationAction({
        name: 'profile',
        params: { section: 'account' },
      }),
    );
  });

  it('reinicializa editor e identidade ao trocar draft/aluno na rota atual', async () => {
    const user = userEvent.setup();
    const nextDraft: TrainerWorkoutPlanDraft = {
      ...draftFixture(),
      id: SECOND_DRAFT_ID,
      studentId: SECOND_STUDENT_ID,
      sourcePlanId: null,
      payload: { ...draftFixture().payload, name: 'Rascunho do segundo aluno' },
    };
    apiState.request
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(singleDayEditablePlanFixture())
      .mockResolvedValueOnce(nextDraft);
    paramsState.draftId = '00000000-0000-0000-0000-000000000501';
    const { rerenderEditor } = renderEditor('edit');
    await screen.findByLabelText('Nome do treino');
    await user.clear(screen.getByLabelText('Nome do treino'));
    await user.type(screen.getByLabelText('Nome do treino'), 'Edição local antiga');

    paramsState.studentId = SECOND_STUDENT_ID;
    paramsState.planId = undefined;
    paramsState.draftId = SECOND_DRAFT_ID;
    rerenderEditor();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome do treino').props.value).toBe('Rascunho do segundo aluno');
    });
    expect(screen.queryByDisplayValue('Edição local antiga')).toBeNull();
    expect(apiState.request).toHaveBeenCalledWith(`/workout-plan-drafts/${SECOND_DRAFT_ID}`, {
      signal: expect.anything(),
    });
  });

  it('ignora resposta tardia do draft anterior após trocar contexto', async () => {
    let resolveFirstDraft: (draft: TrainerWorkoutPlanDraft) => void = () => undefined;
    const pendingFirstDraft = new Promise<TrainerWorkoutPlanDraft>((resolve) => {
      resolveFirstDraft = resolve;
    });
    const nextDraft: TrainerWorkoutPlanDraft = {
      ...draftFixture(),
      id: SECOND_DRAFT_ID,
      studentId: SECOND_STUDENT_ID,
      sourcePlanId: null,
      payload: { ...draftFixture().payload, name: 'Rascunho do segundo aluno' },
    };
    apiState.request.mockReturnValueOnce(pendingFirstDraft).mockResolvedValueOnce(nextDraft);
    paramsState.draftId = '00000000-0000-0000-0000-000000000501';
    const { rerenderEditor } = renderEditor('edit');

    paramsState.studentId = SECOND_STUDENT_ID;
    paramsState.planId = undefined;
    paramsState.draftId = SECOND_DRAFT_ID;
    rerenderEditor();
    await screen.findByLabelText('Nome do treino');
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Rascunho do segundo aluno');

    await act(async () => resolveFirstDraft(draftFixture()));

    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Rascunho do segundo aluno');
    expect(screen.queryByDisplayValue('Força revisada')).toBeNull();
  });
});
