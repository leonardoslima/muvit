import { act, fireEvent, screen } from '@testing-library/react-native';
import { type ComponentProps, createRef } from 'react';
import type { View } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../test/render-with-toast';
import type { GuidedSession } from '../../application/workouts/guided-session';
import { createGuidedSession } from '../../application/workouts/guided-session';
import { selectGuidedSessionView } from '../../application/workouts/guided-session-presentation';
import type { GuidedWorkoutController, WorkoutDay } from '../../lib/use-guided-workout-session';
import { GuidedSessionContent } from './guided-session-content';

const appState = vi.hoisted(() => ({
  addEventListener:
    vi.fn<(event: string, listener: (state: string) => void) => { remove: () => void }>(),
  remove: vi.fn(),
}));
const focusState = vi.hoisted(() => ({ node: { testID: 'demonstration-action-node' } }));

vi.mock('../ui/v2', async (importOriginal) => {
  const React = await import('react');
  const ui = await importOriginal<typeof import('../ui/v2')>();
  return {
    ...ui,
    Button: React.forwardRef((props: ComponentProps<typeof ui.Button>, ref) => {
      React.useImperativeHandle(ref, () => focusState.node, []);
      return React.createElement(ui.Button, props);
    }),
  };
});

vi.mock('react-native', async (importOriginal) => {
  const native = await importOriginal<typeof import('react-native')>();
  return {
    ...native,
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
    AppState: { addEventListener: appState.addEventListener },
  };
});

const day: WorkoutDay = {
  id: 'day-1',
  planId: 'plan-1',
  label: 'Treino A',
  dayOrder: 0,
  exercises: [
    {
      id: 'workout-exercise-1',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-1',
      exerciseOrder: 0,
      sets: 2,
      reps: '8 a 12',
      loadKg: 40,
      restSeconds: 60,
      tempo: null,
      notes: 'Controle o movimento.',
      exercise: { id: 'exercise-1', name: 'Supino reto', muscleGroup: 'Peito' },
    },
    {
      id: 'workout-exercise-2',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-2',
      exerciseOrder: 1,
      sets: 1,
      reps: '12',
      loadKg: null,
      restSeconds: 45,
      tempo: null,
      notes: null,
      exercise: { id: 'exercise-2', name: 'Remada baixa', muscleGroup: 'Costas' },
    },
  ],
};

function sessionFor(phase: GuidedSession['phase']): GuidedSession {
  const session = createGuidedSession(
    {
      id: day.id,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        sets: exercise.sets,
        loadKg: exercise.loadKg,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
      })),
    },
    1_000,
  );
  if (phase === 'set') return session;
  if (phase === 'rest') {
    return {
      ...session,
      currentSetIndex: 0,
      phase,
      restEndsAtMs: Date.now() - 1,
      sets: session.sets.map((set, index) =>
        index === 0 ? { ...set, repsDone: '10', completed: true } : set,
      ),
    };
  }
  if (phase === 'exercise-complete') {
    return {
      ...session,
      currentSetIndex: 1,
      phase,
      sets: session.sets.map((set, index) =>
        index < 2 ? { ...set, repsDone: '10', completed: true } : set,
      ),
    };
  }
  if (phase === 'ready-to-finish' || phase === 'summary') {
    return {
      ...session,
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      phase,
      sets: session.sets.map((set) => ({ ...set, repsDone: '12', completed: true })),
    };
  }
  return session;
}

function makeController(
  session: GuidedSession,
  overrides: Partial<GuidedWorkoutController> = {},
): GuidedWorkoutController {
  return {
    state: 'ready',
    day,
    session,
    error: null,
    actionError: null,
    canRetryFinish: false,
    storageError: null,
    queued: false,
    busy: false,
    draftActive: true,
    summary: null,
    updateSet: vi.fn(async () => undefined),
    completeSet: vi.fn(async () => undefined),
    addRestTime: vi.fn(async () => undefined),
    skipRest: vi.fn(async () => undefined),
    skipExercise: vi.fn(async () => undefined),
    continueAfterExercise: vi.fn(async () => undefined),
    finishWorkout: vi.fn(async () => undefined),
    discard: vi.fn(async () => true),
    saveDraft: vi.fn(async () => true),
    retry: vi.fn(async () => undefined),
    ...overrides,
  };
}

