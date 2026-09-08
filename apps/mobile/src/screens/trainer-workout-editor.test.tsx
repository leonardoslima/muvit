import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../application/exercises/exercise-catalog';
import type { TrainerWorkoutPlan } from '../application/workouts/trainer-workout-data';
import { ApiError } from '../lib/api';
import { TrainerWorkoutEditorScreen } from './trainer-workout-editor';

type PreventRemoveEvent = { data: { action: unknown } };

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const DAY_ID = '00000000-0000-0000-0000-000000000201';
const EXERCISE_ROW_ID = '00000000-0000-0000-0000-000000000401';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ dismissTo: vi.fn(), replace: vi.fn() }));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
  planId: undefined as string | undefined,
}));
const navigationState = vi.hoisted(() => ({
  callback: null as ((event: PreventRemoveEvent) => void) | null,
  dispatch: vi.fn(),
  enabled: false,
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
  useNavigation: () => ({ dispatch: navigationState.dispatch }),
}));

vi.mock('../lib/use-prevent-remove', () => ({
  usePreventRemove: (enabled: boolean, callback: (event: PreventRemoveEvent) => void) => {
    navigationState.enabled = enabled;
    navigationState.callback = callback;
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
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

function renderEditor(mode: 'create' | 'edit' = 'create') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <TrainerWorkoutEditorScreen mode={mode} />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.dismissTo.mockReset();
  routerState.replace.mockReset();
  paramsState.studentId = STUDENT_ID;
  paramsState.planId = undefined;
  navigationState.callback = null;
  navigationState.dispatch.mockReset();
  navigationState.enabled = false;
  vi.restoreAllMocks();
});

describe('TrainerWorkoutEditorScreen em criação', () => {
  it('confirma remoção nativa de rota quando há alterações locais', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(Alert, 'alert');
    const action = { type: 'GO_BACK' };

    renderEditor();

    expect(navigationState.enabled).toBe(false);
    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    expect(navigationState.enabled).toBe(true);

    act(() => {
      navigationState.callback?.({ data: { action } });
    });

    expect(alert).toHaveBeenCalledWith(
      'Descartar alterações?',
      'As alterações deste treino serão perdidas.',
      expect.any(Array),
    );
    expect(navigationState.dispatch).not.toHaveBeenCalled();

    const actions = alert.mock.calls[0]?.[2];
    const discardAction = actions?.find((item) => item.style === 'destructive');
    act(() => discardAction?.onPress?.());

    expect(navigationState.dispatch).toHaveBeenCalledWith(action);
  });

  it('confirma antes de sair pelo botão explícito quando há alterações locais', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(Alert, 'alert');
    const action = { type: 'DISMISS_TO_WORKOUTS' };
    routerState.dismissTo.mockImplementation(() => {
      act(() => {
        navigationState.callback?.({ data: { action } });
      });
    });

    renderEditor();

    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Voltar para treinos' }));

    expect(routerState.dismissTo).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Descartar alterações?',
      'As alterações deste treino serão perdidas.',
      expect.any(Array),
    );
    expect(alert).toHaveBeenCalledTimes(1);

    const actions = alert.mock.calls[0]?.[2];
    const discardAction = actions?.find((item) => item.style === 'destructive');
    act(() => discardAction?.onPress?.());

    expect(routerState.dismissTo).toHaveBeenCalledWith(`/trainer/students/${STUDENT_ID}/workouts`);
    expect(routerState.dismissTo).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('mostra aluno inválido sem fazer POST', async () => {
    paramsState.studentId = undefined;

    renderEditor();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('inicia com rascunho, um dia vazio e permite adicionar até sete dias', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('Novo treino')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rascunho' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole('button', { name: 'Selecionar Treino A' })).toBeTruthy();
    expect(screen.getByText('Nenhum exercício neste dia')).toBeTruthy();

    for (let index = 0; index < 6; index += 1) {
      await user.press(screen.getByRole('button', { name: 'Adicionar dia' }));
    }

    expect(screen.getByRole('button', { name: 'Selecionar Treino G' })).toBeTruthy();
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
    await user.press(screen.getByRole('button', { name: 'Selecionar Treino A' }));
    await user.clear(screen.getByLabelText('Nome do dia'));
    await user.type(screen.getByLabelText('Nome do dia'), 'Força');
    await user.press(screen.getByRole('button', { name: 'Selecionar Treino B' }));

    expect(screen.getByLabelText('Nome do dia').props.value).toBe('Treino B');
    await user.press(screen.getByRole('button', { name: 'Selecionar Força' }));
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
    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(alert).toHaveBeenCalledWith(
      'Remover dia?',
      'O dia Treino A e seus exercícios serão removidos deste treino.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2];
    expect(buttons).toBeDefined();
    await act(async () => buttons?.[0]?.onPress?.());
    expect(screen.getByRole('button', { name: 'Selecionar Treino A' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));
    const secondButtons = alert.mock.calls[1]?.[2];
    await act(async () => secondButtons?.[1]?.onPress?.());
    expect(screen.queryByRole('button', { name: 'Selecionar Treino A' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Selecionar Treino B' })).toBeTruthy();
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
    await user.press(screen.getByRole('button', { name: 'Ativo' }));
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
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['trainer', 'summary'] });
    expect(setQueryData).toHaveBeenCalledWith(['trainer', 'workout', PLAN_ID], createdPlan);
    expect(await screen.findByText('Treino salvo com sucesso.')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Ver treino' }));
    expect(routerState.replace).toHaveBeenCalledWith(
      `/trainer/students/${STUDENT_ID}/workouts/${PLAN_ID}`,
    );
  });

  it('não permite segundo POST após sucesso sem edição e preserva Ver treino', async () => {
    const user = userEvent.setup();
    const createdPlan = workoutPlanFixture({ name: 'Hipertrofia' });
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce(createdPlan);

    renderEditor();

    await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));
    await user.press(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(await screen.findByText('Treino salvo com sucesso.')).toBeTruthy();
    const saveButton = screen.getByRole('button', { name: 'Salvar treino' });
    expect(saveButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(navigationState.enabled).toBe(false);

    await user.press(saveButton);
    expect(
      apiState.request.mock.calls.filter(
        ([path, options]) => path === '/workout-plans' && options?.method === 'POST',
      ),
    ).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Ver treino' }));
    expect(routerState.replace).toHaveBeenCalledWith(
      `/trainer/students/${STUDENT_ID}/workouts/${PLAN_ID}`,
    );
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

    expect(screen.getByRole('button', { name: 'Salvando...' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await waitFor(() => rejectPost(new Error('offline')));
    expect(await screen.findByText('Não foi possível salvar o treino.')).toBeTruthy();
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

    expect(screen.getByText('Treino inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('não faz GET quando o deep link de edição não tem studentId', () => {
    paramsState.studentId = undefined;
    paramsState.planId = PLAN_ID;

    renderEditor('edit');

    expect(screen.getByText('Treino inválido')).toBeTruthy();
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
    await user.press(screen.getByRole('button', { name: 'Selecionar Treino B' }));
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
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['trainer', 'summary'] });
    expect(await screen.findByText('Treino atualizado com sucesso.')).toBeTruthy();
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

    expect(await screen.findByText('Não foi possível atualizar o treino.')).toBeTruthy();
    expect(screen.getByLabelText('Nome do treino').props.value).toBe('Nome local');
  });
});