function renderContent(
  session: GuidedSession,
  overrides: Partial<GuidedWorkoutController> = {},
  onBackHome = vi.fn(),
) {
  const controller = makeController(session, overrides);
  const onOpenDemonstration = vi.fn();
  render(
    <GuidedSessionContent
      controller={controller}
      onBackHome={onBackHome}
      selection={selectGuidedSessionView(day, session)}
      onRequestSkipExercise={vi.fn()}
      onOpenDemonstration={onOpenDemonstration}
    />,
  );
  return { controller, onOpenDemonstration, onBackHome };
}

describe('GuidedSessionContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appState.addEventListener.mockReturnValue({ remove: appState.remove });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantém valores reais da sessão e altera campos pelos controles de passo', () => {
    const initial = sessionFor('set');
    const session = {
      ...initial,
      currentSetIndex: 1,
      sets: initial.sets.map((set, index) =>
        index === 0 ? { ...set, repsDone: '10', completed: true } : set,
      ),
    };
    const { controller, onOpenDemonstration } = renderContent(session);

    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('Registre os valores realizados antes de avançar.')).toBeTruthy();
    expect(screen.getByText('A seguir: Remada baixa')).toBeTruthy();
    expect(screen.getByText(/8 a 12 reps/)).toBeTruthy();
    expect(screen.getByLabelText('Repetições realizadas')).toHaveProp('value', '');
    expect(screen.getByLabelText('Carga utilizada')).toHaveProp('value', '40');
    expect(screen.getByText('Última série registrada')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Ver execução de Supino reto' }));
    fireEvent.press(screen.getByRole('button', { name: 'Aumentar Repetições realizadas' }));
    fireEvent.press(screen.getByRole('button', { name: 'Diminuir Carga utilizada' }));

    expect(onOpenDemonstration).toHaveBeenCalledWith(day.exercises[0]);
    expect(controller.updateSet).toHaveBeenNthCalledWith(1, { repsDone: '1' });
    expect(controller.updateSet).toHaveBeenNthCalledWith(2, { loadKg: '39' });
    expect(session.sets[1]).toMatchObject({ repsDone: '', loadKg: '40', completed: false });
  });

  it('recalcula o descanso ao voltar ao app ativo depois da expiração', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
    const restSession = sessionFor('rest');
    const { controller } = renderContent({ ...restSession, restEndsAtMs: Date.now() + 60_000 });

    expect(screen.getByText('01:00')).toBeTruthy();
    const onAppStateChange = appState.addEventListener.mock.calls.find(
      ([event]) => event === 'change',
    )?.[1];
    expect(onAppStateChange).toBeDefined();
    vi.setSystemTime(Date.now() + 60_000);
    expect(screen.getByText('01:00')).toBeTruthy();

    if (!onAppStateChange)
      throw new Error('O listener de retorno ao app ativo não foi registrado.');
    act(() => onAppStateChange('active'));

    expect(screen.getByText('00:00')).toBeTruthy();
    expect(controller.skipRest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '+15 s' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pular descanso' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '+15 s' }));
    fireEvent.press(screen.getByRole('button', { name: 'Pular descanso' }));

    expect(controller.addRestTime).toHaveBeenCalledOnce();
    expect(controller.skipRest).toHaveBeenCalledOnce();
  });

  it('apresenta o próximo exercício sem avançar e só conclui ao acionar o CTA', () => {
    const session = sessionFor('exercise-complete');
    const { controller, onOpenDemonstration } = renderContent(session);

    expect(screen.getByText('Supino reto concluído')).toBeTruthy();
    expect(screen.getByText('Remada baixa')).toBeTruthy();
    expect(screen.getByText('12 reps · peso conforme prescrição')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Ver execução de Remada baixa' }));

    expect(onOpenDemonstration).toHaveBeenCalledWith(day.exercises[1]);
    expect(controller.continueAfterExercise).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Próximo exercício' }));
    expect(controller.continueAfterExercise).toHaveBeenCalledOnce();
  });

  it.each(['set', 'rest', 'exercise-complete'] as const)(
    'expõe o CTA de demonstração para restaurar foco na fase %s',
    (phase) => {
      const session = sessionFor(phase);
      const actionRef = createRef<View>();
      render(
        <GuidedSessionContent
          controller={makeController(session)}
          onBackHome={vi.fn()}
          selection={selectGuidedSessionView(day, session)}
          onRequestSkipExercise={vi.fn()}
          onOpenDemonstration={vi.fn()}
          demonstrationActionRef={actionRef}
        />,
      );

      expect(actionRef.current).toBe(focusState.node);
    },
  );

  it('mantém pronto para finalizar sem apresentar resumo antes da conclusão', () => {
    const { controller } = renderContent(sessionFor('ready-to-finish'));

    expect(screen.getByText('Pronto para finalizar')).toBeTruthy();
    expect(screen.queryByText('Treino concluído')).toBeNull();
    expect(screen.getByText('Você registrou todas as séries do treino.')).toBeTruthy();
    expect(screen.getByText('Remada baixa · 1 de 1 série')).toBeTruthy();
    expect(screen.getByText('2 exercícios · 3 séries registradas')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Concluir e finalizar treino' }));

    expect(controller.finishWorkout).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Duração total/)).toBeNull();
  });

  it('mantém uma única ação de retry na finalização e preserva o contexto do treino', () => {
    const { controller } = renderContent(sessionFor('ready-to-finish'), {
      actionError: 'Não foi possível concluir o treino. Tente novamente.',
      canRetryFinish: true,
    });
    expect(screen.getByText('Não foi possível concluir o treino')).toBeTruthy();
    expect(screen.getByText('Seus registros foram preservados. Tente novamente.')).toBeTruthy();
    expect(screen.getByText('Remada baixa · 1 de 1 série')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Concluir e finalizar treino' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(controller.finishWorkout).toHaveBeenCalledOnce();
  });

  it('identifica a finalização em andamento e bloqueia reentrada', () => {
    const { controller } = renderContent(sessionFor('ready-to-finish'), { busy: true });
    const button = screen.getByRole('button', { name: 'Finalizando…' });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(controller.finishWorkout).not.toHaveBeenCalled();
  });

  it('conserva as métricas do resumo pendente após erro de remoção', () => {
    const summary = { durationMin: 18, exerciseCount: 2, completedSetCount: 3, volumeKg: 480 };
    renderContent(sessionFor('summary'), {
      summary,
      queued: true,
      actionError: 'Não foi possível limpar o rascunho local.',
    });

    expect(screen.getByLabelText('Duração total: 18 min')).toBeTruthy();
    expect(screen.getByLabelText('Exercícios: 2')).toBeTruthy();
    expect(screen.getByLabelText('Séries: 3')).toBeTruthy();
    expect(screen.getByLabelText('Volume total: 480 kg')).toBeTruthy();
    expect(screen.getByText('Salvo neste aparelho')).toBeTruthy();
    expect(
      screen.getByText('Seu treino está salvo para sincronização. Você pode voltar ao início.'),
    ).toBeTruthy();
    expect(screen.getByText('Não foi possível limpar o rascunho local.')).toBeTruthy();
  });

  it('distingue exercício parcial de exercício inteiramente pulado no resumo', () => {
    const session = sessionFor('summary');
    const partialSession: GuidedSession = {
      ...session,
      sets: session.sets.map((set, index) =>
        index === 0 ? set : { ...set, completed: false, skipped: true },
      ),
    };
    renderContent(partialSession, {
      summary: {
        durationMin: 18,
        exerciseCount: 1,
        completedSetCount: 1,
        skippedSetCount: 2,
        volumeKg: 480,
      },
    });

    expect(screen.getByLabelText('Exercícios completos: 0')).toBeTruthy();
    expect(screen.getByLabelText('Exercícios parciais: 1')).toBeTruthy();
    expect(screen.getByLabelText('Exercícios pulados: 1')).toBeTruthy();
    expect(screen.getByLabelText('Séries realizadas: 1')).toBeTruthy();
    expect(screen.getByLabelText('Séries puladas: 2')).toBeTruthy();
    expect(screen.getByLabelText('Volume total: 480 kg')).toBeTruthy();
  });

  it('bloqueia Voltar ao início enquanto a remoção do rascunho está ocupada', () => {
    const summary = { durationMin: 18, exerciseCount: 2, completedSetCount: 3, volumeKg: 480 };
    const onBackHome = vi.fn();
    renderContent(sessionFor('summary'), { summary, busy: true }, onBackHome);
    const backButton = screen.getByRole('button', { name: 'Voltar ao início' });

    fireEvent.press(backButton);

    expect(onBackHome).not.toHaveBeenCalled();
    expect(backButton.props.accessibilityState.disabled).toBe(true);
  });

  it('bloqueia campos e ações concorrentes enquanto o controlador está ocupado', () => {
    renderContent(sessionFor('set'), { busy: true });

    expect(screen.getByLabelText('Repetições realizadas').props.editable).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Concluir série' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Ver execução de Supino reto' }).props.accessibilityState
        .disabled,
    ).toBe(true);
  });
});

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
